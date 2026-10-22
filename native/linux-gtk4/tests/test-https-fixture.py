#!/usr/bin/env python3
"""Loopback-only synthetic HTTPS contract tests. Never connects to real accounts."""
import http.server
import os
import pathlib
import ssl
import subprocess
import sys
import tempfile
import threading
import time


class FixtureHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    scenario = "ok"
    seen = []

    def log_message(self, *_args):
        pass  # Never log Authorization values or bearer tokens.

    def do_GET(self):
        self.__class__.seen.append({
            "path": self.path,
            "method": self.command,
            "auth_valid": self.headers.get("Authorization") == "Bearer synthetic-test-token",
            "accept_valid": self.headers.get("Accept") == "application/json",
        })
        scenario = self.__class__.scenario
        status = 200
        content_type = "application/json; charset=utf-8"
        content = (
            b'{"memos":[{"name":"memos/test-one",'
            b'"content":"synthetic transport test","visibility":"PRIVATE"}],'
            b'"nextPageToken":"t+1"}'
        )
        if scenario == "cancel-midflight":
            # Keep headers pending so the client can cancel an active request.
            time.sleep(2.3)
        if scenario == "unauthorized":
            status = 401
            content = b'{"code":401}'
        elif scenario == "forbidden":
            status = 403
        elif scenario == "rate-limited":
            status = 429
        elif scenario == "redirect":
            status = 302
            content = b""
        elif scenario == "wrong-mime":
            content_type = "text/html"
        elif scenario == "invalid-json":
            content = b'{"memos":"oops"}'
        elif scenario == "oversize":
            content = b"X" * (4 * 1024 * 1024 + 1)
        elif scenario not in ("ok", "invalid-ca", "unauthenticated", "cancel-midflight"):
            status = 404
        try:
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            if scenario == "redirect":
                self.send_header("Location", "https://127.0.0.1:%d/capture" % self.server.server_port)
            self.end_headers()
            self.wfile.write(content)
            self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ssl.SSLError, OSError):
            pass


def main():
    assert len(sys.argv) == 2, "usage: test-https-fixture.py ./build/test-transport"
    binary = str(pathlib.Path(sys.argv[1]).resolve())
    with tempfile.TemporaryDirectory(prefix="gc-native-https-fixture-") as temp:
        cert = os.path.join(temp, "cert.pem")
        key = os.path.join(temp, "key.pem")
        subprocess.run(
            ["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
             "-keyout", key, "-out", cert, "-days", "1",
             "-subj", "/CN=fixture.invalid",
             "-addext", "subjectAltName=IP:127.0.0.1"],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=12
        )
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.load_cert_chain(cert, key)
        server.socket = context.wrap_socket(server.socket, server_side=True)
        background = threading.Thread(target=server.serve_forever, daemon=True)
        background.start()
        origin = "https://127.0.0.1:%d" % server.server_port
        try:
            scenarios = (
                "ok", "unauthorized", "forbidden", "rate-limited",
                "redirect", "wrong-mime", "invalid-json", "oversize",
                "invalid-ca", "wrong-host", "unauthenticated", "cancel-before", "cancel-midflight"
            )
            for scenario in scenarios:
                FixtureHandler.scenario = scenario
                FixtureHandler.seen = []
                scenario_origin = origin.replace("127.0.0.1", "localhost") if scenario == "wrong-host" else origin
                result = subprocess.run([binary, scenario_origin, cert, scenario],
                                        capture_output=True, text=True, timeout=12)
                if result.returncode:
                    raise AssertionError("%s failed (%d): %s" %
                                         (scenario, result.returncode, result.stderr[:700]))
                seen = list(FixtureHandler.seen)
                if scenario in ("invalid-ca", "wrong-host", "unauthenticated", "cancel-before"):
                    assert not seen, scenario
                else:
                    assert len(seen) == 1, (scenario, seen)
                    req = seen[0]
                    assert req["auth_valid"] and req["accept_valid"], scenario
                    assert "/api/v1/memos?" in req["path"], scenario
                    assert "page_size=2" in req["path"], scenario
                    assert "state=NORMAL" in req["path"], scenario
                    assert "page_token=x%2B1" in req["path"], scenario
                    assert "synthetic-test-token" not in req["path"], scenario
                print("ok: synthetic HTTPS", scenario)
        finally:
            server.shutdown()
            server.server_close()
            background.join(timeout=2)


if __name__ == "__main__":
    main()
