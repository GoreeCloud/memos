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
