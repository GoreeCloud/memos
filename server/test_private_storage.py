"""Non-destructive private SQLite database provisioning tests."""
import os
import sqlite3
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

    def test_store_connections_close_deterministically_on_success_and_error(self):
        self.assertTrue(provision_private_database(self.db))
        store = Store(self.db)
        with store.connect() as db:
            self.assertEqual(db.execute("SELECT 1").fetchone()[0], 1)
        with self.assertRaises(sqlite3.ProgrammingError):
            db.execute("SELECT 1")
        try:
            with store.connect() as failed:
                self.assertEqual(failed.execute("SELECT 1").fetchone()[0], 1)
                raise RuntimeError("synthetic operation failure")
        except RuntimeError:
            pass
        with self.assertRaises(sqlite3.ProgrammingError):
            failed.execute("SELECT 1")
        item = store.create({"content": "Committed and closed"})
        self.assertEqual(Store(self.db).get(item["id"])["content"],
                         "Committed and closed")

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

    def test_new_intermediate_parents_all_have_private_modes(self):
        deep = Path(self.temp.name) / "new" / "nested" / "private"
        target = deep / "notes.sqlite"
        self.assertTrue(provision_private_database(target))
        for directory in (deep.parent.parent, deep.parent, deep):
            with self.subTest(directory=str(directory)):
                self.assertEqual(directory.stat().st_mode & 0o777, 0o700)
        self.assertEqual(target.stat().st_mode & 0o777, 0o600)

    def test_refuses_symlink_in_ancestor_without_writing_to_target(self):
        outside = Path(self.temp.name) / "outside"
        outside.mkdir(mode=0o700)
        marker = outside / "operator-file"
        marker.write_text("preserve me", encoding="utf-8")
        redirect = Path(self.temp.name) / "redirect"
        redirect.symlink_to(outside, target_is_directory=True)
        target = redirect / "private" / "notes.sqlite"
        with self.assertRaisesRegex(ValueError, "directory must not be a symlink"):
            provision_private_database(target)
        self.assertFalse((outside / "private").exists())
        self.assertEqual(marker.read_text(encoding="utf-8"), "preserve me")

    def test_refuses_dangling_ancestor_symlink(self):
        redirect = Path(self.temp.name) / "dangling"
        redirect.symlink_to(Path(self.temp.name) / "not-present", target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "directory must not be a symlink"):
            provision_private_database(redirect / "private" / "notes.sqlite")
        self.assertFalse((Path(self.temp.name) / "not-present").exists())

    def test_refuses_parent_directory_traversal(self):
        target = self.folder / ".." / "outside.sqlite"
        with self.assertRaisesRegex(ValueError, "parent-directory traversal"):
            provision_private_database(target)
        self.assertFalse((Path(self.temp.name) / "outside.sqlite").exists())
        self.assertFalse(self.folder.exists())

    def test_refuses_regular_file_as_intermediate_component(self):
        marker = Path(self.temp.name) / "file-component"
        marker.write_text("operator-existing-data", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "component must be a directory"):
            provision_private_database(marker / "private" / "notes.sqlite")
        self.assertEqual(marker.read_text(encoding="utf-8"), "operator-existing-data")


if __name__ == "__main__":
    unittest.main()
