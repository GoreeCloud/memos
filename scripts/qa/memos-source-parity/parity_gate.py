#!/usr/bin/env python3
"""Read-only exact-revision Memos Development parity inventory and acceptance gate.

Run against an authorized local checkout with already present Git objects. No
network requests, live service commands, file mutations in the checkout, or
memo/user data access. Only Git tree metadata and explicit operator evidence.

Example:
  python parity_gate.py --repo /path/to/isolated/memos-clone \
    --baseline cdde8274d6ec87327793caed9d4630ccf80db7eb \
    --candidate 978f60d05c86efa9c42f790a24752497e1a53f08 \
    --expected-changes 95 --out inventory.json

Optional --gate --evidence evidence.json additionally requires evidence from an
independently operated QA process. It never promotes/deploys or authorizes it.
"""

from __future__ import annotations
import argparse
import json
import os
import ipaddress
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit

SHA_RE = re.compile(r"[0-9a-fA-F]{40}\Z")

REQUIRED_GATES = (
    "source_review_all_changed_paths",
    "owner_visible_authenticated_ui_parity",
    "exact_candidate_full_validation",
    "image_source_and_asset_provenance",
    "scoped_backup_integrity",
    "clean_target_restore_and_attachment_readback",
    "external_non_overlay_deny_and_authorized_tls",
    "anonymous_content_access_denied",
    "rollback_and_post_cutover_write_safety",
)

CRITICAL_UI = (
    "web/src/components/AppSidebar/AppSidebar.tsx",
    "web/src/components/AppSidebar/DashboardSidebar.css",
    "web/src/components/AppSidebar/DashboardSidebar.tsx",
    "web/src/components/MemoContent/useSearchMatchHighlight.ts",
    "web/src/components/MemoDisplaySettingMenu.tsx",
    "web/src/components/MemoView/MemoView.tsx",
    "web/src/components/PagedMemoList/PagedMemoList.tsx",
    "web/src/contexts/ViewContext.tsx",
    "web/src/pages/Home.masonry.css",
    "web/src/pages/Home.tsx",
)


def git(repo: Path, *args: str, allow_missing: bool = False) -> bytes | None:
    proc = subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, check=False,
        timeout=45, env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"},
    )
    if proc.returncode:
        if allow_missing:
            return None
        err = proc.stderr.decode("utf-8", "replace").strip()
        raise ValueError(f"git command failed (exit {proc.returncode}): {err[:350]}")
    return proc.stdout


def resolve_rev(repo: Path, rev: str) -> str:
    if not SHA_RE.fullmatch(rev):
        raise ValueError("Revision must be an exact 40-character SHA (no tags or symbolic refs).")
    out = git(repo, "rev-parse", "--verify", rev + "^{commit}")
    return (out or b"").decode().strip()


def blob_sha(repo: Path, rev: str, path: str) -> str | None:
    # The path is from git's own NUL-delimited output. Git never executes it.
    r = git(repo, "rev-parse", "--verify", f"{rev}:{path}", allow_missing=True)
    return r.decode().strip() if r else None


def category(path: str) -> str:
    if path.startswith("native/linux-gtk4/"):
        return "native_linux"
    if path.startswith("web/src/locales/"):
        return "translations"
    if path.startswith("web/src/"):
        return "web_ui"
    if path.startswith("web/tests/") or path.startswith("web/playwright"):
        return "web_tests_config"
    if path.startswith(".github/"):
        return "ci"
    if path.startswith("docs/") or path.endswith(".md"):
        return "documentation"
    return "other"


