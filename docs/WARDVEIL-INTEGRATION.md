# Wardveil Security Integration

GoreeCloud Memos currently implements a source-level, read-only Wardveil status-consumer boundary. This is Development adoption evidence, not runtime protection or production acceptance.

## Contract authority

The consumer is pinned to GoreeCloud/wardveil at d3c54f47dcbd3b691ab2c98946b1e556985d8391, Wardveil product version 2.0.0 / Foundation 0.9.0, using status contract 0.1.0.

The repository records exact Git blob identities for the status schema, capabilities contract, identity contract, and adoption requirements in provenance/wardveil.json.

## Central source-evidence registration

Wardveil PR #210 registered the Memos source consumer in the canonical Wardveil repository. Wardveil protected main revision `96969fe80acec564ea509c0ae722e9b97e22f6b3` contains `contracts/wardveil.memos.consumer-source-evidence.json` at blob `66d4dac9d0e5f6ad1df3522ddbbba6dc6deee2d1` plus its dedicated validator at blob `5f9e18caa3bd8ebbb59a7ef651a5857b1f030ee4`.

Exact Wardveil merged-main validation succeeded in foundation run 813 / 37769379314, authenticated Scan transport run 534 / 37769379284, and pinned Mesh evidence run 425 / 37769379290.

The central record binds the source evidence to GoreeCloud Memos revision `73079a348275a36e032cd3e5214be84444331a40`, source tree `14a6f72dc944c79d4eb99f15b0cede6bfb19667b`, and Memos validation run 134 / 37768527867. It explicitly keeps runtime acceptance and production protection unaccepted.

## Implemented source boundary

internal/wardveil:

- strictly decodes the canonical Wardveil status-record shape and rejects unknown fields;
- recognizes only canonical normalized states;
- preserves explicit scope and authoritative-producer fields;
- fails closed to unknown when required evidence is stale, unavailable, unverified, implausibly future-dated, expired, or malformed;
- refuses a protected state or Protected by Wardveil claim unless the producer is authoritative and current evidence has an unexpired freshness deadline;
- rejects obvious reusable-credential and sensitive markers from shared presentation evidence; and
- exposes explicit text labels for normalized states so future presentation does not depend on color alone.

## Explicitly not implemented or accepted

This source boundary does not establish:

- live Wardveil status transport;
- producer or service authentication;
- Wardveil Trust, Policy, Protect, Detect, Scan, Quarantine, Response, or Audit execution;
- runtime authorization or high-impact execution;
- security-event delivery;
- Security Center registration;
- target-runtime acceptance;
- a Protected by Wardveil claim for GoreeCloud Memos;
- production approval, Seal, or Anchor qualification.

The consumer remains fail-closed until authenticated live evidence and application-specific runtime acceptance exist.

## Rollback boundary

Removing the Wardveil status adapter must not disable Memos application-owned authentication, authorization, private-first defaults, session controls, data isolation, backup/recovery, or other security controls. Wardveil presentation and evidence consumption remain separate from the systems that enforce those controls.
