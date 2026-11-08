# GoreeCloud Memos — Repository License Assessment

**Scope:** Public `GoreeCloud/memos` repository, source and development tooling.
**Decision:** Apache License, Version 2.0 (`Apache-2.0`).
**Assessment date:** November 7, 2026.
**Status:** Repository-level licensing decision; not a production release or legal review of future imports.

## Provenance and ownership evidence

- Live GitHub repository identity is `GoreeCloud/memos` on `main`. Its 60 commits at assessment were authored under the authenticated GoreeCloud GitHub account. This verifies visible repository history, not the copyright provenance of every future contribution.
- The application is described as original code, not a fork or renamed import of Google Keep or another Memos upstream. Source inspection covered the standard-library Python HTTP/SQLite server, CLI, GTK4 client, static web assets, tests and test-only package manifest. No vendored third-party application source or binary assets were identified in the inspected repository.
- The stylesheet explicitly credits semantic design values aligned with `GoreeCloud/gc-ui`. That project's current root `LICENSE` is Apache-2.0 (GitHub blob `ff9ad4530f5716304e042cbac72cecd7c40f0e0e`). The Memos `NOTICE` preserves this boundary; Memos licensing does not relicense GC UI.
- The optional GTK4/PyGObject desktop runtime and the test-only pinned `@playwright/test` package are external dependencies, not included as copied source in the assessed tree. Their upstream notices and redistribution obligations remain separate.

## Selection rationale and obligations

Apache-2.0 is an established OSI-approved permissive license with an express patent grant. It fits this original small application and allows reuse without imposing a copyleft license incompatible with its current Python/GTK/browser architecture. It is also compatible with the already cited Apache-2.0 GC UI token source. This is a **Memos-specific** conclusion, not a global GoreeCloud license default.

The repository retains the complete standard Apache License 2.0 in root `LICENSE` and identifies GoreeCloud and GC UI provenance in `NOTICE`. The root README and test-only `package.json` now declare `Apache-2.0`. Redistributors must preserve applicable copyright, license and notice terms; the license does not grant trademarks or third-party intellectual property not owned or licensed by the contributor.

## Boundaries for future changes

- Review each new contributor's rights and inbound license obligations. Do not presume the current history audit covers future contributions.
- Reassess third-party code, imported app sources, bundled fonts/assets, dependencies or distribution artifacts before release; preserve upstream obligations rather than automatically applying this repository's license to them.
- This decision establishes an explicit open-source license for the **repository source** only. It does not qualify Android packaging, production data, hosted identity, service security, or downstream compliance.
- Repository status is established by reading the `main` branch after merge. A proposal or passing CI alone does not establish an adopted license.
