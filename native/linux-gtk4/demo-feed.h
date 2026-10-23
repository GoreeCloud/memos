#pragma once
#include "model.h"

/* Synthetic, in-memory only. Never fetches a server or persists a memo. */
gboolean gc_demo_replace_page(GcMemoStore *store, const guint8 *json,
                              gsize json_size, GError **error);
gboolean gc_demo_seed_fixture(GcMemoStore *store, GError **error);
