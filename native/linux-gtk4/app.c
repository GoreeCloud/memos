#include <gtk/gtk.h>
#include "model.h"
#include "demo-feed.h"

typedef struct {
  GcMemoStore *store;
  GtkWidget *window;
  GtkWidget *board;
  GtkWidget *search;
  GtkWidget *heading;
  GtkWidget *count;
  GtkWidget *editor_window;
  GtkTextBuffer *editor_buffer;
  GtkCheckButton *pin_toggle;
  GtkCheckButton *private_toggle;
  GcMemo *editing;
  GcMemoFilter active_filter;
  GtkWidget *nav_buttons[8];
  GtkWidget *view_toggle;
  gboolean list_view;
} NativeApp;

static const gchar *section_titles[] = {
  "All Memos", "Pinned", "Private", "Today", "This Week",
  "My Tasks", "Labels", "Archived"
};

static void render_board(NativeApp *app);
static void open_editor(NativeApp *app, GcMemo *memo);

static void edit_card(GtkButton *button, gpointer data) {
  NativeApp *app = data;
  guint64 id = (guint64)GPOINTER_TO_SIZE(g_object_get_data(G_OBJECT(button), "memo-id"));
  open_editor(app, gc_memo_store_find(app->store, id));
}

static void toggle_pin(GtkButton *button, gpointer data) {
  NativeApp *app = data;
  guint64 id = (guint64)GPOINTER_TO_SIZE(g_object_get_data(G_OBJECT(button), "memo-id"));
  GcMemo *m = gc_memo_store_find(app->store, id);
  if (m) { m->pinned = !m->pinned; render_board(app); }
}

static void toggle_archive(GtkButton *button, gpointer data) {
  NativeApp *app = data;
  guint64 id = (guint64)GPOINTER_TO_SIZE(g_object_get_data(G_OBJECT(button), "memo-id"));
  GcMemo *m = gc_memo_store_find(app->store, id);
  if (m) { m->archived = !m->archived; render_board(app); }
}

static GtkWidget *memo_card(NativeApp *app, GcMemo *m) {
  GtkWidget *card = gtk_box_new(GTK_ORIENTATION_VERTICAL, 9);
  gtk_widget_set_valign(card, GTK_ALIGN_START);
  gtk_widget_add_css_class(card, "memo-card");
  if (m->pinned) gtk_widget_add_css_class(card, "is-pinned");
  GtkWidget *title_btn = gtk_button_new();
  gtk_widget_add_css_class(title_btn, "flat");
  gtk_widget_add_css_class(title_btn, "memo-title-button");
  GtkWidget *heading = gtk_label_new(NULL);
  gchar *title = gc_memo_title(m);
  gtk_label_set_text(GTK_LABEL(heading), title);
  g_free(title);
  gtk_label_set_wrap(GTK_LABEL(heading), TRUE);
  gtk_label_set_xalign(GTK_LABEL(heading), 0);
  gtk_widget_add_css_class(heading, "memo-heading");
  gtk_button_set_child(GTK_BUTTON(title_btn), heading);
  g_object_set_data(G_OBJECT(title_btn), "memo-id", GSIZE_TO_POINTER((gsize)m->id));
  g_signal_connect(title_btn, "clicked", G_CALLBACK(edit_card), app);
  gtk_box_append(GTK_BOX(card), title_btn);
  /* The memo heading is shown separately; avoid repeating Markdown title. */
  const gchar *preview = m->content;
  if (g_str_has_prefix(preview, "## ")) {
    const gchar *line_end = strchr(preview, '\n');
    if (line_end) preview = line_end + 1;
  }
  GtkWidget *content = gtk_label_new(preview);
  gtk_label_set_wrap(GTK_LABEL(content), TRUE);
  gtk_label_set_wrap_mode(GTK_LABEL(content), PANGO_WRAP_WORD_CHAR);
  gtk_label_set_width_chars(GTK_LABEL(content), 25);
  gtk_label_set_max_width_chars(GTK_LABEL(content), 33);
  gtk_label_set_lines(GTK_LABEL(content), 7);
  gtk_label_set_ellipsize(GTK_LABEL(content), PANGO_ELLIPSIZE_END);
  gtk_label_set_xalign(GTK_LABEL(content), 0);
  gtk_widget_add_css_class(content, "memo-content");
  gtk_box_append(GTK_BOX(card), content);
  GtkWidget *meta = gtk_label_new(m->is_private ? "Private • synthetic only" : "Synthetic demo • local only");
  gtk_label_set_xalign(GTK_LABEL(meta), 0);
  gtk_widget_add_css_class(meta, "memo-meta");
  gtk_box_append(GTK_BOX(card), meta);
  GtkWidget *actions = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 6);
  gtk_widget_add_css_class(actions, "memo-actions");
  GtkWidget *pin = gtk_button_new_with_label(m->pinned ? "Unpin" : "Pin");
  GtkWidget *archive = gtk_button_new_with_label(m->archived ? "Restore" : "Archive");
  gtk_widget_add_css_class(pin, "pill");
  gtk_widget_add_css_class(archive, "pill");
  g_object_set_data(G_OBJECT(pin), "memo-id", GSIZE_TO_POINTER((gsize)m->id));
  g_object_set_data(G_OBJECT(archive), "memo-id", GSIZE_TO_POINTER((gsize)m->id));
  g_signal_connect(pin, "clicked", G_CALLBACK(toggle_pin), app);
  g_signal_connect(archive, "clicked", G_CALLBACK(toggle_archive), app);
  gtk_box_append(GTK_BOX(actions), pin);
  gtk_box_append(GTK_BOX(actions), archive);
  gtk_box_append(GTK_BOX(card), actions);
  return card;
}

