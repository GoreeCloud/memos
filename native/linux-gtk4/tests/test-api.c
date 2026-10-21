#include "../api.h"
#include <glib.h>
#include <string.h>

static void test_https_origin(void) {
  GError *e = NULL;
  GcApiClient *c = gc_api_client_new("https://memos.example.org/", &e);
  g_assert_no_error(e);
  g_assert_nonnull(c);
  g_assert_cmpstr(gc_api_client_get_origin(c), ==, "https://memos.example.org");
  gc_api_client_free(c);

  const gchar *invalid[] = {
    NULL, "", "http://memos.example.org", "https://user:pass@memos.example.org",
    "https://memos.example.org/secret", "https://memos.example.org/?a=1",
    "https://memos.example.org/#fragment", "https://memos.example.org\\other",
    "https://memos.example.org\r\nHeader", "https://memos.example.org:0",
    "https://memos.example.org:99999", "https://memo%0As.example.org",
    "https://"
  };
  for (guint i=0; i<G_N_ELEMENTS(invalid); ++i) {
    c = gc_api_client_new(invalid[i], &e);
    g_assert_null(c);
    g_assert_error(e, GC_API_ERROR, GC_API_ERROR_INVALID_SERVER);
    g_clear_error(&e);
  }
  c = gc_api_client_new("https://memos.example.org:8443", &e);
  g_assert_no_error(e);
  g_assert_cmpstr(gc_api_client_get_origin(c), ==, "https://memos.example.org:8443");
  gc_api_client_free(c);
}

static void test_bearer_lifecycle(void) {
  GError *e=NULL;
  GcApiClient *c=gc_api_client_new("https://memos.example.org",&e);
  g_assert_false(gc_api_client_is_authenticated(c));
  g_assert_false(gc_api_client_set_access_token(c,"A\r\nX-Test: yes",&e));
  g_assert_error(e,GC_API_ERROR,GC_API_ERROR_INVALID_TOKEN);
  g_clear_error(&e);
  g_assert_false(gc_api_client_is_authenticated(c));
  g_assert_true(gc_api_client_set_access_token(c,"a.b-C_d~1+/==",&e));
  g_assert_no_error(e);
  g_assert_true(gc_api_client_is_authenticated(c));
  g_assert_false(gc_api_client_set_access_token(c,"bad token",&e));
  g_clear_error(&e);
  g_assert_true(gc_api_client_is_authenticated(c)); /* invalid rotation leaves old token */
  g_assert_true(gc_api_client_set_access_token(c,"fresh-token",&e));
  g_assert_no_error(e);
  gc_api_client_clear_access_token(c);
  g_assert_false(gc_api_client_is_authenticated(c));
  gc_api_client_free(c);
}

static void test_unauthenticated_request(void) {
  GError *e=NULL;
  GcApiClient *c=gc_api_client_new("https://memos.example.org",&e);
  GcApiRequest *r=gc_api_prepare_list_memos(c,NULL,&e);
  g_assert_null(r);
  g_assert_error(e,GC_API_ERROR,GC_API_ERROR_NOT_AUTHENTICATED);
  g_clear_error(&e);
  gc_api_client_free(c);
}
static void test_bounded_list(void) {
  GError *e=NULL;
  GcApiClient *c=gc_api_client_new("https://memos.example.org",&e);
  g_assert_true(gc_api_client_set_access_token(c,"secret-token",&e));
  GcApiRequest *r=gc_api_prepare_list_memos(c,NULL,&e);
  g_assert_no_error(e);
  g_assert_cmpstr(r->method,==,"GET");
  g_assert_nonnull(strstr(r->relative_uri,"page_size=50"));
  g_assert_nonnull(strstr(r->relative_uri,"state=NORMAL"));
  g_assert_nonnull(strstr(r->relative_uri,"order_by=update_time%20desc"));
  g_assert_null(strstr(r->relative_uri,"secret-token"));
  gc_api_request_free(r);

  GcApiMemoQuery q={.page_size=25,.page_token="ABC+/?=xyz",.facet=GC_API_MEMOS_PRIVATE};
  r=gc_api_prepare_list_memos(c,&q,&e);
  g_assert_no_error(e);
  g_assert_nonnull(strstr(r->relative_uri,"page_size=25"));
  g_assert_nonnull(strstr(r->relative_uri,"page_token=ABC%2B%2F%3F%3Dxyz"));
  g_assert_nonnull(strstr(r->relative_uri,"filter=visibility%20%3D%3D%20%22PRIVATE%22"));
  gc_api_request_free(r);
  q.facet=GC_API_MEMOS_ARCHIVED;
  r=gc_api_prepare_list_memos(c,&q,&e);
  g_assert_nonnull(strstr(r->relative_uri,"state=ARCHIVED"));
  gc_api_request_free(r);
  gc_api_client_free(c);
}

