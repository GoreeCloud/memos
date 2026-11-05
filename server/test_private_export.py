"""Safe local JSON export regression tests; no external API requests."""
import contextlib
import importlib.util
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("memos_cli_private_export", ROOT / "cli" / "memos.py")
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)


@unittest.skipUnless(os.name == "posix", "Private JSON exports require POSIX permissions")
class PrivateExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.output = self.folder / "private.json"
        self.data = {
            "format": "goreecloud-memos-v2",
            "memos": [{"id": "1", "content": "Private journal entry ☀"}],
            "revisions": [{"memo_id": "1", "version": 1, "content": "Earlier private text"}],
        }

    def assert_no_temps(self):
        self.assertEqual(list(self.folder.glob(".memos-export-*.tmp")), [])

    def test_private_output_preserves_unicode_and_history(self):
        self.assertEqual(cli.write_private_export(self.data, self.output), self.output)
        self.assertEqual(self.output.stat().st_mode & 0o777, 0o600)
        self.assertEqual(json.loads(self.output.read_text(encoding="utf-8")), self.data)
        self.assert_no_temps()

    def test_existing_file_is_not_overwritten(self):
        self.output.write_text("do not touch", encoding="utf-8")
        with self.assertRaises(FileExistsError):
            cli.write_private_export(self.data, self.output)
        self.assertEqual(self.output.read_text(), "do not touch")
        self.assert_no_temps()

    def test_symlink_destination_is_rejected(self):
        original = self.folder / "original.json"
        original.write_text("important", encoding="utf-8")
        self.output.symlink_to(original)
        with self.assertRaises(FileExistsError):
            cli.write_private_export(self.data, self.output)
        self.assertEqual(original.read_text(), "important")
        self.assert_no_temps()

    def test_missing_parent_refused_without_creation(self):
        path = self.folder / "absent-folder" / "export.json"
        with self.assertRaisesRegex(ValueError, "directory must already exist"):
            cli.write_private_export(self.data, path)
        self.assertFalse(path.parent.exists())

    def test_json_serialization_failure_leaves_no_destination(self):
        with self.assertRaises(TypeError):
            cli.write_private_export({"unsupported": {1, 2, 3}}, self.output)
        self.assertFalse(self.output.exists())
        self.assert_no_temps()

    def test_file_flush_failure_cleans_temporary_file(self):
        with patch.object(cli.os, "fsync", side_effect=OSError("injected file flush failure")):
            with self.assertRaisesRegex(OSError, "file flush failure"):
                cli.write_private_export(self.data, self.output)
        self.assertFalse(self.output.exists())
        self.assert_no_temps()

    def test_directory_flush_failure_cleans_published_file(self):
        calls = []

        def fail_second_flush(fd):
            calls.append(fd)
            if len(calls) == 2:
                raise OSError("injected directory flush failure")

        with patch.object(cli.os, "fsync", side_effect=fail_second_flush):
            with self.assertRaisesRegex(OSError, "directory flush failure"):
                cli.write_private_export(self.data, self.output)
        self.assertEqual(len(calls), 2)
        self.assertFalse(self.output.exists())
        self.assert_no_temps()

    def test_cli_output_flag_does_not_print_export_contents(self):
        output = io.StringIO()
        with patch.dict(os.environ, {"GOREE_MEMOS_TOKEN": "test-token-contains-more-than-24-characters"}):
            with patch.object(cli, "request", return_value=self.data):
                with patch.object(sys, "argv", ["memos.py", "export", "--output", str(self.output)]):
                    with contextlib.redirect_stdout(output):
                        cli.main()
        self.assertNotIn("Private journal entry", output.getvalue())
        self.assertIn("Private JSON export saved:", output.getvalue())
        self.assertEqual(json.loads(self.output.read_text()), self.data)

    def test_stdout_export_remains_supported_for_existing_scripts(self):
        output = io.StringIO()
        with patch.dict(os.environ, {"GOREE_MEMOS_TOKEN": "test-token-contains-more-than-24-characters"}):
            with patch.object(cli, "request", return_value=self.data):
                with patch.object(sys, "argv", ["memos.py", "export"]):
                    with contextlib.redirect_stdout(output):
                        cli.main()
        self.assertEqual(json.loads(output.getvalue()), self.data)
        self.assertFalse(self.output.exists())


if __name__ == "__main__":
    unittest.main()
