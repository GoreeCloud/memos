# Search and Saved Views

GoreeCloud Memos keeps search and saved views local to the configured self-hosted instance. This guide documents the user-facing query surface shipped by this fork; it does not delegate product guidance to the upstream Memos website.

## Quick Find

Quick Find supports two modes:

- **Text** — splits the query into words and matches memo content using the application's normal content-search filters.
- **Expression** — accepts a bounded CEL-style memo filter expression. Press Enter to search. In the multi-line expression field, Shift+Enter inserts a newline.

When Quick Find is opened from a scoped collection such as a Space, archive, profile, or saved view, the application preserves the current scope unless that route explicitly searches the full memo collection.

## Common expression fields

Examples supported by the current UI include:

- `pinned`
- `visibility == "PUBLIC"`
- `space == null` and `space != null`
- `space == "spaces/<space-id>"`
- `tag in ["work", "personal"]`
- `tags.exists(t, t.startsWith("project/"))`
- `sets.intersects(tags, ["work", "urgent"])`
- `size(tags) == 0`
- `has_task_list`
- `has_incomplete_tasks`
- `has_link`
- `has_code`
- `has_location`
- `content.contains("TODO")`
- `content.startsWith("TODO")`
- `content.matches("v[0-9]+")`
- `created_ts >= now - duration("24h")`
- `created_ts.getFullYear() == 2026`

The server remains authoritative for expression validation. Invalid or unsupported expressions must fail visibly rather than silently broadening a result set.

## Saved Views

A saved view stores a user-defined name and filter expression. Saved views change presentation and filtering only; they do not move, copy, publish, or change the visibility of memos.

Treat saved views as convenience queries, not security boundaries. Server-side authorization and memo visibility rules remain authoritative.

## Privacy

Search terms and saved-view expressions are application data. Do not place reusable credentials, access tokens, or other secrets in query text. GoreeCloud Memos does not require a third-party search provider for this feature.
