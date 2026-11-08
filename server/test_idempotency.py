"""Atomic create-idempotency regressions; synthetic memos on disposable SQLite only."""
import concurrent.futures
import json
import sqlite3
import tempfile
import threading
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from app import Store, create_server
from maintenance import backup_database, restore_database, verify_database

TOKEN = "synthetic-memos-idempotency-tests-only-2026"


class IdempotencyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="memos-idempotency-")
        self.db = Path(self.temp.name) / "store.sqlite"
        self.server = create_server("127.0.0.1", 0, self.db, TOKEN)
        self.root = f"http://127.0.0.1:{self.server.server_port}"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=3)
        self.temp.cleanup()

    def request(self, payload, key=None, path="/api/v1/memos", token=TOKEN):
        headers = {"Authorization": "Bearer " + token,
                   "Content-Type": "application/json"}
        if key is not None:
            headers["Idempotency-Key"] = key
        req = Request(self.root + path, method="POST", headers=headers,
                      data=json.dumps(payload).encode())
        try:
            with urlopen(req, timeout=15) as response:
                return response.status, json.loads(response.read())
        except HTTPError as exc:
            return exc.code, json.loads(exc.read())

    def count(self):
        with sqlite3.connect(self.db) as db:
            return db.execute("SELECT COUNT(*) FROM memos").fetchone()[0]

    def test_replay_and_payload_conflict(self):
        key = str(uuid.uuid4())
        payload = {"content": "Fictional memo #idempotency"}
        initial, first = self.request(payload, key)
        repeated, second = self.request(payload, key)
        self.assertEqual((initial, repeated), (201, 200))
        self.assertEqual(first["id"], second["id"])
        self.assertEqual(self.count(), 1)
        rejected, message = self.request({"content": "Different fictional body"}, key)
        self.assertEqual(rejected, 409)
        self.assertIn("Idempotency-Key", message["error"])
        self.assertEqual(self.count(), 1)

    def test_legacy_and_invalid_keys(self):
        self.assertEqual(self.request({"content": "Legacy request"})[0], 201)
        self.assertEqual(self.request({"content": "Legacy request"})[0], 201)
        for key in ("not-random", str(uuid.uuid1()), str(uuid.uuid4()).upper(),
                    str(uuid.uuid4()) + ",another"):
            self.assertEqual(self.request({"content": "Rejected"}, key)[0], 400)
        self.assertEqual(self.count(), 2)
        self.assertEqual(self.request({"content": "Cannot authenticate"},
                                      str(uuid.uuid4()), token="wrong")[0], 401)

    def test_concurrent_retries_commit_once(self):
        key = str(uuid.uuid4())
        payload = {"title": "Only one", "content": "Many simultaneous writers"}
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
            results = list(pool.map(lambda _: self.request(payload, key), range(24)))
        self.assertEqual(sum(status == 201 for status, _ in results), 1)
        self.assertEqual(sum(status == 200 for status, _ in results), 23)
        self.assertEqual(len({memo["id"] for _, memo in results}), 1)
        self.assertEqual(self.count(), 1)

    def test_ledger_survives_restart_backup_and_restore(self):
        key = str(uuid.uuid4())
        payload = {"content": "A portable fictional note"}
        self.assertEqual(self.request(payload, key)[0], 201)
        snapshot = Path(self.temp.name) / "snapshot.sqlite"
        self.assertEqual(backup_database(self.db, snapshot)["memos"], 1)
        recovered = Path(self.temp.name) / "restored.sqlite"
        self.assertEqual(restore_database(snapshot, recovered)["memos"], 1)
        self.assertEqual(verify_database(recovered)["integrity"], "ok")
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=3)
        self.server = create_server("127.0.0.1", 0, recovered, TOKEN)
        self.root = f"http://127.0.0.1:{self.server.server_port}"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.assertEqual(self.request(payload, key)[0], 200)
        with sqlite3.connect(recovered) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM memos").fetchone()[0], 1)

    def test_existing_preledger_sqlite_is_accepted_and_upgraded_in_place(self):
        # Old private databases had exactly the memos + revisions tables.
        with sqlite3.connect(self.db) as db:
            db.execute("DROP TABLE memo_create_requests")
            db.commit()
        self.assertEqual(verify_database(self.db)["integrity"], "ok")
        Store(self.db)  # normal non-destructive startup migration
        key = str(uuid.uuid4())
        self.assertEqual(self.request({"content": "Old local DB"}, key)[0], 201)
        self.assertEqual(self.request({"content": "Old local DB"}, key)[0], 200)
        self.assertEqual(self.count(), 1)
        self.assertEqual(verify_database(self.db)["integrity"], "ok")

    def test_replay_returns_current_memo_not_a_frozen_version(self):
        key = str(uuid.uuid4())
        body = {"content": "Original fictional text"}
        status, memo = self.request(body, key)
        self.assertEqual(status, 201)
        with sqlite3.connect(self.db) as db:
            db.execute("UPDATE memos SET title=?,version=? WHERE id=?",
                       ("Updated elsewhere", 2, memo["id"]))
            db.execute("INSERT INTO revisions VALUES (?,?,?,?,?)",
                       (memo["id"], 1, "", body["content"],
                        datetime.now(timezone.utc).isoformat(timespec="milliseconds")))
            db.commit()
        replay_status, result = self.request(body, key)
        self.assertEqual(replay_status, 200)
        self.assertEqual(result["id"], memo["id"])
        self.assertEqual(result["title"], "Updated elsewhere")
        self.assertEqual(result["version"], 2)
        self.assertEqual(self.count(), 1)

    def test_expired_key_can_be_used_again_after_seven_days(self):
        key = str(uuid.uuid4())
        payload = {"content": "Retention window"}
        self.assertEqual(self.request(payload, key)[0], 201)
        expired = (datetime.now(timezone.utc) - timedelta(days=8)).isoformat(
            timespec="milliseconds")
        with sqlite3.connect(self.db) as db:
            db.execute("UPDATE memo_create_requests SET created_at=?", (expired,))
            db.commit()
        self.assertEqual(self.request(payload, key)[0], 201)
        self.assertEqual(self.count(), 2)

    def test_recovery_fails_closed_on_orphaned_or_malformed_ledger(self):
        key = str(uuid.uuid4())
        self.assertEqual(self.request({"content": "Ledger checks"}, key)[0], 201)
        with sqlite3.connect(self.db) as db:
            db.execute("UPDATE memo_create_requests SET memo_id=?",
                       ("00000000-0000-4000-8000-999999999999",))
            db.commit()
        with self.assertRaisesRegex(ValueError, "request ledger"):
            verify_database(self.db)


    def test_duplicate_keyed_concurrent_retries_create_only_one_copy(self):
        _, original = self.request({"title": "Original #work", "content": "Sample"})
        path = "/api/v1/memos/" + original["id"] + "/duplicate"
        key = str(uuid.uuid4())
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
            results = list(pool.map(lambda _: self.request({}, key, path), range(18)))
        self.assertEqual(sum(code == 201 for code, _ in results), 1)
        self.assertEqual(sum(code == 200 for code, _ in results), 17)
        self.assertEqual(len({memo["id"] for _, memo in results}), 1)
        self.assertNotEqual(results[0][1]["id"], original["id"])
        self.assertEqual(results[0][1]["title"], original["title"])
        self.assertEqual(self.count(), 2)

    def test_duplicate_key_scoped_to_source_and_validates_body(self):
        _, first = self.request({"content": "Source A"})
        _, second = self.request({"content": "Source B"})
        shared = str(uuid.uuid4())
        path_a = "/api/v1/memos/" + first["id"] + "/duplicate"
        path_b = "/api/v1/memos/" + second["id"] + "/duplicate"
        code_a, duplicate_a = self.request({}, shared, path_a)
        code_b, duplicate_b = self.request({}, shared, path_b)
        self.assertEqual((code_a, code_b), (201, 201))
        self.assertNotEqual(duplicate_a["id"], duplicate_b["id"])
        self.assertEqual(self.request({"ignored": True}, str(uuid.uuid4()), path_a)[0], 400)
        self.assertEqual(self.request({}, "invalid-key", path_a)[0], 400)
        self.assertEqual(self.count(), 4)

    def test_duplicate_replay_survives_source_changes_and_sqlite_recovery(self):
        _, source = self.request({"title": "Original", "content": "Old version"})
        path = "/api/v1/memos/" + source["id"] + "/duplicate"
        key = str(uuid.uuid4())
        status, copied = self.request({}, key, path)
        self.assertEqual(status, 201)
        with sqlite3.connect(self.db) as db:
            # Simulate source metadata changing after its copy was committed.
            db.execute("UPDATE memos SET deleted=1 WHERE id=?", (source["id"],))
            db.commit()
        self.assertEqual(self.request({}, key, path)[0], 200)
        self.assertEqual(self.request({}, str(uuid.uuid4()), path)[0], 404)
        archive = Path(self.temp.name) / "duplicate-snapshot.sqlite"
        self.assertEqual(backup_database(self.db, archive)["memos"], 2)
        restored = Path(self.temp.name) / "duplicate-restored.sqlite"
        self.assertEqual(restore_database(archive, restored)["memos"], 2)
        self.assertEqual(verify_database(restored)["integrity"], "ok")
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=3)
        self.server = create_server("127.0.0.1", 0, restored, TOKEN)
        self.root = f"http://127.0.0.1:{self.server.server_port}"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        status, replay = self.request({}, key, path)
        self.assertEqual(status, 200)
        self.assertEqual(replay["id"], copied["id"])
        with sqlite3.connect(restored) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM memos").fetchone()[0], 2)


if __name__ == "__main__":
    unittest.main()
