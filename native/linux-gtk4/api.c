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
  if (size > 100 || query->facet > GC_API_MEMOS_ARCHIVED ||
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
  result->relative_uri = g_string_free(path, FALSE);
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
