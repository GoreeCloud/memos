"""Synthetic, local-only tests for the Qt Quick Memos API boundary."""
import json
import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from uuid import UUID, uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from qt_api import checked_base, request_json, MAX_API_RESPONSE_BYTES, CreateReplayKey

TOKEN = "fictional-test-token-not-a-secret"

class FakeAPI(BaseHTTPRequestHandler):
    seen = []
    def do_GET(self):
        FakeAPI.seen.append((self.path, self.headers.get("Authorization")))
        if self.path == "/api/v1/memos?redirect=1":
            self.send_response(302)
            self.send_header("Location", "http://127.0.0.1:1/anything")
            self.end_headers()
        else:
            body = json.dumps([{"id":"fake", "title":"fictional"}]).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
    def do_POST(self):
        FakeAPI.seen.append((self.path, self.headers.get("Authorization"),
                             self.headers.get("Idempotency-Key")))
        body = json.dumps({"result": "fictional-created"}).encode()
        self.send_response(201)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        return

class ApiBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), FakeAPI)
        cls.thread = threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join(timeout=5)
    def setUp(self):
        FakeAPI.seen.clear()
    def test_rejects_nonloopback_plaintext_and_credentials(self):
        for url in ["http://example.com", "http://localhost", "http://127.0.0.1@evil.example", "http://x:y@127.0.0.1", "http://127.0.0.1/?a=b", "file:///tmp/a"]:
            with self.subTest(url=url),self.assertRaises(ValueError):checked_base(url)
    def test_loopback_and_https(self):
        self.assertEqual(checked_base("http://127.0.0.1:443/"),"http://127.0.0.1:443")
        self.assertEqual(checked_base("https://example.com/base"),"https://example.com/base")
    def test_rejects_token_before_network(self):
        with self.assertRaises(ValueError):request_json(self.base,"short","/api/v1/memos")
        self.assertEqual(FakeAPI.seen,[])
    def test_authenticated_request(self):
        result=request_json(self.base,TOKEN,"/api/v1/memos")
        self.assertEqual(result[0]["title"],"fictional")
        self.assertEqual(FakeAPI.seen,[("/api/v1/memos","Bearer "+TOKEN)])
    def test_rejects_invalid_api_path_and_method(self):
        for path in ["/admin", "/api/v1/memos2", "//api/v1/memos", "/api/v1/memos/../../admin"]:
            with self.subTest(path=path),self.assertRaises(ValueError):request_json(self.base,TOKEN,path)
        with self.assertRaises(ValueError):request_json(self.base,TOKEN,"/api/v1/memos","DELETE")
        self.assertFalse(FakeAPI.seen)
    def test_redirect_is_not_followed(self):
        with self.assertRaises(HTTPError):request_json(self.base,TOKEN,"/api/v1/memos?redirect=1")
        self.assertEqual(len(FakeAPI.seen),1)
    def test_rejects_oversized_request(self):
        with self.assertRaises(ValueError):request_json(self.base,TOKEN,"/api/v1/memos","POST",{"content":"x"*(MAX_API_RESPONSE_BYTES+1)})
        self.assertEqual(FakeAPI.seen,[])

    def test_create_key_stable_for_unchanged_draft_only(self):
        replay = CreateReplayKey()
        key1 = replay.for_payload("Title", "Body")
        self.assertEqual(UUID(key1).version, 4)
        self.assertEqual(key1, replay.for_payload("Title", "Body"))
        key2 = replay.for_payload("Title", "Body revised")
        self.assertNotEqual(key1, key2)
        self.assertEqual(key2, replay.for_payload("Title", "Body revised"))
        replay.clear()
        self.assertNotEqual(key2, replay.for_payload("Title", "Body revised"))
        with self.assertRaises(ValueError):
            replay.for_payload(None, "Body")

    def test_create_header_sent_only_for_valid_canonical_uuid4_post(self):
        key = str(uuid4())
        result = request_json(self.base, TOKEN, "/api/v1/memos", "POST",
                              {"title": "fictional"}, idempotency_key=key)
        self.assertEqual(result["result"], "fictional-created")
        self.assertEqual(FakeAPI.seen, [
            ("/api/v1/memos", "Bearer " + TOKEN, key)
        ])

    def test_bad_idempotency_keys_rejected_before_network(self):
        key = str(uuid4())
        cases = [
            ("/api/v1/memos", "POST", "not-a-key"),
            ("/api/v1/memos", "POST", key.upper()),
            ("/api/v1/memos", "POST", 123),
            ("/api/v1/memos", "GET", key),
            ("/api/v1/memos?folder=active", "POST", key),
            ("/api/v1/memos/" + key, "PATCH", key),
        ]
        for path, method, replay in cases:
            with self.subTest(path=path, method=method, replay=replay):
                with self.assertRaises(ValueError):
                    request_json(self.base, TOKEN, path, method, {"title": "x"},
                                 idempotency_key=replay)
        self.assertEqual(FakeAPI.seen, [])


if __name__ == '__main__': unittest.main()
