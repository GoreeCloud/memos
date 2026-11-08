"""A verification report must reflect one coherent SQLite/WAL snapshot."""
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app import Store
from maintenance import verify_database


class AfterFetch:
    def __init__(self, cursor, callback):
        self.cursor = cursor
        self.callback = callback

    def fetchone(self):
        row = self.cursor.fetchone()
        self.callback()
        return row


class ConnectionProxy:
    def __init__(self, connection, callback):
        self.connection = connection
        self.callback = callback

    def __enter__(self):
        self.connection.__enter__()
        return self

    def __exit__(self, *args):
        return self.connection.__exit__(*args)

    def execute(self, statement, *args):
        cursor = self.connection.execute(statement, *args)
        if statement == "SELECT count(*) FROM memos":
            return AfterFetch(cursor, self.callback)
        return cursor


class VerifySnapshotTests(unittest.TestCase):
    def test_concurrent_committed_update_does_not_mix_verification_counts(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "synthetic.sqlite"
            store = Store(source)
            original = store.create({"content": "Synthetic version one"})
            committed = []
            real_connect = sqlite3.connect

            def interleaved_write():
                # This fires AFTER fetching the memo count and BEFORE the
                # verifier asks for the revision count. On a WAL database,
                # a concurrent writer can commit while our read txn remains.
                self.assertEqual(committed, [])
                additional = store.create({"content": "New synthetic memo"})
                updated, error = store.update(original["id"], {
                    "version": 1, "content": "Synthetic version two"
                })
                self.assertIsNone(error)
                self.assertEqual(updated["version"], 2)
                committed.append(additional["id"])

            def connect(*args, **kwargs):
                raw = real_connect(*args, **kwargs)
                if kwargs.get("uri") and "mode=ro" in str(args[0]):
                    return ConnectionProxy(raw, interleaved_write)
                return raw

            with patch("maintenance.sqlite3.connect", side_effect=connect):
                before = verify_database(source)

            self.assertEqual(len(committed), 1)
            self.assertEqual(
                before, {"integrity": "ok", "memos": 1, "revisions": 0}
            )
            self.assertEqual(
                verify_database(source),
                {"integrity": "ok", "memos": 2, "revisions": 1},
            )
            self.assertEqual(len(store.revisions(original["id"])), 1)


if __name__ == "__main__":
    unittest.main()
