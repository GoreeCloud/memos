"""Ephemeral Memos browser fixture: real API, fictional notes, loopback only.

No production token, user memo, network service, or persistent database is used.
This is a test runner helper, never an installation/deployment entrypoint.
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app import Store
from serve_private import create_private_server

TEST_TOKEN = "synthetic-only-test-token-no-real-access-2026"


def main():
    os.umask(0o077)
    with tempfile.TemporaryDirectory(prefix="gc-memos-synthetic-browser-") as directory:
        db_path = Path(directory) / "private" / "memos.sqlite3"
        # The launcher enforces private 0700 directories, 0600 DB and local bind.
        server = create_private_server(db_path, 8768, TEST_TOKEN)
        try:
            store = Store(db_path)
            store.create({
                "title": "Synthetic real-server pinned",
                "content": "A fictional test note #browser-test",
                "pinned": True,
            })
            store.create({
                "title": "Synthetic real-server ordinary",
                "content": "Another fictional development-only note",
            })
            print("Synthetic Memos API ready on local loopback", flush=True)
            server.serve_forever()
        finally:
            server.server_close()


if __name__ == "__main__":
    main()
