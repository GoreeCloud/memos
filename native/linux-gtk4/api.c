#include "api.h"
#include <string.h>

#define MAX_TOKEN_BYTES 8192
#define MAX_PAGE_TOKEN_BYTES 2048
#define MAX_RESPONSE_BYTES (4u * 1024u * 1024u)

struct _GcApiClient {
  gchar *origin;
  gchar *access_token;
};

GQuark gc_api_error_quark(void) {
  return g_quark_from_static_string("goreecloud-native-api-error");
}

static void wipe_secret(gchar *secret) {
  if (!secret) return;
  /* Volatile writes prevent the token erasure from being optimized away. */
  volatile unsigned char *p = (volatile unsigned char *)secret;
  for (gsize i = 0, n = strlen(secret); i < n; ++i) p[i] = 0;
  g_free(secret);
}

GcApiClient *gc_api_client_new(const gchar *origin, GError **error) {
  if (!origin || strlen(origin) > 2048 || !g_str_has_prefix(origin, "https://")) {
    g_set_error_literal(error, GC_API_ERROR, GC_API_ERROR_INVALID_SERVER,
                        "Only HTTPS server origins are permitted");
    return NULL;
  }
  for (const gchar *p = origin; *p; ++p) {
    if (g_ascii_isspace(*p) || *p == '\\') {
      g_set_error_literal(error, GC_API_ERROR, GC_API_ERROR_INVALID_SERVER,
                          "Whitespace and backslashes are not valid in a server origin");
      return NULL;
    }
  }
  GError *parse_error = NULL;
  GUri *uri = g_uri_parse(origin, G_URI_FLAGS_NONE, &parse_error);
  if (!uri) {
    g_clear_error(&parse_error);
    g_set_error_literal(error, GC_API_ERROR, GC_API_ERROR_INVALID_SERVER,
                        "Invalid server origin");
    return NULL;
  }
  const gchar *host = g_uri_get_host(uri);
  const gchar *path = g_uri_get_path(uri);
  const gchar *userinfo = g_uri_get_userinfo(uri);
  gint port = g_uri_get_port(uri);
  gboolean valid = g_strcmp0(g_uri_get_scheme(uri), "https") == 0 &&
                   host && *host && !userinfo &&
                   !g_uri_get_query(uri) && !g_uri_get_fragment(uri) &&
                   (!path || !*path || g_str_equal(path, "/")) &&
                   (port == -1 || (port > 0 && port <= 65535));
  /* Reject percent-encoded delimiters and controls after URI decoding.
   * Initial transport integration supports ASCII/punycode hosts only. */
  if (host) {
    for (const guchar *p = (const guchar *)host; *p; ++p) {
      if (!g_ascii_isalnum(*p) && *p != '.' && *p != '-' && *p != ':') {
        valid = FALSE;
        break;
      }
    }
  }
  if (!valid) {
    g_uri_unref(uri);
    g_set_error_literal(error, GC_API_ERROR, GC_API_ERROR_INVALID_SERVER,
                        "Expected one HTTPS origin without credentials, path, query or fragment");
    return NULL;
  }
  GcApiClient *client = g_new0(GcApiClient, 1);
  gboolean ipv6 = strchr(host, ':') != NULL;
  gchar *host_fmt = ipv6 ? g_strdup_printf("[%s]", host) : g_strdup(host);
  client->origin = port == -1 || port == 443
                     ? g_strdup_printf("https://%s", host_fmt)
                     : g_strdup_printf("https://%s:%d", host_fmt, port);
  g_free(host_fmt);
  g_uri_unref(uri);
  return client;
}

void gc_api_client_clear_access_token(GcApiClient *client) {
  if (!client) return;
  wipe_secret(client->access_token);
  client->access_token = NULL;
}

void gc_api_client_free(GcApiClient *client) {
  if (!client) return;
  gc_api_client_clear_access_token(client);
  g_free(client->origin);
  g_free(client);
}
const gchar *gc_api_client_get_origin(const GcApiClient *client) {
  return client ? client->origin : NULL;
}
gboolean gc_api_client_is_authenticated(const GcApiClient *client) {
  return client && client->access_token && *client->access_token;
}

static gboolean valid_bearer_char(gchar c) {
  return g_ascii_isalnum(c) || strchr("-._~+/=", c) != NULL;
}

