#include "../demo-feed.h"
#include <glib.h>
#include <string.h>

static gboolean load(GcMemoStore *store, const gchar *json, GError **error) {
  return gc_demo_replace_page(store, (const guint8 *)json, strlen(json), error);
}
static void test_fixture_initialization(void) {
  GcMemoStore *store = gc_memo_store_new();
  GError *error = NULL;
  g_assert_true(gc_demo_seed_fixture(store, &error));
  g_assert_no_error(error);
  g_assert_cmpuint(store->items->len, ==, 6);
  GcMemo *first = g_ptr_array_index(store->items, 0);
  g_assert_true(first->pinned);
  g_assert_true(first->is_private);
  g_assert_cmpstr(first->content, !=, "");
  g_assert_true(gc_memo_matches(first, GC_MEMOS_PINNED, NULL,
                                g_get_real_time()/G_USEC_PER_SEC));
  guint private_count = 0;
  for (guint i=0; i<store->items->len; i++) {
    GcMemo *m = g_ptr_array_index(store->items, i);
    if (m->is_private) private_count++;
  }
  g_assert_cmpuint(private_count, ==, 4);
  gc_memo_store_free(store);
}
static void test_fail_closed_transaction(void) {
  GcMemoStore *store = gc_memo_store_new();
  GcMemo *memo = gc_memo_store_add(store, "Keep this synthetic note");
  guint64 id = memo->id;
  GError *error = NULL;
  const gchar *bad = "{\"memos\":[{\"name\":\"memos/invalid/slash\"}]}";
  g_assert_false(load(store, bad, &error));
  g_assert_nonnull(error);
  g_clear_error(&error);
  g_assert_cmpuint(store->items->len, ==, 1);
  g_assert_true(gc_memo_store_find(store, id) == memo);
  g_assert_cmpstr(memo->content, ==, "Keep this synthetic note");
  gc_memo_store_free(store);
}
static void test_atomic_replace(void) {
  GcMemoStore *store = gc_memo_store_new();
  gc_memo_store_add(store, "Earlier local draft");
  GError *error = NULL;
  const gchar *json =
    "{\"memos\":[{\"name\":\"memos/one\",\"content\":\"- [ ] Test #Work\","
    "\"visibility\":\"PRIVATE\",\"pinned\":true},"
    "{\"name\":\"memos/two\",\"visibility\":\"PUBLIC\"}],"
    "\"nextPageToken\":\"token\"}";
  g_assert_true(load(store, json, &error));
  g_assert_no_error(error);
  g_assert_cmpuint(store->items->len, ==, 2);
  GcMemo *one = g_ptr_array_index(store->items, 0);
  GcMemo *two = g_ptr_array_index(store->items, 1);
  g_assert_true(one->pinned);
  g_assert_true(one->is_private);
  g_assert_false(two->is_private);
  g_assert_cmpstr(two->content, ==, "[Empty synthetic memo]");
  g_assert_true(gc_memo_matches(one, GC_MEMOS_TASKS, NULL,
                                g_get_real_time()/G_USEC_PER_SEC));
  g_assert_true(gc_memo_matches(one, GC_MEMOS_LABELS, NULL,
                                g_get_real_time()/G_USEC_PER_SEC));
  gc_memo_store_free(store);
}
static void test_literal_untrusted_text(void) {
  GcMemoStore *store = gc_memo_store_new();
  const gchar *data =
    "{\"memos\":[{\"name\":\"memos/one\","
    "\"content\":\"<script>alert(1)</script> & markdown **bold**\","
    "\"visibility\":\"PRIVATE\"}]}";
  GError *error = NULL;
  g_assert_true(load(store, data, &error));
  g_assert_no_error(error);
  GcMemo *memo = g_ptr_array_index(store->items, 0);
  g_assert_cmpstr(memo->content, ==,
                  "<script>alert(1)</script> & markdown **bold**");
  /* GTK renders this via gtk_label_set_text(), never parsed markup. */
  gc_memo_store_free(store);
}
int main(int argc, char **argv) {
  g_test_init(&argc,&argv,NULL);
  g_test_add_func("/native/demo/seed", test_fixture_initialization);
  g_test_add_func("/native/demo/atomic-reject", test_fail_closed_transaction);
  g_test_add_func("/native/demo/atomic-replace", test_atomic_replace);
  g_test_add_func("/native/demo/literal-text", test_literal_untrusted_text);
  return g_test_run();
}
