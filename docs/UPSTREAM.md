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
- `200b4d0920afd0d4a9c2737c4c01ca43e47bddbe` — keep nested preference submenus on-screen under narrow viewport collision constraints; adapted to the GoreeCloud fork's current nested submenu layer and integrated through PR #23.
- `631a7ef488998cb444c9a1acf4bd9964a96cdc8a` — prevent the reaction picker from flashing at the page origin when its hover anchor disappears during close; integrated through PR #24 with rendered regression coverage.
- `0b3b5a699906ded5ebdf6b2fd12c865add5527ca` — continue reading bounded response bytes when early link-preview metadata is incomplete; integrated through PR #58.
- `d566184a45c5bd0e515aef1a32f45659c8bf44ae` — migration-test additions; GoreeCloud selectively adapted the non-duplicative direct v0.31.0 baseline-upgrade coverage through PR #59 without importing unrelated CalVer or broad Go-modernization assumptions.
- `4eb6fb77e83af84a73c9433b0c68e6e0db61268a` — pinch-to-zoom and swipe-between-images behavior; integrated through PR #60 on top of the existing GoreeCloud image-preview accessibility/pan work.

Each candidate was isolated, kept attributable to upstream, refreshed onto the then-current protected GoreeCloud `main` without rewriting shared history, and required the repository's exact-head validation path before integration.

## October 9, 2026 upstream assessment

Upstream `main` is `d566184a45c5bd0e515aef1a32f45659c8bf44ae`, 45 commits beyond the v0.31.0 stable baseline. GoreeCloud continues to assess this drift selectively; the assessed head is provenance, not the fork baseline.

The intervening `af38e75e2dfd0ddd5b685614bd9ec4aafd46306a` change, `refactor(api)!: drop the v1 version marker (#6447)`, is a breaking migration and is **not** a routine cherry-pick candidate. It changes REST paths, SSE paths, the proto package identity, Connect/gRPC procedure names, resource types, numerous request/response fields, and protobuf field numbering. Before any adoption, GoreeCloud must inventory all API consumers and proxy/integration contracts, define compatibility and rollback behavior, regenerate clients, validate all supported databases and representative clients, and explicitly approve the migration boundary. GitHub issue #10 is the provider-native tracker for that review.

## Remaining unreleased drift

GitHub issue #10 remains the provider-native tracker for unreleased upstream drift beyond `v0.31.0`. Remaining commits must continue to be evaluated individually or in narrowly coherent groups.

Potential later review candidates still include mixed-scope pinned-memo correctness and other unreleased changes tracked in issue #10. Their presence on upstream `main` is not an implementation claim for GoreeCloud Memos.

A future stable upstream release may justify a broader baseline review, but adopting a new baseline still requires explicit migration, divergence review, GoreeCloud policy checks, exact-head CI, and protected current-main integration.
