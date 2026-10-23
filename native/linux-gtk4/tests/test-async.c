#include "../api.h"
#include <glib.h>
#include <gio/gio.h>

/* Contract check: callback runs on the caller's GLib context, not worker. */
typedef struct {
  GMainLoop *loop;
  GCancellable *cancel;
  GcApiHttpsResult *response;
  GError *error;
  guint pulses;
  gboolean timed_out;
  gboolean callback_on_main;
} TestAsync;

static gboolean pulse(gpointer data) {
  TestAsync *test = data;
  ++test->pulses;
  return G_SOURCE_CONTINUE;
}
static gboolean give_up(gpointer data) {
  TestAsync *test = data;
  test->timed_out = TRUE;
  g_main_loop_quit(test->loop);
  return G_SOURCE_REMOVE;
}
static gboolean cancel_active(gpointer data) {
  g_cancellable_cancel(G_CANCELLABLE(data));
  return G_SOURCE_REMOVE;
}
static void on_result(GObject *source, GAsyncResult *res, gpointer opaque) {
  (void) source;
  TestAsync *test = opaque;
  test->callback_on_main = g_main_context_is_owner(g_main_context_default());
  test->response = gc_api_fetch_memos_finish(res, &test->error);
  g_main_loop_quit(test->loop);
}
int main(int argc, char **argv) {
  if (argc != 4) return 2;
  const gchar *scenario = argv[3];
  GError *error = NULL;
  GcApiClient *client = gc_api_client_new(argv[1], &error);
  g_assert_nonnull(client);
  g_assert_no_error(error);
  if (!g_str_equal(scenario, "unauthenticated"))
    g_assert_true(gc_api_client_set_access_token(client,
                                                 "synthetic-test-token", &error));
  GcApiMemoQuery query = {
    .page_size = 2, .page_token = "x+1", .facet = GC_API_MEMOS_PRIVATE
  };
  if (g_str_equal(scenario, "invalid-page")) query.page_size = 101;
  TestAsync test = { 0 };
  test.loop = g_main_loop_new(NULL, FALSE);
  test.cancel = g_cancellable_new();
  const gboolean before = g_str_equal(scenario, "cancel-before");
  const gboolean during = g_str_equal(scenario, "cancel-midflight");
  if (before) g_cancellable_cancel(test.cancel);
  /* CA path is allowed ONLY in a GC_API_TESTING unit executable. */
  if (g_str_equal(scenario, "invalid-ca"))
    gc_api_fetch_memos_async(client, &query, test.cancel, on_result, &test);
  else
    gc_api_fetch_memos_async_test_ca(client, &query, argv[2], test.cancel,
                                      on_result, &test);
  if (g_str_equal(scenario, "async-early-free")) {
    gc_api_client_free(client);
    client = NULL;
  }
  if (during) g_timeout_add(200, cancel_active, test.cancel);
  guint pulse_id = g_timeout_add(20, pulse, &test);
  guint deadline_id = g_timeout_add(5500, give_up, &test);
  g_main_loop_run(test.loop);
  g_source_remove(pulse_id);
  if (!test.timed_out) g_source_remove(deadline_id);
  g_assert_false(test.timed_out);
  g_assert_true(test.callback_on_main);
  if (g_str_equal(scenario, "unauthenticated") ||
      g_str_equal(scenario, "invalid-page")) {
    g_assert_null(test.response);
    gint expected_error = g_str_equal(scenario, "unauthenticated")
                              ? GC_API_ERROR_NOT_AUTHENTICATED
                              : GC_API_ERROR_INVALID_PAGE;
    g_assert_error(test.error, GC_API_ERROR, expected_error);
  } else if (before || during) {
    g_assert_null(test.response);
    g_assert_nonnull(test.error);
    g_assert_true(g_error_matches(test.error, GC_API_ERROR,
                                  GC_API_ERROR_CANCELLED) ||
                  g_error_matches(test.error, G_IO_ERROR,
                                  G_IO_ERROR_CANCELLED));
  } else if (g_str_equal(scenario, "invalid-ca") ||
             g_str_equal(scenario, "wrong-host")) {
    g_assert_null(test.response);
    g_assert_error(test.error, GC_API_ERROR, GC_API_ERROR_TRANSPORT);
  } else {
    g_assert_no_error(test.error);
    g_assert_nonnull(test.response);
    if (g_str_equal(scenario, "unauthorized")) {
      g_assert_cmpint(test.response->status, ==, GC_API_RESPONSE_AUTH_REQUIRED);
      g_assert_null(test.response->page);
      /* It is the application's responsibility to revoke the current
       * original session after comparing its generation. */
      g_assert_true(gc_api_client_is_authenticated(client));
    } else {
      g_assert_cmpint(test.response->status, ==, GC_API_RESPONSE_OK);
      g_assert_nonnull(test.response->page);
      g_assert_cmpuint(test.response->page->memos->len, ==, 1);
      g_assert_cmpstr(test.response->page->next_page_token, ==, "t+1");
    }
  }
  if (during || g_str_equal(scenario, "async-slow")) {
    g_assert_cmpuint(test.pulses, >=, 3); /* main loop never blocked */
  }
  gc_api_https_result_free(test.response);
  g_clear_error(&test.error);
  g_clear_object(&test.cancel);
  if (client) gc_api_client_free(client);
  g_main_loop_unref(test.loop);
  return 0;
}
