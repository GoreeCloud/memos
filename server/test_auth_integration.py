"""End-to-end HTTP throttling tests using loopback and a controlled clock."""
import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from app import create_server
from auth_guard import AuthFailureGuard


TOKEN = "memos-guard-integration-test-token-123456"


class HTTPThrottleTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "memos.sqlite"
        self.clock = [100.0]
        self.guard = AuthFailureGuard(
            limit=3, window_seconds=30, max_peers=20,
            clock=lambda: self.clock[0],
        )
        self.server = create_server(
            "127.0.0.1", 0, self.path, TOKEN, auth_guard=self.guard
        )
        self.address = "http://127.0.0.1:" + str(self.server.server_port)
        self.thread = threading.Thread(
            target=self.server.serve_forever, daemon=True
        )
        self.thread.start()
        self.addCleanup(self.stop_server)

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def get(self, path, token="", method="GET", body=None, extra=None):
        headers = dict(extra or {})
        if token:
            headers["Authorization"] = "Bearer " + token
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        req = Request(
            self.address + path, data=data, headers=headers, method=method
        )
        try:
            with urlopen(req, timeout=5) as response:
                return response.status, dict(response.headers), json.load(response)
        except HTTPError as error:
            with error:
                return error.code, dict(error.headers), json.load(error)

    def trigger_lock(self):
        for _ in range(3):
            self.assertEqual(self.get("/api/v1/memos", token="wrong")[0], 401)

    def test_invalid_tokens_lock_out_api_until_window_ends(self):
        self.trigger_lock()
        status, headers, body = self.get("/api/v1/memos", token="wrong")
        self.assertEqual(status, 429)
        self.assertEqual(headers.get("Retry-After"), "30")
        self.assertEqual(body["error"], "Too many authentication failures")
        # Correct credentials must not bypass a temporary peer cooldown.
        self.assertEqual(self.get("/api/v1/memos", token=TOKEN)[0], 429)
        self.clock[0] = 131.0
        self.assertEqual(self.get("/api/v1/memos", token=TOKEN)[0], 200)
        self.assertFalse(self.guard.denied("127.0.0.1"))

    def test_health_and_public_assets_stay_available_during_lock(self):
        self.trigger_lock()
        self.assertEqual(self.get("/api/v1/health")[0], 200)
        status, headers, body = self.get("/api/v1/memos", token=TOKEN)
        self.assertEqual(status, 429)
        page = Request(self.address + "/")
        with urlopen(page, timeout=5) as response:
            self.assertEqual(response.status, 200)
            self.assertIn(b"GoreeCloud Memos", response.read())

    def test_forwarded_headers_cannot_reset_socket_peer_bucket(self):
        self.assertEqual(self.get("/api/v1/memos", token="wrong",
                       extra={"X-Forwarded-For":"192.0.2.11"})[0], 401)
        self.assertEqual(self.get("/api/v1/memos", token="wrong",
                       extra={"X-Forwarded-For":"192.0.2.22"})[0], 401)
        self.assertEqual(self.get("/api/v1/memos", token="wrong",
                       extra={"X-Forwarded-For":"192.0.2.33"})[0], 401)
        self.assertEqual(self.get("/api/v1/memos", token=TOKEN,
                       extra={"X-Forwarded-For":"192.0.2.44"})[0], 429)
        self.assertIn("127.0.0.1", self.guard.peers)
        self.assertEqual(len(self.guard.peers), 1)

    def test_rejected_api_write_does_not_change_database(self):
        self.trigger_lock()
        status, _, _ = self.get("/api/v1/memos", token=TOKEN,
                                method="POST", body={"content":"Must not save"})
        self.assertEqual(status, 429)
        self.clock[0] = 131.0
        status, _, memos = self.get("/api/v1/memos", token=TOKEN)
        self.assertEqual(status, 200)
        self.assertEqual(memos, [])
        status, _, created = self.get("/api/v1/memos", token=TOKEN,
                                     method="POST", body={"content":"After cooldown"})
        self.assertEqual(status, 201)
        self.assertEqual(created["content"], "After cooldown")

    def test_valid_token_clears_previous_failures(self):
        self.assertEqual(self.get("/api/v1/memos", token="wrong")[0], 401)
        self.assertEqual(self.get("/api/v1/memos", token=TOKEN)[0], 200)
        self.assertNotIn("127.0.0.1", self.guard.peers)
        for _ in range(3):
            self.assertEqual(self.get("/api/v1/memos", token="wrong")[0], 401)
        self.assertEqual(self.get("/api/v1/memos", token=TOKEN)[0], 429)


if __name__ == "__main__":
    unittest.main()
