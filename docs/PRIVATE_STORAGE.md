# GoreeCloud Memos — Private Local SQLite Provisioning

**Development-only safeguard, not production hardening.** The legacy `server/app.py` startup can still create a database using the host process's default filesystem permissions. On a trusted POSIX host, prefer this opt-in **private server launcher**, which validates the token, provisions local storage, restricts new files with a `077` umask, and binds to numeric IPv4 loopback only:

```bash
export GOREE_MEMOS_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(36))')"
python3 server/serve_private.py --db ./data/memos.sqlite3
```

The launcher uses the existing provisioning helper to create an owner-only `0700` final data directory and an empty, exclusively created `0600` database file. On a **newly created** file, the existing server initializes SQLite tables. On an **existing** file, the launcher first performs read-only integrity, schema, and complete revision-history checks; invalid data is rejected **before** the server can recreate missing tables. For a manual two-step setup, you may still run `python3 server/private_storage.py ./data/memos.sqlite3` before starting the legacy server; the old server entrypoint does not automatically enforce the private-file restrictions.

## Existing files and failure behavior

- An existing `0600` regular database inside an owner-only data directory is verified for expected SQLite schema and complete revision history before serving. A corrupt, uninitialized, or incomplete existing file is **rejected without schema modification**. This includes a zero-byte file previously created by the standalone `private_storage.py` helper; use the private launcher directly for a fresh database, or initialize the manually precreated file through the separate legacy setup path before switching to the launcher.
- An existing database or directory that grants group/other permissions is **rejected without changing ownership, contents, or permissions**. Inspect and remediate intentionally through a separate authorized operating procedure. The helper never calls `chmod` on existing data.
- Database-file and final-directory symlinks are refused. Atomic exclusive file creation prevents replacing an existing database.
- The helper supports POSIX permissions; unsupported platforms fail closed instead of claiming privacy.
- The directory itself may be new, but the helper does not initialize or migrate SQLite schema. An empty precreated file is not a recoverable backup.

This guard checks common Unix permission bits on the final directory and database; it does not audit all ancestor directories, POSIX ACLs, user identities, storage mounts, encryption, malware, or actual network exposure. SQLite `-wal` and `-shm` sidecars may also contain sensitive content and must be protected by OS permissions and an appropriate private directory. A file mode alone cannot prevent a privileged host process from reading data.

**Not encrypted at rest.** Use full-disk encryption and controlled backups. Continue to bind the development server to loopback; this provisioning command does not provide user-scoped authentication, authorization, TLS, brute-force controls, token rotation, or multi-tenant separation.

See [security boundaries](SECURITY.md) and [backup and recovery](BACKUP_AND_RECOVERY.md). Production deployment remains blocked pending complete independent security and recovery verification.
