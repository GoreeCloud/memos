"""Opt-in, non-destructive POSIX permissions bootstrap for local Memos SQLite data.

The legacy server CLI does not call this helper automatically. Use before
initial startup and audit any existing database; do not treat this as encryption.
"""
from __future__ import annotations

import argparse
import os
import stat
from pathlib import Path


def provision_private_database(database_path):
    """Create a private directory and empty DB exclusively, or verify an existing DB.

    Returns True for a newly created file and False for an already secure file.
    Does not initialize SQLite schema, change existing permissions, or overwrite.
    """
    if os.name != "posix":
        raise OSError("Private database provisioning requires POSIX permissions")
    path = Path(database_path).expanduser().absolute()
    directory = path.parent
    if directory.is_symlink():
        raise ValueError("Database directory must not be a symlink")
    directory.mkdir(parents=True, mode=0o700, exist_ok=True)
    mode = directory.stat().st_mode
    if not stat.S_ISDIR(mode) or mode & 0o077:
        raise PermissionError("Database directory must be owner-only (0700)")
    if path.is_symlink():
        raise ValueError("Database file must not be a symlink")
    if path.exists():
        info = path.stat()
        if not stat.S_ISREG(info.st_mode):
            raise ValueError("Database path must be a regular file")
        if info.st_mode & 0o077:
            raise PermissionError("Existing database is not owner-only (0600)")
        return False
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    descriptor = os.open(path, flags, 0o600)
    try:
        mode = os.fstat(descriptor).st_mode
        if mode & 0o077:
            raise PermissionError("New database permissions are not owner-only")
    finally:
        os.close(descriptor)
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Precreate a private local database; never overwrite or chmod existing data"
    )
    parser.add_argument("db", help="Path to a new or existing local Memos SQLite file")
    args = parser.parse_args()
    created = provision_private_database(args.db)
    print("Private empty database created" if created else "Existing database permissions verified")
    print("Start the development server separately with --db pointing to this file")


if __name__ == "__main__":
    main()
