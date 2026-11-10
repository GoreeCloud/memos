"""Lossless export, consistent live backup and non-overwriting restore tests."""
import sqlite3
import tempfile
import unittest
from pathlib import Path

from app import Store
from maintenance import backup_database, restore_database, verify_database


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name)
        self.source = self.path / "source.sqlite"
        self.store = Store(self.source)

    def tearDown(self):
        self.temp.cleanup()

    def test_backup_and_restore_include_revisions(self):
        original = self.store.create({"title": "Diary", "content": "Private entry #journal"})
        updated, err = self.store.update(original["id"], {
            "version": 1, "content": "Updated with notes #journal"})
        self.assertIsNone(err)
        expected = self.store.export_all()
        self.assertEqual(len(expected["memos"]), 1)
        self.assertEqual(len(expected["revisions"]), 1)
        backup = self.path / "archive.sqlite"
        metrics = backup_database(self.source, backup)
        self.assertEqual(metrics, {"integrity": "ok", "memos": 1, "revisions": 1})
        self.assertEqual(backup.stat().st_mode & 0o777, 0o600)
        self.store.create({"content": "Created after backup"})
        restored = self.path / "restored.sqlite"
        self.assertEqual(restore_database(backup, restored)["memos"], 1)
        clone = Store(restored)
        self.assertEqual(len(clone.list("all")), 1)
        self.assertEqual(len(clone.revisions(original["id"])), 1)
        self.assertEqual(clone.get(original["id"])["content"], updated["content"])

    def test_never_overwrite_existing_destination(self):
        target = self.path / "existing.sqlite"
        target.write_bytes(b"untouched")
        self.store.create({"content": "Hello"})
        with self.assertRaises(FileExistsError):
            backup_database(self.source, target)
        with self.assertRaises(FileExistsError):
            restore_database(self.source, target)
        self.assertEqual(target.read_bytes(), b"untouched")

    def test_backup_and_restore_reject_linked_destination_ancestors(self):
        created = self.store.create({"title": "Synthetic", "content": "Private recovery"})
        outside = self.path / "private-target"
        outside.mkdir(mode=0o700)
        alias = self.path / "linked-parent"
        alias.symlink_to(outside, target_is_directory=True)
        sentinel = outside / "do-not-edit.txt"
        sentinel.write_text("untouched", encoding="utf-8")

        for operation, source, name in (
            (backup_database, self.source, "backup.sqlite"),
            (restore_database, self.source, "restored.sqlite"),
        ):
            with self.subTest(operation=operation.__name__):
                with self.assertRaisesRegex(ValueError, "ancestry.*real directories"):
                    operation(source, alias / name)
                self.assertFalse((outside / name).exists())
                self.assertEqual(sentinel.read_text(encoding="utf-8"), "untouched")
                self.assertEqual(sorted(x.name for x in outside.iterdir()),
                                 ["do-not-edit.txt"])

        # A legitimate private nested destination still restores all records.
        private = self.path / "safe" / "nested"
        private.mkdir(mode=0o700, parents=True)
        backup = private / "verified.sqlite"
        self.assertEqual(backup_database(self.source, backup)["memos"], 1)
        recovered = private / "restored.sqlite"
        self.assertEqual(restore_database(backup, recovered)["memos"], 1)
        from maintenance import verify_database
        self.assertEqual(verify_database(recovered)["memos"], 1)
        self.assertEqual(Store(recovered).get(created["id"])["content"],
                         "Private recovery")

    def test_non_directory_ancestor_and_dangling_destination_link_fail_closed(self):
        regular = self.path / "regular-file"
        regular.write_text("preserve", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "ancestry.*real directories"):
            backup_database(self.source, regular / "database.sqlite")
        self.assertEqual(regular.read_text(encoding="utf-8"), "preserve")

        missing = self.path / "no-such-target"
        dangling = self.path / "dangling.sqlite"
        dangling.symlink_to(missing)
        with self.assertRaises(FileExistsError):
            restore_database(self.source, dangling)
        self.assertTrue(dangling.is_symlink())
        self.assertFalse(missing.exists())

    def test_reject_invalid_source(self):
        path = self.path / "invalid.sqlite"
        path.write_bytes(b"not a sqlite database")
        with self.assertRaises((ValueError, sqlite3.DatabaseError)):
            verify_database(path)
        with self.assertRaises((ValueError, sqlite3.DatabaseError)):
            restore_database(path, self.path / "new.sqlite")
        self.assertFalse((self.path / "new.sqlite").exists())

    def test_full_json_export_has_no_feed_limit(self):
        # Use a transaction instead of thousands of HTTP requests.
        count = 2005
        rows = [(f"{i:036d}", "", f"note {i}" + (" #older" if i == count - 1 else ""), "paper", 0, 0, 0,
                 "2026-11-05T00:00:00Z", "2026-11-05T00:00:00Z", 1)
                for i in range(count)]
        with self.store.connect() as db:
            db.executemany("INSERT INTO memos VALUES (?,?,?,?,?,?,?,?,?,?)", rows)
        self.assertEqual(len(self.store.list("all")), 2000)
        self.assertEqual(len(self.store.list("all", tag="older")), 1)
        export = self.store.export_all()
        self.assertEqual(export["format"], "goreecloud-memos-v2")
        self.assertEqual(len(export["memos"]), count)
        self.assertEqual(export["revisions"], [])


if __name__ == "__main__":
    unittest.main()
