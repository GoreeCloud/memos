# Implemented Features

## Inherited from Memos v0.31.0

- Markdown memo creation and editing.
- Search, tags, spaces, archive, attachments, comments, reactions, and sharing controls.
- User accounts, local password authentication, and configurable OIDC providers.
- SQLite, PostgreSQL, and MySQL support.
- Export/import foundation.
- REST/Connect-compatible API surfaces.
- Responsive React web client.
- Docker-oriented self-hosting foundation.
- Optional AI/provider integrations that are inactive until configured.

## GoreeCloud rebuild foundation

- Maintained-fork provenance with full upstream Git history.
- Canonical GoreeCloud Memos product identity.
- GoreeCloud lifecycle/platform manifest.
- Private-first instance initialization.
- GoreeCloud documentation and explicit Stable blockers.
- Glaze V1.7 target mapping plus application-owned responsive/accessibility styling.
- GoreeCloud repository/documentation links instead of presenting upstream as the fork's product home.
- Browser-client hardening that does not execute administrator-provided arbitrary JavaScript.

- Separate HTTP liveness (/healthz) and database-backed readiness (/readyz) probes for operations and future Manager integration.

- Clean-target automated acceptance for the personal Memos archive, covering memo content/state, comments, relations, tags, location, timestamps, pinning, and attachment bytes while failing closed on missing Space authority.
- Repository-level and frontend-test Glaze consumer source-contract checks for GoreeCloud presentation surfaces, visible focus, responsive mobile transparency fallbacks, reduced motion, reduced transparency, and forced-colors fallbacks; rendered and human acceptance remain separate.
- GoreeCloud/Glaze authentication-entry presentation shell with branded responsive surfaces, accessible main/heading structure, and reduced-transparency/forced-colors fallbacks; credential and session semantics remain unchanged.
