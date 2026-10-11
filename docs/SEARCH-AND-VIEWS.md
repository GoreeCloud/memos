# Search and Saved Views

GoreeCloud Memos keeps search and saved views local to the configured self-hosted instance. This guide documents the user-facing query surface shipped by this fork; it does not delegate product guidance to the upstream Memos website.

## Quick Find

Open Quick Find from the sidebar Search action, or press **Ctrl+K** (Windows/Linux) or **⌘K** (macOS) while navigating the application. This shortcut does not override text inputs, the Markdown editor, IME composition, other dialogs, or shortcuts already handled by another control. Escape closes Quick Find without submitting a search.

Quick Find supports two modes. In the mode selector, use Left/Right Arrow to switch modes, or Home/End to move to the first/last mode. The selected tab retains keyboard focus, and your unsubmitted query text stays intact.

- **Text** — searches memo content using separate terms, or treats a double-quoted phrase such as `"meeting notes"` as one contiguous term. Quotes inside unquoted text remain literal. A backslash can escape a quote or backslash inside a quoted phrase. Duplicate terms are removed. Home search uses the same syntax.
- **Expression** — accepts a bounded CEL-style memo filter expression. Press Enter to search. In the multi-line expression field, Shift+Enter inserts a newline.

Both Quick Find modes offer a **Clear** action when the draft contains text. Clearing empties only the draft search and restores focus to the input; it does not change existing filters, the selected Space, or the active view until Search is submitted. Close the dialog with Escape to discard changes.

In the persistent Home layout, the search field occupies a sticky header above the paginated memo feed: it remains visible while the feed scrolls, with a mobile navigation offset. The memo composer stays in the memo feed so its Space-scoped draft lifecycle is not changed. This Development implementation has authenticated Chromium viewport coverage; independent physical-device scrolling and assistive-technology acceptance remain open.

On Home, press **/** (slash) outside text fields, editors, and dialogs to focus the persistent Home search without submitting a query or changing filters. The input advertises this shortcut for assistive technology, with a visual keyboard hint on wider screens. **Ctrl+K** / **⌘K** remains the separate Quick Find shortcut. On Home, pressing **Escape** in the search field discards unsubmitted edits and restores the active query without changing filters. Submitting an unchanged advanced Expression query preserves its Expression semantics; editing that field and submitting creates a fresh Text search. Home searches remain global rather than retaining a previous label or Space filter. On Home, Clear removes the active search and returns keyboard focus to the search field so a new query can be entered immediately.

The active Text and Expression search chips can be selected to reopen Quick Find with the full current query, including all terms and quoted phrases. Selecting a chip's text does not change the search; its separate remove (X) action removes only that filter. When multiple search-term chips are active, **Clear search** removes all search terms together while keeping tags, other filters, the current Space, and the selected view. When multiple visible filter facets are active (for example, a label and search, or a saved view and label), **Clear filters** removes the visible filters together without leaving the current Space or changing unrelated URL parameters. Search-only queries retain the dedicated **Clear search** action. A saved view remembered on a route that does not display collections stays selected and is not silently cleared. Edit the query and submit to apply changes, or press Escape to cancel without changing the active search.

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
