#!/usr/bin/env python3
"""Isolated restart/backup-restore smoke test for the GoreeCloud Memos Linux .deb.

Uses only a disposable local SQLite fixture; does not install the package or
access an existing Memos data directory.
"""
from __future__ import annotations

import argparse
from contextlib import closing, contextmanager
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import time
from urllib.error import URLError
from urllib.request import urlopen

FIXTURE = "# Restored memo\n\nGoreeCloud local restore smoke fixture"
USERNAME = "goreecloud-test-local-restore"


def available_loopback_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def get_ok(url: str) -> bytes:
    with urlopen(url, timeout=2) as response:
        if response.status != 200:
            raise AssertionError(f"Expected HTTP 200, received {response.status}")
        return response.read()


@contextmanager
def running_server(binary: Path, data: Path, root: Path):
    port = available_loopback_port()
    url = f"http://127.0.0.1:{port}"
    safe_env = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
        "HOME": str(root),
        "TMPDIR": str(root),
    }
    with (root / "server.log").open("ab") as output:
        proc = subprocess.Popen(
            [
                str(binary), "--addr", "127.0.0.1", "--port", str(port),
                "--data", str(data), "--trusted-proxies", "none",
                "--instance-url", url,
            ],
            env=safe_env, stdout=output, stderr=subprocess.STDOUT,
        )
        try:
            for _ in range(60):
                if proc.poll() is not None:
                    raise AssertionError(f"Memos exited during startup ({proc.returncode})")
                try:
                    get_ok(f"{url}/readyz")
                    break
                except (URLError, TimeoutError, OSError):
                    time.sleep(0.2)
            else:
                raise AssertionError("Memos readiness timeout")
            page = get_ok(f"{url}/")
            if b'<div id="root"' not in page:
                raise AssertionError("Packaged frontend missing")
            yield
        finally:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=5)
                    raise AssertionError("Memos did not stop gracefully")


def connect_checked(db_file: Path) -> sqlite3.Connection:
    if not db_file.is_file():
        raise AssertionError("Memos SQLite database was not created")
    db = sqlite3.connect(str(db_file))
    if db.execute("PRAGMA quick_check").fetchone()[0] != "ok":
        db.close()
        raise AssertionError("SQLite integrity check failed")
    return db


def check_fixture(db_file: Path) -> None:
    with closing(connect_checked(db_file)) as db:
        row = db.execute(
            "SELECT memo.content FROM memo JOIN user ON memo.creator_id = user.id "
            "WHERE user.username = ?", (USERNAME,),
        ).fetchone()
        if row != (FIXTURE,):
            raise AssertionError("Disposable note content was not preserved")


def main(package: Path) -> None:
    if not package.is_file() or package.suffix != ".deb":
        raise ValueError("Expected existing Debian package")
    with tempfile.TemporaryDirectory(prefix="goreecloud-memos-restore-") as folder:
        root = Path(folder)
        extracted = root / "extracted"
        subprocess.run(["dpkg-deb", "--extract", str(package), str(extracted)], check=True)
        binary = extracted / "usr/lib/goreecloud-memos/memos"
        if not binary.is_file():
            raise AssertionError("Expected packaged Memos executable")
        primary = root / "primary"
        primary.mkdir(mode=0o700)
        with running_server(binary, primary, root):
            pass  # Migrations initialize the disposable database.
        db_file = primary / "memos_prod.db"
        with closing(connect_checked(db_file)) as db:
            db.execute(
                "INSERT INTO user (username, password_hash) VALUES (?, ?)",
                (USERNAME, "disabled-login-test-fixture"),
            )
            uid = db.execute("SELECT id FROM user WHERE username = ?", (USERNAME,)).fetchone()[0]
            db.execute(
                "INSERT INTO memo (uid, creator_id, content) VALUES (?, ?, ?)",
                ("goreecloud-local-restore-smoke", uid, FIXTURE),
            )
            db.commit()
        check_fixture(db_file)
        with running_server(binary, primary, root):
            pass  # Reopen the same persisted database, executing upgrade checks.
        check_fixture(db_file)
        restored = root / "restored"
        shutil.copytree(primary, restored)  # Cold copy only after graceful shutdown.
        with running_server(binary, restored, root):
            pass
        check_fixture(restored / "memos_prod.db")
        print("PASS: packaged Memos SQLite fixture survives restart and cold backup/restore")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("package", type=Path)
    args = parser.parse_args()
    main(args.package)
