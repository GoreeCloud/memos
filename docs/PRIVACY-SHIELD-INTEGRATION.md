# Privacy Shield Integration Boundary

## Status

**Development source-contract plus central-registration foundation only.** GoreeCloud Memos is centrally registered as a Privacy Shield application adapter, but it is not yet runtime-accepted or production-approved.

This repository pins its local application-privacy declaration to canonical `GoreeCloud/privacy-shield@0da3d1bea33272990375553891044f54b02fcfd4` (Privacy Shield 2.0.0), specifically adapter schema blob `cc0a50a3d0d5151d06ed34be2df30266a91c3bf9` and capability-registry blob `d9bb4e26cf7eb3b90034f763e885d47023df3664`.

## Declared application capabilities

The repository-local adapter declares only capabilities already supported by the authoritative Memos runtime:

- **telemetry-minimization** — core operation does not require advertising, third-party analytics, or hosted telemetry;
- **data-minimization** — new instances are private-first, and core note capture does not require a proprietary hosted control plane or external AI provider;
- **deletion-controls** — authorized memo deletion is policy-checked, and account self-deletion has regression coverage that removes owned account data without deleting unrelated users' data; and
- **portable-export** — the Memos Export Format carries a user's memos and attachments between instances and has clean-target import coverage.

The declaration intentionally does **not** claim content blocking, tracking resistance, URL cleaning, DNS privacy, network privacy, retention controls, Privacy Shield status production, or user-visible exception management.

## Local-first boundary

For this application adapter, `local_first=true` means the authoritative user data store remains the self-hosted Memos instance selected by its operator. It does not mean every optional feature is device-local. Maps, webhooks, OIDC providers, object storage, AI providers, and other explicitly configured external integrations can disclose data to their configured provider and remain outside the core local-first guarantee.

## Evidence and validation

Repository validation checks the exact adapter identity, declared capability set, privacy assertions, pinned Privacy Shield revision/schema provenance, central registration at GoreeCloud/privacy-shield PR #180 / main 96213c9b415ba132ded7c65778be04b38da79ff4, false production approval, and the source files that substantiate deletion and portable-export behavior.

Existing backend and export/import tests remain authoritative for runtime behavior. The Privacy Shield declaration does not replace those tests and does not convert source evidence into target-runtime acceptance.

## Open acceptance work

Central source registration is complete through GoreeCloud/privacy-shield PR #180. Before GoreeCloud Memos may be represented as a runtime-accepted or production-approved Privacy Shield adapter, it still requires:

1. an exact-runtime acceptance record bound to the approved Memos source revision and representative target;
2. approved runtime transport or capability-verification behavior where required by the current Privacy Shield contract;
3. privacy-status production only if Memos intentionally adopts that separate capability, with minimized output that contains no raw private activity, credentials, or identifiers;
4. representative validation of optional-provider disclosures and failure behavior;
5. current Privacy Shield policy/decision integration where the application actually needs shared policy authority; and
6. production approval through the governing Privacy Shield and GoreeCloud lifecycle gates.

Until those gates pass, `production_approved=false`, `runtime_acceptance_complete=false`, and the platform manifest remains `applicable-migration-required`.
