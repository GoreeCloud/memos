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

- Clean-target automated acceptance for the personal Memos archive, covering memo content/state, comments, relations, tags, location, timestamps, pinning, and attachment bytes while failing closed on missing Space authority.
- Repository-level and frontend-test Glaze consumer source-contract checks for GoreeCloud presentation surfaces, visible focus, responsive mobile transparency fallbacks, reduced motion, reduced transparency, and forced-colors fallbacks; rendered and human acceptance remain separate.
- GoreeCloud/Glaze authentication-entry presentation shell with branded responsive surfaces, accessible main/heading structure, and reduced-transparency/forced-colors fallbacks; credential and session semantics remain unchanged.
- Browser-local GoreeCloud Button Style preference for the shared icon-button primitive, defaulting to Icons & Glyphs and supporting Icons + Text or Text presentation by reusing each control's existing accessible label; broader component-by-component consistency review remains open.
- Bounded SQLite database snapshot CLI (memos snapshot sqlite) using transactionally consistent VACUUM INTO, no-overwrite safeguards, post-write integrity verification, and an owner-only machine-readable sidecar recording SHA-256, artifact size, exact app version/commit, creation time, and included/excluded recovery scope; this is explicitly not a full-instance backup.
- Bounded `memos snapshot sqlite-local` recovery bundle for SQLite instances using relative managed-local attachments: it snapshots the exact database, inventories every `LOCAL` attachment reference from that snapshot, rejects absolute/non-canonical/escaping references, copies every referenced relative file under a restore-preserving tree, verifies database-recorded size plus SHA-256, writes an owner-only bundle manifest, and publishes only after the complete staged artifact succeeds. S3 objects, deployment configuration, reusable secrets, and absolute LOCAL references remain outside this bounded bundle.
- Standalone `memos snapshot verify-sqlite-local` integrity verification for existing bounded bundles, with strict manifest decoding, SQLite quick-check plus database hash/size verification, exact attachment-row correspondence, per-file SHA-256/size/path checks, aggregate-count/byte validation, symbolic-link rejection, and unexpected-file rejection; this verifies the artifact but does not restore an instance.

- Shared GoreeCloud Memos product-name interpolation for reviewed product-branding locale keys across all bundled locales, preserving each locale's surrounding grammar while leaving generic memo nouns, export-format terminology, companion-project names, and upstream provenance untouched.
- Reviewed product-reference localization now routes profile lookup, access-token guidance, optional AI-provider copy, Space membership copy, and Back-to-product navigation through the shared `{{productName}}` slot wherever a locale previously named the upstream product, while preserving translations that intentionally omit the product name.
- Dedicated Development database-upgrade acceptance runner and exact-revision CI matrix across SQLite, MySQL 8.4, and PostgreSQL 18 for critical supported-version, idempotency, data-preservation, user-setting, and unique-email migrations; production database qualification remains separate.
- Source-level Everkeep continuity adoption boundary pinned to reviewed Everkeep contracts, including explicit non-acceptance policy and a fail-closed normalized status evaluator for freshness, missing/malformed evidence, failed recovery state, producer/scope authority, and sensitive-evidence exclusion; live Everkeep connectivity and recovery acceptance remain open.
- Privacy Shield 2.0 application-adapter source contract for telemetry minimization, data minimization, deletion controls, and portable export, centrally registered through Privacy Shield PR #180 while exact-runtime acceptance and production approval remain explicitly false.

- Source-level GoreeCloud Observability operational-signal producer boundary for process liveness and database readiness, pinned to reviewed v1 schemas with minimized/fail-closed state and no live collector or production-acceptance claim.
- Source-level Wardveil 2.0 / Foundation 0.9 status-consumer boundary with strict schema decoding, fail-closed freshness and authority evaluation, sensitive-evidence rejection, and textual normalized-state labels; live Wardveil runtime protection remains unaccepted.
- Grammar-specific About labels in Japanese, Russian, and Ukrainian now use the shared GoreeCloud product-name slot instead of hard-coding the upstream product proper name.