static void render_board(NativeApp *app) {
  GtkWidget *child;
  while ((child = gtk_widget_get_first_child(app->board)) != NULL)
    gtk_flow_box_remove(GTK_FLOW_BOX(app->board), child);
  guint count = 0;
  const gchar *query = gtk_editable_get_text(GTK_EDITABLE(app->search));
  gint64 now = g_get_real_time()/G_USEC_PER_SEC;
  for (guint i=0; i<app->store->items->len; i++) {
    GcMemo *memo=g_ptr_array_index(app->store->items, i);
    if (!gc_memo_matches(memo, app->active_filter, query, now)) continue;
    gtk_flow_box_insert(GTK_FLOW_BOX(app->board), memo_card(app,memo), -1);
    count++;
  }
  if (count == 0) {
    GtkWidget *empty = gtk_box_new(GTK_ORIENTATION_VERTICAL, 7);
    gtk_widget_add_css_class(empty, "empty-state");
    GtkWidget *title = gtk_label_new("No matching local memos");
    gtk_widget_add_css_class(title, "memo-heading");
    GtkWidget *detail = gtk_label_new("Try a different search or choose another section.");
    gtk_widget_add_css_class(detail, "memo-meta");
    gtk_label_set_wrap(GTK_LABEL(detail), TRUE);
    gtk_box_append(GTK_BOX(empty), title);
    gtk_box_append(GTK_BOX(empty), detail);
    gtk_flow_box_insert(GTK_FLOW_BOX(app->board), empty, -1);
  }
  gchar *counter = g_strdup_printf("%u local demo memo%s", count, count == 1 ? "" : "s");
  gtk_label_set_text(GTK_LABEL(app->count), counter);
  g_free(counter);
  gtk_label_set_text(GTK_LABEL(app->heading), section_titles[app->active_filter]);
  for (guint i = 0; i < G_N_ELEMENTS(app->nav_buttons); ++i) {
    if (!app->nav_buttons[i]) continue;
    if ((GcMemoFilter)i == app->active_filter)
      gtk_widget_add_css_class(app->nav_buttons[i], "nav-active");
    else
      gtk_widget_remove_css_class(app->nav_buttons[i], "nav-active");
  }
}
static void change_filter(GtkButton *button, gpointer data) {
  NativeApp *app=data;
  app->active_filter = GPOINTER_TO_INT(g_object_get_data(G_OBJECT(button), "filter"));
  render_board(app);
}
static void search_changed(GtkEditable *editable, gpointer data) {
  (void) editable;
  render_board(data);
}
static void switch_view(GtkButton *button, gpointer data) {
  NativeApp *app = data;
  app->list_view = !app->list_view;
  gtk_flow_box_set_max_children_per_line(GTK_FLOW_BOX(app->board),
                                         app->list_view ? 1 : 4);
  gtk_button_set_label(button, app->list_view ? "Grid view" : "List view");
  render_board(app);
}
static gboolean native_shortcut(GtkEventControllerKey *controller,
                                 guint keyval, guint keycode,
                                 GdkModifierType modifiers, gpointer data) {
  (void) controller;
  (void) keycode;
  NativeApp *app = data;
  if ((modifiers & GDK_CONTROL_MASK) && (keyval == GDK_KEY_f || keyval == GDK_KEY_F)) {
    gtk_widget_grab_focus(app->search);
    return TRUE;
  }
  if ((modifiers & GDK_CONTROL_MASK) && (keyval == GDK_KEY_n || keyval == GDK_KEY_N)) {
    open_editor(app, NULL);
    return TRUE;
  }
  return FALSE;
}
static void editor_closed(GtkWindow *window, gpointer data) {
  NativeApp *app=data;
  if (app->editor_window == GTK_WIDGET(window)) {
    app->editor_window = NULL;
    app->editor_buffer = NULL;
    app->editing = NULL;
  }
}
static void close_editor(GtkButton *button, gpointer data) {
  (void) button;
  NativeApp *app=data;
  if (app->editor_window) gtk_window_destroy(GTK_WINDOW(app->editor_window));
}
static void save_editor(GtkButton *button, gpointer data) {
  (void) button;
  NativeApp *app=data;
  if (!app->editor_buffer) return;
  GtkTextIter start,end;
  gtk_text_buffer_get_bounds(app->editor_buffer,&start,&end);
  gchar *text=gtk_text_buffer_get_text(app->editor_buffer,&start,&end,FALSE);
  GcMemo *memo=app->editing;
  if (memo) {
    if (!gc_memo_store_update(memo,text)) {g_free(text);return;}
  } else {
    memo=gc_memo_store_add(app->store,text);
    if (!memo) {g_free(text);return;}
  }
  memo->pinned=gtk_check_button_get_active(app->pin_toggle);
  memo->is_private=gtk_check_button_get_active(app->private_toggle);
  g_free(text);
  gtk_window_destroy(GTK_WINDOW(app->editor_window));
  render_board(app);
}
static void open_editor(NativeApp *app, GcMemo *memo) {
  if (app->editor_window) return;
  app->editing=memo;
  GtkWidget *dialog=gtk_window_new();
  app->editor_window=dialog;
  gtk_window_set_title(GTK_WINDOW(dialog), memo?"Edit local memo":"New local memo");
  gtk_window_set_modal(GTK_WINDOW(dialog),TRUE);
  gtk_window_set_transient_for(GTK_WINDOW(dialog),GTK_WINDOW(app->window));
  gtk_window_set_default_size(GTK_WINDOW(dialog),570,420);
  g_signal_connect(dialog,"destroy",G_CALLBACK(editor_closed),app);
  GtkWidget *layout=gtk_box_new(GTK_ORIENTATION_VERTICAL,12);
  gtk_widget_set_margin_start(layout,18);
  gtk_widget_set_margin_end(layout,18);
  gtk_widget_set_margin_top(layout,18);
  gtk_widget_set_margin_bottom(layout,18);
  GtkWidget *description=gtk_label_new("Temporary local demo — not saved to disk or synced");
  gtk_widget_add_css_class(description,"warning-text");
  gtk_label_set_xalign(GTK_LABEL(description),0);
  gtk_box_append(GTK_BOX(layout),description);
  GtkWidget *scroll=gtk_scrolled_window_new();
  gtk_widget_set_vexpand(scroll,TRUE);
  GtkWidget *text=gtk_text_view_new();
  gtk_text_view_set_wrap_mode(GTK_TEXT_VIEW(text),GTK_WRAP_WORD_CHAR);
  app->editor_buffer=gtk_text_view_get_buffer(GTK_TEXT_VIEW(text));
  if (memo) gtk_text_buffer_set_text(app->editor_buffer,memo->content,-1);
  gtk_scrolled_window_set_child(GTK_SCROLLED_WINDOW(scroll),text);
  gtk_box_append(GTK_BOX(layout),scroll);
  app->pin_toggle=GTK_CHECK_BUTTON(gtk_check_button_new_with_label("Pinned"));
  app->private_toggle=GTK_CHECK_BUTTON(gtk_check_button_new_with_label("Private (local UI only)"));
  gtk_check_button_set_active(app->pin_toggle,memo && memo->pinned);
  gtk_check_button_set_active(app->private_toggle,memo && memo->is_private);
  gtk_box_append(GTK_BOX(layout),GTK_WIDGET(app->pin_toggle));
  gtk_box_append(GTK_BOX(layout),GTK_WIDGET(app->private_toggle));
  GtkWidget *buttons=gtk_box_new(GTK_ORIENTATION_HORIZONTAL,8);
  gtk_widget_set_halign(buttons,GTK_ALIGN_END);
  GtkWidget *cancel=gtk_button_new_with_label("Cancel");
  GtkWidget *save=gtk_button_new_with_label("Save locally (temporary)");
  gtk_widget_add_css_class(save,"suggested-action");
  g_signal_connect(cancel,"clicked",G_CALLBACK(close_editor),app);
  g_signal_connect(save,"clicked",G_CALLBACK(save_editor),app);
  gtk_box_append(GTK_BOX(buttons),cancel);
  gtk_box_append(GTK_BOX(buttons),save);
  gtk_box_append(GTK_BOX(layout),buttons);
  gtk_window_set_child(GTK_WINDOW(dialog),layout);
  gtk_window_present(GTK_WINDOW(dialog));
}
static void new_memo(GtkButton *button, gpointer data) {
  (void) button;
  open_editor(data,NULL);
}

