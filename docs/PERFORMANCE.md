# Performance Measurement

GoreeCloud Memos treats performance as an evidence requirement, not a release-time cosmetic pass.

## Current automated baseline

The frontend validation job builds the production Vite output and runs `scripts/report_web_bundle.py` against that exact build tree. The report records:

- total built bytes;
- deterministic gzip bytes;
- JavaScript totals;
- CSS totals; and
- the largest built files by raw size.

The measurement is written into the exact GitHub Actions job summary for the validated revision. Gzip uses a fixed timestamp so repeated runs over identical bytes remain comparable.

## Acceptance boundary

This bundle report is a **baseline and regression-observation mechanism**, not a performance qualification result and not a pass/fail bundle budget.

GoreeCloud's performance governance requires product-specific measurement, representative environments, and—where Glaze presentation qualification applies—real interaction/rendering evidence tied to an exact revision. Memos therefore must not infer performance acceptance from:

- a successful source build;
- static bundle size alone;
- synthetic source-level tests;
- a different product's thresholds; or
- stale measurements from another revision.

No Memos-specific hard bundle threshold is encoded until a measured baseline and applicable budget are approved. When such thresholds are established, they should be introduced as governed regression gates rather than retroactively treating this measurement-only report as acceptance evidence.

## Open performance work

Still required for lifecycle promotion:

- representative page/load measurements on supported browsers and device classes;
- interaction responsiveness and rendered-frame continuity where applicable;
- large-library behavior;
- memory/resource observations;
- search and composer responsiveness;
- attachment/media behavior under representative conditions;
- degraded/constrained-network behavior;
- regression comparison against an accepted Memos baseline; and
- rollback evidence for performance-sensitive releases.

The current Vite build also emits chunk-size warnings for some large lazy-loaded and application bundles. Those warnings are inputs to profiling and code-splitting work; they are not, by themselves, a qualified performance failure or pass.
