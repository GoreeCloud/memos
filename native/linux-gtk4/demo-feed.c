#include "demo-feed.h"
#include "response.h"

/* This is intentionally fake data. No network, credentials or disk IO. */
static const gchar fixture[] =
  "{\"memos\":["
  "{\"name\":\"memos/demo-project\",\"content\":\"## Project overview\\n"
  "This board uses native GTK4 widgets.\\n#Work\",\"visibility\":\"PRIVATE\",\"pinned\":true},"
  "{\"name\":\"memos/demo-weekend\",\"content\":\"## Weekend ideas\\n"
  "Walk outside and plan the week.\\n#Personal\",\"visibility\":\"PRIVATE\"},"
  "{\"name\":\"memos/demo-tasks\",\"content\":\"## Quick tasks\\n"
  "- [ ] Review mockup\\n- [ ] Run native tests\\n#Tasks\",\"visibility\":\"PRIVATE\"},"
  "{\"name\":\"memos/demo-architecture\",\"content\":\"## Architecture notes\\n"
  "The sample page is parsed in memory, with no server connection.\\n#Ideas\",\"visibility\":\"PROTECTED\"},"
  "{\"name\":\"memos/demo-design\",\"content\":\"## Design details\\n"
  "Responsive columns and accessible GTK controls.\\n#Design\",\"visibility\":\"PUBLIC\"},"
  "{\"name\":\"memos/demo-testing\",\"content\":\"## Testing reminders\\n"
  "- [ ] Keyboard accessibility\\n- [ ] Window lifecycle\\n#Work\",\"visibility\":\"PRIVATE\"}"
  "]}";

gboolean gc_demo_replace_page(GcMemoStore *store, const guint8 *json,
                              gsize json_size, GError **error) {
  g_return_val_if_fail(store != NULL, FALSE);
  GcRemoteMemoPage *page = gc_remote_memo_page_parse(json, json_size, error);
  if (!page) return FALSE;
  GcMemoStore *candidate = gc_memo_store_new();
  gboolean complete = TRUE;
  for (guint i = 0; i < page->memos->len; ++i) {
    const GcRemoteMemo *remote = g_ptr_array_index(page->memos, i);
    /* Native memo editor forbids empty local memos. Never silently drop one. */
    const gchar *content = remote->content[0] ? remote->content : "[Empty synthetic memo]";
    GcMemo *memo = gc_memo_store_add(candidate, content);
    if (!memo) {
      complete = FALSE;
      break;
    }
    memo->pinned = remote->pinned;
    memo->is_private = g_str_equal(remote->visibility, "PRIVATE");
  }
  if (complete) {
    /* Atomically swap the complete in-memory demo; no partial application. */
    GPtrArray *previous_items = store->items;
    guint64 previous_next_id = store->next_id;
    store->items = candidate->items;
    store->next_id = candidate->next_id;
    candidate->items = previous_items;
    candidate->next_id = previous_next_id;
  } else {
    g_set_error_literal(error, g_quark_from_static_string("goreecloud-native-demo"),
                        1, "Synthetic page could not be mapped to local memo models");
  }
  gc_memo_store_free(candidate);
  gc_remote_memo_page_free(page);
  return complete;
}
gboolean gc_demo_seed_fixture(GcMemoStore *store, GError **error) {
  return gc_demo_replace_page(store, (const guint8 *)fixture,
                              sizeof(fixture) - 1, error);
}
