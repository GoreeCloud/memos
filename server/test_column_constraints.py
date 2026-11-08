"""Structural recovery verification rejects altered SQLite column contracts."""
import sqlite3
import tempfile
import unittest
from pathlib import Path

from app import Store
from maintenance import backup_database, restore_database, verify_database


class SQLiteColumnConstraintTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.path = self.root / "synthetic.sqlite3"
        Store(self.path)

    def rebuild_with_changed_column(self, table, original, replacement):
        with sqlite3.connect(self.path) as db:
            sql = db.execute(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
                (table,),
            ).fetchone()[0]
            self.assertEqual(sql.count(original), 1)
            changed = sql.replace(original, replacement)
            db.execute('DROP TABLE "' + table + '"')
            db.execute(changed)
        with sqlite3.connect(self.path) as db:
            self.assertEqual(db.execute("PRAGMA integrity_check").fetchone(), ("ok",))

    def assert_refused_without_publishing(self, table):
        output = self.root / "backup.sqlite3"
        restored = self.root / "restored.sqlite3"
        expected = "Unexpected " + table + " column constraints"
        with self.assertRaisesRegex(ValueError, expected):
            verify_database(self.path)
        with self.assertRaisesRegex(ValueError, expected):
            backup_database(self.path, output)
        with self.assertRaisesRegex(ValueError, expected):
            restore_database(self.path, restored)
        self.assertFalse(output.exists())
        self.assertFalse(restored.exists())

    def test_missing_memo_content_not_null_is_rejected(self):
        self.rebuild_with_changed_column(
            "memos", "content TEXT NOT NULL", "content TEXT"
        )
        self.assert_refused_without_publishing("memos")

    def test_changed_memo_version_type_is_rejected(self):
        self.rebuild_with_changed_column(
            "memos", "version INTEGER NOT NULL", "version TEXT NOT NULL"
        )
        self.assert_refused_without_publishing("memos")

    def test_missing_revision_saved_at_not_null_is_rejected(self):
        self.rebuild_with_changed_column(
            "revisions", "saved_at TEXT NOT NULL", "saved_at TEXT"
        )
        self.assert_refused_without_publishing("revisions")

    def test_unmodified_canonical_schema_is_accepted(self):
        self.assertEqual(
            verify_database(self.path),
            {"integrity": "ok", "memos": 0, "revisions": 0},
        )


if __name__ == "__main__":
    unittest.main()
