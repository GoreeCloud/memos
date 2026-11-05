"""Test that backup never misrepresents a missing revision as lossless history."""
import sqlite3
import tempfile
import unittest
from pathlib import Path

from app import Store
from maintenance import backup_database, restore_database, verify_database


class CompleteHistoryTests(unittest.TestCase):
    def setUp(self):
        self.work = tempfile.TemporaryDirectory()
        self.addCleanup(self.work.cleanup)
        self.root = Path(self.work.name)
        self.path = self.root / "notes.sqlite"
        self.store = Store(self.path)
        self.memo = self.store.create({"title": "Recovery test", "content": "Draft"})
        for version in (1, 2, 3):
            saved, error = self.store.update(
                self.memo["id"],
                {"version": version, "content": f"Updated revision {version}"},
            )
            self.assertIsNone(error)
            self.assertEqual(saved["version"], version + 1)

    def assert_rejects_incomplete_source(self):
        with sqlite3.connect(self.path) as db:
            self.assertEqual(db.execute("PRAGMA integrity_check").fetchone(), ("ok",))
        with self.assertRaisesRegex(ValueError, "Incomplete memo revision history"):
            verify_database(self.path)
        archive = self.root / "archive.sqlite"
        recovered = self.root / "recovered.sqlite"
        with self.assertRaisesRegex(ValueError, "Incomplete memo revision history"):
            backup_database(self.path, archive)
        with self.assertRaisesRegex(ValueError, "Incomplete memo revision history"):
            restore_database(self.path, recovered)
        self.assertFalse(archive.exists())
        self.assertFalse(recovered.exists())

    def test_first_revision_missing(self):
        with sqlite3.connect(self.path) as db:
            db.execute(
                "DELETE FROM revisions WHERE memo_id=? AND version=1",
                (self.memo["id"],),
            )
        self.assert_rejects_incomplete_source()

    def test_middle_revision_missing(self):
        with sqlite3.connect(self.path) as db:
            db.execute(
                "DELETE FROM revisions WHERE memo_id=? AND version=2",
                (self.memo["id"],),
            )
        self.assert_rejects_incomplete_source()

    def test_current_version_claims_more_history_than_exists(self):
        with sqlite3.connect(self.path) as db:
            db.execute(
                "UPDATE memos SET version=9 WHERE id=?",
                (self.memo["id"],),
            )
        self.assert_rejects_incomplete_source()

    def test_invalid_nonpositive_memo_version(self):
        with sqlite3.connect(self.path) as db:
            db.execute(
                "UPDATE memos SET version=0 WHERE id=?",
                (self.memo["id"],),
            )
            db.execute("DELETE FROM revisions WHERE memo_id=?", (self.memo["id"],))
        self.assert_rejects_incomplete_source()

    def test_valid_full_history_survives_backup_restore(self):
        expected = self.store.export_all()
        self.assertEqual(len(expected["revisions"]), 3)
        original_metrics = {"integrity": "ok", "memos": 1, "revisions": 3}
        self.assertEqual(verify_database(self.path), original_metrics)
        archive = self.root / "archive.sqlite"
        restored = self.root / "restored.sqlite"
        self.assertEqual(backup_database(self.path, archive), original_metrics)
        self.assertEqual(restore_database(archive, restored), original_metrics)
        self.assertEqual(verify_database(restored), original_metrics)
        recovered = Store(restored)
        self.assertEqual(
            [v["version"] for v in recovered.revisions(self.memo["id"])],
            [3, 2, 1],
        )
        self.assertEqual(
            recovered.get(self.memo["id"])["content"],
            "Updated revision 3",
        )


if __name__ == "__main__":
    unittest.main()
