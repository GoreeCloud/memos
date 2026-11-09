"""Safe local HTTP binding regression; only disposable database paths."""
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from app import create_server

TOKEN = "synthetic-local-only-memos-credential-0123456789"
MAIN = Path(__file__).resolve().parent / "app.py"


class LocalBindTests(unittest.TestCase):
    def test_non_local_configuration_is_refused_before_database_creation(self):
        with tempfile.TemporaryDirectory() as work:
            bad = ("0.0.0.0", "::", "::1", "localhost",
                   "127.0.0.2", "", None, 0, b"127.0.0.1")
            for index, host in enumerate(bad):
                database = Path(work) / ("bad-%s.sqlite3" % index)
                with self.subTest(host=host):
                    with self.assertRaisesRegex(ValueError, "only to 127.0.0.1"):
                        create_server(host, 0, database, TOKEN)
                    self.assertFalse(database.exists())
            valid = Path(work) / "valid.sqlite3"
            server = create_server("127.0.0.1", 0, valid, TOKEN)
            try:
                self.assertEqual(server.server_address[0], "127.0.0.1")
                self.assertTrue(valid.exists())
            finally:
                server.server_close()

    def test_command_line_rejects_public_bind_before_filesystem_write(self):
        with tempfile.TemporaryDirectory() as work:
            db = Path(work) / "must-not-create.sqlite3"
            for host in ("0.0.0.0", "::", "localhost"):
                with self.subTest(host=host):
                    environment = {"PATH": os.environ.get("PATH", "/usr/bin:/bin"),
                                   "GOREE_MEMOS_TOKEN": TOKEN}
                    result = subprocess.run(
                        [sys.executable, str(MAIN), "--host", host,
                         "--port", "0", "--db", str(db)],
                        cwd=work, env=environment, capture_output=True,
                        text=True, timeout=6, check=False,
                    )
                    self.assertEqual(result.returncode, 2)
                    self.assertIn("only to 127.0.0.1", result.stderr)
                    self.assertNotIn(TOKEN, result.stderr)
                    self.assertFalse(db.exists())


if __name__ == "__main__":
    unittest.main()
