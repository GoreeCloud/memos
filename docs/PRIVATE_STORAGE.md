# GoreeCloud Memos — Private Local SQLite Provisioning

**Opt-in development safeguard, not automatic hardening.** The normal `server/app.py` startup can still create a database using the host process's default filesystem permissions. On a trusted POSIX machine, precreate a private database before the first server launch:

```bash
python3 server/private_storage.py ./data/memos.sqlite3
export GOREE_MEMOS_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(36))')"
python3 server/app.py --host 127.0.0.1 --db ./data/memos.sqlite3
```

The helper creates an owner-only `0700` final data directory and an empty, exclusively created `0600` database file. The server initializes the SQLite tables when started against the same path.

## Existing files and failure behavior

- An existing `0600` regular database inside an owner-only data directory is left untouched. Repeated runs can check its basic permission mode.
- An existing database or directory that grants group/other permissions is **rejected without changing ownership, contents, or permissions**. Inspect and remediate intentionally through a separate authorized operating procedure. The helper never calls `chmod` on existing data.
- Database-file and final-directory symlinks are refused. Atomic exclusive file creation prevents replacing an existing database.
- The helper supports POSIX permissions; unsupported platforms fail closed instead of claiming privacy.
- The directory itself may be new, but the helper does not initialize or migrate SQLite schema. An empty precreated file is not a recoverable backup.

This guard checks common Unix permission bits on the final directory and database; it does not audit all ancestor directories, POSIX ACLs, user identities, storage mounts, encryption, malware, or actual network exposure. SQLite `-wal` and `-shm` sidecars may also contain sensitive content and must be protected by OS permissions and an appropriate private directory. A file mode alone cannot prevent a privileged host process from reading data.

**Not encrypted at rest.** Use full-disk encryption and controlled backups. Continue to bind the development server to loopback; this provisioning command does not provide user-scoped authentication, authorization, TLS, brute-force controls, token rotation, or multi-tenant separation.

See [security boundaries](SECURITY.md) and [backup and recovery](BACKUP_AND_RECOVERY.md). Production deployment remains blocked pending complete independent security and recovery verification.
