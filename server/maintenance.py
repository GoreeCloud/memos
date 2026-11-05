"""Offline-safe, lossless SQLite backup, verification and non-overwriting recovery.

Maintenance commands are local-only. Never restore over a live or existing database.
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import tempfile
from pathlib import Path

REQUIRED = {"memos", "revisions"}
EXPECTED_MEMO_COLUMNS = {"id", "title", "content", "color", "pinned", "archived",
                         "deleted", "created_at", "updated_at", "version"}
EXPECTED_REVISION_COLUMNS = {"memo_id", "version", "title", "content", "saved_at"}


def verify_database(path):
    """Read-only integrity and schema verification; no mutation or schema initialization."""
    path = Path(path)
    if not path.is_file():
        raise ValueError("Database file does not exist")
    uri = path.resolve().as_uri() + "?mode=ro"
    with sqlite3.connect(uri, uri=True, timeout=10) as db:
        result = db.execute("PRAGMA integrity_check").fetchone()
        if result != ("ok",):
            raise ValueError("SQLite integrity check failed")
        tables = {row[0] for row in db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'")}
        if not REQUIRED.issubset(tables):
            raise ValueError("Database does not contain GoreeCloud Memos tables")
        columns = {row[1] for row in db.execute("PRAGMA table_info(memos)")}
        if not EXPECTED_MEMO_COLUMNS.issubset(columns):
            raise ValueError("Unexpected memos table schema")
        revision_columns = {row[1] for row in db.execute("PRAGMA table_info(revisions)")}
        if not EXPECTED_REVISION_COLUMNS.issubset(revision_columns):
            raise ValueError("Unexpected revisions table schema")
        notes = db.execute("SELECT count(*) FROM memos").fetchone()[0]
        versions = db.execute("SELECT count(*) FROM revisions").fetchone()[0]
    return {"integrity": "ok", "memos": notes, "revisions": versions}


def _validated_path(path):
    p = Path(path).expanduser().absolute()
    if not p.parent.is_dir():
        raise ValueError("Destination directory must already exist")
    if p.exists() or p.is_symlink():
        raise FileExistsError("Destination already exists; refusing to overwrite")
    return p


def _temp_path(folder):
    fd, name = tempfile.mkstemp(prefix=".memos-backup-", suffix=".sqlite", dir=folder)
    os.close(fd)
    return Path(name)


def _publish_exclusively(temp_path, destination):
    """Publish using a hardlink, which fails atomically if destination exists."""
    os.link(temp_path, destination, follow_symlinks=False)
    fd = os.open(str(destination), os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def backup_database(source_path, destination_path):
    source = Path(source_path).expanduser().absolute()
    verify_database(source)
    target = _validated_path(destination_path)
    temp = _temp_path(target.parent)
    try:
        # SQLite's online backup API provides a transactionally consistent copy,
        # including all revisions; copying a live -wal file alone would not.
        with sqlite3.connect(source.as_uri() + "?mode=ro", uri=True, timeout=15) as src:
            with sqlite3.connect(temp, timeout=15) as dst:
                src.backup(dst, pages=64, sleep=.02)
        metrics = verify_database(temp)
        _publish_exclusively(temp, target)
        return metrics
    finally:
        temp.unlink(missing_ok=True)


def restore_database(backup_path, destination_path):
    """Recover into a new database file. Never overwrite an existing source or target."""
    source = Path(backup_path).expanduser().absolute()
    verify_database(source)
    target = _validated_path(destination_path)
    temp = _temp_path(target.parent)
    try:
        with sqlite3.connect(source.as_uri() + "?mode=ro", uri=True, timeout=15) as src:
            with sqlite3.connect(temp, timeout=15) as dst:
                src.backup(dst, pages=64, sleep=.02)
        metrics = verify_database(temp)
        _publish_exclusively(temp, target)
        return metrics
    finally:
        temp.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description="GoreeCloud Memos data recovery tools")
    sub = parser.add_subparsers(dest="operation", required=True)
    verify = sub.add_parser("verify", help="Read-only integrity and schema verification")
    verify.add_argument("db")
    backup = sub.add_parser("backup", help="Consistent online backup; refuses overwrite")
    backup.add_argument("db")
    backup.add_argument("output")
    restore = sub.add_parser("restore", help="Restore to NEW database path only")
    restore.add_argument("backup")
    restore.add_argument("output")
    args = parser.parse_args()
    if args.operation == "verify":
        result = verify_database(args.db)
    elif args.operation == "backup":
        result = backup_database(args.db, args.output)
    else:
        result = restore_database(args.backup, args.output)
    print("Integrity: {integrity}; memos: {memos}; revisions: {revisions}".format(**result))


if __name__ == "__main__":
    main()
