# GoreeCloud Memos — Implementation Status (2026-11-05)

**Classification:** active development preview. Not production-qualified or deployed.
**Repository:** GoreeCloud/memos (actual casing lowercase).
**Product:** GoreeCloud Memos.

## Implemented in the development workspace

- SQLite-backed memo creation, read, update, duplicate, archive, trash and restore.
- Optional titles, hashtag extraction, colors, pinning, revision history, version-conflict protection, filtering and full v2 JSON export (all memos plus revisions, without the home-feed cap).
- One-server-token bearer authentication, no unsecured fallback, localhost-only binding default. The Python CLI and GTK4 client explicitly reject automatic redirects and configured HTTP proxies for bearer-token requests and require HTTPS for non-loopback destinations; GUI runtime validation remains pending.
- Responsive web home with **default Pinterest-style masonry**, variable-height cards, separate pinned section, alternative list view, GC UI-aligned Iris colors, search, tags, editor, drafts and theme switch.
- Python CLI: create, list, update, JSON export to stdout, and optional owner-only atomic POSIX JSON export via `export --output PATH` (exclusive 0600 file, no overwrite, failure cleanup). Output is plaintext, not encrypted. Standalone local maintenance tool: consistent online SQLite backup, integrity and memo-history relationship verification (including rejection of missing revision versions), and fail-closed non-overwriting restore. Automated regression coverage includes committed uncheckpointed WAL data and injected file/directory flush failures. Completed copies are flushed before exclusive publication; POSIX parent-directory metadata is flushed after publication, with best-effort cleanup on failure.
- Browser editor: safe basic Markdown preview, rendering headings, fenced code, paragraphs, quotes, lists and allowlisted HTTPS/HTTP links; preview checkboxes update the in-session draft, then require explicit save.
- Native Linux GTK4 initial client: note display in separate variable-height vertical columns, search, create and edit.
- Optional POSIX-only private SQLite pre-provisioning helper: creates a private 0700 directory and 0600 empty database file, refuses symlinks and unsafe existing permissions, and does not overwrite existing content. The default server startup **does not automatically use this helper**; see [private storage](PRIVATE_STORAGE.md).
- GitHub CI-verified: **39 Python** API/recovery/storage/client-transport/private-export tests and **four Node.js** Markdown security/behavior tests, Python compilation and JavaScript syntax checks.
- GitHub Actions passed for merged PRs #4 (required revision columns), #6 (logical history and live-WAL recovery), #7 (opt-in private SQLite bootstrap), #8 (safe bearer-token transport), #9 (contiguous revision-history checks), #10 (atomic publication flush and failure cleanup), and #11 (private JSON file export) on 2026-11-05. No deployment or app-release claim follows from CI success.

## Unmerged development and delivery blockers

- Native Android Kotlin/Jetpack Compose prototype was repaired and successfully recompiled with four passing JVM tests on the authorized developer laptop. This source remains **local**: the GitHub `feat/android-client` branch contains only build configuration files after a tool-level block prevented publishing the application manifest and source. No APK was assembled, delivered, installed or released.
- Draft [PR #3](https://github.com/GoreeCloud/memos/pull/3) contains a standalone authentication-failure guard and passing tests, but **does not integrate rate limiting into the HTTP server**.
- [PR #5](https://github.com/GoreeCloud/memos/pull/5) includes visible keyboard focus rings and reduced-motion styling; its CI passed, but the attempted merge was blocked by platform safety checks. These changes are **not on main**.
- GitHub's public repository state is authoritative for code; the canonical Google Drive repository inventory still requires reconciliation with the live account.

## Planned / not implemented

- Full Markdown standard compliance, polished WYSIWYG editing, code syntax highlighting, LaTeX, Mermaid, drawing, image/audio files and attachment pipelines.
- Reminders, push notification, recurring schedules, calendar integration.
- Multiuser accounts, public notes, Spaces, fine-grained permissions, SSO, live co-editing, discussions and reactions.
- Published native Android/mobile applications, true offline/online synchronization, device conflict merges, Windows packages and browser clipper.
- AI integrations, Model Context Protocol, signed webhooks, other ecosystem adapters.
- Production-grade identity, auditing, encrypted-at-rest data, tested backups and migrations, network deployment, load/accessibility QA.

## Development priorities

1. Continue hardening the storage/API, token policies, migrations, authenticated rate limits and automated recovery drills.
2. Extend the safe Markdown subset and interactive checklist preview, then implement attachment scanning/quotas and metadata.
3. Extend native clients, starting with Android, and verify Linux usability.
4. Design and test accounts, permissions and collaboration.
5. Implement sync, reminders, MCP/AI and cross-app integrations.

The default-masonry acceptance criterion is that a clean browser with no layout preference sees adaptive variable-height cards; list mode is optional and locally persistent. This is implemented for the web client. The GTK client uses a preliminary masonry-inspired independent-column layout, pending visual QA.

**Deployment is blocked** until separately authorized and reviewed for TLS, identity, secrets, backups, recovery, rate limits, permissions, observability and rollback.
