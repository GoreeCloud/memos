"""Do not accept structurally unprotected history as a lossless SQLite backup."""
import sqlite3
import tempfile
import unittest
from pathlib import Path

from app import Store
from maintenance import backup_database, restore_database, verify_database


MEMO_COLUMNS = (
    "id TEXT, title TEXT NOT NULL, content TEXT NOT NULL, "
    "color TEXT NOT NULL, pinned INTEGER NOT NULL, archived INTEGER NOT NULL, "
    "deleted INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, "
    "version INTEGER NOT NULL"
)
REVISION_COLUMNS = (
    "memo_id TEXT NOT NULL, version INTEGER NOT NULL, "
    "title TEXT NOT NULL, content TEXT NOT NULL, saved_at TEXT NOT NULL"
)


class RecoveryPrimaryKeyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.source = self.directory / "notes.sqlite"
        self.store = Store(self.source)
        self.memo = self.store.create({"content": "First private version"})
        after, error = self.store.update(self.memo["id"], {
            "version": 1, "content": "Second private version"
        })
        self.assertIsNone(error)
        self.assertEqual(after["version"], 2)

    def reject_before_output(self, reason):
        with sqlite3.connect(self.source) as db:
            self.assertEqual(db.execute("PRAGMA integrity_check").fetchone(), ("ok",))
        with self.assertRaisesRegex(ValueError, reason):
            verify_database(self.source)
        backup = self.directory / "backup.sqlite"
        restored = self.directory / "restored.sqlite"
        with self.assertRaisesRegex(ValueError, reason):
            backup_database(self.source, backup)
        with self.assertRaisesRegex(ValueError, reason):
            restore_database(self.source, restored)
        self.assertFalse(backup.exists())
        self.assertFalse(restored.exists())

    def test_missing_memo_primary_key_is_refused(self):
        with sqlite3.connect(self.source) as db:
            db.execute("DROP TABLE memos")
            db.execute(f"CREATE TABLE memos ({MEMO_COLUMNS})")
        self.reject_before_output("Unexpected memos primary key")

    def test_missing_revision_composite_primary_key_is_refused(self):
        with sqlite3.connect(self.source) as db:
            db.execute("DROP TABLE revisions")
            db.execute(f"CREATE TABLE revisions ({REVISION_COLUMNS})")
            row = (self.memo["id"], 1, "", "Duplicate history",
                   "2026-11-05T00:00:00Z")
            db.execute("INSERT INTO revisions VALUES (?,?,?,?,?)", row)
            db.execute("INSERT INTO revisions VALUES (?,?,?,?,?)", row)
        self.reject_before_output("Unexpected revisions primary key")

    def test_wrong_revision_key_order_is_refused(self):
        with sqlite3.connect(self.source) as db:
            db.execute("DROP TABLE revisions")
            db.execute(
                f"CREATE TABLE revisions ({REVISION_COLUMNS}, "
                "PRIMARY KEY(version, memo_id))"
            )
        self.reject_before_output("Unexpected revisions primary key")

    def test_correct_keys_and_complete_history_allow_round_trip(self):
        expected = {"integrity": "ok", "memos": 1, "revisions": 1}
        self.assertEqual(verify_database(self.source), expected)
        backup = self.directory / "backup.sqlite"
        restored = self.directory / "restored.sqlite"
        self.assertEqual(backup_database(self.source, backup), expected)
        self.assertEqual(restore_database(backup, restored), expected)
        self.assertEqual(verify_database(restored), expected)


if __name__ == "__main__":
    unittest.main()
