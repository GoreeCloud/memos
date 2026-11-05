"""Regression tests for revision-schema validation before backups or recovery."""
import sqlite3
import tempfile
import unittest
from pathlib import Path

from app import Store
from maintenance import backup_database, restore_database, verify_database


class RevisionSchemaTests(unittest.TestCase):
    def test_rejects_incomplete_revision_schema_without_publishing_files(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "source.sqlite"
            store = Store(source)
            memo = store.create({"content": "Revision recovery matters"})
            store.update(memo["id"], {"version": 1, "content": "Revised"})
            self.assertEqual(verify_database(source)["revisions"], 1)

            # A database can pass PRAGMA integrity_check but still have a
            # revisions table with unexpected columns after a bad migration.
            with sqlite3.connect(source) as db:
                db.execute("DROP TABLE revisions")
                db.execute("CREATE TABLE revisions (memo_id TEXT, version INTEGER)")
                self.assertEqual(db.execute("PRAGMA integrity_check").fetchone(), ("ok",))

            with self.assertRaisesRegex(ValueError, "revisions table schema"):
                verify_database(source)
            backup = Path(folder) / "backup.sqlite"
            restored = Path(folder) / "restored.sqlite"
            with self.assertRaisesRegex(ValueError, "revisions table schema"):
                backup_database(source, backup)
            with self.assertRaisesRegex(ValueError, "revisions table schema"):
                restore_database(source, restored)
            self.assertFalse(backup.exists())
            self.assertFalse(restored.exists())


if __name__ == "__main__":
    unittest.main()
