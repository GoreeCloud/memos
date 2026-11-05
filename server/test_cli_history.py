"""Read-only CLI memo inspection and canonical ID validation regression tests."""
import contextlib
import importlib.util
import io
import json
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

from app import Store, create_server


ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("memos_cli_history", ROOT / "cli" / "memos.py")
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)

TOKEN = "cli-readonly-history-test-token-at-least-24"
MEMO_ID = "123e4567-e89b-12d3-a456-426614174000"


class CLIInspectionTests(unittest.TestCase):
    def run_cli(self, *args, reply):
        stdout = io.StringIO()
        with patch.dict(os.environ, {"GOREE_MEMOS_TOKEN": TOKEN}):
            with patch.object(sys, "argv", ["memos.py", *args]):
                with patch.object(cli, "request", return_value=reply) as request_mock:
                    with contextlib.redirect_stdout(stdout):
                        cli.main()
        return json.loads(stdout.getvalue()), request_mock.call_args_list

    def test_canonical_uuid_path(self):
        self.assertEqual(cli.memo_path(MEMO_ID), "/api/v1/memos/" + MEMO_ID)

    def test_invalid_ids_rejected_before_network_request(self):
        bad = ("", "nonsense", "../export", "../../api/v1/export",
               "123e4567e89b12d3a456426614174000",
               MEMO_ID.upper(), MEMO_ID + "/revisions", MEMO_ID + "?q=token",
               "{"+MEMO_ID+"}", "%2f", "a" * 36)
        for command in ("show", "history", "update"):
            for memo_id in bad:
                with self.subTest(command=command, memo_id=memo_id):
                    with patch.dict(os.environ, {"GOREE_MEMOS_TOKEN": TOKEN}):
                        with patch.object(sys, "argv", ["memos.py", command, memo_id]):
                            with patch.object(cli, "request") as request_mock:
                                with contextlib.redirect_stderr(io.StringIO()):
                                    with self.assertRaises(SystemExit) as failure:
                                        cli.main()
                        self.assertEqual(failure.exception.code, 1)
                        request_mock.assert_not_called()

    def test_show_uses_only_single_memo_endpoint(self):
        memo = {"id": MEMO_ID, "title": "One private note", "version": 4}
        result, calls = self.run_cli("show", MEMO_ID, reply=memo)
        self.assertEqual(result, memo)
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0].args[2], "/api/v1/memos/" + MEMO_ID)

    def test_history_reads_only_named_memo(self):
        history = [{"memo_id": MEMO_ID, "version": 1, "content": "Original"},
                   {"memo_id": MEMO_ID, "version": 2, "content": "Updated"}]
        result, calls = self.run_cli("history", MEMO_ID, reply=history)
        self.assertEqual(result, history)
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0].args[2], "/api/v1/memos/" + MEMO_ID + "/revisions")

    def test_update_keeps_version_guard_and_checked_path(self):
        old = {"id": MEMO_ID, "version": 3, "title": "Before", "content": "Before"}
        result = {"id": MEMO_ID, "version": 4, "title": "After"}
        with patch.dict(os.environ, {"GOREE_MEMOS_TOKEN": TOKEN}):
            with patch.object(sys, "argv", ["memos.py", "update", MEMO_ID,
                                           "--title", "After"]):
                with patch.object(cli, "request", side_effect=[old, result]) as mocked:
                    with contextlib.redirect_stdout(io.StringIO()):
                        cli.main()
        self.assertEqual(mocked.call_count, 2)
        self.assertEqual(mocked.call_args_list[0].args[2], "/api/v1/memos/" + MEMO_ID)
        self.assertEqual(mocked.call_args_list[1].args[2], "/api/v1/memos/" + MEMO_ID)
        self.assertEqual(mocked.call_args_list[1].args[3], "PATCH")
        self.assertEqual(mocked.call_args_list[1].args[4], {"version": 3, "title": "After"})

    def test_live_local_api_show_and_history_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "memos.sqlite3"
            store = Store(path)
            memo = store.create({"title": "Journal", "content": "First secret"})
            updated, error = store.update(memo["id"], {
                "version": 1, "content": "Second secret"
            })
            self.assertIsNone(error)
            server = create_server("127.0.0.1", 0, path, TOKEN)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                base = "http://127.0.0.1:" + str(server.server_port)
                shown = cli.request(base, TOKEN, cli.memo_path(memo["id"]))
                self.assertEqual(shown["content"], updated["content"])
                history = cli.request(base, TOKEN,
                                      cli.memo_path(memo["id"]) + "/revisions")
                self.assertEqual(len(history), 1)
                self.assertEqual(history[0]["content"], "First secret")
                self.assertEqual(history[0]["version"], 1)
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
