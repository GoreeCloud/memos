# Everkeep Integration Boundary

## Status

**Development source foundation only.** GoreeCloud Memos is not yet Everkeep-integrated or Everkeep-ready.

This repository pins its source-level adoption model to the canonical Everkeep contracts reviewed at `GoreeCloud/everkeep@f69e369e4d8627280fac728b7f7bcb02c43b5edd`.

## Implemented source boundary

The repository now carries:

- `integrations/everkeep/adoption.json`, declaring the continuity dimensions Memos intends to consume, read-only behavior, fail-closed handling, and authoritative evidence sources;
- `integrations/everkeep/acceptance.json`, declaring freshness rules, non-ready failure behavior, required evidence, sensitive-evidence exclusions, and explicit false acceptance flags; and
- `internal/everkeep`, a fail-closed normalized status evaluator with tests for current evidence, staleness, missing evidence, failed restore evidence, untrusted producers, future-dated evidence, schema drift, sensitive evidence markers, and summary-state non-overstatement.

The evaluator accepts only the normalized Everkeep continuity status vocabulary. A required dimension is never promoted to ready when its evidence is missing, malformed, stale, unavailable, from the wrong producer/scope, marked not applicable, or missing an evidence reference where evidence is required.

## Required dimensions

The initial Memos boundary covers:

- backup coverage;
- restore capability;
- recovery freshness;
- portability;
- migration;
- recovery documentation; and
- provenance.

These dimensions map to existing Memos recovery, portability, and database-upgrade work without claiming that those local controls are already delivered to or accepted by a live Everkeep service.

## Sensitive evidence

Continuity evidence must contain references and verification facts, not protected payloads. Memos rejects unknown status-record fields and rejects obvious credential markers in normalized evidence strings. Memo bodies, attachment contents, database row payloads, passwords, access/refresh tokens, API keys, recovery codes, private keys, session cookies, and reusable credentials are forbidden by the repository acceptance policy.

## Open acceptance work

Before `platform_systems.everkeep` may be represented as accepted, GoreeCloud Memos still requires:

1. an approved runtime transport/provider contract to Everkeep;
2. authenticated producer identity and authority validation;
3. full approved backup scope covering database, attachments, and required durable configuration;
4. clean-target full-instance restore evidence, not only personal archive or SQLite snapshot evidence;
5. current restore/freshness evidence delivered through the canonical provider path;
6. failure, outage, stale-evidence, malformed-evidence, and rollback validation in the target environment;
7. representative operational recovery and disaster-recovery acceptance; and
8. exact-revision production acceptance under the governing Everkeep, Privacy Shield, Wardveil Security, Identity, Policy, and Observability boundaries.

Until those gates pass, this integration remains `applicable-migration-required`, `everkeep_integrated=false`, and `everkeep_ready=false`.
