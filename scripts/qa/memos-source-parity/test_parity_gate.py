"""Synthetic-only regression tests; no GoreeCloud production/user data required."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from parity_gate import REQUIRED_GATES, category, check_reference, durable_evidence_url, gate_report, inventory, main


def command(repo: Path, *args: str) -> str:
    p = subprocess.run(["git", "-C", str(repo), *args], text=True, capture_output=True, check=True)
    return p.stdout.strip()


class ParityGateTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name) / "repo"
        self.repo.mkdir()
        command(self.repo, "init", "-q")
        command(self.repo, "config", "user.email", "test@invalid.example")
        command(self.repo, "config", "user.name", "Synthetic Test")
        (self.repo / "web/src/pages").mkdir(parents=True)
        (self.repo / "web/src/pages/Home.tsx").write_text("export const x = 1;\n")
        command(self.repo, "add", "-A")
        command(self.repo, "commit", "-qm", "initial")
        self.old = command(self.repo, "rev-parse", "HEAD")
        (self.repo / "web/src/pages/Home.tsx").write_text("export const x = 2;\n")
        (self.repo / "docs").mkdir()
        (self.repo / "docs/RELEASE.md").write_text("# Synthetic acceptance\n")
        command(self.repo, "add", "-A")
        command(self.repo, "commit", "-qm", "candidate")
        self.new = command(self.repo, "rev-parse", "HEAD")

    def tearDown(self):
        self.tmp.cleanup()

    def test_inventory_only_metadata_and_critical_ui(self):
        inv = inventory(self.repo, self.old, self.new, 2)
        self.assertEqual(inv["changed_paths"], 2)
        self.assertEqual(inv["categories"], {"documentation": 1, "web_ui": 1})
        self.assertTrue(inv["checkout_clean"])
        self.assertEqual(inv["critical_ui_changed"], ["web/src/pages/Home.tsx"])
        self.assertFalse(inv["runtime_certified"])
        self.assertFalse(inv["deployment_authorized"])
        self.assertNotEqual(inv["changes"][1]["old_blob"], inv["changes"][1]["new_blob"])
        self.assertFalse(any("content" in x for x in inv["changes"]))

    def test_gate_fails_closed_without_evidence(self):
        inv = inventory(self.repo, self.old, self.new, 2)
        gate = gate_report(inv, None)
        self.assertFalse(gate["gate_passed"])
        self.assertGreaterEqual(len(gate["blocked_reasons"]), len(REQUIRED_GATES) + 2)
        self.assertFalse(gate["deployment_authorized"])

    def test_gate_needs_all_gates_and_each_critical_ui_path(self):
        inv = inventory(self.repo, self.old, self.new, 2)
        evidence = {
            "baseline": self.old,
            "candidate": self.new,
            "gates": {n: {"status": "passed", "evidence_uri": "https://github.com/GoreeCloud/memos/actions/runs/40051465572"} for n in REQUIRED_GATES},
            "reviewed_ui_paths": {},
        }
        self.assertFalse(gate_report(inv, evidence)["gate_passed"])
        evidence["reviewed_ui_paths"]["web/src/pages/Home.tsx"] = {
            "status": "passed", "evidence_uri": "https://github.com/GoreeCloud/memos/actions/runs/40051465572"
        }
        gate = gate_report(inv, evidence)
        self.assertTrue(gate["evidence_catalog_complete"])
        self.assertFalse(gate["gate_passed"])
        self.assertFalse(gate["deployment_authorized"])
        evidence["candidate"] = self.old
        self.assertFalse(gate_report(inv, evidence)["gate_passed"])

    def test_placeholder_and_unsafe_evidence_cannot_claim_gate(self):
        self.assertFalse(durable_evidence_url("https://example.invalid/synthetic"))
        self.assertFalse(durable_evidence_url("file:///tmp/evidence.txt"))
        self.assertFalse(durable_evidence_url("https://127.0.0.1/evidence"))
        self.assertFalse(durable_evidence_url("https://10.0.0.8/evidence"))
        self.assertFalse(durable_evidence_url("https://audit.example.com/claim"))
        self.assertFalse(durable_evidence_url("https://github.com/path?token=secret"))
        self.assertFalse(durable_evidence_url("http://github.com/example"))
        self.assertFalse(durable_evidence_url("https://user:secret@github.com/evidence"))
        self.assertFalse(durable_evidence_url("https://github.com/a#fragment"))
        self.assertTrue(durable_evidence_url("https://github.com/GoreeCloud/memos/actions/runs/40051465572"))
        inv = inventory(self.repo, self.old, self.new, 2)
        evidence = {
            "baseline": self.old, "candidate": self.new,
            "gates": {g: {"status": "passed", "evidence_uri": "https://example.invalid/synthetic"} for g in REQUIRED_GATES},
            "reviewed_ui_paths": {"web/src/pages/Home.tsx": {"status": "passed", "evidence_uri": "https://example.invalid/claim"}},
        }
        got = gate_report(inv, evidence)
        self.assertFalse(got["evidence_catalog_complete"])
        self.assertFalse(got["gate_passed"])
        self.assertFalse(got["deployment_authorized"])

    def test_malformed_evidence_is_safe_and_explicitly_unverified(self):
        inv = inventory(self.repo, self.old, self.new, 2)
        for manifest in ([], "passed", 12, {"gates": []}, {"gates": None, "reviewed_ui_paths": "yes"}):
            with self.subTest(manifest=manifest):
                out = gate_report(inv, manifest)
                self.assertFalse(out["gate_passed"])
                self.assertEqual(out["qualification"], "NOT_VERIFIED")
                self.assertFalse(out["deployment_authorized"])

    def test_dirty_source_and_mismatch_fail(self):
        (self.repo / "web/src/pages/Home.tsx").write_text("dirty unrelated contents\n")
        inv = inventory(self.repo, self.old, self.new, 3)
        self.assertTrue(any("dirty" in r for r in inv["source_issues"]))
        self.assertTrue(any("expected 3" in r for r in inv["source_issues"]))

    def test_requires_exact_shas_and_ancestry(self):
        with self.assertRaises(ValueError):
            inventory(self.repo, "main", self.new, 2)
        with self.assertRaises(ValueError):
            inventory(self.repo, self.new, self.old, 2)

    def test_cli_never_writes_inside_source_checkout(self):
        bad_dest = self.repo / "my-report.json"
        code = main(["--repo", str(self.repo), "--baseline", self.old, "--candidate", self.new,
                     "--out", str(bad_dest)])
        self.assertEqual(code, 2)
        self.assertFalse(bad_dest.exists())

    def test_read_only_inventory_cli_and_strict_gate(self):
        dest = Path(self.tmp.name) / "report.json"
        args = ["--repo", str(self.repo), "--baseline", self.old, "--candidate", self.new,
                "--expected-changes", "2", "--out", str(dest)]
        self.assertEqual(main(args), 0)
        self.assertTrue(dest.exists())
        record = json.loads(dest.read_text())
        self.assertEqual(record["changed_paths"], 2)
        self.assertEqual(main(args + ["--gate"]), 1)

    def test_reference_rejects_changed_hash_and_revision(self):
        inv = inventory(self.repo, self.old, self.new, 2)
        ui = next(v for v in inv["changes"] if v["path"] == "web/src/pages/Home.tsx")
        reference = {
            "baseline": self.old,
            "candidate": self.new,
            "expected_changes": 2,
            "critical_ui": [dict(ui)],
        }
        check_reference(inv, reference)
        self.assertEqual(inv["source_issues"], [])
        altered = {**reference, "critical_ui": [{**ui, "new_blob": "a" * 40}]}
        check_reference(inv, altered)
        self.assertTrue(any("UI blob mismatch" in x for x in inv["source_issues"]))
        inv2 = inventory(self.repo, self.old, self.new, 2)
        check_reference(inv2, {**reference, "candidate": self.old})
        self.assertTrue(any("identity mismatch" in x for x in inv2["source_issues"]))

    def test_source_reference_does_not_claim_runtime_acceptance(self):
        inv = inventory(self.repo, self.old, self.new, 2)
        ui = next(v for v in inv["changes"] if v["path"] == "web/src/pages/Home.tsx")
        check_reference(inv, {
            "baseline": self.old, "candidate": self.new, "expected_changes": 2,
            "critical_ui": [dict(ui)],
        })
        self.assertFalse(inv["runtime_certified"])
        self.assertFalse(inv["deployment_authorized"])
        self.assertFalse(gate_report(inv, {})["gate_passed"])

    def test_category_rules(self):
        self.assertEqual(category("web/src/locales/fr.json"), "translations")
        self.assertEqual(category("native/linux-gtk4/model.c"), "native_linux")
        self.assertEqual(category("web/tests/layout.spec.ts"), "web_tests_config")
        self.assertEqual(category(".github/workflows/main.yml"), "ci")


if __name__ == "__main__":
    unittest.main(verbosity=2)
