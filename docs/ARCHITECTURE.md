# Architecture

GoreeCloud Memos retains the mature Memos architecture: a Go backend, browser client, relational persistence support, attachment storage, and API surfaces. The fork keeps this foundation deliberately rather than rewriting mature low-level behavior without engineering justification.

GoreeCloud-owned boundaries are layered around that foundation:

- **Product experience:** GoreeCloud Memos branding, information hierarchy, Glaze-aligned presentation, quick-capture emphasis, and product-specific defaults.
- **Trust posture:** private-first instance initialization, explicit authentication/authorization, privacy-safe defaults, and hardening controls.
- **Continuity:** portable export/import plus planned Everkeep backup/restore acceptance.
- **Ecosystem:** future Manager, Privacy Shield, Wardveil, Everkeep, Mesh, Identity, Policy, and Observability integrations.
- **Maintenance:** pinned upstream baseline, explicit upstream remote, provenance records, CI, and reviewed upstream merges.

The upstream Go module path remains unchanged for now to minimize high-risk mechanical divergence. That is an implementation detail, not product identity.


## Operational health boundary

The web process exposes /healthz as a liveness probe and /readyz as a database-backed readiness probe. Liveness does not claim durable-state availability. Readiness fails closed with HTTP 503 when the configured database cannot be reached and does not disclose database error details to unauthenticated callers.