def inventory(repo: Path, baseline: str, candidate: str, expected_changes: int | None) -> dict:
    if not (repo / ".git").exists():
        # A Git worktree has a .git pointer file, which also passes exists().
        raise ValueError("Repository path must have a .git directory or worktree pointer.")
    b, c = resolve_rev(repo, baseline), resolve_rev(repo, candidate)
    # In addition to exact commits, prohibit a baseline from a divergent source line.
    ancestor = subprocess.run(
        ["git", "-C", str(repo), "merge-base", "--is-ancestor", b, c],
        check=False, capture_output=True, timeout=45,
        env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"},
    )
    if ancestor.returncode != 0:
        raise ValueError("Baseline is not an ancestor of candidate; stop and reconcile history.")
    names = (git(repo, "diff", "--name-only", "-z", b, c) or b"").split(b"\x00")
    paths = sorted({s.decode("utf-8", "surrogateescape") for s in names if s})
    changes = []
    groups: dict[str, int] = {}
    for path in paths:
        k = category(path)
        groups[k] = groups.get(k, 0) + 1
        changes.append({
            "path": path,
            "category": k,
            "old_blob": blob_sha(repo, b, path),
            "new_blob": blob_sha(repo, c, path),
            "critical_ui": path in CRITICAL_UI,
        })
    status = (git(repo, "status", "--porcelain", "-z") or b"")
    issues = []
    if status:
        issues.append("Checkout is dirty; never build the candidate from this tree.")
    if expected_changes is not None and len(changes) != expected_changes:
        issues.append(f"Changed-path inventory differs from expected {expected_changes}: observed {len(changes)}.")
    missing_critical = sorted(set(CRITICAL_UI) - set(paths))
    return {
        "schema": "goreecloud-memos-source-parity-inventory-v1",
        "baseline": b,
        "candidate": c,
        "changed_paths": len(changes),
        "categories": dict(sorted(groups.items())),
        "critical_ui_changed": sorted(set(CRITICAL_UI) & set(paths)),
        "critical_ui_unchanged": missing_critical,
        "changes": changes,
        "checkout_clean": not bool(status),
        "source_issues": issues,
        "runtime_certified": False,
        "deployment_authorized": False,
    }


def check_reference(inv: dict, reference: dict) -> None:
    """Reject mismatched historical hashes; this still does not attest the VPS."""
    if (inv["baseline"], inv["candidate"]) != (reference.get("baseline"), reference.get("candidate")):
        inv["source_issues"].append("Reference baseline/candidate identity mismatch.")
    expected_count = reference.get("expected_changes")
    if expected_count != inv["changed_paths"]:
        inv["source_issues"].append("Reference changed-path count mismatch.")
    if reference.get("expected_categories") is not None and inv["categories"] != reference.get("expected_categories"):
        inv["source_issues"].append("Reference category counts differ from current Git tree.")
    paths = {r["path"]: r for r in inv["changes"]}
    for entry in reference.get("critical_ui", []):
        path = entry.get("path", "")
        actual = paths.get(path)
        if actual is None:
            inv["source_issues"].append(f"Reference UI file absent from delta: {path}")
        elif actual["old_blob"] != entry.get("old_blob") or actual["new_blob"] != entry.get("new_blob"):
            inv["source_issues"].append(f"Reference UI blob mismatch: {path}")


def durable_evidence_url(value: object) -> bool:
    """Reject transient, placeholder, credential-bearing and non-HTTPS links.

    Valid URLs are *pointers for later verification*, not independent proof.
    """
    if not isinstance(value, str) or not value or any(ch.isspace() for ch in value):
        return False
    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname or ""
        try:
            # Link-local, private, loopback and numerical hosts are not durable
            # independent acceptance evidence destinations.
            ipaddress.ip_address(hostname)
            return False
        except ValueError:
            pass
        return (
            parsed.scheme == "https"
            and hostname not in ("localhost", "example.invalid", "example.com", "example.org", "test.invalid")
            and not hostname.endswith((".invalid", ".example", ".test", ".localhost", ".local", ".internal", ".example.com", ".example.org", ".example.net"))
            and "." in hostname
            and not parsed.username and not parsed.password
            and parsed.port in (None, 443)
            and not parsed.fragment
            and not parsed.query
            and len(value) <= 2048
        )
    except ValueError:
        return False


