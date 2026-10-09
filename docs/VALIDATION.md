# Validation

## Baseline assessment

The imported upstream v0.31.0 baseline was checked with the repository's own toolchain before GoreeCloud-specific edits.

Frontend lint passed. The upstream unit-test run exposed inherited failures in localization-key coverage and filtered memo statistics; these were present before GoreeCloud edits and are tracked as upstream-baseline defects rather than hidden or waived.

Backend tests were started against Go 1.27.x. Final GoreeCloud integration acceptance must be performed on the exact candidate revision through CI and must separate inherited upstream failures from fork regressions.

## Required candidate gates

- exact-revision checkout;
- repository/provenance validation;
- Go formatting/tidy/static checks;
- Go unit/integration tests;
- frontend TypeScript/Biome checks;
- frontend unit tests;
- production frontend build;
- GoreeCloud privacy/security boundary checks;
- Glaze consumer source and rendered/accessibility evidence;
- migration, export/import, backup/restore, and rollback evidence;
- post-merge exact-main readback before any production claim.

## 2026-10-07 GoreeCloud rebuild checks

Validated on the GoreeCloud rebuild worktree:

- repository/provenance boundary validator: **PASS**;
- frontend TypeScript/Biome lint: **PASS**;
- targeted product-identity/theme/security-setting tests: **56 passed / 0 failed**;
- production frontend build: **PASS**;
- private-first server startup acceptance: **PASS**;
- backend build: **PASS**;
- packaged Glaze V1.4.1 Stable CSS and V1.7.0 Stable runtime hashes: **PASS** and preserved through the production frontend build.

The broader inherited upstream unit suite had already exposed baseline failures in localization-key coverage and filtered memo statistics before GoreeCloud-specific changes. Those inherited failures remain separately visible and are not represented as GoreeCloud regressions or silently waived.


- explicit Demo-mode public access remains separately tested as an intentional synthetic-content exception to private-first normal startup.


## Personal archive clean-target portability

The Development validation suite includes a clean-target round-trip test for the existing personal Memos archive: a user library is exported from one isolated instance, imported into a fresh isolated instance with the same user identity recreated, and exported again for verification. The test covers memo count/content, timestamps, pin state, archive state, comments, memo relations, location, tags, and attachment bytes.

This is portable user-data evidence, not an operational instance-backup claim. Accounts, sessions, instance settings, identity providers, webhooks, and Spaces remain instance-owned state. When a personal archive references a Space that does not exist on the destination, import fails closed by dropping the Space association and making that memo private rather than fabricating authorization state.

## Database migration and upgrade matrix

The repository defines a dedicated Development acceptance runner at `scripts/run_database_upgrade_acceptance.sh` and a GitHub Actions matrix for `sqlite`, `mysql`, and `postgres`.

The bounded matrix exercises critical migration behavior including minimum-supported-version handling, downgrade rejection, previous-stable upgrade, v0.26.2 legacy-data preservation, repeated/idempotent migration, and unique-email migration behavior. The container-backed lanes use the repository-pinned MySQL 8.4 and PostgreSQL 18 test engines plus pinned historical Memos release fixtures.

This is source-defined Development coverage, not a production database certification. Exact candidate and exact merged-main workflow evidence remains required before claiming an integrated result, and representative production-sized datasets, deployment-specific backup/restore, rollback, and long-running upgrade acceptance remain separate gates.

## Observability source boundary

Repository validation pins the Memos operational-signal producer to GoreeCloud/observability revision a7f6a65f442d3e517baddbe7b6ce7c250d142c8c and its v1 operational-signal/component-health schemas. Focused Go tests verify healthy process/database signals, fail-closed database-unavailable/unknown states, timestamp ordering, and rejection of obvious secret-bearing telemetry attribute keys.

This is source validation only. Collector connectivity, producer authentication, transport/retry behavior, durable telemetry, target-runtime acceptance, and production observability approval remain unverified.


## Wardveil source-consumer boundary

The Development repository includes a read-only Wardveil status consumer pinned to GoreeCloud/wardveil at d3c54f47dcbd3b691ab2c98946b1e556985d8391, product version 2.0.0 / Foundation 0.9.0, status contract 0.1.0.

