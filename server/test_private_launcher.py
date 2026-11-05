"""Loopback and filesystem privacy tests for the opt-in safe server launcher."""
import json
import os
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.request import Request, urlopen

from app import Store
from serve_private import create_private_server


TOKEN = "test_private_launcher_token_has_sufficient_length"


@unittest.skipUnless(os.name == "posix", "Private server requires POSIX file modes")
class PrivateLauncherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name) / "private"
        self.path = self.folder / "memos.sqlite3"

    def test_private_server_binds_loopback_and_saves_memos(self):
        server = create_private_server(self.path, 0, TOKEN)
        self.assertEqual(server.server_address[0], "127.0.0.1")
        self.assertEqual(self.folder.stat().st_mode & 0o777, 0o700)
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            payload = json.dumps({"content": "Private local note"}).encode("utf-8")
            req = Request(
                "http://127.0.0.1:{}/api/v1/memos".format(server.server_port),
                data=payload,
                headers={"Authorization": "Bearer " + TOKEN,
                         "Content-Type": "application/json"},
                method="POST",
            )
            with urlopen(req, timeout=5) as response:
                self.assertEqual(response.status, 201)
                memo = json.loads(response.read())
                self.assertEqual(memo["content"], "Private local note")
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)

    def test_bad_token_refused_before_touching_disk(self):
        with self.assertRaisesRegex(ValueError, "at least 24"):
            create_private_server(self.path, 0, "weak")
        self.assertFalse(self.folder.exists())

    def test_bad_port_refused_before_touching_disk(self):
        for bad_port in (-1, 65536, True, "8765"):
            with self.subTest(port=bad_port):
                with self.assertRaisesRegex(ValueError, "Invalid local TCP port"):
                    create_private_server(self.path, bad_port, TOKEN)
        self.assertFalse(self.folder.exists())

    def test_existing_unsafe_database_is_not_modified(self):
        self.folder.mkdir(mode=0o700)
        self.path.write_bytes(b"existing private user content")
        self.path.chmod(0o644)
        with self.assertRaisesRegex(PermissionError, "owner-only"):
            create_private_server(self.path, 0, TOKEN)
        self.assertEqual(self.path.read_bytes(), b"existing private user content")
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o644)

    def test_existing_unsafe_directory_refused(self):
        self.folder.mkdir(mode=0o755)
        self.folder.chmod(0o755)
        with self.assertRaisesRegex(PermissionError, "owner-only"):
            create_private_server(self.path, 0, TOKEN)
        self.assertFalse(self.path.exists())

    def test_restart_preserves_existing_private_database(self):
        first = create_private_server(self.path, 0, TOKEN)
        try:
            memo = Store(self.path).create({"content": "Persist across restarts"})
        finally:
            first.server_close()
        second = create_private_server(self.path, 0, TOKEN)
        try:
            self.assertEqual(
                Store(self.path).get(memo["id"])["content"],
                "Persist across restarts",
            )
        finally:
            second.server_close()


if __name__ == "__main__":
    unittest.main()
