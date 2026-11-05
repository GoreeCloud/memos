# GoreeCloud Memos

**Development preview — not deployed or production-ready.**

Original privacy-first memo service and native-client development foundation for GoreeCloud. Complete requirements: [Features](docs/FEATURES.md). Verified status: [Status](docs/STATUS.md).

## Default home experience

**Pinterest-style responsive masonry grid is the default layout.** Variable-height note cards flow into adaptive columns, with a dedicated pinned notes section. Optional list view and dark mode persist as local browser preferences. The prototype references the [GoreeCloud UI](https://github.com/GoreeCloud/gc-ui) Iris semantic tokens and Canvas/Surface styling; formal GC UI conformance is not yet verified.

## Working development features

- Python standard-library HTTP service with SQLite persistence and bearer-token authorization.
- Create, read, edit, duplicate; optional titles, hashtags, pinning, colors, archive, soft delete and restore.
- Query by text, hashtag and folder; version history; optimistic concurrency returning HTTP 409 on stale edits.
- Responsive web interface with default masonry layout, optional list, quick capture, memo editing, pinned cards, search and tags, light/dark themes, session-local drafts and keyboard shortcuts.
- Python CLI with list, create, update and JSON export.
- Native GTK4 Linux development client with variable-height independent-column cards, search and editing.
- Python regression tests and JavaScript syntax check.

**Not yet supported:** multiuser collaboration, Markdown rendering/WYSIWYG, attachments, reminders, sync, AI/MCP, native Android/iOS releases, hardening for production or deployment.

## Run locally

Requires Python 3.10+; no Python packages or separate database service.

~~~bash
export GOREE_MEMOS_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(36))')"
python3 server/app.py --host 127.0.0.1 --port 8765 --db ./data/memos.sqlite3
~~~

Open http://127.0.0.1:8765 and enter the generated access token. Do not expose the prototype on a public interface without separate security review and permission.

~~~bash
python3 cli/memos.py create "A thought #ideas" --title "Welcome"
python3 cli/memos.py list --search thought
python3 cli/memos.py export > memos-backup.json
python3 clients/linux/app.py
~~~

The native GTK4 preview requires PyGObject and GTK4. Both clients use GOREE_MEMOS_TOKEN and optional GOREE_MEMOS_URL. Keep tokens out of shell history, logs and screenshots.

## Verification

~~~bash
python3 -m unittest discover -s server -v
python3 -m py_compile server/app.py server/test_app.py cli/memos.py clients/linux/app.py
node --check web/app.js
~~~

## API

All data routes require an Authorization bearer token; health and static web assets are public. Mutations use JSON and versioned changes.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/v1/memos?folder=active&q=&tag= | List and search |
| POST | /api/v1/memos | Create |
| GET | /api/v1/memos/{uuid} | Read |
| PATCH | /api/v1/memos/{uuid} | Modify with version |
| DELETE | /api/v1/memos/{uuid} | Soft delete with version |
| POST | /api/v1/memos/{uuid}/duplicate | Duplicate |
| GET | /api/v1/memos/{uuid}/revisions | Prior text versions |
| GET | /api/v1/export | JSON export |
| GET | /api/v1/health | Public health probe |

This is **single-instance token authentication**, not multi-user role access. Do not deploy as a public multi-tenant application. Data defaults to ./data/memos.sqlite3 (Git-ignored). Backup a running SQLite DB via its backup API or another consistency-aware method.

See [security boundaries](docs/SECURITY.md). This repository contains original source code, not a copy or fork of Google Keep or upstream Memos. Publication on GitHub does not alone establish an open-source license; licensing is a separate review gate. Referenced GC UI semantic values originate from the independently Apache-2.0-licensed gc-ui repository.
