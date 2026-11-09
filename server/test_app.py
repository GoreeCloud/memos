"""Run: python3 -m unittest discover -s server -v"""
import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from app import create_server

TOKEN = "test_only_token_at_least_24_characters"


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.server = create_server("127.0.0.1", 0, Path(cls.temp.name) / "test.sqlite", TOKEN)
        cls.root = "http://127.0.0.1:" + str(cls.server.server_port)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)
        cls.temp.cleanup()

    def send(self, path, method="GET", data=None, authorized=True):
        headers = {"Authorization": "Bearer " + TOKEN} if authorized else {}
        if data is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(data).encode()
        req = Request(self.root + path, data=data, headers=headers, method=method)
        try:
            with urlopen(req, timeout=5) as resp:
                payload = resp.read()
                return resp.status, json.loads(payload) if resp.headers["Content-Type"].startswith("application/json") else payload
        except HTTPError as err:
            return err.code, json.loads(err.read())

    def test_unauthorized_and_health(self):
        self.assertEqual(self.send("/api/v1/memos", authorized=False)[0], 401)
        self.assertEqual(self.send("/api/v1/memos", authorized=False, data={}, method="POST")[0], 401)
        self.assertEqual(self.send("/api/v1/health", authorized=False)[0], 200)

    def test_full_lifecycle(self):
        code, note = self.send("/api/v1/memos", method="POST",
                               data={"title": "Plans", "content": "#work/project\n- [ ] Pack\nHello world", "color": "mint"})
        self.assertEqual(code, 201)
        self.assertEqual(note["tags"], ["work/project"])
        self.assertEqual(note["version"], 1)
        memo_id = note["id"]
        self.assertEqual(len(self.send("/api/v1/memos?folder=active&q=Hello")[1]), 1)
        self.assertEqual(len(self.send("/api/v1/memos?folder=active&q=%25")[1]), 0)
        self.assertEqual(len(self.send("/api/v1/memos?folder=active&tag=work%2Fproject")[1]), 1)
        code, updated = self.send("/api/v1/memos/" + memo_id, "PATCH",
                                  {"version": 1, "pinned": True, "archived": True})
        self.assertEqual(code, 200)
        self.assertTrue(updated["archived"])
        self.assertEqual(len(self.send("/api/v1/memos?folder=active&q=Plans")[1]), 0)
        self.assertEqual(len(self.send("/api/v1/memos?folder=archive&q=Plans")[1]), 1)
        self.assertEqual(self.send("/api/v1/memos/" + memo_id, "PATCH", {"version": 1, "title": "Stale"})[0], 409)
        self.assertEqual(len(self.send("/api/v1/memos/" + memo_id + "/revisions")[1]), 1)
        code, duplicate = self.send("/api/v1/memos/" + memo_id + "/duplicate", "POST", {})
        self.assertEqual(code, 201)
        self.assertNotEqual(duplicate["id"], memo_id)
        self.assertEqual(duplicate["content"], note["content"])
        code, deleted = self.send("/api/v1/memos/" + memo_id, "DELETE", {"version": 2})
        self.assertEqual(code, 200)
        self.assertTrue(deleted["deleted"])
        self.assertEqual(len(self.send("/api/v1/memos?folder=trash&q=Plans")[1]), 1)
        code, restored = self.send("/api/v1/memos/" + memo_id, "PATCH",
                                   {"version": 3, "deleted": False, "archived": False})
        self.assertEqual(code, 200)
        self.assertFalse(restored["deleted"])
        self.assertEqual(self.send("/api/v1/memos?folder=active&q=Plans")[0], 200)

    def test_input_guards(self):
        self.assertEqual(self.send("/api/v1/memos", "POST", {"color": "<script>"})[0], 400)
        self.assertEqual(self.send("/api/v1/memos", "POST", {"content": "x" * 65537})[0], 400)
        self.assertEqual(self.send("/api/v1/memos", "POST", {"visibility": "PUBLIC"})[0], 400)
        self.assertEqual(self.send("/api/v1/memos?folder=other")[0], 400)
        self.assertEqual(self.send("/../etc/passwd")[0], 404)

    def test_mutation_rejects_ambiguous_json_and_nonfinite_numbers(self):
        """Real HTTP parser must fail before writing any memo or history."""
        from urllib.request import Request, urlopen
        before = self.send("/api/v1/export")[1]["memos"]
        cases = (
            (b'{"title":"Safe","title":"Override"}', "Duplicate JSON object field"),
            (b'{"title":"Safe","content":"Keep","content":"Replace"}', "Duplicate JSON object field"),
            (b'{"title":"Safe","pinned":false,"pinned":true}', "Duplicate JSON object field"),
            (b'{"title":"Safe","color":{"a":1,"a":2}}', "Duplicate JSON object field"),
            (b'{"title":"Safe","pinned":NaN}', "Non-standard JSON numeric value"),
            (b'{"title":"Safe","pinned":Infinity}', "Non-standard JSON numeric value"),
            (b'{"title":"Safe","pinned":-Infinity}', "Non-standard JSON numeric value"),
        )
        for raw, expected in cases:
            with self.subTest(raw=raw):
                request = Request(
                    self.root + "/api/v1/memos", raw, method="POST",
                    headers={"Authorization": "Bearer " + TOKEN,
                             "Content-Type": "application/json"},
                )
                with self.assertRaises(HTTPError) as problem:
                    urlopen(request, timeout=5)
                self.assertEqual(problem.exception.code, 400)
                self.assertEqual(json.loads(problem.exception.read())["error"], expected)
        self.assertEqual(self.send("/api/v1/export")[1]["memos"], before)

        status, created = self.send("/api/v1/memos", method="POST",
                                    data={"title": "Valid single JSON fields", "content": "Hello"})
        self.assertEqual(status, 201)
        self.assertEqual(created["title"], "Valid single JSON fields")

    def test_export_and_static(self):
        code, archive = self.send("/api/v1/export")
        self.assertEqual(code, 200)
        self.assertEqual(archive["format"], "goreecloud-memos-v2")
        self.assertIn("revisions", archive)
        self.assertTrue(isinstance(archive["memos"], list))
        code, page = self.send("/", authorized=False)
        self.assertEqual(code, 200)
        self.assertIn(b"GoreeCloud Memos", page)
        code, css = self.send("/style.css", authorized=False)
        self.assertEqual(code, 200)
        self.assertIn(b"column-width:255px", css)
        code, script = self.send("/markdown.js", authorized=False)
        self.assertEqual(code, 200)
        self.assertIn(b"safeHref", script)


if __name__ == "__main__":
    unittest.main()
