# GoreeCloud Memos — Backup and Recovery

**Development preview.** These procedures preserve the complete SQLite memo and revision database. They are not a substitute for encrypted, regularly tested production backups. Use only on a local authorized copy of your own data.

## Create a consistent backup

The normal server can remain running. The backup command uses SQLite's online backup API to take a consistent snapshot, including revisions and uncheckpointed WAL transactions.

```bash
python3 server/maintenance.py backup ./data/memos.sqlite3 ./backups/memos-2026-11-05.sqlite
python3 server/maintenance.py verify ./backups/memos-2026-11-05.sqlite
```

Create the destination directory beforehand; the command does not overwrite any existing file. Both backup and restore now reject symbolic links or non-directory components anywhere in an existing destination parent path, as well as an existing or dangling linked target; the refusal occurs before creating a temporary snapshot. This is a static-path safeguard for a trusted local operator, not race-proof against adversarial concurrent directory swaps. New backup files have owner-only (0600) permissions on POSIX systems. Never commit database files to GitHub, and encrypt backups before exporting to an untrusted location.

## Memo creation retry ledger

New SQLite stores have a `memo_create_requests` table for optional UUIDv4 memo-create and source-scoped duplicate idempotency. Earlier databases without this table remain valid and gain it automatically when opened by the updated development API. Backup and restore copy its state atomically with the memos and revision tables. The read-only verifier checks the optional ledger's columns, primary key and memo references if present, rejecting corrupted or orphaned retry records before publishing a backup.

The ledger records expire after seven days on subsequent keyed creates. A restored old snapshot with expired entries does not guarantee replay deduplication. A v2 plaintext JSON export intentionally omits the ledger and is **not** a byte-for-byte SQLite recovery substitute. Keep the original database for recovery and verify a freshly restored copy before switching paths.

## Restore without overwriting existing data

**Stop the server before switching databases.** The restore command intentionally refuses to replace an existing file.

```bash
python3 server/maintenance.py restore ./backups/memos-2026-11-05.sqlite ./data/recovered.sqlite3
python3 server/maintenance.py verify ./data/recovered.sqlite3
```

After verifying memo counts and opening the recovered database with the server, switch to the recovered database through the server's --db option. Preserve the original database and its associated WAL files until the restore is independently validated. Do not rename or delete active SQLite files during runtime.

## Restore a single memo's earlier text without losing newer history

On the authorized local CLI, inspect a memo's version and prior revisions before selecting the source revision:

```bash
python3 cli/memos.py show MEMO-UUID
python3 cli/memos.py history MEMO-UUID
python3 cli/memos.py restore-revision MEMO-UUID --version 1
```

The `restore-revision` operation fetches the current memo and prior revisions through the existing authenticated API, then submits a normal version-guarded PATCH with the older title/content. It creates a **new** current memo version and keeps the intervening history intact. The previous memo's color, pin, archive and trash state are left unchanged. Missing revisions, invalid UUIDs and nonpositive versions are rejected before any write; a concurrent edit returns HTTP 409 instead of being overwritten. This command **does change the selected memo** and should be run intentionally after reviewing the history. It does not restore attachments, metadata, tags independent of content, or the whole database.

## JSON export

GET /api/v1/export (or CLI `export`) produces format `goreecloud-memos-v2`, including all memos and all text revision history in one coherent SQLite snapshot. The normal home feed remains limited to 2,000 results; export is not. JSON export is plaintext and not a database-level hot backup. The browser Export button explicitly warns and asks for confirmation before retrieving/downloading the full plaintext archive. Browser-managed downloads do not use the CLI's private POSIX file-creation safeguards; secure the download destination and encrypt before sharing.

For an owner-only JSON file on POSIX systems, prefer the CLI's explicit file-output mode:

```bash
mkdir -p ./backups
python3 cli/memos.py export --output ./backups/memos-export.json
```

The command refuses existing destination files and symlinks, writes to a temporary `0600` file in the destination directory, flushes the content, and exclusively publishes it before syncing the directory. Failed writes clean temporary files; failure after publication triggers best-effort removal of only the new export. It does **not** encrypt the plaintext. Create an appropriately private parent directory and encrypt data before any off-device transfer.

For compatibility, `python3 cli/memos.py export` still prints JSON to standard output. Shell redirection (`> export.json`) may create a group- or world-readable file under common umasks; it bypasses the private-file safeguards. The new `--output` mode is opt-in and only supported on POSIX.

## Disposable recovery drill (no personal database)

To rehearse the full backup and restore path **without reading, writing, or requiring any existing memo database**, run:

```bash
python3 server/recovery_drill.py
```

This argument-free command creates a private temporary directory with **two fictional memos and two revisions**. It verifies the source, publishes a consistent SQLite backup without overwriting, updates the disposable source *after* its snapshot, restores the snapshot to a new destination, compares every recovered memo and historical revision, and checks source/snapshot isolation. It also verifies that repeat backup/restore operations refuse existing destinations without altering their contents; on POSIX, recovered files must be mode `0600`. The temporary directory is cleaned up even if a drill step fails. The result prints only fictional record counts and pass/fail status.

The same drill is run in the GitHub **Memos CI** workflow alongside unit tests. This is an **automated local rehearsal with synthetic data**, not a scheduled backup job, an off-host restore, production data-loss guarantee, encryption, crash-injection test, or disaster-recovery certification. It accepts **no paths or credentials** and must never be used to judge an actual operator database without separately authorized verification.

## Safety principles

- Backups and restores are non-overwriting: existing destinations fail closed. The completed SQLite copy is flushed before its final name is published using an exclusive hardlink; on POSIX hosts the parent directory is also flushed. A failed file flush leaves no destination, and a failed directory flush triggers best-effort cleanup of the helper's own newly published link. Recovery after a sudden kernel or hardware failure still requires real-world validation.
- The tools check SQLite integrity, required `memos` and `revisions` columns, each required column's canonical SQLite declared type and explicit `NOT NULL` requirement, the `memos(id)` and `revisions(memo_id, version)` primary-key constraints, and revision-to-memo consistency before backup, restore, and verify. A structurally altered type or missing required nullability constraint fails closed before a backup or restore artifact is published. Missing or reordered primary keys fail closed even when all expected columns are present and SQLite's page integrity check is `ok`. Orphaned revisions, nonpositive revision versions, and history revisions that are not older than their current memo version are rejected. Every memo must have a contiguous prior-version history (versions 1 through its current version minus 1); missing initial or intermediate revisions also cause rejection. This is structural and logical validation, not proof that historical text is authentic.
- Both the source and destination are opened using SQLite APIs to preserve a coherent snapshot.
- Backup/restore is a local administrative operation, not an internet-accessible API.
- The development CI performs a disposable synthetic recovery rehearsal, but there is **no scheduled production backup**, retention policy, encryption, upload scheduling, cross-host durability or real-data disaster-recovery drill.
- Development tests exercise committed, uncheckpointed SQLite WAL content in online backup and restore, including revision history. An additional **bounded synthetic concurrent-writer regression** takes five online backups while a separate thread advances one fictional memo through 50 revisions; it restores each backup and verifies coherent counts, complete historical versions, and snapshot text. Thread scheduling does not guarantee a write occurs during the internal page-copy operation. This is not a production load, crash, or multi-writer test.
- Before any production release, test backup/restore under concurrent edits, disk exhaustion, process crashes, and version migrations; set retention, encrypted off-host replication and monitoring.
