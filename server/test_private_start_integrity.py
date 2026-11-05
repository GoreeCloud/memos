"""Reject invalid existing Memos data before the private launcher initializes schema."""
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

from app import Store
from private_storage import provision_private_database
from serve_private import create_private_server


TOKEN = "existing-database-checks-require-a-test-token"


@unittest.skipUnless(os.name == "posix", "POSIX private launcher tests")
class ExistingDatabaseStartupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name) / "private"
        self.database = self.directory / "memos.sqlite3"
        self.assertTrue(provision_private_database(self.database))

    def new_memo_with_history(self):
        store = Store(self.database)
        memo = store.create({"content": "Private original"})
        updated, err = store.update(
            memo["id"], {"version": 1, "content": "Updated safely"}
        )
        self.assertIsNone(err)
        self.assertEqual(updated["version"], 2)
        return memo["id"]

    def assert_start_refused(self):
        with self.assertRaisesRegex(
            ValueError, "Existing Memos database failed integrity/history validation"
        ):
            create_private_server(self.database, 0, TOKEN)

    def test_valid_existing_database_with_history_starts(self):
        memo_id = self.new_memo_with_history()
        server = create_private_server(self.database, 0, TOKEN)
        try:
            self.assertEqual(server.server_address[0], "127.0.0.1")
            self.assertEqual(Store(self.database).get(memo_id)["version"], 2)
            self.assertEqual(len(Store(self.database).revisions(memo_id)), 1)
        finally:
            server.server_close()

    def test_missing_revisions_table_refused_without_recreating_table(self):
        memo_id = self.new_memo_with_history()
        with sqlite3.connect(self.database) as db:
            db.execute("DROP TABLE revisions")
        self.assert_start_refused()
        with sqlite3.connect(self.database) as db:
            names = {r[0] for r in db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )}
            self.assertIn("memos", names)
            self.assertNotIn("revisions", names)
            self.assertEqual(
                db.execute("SELECT content FROM memos WHERE id=?", (memo_id,)).fetchone(),
                ("Updated safely",),
            )

    def test_missing_history_refused_without_changes(self):
        memo_id = self.new_memo_with_history()
        with sqlite3.connect(self.database) as db:
            db.execute("DELETE FROM revisions WHERE memo_id=?", (memo_id,))
        self.assert_start_refused()
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute(
                "SELECT version FROM memos WHERE id=?", (memo_id,)
            ).fetchone(), (2,))
            self.assertEqual(db.execute("SELECT COUNT(*) FROM revisions").fetchone(), (0,))

    def test_corrupt_database_file_refused_without_overwrite(self):
        original = b"not a sqlite database; keep for operator inspection"
        self.database.write_bytes(original)
        self.assert_start_refused()
        self.assertEqual(self.database.read_bytes(), original)
        self.assertEqual(self.database.stat().st_mode & 0o777, 0o600)

    def test_precreated_empty_file_is_not_silently_initialized(self):
        self.assertEqual(self.database.stat().st_size, 0)
        self.assert_start_refused()
        self.assertEqual(self.database.stat().st_size, 0)


if __name__ == "__main__":
    unittest.main()