def gate_report(inv: dict, evidence: dict | None) -> dict:
    reasons = list(inv["source_issues"])
    if evidence is None:
        reasons.append("No externally verified, exact-candidate evidence manifest provided.")
        evidence = {}
    if not isinstance(evidence, dict):
        evidence = {}
        reasons.append("Evidence manifest must be a JSON object.")
    if evidence.get("baseline") != inv["baseline"] or evidence.get("candidate") != inv["candidate"]:
        reasons.append("Evidence manifest revision identity missing or mismatched.")
    checks = evidence.get("gates", {})
    for name in REQUIRED_GATES:
        entry = checks.get(name, {}) if isinstance(checks, dict) else {}
        if not isinstance(entry, dict) or entry.get("status") != "passed" or not durable_evidence_url(entry.get("evidence_uri")):
            reasons.append(f"Missing valid documented evidence: {name}.")
    reviewed = evidence.get("reviewed_ui_paths", {})
    for path in inv["critical_ui_changed"]:
        entry = reviewed.get(path, {}) if isinstance(reviewed, dict) else {}
        if not isinstance(entry, dict) or entry.get("status") != "passed" or not durable_evidence_url(entry.get("evidence_uri")):
            reasons.append(f"Critical UI path lacks durable reviewed parity evidence: {path}.")
    entries_complete = not bool(reasons)
    # Crucial trust boundary: a JSON file cannot independently attest HTTPS,
    # screenshots, live images, backups, restorations, private access or releases.
    # Even well-formed evidence links need an authorized external verification.
    # This read-only inventory never approves or executes a deployment.
    reasons.append("Manifest claims and URLs require independent provider/runtime verification; local metadata cannot certify release acceptance.")
    return {
        "qualification": "NOT_VERIFIED",
        "evidence_catalog_complete": entries_complete,
        "gate_passed": False,
        "blocked_reasons": reasons,
        "deployment_authorized": False,
        "note": "Source comparison and catalogued links are not runtime attestations; no release permission is conferred.",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", type=Path, required=True, help="Authorized clean offline Git checkout")
    parser.add_argument("--baseline", required=True, help="40-character deployed SOURCE revision, not image tag")
    parser.add_argument("--candidate", required=True, help="40-character candidate source revision")
    parser.add_argument("--expected-changes", type=int, default=None)
    parser.add_argument("--out", type=Path, help="Write a local JSON report only; never write in the repository")
    parser.add_argument("--gate", action="store_true", help="Require independently accepted release evidence (always blocked in this offline tool)")
    parser.add_argument("--evidence", type=Path, help="JSON acceptance manifest for --gate")
    parser.add_argument("--reference", type=Path, help="Verified source SHA/blob reference to check against")
    args = parser.parse_args(argv)
    if args.expected_changes is not None and args.expected_changes < 0:
        parser.error("--expected-changes cannot be negative")
    try:
        result = inventory(args.repo, args.baseline, args.candidate, args.expected_changes)
        if args.reference:
            check_reference(result, json.loads(args.reference.read_text(encoding="utf-8")))
        result["gate"] = gate_report(
            result, json.loads(args.evidence.read_text(encoding="utf-8")) if args.evidence else None
        )
    except (ValueError, OSError, subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        print(f"PARITY CHECK FAILED: {e}", file=sys.stderr)
        return 2
    data = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        # Reports must not be written into Git's authoritative project tree.
        repo = args.repo.resolve()
        dest = args.out.resolve()
        if dest == repo or repo in dest.parents:
            print("PARITY CHECK FAILED: report destination must be outside the source checkout.", file=sys.stderr)
            return 2
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(data, encoding="utf-8")
        print(f"Report written: {args.out}")
    else:
        print(data)
    print(f"Changed paths: {result['changed_paths']}; critical UI changes: {len(result['critical_ui_changed'])}", file=sys.stderr)
    print(f"Status: {result['gate']['qualification']}; blockers: {len(result['gate']['blocked_reasons'])}", file=sys.stderr)
    if args.gate:
        return 0 if result["gate"]["gate_passed"] else 1
    return 0 if not result["source_issues"] else 1


if __name__ == "__main__":
    sys.exit(main())
