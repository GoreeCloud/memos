# GoreeCloud Memos

**Development preview — not deployed or production-ready.**

Original privacy-first memo service and native-client development foundation for GoreeCloud. Complete requirements: [Features](docs/FEATURES.md). Verified status: [Status](docs/STATUS.md).

## Default home experience

**Pinterest-style responsive masonry grid is the default layout.** Variable-height note cards flow into adaptive columns, with a dedicated pinned notes section. Optional list view and dark mode persist as local browser preferences. The prototype references the [GoreeCloud UI](https://github.com/GoreeCloud/gc-ui) Iris semantic tokens and Canvas/Surface styling; formal GC UI conformance is not yet verified.

## Working development features

- Python standard-library HTTP service with SQLite persistence, bearer-token authorization, and process-local per-peer failed-login throttling (eight failures/60 seconds; HTTP 429). This is not enterprise identity, TLS, or production-grade distributed abuse protection. Browser bearer-token fetches now explicitly disallow redirects and cross-origin requests and suppress referrers, verified by isolated Node regressions. This is not proof of production network security.
- Create, read, edit, duplicate; optional titles, hashtags, pinning, colors, archive, soft delete and restore.
- Query by text, hashtag and folder; version history; optimistic concurrency returning HTTP 409 on stale edits. Hashtag-filtered feeds stream SQLite rows and stop at 2,000 matching notes rather than materializing all candidate memos in memory; this is not a full-text/hashtag index.
- Responsive web interface with default masonry layout, optional list, quick capture, memo editing, pinned cards, search and tags, light/dark themes, session-local drafts and keyboard shortcuts. **Lock** immediately forgets the browser tab's in-memory access token and clears displayed note contents; unsaved drafts remain in session storage for a future login. **Clear drafts** controls are available before and after login: with explicit confirmation, they clear only unsaved Memos drafts from this browser tab, not saved server notes, the login token, or layout/theme preferences. On authenticated feed loads, a short-delay, static GC UI C36-aligned skeleton reserves memo-card geometry while preserving private-data and lock boundaries; failed loads expose retry and offline/timeout states. This is a source-level web preview, not verified production or native parity. Focus-visible memo cards, search and quick-capture containers support keyboard navigation; reduced-motion preferences disable card hover translation. Existing memos have a lazy-loaded previous-version panel; restoring earlier title/content requires explicit confirmation and creates a new current version, preserving historical revisions.
- Python CLI with folder/text/hashtag filtering, read one memo, view or restore earlier text revisions, create, duplicate, version-guarded update, and complete JSON export including revision history. It also supports reversible pin/unpin, archive/unarchive, and trash/restore commands. Restoring earlier text creates a new current version; all state changes use optimistic concurrency. Memo-specific CLI operations require canonical lowercase UUIDs.
- Consistent live SQLite backup, integrity verification, and non-overwriting restore through local maintenance CLI.
- Native GTK4 Linux development client with variable-height independent-column cards, search and editing.
- Safe Markdown subset preview, including headings, lists, fenced code, quotes, links, bold and inline code, with editable checklist items in preview (save required to persist).
- Python regression tests, Node.js Markdown security/behavior tests, and JavaScript syntax checks.

**Not yet supported:** full CommonMark/WYSIWYG, advanced Markdown diagrams/math, multiuser collaboration, attachments, reminders, sync, AI/MCP, native Android/iOS releases, hardening for production or deployment.

## Run locally

Requires Python 3.10+; no Python packages or separate database service. On POSIX hosts, prefer the **private loopback launcher** below: it provisions an owner-only `0700` directory and `0600` database and refuses unsafe existing permissions without changing existing data. The older `server/app.py` command remains available but **does not automatically enforce private storage permissions**. See [private storage setup](docs/PRIVATE_STORAGE.md).

~~~bash
export GOREE_MEMOS_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(36))')"
python3 server/serve_private.py --port 8765 --db ./data/memos.sqlite3
~~~

Open http://127.0.0.1:8765 and enter the generated access token. Do not expose the prototype on a public interface without separate security review and permission.

~~~bash
python3 cli/memos.py create "A thought #ideas" --title "Welcome"
python3 cli/memos.py list --search thought
python3 cli/memos.py list --tag '#ideas'
python3 cli/memos.py show MEMO-UUID
python3 cli/memos.py duplicate MEMO-UUID  # creates an unpinned, active copy
python3 cli/memos.py history MEMO-UUID
# Manage one memo with reversible, version-guarded changes:
python3 cli/memos.py pin MEMO-UUID
python3 cli/memos.py archive MEMO-UUID
python3 cli/memos.py trash MEMO-UUID
python3 cli/memos.py restore MEMO-UUID  # move back out of trash
# Restore saved title/content from revision 1 as a NEW current version:
python3 cli/memos.py restore-revision MEMO-UUID --version 1
mkdir -p ./backups
python3 cli/memos.py export --output ./backups/memos-export.json
python3 clients/linux/app.py
python3 server/maintenance.py backup ./data/memos.sqlite3 ./backups/backup.sqlite
python3 server/maintenance.py verify ./backups/backup.sqlite
~~~

See [backup and recovery](docs/BACKUP_AND_RECOVERY.md) before attempting a restore; the backup destination directory must exist. Backups deliberately refuse overwriting existing files.

The native GTK4 preview requires PyGObject and GTK4. Both clients use GOREE_MEMOS_TOKEN and optional GOREE_MEMOS_URL. The CLI and GTK client **refuse redirects** for authenticated API requests, bypass configured HTTP proxies, and allow plaintext HTTP only to numeric loopback IP addresses; non-loopback destinations require HTTPS with normal certificate validation. Keep tokens out of shell history, logs and screenshots. See [security boundaries](docs/SECURITY.md).

## Verification

~~~bash
python3 -m unittest discover -s server -v
python3 -m py_compile server/*.py cli/memos.py clients/linux/app.py
node --check web/app.js
node --check web/markdown.js
node --test tests/*.test.cjs
~~~

## API

All data routes require an Authorization bearer token; health and static web assets are public. After eight failed API authentications from a socket peer within 60 seconds, requests from that peer return 429 with a Retry-After header until the window expires. This can temporarily block legitimate shared-IP users and resets when the process restarts. Mutations use JSON and versioned changes.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/v1/memos?folder=active&q=&tag= | List and search |
| POST | /api/v1/memos | Create |
| GET | /api/v1/memos/{uuid} | Read |
| PATCH | /api/v1/memos/{uuid} | Modify with version |
| DELETE | /api/v1/memos/{uuid} | Soft delete with version |
| POST | /api/v1/memos/{uuid}/duplicate | Duplicate |
| GET | /api/v1/memos/{uuid}/revisions | Prior text versions |
| GET | /api/v1/export | Complete v2 JSON export (memos and revisions) |
| GET | /api/v1/health | Public health probe |

This is **single-instance token authentication**, not multi-user role access. Do not deploy as a public multi-tenant application. Data defaults to ./data/memos.sqlite3 (Git-ignored). Backup a running SQLite DB via its backup API or another consistency-aware method.

See [security boundaries](docs/SECURITY.md) and [backup and recovery](docs/BACKUP_AND_RECOVERY.md). This repository contains original source code, not a copy or fork of Google Keep or upstream Memos. Publication on GitHub does not alone establish an open-source license; licensing is a separate review gate. Referenced GC UI semantic values originate from the independently Apache-2.0-licensed gc-ui repository.
