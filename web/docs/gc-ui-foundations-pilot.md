# GoreeCloud UI Foundations adoption — isolated Memos compatibility gate

This branch introduces a **non-rendering prerequisite**, not a completed UI migration.

The CI probe downloads the two official release assets from
[Foundations 1.0.1](https://github.com/GoreeCloud/gc-ui/releases/tag/foundations-v1.0.1),
compares the archive to its pinned SHA-256
`275d7e6dc9503b2e74b3190bcecf176d73d2345860e8a20fa5faa3b326cd2298`,
and cross-checks the downloaded `SHA256SUMS` manifest.

It runs with Node 24 without modifying Memos' package.json, pnpm lockfile,
themes, web bundle, database, network permissions or deployment.

This proves immutable upstream artifact identity only. The upstream GC UI
workflow separately verified the offline package installation, public ESM/CSS/JSON
API, TypeScript, Chromium and Firefox. It does **not** establish that Memos
is now rendering with GC UI, that existing legacy tokens can be deleted, or
that any deployed Memos instance has been migrated.

**Next acceptance stage:** introduce a scoped local UI usage with compatibility
tests, preserve existing color tokens until that consumer renders correctly,
then perform browser accessibility/reflow and rollback checks. Keep the
GC UI consumer migration ledger at `actualGcUiAcceptance:not-evaluated` meanwhile.
