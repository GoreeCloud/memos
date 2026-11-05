"""Hashtag filtering and duplicate memo command regression coverage."""
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
from urllib.parse import parse_qs, urlsplit

from app import Store, create_server


ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("memos_cli_tags_copy", ROOT / "cli" / "memos.py")
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)

TOKEN = "cli-tag-duplicate-test-token-long-enough"
MEMO_ID = "123e4567-e89b-12d3-a456-426614174000"


class TagAndDuplicateTests(unittest.TestCase):
    def run_cli(self, *args, response):
        output = io.StringIO()
        with patch.dict(os.environ, {"GOREE_MEMOS_TOKEN": TOKEN}):
            with patch.object(sys, "argv", ["memos.py", *args]):
                with patch.object(cli, "request", return_value=response) as req:
                    with contextlib.redirect_stdout(output):
                        cli.main()
        return json.loads(output.getvalue()), req

    def test_list_passes_tag_folder_and_query_without_mutation(self):
        result, req = self.run_cli(
            "list", "--folder", "archive", "--search", "research",
            "--tag", "#team/project", response=[]
        )
        self.assertEqual(result, [])
        self.assertEqual(req.call_count, 1)
        path = req.call_args.args[2]
        query = parse_qs(urlsplit(path).query)
        self.assertEqual(query["folder"], ["archive"])
        self.assertEqual(query["q"], ["research"])
        self.assertEqual(query["tag"], ["team/project"])
        self.assertEqual(req.call_args.args[:2], (
            "http://127.0.0.1:8765", TOKEN
        ))

    def test_default_list_keeps_existing_folder_and_search_semantics(self):
        _, req = self.run_cli("list", "--search", "idea", response=[])
        query = parse_qs(urlsplit(req.call_args.args[2]).query)
        self.assertEqual(query["folder"], ["active"])
        self.assertEqual(query["q"], ["idea"])
        self.assertNotIn("tag", query)

    def test_duplicate_uses_explicit_authenticated_post(self):
        new = {"id": "00000000-0000-4000-8000-000000000001", "version": 1}
        output, req = self.run_cli("duplicate", MEMO_ID, response=new)
        self.assertEqual(output, new)
        self.assertEqual(req.call_count, 1)
        self.assertEqual(req.call_args.args[2:], (
            "/api/v1/memos/" + MEMO_ID + "/duplicate", "POST", {}
        ))

    def test_duplicate_rejects_invalid_id_without_network(self):
        with patch.dict(os.environ, {"GOREE_MEMOS_TOKEN": TOKEN}):
            with patch.object(sys, "argv", ["memos.py", "duplicate", "../export"]):
                with patch.object(cli, "request") as req:
                    with contextlib.redirect_stderr(io.StringIO()):
                        with self.assertRaises(SystemExit) as failure:
                            cli.main()
        self.assertEqual(failure.exception.code, 1)
        req.assert_not_called()

    def test_live_tagged_list_returns_only_exact_tag_matches(self):
        with tempfile.TemporaryDirectory() as folder:
            db = Path(folder) / "notes.sqlite"
            store = Store(db)
            a = store.create({"content": "First #team/project"})
            store.create({"content": "Second #team"})
            store.create({"content": "Third #other"})
            server = create_server("127.0.0.1", 0, db, TOKEN)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                url = "http://127.0.0.1:{}".format(server.server_port)
                found = cli.request(url, TOKEN,
                    "/api/v1/memos?folder=active&q=&tag=team%2Fproject")
                self.assertEqual(len(found), 1)
                self.assertEqual(found[0]["id"], a["id"])
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)

    def test_live_duplicate_preserves_text_but_not_existing_flags(self):
        with tempfile.TemporaryDirectory() as folder:
            db = Path(folder) / "notes.sqlite"
            store = Store(db)
            initial = store.create({
                "title": "Repeat this", "content": "A note #project",
                "color": "mint", "pinned": True, "archived": True,
            })
            server = create_server("127.0.0.1", 0, db, TOKEN)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                url = "http://127.0.0.1:{}".format(server.server_port)
                copied = cli.request(url, TOKEN,
                    cli.memo_path(initial["id"]) + "/duplicate", "POST", {})
                self.assertNotEqual(copied["id"], initial["id"])
                self.assertEqual(copied["version"], 1)
                self.assertEqual(copied["title"], initial["title"])
                self.assertEqual(copied["content"], initial["content"])
                self.assertEqual(copied["color"], initial["color"])
                self.assertFalse(copied["pinned"])
                self.assertFalse(copied["archived"])
                self.assertFalse(copied["deleted"])
                self.assertEqual(len(store.revisions(initial["id"])), 0)
                self.assertEqual(store.get(initial["id"])["version"], 1)
                self.assertEqual(len(store.list("all")), 2)
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
