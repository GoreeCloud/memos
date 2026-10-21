#pragma once
#include <glib.h>

typedef enum {
  GC_API_ERROR_INVALID_SERVER,
  GC_API_ERROR_INVALID_TOKEN,
  GC_API_ERROR_NOT_AUTHENTICATED,
  GC_API_ERROR_INVALID_PAGE,
} GcApiError;
GQuark gc_api_error_quark(void);
#define GC_API_ERROR (gc_api_error_quark())

typedef enum {
  GC_API_MEMOS_ALL,
  GC_API_MEMOS_PINNED,
  GC_API_MEMOS_PRIVATE,
  GC_API_MEMOS_TASKS,
  GC_API_MEMOS_ARCHIVED,
} GcApiMemoFacet;

typedef struct _GcApiClient GcApiClient;
typedef struct {
  guint page_size; /* 0 means API default of 50, explicit maximum 100 */
  const gchar *page_token; /* opaque server-issued token; never log */
  GcApiMemoFacet facet;
} GcApiMemoQuery;

typedef struct {
  const gchar *method; /* borrowed constant: GET */
  gchar *relative_uri; /* owned path/query; never includes credentials */
} GcApiRequest;

typedef enum {
  GC_API_RESPONSE_OK,
  GC_API_RESPONSE_AUTH_REQUIRED,
  GC_API_RESPONSE_FORBIDDEN,
  GC_API_RESPONSE_RATE_LIMITED,
  GC_API_RESPONSE_RETRYABLE,
  GC_API_RESPONSE_BAD_RESPONSE,
  GC_API_RESPONSE_PERMANENT_ERROR,
} GcApiResponseStatus;

/* Strict HTTPS origin only. No URI credentials, path, query or fragment. */
GcApiClient *gc_api_client_new(const gchar *origin, GError **error);
void gc_api_client_free(GcApiClient *client);
const gchar *gc_api_client_get_origin(const GcApiClient *client);

/* In-memory bearer token only; no disk/cache, telemetry, or printed token. */
gboolean gc_api_client_set_access_token(GcApiClient *client,
                                        const gchar *token, GError **error);
void gc_api_client_clear_access_token(GcApiClient *client);
gboolean gc_api_client_is_authenticated(const GcApiClient *client);

/* Request plan only, with fixed supported CEL facets; no network IO. */
GcApiRequest *gc_api_prepare_list_memos(const GcApiClient *client,
                                        const GcApiMemoQuery *query,
                                        GError **error);
void gc_api_request_free(GcApiRequest *request);

/* Fail-closed status classification; 3xx never follows redirects. */
GcApiResponseStatus gc_api_classify_response(guint status,
                                             const gchar *content_type,
                                             gsize body_bytes);
