"""Safer single-host Memos development launcher.

Uses the existing API, but requires local bind and private POSIX SQLite
provisioning before server startup. It is NOT a production deployment mode.
"""
from __future__ import annotations

import argparse
import os
import sqlite3
from pathlib import Path

from app import create_server
from maintenance import verify_database
from private_storage import provision_private_database


def create_private_server(db_path, port, token):
    """Prepare owner-only SQLite data and bind only to numeric IPv4 loopback."""
    if not isinstance(token, str) or len(token) < 24:
        raise ValueError("GOREE_MEMOS_TOKEN must be at least 24 characters")
    if type(port) is not int or not 0 <= port <= 65535:
        raise ValueError("Invalid local TCP port")
    path = Path(db_path).expanduser().absolute()
    created = provision_private_database(path)
    if not created:
        # The normal Store constructor has CREATE TABLE IF NOT EXISTS.
        # Reject damaged or incomplete existing databases BEFORE it can
        # modify their schemas or mask missing memo revision history.
        try:
            verify_database(path)
        except (ValueError, sqlite3.DatabaseError) as exc:
            raise ValueError(
                "Existing Memos database failed integrity/history validation; "
                "preserve the file for recovery"
            ) from exc
    return create_server("127.0.0.1", port, path, token)


def main():
    parser = argparse.ArgumentParser(
        description="Private POSIX-only localhost Memos development server"
    )
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--db", default=os.environ.get(
        "GOREE_MEMOS_DB", "./data/memos.sqlite3"
    ))
    args = parser.parse_args()
    # Secure all new process-created files, including potential SQLite WAL
    # sidecars. This does not change permissions on any preexisting files.
    os.umask(0o077)
    token = os.environ.get("GOREE_MEMOS_TOKEN", "")
    try:
        server = create_private_server(args.db, args.port, token)
    except (OSError, ValueError) as error:
        parser.exit(2, "Unable to start private Memos server: " + str(error) + "\n")
    print("GoreeCloud Memos private development server listening at "
          f"http://127.0.0.1:{server.server_port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
