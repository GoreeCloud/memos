"""Verify the opt-in recovery rehearsal never consults user data."""
import contextlib
import io
import unittest
from unittest.mock import patch

import recovery_drill


class SyntheticRecoveryDrillTests(unittest.TestCase):
    def test_complete_disposable_recovery_preserves_history_and_isolation(self):
        result = recovery_drill.run_synthetic_recovery_drill()
        self.assertEqual(result["integrity"], "ok")
        self.assertEqual(result["memos"], 2)
        self.assertEqual(result["revisions"], 2)
        self.assertIs(result["full_history_verified"], True)
        self.assertIs(result["snapshot_isolation_verified"], True)
        self.assertIs(result["exclusive_publish_verified"], True)

    def test_command_rejects_operator_database_paths(self):
        with patch.object(recovery_drill.sys, "argv",
                          ["recovery_drill.py", "/home/operator/private.sqlite"]):
            with self.assertRaisesRegex(SystemExit, "accepts no database paths"):
                recovery_drill.main()

    def test_success_output_has_only_synthetic_metrics(self):
        output = io.StringIO()
        with patch.object(recovery_drill.sys, "argv", ["recovery_drill.py"]):
            with contextlib.redirect_stdout(output):
                recovery_drill.main()
        self.assertIn("Synthetic recovery drill PASS", output.getvalue())
        self.assertIn("2 fictional memos", output.getvalue())
        self.assertNotIn("synthetic-source.sqlite", output.getvalue())


if __name__ == "__main__":
    unittest.main()
