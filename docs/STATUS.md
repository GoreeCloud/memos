# GoreeCloud Memos — Implementation Status (2026-11-05)

**Classification:** active development preview. Not production-qualified or deployed.
**Repository:** GoreeCloud/memos (actual casing lowercase).
**Product:** GoreeCloud Memos.

## Implemented in the development workspace

- SQLite-backed memo creation, read, update, duplicate, archive, trash and restore.
- Optional titles, hashtag extraction, colors, pinning, revision history, version-conflict protection, filtering and JSON export.
- One-server-token bearer authentication, no unsecured fallback, localhost-only binding default.
- Responsive web home with **default Pinterest-style masonry**, variable-height cards, separate pinned section, alternative list view, GC UI-aligned Iris colors, search, tags, editor, drafts and theme switch.
- Python CLI: create, list, update, export.
- Native Linux GTK4 initial client: note display in separate variable-height vertical columns, search, create and edit.
- Local tests: four API test cases plus Python compile and JavaScript syntax validation.
- GitHub CI specification added. Actual hosted CI results must be checked independently.

## Planned / not implemented

- Real Markdown preview, checklists interactions, rich text/WYSIWYG, drawing, image/audio files and attachment pipelines.
- Reminders, push notification, recurring schedules, calendar integration.
- Multiuser accounts, public notes, Spaces, fine-grained permissions, SSO, live co-editing, discussions and reactions.
- True offline/online synchronization, device conflict merges, mobile apps, Windows packages and browser clipper.
- AI integrations, Model Context Protocol, signed webhooks, other ecosystem adapters.
- Production-grade identity, auditing, encrypted-at-rest data, tested backups and migrations, network deployment, load/accessibility QA.

## Development priorities

1. Stabilize the storage/API, tests, backup+restore, security boundaries and token policies.
2. Implement Markdown preview and interactive checklists, then attachments and metadata.
3. Extend native clients, starting with Android, and verify Linux usability.
4. Design and test accounts, permissions and collaboration.
5. Implement sync, reminders, MCP/AI and cross-app integrations.

The default-masonry acceptance criterion is that a clean browser with no layout preference sees adaptive variable-height cards; list mode is optional and locally persistent. This is implemented for the web client. The GTK client uses a preliminary masonry-inspired independent-column layout, pending visual QA.

**Deployment is blocked** until separately authorized and reviewed for TLS, identity, secrets, backups, recovery, rate limits, permissions, observability and rollback.
