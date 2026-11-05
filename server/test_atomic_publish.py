"""Recovery publication failure tests, run by Python unittest discovery."""
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app import Store
from maintenance import backup_database, restore_database, verify_database


class AtomicPublishTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.source = self.folder / "source.sqlite"
        self.store = Store(self.source)
        self.store.create({"content": "Important, committed private memo"})

    def assert_no_temporary_files(self):
        self.assertEqual(list(self.folder.glob(".memos-backup-*.sqlite")), [])

    def test_file_fsync_failure_never_creates_backup(self):
        destination = self.folder / "archive.sqlite"
        with patch("maintenance.os.fsync", side_effect=OSError("simulated data flush failure")):
            with self.assertRaisesRegex(OSError, "data flush failure"):
                backup_database(self.source, destination)
        self.assertFalse(destination.exists())
        self.assert_no_temporary_files()
        self.assertEqual(verify_database(self.source)["memos"], 1)

    @unittest.skipUnless(os.name == "posix", "Directory fsync requires POSIX")
    def test_directory_fsync_failure_unlinks_our_backup(self):
        destination = self.folder / "archive.sqlite"
        calls = []

        def fail_directory_flush(fd):
            calls.append(fd)
            if len(calls) == 2:
                raise OSError("simulated directory flush failure")

        with patch("maintenance.os.fsync", side_effect=fail_directory_flush):
            with self.assertRaisesRegex(OSError, "directory flush failure"):
                backup_database(self.source, destination)
        self.assertEqual(len(calls), 2)
        self.assertFalse(destination.exists())
        self.assert_no_temporary_files()
        self.assertEqual(verify_database(self.source)["memos"], 1)

    def test_file_fsync_failure_never_creates_restore(self):
        destination = self.folder / "restored.sqlite"
        with patch("maintenance.os.fsync", side_effect=OSError("simulated data flush failure")):
            with self.assertRaisesRegex(OSError, "data flush failure"):
                restore_database(self.source, destination)
        self.assertFalse(destination.exists())
        self.assert_no_temporary_files()
        self.assertEqual(verify_database(self.source)["memos"], 1)

    def test_successful_backup_and_restore_are_verified(self):
        archive = self.folder / "backup.sqlite"
        restored = self.folder / "restored.sqlite"
        metrics = backup_database(self.source, archive)
        self.assertEqual(metrics["memos"], 1)
        self.assertEqual(restore_database(archive, restored), metrics)
        self.assertEqual(verify_database(restored), metrics)
        self.assert_no_temporary_files()


if __name__ == "__main__":
    unittest.main()
