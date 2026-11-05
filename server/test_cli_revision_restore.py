"""Revision restoration is version-guarded, non-destructive to history, and opt-in."""
import importlib.util
import json
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

from app import Store, create_server


ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("memos_cli_revisions", ROOT / "cli" / "memos.py")
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)

TOKEN = "test-restore-revision-token-more-than-24-characters"
MEMO_ID = "123e4567-e89b-12d3-a456-426614174000"
PATH = "/api/v1/memos/" + MEMO_ID


class RestoreRevisionTests(unittest.TestCase):
    def test_restore_sends_only_text_title_and_current_version(self):
        current = {"id": MEMO_ID, "title": "Newest", "content": "Newest text",
                   "version": 4, "color": "rose", "pinned": True, "archived": True}
        history = [{"version": 1, "title": "Original", "content": "Original text"},
                   {"version": 2, "title": "Intermediate", "content": "Second text"}]
        response = {**current, "title": "Original", "content": "Original text",
                    "version": 5}
        with patch.object(cli, "request", side_effect=[current, history, response]) as mocked:
            result = cli.restore_revision("http://127.0.0.1:8765", TOKEN, MEMO_ID, 1)
        self.assertEqual(result, response)
        self.assertEqual(mocked.call_count, 3)
        self.assertEqual(mocked.call_args_list[0].args[2], PATH)
        self.assertEqual(mocked.call_args_list[1].args[2], PATH + "/revisions")
        self.assertEqual(mocked.call_args_list[2].args[2:], (
            PATH, "PATCH", {"version": 4, "title": "Original", "content": "Original text"}
        ))

    def test_nonpositive_or_noninteger_revision_refused_before_network(self):
        for version in (0, -1, True, 1.5, "1", None):
            with self.subTest(version=version):
                with patch.object(cli, "request") as req:
                    with self.assertRaisesRegex(ValueError, "positive integer"):
                        cli.restore_revision("http://127.0.0.1:8765",
                                             TOKEN, MEMO_ID, version)
                    req.assert_not_called()

    def test_malformed_memo_id_refused_before_network(self):
        for memo_id in ("../export", MEMO_ID.upper(), MEMO_ID + "/revisions", ""):
            with self.subTest(memo_id=memo_id):
                with patch.object(cli, "request") as req:
                    with self.assertRaisesRegex(ValueError, "canonical lowercase memo UUID"):
                        cli.restore_revision("http://127.0.0.1:8765",
                                             TOKEN, memo_id, 1)
                    req.assert_not_called()

    def test_current_or_future_version_refused_before_history_query(self):
        with patch.object(cli, "request", return_value={"version": 3}) as req:
            with self.assertRaisesRegex(ValueError, "prior revision"):
                cli.restore_revision("http://127.0.0.1:8765", TOKEN, MEMO_ID, 3)
            self.assertEqual(req.call_count, 1)

    def test_missing_revision_refused_without_write(self):
        with patch.object(cli, "request", side_effect=[
            {"version": 4}, [{"version": 1, "title": "A", "content": "B"}]
        ]) as req:
            with self.assertRaisesRegex(ValueError, "does not exist"):
                cli.restore_revision("http://127.0.0.1:8765", TOKEN, MEMO_ID, 2)
            self.assertEqual(req.call_count, 2)

    def test_version_conflict_propagates_without_retry(self):
        current = {"version": 2}
        old = [{"version": 1, "title": "Earlier", "content": "Earlier body"}]
        with patch.object(cli, "request", side_effect=[
            current, old, RuntimeError("Version conflict (409)")
        ]) as req:
            with self.assertRaisesRegex(RuntimeError, "409"):
                cli.restore_revision("http://127.0.0.1:8765", TOKEN, MEMO_ID, 1)
            self.assertEqual(req.call_count, 3)

    def test_live_api_restore_produces_new_version_and_preserves_history(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "notes.sqlite"
            store = Store(db)
            original = store.create({
                "title": "Initial", "content": "Private initial memo",
                "pinned": True, "color": "mint",
            })
            updated, err = store.update(original["id"], {
                "version": 1, "title": "Later", "content": "Latest note",
                "archived": True,
            })
            self.assertIsNone(err)
            self.assertEqual(updated["version"], 2)
            server = create_server("127.0.0.1", 0, db, TOKEN)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                root = "http://127.0.0.1:{}".format(server.server_port)
                restored = cli.restore_revision(root, TOKEN, original["id"], 1)
                self.assertEqual(restored["version"], 3)
                self.assertEqual(restored["title"], original["title"])
                self.assertEqual(restored["content"], original["content"])
                self.assertTrue(restored["archived"])
                self.assertTrue(restored["pinned"])
                self.assertEqual(restored["color"], "mint")
                history = cli.request(root, TOKEN,
                                      cli.memo_path(original["id"]) + "/revisions")
                self.assertEqual([r["version"] for r in history], [2, 1])
                self.assertEqual(history[0]["content"], "Latest note")
                self.assertEqual(history[1]["content"], "Private initial memo")
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
