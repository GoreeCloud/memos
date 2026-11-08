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

from app import create_server
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


if __name__ == "__main__":
    unittest.main()
