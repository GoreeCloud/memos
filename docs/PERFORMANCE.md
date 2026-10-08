# Performance Measurement

GoreeCloud Memos treats performance as an evidence requirement, not a release-time cosmetic pass. Current measurements are Development comparison evidence, not production SLAs or lifecycle qualification.

## Development server baseline

Historical comparison source revision: `f3e7dbe7c4bf716134a9d65ea2cea0d87870cc78`.

The repository benchmark harness seeds 5,000 top-level memos in SQLite with representative attachments, reactions, relations, and comments. On October 7, 2026, Linux/amd64 on an Intel Core i3-1005G1 CPU produced:

| Benchmark | Approx. latency | B/op | allocs/op |
| --- | ---: | ---: | ---: |
| authenticated first page | 19.5 ms | 394,211 | 4,949 |
| authenticated page ten | 30.5 ms | 386,865 | 4,968 |
| public first page | 7.2 ms | 388,838 | 5,043 |
| comment preview | 5.64 ms | 45,846 | 554 |

The measurement used five iterations per benchmark with allocation reporting. Absolute timings depend on hardware, storage, operating system, Go runtime, database driver, dataset shape, thermal state, and background activity.

This remains a historical Development comparison point tied to the stated source revision. It is not silently reinterpreted as a measurement of current `main`. A substantial like-for-like regression against a freshly rerun equivalent benchmark warrants investigation.

## Current automated frontend baseline

The frontend validation job builds the production Vite output and runs `scripts/report_web_bundle.py` against that exact build tree. The report records:

- total built bytes;
- deterministic gzip bytes;
- JavaScript totals;
- CSS totals; and
- the largest built files by raw size.

The measurement is written into the exact GitHub Actions job summary for the validated revision. Gzip uses a fixed timestamp so repeated runs over identical bytes remain comparable.

## Acceptance boundary

These measurements are **baseline and regression-observation mechanisms**, not performance qualification results and not pass/fail production budgets.

GoreeCloud performance governance requires product-specific measurement, representative environments, and—where Glaze presentation qualification applies—real interaction/rendering evidence tied to an exact revision. Memos therefore must not infer performance acceptance from:

- a successful source build;
- static bundle size alone;
- a historical benchmark from another revision;
- synthetic source-level tests;
- a different product's thresholds; or
- stale measurements from another environment.

No Memos-specific hard bundle or latency threshold is encoded until a measured current baseline and applicable budget are approved. When thresholds are established, they should be introduced as governed regression gates rather than retroactively treating these Development measurements as acceptance evidence.

## Open performance work

Still required for lifecycle promotion:

- rerun server/library benchmarks on current candidate revisions and representative runners;
- representative startup/readiness and page/load measurements;
- composer-open, search, and attachment responsiveness;
- supported-browser and representative-device interaction/frame continuity;
- larger-library behavior;
- service p50/p95/p99 under concurrency;
- memory, CPU, disk I/O, and idle-resource observations;
- degraded/constrained-network behavior where applicable;
- synchronization performance when synchronization exists;
- regression comparison against an accepted Memos baseline; and
- rollback evidence for performance-sensitive releases.

The current Vite build also emits chunk-size warnings for some large lazy-loaded and application bundles. Those warnings are inputs to profiling and code-splitting work; they are not, by themselves, a qualified performance failure or pass.

Performance evidence does not substitute for security, privacy, accessibility, reliability, recovery, rollback, Glaze, or production acceptance.
