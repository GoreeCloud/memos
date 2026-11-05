# GoreeCloud Memos — Backup and Recovery

**Development preview.** These procedures preserve the complete SQLite memo and revision database. They are not a substitute for encrypted, regularly tested production backups. Use only on a local authorized copy of your own data.

## Create a consistent backup

The normal server can remain running. The backup command uses SQLite's online backup API to take a consistent snapshot, including revisions and uncheckpointed WAL transactions.

```bash
python3 server/maintenance.py backup ./data/memos.sqlite3 ./backups/memos-2026-11-05.sqlite
python3 server/maintenance.py verify ./backups/memos-2026-11-05.sqlite
```

Create the destination directory beforehand; the command does not overwrite any existing file. New backup files have owner-only (0600) permissions on POSIX systems. Never commit database files to GitHub, and encrypt backups before exporting to an untrusted location.

## Restore without overwriting existing data

**Stop the server before switching databases.** The restore command intentionally refuses to replace an existing file.

```bash
python3 server/maintenance.py restore ./backups/memos-2026-11-05.sqlite ./data/recovered.sqlite3
python3 server/maintenance.py verify ./data/recovered.sqlite3
```

After verifying memo counts and opening the recovered database with the server, switch to the recovered database through the server's --db option. Preserve the original database and its associated WAL files until the restore is independently validated. Do not rename or delete active SQLite files during runtime.

## JSON export

GET /api/v1/export (or CLI `export`) produces format `goreecloud-memos-v2`, including all memos and all text revision history in one coherent SQLite snapshot. The normal home feed remains limited to 2,000 results; export is not. JSON export is plaintext and not a database-level hot backup.

## Safety principles

- Backups and restores are non-overwriting: existing destinations fail closed. The completed SQLite copy is flushed before its final name is published using an exclusive hardlink; on POSIX hosts the parent directory is also flushed. A failed file flush leaves no destination, and a failed directory flush triggers best-effort cleanup of the helper's own newly published link. Recovery after a sudden kernel or hardware failure still requires real-world validation.
- The tools check SQLite integrity, required `memos` and `revisions` columns, and revision-to-memo consistency before backup, restore, and verify. Orphaned revisions, nonpositive revision versions, and history revisions that are not older than their current memo version fail closed even if SQLite's underlying integrity check reports `ok`. Every memo must have a contiguous prior-version history (versions 1 through its current version minus 1); missing initial or intermediate revisions also cause rejection. This is structural and logical validation, not proof that historical text is authentic.
- Both the source and destination are opened using SQLite APIs to preserve a coherent snapshot.
- Backup/restore is a local administrative operation, not an internet-accessible API.
- This milestone does not implement automation, retention policy, encryption, upload scheduling, cross-host durability, or disaster recovery drills.
- The development tests exercise committed, uncheckpointed SQLite WAL content in online backup and restore, including revision history. This is not a concurrent-writer stress test.
- Before any production release, test backup/restore under concurrent edits, disk exhaustion, process crashes, and version migrations; set retention, encrypted off-host replication and monitoring.
