"""Non-destructive private SQLite database provisioning tests."""
import os
import tempfile
import unittest
from pathlib import Path

from app import Store
from private_storage import provision_private_database


@unittest.skipUnless(os.name == "posix", "POSIX permission tests")
class PrivateStorageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name) / "private"
        self.db = self.folder / "notes.sqlite"

    def test_private_creation_and_existing_database_preserved(self):
        self.assertTrue(provision_private_database(self.db))
        self.assertEqual(self.folder.stat().st_mode & 0o777, 0o700)
        self.assertEqual(self.db.stat().st_mode & 0o777, 0o600)
        memo = Store(self.db).create({"content": "Private test memo"})
        original_bytes = self.db.read_bytes()
        self.assertFalse(provision_private_database(self.db))
        self.assertEqual(self.db.read_bytes(), original_bytes)
        self.assertEqual(Store(self.db).get(memo["id"])["content"], "Private test memo")

    def test_refuses_existing_permissive_file_without_chmod(self):
        self.assertTrue(provision_private_database(self.db))
        self.db.chmod(0o644)
        with self.assertRaisesRegex(PermissionError, "owner-only"):
            provision_private_database(self.db)
        self.assertEqual(self.db.stat().st_mode & 0o777, 0o644)

    def test_refuses_existing_permissive_directory(self):
        self.folder.mkdir(mode=0o755)
        self.folder.chmod(0o755)
        with self.assertRaisesRegex(PermissionError, "directory must be owner-only"):
            provision_private_database(self.db)
        self.assertFalse(self.db.exists())

    def test_refuses_database_symlink_and_directory_symlink(self):
        outside = Path(self.temp.name) / "outside.sqlite"
        outside.write_bytes(b"external data")
        self.folder.mkdir(mode=0o700)
        self.db.symlink_to(outside)
        with self.assertRaisesRegex(ValueError, "file must not be a symlink"):
            provision_private_database(self.db)
        self.assertEqual(outside.read_bytes(), b"external data")
        self.db.unlink()
        other = Path(self.temp.name) / "other"
        other.mkdir(mode=0o700)
        self.folder.rmdir()
        self.folder.symlink_to(other, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "directory must not be a symlink"):
            provision_private_database(self.db)

    def test_existing_regular_file_is_never_overwritten(self):
        self.folder.mkdir(mode=0o700)
        self.db.write_bytes(b"operator-existing-data")
        self.db.chmod(0o600)
        self.assertFalse(provision_private_database(self.db))
        self.assertEqual(self.db.read_bytes(), b"operator-existing-data")


if __name__ == "__main__":
    unittest.main()
