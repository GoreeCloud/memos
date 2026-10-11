# Search and Saved Views

GoreeCloud Memos keeps search and saved views local to the configured self-hosted instance. This guide documents the user-facing query surface shipped by this fork; it does not delegate product guidance to the upstream Memos website.

## Quick Find

Open Quick Find from the sidebar Search action, or press **Ctrl+K** (Windows/Linux) or **⌘K** (macOS) while navigating the application. This shortcut does not override text inputs, the Markdown editor, IME composition, other dialogs, or shortcuts already handled by another control. Escape closes Quick Find without submitting a search.

Quick Find supports two modes:

- **Text** — searches memo content using separate terms, or treats a double-quoted phrase such as `"meeting notes"` as one contiguous term. Quotes inside unquoted text remain literal. A backslash can escape a quote or backslash inside a quoted phrase. Duplicate terms are removed. Home search uses the same syntax.
- **Expression** — accepts a bounded CEL-style memo filter expression. Press Enter to search. In the multi-line expression field, Shift+Enter inserts a newline.

Quoted phrase boundaries are preserved when an existing text search is reopened for editing. This is still literal content matching, not Expression mode or a third-party search provider. Unclosed leading quotes are treated as a phrase through the end of the query.

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
