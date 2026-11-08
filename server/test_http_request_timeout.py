"""Socket-level timeout regressions for incomplete local HTTP clients."""
import json
import socket
import tempfile
import threading
import time
import unittest
from pathlib import Path
from urllib.request import Request, urlopen

from app import BoundedHTTPServer, Store, create_server


TOKEN = "test-http-timeout-guard-credential-long-enough"


class SlowClientTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "notes.sqlite"
        self.server = create_server("127.0.0.1", 0, self.path, TOKEN)
        self.assertIsInstance(self.server, BoundedHTTPServer)
        self.server.request_read_timeout_seconds = 0.35
        self.thread = threading.Thread(
            target=self.server.serve_forever, daemon=True
        )
        self.thread.start()
        self.addCleanup(self.stop_server)

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def connect(self):
        connection = socket.create_connection(
            ("127.0.0.1", self.server.server_port), timeout=3
        )
        connection.settimeout(3)
        return connection

    def test_partial_json_body_returns_408_and_does_not_save(self):
        # The application used to wait indefinitely on this declared length.
        partial = (
            "POST /api/v1/memos HTTP/1.1\r\n"
            "Host: 127.0.0.1\r\n"
            "Authorization: Bearer " + TOKEN + "\r\n"
            "Content-Type: application/json\r\n"
            "Content-Length: 200\r\n"
            "Connection: close\r\n\r\n"
            '{"content":"partial private memo'
        ).encode("ascii")
        with self.connect() as client:
            started = time.monotonic()
            client.sendall(partial)
            raw = client.recv(4096)
            elapsed = time.monotonic() - started
        self.assertLess(elapsed, 2.8)
        self.assertIn(b" 408 ", raw)
        self.assertNotIn(b"partial private memo", raw)
        self.assertEqual(Store(self.path).list("all"), [])

    def test_incomplete_headers_release_the_socket(self):
        with self.connect() as client:
            started = time.monotonic()
            client.sendall(b"GET /api/v1/health HTTP/1.1\r\nHost: 127.0.0.1")
            try:
                response = client.recv(4096)
            except ConnectionResetError:
                response = b""
            elapsed = time.monotonic() - started
        self.assertLess(elapsed, 2.8)
        # The incomplete HTTP request must not receive any private content.
        self.assertNotIn(b"partial private memo", response)
        with urlopen(
            "http://127.0.0.1:{}/api/v1/health".format(self.server.server_port),
            timeout=3,
        ) as health:
            self.assertEqual(health.status, 200)

    def test_complete_authenticated_request_succeeds_after_timeout(self):
        with self.connect() as client:
            client.sendall(
                b"GET /api/v1/health HTTP/1.1\r\nHost: 127.0.0.1"
            )
            try:
                client.recv(4096)
            except ConnectionResetError:
                pass
        payload = json.dumps({"content": "Complete authorized note"}).encode()
        req = Request(
            "http://127.0.0.1:{}/api/v1/memos".format(self.server.server_port),
            data=payload,
            headers={"Authorization": "Bearer " + TOKEN,
                     "Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(req, timeout=3) as response:
            self.assertEqual(response.status, 201)
            memo = json.loads(response.read())
        self.assertEqual(memo["content"], "Complete authorized note")
        self.assertEqual(len(Store(self.path).list("active")), 1)


if __name__ == "__main__":
    unittest.main()