static void native_state_free(gpointer data) {
  NativeApp *app = data;
  gc_memo_store_free(app->store);
  g_free(app);
}
static void load_demo(GcMemoStore *store) {
  GError *error = NULL;
  if (!gc_demo_seed_fixture(store, &error)) {
    /* No user data is loaded. Leave an empty, usable demo on failure. */
    g_warning("Synthetic memo preview failed validation");
    g_clear_error(&error);
  }
}
static void install_css(void) {
  const gchar *css =
    "window { background: #f7f9fc; color: #172d4f; }"
    ".sidebar { background: #edf2fa; border-right: 1px solid #dce4f0;"
    " padding: 24px 16px; }"
    ".brand { font-size: 20px; font-weight: 800; color: #172d4f; }"
    ".section-heading { font-size: 29px; font-weight: 800; color: #172d4f; }"
    ".section-subtitle { font-size: 12px; color: #637590; }"
    ".nav-item { color: #364d70; border: 0; box-shadow: none; background: transparent;"
    " margin: 1px 0; border-radius: 11px; padding: 9px 12px; min-height: 36px; }"
    ".nav-item:hover { background: #dfe8f7; }"
    ".nav-active { background: #dce8ff; color: #1c5cc6; font-weight: 700; }"
    ".empty-state { background: transparent; padding: 35px 20px; min-width: 280px; }"
    ".memo-card { background: #ffffff; border: 1px solid #dce4ee;"
    " border-radius: 17px; padding: 16px; margin: 4px; min-width: 205px; }"
    ".is-pinned { background: #fff8e9; border-color: #eacb84; }"
    ".memo-title-button { padding: 0; margin: 0; border: 0; box-shadow: none; }"
    ".memo-heading { font-size: 15px; font-weight: 750; color: #1a2e4c; }"
    ".memo-content { font-size: 13px; color: #465875; }"
    ".memo-meta { font-size: 11px; color: #667997; }"
    ".memo-actions button { padding: 5px 11px; min-height: 30px; font-size: 12px; }"
    ".warning-text { color: #a16b1e; font-weight: 650; font-size: 12px; }"
    ".compose { background: #2e6bef; color: white; font-weight: 750;"
    " border-radius: 12px; min-height: 43px; box-shadow: none; }"
    ".view-toggle { border-radius: 11px; min-height: 35px; }"
    ".toolbar-search { border-radius: 11px; min-height: 39px; }"
    ".dark-theme { background: #101b2d; color: #eef3fc; }"
    ".dark-theme .sidebar { background: #18253a; border-color: #30425e; }"
    ".dark-theme .brand, .dark-theme .section-heading { color: #f4f7fd; }"
    ".dark-theme .section-subtitle { color: #9baec8; }"
    ".dark-theme .nav-item { color: #c9d8ef; }"
    ".dark-theme .nav-item:hover { background: #273b57; }"
    ".dark-theme .nav-active { background: #24436d; color: #c9ddff; }"
    ".dark-theme .memo-card { background: #1b2a42; border-color: #344763; }"
    ".dark-theme .is-pinned { background: #3b321f; border-color: #877047; }"
    ".dark-theme .memo-heading { color: #f1f6ff; }"
    ".dark-theme .memo-content { color: #cad7eb; }"
    ".dark-theme .memo-meta { color: #a1b1c9; }"
    ".dark-theme .warning-text { color: #efc47b; }";
  GtkCssProvider *provider=gtk_css_provider_new();
#if GTK_CHECK_VERSION(4, 12, 0)
  gtk_css_provider_load_from_string(provider, css);
#else
  gtk_css_provider_load_from_data(provider, css, -1);
#endif
  gtk_style_context_add_provider_for_display(
      gdk_display_get_default(), GTK_STYLE_PROVIDER(provider),
      GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);
  g_object_unref(provider);
}
static void refresh_theme(GObject *settings, GParamSpec *property, gpointer window_data) {
  (void) property;
  GtkWidget *window = window_data;
  gboolean prefer_dark = FALSE;
  gchar *theme_name = NULL;
  g_object_get(settings, "gtk-application-prefer-dark-theme", &prefer_dark,
               "gtk-theme-name", &theme_name, NULL);
  const gchar *override = g_getenv("GTK_THEME");
  gboolean dark = prefer_dark ||
                  (theme_name && g_str_has_suffix(theme_name, "-dark")) ||
                  (override && (g_str_has_suffix(override, ":dark") ||
                                g_str_has_suffix(override, "-dark")));
  if (dark) gtk_widget_add_css_class(window, "dark-theme");
  else gtk_widget_remove_css_class(window, "dark-theme");
  g_free(theme_name);
}
static void activate(GtkApplication *application, gpointer unused) {
  (void) unused;
  NativeApp *app=g_new0(NativeApp,1);
  app->store=gc_memo_store_new();
  load_demo(app->store);
  app->active_filter=GC_MEMOS_ALL;
  app->window=gtk_application_window_new(application);
  g_object_set_data_full(G_OBJECT(app->window),"native-state",app,native_state_free);
  gtk_window_set_title(GTK_WINDOW(app->window),"GoreeCloud Memos · Native Linux prototype");
  gtk_window_set_default_size(GTK_WINDOW(app->window),1190,790);
  install_css();
  GtkSettings *settings = gtk_settings_get_default();
  if (settings) {
    refresh_theme(G_OBJECT(settings), NULL, app->window);
    g_signal_connect_object(settings, "notify::gtk-theme-name",
                            G_CALLBACK(refresh_theme), app->window, 0);
    g_signal_connect_object(settings, "notify::gtk-application-prefer-dark-theme",
                            G_CALLBACK(refresh_theme), app->window, 0);
  }

  GtkWidget *root=gtk_box_new(GTK_ORIENTATION_HORIZONTAL,0);
  GtkWidget *sidebar=gtk_box_new(GTK_ORIENTATION_VERTICAL,8);
  gtk_widget_add_css_class(sidebar,"sidebar");
  gtk_widget_set_size_request(sidebar,236,-1);
  gtk_widget_set_hexpand(sidebar,FALSE);
  GtkWidget *brand=gtk_label_new("◆  GoreeCloud Memos");
  gtk_widget_add_css_class(brand,"brand");
  gtk_label_set_xalign(GTK_LABEL(brand),0);
  gtk_box_append(GTK_BOX(sidebar),brand);
  GtkWidget *compose=gtk_button_new_with_label("+  New Memo");
  gtk_widget_add_css_class(compose,"compose");
  gtk_widget_set_margin_top(compose,11);
  gtk_widget_set_margin_bottom(compose,15);
  gtk_widget_set_tooltip_text(compose,"Create a temporary local memo (Ctrl+N)");
  g_signal_connect(compose,"clicked",G_CALLBACK(new_memo),app);
  gtk_box_append(GTK_BOX(sidebar),compose);
  const gchar *icons[] = {
    "view-grid-symbolic", "emblem-favorite-symbolic", "changes-prevent-symbolic",
    "x-office-calendar-symbolic", "appointment-soon-symbolic",
    "view-list-symbolic", "tag-symbolic", "user-trash-symbolic"
  };
  for (guint i=0;i<G_N_ELEMENTS(section_titles);i++) {
    GtkWidget *button=gtk_button_new();
    gtk_widget_add_css_class(button, "nav-item");
    GtkWidget *row=gtk_box_new(GTK_ORIENTATION_HORIZONTAL,12);
    GtkWidget *icon=gtk_image_new_from_icon_name(icons[i]);
    gtk_widget_set_size_request(icon,17,17);
    GtkWidget *name=gtk_label_new(section_titles[i]);
    gtk_label_set_xalign(GTK_LABEL(name),0);
    gtk_widget_set_hexpand(name,TRUE);
    gtk_box_append(GTK_BOX(row),icon);
    gtk_box_append(GTK_BOX(row),name);
    gtk_button_set_child(GTK_BUTTON(button),row);
    gtk_widget_set_halign(button,GTK_ALIGN_FILL);
    g_object_set_data(G_OBJECT(button),"filter",GINT_TO_POINTER(i));
    g_signal_connect(button,"clicked",G_CALLBACK(change_filter),app);
    app->nav_buttons[i]=button;
    gtk_box_append(GTK_BOX(sidebar),button);
  }
  GtkWidget *notice=gtk_label_new("NATIVE DEMO ONLY\nIn-memory notes · No server connection");
  gtk_widget_set_valign(notice,GTK_ALIGN_END);
  gtk_widget_set_vexpand(notice,TRUE);
  gtk_label_set_wrap(GTK_LABEL(notice),TRUE);
  gtk_label_set_xalign(GTK_LABEL(notice),0);
  gtk_widget_add_css_class(notice,"warning-text");
  gtk_box_append(GTK_BOX(sidebar),notice);
  gtk_box_append(GTK_BOX(root),sidebar);

  GtkWidget *content=gtk_box_new(GTK_ORIENTATION_VERTICAL,12);
  gtk_widget_set_hexpand(content,TRUE);
  gtk_widget_set_margin_top(content,23);
  gtk_widget_set_margin_start(content,24);
  gtk_widget_set_margin_end(content,24);
  gtk_widget_set_margin_bottom(content,18);
  app->heading=gtk_label_new("All Memos");
  gtk_widget_add_css_class(app->heading,"section-heading");
  gtk_label_set_xalign(GTK_LABEL(app->heading),0);
  gtk_box_append(GTK_BOX(content),app->heading);
  GtkWidget *subtitle = gtk_label_new("Your ideas, organized — native desktop preview");
  gtk_widget_add_css_class(subtitle, "section-subtitle");
  gtk_label_set_xalign(GTK_LABEL(subtitle),0);
  gtk_box_append(GTK_BOX(content),subtitle);

  GtkWidget *tools = gtk_box_new(GTK_ORIENTATION_HORIZONTAL,10);
  gtk_widget_set_margin_top(tools,12);
  app->search=gtk_search_entry_new();
  gtk_widget_add_css_class(app->search,"toolbar-search");
  gtk_widget_set_hexpand(app->search,TRUE);
  gtk_search_entry_set_placeholder_text(GTK_SEARCH_ENTRY(app->search),
                                         "Search local demo memos");
  gtk_widget_set_tooltip_text(app->search,"Search sample notes (Ctrl+F)");
  g_signal_connect(app->search,"changed",G_CALLBACK(search_changed),app);
  gtk_box_append(GTK_BOX(tools),app->search);
  app->view_toggle=gtk_button_new_with_label("List view");
  gtk_widget_add_css_class(app->view_toggle,"view-toggle");
  gtk_widget_set_tooltip_text(app->view_toggle,"Switch between native grid and list");
  g_signal_connect(app->view_toggle,"clicked",G_CALLBACK(switch_view),app);
  gtk_box_append(GTK_BOX(tools),app->view_toggle);
  gtk_box_append(GTK_BOX(content),tools);
  app->count=gtk_label_new("");
  gtk_label_set_xalign(GTK_LABEL(app->count),0);
  gtk_widget_add_css_class(app->count,"memo-meta");
  gtk_box_append(GTK_BOX(content),app->count);
  GtkWidget *scroll=gtk_scrolled_window_new();
  gtk_widget_set_vexpand(scroll,TRUE);
  app->board=gtk_flow_box_new();
  gtk_widget_set_valign(app->board, GTK_ALIGN_START);
  gtk_flow_box_set_homogeneous(GTK_FLOW_BOX(app->board), FALSE);
  gtk_flow_box_set_selection_mode(GTK_FLOW_BOX(app->board),GTK_SELECTION_NONE);
  gtk_flow_box_set_min_children_per_line(GTK_FLOW_BOX(app->board),1);
  gtk_flow_box_set_max_children_per_line(GTK_FLOW_BOX(app->board),4);
  gtk_flow_box_set_column_spacing(GTK_FLOW_BOX(app->board),8);
  gtk_flow_box_set_row_spacing(GTK_FLOW_BOX(app->board),8);
  gtk_scrolled_window_set_child(GTK_SCROLLED_WINDOW(scroll),app->board);
  gtk_box_append(GTK_BOX(content),scroll);
  gtk_box_append(GTK_BOX(root),content);
  gtk_window_set_child(GTK_WINDOW(app->window),root);
  GtkEventController *keys=gtk_event_controller_key_new();
  g_signal_connect(keys,"key-pressed",G_CALLBACK(native_shortcut),app);
  gtk_widget_add_controller(app->window,keys);
  render_board(app);
  gtk_window_present(GTK_WINDOW(app->window));
}
int main(int argc,char **argv) {
  GtkApplication *application=gtk_application_new(
      "com.goreecloud.memos.NativeLinuxPreview", (GApplicationFlags)0);
  g_signal_connect(application,"activate",G_CALLBACK(activate),NULL);
  int result=g_application_run(G_APPLICATION(application),argc,argv);
  g_object_unref(application);
  return result;
}