static void test_page_restrictions(void) {
  GError *error=NULL;
  GcApiClient *client=gc_api_client_new("https://example.org",&error);
  g_assert_true(gc_api_client_set_access_token(client,"demo",&error));
  GcApiMemoQuery q={.page_size=101};
  g_assert_null(gc_api_prepare_list_memos(client,&q,&error));
  g_assert_error(error,GC_API_ERROR,GC_API_ERROR_INVALID_PAGE);
  g_clear_error(&error);
  q.page_size=25;
  q.page_token="line\nerror";
  g_assert_null(gc_api_prepare_list_memos(client,&q,&error));
  g_assert_error(error,GC_API_ERROR,GC_API_ERROR_INVALID_PAGE);
  g_clear_error(&error);
  q.page_token=NULL;
  q.facet=(GcApiMemoFacet)-1;
  g_assert_null(gc_api_prepare_list_memos(client,&q,&error));
  g_assert_error(error,GC_API_ERROR,GC_API_ERROR_INVALID_PAGE);
  g_clear_error(&error);
  q.facet=GC_API_MEMOS_TASKS;
  GcApiRequest *req=gc_api_prepare_list_memos(client,&q,&error);
  g_assert_no_error(error);
  g_assert_nonnull(strstr(req->relative_uri,"has_task_list%20%3D%3D%20true"));
  gc_api_request_free(req);
  gc_api_client_free(client);
}

static void test_response_gate(void) {
  g_assert_cmpint(gc_api_classify_response(200,"application/json",100),==,GC_API_RESPONSE_OK);
  g_assert_cmpint(gc_api_classify_response(200,"application/json; charset=utf-8",100),==,GC_API_RESPONSE_OK);
  g_assert_cmpint(gc_api_classify_response(200,"text/html",100),==,GC_API_RESPONSE_BAD_RESPONSE);
  g_assert_cmpint(gc_api_classify_response(200,"application/json",5u*1024u*1024u),==,GC_API_RESPONSE_BAD_RESPONSE);
  g_assert_cmpint(gc_api_classify_response(302,"application/json",0),==,GC_API_RESPONSE_BAD_RESPONSE);
  g_assert_cmpint(gc_api_classify_response(401,NULL,0),==,GC_API_RESPONSE_AUTH_REQUIRED);
  g_assert_cmpint(gc_api_classify_response(403,NULL,0),==,GC_API_RESPONSE_FORBIDDEN);
  g_assert_cmpint(gc_api_classify_response(429,NULL,0),==,GC_API_RESPONSE_RATE_LIMITED);
  g_assert_cmpint(gc_api_classify_response(503,NULL,0),==,GC_API_RESPONSE_RETRYABLE);
}

int main(int argc,char **argv) {
  g_test_init(&argc,&argv,NULL);
  g_test_add_func("/api/server-origin",test_https_origin);
  g_test_add_func("/api/token-lifecycle",test_bearer_lifecycle);
  g_test_add_func("/api/sign-in-required",test_unauthenticated_request);
  g_test_add_func("/api/memo-list",test_bounded_list);
  g_test_add_func("/api/page-restrictions",test_page_restrictions);
  g_test_add_func("/api/response-gate",test_response_gate);
  return g_test_run();
}
