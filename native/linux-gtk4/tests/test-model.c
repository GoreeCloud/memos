#include "../model.h"
#include <glib.h>

static void test_store(void) {
  GcMemoStore *s=gc_memo_store_new();
  g_assert_null(gc_memo_store_add(s," "));
  GcMemo *m=gc_memo_store_add(s,"# Heading\nHello #Work");
  g_assert_nonnull(m);
  guint64 id=m->id;
  g_assert_true(gc_memo_matches(m,GC_MEMOS_ALL,"HELLO",g_get_real_time()/G_USEC_PER_SEC));
  g_assert_true(gc_memo_store_update(m,"Updated text"));
  g_assert_false(gc_memo_store_update(m," "));
  g_assert_cmpstr(m->content,==,"Updated text");
  g_assert_true(gc_memo_store_remove(s,id));
  g_assert_null(gc_memo_store_find(s,id));
  gc_memo_store_free(s);
}
static void test_filters(void) {
  GcMemoStore *s=gc_memo_store_new();
  GcMemo *m=gc_memo_store_add(s,"# Demo\n- [ ] task #Work");
  gint64 now=g_get_real_time()/G_USEC_PER_SEC;
  g_assert_true(gc_memo_matches(m,GC_MEMOS_TASKS,NULL,now));
  g_assert_true(gc_memo_matches(m,GC_MEMOS_LABELS,NULL,now));
  g_assert_true(gc_memo_matches(m,GC_MEMOS_TODAY,NULL,now));
  g_assert_true(gc_memo_matches(m,GC_MEMOS_WEEK,NULL,now));
  g_assert_false(gc_memo_matches(m,GC_MEMOS_PRIVATE,NULL,now));
  m->is_private=TRUE;m->pinned=TRUE;
  g_assert_true(gc_memo_matches(m,GC_MEMOS_PRIVATE,NULL,now));
  g_assert_true(gc_memo_matches(m,GC_MEMOS_PINNED,NULL,now));
  m->archived=TRUE;
  g_assert_false(gc_memo_matches(m,GC_MEMOS_ALL,NULL,now));
  g_assert_true(gc_memo_matches(m,GC_MEMOS_ARCHIVED,NULL,now));
  gc_memo_store_free(s);
}
static void test_unicode(void) {
  GcMemoStore *s=gc_memo_store_new();
  GcMemo *m=gc_memo_store_add(s,"Привет мир");
  g_assert_nonnull(m);
  g_assert_true(gc_memo_matches(m,GC_MEMOS_ALL,"ПРИВЕТ",g_get_real_time()/G_USEC_PER_SEC));
  g_assert_null(gc_memo_store_add(s,"\xFF"));
  g_assert_false(gc_memo_store_update(m,"\xFF"));
  gc_memo_store_free(s);
}
int main(int argc,char **argv) {
  g_test_init(&argc,&argv,NULL);
  g_test_add_func("/native/store",test_store);
  g_test_add_func("/native/filters",test_filters);
  g_test_add_func("/native/unicode",test_unicode);
  return g_test_run();
}
