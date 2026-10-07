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
