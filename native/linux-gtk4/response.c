#include "response.h"
#include <json-glib/json-glib.h>
#include <string.h>

#define MAX_PAGE_BYTES (4u * 1024u * 1024u)
#define MAX_MEMOS 100
#define MAX_CONTENT_BYTES (64u * 1024u)
#define MAX_PAGE_TOKEN_BYTES 2048

static GQuark parse_domain(void) {
  return g_quark_from_static_string("goreecloud-native-memo-page");
}
static void memo_free(gpointer value) {
  GcRemoteMemo *memo = value;
  g_free(memo->name);
  g_free(memo->content);
  g_free(memo->visibility);
  g_free(memo);
}
void gc_remote_memo_page_free(GcRemoteMemoPage *page) {
  if (!page) return;
  g_ptr_array_unref(page->memos);
  g_free(page->next_page_token);
  g_free(page);
}
static gboolean valid_token(const gchar *token) {
  if (!token || strlen(token) > MAX_PAGE_TOKEN_BYTES) return FALSE;
  for (const guchar *p = (const guchar *)token; *p; ++p) {
    if (*p < 33 || *p > 126) return FALSE;
  }
  return TRUE;
}
static gboolean valid_resource_name(const gchar *name) {
  if (!name || !g_str_has_prefix(name, "memos/")) return FALSE;
  gsize size = strlen(name);
  if (size <= strlen("memos/") || size > 256) return FALSE;
  for (const guchar *p = (const guchar *)name + 6; *p; ++p)
    if (!g_ascii_isalnum(*p) && *p != '-' && *p != '_') return FALSE;
  return TRUE;
}
static gchar *read_string(JsonObject *object, const gchar *field,
                          gboolean required) {
  JsonNode *node = json_object_get_member(object, field);
  if (!node) return required ? NULL : g_strdup("");
  if (!JSON_NODE_HOLDS_VALUE(node) ||
      json_node_get_value_type(node) != G_TYPE_STRING) return NULL;
  const gchar *value = json_node_get_string(node);
  return value ? g_strdup(value) : NULL;
}
static gboolean valid_visibility(const gchar *visibility) {
  return g_str_equal(visibility, "PRIVATE") ||
         g_str_equal(visibility, "PROTECTED") ||
         g_str_equal(visibility, "PUBLIC") ||
         g_str_equal(visibility, "SPACE");
}
GcRemoteMemoPage *gc_remote_memo_page_parse(const guint8 *bytes,
                                            gsize length, GError **error) {
  if (!bytes || length == 0 || length > MAX_PAGE_BYTES ||
      !g_utf8_validate((const gchar *)bytes, (gssize)length, NULL)) {
    g_set_error_literal(error, parse_domain(), 1, "Invalid or oversized UTF-8 memo page");
    return NULL;
  }
  JsonParser *parser = json_parser_new();
  GError *json_error = NULL;
  gboolean ok = json_parser_load_from_data(parser, (const gchar *)bytes,
                                           (gssize)length, &json_error);
  g_clear_error(&json_error);
  if (!ok || !JSON_NODE_HOLDS_OBJECT(json_parser_get_root(parser))) {
    g_set_error_literal(error, parse_domain(), 2, "Invalid JSON memo page");
    g_object_unref(parser);
    return NULL;
  }
  JsonObject *root = json_node_get_object(json_parser_get_root(parser));
  JsonNode *entries = json_object_get_member(root, "memos");
  JsonArray *array = NULL;
  if (entries) {
    if (!JSON_NODE_HOLDS_ARRAY(entries) ||
        json_array_get_length(json_node_get_array(entries)) > MAX_MEMOS) {
      g_set_error_literal(error, parse_domain(), 3, "Memo collection has invalid size or type");
      g_object_unref(parser);
      return NULL;
    }
    array = json_node_get_array(entries);
  }
  gchar *token = read_string(root, "nextPageToken", FALSE);
  if (!valid_token(token)) {
    g_set_error_literal(error, parse_domain(), 4, "Invalid server paging token");
    g_free(token);
    g_object_unref(parser);
    return NULL;
  }
  GcRemoteMemoPage *page = g_new0(GcRemoteMemoPage, 1);
  page->memos = g_ptr_array_new_with_free_func(memo_free);
  page->next_page_token = token;
  for (guint i = 0, count = array ? json_array_get_length(array) : 0;
       i < count; ++i) {
    JsonNode *member = json_array_get_element(array, i);
    if (!JSON_NODE_HOLDS_OBJECT(member)) { ok = FALSE; break; }
    JsonObject *entry = json_node_get_object(member);
    GcRemoteMemo *memo = g_new0(GcRemoteMemo, 1);
    memo->name = read_string(entry, "name", TRUE);
    memo->content = read_string(entry, "content", FALSE);
    memo->visibility = read_string(entry, "visibility", TRUE);
    JsonNode *pin = json_object_get_member(entry, "pinned");
    gboolean valid_pin = !pin ||
      (JSON_NODE_HOLDS_VALUE(pin) &&
       json_node_get_value_type(pin) == G_TYPE_BOOLEAN);
    if (!valid_resource_name(memo->name) || !memo->content ||
        strlen(memo->content) > MAX_CONTENT_BYTES || !memo->visibility ||
        !valid_visibility(memo->visibility) || !valid_pin) {
      memo_free(memo);
      ok = FALSE;
      break;
    }
    memo->pinned = pin ? json_node_get_boolean(pin) : FALSE;
    g_ptr_array_add(page->memos, memo);
  }
  g_object_unref(parser);
  if (!ok) {
    gc_remote_memo_page_free(page);
    g_set_error_literal(error, parse_domain(), 5, "Memo entry failed validation");
    return NULL;
  }
  return page;
}
