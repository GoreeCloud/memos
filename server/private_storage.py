"""Opt-in, non-destructive POSIX permissions bootstrap for local Memos SQLite data.

The legacy server CLI does not call this helper automatically. Use before
initial startup and audit any existing database; do not treat this as encryption.
"""
from __future__ import annotations

import argparse
import errno
import os
import stat
from pathlib import Path


def _private_parent_fd(directory):
    """Walk each directory without following symlinks, creating 0700 parents.

    Keep the final directory descriptor open so database file operations cannot
    be silently redirected by changing a path component after validation.
    """
    if not hasattr(os, "O_NOFOLLOW") or not hasattr(os, "O_DIRECTORY"):
        raise OSError("Private database provisioning requires no-follow directory support")
    if ".." in directory.parts:
        raise ValueError("Database path must not contain parent-directory traversal")
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    flags |= getattr(os, "O_CLOEXEC", 0)
    fd = os.open(directory.anchor, flags)
    try:
        for component in directory.parts[1:]:
            try:
                info = os.stat(component, dir_fd=fd, follow_symlinks=False)
            except FileNotFoundError:
                # Never use mkdir(parents=True): intermediate parents must also
                # be 0700, rather than being created with default 0777 modes.
                os.mkdir(component, mode=0o700, dir_fd=fd)
                info = os.stat(component, dir_fd=fd, follow_symlinks=False)
            if stat.S_ISLNK(info.st_mode):
                raise ValueError("Database directory must not be a symlink (including ancestors)")
            if not stat.S_ISDIR(info.st_mode):
                raise ValueError("Database path component must be a directory")
            next_fd = os.open(component, flags, dir_fd=fd)
            os.close(fd)
            fd = next_fd
        info = os.fstat(fd)
        if not stat.S_ISDIR(info.st_mode) or info.st_mode & 0o077:
            raise PermissionError("Database directory must be owner-only (0700)")
        return fd
    except Exception:
        os.close(fd)
        raise


def provision_private_database(database_path):
    """Create a private directory and empty DB exclusively, or verify an existing DB.

    Returns True for a newly created file and False for an already secure file.
    Does not initialize SQLite schema, change existing permissions, or overwrite.
    """
    if os.name != "posix":
        raise OSError("Private database provisioning requires POSIX permissions")
    path = Path(database_path).expanduser().absolute()
    if ".." in path.parts:
        raise ValueError("Database path must not contain parent-directory traversal")
    parent_fd = _private_parent_fd(path.parent)
    try:
        flags = os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0)
        try:
            descriptor = os.open(path.name, os.O_RDONLY | flags, dir_fd=parent_fd)
            created = False
        except FileNotFoundError:
            descriptor = os.open(
                path.name, os.O_CREAT | os.O_EXCL | os.O_WRONLY | flags,
                mode=0o600, dir_fd=parent_fd
            )
            created = True
        except OSError as exc:
            if exc.errno == errno.ELOOP:
                raise ValueError("Database file must not be a symlink") from exc
            raise
        try:
            info = os.fstat(descriptor)
            if not stat.S_ISREG(info.st_mode):
                raise ValueError("Database path must be a regular file")
            if info.st_mode & 0o077:
                if created:
                    raise PermissionError("New database permissions are not owner-only")
                raise PermissionError("Existing database is not owner-only (0600)")
        finally:
            os.close(descriptor)
        return created
    finally:
        os.close(parent_fd)

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
