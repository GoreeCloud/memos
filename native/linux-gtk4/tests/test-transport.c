#include "../api.h"
#include <glib.h>
#include <stdio.h>
#include <string.h>

/* Driven only by an ephemeral loopback TLS server; no real Memos account. */
static gpointer cancel_soon(gpointer value) {
  g_usleep(200 * 1000);
  g_cancellable_cancel(G_CANCELLABLE(value));
  return NULL;
}
int main(int argc, char **argv) {
  if (argc != 4) return 2;
  const gchar *origin = argv[1];
  const gchar *ca = argv[2];
  const gchar *scenario = argv[3];
  GError *error = NULL;
  GcApiClient *client = gc_api_client_new(origin, &error);
  g_assert_no_error(error);
  g_assert_nonnull(client);
  if (!g_str_equal(scenario, "unauthenticated")) {
    g_assert_true(gc_api_client_set_access_token(client,
                                                 "synthetic-test-token", &error));
    g_assert_no_error(error);
  }
  GcApiMemoQuery query = { .page_size=2, .page_token="x+1",
                           .facet=GC_API_MEMOS_PRIVATE };
  GCancellable *cancel = NULL;
  GThread *canceller = NULL;
  if (g_str_equal(scenario, "cancel-before") ||
      g_str_equal(scenario, "cancel-midflight")) {
    cancel = g_cancellable_new();
    if (g_str_equal(scenario, "cancel-before"))
      g_cancellable_cancel(cancel);
    else
      canceller = g_thread_new("cancel-https-fixture", cancel_soon, cancel);
  }
  GcApiHttpsResult *result =
      cancel ? gc_api_fetch_memos_https_test_ca_cancellable(
                   client, &query, ca, cancel, &error)
      : g_str_equal(scenario, "invalid-ca")
          ? gc_api_fetch_memos_https(client, &query, &error)
          : gc_api_fetch_memos_https_test_ca(client, &query, ca, &error);
  if (canceller) g_thread_join(canceller);
  g_clear_object(&cancel);
  if (g_str_equal(scenario, "unauthenticated")) {
    g_assert_null(result);
    g_assert_error(error, GC_API_ERROR, GC_API_ERROR_NOT_AUTHENTICATED);
  } else if (g_str_equal(scenario, "cancel-before") ||
             g_str_equal(scenario, "cancel-midflight")) {
    g_assert_null(result);
    g_assert_error(error, GC_API_ERROR, GC_API_ERROR_CANCELLED);
  } else if (g_str_equal(scenario, "invalid-ca") ||
             g_str_equal(scenario, "wrong-host") ||
             g_str_equal(scenario, "oversize")) {
    g_assert_null(result);
    g_assert_error(error, GC_API_ERROR, GC_API_ERROR_TRANSPORT);
  } else if (g_str_equal(scenario, "invalid-json")) {
    g_assert_null(result);
    g_assert_nonnull(error);
  } else {
    g_assert_no_error(error);
    g_assert_nonnull(result);
    if (g_str_equal(scenario, "ok")) {
      g_assert_cmpint(result->status, ==, GC_API_RESPONSE_OK);
      g_assert_nonnull(result->page);
      g_assert_cmpuint(result->page->memos->len, ==, 1);
      g_assert_cmpstr(result->page->next_page_token, ==, "t+1");
      const GcRemoteMemo *memo = g_ptr_array_index(result->page->memos, 0);
      g_assert_cmpstr(memo->name, ==, "memos/test-one");
      g_assert_cmpstr(memo->content, ==, "synthetic transport test");
    } else {
      GcApiResponseStatus status = GC_API_RESPONSE_BAD_RESPONSE;
      if (g_str_equal(scenario, "unauthorized"))
        status = GC_API_RESPONSE_AUTH_REQUIRED;
      if (g_str_equal(scenario, "forbidden"))
        status = GC_API_RESPONSE_FORBIDDEN;
      if (g_str_equal(scenario, "rate-limited"))
        status = GC_API_RESPONSE_RATE_LIMITED;
      g_assert_cmpint(result->status, ==, status);
      g_assert_null(result->page);
    }
  }
  if (g_str_equal(scenario, "unauthorized"))
    g_assert_false(gc_api_client_is_authenticated(client));
  if (g_str_equal(scenario, "redirect") ||
      g_str_equal(scenario, "cancel-midflight"))
    g_assert_true(gc_api_client_is_authenticated(client));
  gc_api_https_result_free(result);
  g_clear_error(&error);
  gc_api_client_free(client);
  return 0;
}