- Automated clean-target SQLite database-snapshot startup acceptance proving preserved account secret, authentication, memo data, database-backed attachment bytes/binding, real migrations, and /readyz success while keeping managed-local/S3/configuration recovery outside the claim.

- Relocatable managed-local attachment references for relative LOCAL storage templates, with clean-target acceptance proving a SQLite snapshot plus the referenced local file can boot at a different data-directory path and serve the exact authenticated attachment bytes; explicit absolute templates and S3 remain separate recovery boundaries.

- Dedicated cross-user core-isolation acceptance proving a second regular user cannot read, mutate, delete, rebind attachments for, export, or read saved-view state belonging to a PRIVATE owner, with owner-state integrity rechecked after denied operations.

- Real Chromium Development acceptance for the clean-instance GoreeCloud/Glaze setup shell across desktop/phone/tablet contexts, including keyboard focus, 200% text scaling, forced-colors, reduced motion, dark appearance, overflow checks, axe serious/critical checks, and retained screenshots; human visual and independent assistive-technology acceptance remain separate.

- Separate authenticated rendered Chromium acceptance for the GoreeCloud home/composer shell across desktop-light, phone-dark, and tablet-forced-colors contexts, including real memo creation, focus, axe, 200% reflow, overflow, reduced-motion, and page-error checks; human/assistive-technology/physical-device acceptance remains separate.

- Image preview supports bounded drag panning while zoomed, two-pointer pinch-to-zoom anchored around the gesture midpoint, and horizontal swipe navigation between gallery images at fit zoom while preserving keyboard/buttons/wheel/double-click behavior.
- Link-preview metadata extraction can continue beyond the initial 512 KiB window only when title/image metadata is still incomplete, with a hard 2 MiB cap while retaining existing SSRF/internal-IP, timeout, concurrency, cache, and GoreeCloud crawler-identity boundaries.
- Direct maintained-fork v0.31.0 baseline upgrade acceptance across SQLite, MySQL, and PostgreSQL complements the migration matrix without adopting upstream's breaking API-v1 removal or unreleased release-version model.
- Bounded `memos restore sqlite-local` clean-target restore tooling that verifies an existing sqlite-local bundle before staging, refuses existing or bundle-contained targets, rechecks copied hashes/sizes plus SQLite quick-check, restores the database to `memos_prod.db` and relative managed-local files under a new data directory, and atomically publishes only after the staged target succeeds; S3/configuration/secrets/absolute-LOCAL recovery remain outside the claim.

- Button Style coverage for labeled icon controls through the shared GoreeCloud Button primitive (including statistics previous/next month navigation and the mobile media-details close action), plus explicit coverage for localized native controls used by map zoom/fit, memo-panel close, and calendar previous/next month/year navigation, preserving accessible names while allowing Icons + Text and Text presentation modes.

- Saved-view management action menus now expose a localized accessible name through the shared GoreeCloud icon-button primitive and reserve max-content space so Icons + Text/Text presentation modes do not collide with view content.

- Memo-share Copy/Revoke and focus-mode Exit icon controls now expose explicit accessible names, bringing those existing shared-Button actions under the Button Style presentation contract without changing their behavior.

## Bounded Glaze interaction performance regression

- The authenticated Chromium matrix includes an exact-revision desktop measurement for 30 Search text/expression mode transitions.
- The test measures from the captured browser click event through the following confirmed painted update and stores the exact metrics as Playwright evidence.
- The Development gate enforces the approved Glaze interaction ceilings of p95 <= 100 ms and p99 <= 200 ms.
- This is bounded regression evidence only; the full representative transition mix, frame-continuity budget, physical-device/browser performance, Web Vitals, service latency, and production performance acceptance remain open.
- Button Style and accessibility coverage for Inbox comment/mention/Space-invitation archive/delete icon actions, including localized accessible names and keyboard-visible focus without changing notification behavior.
