#include "model.h"
#include <string.h>

static void memo_destroy(gpointer p) {
  GcMemo *memo = p;
  g_free(memo->content);
  g_free(memo);
}
GcMemoStore *gc_memo_store_new(void) {
  GcMemoStore *s = g_new0(GcMemoStore, 1);
  s->items = g_ptr_array_new_with_free_func(memo_destroy);
  s->next_id = 1;
  return s;
}
void gc_memo_store_free(GcMemoStore *s) {
  if (!s) return;
  g_ptr_array_unref(s->items);
  g_free(s);
}
static gboolean valid_content(const gchar *c) {
  if (!c || !g_utf8_validate(c, -1, NULL)) return FALSE;
  gchar *copy = g_strdup(c);
  gboolean valid = *g_strstrip(copy) != 0;
  g_free(copy);
  return valid;
}
GcMemo *gc_memo_store_add(GcMemoStore *s, const gchar *content) {
  if (!s || !valid_content(content)) return NULL;
  GcMemo *m = g_new0(GcMemo, 1);
  m->id = s->next_id++;
  m->content = g_strdup(content);
  m->updated_at = g_get_real_time()/G_USEC_PER_SEC;
  g_ptr_array_add(s->items, m);
  return m;
}
gboolean gc_memo_store_update(GcMemo *m, const gchar *c) {
  if (!m || !valid_content(c)) return FALSE;
  /* Callers may pass m->content (or a slice of it): copy before freeing. */
  gchar *replacement = g_strdup(c);
  g_free(m->content);
  m->content = replacement;
  m->updated_at = g_get_real_time()/G_USEC_PER_SEC;
  return TRUE;
}
GcMemo *gc_memo_store_find(const GcMemoStore *s, guint64 id) {
  if (!s) return NULL;
  for (guint i=0; i<s->items->len; ++i) {
    GcMemo *m = g_ptr_array_index(s->items, i);
    if (m->id == id) return m;
  }
  return NULL;
}
gboolean gc_memo_store_remove(GcMemoStore *s, guint64 id) {
  if (!s) return FALSE;
  for (guint i=0; i<s->items->len; ++i) {
    GcMemo *m = g_ptr_array_index(s->items, i);
    if (m->id == id) {
      g_ptr_array_remove_index(s->items, i);
      return TRUE;
    }
  }
  return FALSE;
}
static gboolean content_has_tag(const gchar *c) {
  for (const gchar *p=c; *p; ++p) {
    if (*p=='#' && (p==c || g_ascii_isspace(*(p-1))) &&
        g_ascii_isalnum(*(p+1))) return TRUE;
  }
  return FALSE;
}
static gboolean matches_query(const gchar *content, const gchar *search) {
  if (!search || !*search) return TRUE;
  gchar *a=g_utf8_casefold(content,-1), *b=g_utf8_casefold(search,-1);
  gboolean found=strstr(a,b)!=NULL;
  g_free(a);
  g_free(b);
  return found;
}
gboolean gc_memo_matches(const GcMemo *m, GcMemoFilter filter,
                         const gchar *search, gint64 now) {
  if (!m || !matches_query(m->content,search)) return FALSE;
  if (filter==GC_MEMOS_ARCHIVED) return m->archived;
  if (m->archived) return FALSE;
  if (filter==GC_MEMOS_PINNED) return m->pinned;
  if (filter==GC_MEMOS_PRIVATE) return m->is_private;
  if (filter==GC_MEMOS_TASKS)
    return strstr(m->content,"- [ ]") || strstr(m->content,"- [x]") ||
           strstr(m->content,"- [X]");
  if (filter==GC_MEMOS_LABELS) return content_has_tag(m->content);
  if (filter!=GC_MEMOS_TODAY && filter!=GC_MEMOS_WEEK) return TRUE;
  GDateTime *a=g_date_time_new_from_unix_local(m->updated_at);
  GDateTime *b=g_date_time_new_from_unix_local(now);
  if (!a || !b) {
    if (a) g_date_time_unref(a);
    if (b) g_date_time_unref(b);
    return FALSE;
  }
  gboolean ok= filter==GC_MEMOS_TODAY
    ? g_date_time_get_year(a)==g_date_time_get_year(b) &&
      g_date_time_get_day_of_year(a)==g_date_time_get_day_of_year(b)
    : g_date_time_get_week_numbering_year(a)==g_date_time_get_week_numbering_year(b) &&
      g_date_time_get_week_of_year(a)==g_date_time_get_week_of_year(b);
  g_date_time_unref(a);
  g_date_time_unref(b);
  return ok;
}
gchar *gc_memo_title(const GcMemo *m) {
  if (!m || !m->content) return g_strdup("Untitled memo");
  const gchar *p=m->content;
  while (*p=='#' || *p==' ' || *p=='\t') ++p;
  const gchar *end=strchr(p,'\n');
  gchar *title=g_strndup(p,MIN(end?(gsize)(end-p):strlen(p),90));
  if (!*title) {g_free(title);return g_strdup("Untitled memo");}
  return title;
}
