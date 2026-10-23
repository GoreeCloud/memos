#include "../response.h"
#include <glib.h>
#include <string.h>

static GcRemoteMemoPage *parse(const gchar *s) {
  GError *error = NULL;
  GcRemoteMemoPage *page =
      gc_remote_memo_page_parse((const guint8 *)s, strlen(s), &error);
  g_assert_no_error(error);
  g_assert_nonnull(page);
  return page;
}
static void rejects(const gchar *s) {
  GError *error = NULL;
  GcRemoteMemoPage *page =
      gc_remote_memo_page_parse((const guint8 *)s, strlen(s), &error);
  g_assert_null(page);
  g_assert_nonnull(error);
  g_clear_error(&error);
}
static void test_valid_page(void) {
  GcRemoteMemoPage *page =
    parse("{\"memos\":[{\"name\":\"memos/abc-123\",\"content\":\"Привет 🌍\","
          "\"visibility\":\"PRIVATE\",\"pinned\":true}],\"nextPageToken\":\"xyz-11\"}");
  g_assert_cmpuint(page->memos->len, ==, 1);
  GcRemoteMemo *memo = g_ptr_array_index(page->memos, 0);
  g_assert_cmpstr(memo->name, ==, "memos/abc-123");
  g_assert_cmpstr(memo->visibility, ==, "PRIVATE");
  g_assert_cmpstr(memo->content, ==, "Привет 🌍");
  g_assert_true(memo->pinned);
  g_assert_cmpstr(page->next_page_token, ==, "xyz-11");
  gc_remote_memo_page_free(page);
}
static void test_empty_and_defaults(void) {
  GcRemoteMemoPage *page = parse("{}"); /* proto3 omits empty repeated fields */
  g_assert_cmpuint(page->memos->len, ==, 0);
  g_assert_cmpstr(page->next_page_token, ==, "");
  gc_remote_memo_page_free(page);
  page = parse("{\"memos\":[{\"name\":\"memos/x\",\"content\":\"\","
               "\"visibility\":\"PUBLIC\"}]}");
  g_assert_cmpuint(page->memos->len, ==, 1);
  GcRemoteMemo *memo = g_ptr_array_index(page->memos, 0);
  g_assert_false(memo->pinned);
  gc_remote_memo_page_free(page);
}
static void test_reject_schema(void) {
  const gchar *invalid[] = {
    "[]", "{}", /* {} is checked separately below, so exclude it */
    "{\"memos\":null}", "{\"memos\":{}}",
    "{\"memos\":[null]}", "{\"memos\":[{\"name\":1}]}",
    "{\"memos\":[{\"name\":\"memos/a/b\",\"visibility\":\"PRIVATE\"}]}",
    "{\"memos\":[{\"name\":\"memos/valid\",\"visibility\":\"UNKNOWN\"}]}",
    "{\"memos\":[{\"name\":\"memos/valid\",\"visibility\":\"PRIVATE\",\"pinned\":1}]}",
    "{\"nextPageToken\":null}", "{\"nextPageToken\":\"bad\\nheader\"}",
    "{\"nextPageToken\":3}", "{\"memos\":[}"
  };
  for (guint i = 0; i < G_N_ELEMENTS(invalid); ++i) {
    if (i == 1) continue;
    rejects(invalid[i]);
  }
}
static void test_limits(void) {
  GError *error = NULL;
  guint8 *big = g_malloc0(4u * 1024u * 1024u + 1);
  memset(big, 'a', 4u * 1024u * 1024u + 1);
  g_assert_null(gc_remote_memo_page_parse(big, 4u*1024u*1024u+1, &error));
  g_assert_nonnull(error); g_clear_error(&error); g_free(big);
  GString *json = g_string_new("{\"memos\":[");
  for (int i = 0; i < 101; ++i)
    g_string_append_printf(json, "%s{\"name\":\"memos/n%d\",\"visibility\":\"PRIVATE\"}",
                            i ? "," : "", i);
  g_string_append(json, "]}");
  rejects(json->str);
  g_string_free(json, TRUE);
  json = g_string_new("{\"nextPageToken\":\"");
  for (int i = 0; i < 2049; ++i) g_string_append_c(json, 'x');
  g_string_append(json, "\"}");
  rejects(json->str);
  g_string_free(json, TRUE);
}
static void test_invalid_encoding(void) {
  GError *error = NULL;
  const guint8 invalid[] = { '{', 0xff, '}' };
  g_assert_null(gc_remote_memo_page_parse(invalid, sizeof invalid, &error));
  g_assert_nonnull(error);
  g_clear_error(&error);
}
int main(int argc, char **argv) {
  g_test_init(&argc, &argv, NULL);
  g_test_add_func("/native/response/valid", test_valid_page);
  g_test_add_func("/native/response/defaults", test_empty_and_defaults);
  g_test_add_func("/native/response/schema", test_reject_schema);
  g_test_add_func("/native/response/limits", test_limits);
  g_test_add_func("/native/response/utf8", test_invalid_encoding);
  return g_test_run();
}
