# GoreeCloud Memos — Development Source-Parity Gate

| Field | Value |
| --- | --- |
| Document type | Internal engineering QA utility and usage guide |
| Owner | GoreeCloud |
| Status | Isolated QA candidate, **not** release authority |
| Revision | 3 — October 23, 2026 (America/Chicago) |
| Canonical Markdown | `scripts/qa/memos-source-parity/README.md` in `GoreeCloud/memos` |
| Derived export | `scripts/qa/memos-source-parity/README.pdf` |
| Product lifecycle | Forge / Development |

## Purpose

This **offline, read-only** checker compares two exact Git commit revisions and inventories changed paths and Git blob identities. It rejects dirty working trees, unexpected revision ancestry, changed-path count mismatches and mismatched baseline fingerprints. The checked-in `verified-source-reference.json` pins the historical recorded Development source `cdde8274d6ec87327793caed9d4630ccf80db7eb` against protected Memos main `978f60d05c86efa9c42f790a24752497e1a53f08`. Those references were verified against GitHub source metadata, **not** a fresh VPS filesystem inspection.

**It never reads memo content, talks to a live service, creates a deployment, or authorizes promotion.** It only invokes local `git` read operations; Git optional locks are disabled. An evidence JSON file, including one with apparently credible links, cannot independently attest backup integrity, security, authenticated screenshots, or a live release. The checker deliberately keeps `gate_passed=false`, `deployment_authorized=false`, and `qualification=NOT_VERIFIED`, even when all evidence entries are populated.

## Usage — isolated, clean, authorized checkout only

```bash
python3 -m unittest discover -s . -p 'test_parity_gate.py' -v
python3 parity_gate.py \
  --repo /path/to/clean-authorized-memos-checkout \
  --baseline cdde8274d6ec87327793caed9d4630ccf80db7eb \
  --candidate 978f60d05c86efa9c42f790a24752497e1a53f08 \
  --expected-changes 95 \
  --reference verified-source-reference.json \
  --out /tmp/memos-source-parity-inventory.json
```

The checkout must already contain both commit objects. Do **not** run this utility against the dirty VPS working tree; use a clean, separately approved QA checkout. Do not copy user notes, live database files, attachments or tokens into the QA workspace. Never assume a source SHA is an immutable deployed-image digest.

Use `--gate --evidence acceptance-template.json` to demonstrate that release qualification remains blocked. The manifest holds nine independent acceptance categories plus per-file UI review entries. All evidence links must identify durable HTTPS locations; placeholder, credential-bearing, non-HTTPS and malformed URLs are rejected. Passing syntactic checks means entries are **catalogued**, not that their evidence is independently verified.

## Verified historical source gap

At the pinned two Git revisions, current main is **16 commits ahead, 0 behind**, affecting **95 paths**: ten UI sources, eleven web tests/configuration, twenty-three native Linux, forty-five translations, and six other files. Ten owner-visible UI paths are explicitly pinned by old/new Git blob hashes. Responsive navigation, masonry layout, `ViewContext`, and `PagedMemoList` changed. This is source-level evidence only.

## Release and recovery gates still pending

- Exact immutable Development image provenance and built/served asset fingerprint
- Authenticated desktop and mobile screenshot-led behavioral parity, keyboard, screen reader and GC UI conformance
- Consistent protected database and managed-attachment backup with a **clean-target** restore and readback
- External non-overlay denial, approved NetBird access, strict TLS and anonymous data access denial
- Disposable end-to-end QA, full exact-candidate checks and safe rollback with post-cutover write preservation

An authorized maintainer must verify those conditions against the actual target and the current governing instructions before any promotion. A successful source compare or CI run is **not** permission to replace the running Memos Development image.

## Contents and reproducibility

`parity_gate.py` — offline inventory and fail-closed evidence parser. `test_parity_gate.py` — synthetic unit tests only. `verified-source-reference.json` — pinned, source-only historical hashes and expected counts. `acceptance-template.json` — deliberately pending gates. `README.pdf` is a derivative of this Markdown guide. `SHA256SUMS` records the expected hashes of the packaged source, metadata and PDF export. The package does not contain secrets, user notes, databases, attachments or production data.
