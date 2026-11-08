"""Synthetic WAL backup/restore checks while another thread edits the source."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Event
from time import sleep
import unittest

from app import Store
from maintenance import backup_database, restore_database, verify_database


class ConcurrentWriteRecoveryTests(unittest.TestCase):
    def test_live_wal_snapshots_preserve_complete_revision_chains(self):
        with TemporaryDirectory(prefix="goreecloud-memos-concurrent-test-") as folder:
            base = Path(folder)
            source = base / "synthetic-source.sqlite3"
            store = Store(source)
            original = store.create({
                "title": "Synthetic data only",
                "content": "synthetic version 1",
            })
            started = Event()

            def writer():
                # Only this disposable database is mutated. Each write saves
                # the prior version in the same SQLite transaction.
                for version in range(2, 52):
                    updated, error = store.update(original["id"], {
                        "version": version - 1,
                        "content": "synthetic version " + str(version),
                    })
                    if error or updated["version"] != version:
                        raise AssertionError("Synthetic writer failed at version " + str(version))
                    if version == 2:
                        started.set()
                    sleep(0.008)
                return store.get(original["id"])["version"]

            with ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(writer)
                self.assertTrue(started.wait(timeout=6), "Synthetic writer did not start")
                # At least the first backup begins while the writer has more
                # commits scheduled. A precise commit/backup overlap is not
                # guaranteed by thread scheduling.
                self.assertFalse(future.done())
                snapshots = []
                for i in range(5):
                    backup = base / ("snapshot-" + str(i) + ".sqlite3")
                    restored = base / ("restored-" + str(i) + ".sqlite3")
                    metrics = backup_database(source, backup)
                    self.assertEqual(metrics, verify_database(backup))
                    self.assertEqual(metrics, restore_database(backup, restored))
                    self.assertEqual(metrics, verify_database(restored))
                    data = Store(restored).export_all()
                    self.assertEqual(len(data["memos"]), 1)
                    memo = data["memos"][0]
                    self.assertEqual(memo["id"], original["id"])
                    self.assertEqual(
                        memo["content"], "synthetic version " + str(memo["version"])
                    )
                    revisions = sorted(
                        data["revisions"], key=lambda item: item["version"]
                    )
                    self.assertEqual(
                        [r["version"] for r in revisions],
                        list(range(1, memo["version"])),
                    )
                    for revision in revisions:
                        self.assertEqual(
                            revision["content"],
                            "synthetic version " + str(revision["version"]),
                        )
                    self.assertEqual(metrics["memos"], 1)
                    self.assertEqual(metrics["revisions"], memo["version"] - 1)
                    snapshots.append(memo["version"])
                self.assertEqual(future.result(timeout=12), 51)

            # All recovered snapshots remain self-consistent even after the
            # original synthetic source advances to its final version.
            self.assertTrue(all(2 <= version <= 51 for version in snapshots))
            self.assertEqual(verify_database(source)["revisions"], 50)


if __name__ == "__main__":
    unittest.main()
