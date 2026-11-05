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

- Backups and restores are never destructive in this implementation: existing destinations fail closed.
- The tools check SQLite integrity and expected GoreeCloud Memos schema before backup, restore, and verify.
- Both the source and destination are opened using SQLite APIs to preserve a coherent snapshot.
- Backup/restore is a local administrative operation, not an internet-accessible API.
- This milestone does not implement automation, retention policy, encryption, upload scheduling, cross-host durability, or disaster recovery drills.
- Before any production release, test backup/restore under concurrent edits, disk exhaustion, process crashes, and version migrations; set retention, encrypted off-host replication and monitoring.