gboolean gc_api_client_set_access_token(GcApiClient *client,
                                        const gchar *token, GError **error) {
  g_return_val_if_fail(client != NULL, FALSE);
  gsize length = token ? strlen(token) : 0;
  if (length == 0 || length > MAX_TOKEN_BYTES) {
    g_set_error_literal(error, GC_API_ERROR, GC_API_ERROR_INVALID_TOKEN,
                        "Access token is missing or exceeds the allowed bound");
    return FALSE;
  }
  for (const gchar *p = token; *p; ++p) {
    if (!valid_bearer_char(*p)) {
      g_set_error_literal(error, GC_API_ERROR, GC_API_ERROR_INVALID_TOKEN,
                          "Access token contains unsupported header characters");
      return FALSE;
    }
  }
  gchar *copy = g_strdup(token);
  gc_api_client_clear_access_token(client);
  client->access_token = copy;
  return TRUE;
}

static const gchar *facet_filter(GcApiMemoFacet facet) {
  switch (facet) {
    case GC_API_MEMOS_ALL: return NULL;
    case GC_API_MEMOS_PINNED: return "pinned == true";
    case GC_API_MEMOS_PRIVATE: return "visibility == \"PRIVATE\"";
    case GC_API_MEMOS_TASKS: return "has_task_list == true";
    case GC_API_MEMOS_ARCHIVED: return NULL;
    default: return NULL;
  }
}

static gboolean valid_page_token(const gchar *token) {
  if (!token) return TRUE;
  gsize len = strlen(token);
  if (len > MAX_PAGE_TOKEN_BYTES) return FALSE;
  /* Server paging token is opaque; forbid control characters and non-ASCII. */
  for (const gchar *p = token; *p; ++p) {
    if ((guchar)*p < 33 || (guchar)*p > 126) return FALSE;
  }
  return TRUE;
}

GcApiRequest *gc_api_prepare_list_memos(const GcApiClient *client,
                                        const GcApiMemoQuery *query,
                                        GError **error) {
  if (!gc_api_client_is_authenticated(client)) {
    g_set_error_literal(error, GC_API_ERROR, GC_API_ERROR_NOT_AUTHENTICATED,
                        "Sign-in is required before preparing private memo requests");
    return NULL;
  }
  GcApiMemoQuery empty = {0};
  if (!query) query = &empty;
  guint size = query->page_size ? query->page_size : 50;
  if (size > 100 || query->facet < GC_API_MEMOS_ALL ||
      query->facet > GC_API_MEMOS_ARCHIVED ||
      !valid_page_token(query->page_token)) {
    g_set_error_literal(error, GC_API_ERROR, GC_API_ERROR_INVALID_PAGE,
                        "Invalid bounded pagination or memo filter");
    return NULL;
  }
  GString *path = g_string_new("/api/v1/memos?");
  g_string_append_printf(path, "page_size=%u&state=%s&order_by=",
                         size, query->facet == GC_API_MEMOS_ARCHIVED ? "ARCHIVED" : "NORMAL");
  gchar *escaped_order = g_uri_escape_string("update_time desc", NULL, TRUE);
  g_string_append(path, escaped_order);
  g_free(escaped_order);
  const gchar *filter = facet_filter(query->facet);
  if (filter) {
    gchar *escaped = g_uri_escape_string(filter, NULL, TRUE);
    g_string_append_printf(path, "&filter=%s", escaped);
    g_free(escaped);
  }
  if (query->page_token && *query->page_token) {
    gchar *escaped = g_uri_escape_string(query->page_token, NULL, TRUE);
    g_string_append_printf(path, "&page_token=%s", escaped);
    g_free(escaped);
  }
  GcApiRequest *result = g_new0(GcApiRequest, 1);
  result->method = "GET";
  /* GLib >=2.76 rewrites g_string_free(str, FALSE) into the newer
   * g_string_free_and_steal() symbol. Keep the GTK4 4.10 / GLib 2.72
   * binary ABI by copying the bounded string and freeing its builder. */
  result->relative_uri = g_strdup(path->str);
  g_string_free(path, TRUE);
  return result;
}

void gc_api_request_free(GcApiRequest *request) {
  if (!request) return;
  g_free(request->relative_uri);
  g_free(request);
}

GcApiResponseStatus gc_api_classify_response(guint status,
                                             const gchar *content_type,
                                             gsize body_bytes) {
  if (status == 401) return GC_API_RESPONSE_AUTH_REQUIRED;
  if (status == 403) return GC_API_RESPONSE_FORBIDDEN;
  if (status == 429) return GC_API_RESPONSE_RATE_LIMITED;
  if (status == 408 || status >= 500) return GC_API_RESPONSE_RETRYABLE;
  if (status != 200) return status >= 300 && status < 400
                           ? GC_API_RESPONSE_BAD_RESPONSE
                           : GC_API_RESPONSE_PERMANENT_ERROR;
  if (body_bytes > MAX_RESPONSE_BYTES || !content_type) return GC_API_RESPONSE_BAD_RESPONSE;
  const gchar *sep = strchr(content_type, ';');
  gsize len = sep ? (gsize)(sep - content_type) : strlen(content_type);
  if (len != strlen("application/json") ||
      g_ascii_strncasecmp(content_type, "application/json", len) != 0)
    return GC_API_RESPONSE_BAD_RESPONSE;
  return GC_API_RESPONSE_OK;
}

