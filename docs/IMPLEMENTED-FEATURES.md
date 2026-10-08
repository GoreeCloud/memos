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
- GoreeCloud-owned user-help destinations for API, search/saved views, authentication, webhooks, and missing-language feedback while preserving upstream protocol/provenance identifiers.
- Browser-client hardening that does not execute administrator-provided arbitrary JavaScript.

- Separate HTTP liveness (/healthz) and database-backed readiness (/readyz) probes for operations and future Manager integration.
- Browser security-header baseline covering document trust boundaries, MIME sniffing, referrer leakage, framing, and dangerous browser capabilities.
- Clean-target automated acceptance for the personal Memos archive, covering memo content/state, comments, relations, tags, location, timestamps, pinning, and attachment bytes while failing closed on missing Space authority.
- Repository-level and frontend-test Glaze consumer source-contract checks for GoreeCloud presentation surfaces, visible focus, responsive mobile transparency fallbacks, reduced motion, reduced transparency, and forced-colors fallbacks; rendered and human acceptance remain separate.
- GoreeCloud/Glaze authentication-entry presentation shell with branded responsive surfaces, accessible main/heading structure, and reduced-transparency/forced-colors fallbacks; credential and session semantics remain unchanged.
- Bounded SQLite database snapshot CLI (memos snapshot sqlite) using transactionally consistent VACUUM INTO, no-overwrite safeguards, and post-write integrity verification; this is explicitly not a full-instance backup.

- Shared GoreeCloud Memos product-name interpolation for reviewed product-branding locale keys across all bundled locales, preserving each locale's surrounding grammar while leaving generic memo nouns, export-format terminology, companion-project names, and upstream provenance untouched.
- Reviewed product-reference localization now routes profile lookup, access-token guidance, optional AI-provider copy, Space membership copy, and Back-to-product navigation through the shared `{{productName}}` slot wherever a locale previously named the upstream product, while preserving translations that intentionally omit the product name.
- Dedicated Development database-upgrade acceptance runner and exact-revision CI matrix across SQLite, MySQL 8.4, and PostgreSQL 18 for critical supported-version, idempotency, data-preservation, user-setting, and unique-email migrations; production database qualification remains separate.
- Source-level Everkeep continuity adoption boundary pinned to reviewed Everkeep contracts, including explicit non-acceptance policy and a fail-closed normalized status evaluator for freshness, missing/malformed evidence, failed recovery state, producer/scope authority, and sensitive-evidence exclusion; live Everkeep connectivity and recovery acceptance remain open.
- Privacy Shield 2.0 application-adapter source contract for telemetry minimization, data minimization, deletion controls, and portable export, centrally registered through Privacy Shield PR #180 while exact-runtime acceptance and production approval remain explicitly false.

- Source-level GoreeCloud Observability operational-signal producer boundary for process liveness and database readiness, pinned to reviewed v1 schemas with minimized/fail-closed state and no live collector or production-acceptance claim.