Focused tests prove strict decoding, canonical text state labels, rejection of non-authoritative protected state, stale and expired fail-closed behavior, and rejection of obvious sensitive evidence markers. This is source-level adoption evidence only. No live status transport, producer authentication, runtime protection, security-event transport, Protected by Wardveil claim, target-runtime acceptance, or production approval is established.

The source consumer is also centrally registered in GoreeCloud/wardveil through PR #210. Wardveil main `96969fe80acec564ea509c0ae722e9b97e22f6b3` contains the Memos evidence record at `contracts/wardveil.memos.consumer-source-evidence.json` (blob `66d4dac9d0e5f6ad1df3522ddbbba6dc6deee2d1`) and its validator (blob `5f9e18caa3bd8ebbb59a7ef651a5857b1f030ee4`). Exact Wardveil merged-main runs 813 / 37769379314, 534 / 37769379284, and 425 / 37769379290 all succeeded. Central source registration still does not establish runtime or production acceptance.


## Managed-local attachment relocation recovery

Development recovery acceptance now separately verifies LOCAL attachment relocation rather than allowing the database-only test to depend on the source machine's absolute path.

The storage regression coverage proves that relative LOCAL templates persist data-directory-relative attachment references while explicit absolute templates remain supported. The clean-target startup test configures real LOCAL storage, creates a private memo and attachment, snapshots SQLite, copies the referenced managed-local file to the same relative path under a different target data directory, shuts down the source, boots the target, signs in with the original account, reads the memo, and retrieves the exact attachment bytes through the authenticated file route.

The database-backed attachment helper now explicitly selects DATABASE storage before creating its fixture, so the existing database-attachment recovery acceptance proves database blob recovery rather than accidentally following a LOCAL file path.

This is bounded Development evidence only. It does not inventory all local files, capture explicitly absolute local references, preserve S3 objects, reconstruct deployment/user-managed configuration or governed secrets, schedule/retain/offload backup generations, or establish full-instance recovery.

## Rendered browser acceptance

CI runs Playwright Chromium against a clean private instance built from the exact source revision and exact embedded production frontend. The current bounded lane verifies the first-run authentication/setup shell across 1440x900 desktop light, 390x844 phone dark, and 820x1180 tablet forced-colors contexts with reduced motion enabled.

The lane asserts the main landmark and heading structure, labeled credential inputs, visible keyboard focus, no horizontal overflow before and after 200% text scaling, serious/critical axe findings, expected media-query activation, and page-error absence. Full-page screenshots are retained as workflow artifacts for review.

This establishes automated rendered Development evidence, not human visual approval, independent assistive-technology acceptance, broad application-flow coverage, physical-device qualification, or Glaze production acceptance.


## Authenticated rendered Chromium lane

The rendered-browser CI job uses a second clean private instance for authenticated application-flow acceptance. A one-time setup project creates the test administrator and persists browser storage state; serialized desktop-light, phone-dark, and tablet-forced-colors projects then verify the home/composer shell and save a real memo. This lane is deliberately separate from first-run setup acceptance so authentication state cannot weaken or invalidate the clean-install test.

Acceptance is bounded to automated Chromium Development evidence: shell identity, core composer/memo rendering, visible keyboard focus, serious/critical axe checks, 200% reflow, horizontal-overflow absence, reduced motion, dark mode, forced colors, and page-error absence. Independent assistive-technology, human visual, representative physical-device/browser, full localization/RTL, performance, rollback, and production acceptance remain open.

## SQLite + relative managed-local recovery bundle

The Development CLI now includes `memos snapshot sqlite-local`. Focused tests prove that it creates an exact SQLite snapshot, inventories every relative `LOCAL` attachment row from that snapshot, copies the referenced files under a restore-preserving `local-files/` tree, records per-file SHA-256 and byte size, and publishes the destination only after the staged bundle is complete.

The fail-closed matrix covers missing files, database/file size mismatch, absolute references, path traversal, symlink escape outside the data directory, existing destination preservation, and duplicate database rows sharing one relative file reference. The bundle manifest does not record the source host data-directory path.

This is bounded Development recovery evidence. It does not cover S3 objects, administrator-configured absolute LOCAL paths, deployment/runtime configuration, reusable secrets, scheduled generations, retention, off-device copies, complete restore orchestration, Everkeep runtime acceptance, Production Acceptance, Seal, or Anchor qualification.
