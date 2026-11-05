"""Logical-history and live-WAL recovery regression tests."""
import sqlite3
import tempfile
import unittest
from pathlib import Path

from app import Store
from maintenance import backup_database, restore_database, verify_database


class HistoryRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source.sqlite"
        self.store = Store(self.source)
        self.memo = self.store.create({"content": "Before edit"})
        self.store.update(self.memo["id"], {"version": 1, "content": "After edit"})

    def assert_recovery_refuses_source(self):
        with sqlite3.connect(self.source) as db:
            self.assertEqual(db.execute("PRAGMA integrity_check").fetchone(), ("ok",))
        for operation in (verify_database,):
            with self.assertRaisesRegex(ValueError, "invalid memo revision history"):
                operation(self.source)
        backup = self.root / "backup.sqlite"
        recovered = self.root / "recovered.sqlite"
        with self.assertRaisesRegex(ValueError, "invalid memo revision history"):
            backup_database(self.source, backup)
        with self.assertRaisesRegex(ValueError, "invalid memo revision history"):
            restore_database(self.source, recovered)
        self.assertFalse(backup.exists())
        self.assertFalse(recovered.exists())

    def test_orphaned_revision_rejected_before_backup(self):
        with sqlite3.connect(self.source) as db:
            db.execute(
                "INSERT INTO revisions VALUES (?,?,?,?,?)",
                ("missing-memo", 1, "Lost history", "Orphan", "2026-11-05T00:00:00Z"),
            )
        self.assert_recovery_refuses_source()

    def test_revision_at_or_above_current_version_rejected(self):
        with sqlite3.connect(self.source) as db:
            db.execute(
                "INSERT INTO revisions VALUES (?,?,?,?,?)",
                (self.memo["id"], 2, "Future", "Impossible", "2026-11-05T00:00:00Z"),
            )
        self.assert_recovery_refuses_source()

    def test_live_wal_transactions_are_preserved(self):
        destination = self.root / "online-backup.sqlite"
        # Keep a writer connection open with automatic WAL checkpoints disabled,
        # so the committed note still exists in the live WAL during backup.
        with sqlite3.connect(self.source) as writer:
            writer.execute("PRAGMA wal_autocheckpoint=0")
            writer.execute(
                "INSERT INTO memos VALUES (?,?,?,?,?,?,?,?,?,?)",
                ("uncheckpointed-note", "WAL note", "Committed WAL content",
                 "paper", 0, 0, 0, "2026-11-05T00:00:00Z",
                 "2026-11-05T00:00:00Z", 1),
            )
            writer.commit()
            self.assertTrue(Path(str(self.source) + "-wal").exists())
            metrics = backup_database(self.source, destination)
        self.assertEqual(metrics, {"integrity": "ok", "memos": 2, "revisions": 1})
        with sqlite3.connect(destination) as db:
            self.assertEqual(db.execute(
                "SELECT content FROM memos WHERE id = 'uncheckpointed-note'"
            ).fetchone(), ("Committed WAL content",))
        recovered = self.root / "restored.sqlite"
        self.assertEqual(restore_database(destination, recovered), metrics)
        self.assertEqual(verify_database(recovered), metrics)


if __name__ == "__main__":
    unittest.main()
