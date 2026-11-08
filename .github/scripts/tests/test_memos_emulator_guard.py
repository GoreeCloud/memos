"""Verify emulator QA cannot touch the owner's laptop or a physical device."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "memos-emulator-smoke.py"


class EmulatorGuardTests(unittest.TestCase):
    def test_refuses_without_all_three_explicit_github_qa_markers(self):
        for enabled in ("none", "ci-only", "github-only", "opt-in-only", "ci-github"):
            with self.subTest(enabled=enabled):
                env = os.environ.copy()
                for key in ("CI", "GITHUB_ACTIONS", "GOREEMEMOS_EMULATOR_QA"):
                    env.pop(key, None)
                if enabled == "ci-only":
                    env["CI"] = "true"
                elif enabled == "github-only":
                    env["GITHUB_ACTIONS"] = "true"
                elif enabled == "opt-in-only":
                    env["GOREEMEMOS_EMULATOR_QA"] = "1"
                elif enabled == "ci-github":
                    env["CI"] = "true"
                    env["GITHUB_ACTIONS"] = "true"
                with tempfile.TemporaryDirectory(prefix="memos-emulator-guard-") as temp:
                    result = subprocess.run(
                        [sys.executable, str(SCRIPT)], cwd=temp, env=env,
                        capture_output=True, text=True, timeout=10
                    )
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("Refusing emulator mutation", result.stderr)
                    self.assertEqual(list(Path(temp).iterdir()), [],
                                     "A rejected run must not write any files")


if __name__ == "__main__":
    unittest.main()
