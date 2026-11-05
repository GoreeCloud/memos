"""Security regression coverage for authenticated CLI and native-client transport."""
import importlib.util
import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("goreecloud_memos_cli", ROOT / "cli" / "memos.py")
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)


class ReceivingHandler(BaseHTTPRequestHandler):
    seen = []

    def log_message(self, *_):
        pass

    def do_GET(self):
        self.seen.append(self.headers.get("Authorization"))
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"unexpected": "redirected"}')


class OriginHandler(BaseHTTPRequestHandler):
    seen = []
    destination = ""

    def log_message(self, *_):
        pass

    def do_GET(self):
        self.seen.append(self.headers.get("Authorization"))
        if self.path == "/redirect":
            self.send_response(302)
            self.send_header("Location", self.destination)
            self.end_headers()
            return
        raw = json.dumps({"ok": True}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


class TokenTransportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.receiver = ThreadingHTTPServer(("127.0.0.1", 0), ReceivingHandler)
        cls.origin = ThreadingHTTPServer(("127.0.0.1", 0), OriginHandler)
        OriginHandler.destination = "http://127.0.0.1:{}/token-leak".format(cls.receiver.server_port)
        cls.threads = [
            threading.Thread(target=server.serve_forever, daemon=True)
            for server in (cls.receiver, cls.origin)
        ]
        for t in cls.threads:
            t.start()
        cls.base = "http://127.0.0.1:{}".format(cls.origin.server_port)

    @classmethod
    def tearDownClass(cls):
        for server in (cls.origin, cls.receiver):
            server.shutdown()
            server.server_close()
        for t in cls.threads:
            t.join(timeout=2)

    def setUp(self):
        OriginHandler.seen.clear()
        ReceivingHandler.seen.clear()

    def test_local_direct_request_uses_intended_endpoint(self):
        self.assertEqual(cli.request(self.base, "test-local-token", "/ok"), {"ok": True})
        self.assertEqual(OriginHandler.seen, ["Bearer test-local-token"])
        self.assertEqual(ReceivingHandler.seen, [])

    def test_redirect_does_not_forward_bearer_token(self):
        with self.assertRaisesRegex(RuntimeError, "302"):
            cli.request(self.base, "test-local-token", "/redirect")
        self.assertEqual(OriginHandler.seen, ["Bearer test-local-token"])
        self.assertEqual(ReceivingHandler.seen, [])

    def test_remote_cleartext_and_untrusted_url_forms_rejected(self):
        for base in (
            "http://example.invalid",
            "http://192.168.1.20:8765",
            "ftp://127.0.0.1",
            "http://user:password@127.0.0.1:8765",
            "http://127.0.0.1:8765/?token=bad",
            "http://127.0.0.1:8765/#fragment",
        ):
            with self.subTest(base=base), self.assertRaises(RuntimeError):
                cli.checked_base(base)
        self.assertEqual(cli.checked_base("https://memos.example.invalid/api"), "https://memos.example.invalid/api")
        self.assertEqual(cli.checked_base("http://[::1]:8765"), "http://[::1]:8765")

    def test_linux_gtk_transport_has_corresponding_guards(self):
        # GTK4 is not installed on every CI runner; this is a source contract
        # check, NOT a claim that the graphical app was exercised.
        source = (ROOT / "clients" / "linux" / "app.py").read_text(encoding="utf-8")
        self.assertIn("class RejectRedirects(HTTPRedirectHandler)", source)
        self.assertIn("ProxyHandler({})", source)
        self.assertIn("parts.scheme == \"http\"", source)
        self.assertIn("checked_base(BASE)", source)


if __name__ == "__main__":
    unittest.main()
