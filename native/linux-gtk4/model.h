#pragma once
#include <glib.h>

typedef enum {
  GC_MEMOS_ALL,
  GC_MEMOS_PINNED,
  GC_MEMOS_PRIVATE,
  GC_MEMOS_TODAY,
  GC_MEMOS_WEEK,
  GC_MEMOS_TASKS,
  GC_MEMOS_LABELS,
  GC_MEMOS_ARCHIVED
} GcMemoFilter;

typedef struct {
  guint64 id;
  gchar *content;
  gboolean pinned;
  gboolean is_private;
  gboolean archived;
  gint64 updated_at;
} GcMemo;

typedef struct {
  GPtrArray *items;
  guint64 next_id;
} GcMemoStore;

GcMemoStore *gc_memo_store_new(void);
void gc_memo_store_free(GcMemoStore *store);
GcMemo *gc_memo_store_add(GcMemoStore *store, const gchar *content);
gboolean gc_memo_store_update(GcMemo *memo, const gchar *content);
gboolean gc_memo_store_remove(GcMemoStore *store, guint64 id);
GcMemo *gc_memo_store_find(const GcMemoStore *store, guint64 id);
gboolean gc_memo_matches(const GcMemo *memo, GcMemoFilter filter,
                         const gchar *search, gint64 now);
gchar *gc_memo_title(const GcMemo *memo);
