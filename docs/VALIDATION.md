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
