# Upstream Maintenance

Canonical upstream: `https://github.com/usememos/memos`.

The maintained-fork baseline remains the stable upstream release `v0.31.0` / `2b2192d4e153bd04f1d325b60fd880cf00d68b01`.

The local Git repository keeps an `upstream` remote. Future intake must:

1. fetch upstream tags and main;
2. review release notes, security changes, migrations, dependency changes, and UI/API behavior;
3. merge or cherry-pick into a topic branch;
4. resolve divergence intentionally;
5. run backend, frontend, migration, privacy/security, and GoreeCloud-specific validation;
6. preserve attribution and update provenance records; and
7. merge through the protected GoreeCloud repository workflow.

Unreleased upstream `main` is not an automatic production source and is not an automatic new fork baseline.

## Selective unreleased intake completed

The following upstream commits were reviewed and integrated independently through protected GoreeCloud pull requests:

- `5d1649bec6936946d8f36487586a173de1f370f0` — delete a memo's full comment subtree and owned resources across SQLite, MySQL, and PostgreSQL instead of leaving nested replies detached; integrated through PR #11.
- `c621d03ae44de497d36a529ce24b36a6fe3c33f9` — use dynamic viewport height for mobile image-preview controls so controls remain accessible; integrated through PR #12.
- `1724f0bd26bd4a48e74de0ec31045ad2c96a9936` — preserve selection-edge whitespace when applying Markdown marks; integrated through PR #13.
- `0c53b775ce9a56a9fd2e67f03e364cbcd7ab017e` — make JSON boolean filter comparisons correctly match memos where a false flag is omitted; integrated through PR #14.

Each candidate was isolated, kept attributable to upstream, refreshed onto the then-current protected GoreeCloud `main` without rewriting shared history, and required the repository's exact-head validation path before integration.

## Remaining unreleased drift

GitHub issue #10 remains the provider-native tracker for unreleased upstream drift beyond `v0.31.0`. Remaining commits must continue to be evaluated individually or in narrowly coherent groups.

Potential later review candidates include mixed-scope pinned-memo correctness, narrow-viewport submenu positioning, and reaction-picker initial positioning. Their presence on upstream `main` is not an implementation claim for GoreeCloud Memos.

A future stable upstream release may justify a broader baseline review, but adopting a new baseline still requires explicit migration, divergence review, GoreeCloud policy checks, exact-head CI, and protected current-main integration.
