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
        memo_info = list(db.execute("PRAGMA table_info(memos)"))
        columns = {row[1] for row in memo_info}
        if not EXPECTED_MEMO_COLUMNS.issubset(columns):
            raise ValueError("Unexpected memos table schema")
        # The revision-history completeness proof assumes uniqueness at each
        # memo/version pair. Column-name checks alone cannot verify this.
        memo_key = {row[1]: row[5] for row in memo_info if row[5]}
        if memo_key != {"id": 1}:
            raise ValueError("Unexpected memos primary key")
        revision_info = list(db.execute("PRAGMA table_info(revisions)"))
        revision_columns = {row[1] for row in revision_info}
        if not EXPECTED_REVISION_COLUMNS.issubset(revision_columns):
            raise ValueError("Unexpected revisions table schema")
        revision_key = {row[1]: row[5] for row in revision_info if row[5]}
        if revision_key != {"memo_id": 1, "version": 2}:
            raise ValueError("Unexpected revisions primary key")
        # SQLite integrity_check verifies pages, not the logical relationship
        # between memo versions and their historical revisions.
        bad_revision = db.execute("""
            SELECT 1 FROM revisions r
            LEFT JOIN memos m ON m.id = r.memo_id
            WHERE m.id IS NULL OR r.version < 1 OR r.version >= m.version
            LIMIT 1
        """).fetchone()
        if bad_revision:
            raise ValueError("Orphaned or invalid memo revision history")
        # Every update saves exactly one prior version. Because revision
        # versions are unique per memo and bounded to [1, current-1] above,
        # matching the count proves the history has no missing versions.
        incomplete_history = db.execute("""
            SELECT 1 FROM memos m
            LEFT JOIN (
                SELECT memo_id, COUNT(*) AS saved_versions
                FROM revisions GROUP BY memo_id
            ) h ON h.memo_id = m.id
            WHERE m.version < 1
               OR COALESCE(h.saved_versions, 0) <> m.version - 1
            LIMIT 1
        """).fetchone()
        if incomplete_history:
            raise ValueError("Incomplete memo revision history")
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
    """Flush completed data before atomic hardlink; sync parent metadata on POSIX.

    If the final directory flush fails, remove only a link still referring
    to our temporary file. Existing destination names are never replaced.
    """
    fd = os.open(str(temp_path), os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)
    os.link(temp_path, destination, follow_symlinks=False)
    try:
        if os.name == "posix":
            flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
            parent_fd = os.open(str(destination.parent), flags)
            try:
                os.fsync(parent_fd)
            finally:
                os.close(parent_fd)
    except OSError:
        # Preserve any concurrent replacement of the published name.
        try:
            if os.path.samefile(temp_path, destination):
                os.unlink(destination)
        except FileNotFoundError:
            pass
        raise


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
