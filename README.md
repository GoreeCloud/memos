# GoreeCloud Memos

GoreeCloud Memos is the lightweight, self-hosted quick-capture notes application in the GoreeCloud ecosystem.

This repository is a **GoreeCloud-maintained fork** of the MIT-licensed [Memos](https://github.com/usememos/memos) project. GoreeCloud keeps upstream provenance explicit while owning the product experience, privacy defaults, hardening, Glaze presentation layer, release process, and ecosystem integration.

## Current state

**Lifecycle: Forge / Development — not production-approved, not Seal-qualified, and not Anchor-qualified.**

The current rebuild line starts from upstream **Memos v0.31.0** at commit `2b2192d4e153bd04f1d325b60fd880cf00d68b01`. At the October 9, 2026 assessment, upstream `main` had advanced to `d5df8915f70a108971f9bf01151ecd3de3e0c91f`, 46 commits beyond the stable baseline; unreleased upstream changes are reviewed separately instead of silently entering GoreeCloud.

## GoreeCloud direction

- Private-first self-hosting and data ownership.
- Fast Markdown-native capture with search, tags, spaces, attachments, archive, export/import, and API access.
- Glaze V1.7 / 1.7.0 design authority, with repository-local acceptance still required.
- Canonical GoreeCloud Memos icon from `GoreeCloud/branding-assets`.
- No required advertising, analytics, hosted control plane, remote font, or external AI service for core operation.
- Explicit upstream maintenance and security-patch intake rather than an untracked source copy.
- All nine Integral Platform Systems are evaluated; runtime integrations remain evidence-gated.

## Build

Backend:

```bash
go build ./cmd/memos
```

Frontend:

```bash
cd web
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
```

## Recovery snapshot tools

Database-only snapshot:

    memos snapshot sqlite --data /path/to/memos-data --output /safe/location/memos.db

SQLite plus all relative managed-local attachment files referenced by that exact snapshot:

    memos snapshot sqlite-local --data /path/to/memos-data --output /safe/location/memos-recovery

Verify an existing bounded SQLite + managed-local bundle without restoring it:

    memos snapshot verify-sqlite-local --bundle /safe/location/memos-recovery

Bundle creation and verification fail closed on missing/mismatched files, unsafe paths, manifest drift, database integrity failures, and unexpected bundled files. S3 objects, deployment configuration, absolute LOCAL references, reusable secrets, scheduling, retention, and restore orchestration still require separate recovery handling; see [Backup and recovery](docs/BACKUP-AND-RECOVERY.md).

## Documentation

- [Project specifications](docs/PROJECT-SPECIFICATIONS.md)
- [Competitive objectives](COMPETITIVE-OBJECTIVES.md)
- [Project record](docs/PROJECT-RECORD.md)
- [API](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Implemented features](docs/IMPLEMENTED-FEATURES.md)
- [Planned features](docs/PLANNED-FEATURES.md)
- [Security](docs/SECURITY.md)
- [Authentication](docs/AUTHENTICATION.md)
- [Search and saved views](docs/SEARCH-AND-VIEWS.md)
- [Webhooks](docs/WEBHOOKS.md)
- [Privacy](docs/PRIVACY.md)
- [Outbound network behavior](docs/OUTBOUND-NETWORK.md)
- [Privacy Shield integration](docs/PRIVACY-SHIELD-INTEGRATION.md)
- [Manager integration boundary](docs/MANAGER-INTEGRATION.md)
- [Observability integration](docs/OBSERVABILITY-INTEGRATION.md)
- [Backup and recovery](docs/BACKUP-AND-RECOVERY.md)
- [Performance](docs/PERFORMANCE.md)
- [Database compatibility](docs/DATABASE-COMPATIBILITY.md)
- [Everkeep integration](docs/EVERKEEP-INTEGRATION.md)
- [Glaze adoption](docs/GLAZE-ADOPTION.md)
- [Upstream maintenance](docs/UPSTREAM.md)
- [Validation](docs/VALIDATION.md)
- [Contributing](.github/CONTRIBUTING.md)
- [Release and rollback](docs/RELEASE-AND-ROLLBACK.md)
- [Changelog](docs/CHANGELOGS.md)

## Licensing and provenance

The inherited Memos source remains MIT-licensed. See [LICENSE](LICENSE), [NOTICE.md](NOTICE.md), and [provenance/upstream.json](provenance/upstream.json). GoreeCloud modifications do not erase upstream attribution.