/* Native HTTPS read transport, callable only by explicit client integration.
 * Nothing in the synthetic GTK4 board initiates network requests. */
#include <curl/curl.h>

typedef struct {
  GByteArray *body;
  gboolean exceeded;
} GcHttpBody;

static size_t gc_http_capture(char *buffer, size_t size, size_t count, void *opaque) {
  GcHttpBody *capture = opaque;
  if (size && count > G_MAXSIZE / size) return 0;
  size_t length = size * count;
  if (length > MAX_RESPONSE_BYTES - MIN((gsize)capture->body->len,
                                         (gsize)MAX_RESPONSE_BYTES)) {
    capture->exceeded = TRUE;
    return 0;
  }
  g_byte_array_append(capture->body, (const guint8 *)buffer, (guint)length);
  return length;
}

static int gc_api_cancel_progress(void *opaque, curl_off_t dl_total,
                                  curl_off_t dl_now, curl_off_t ul_total,
                                  curl_off_t ul_now) {
  (void) dl_total; (void) dl_now; (void) ul_total; (void) ul_now;
  return opaque && g_cancellable_is_cancelled(G_CANCELLABLE(opaque)) ? 1 : 0;
}

void gc_api_https_result_free(GcApiHttpsResult *response) {
  if (!response) return;
  if (response->page) gc_remote_memo_page_free(response->page);
  g_free(response);
}

/* ca_file is null for real user connections. It exists only in the
 * GC_API_TESTING fixture call and NEVER disables TLS peer/host verification. */
static GcApiHttpsResult *gc_api_fetch_impl(GcApiClient *client,
                                           const GcApiMemoQuery *query,
                                           const gchar *ca_file,
                                           GCancellable *cancel,
                                           GError **error) {
  if (cancel && g_cancellable_is_cancelled(cancel)) {
    g_set_error_literal(error, GC_API_ERROR, GC_API_ERROR_CANCELLED,
                        "HTTPS request was cancelled");
    return NULL;
  }
  GcApiRequest *plan = gc_api_prepare_list_memos(client, query, error);
  if (!plan) return NULL;
  gchar *target = g_strconcat(client->origin, plan->relative_uri, NULL);
  gc_api_request_free(plan);
  CURL *curl = curl_easy_init();
  if (!curl) {
    g_free(target);
    g_set_error_literal(error, GC_API_ERROR, GC_API_ERROR_TRANSPORT,
                        "Unable to initialize HTTPS transport");
    return NULL;
  }
  GcHttpBody body = { .body = g_byte_array_new(), .exceeded = FALSE };
  struct curl_slist *headers = curl_slist_append(NULL, "Accept: application/json");
  if (!headers) {
    g_free(target);
    g_byte_array_unref(body.body);
    curl_easy_cleanup(curl);
    g_set_error_literal(error, GC_API_ERROR, GC_API_ERROR_TRANSPORT,
                        "Unable to initialize HTTPS request headers");
    return NULL;
  }

  /* Every libcurl option is mandatory: a silently ignored TLS, auth,
   * protocol, or redirect restriction must never cause a request. */
  gboolean configured = TRUE;
#define GC_SET(option, value) do { \
    if (curl_easy_setopt(curl, option, value) != CURLE_OK) configured = FALSE; \
  } while (0)
  GC_SET(CURLOPT_URL, target);
  GC_SET(CURLOPT_HTTPGET, 1L);
#if LIBCURL_VERSION_NUM >= 0x075500
  GC_SET(CURLOPT_PROTOCOLS_STR, "https");
  GC_SET(CURLOPT_REDIR_PROTOCOLS_STR, "https");
