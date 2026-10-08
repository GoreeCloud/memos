# GoreeCloud Observability Integration

## Current boundary

GoreeCloud Memos implements a source-level operational-signal producer boundary against the reviewed GoreeCloud Observability Development contracts. This is not a claim that Memos is monitored by a live GoreeCloud Observability deployment.

Reviewed authority:

- repository: GoreeCloud/observability
- revision: a7f6a65f442d3e517baddbe7b6ce7c250d142c8c
- foundation version: 0.1.0-dev
- signal schema: https://goreecloud.com/contracts/observability/operational-signal/v1
- component-health schema: https://goreecloud.com/contracts/observability/component-health/v1

## Implemented source behavior

The internal/observability package can normalize two existing Memos operational facts into the canonical signal vocabulary:

- process liveness corresponding to /healthz;
- database readiness corresponding to /readyz.

The producer preserves the canonical goreecloud-memos component/source identity, RFC3339 timestamps, bounded TTL, and explicit health states.

Database failures fail closed to unavailable. A missing database handle is unknown. Raw database error text is not copied into operational evidence.

## Privacy and security boundary

The source producer does not emit memo content, user identity, attachment metadata, authentication/session material, or database error text.

Signal validation rejects obvious secret-bearing attribute keys. This is a defensive source baseline only; Privacy Shield and Wardveil remain authoritative for privacy/security acceptance.

## Not implemented or accepted

The following remain open:

- live submission to a GoreeCloud Observability collector;
- producer authentication or service identity;
- transport security and retry/backoff;
- durable telemetry storage or retention;
- request traces, logs, resource metrics, or user-content diagnostics;
- correlation with Mesh, Manager, Policy, Identity, Privacy Shield, Wardveil, or Everkeep;
- target-runtime acceptance;
- production observability approval.

Until those are implemented and verified, platform_systems.observability remains applicable-migration-required, not conformant.
