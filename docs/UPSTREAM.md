# Upstream Maintenance

Canonical upstream: `https://github.com/usememos/memos`.

The rebuild baseline is `v0.31.0` / `2b2192d4e153bd04f1d325b60fd880cf00d68b01`.

The local Git repository keeps an `upstream` remote. Future intake must:

1. fetch upstream tags and main;
2. review release notes, security changes, migrations, dependency changes, and UI/API behavior;
3. merge or cherry-pick into a topic branch;
4. resolve divergence intentionally;
5. run backend, frontend, migration, privacy/security, and GoreeCloud-specific validation;
6. preserve attribution and update provenance records;
7. merge through the GoreeCloud repository workflow.

Unreleased upstream `main` is not an automatic production source.

## Selective intake in progress

Upstream commit `5d1649bec6936946d8f36487586a173de1f370f0` is under GoreeCloud review as an isolated data-integrity candidate. It deletes a memo's full comment subtree and owned resources across SQLite, MySQL, and PostgreSQL instead of leaving nested replies detached.

The candidate preserves upstream author attribution and must pass GoreeCloud exact-head CI and current-main integration rules before it is treated as part of the fork. Other unreleased upstream commits remain separate review items in issue #10.
