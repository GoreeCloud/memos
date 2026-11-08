"""Disposable, data-free end-to-end GoreeCloud Memos recovery rehearsal.

This command accepts no database paths or credentials. All records are
synthetic and are removed with their temporary directory after the drill.
"""
from __future__ import annotations

import hashlib
import os
import stat
import sys
import tempfile
from pathlib import Path

from app import Store
from maintenance import backup_database, restore_database, verify_database


def _digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_synthetic_recovery_drill():
    """Prove historical-data recovery, source isolation and no-overwrite safety."""
    with tempfile.TemporaryDirectory(prefix="goreecloud-memos-drill-") as folder:
        root = Path(folder)
        source = root / "synthetic-source.sqlite"
        backup = root / "synthetic-backup.sqlite"
        restored = root / "synthetic-restored.sqlite"

        original = Store(source)
        first = original.create({
            "title": "Fictional diary", "content": "First synthetic thought #test"
        })
        first_v2, err = original.update(first["id"], {
            "version": first["version"],
            "content": "Second synthetic thought #test",
        })
        if err is not None or first_v2["version"] != 2:
            raise RuntimeError("Synthetic version update failed")
        second = original.create({
            "title": "Fictional checklist", "content": "- [ ] Synthetic step"
        })
        second_v2, err = original.update(second["id"], {
            "version": second["version"], "pinned": True
        })
        if err is not None or second_v2["version"] != 2:
            raise RuntimeError("Synthetic metadata update failed")

        before = original.export_all()
        expected = verify_database(source)
        if expected != {"integrity": "ok", "memos": 2, "revisions": 2}:
            raise RuntimeError("Unexpected synthetic source metrics")
        if backup_database(source, backup) != expected:
            raise RuntimeError("Synthetic backup counts are inconsistent")

        # Mutate only our disposable SOURCE after backup publication, proving
        # that a recovered snapshot does not silently pick up later writes.
        first_v3, err = original.update(first["id"], {
            "version": 2, "content": "After-backup synthetic edit"
        })
        if err is not None or first_v3["version"] != 3:
            raise RuntimeError("Synthetic post-backup edit failed")
        if restore_database(backup, restored) != expected:
            raise RuntimeError("Synthetic restore counts are inconsistent")
        if verify_database(restored) != expected:
            raise RuntimeError("Restored synthetic database did not verify")

        copy = Store(restored).export_all()
        if copy["memos"] != before["memos"] or copy["revisions"] != before["revisions"]:
            raise RuntimeError("Restored synthetic memo/revision history differs")
        if original.get(first["id"])["content"] == Store(restored).get(first["id"])["content"]:
            raise RuntimeError("Restored snapshot unexpectedly contains later edits")

        before_backup = _digest(backup)
        before_restore = _digest(restored)
        for operation, destination in (
            (backup_database, backup), (restore_database, restored)
        ):
            try:
                operation(source, destination)
            except FileExistsError:
                pass
            else:
                raise RuntimeError("Recovery operation overwrote an existing file")
        if _digest(backup) != before_backup or _digest(restored) != before_restore:
            raise RuntimeError("Refused overwrite changed a recovery artifact")
        if os.name == "posix":
            for path in (backup, restored):
                if stat.S_IMODE(path.stat().st_mode) != 0o600:
                    raise RuntimeError("Recovered synthetic data is not owner-only")

        return {
            "integrity": expected["integrity"],
            "memos": expected["memos"],
            "revisions": expected["revisions"],
            "full_history_verified": True,
            "snapshot_isolation_verified": True,
            "exclusive_publish_verified": True,
        }


def main():
    if len(sys.argv) != 1:
        raise SystemExit("Synthetic drill accepts no database paths or arguments")
    result = run_synthetic_recovery_drill()
    print("Synthetic recovery drill PASS: "
          f"{result['memos']} fictional memos; "
          f"{result['revisions']} revisions; "
          "snapshot isolation, non-overwrite and permissions verified")


if __name__ == "__main__":
    main()
