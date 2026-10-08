# Performance

GoreeCloud Memos is still a Development/nonconformant maintained-fork rebuild. Performance measurements are comparison evidence, not production SLAs.

## Development server baseline

Source revision: `f3e7dbe7c4bf716134a9d65ea2cea0d87870cc78`.

The existing benchmark harness seeds 5,000 top-level memos in SQLite with representative attachments, reactions, relations, and comments. On October 7, 2026, Linux/amd64 on an Intel Core i3-1005G1 CPU produced:

| Benchmark | Approx. latency | B/op | allocs/op |
| --- | ---: | ---: | ---: |
| authenticated first page | 19.5 ms | 394,211 | 4,949 |
| authenticated page ten | 30.5 ms | 386,865 | 4,968 |
| public first page | 7.2 ms | 388,838 | 5,043 |\n| comment preview | 5.64 ms | 45,846 | 554 |

The measurement used the repository benchmark suite with five iterations per benchmark and allocation reporting. Absolute timings depend on hardware, storage, operating system, Go runtime, database driver, dataset shape, thermal state, and background activity.

Use this as a repeatable Development comparison point. A substantial like-for-like regression requires investigation; a hard latency release gate remains intentionally unset until representative-runner evidence supports one.

## Still open

Representative performance evidence remains required for startup/readiness, browser first useful render, composer open, search, attachments, larger libraries, synchronization when implemented, supported native clients, service p50/p95/p99 under concurrency, memory/CPU/disk I/O, idle resource use, and production-like infrastructure.

Performance evidence does not substitute for security, privacy, accessibility, reliability, rollback, Glaze, or production acceptance.
