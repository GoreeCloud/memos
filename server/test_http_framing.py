"""Raw localhost HTTP framing tests: no personal data, no proxy or deployment."""
import json
import socket
import tempfile
import threading
import unittest
from pathlib import Path

from app import Store, create_server

TOKEN = "synthetic-memos-framing-credential-0123456789"


class FramingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / "framing.sqlite"
        self.server = create_server("127.0.0.1", 0, self.db, TOKEN)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=3)
        self.temp.cleanup()

    def request(self, headers, body=b"{}", *, method="POST", route="/api/v1/memos"):
        fields = [
            f"{method} {route} HTTP/1.1",
            "Host: 127.0.0.1",
            "Connection: close",
            *headers,
        ]
        request = ("\r\n".join(fields) + "\r\n\r\n").encode("ascii") + body
        with socket.create_connection(("127.0.0.1", self.server.server_port), timeout=3) as sock:
            sock.settimeout(3)
            sock.sendall(request)
            chunks = []
            while True:
                chunk = sock.recv(65536)
                if not chunk:
                    break
                chunks.append(chunk)
        response = b"".join(chunks)
        code = int(response.split(b"\r\n", 1)[0].split()[1])
        return code, json.loads(response.split(b"\r\n\r\n", 1)[1])

    @staticmethod
    def headers():
        return ["Authorization: Bearer " + TOKEN,
                "Content-Type: application/json",
                "Content-Length: 2"]

    def test_ambiguous_lengths_or_transfer_framing_never_create_memos(self):
        valid = self.headers()
        cases = [
            valid + ["Content-Length: 2"],
            valid + ["Content-Length: 10"],
            valid + ["Transfer-Encoding: chunked"],
            valid + ["Transfer-Encoding: identity"],
            valid[:-1],
            valid[:-1] + ["Content-Length: +2"],
            valid[:-1] + ["Content-Length: 131073"],
            valid + ["Content-Type: application/json"],
            valid + ["Content-Type: text/plain"],
        ]
        for headers in cases:
            with self.subTest(fields=headers):
                status, details = self.request(headers)
                self.assertEqual(status, 400, details)
                self.assertIn("error", details)
        self.assertEqual(Store(self.db).list("all"), [])

    def test_duplicate_credentials_are_denied_even_if_one_is_valid(self):
        for headers in (
            ["Authorization: Bearer " + TOKEN, "Authorization: Bearer invalid"],
            ["Authorization: Bearer invalid", "Authorization: Bearer " + TOKEN],
        ):
            status, _ = self.request(headers, b"", method="GET")
            self.assertEqual(status, 401)
        self.assertEqual(Store(self.db).list("all"), [])

    def test_exactly_one_valid_header_value_still_permits_normal_mutation(self):
        status, item = self.request(self.headers())
        self.assertEqual(status, 201)
        self.assertEqual(item["title"], "")
        self.assertEqual(len(Store(self.db).list("all")), 1)


if __name__ == "__main__":
    unittest.main()