#else
  G_GNUC_BEGIN_IGNORE_DEPRECATIONS
  GC_SET(CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
  GC_SET(CURLOPT_REDIR_PROTOCOLS, CURLPROTO_HTTPS);
  G_GNUC_END_IGNORE_DEPRECATIONS
#endif
  GC_SET(CURLOPT_HTTPHEADER, headers);
  GC_SET(CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
  GC_SET(CURLOPT_XOAUTH2_BEARER, client->access_token);
  GC_SET(CURLOPT_FOLLOWLOCATION, 0L);
  GC_SET(CURLOPT_MAXREDIRS, 0L);
  GC_SET(CURLOPT_UNRESTRICTED_AUTH, 0L);
  GC_SET(CURLOPT_PROXY, "");
  GC_SET(CURLOPT_NOPROXY, "*");
  GC_SET(CURLOPT_SSL_VERIFYPEER, 1L);
  GC_SET(CURLOPT_SSL_VERIFYHOST, 2L);
  GC_SET(CURLOPT_SSLVERSION, CURL_SSLVERSION_TLSv1_2);
  GC_SET(CURLOPT_CONNECTTIMEOUT_MS, 2500L);
  GC_SET(CURLOPT_TIMEOUT_MS, 8000L);
  GC_SET(CURLOPT_LOW_SPEED_LIMIT, 1L);
  GC_SET(CURLOPT_LOW_SPEED_TIME, 5L);
  GC_SET(CURLOPT_NOSIGNAL, 1L);
  GC_SET(CURLOPT_VERBOSE, 0L);
  GC_SET(CURLOPT_ACCEPT_ENCODING, "identity");
  GC_SET(CURLOPT_USERAGENT, "GoreeCloudMemosNativeLinux/0.1-Dev");
  GC_SET(CURLOPT_WRITEFUNCTION, gc_http_capture);
  GC_SET(CURLOPT_WRITEDATA, &body);
  if (cancel) {
    GC_SET(CURLOPT_NOPROGRESS, 0L);
    GC_SET(CURLOPT_XFERINFOFUNCTION, gc_api_cancel_progress);
    GC_SET(CURLOPT_XFERINFODATA, cancel);
  }
#ifdef GC_API_TESTING
  if (ca_file) GC_SET(CURLOPT_CAINFO, ca_file);
#else
  (void) ca_file;
#endif
#undef GC_SET
  if (!configured) {
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    g_byte_array_unref(body.body);
    g_free(target);
    g_set_error_literal(error, GC_API_ERROR, GC_API_ERROR_TRANSPORT,
                        "HTTPS transport security configuration failed");
    return NULL;
  }
  CURLcode code = curl_easy_perform(curl);
  long http_status = 0;
  char *mime = NULL;
  if (code == CURLE_OK) {
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_status);
    curl_easy_getinfo(curl, CURLINFO_CONTENT_TYPE, &mime);
  }
  GcApiHttpsResult *result = NULL;
  gboolean revoke = FALSE;
  if (code != CURLE_OK) {
    gboolean was_cancelled = cancel && g_cancellable_is_cancelled(cancel) &&
                             code == CURLE_ABORTED_BY_CALLBACK;
    g_set_error_literal(error, GC_API_ERROR,
                        was_cancelled ? GC_API_ERROR_CANCELLED
                                      : GC_API_ERROR_TRANSPORT,
                        was_cancelled ? "HTTPS request was cancelled"
                        : body.exceeded ? "HTTPS response exceeds 4 MiB"
                                        : "HTTPS connection failed or timed out");
  } else {
    result = g_new0(GcApiHttpsResult, 1);
    result->status = gc_api_classify_response((guint)http_status,
                                              mime, body.body->len);
    revoke = result->status == GC_API_RESPONSE_AUTH_REQUIRED;
    if (result->status == GC_API_RESPONSE_OK) {
      result->page = gc_remote_memo_page_parse(body.body->data,
                                                body.body->len, error);
      if (!result->page) {
        gc_api_https_result_free(result);
        result = NULL;
      }
    }
  }
  curl_slist_free_all(headers);
  curl_easy_cleanup(curl);
  g_byte_array_unref(body.body);
  g_free(target);
  /* Only revoke after curl has released its borrowed token pointer. */
  if (revoke) gc_api_client_clear_access_token(client);
  return result;
}

GcApiHttpsResult *gc_api_fetch_memos_https(GcApiClient *client,
                                           const GcApiMemoQuery *query,
                                           GError **error) {
  return gc_api_fetch_impl(client, query, NULL, NULL, error);
}
GcApiHttpsResult *gc_api_fetch_memos_https_cancellable(GcApiClient *client,
                                                       const GcApiMemoQuery *query,
                                                       GCancellable *cancel,
                                                       GError **error) {
  return gc_api_fetch_impl(client, query, NULL, cancel, error);
}
#ifdef GC_API_TESTING
GcApiHttpsResult *gc_api_fetch_memos_https_test_ca(GcApiClient *client,
                                                   const GcApiMemoQuery *query,
                                                   const gchar *ca_file,
                                                   GError **error) {
  return gc_api_fetch_impl(client, query, ca_file, NULL, error);
}
GcApiHttpsResult *gc_api_fetch_memos_https_test_ca_cancellable(
    GcApiClient *client, const GcApiMemoQuery *query, const gchar *ca_file,
    GCancellable *cancel, GError **error) {
  return gc_api_fetch_impl(client, query, ca_file, cancel, error);
}
#endif
