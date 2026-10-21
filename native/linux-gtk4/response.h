#pragma once
#include <glib.h>

/* Read-only, transport-independent decoding of untrusted ListMemosResponse. */
typedef struct {
  gchar *name;
  gchar *content;
  gchar *visibility;
  gboolean pinned;
} GcRemoteMemo;

typedef struct {
  GPtrArray *memos; /* GcRemoteMemo, owned */
  gchar *next_page_token; /* opaque, owned */
} GcRemoteMemoPage;

GcRemoteMemoPage *gc_remote_memo_page_parse(const guint8 *bytes,
                                            gsize length, GError **error);
void gc_remote_memo_page_free(GcRemoteMemoPage *page);
