# GoreeCloud Manager Integration Boundary

## Status

**Blocked pending a canonical Manager application-visibility contract.**

GoreeCloud Memos is a first-party GoreeCloud application and Manager visibility is applicable, but the current GoreeCloud Manager repository does not yet expose an accepted application-registration and lifecycle-visibility contract for downstream applications to implement.

The dependency is tracked canonically in [GoreeCloud/manager#111](https://github.com/GoreeCloud/manager/issues/111), **Define canonical application registration and lifecycle-visibility contract**.

Reviewed Manager source authority for this boundary: `GoreeCloud/manager@ebf5ea526c14a198ebaabf76fe923e82bddd2ad6` on October 8, 2026.

## Existing Memos-owned evidence

Memos already owns truthful operational and lifecycle facts that a future Manager adapter may expose after a canonical contract exists:

- component identity `goreecloud-memos` and repository `GoreeCloud/memos`;
- Forge / Development lifecycle and nonqualified state;
- supported web, Linux, and container surfaces;
- `/healthz` process-liveness endpoint;
- `/readyz` database-backed readiness endpoint;
- repository-local platform-system, continuity, provenance, and acceptance records.

These facts remain Memos-owned. Their existence does not establish Manager registration or runtime integration.

## Authority boundary

Memos must not invent a repository-local Manager registration schema merely to satisfy a platform checklist.

Future Manager integration must preserve these constraints:

1. Manager presents or coordinates Memos-owned lifecycle and operational evidence; it does not become the source of truth for Memos state.
2. Health and readiness must remain semantically distinct.
3. Registration/status payloads must exclude memo content, attachment contents, reusable credentials, secrets, raw user identifiers, and unrelated activity.
4. A structurally valid visibility record must not grant mutation authority.
5. Any future administrative write/control capability requires its own authenticated, authorized, auditable, fail-closed contract and separate acceptance evidence.
6. Privacy, security, continuity, Identity, Policy, Mesh, and Observability truth remains with the owning GoreeCloud systems.
7. Stale, missing, malformed, unauthenticated, or unsupported evidence must fail closed rather than be presented as healthy/accepted state.

## Adoption gate

When Manager issue #111 produces an accepted contract, Memos may move from `applicable-blocked` to a migration/adoption state only after repository-local work pins:

- the exact Manager source revision and contract/schema blob;
- the supported registration/discovery mechanism;
- required authentication and transport semantics;
- freshness/minimization rules;
- read-only versus separately approved control authority;
- exact-target runtime acceptance evidence.

Production acceptance remains separate even after source adoption.

## Current acceptance statement

Manager registration, lifecycle visibility, and operational acceptance are **not implemented or accepted** for GoreeCloud Memos. The platform manifest therefore remains `applicable-blocked`.
