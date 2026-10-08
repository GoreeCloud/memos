# Backup and Recovery

GoreeCloud Memos treats **personal archive portability** and **operational instance recovery** as separate responsibilities.

The personal Memos export/import archive is useful for user-owned memo portability and has clean-target round-trip acceptance in this fork. It is **not** a complete server backup and must not be represented as one.

## Current operational state

Automated full-instance backup, restore orchestration, retention, off-device replication, encryption-at-rest for backup artifacts, integrity scheduling, and clean-target operational restore are **not yet implemented or accepted** in this rebuild line. A bounded SQLite database-snapshot command is available as a recovery building block; it is not a complete instance backup.

GoreeCloud Memos therefore remains Development/nonconformant for operational recovery.

## Authoritative state that recovery must cover

A complete operational recovery design must account for all applicable state below.

| State | Current authority | Recovery requirement |
| --- | --- | --- |
| Application database | SQLite, PostgreSQL, or MySQL | Back up a transactionally consistent database state and prove it can be restored. |
| Database-backed attachments | Attachment blob rows | Covered by the database backup, with post-restore attachment validation. |
| Managed local attachments | Local files referenced by attachment rows | Preserve the referenced files together with database identity and validate that every restored reference resolves. |
| Managed S3 attachments | S3 objects identified by storage configuration and attachment payload | Preserve object data plus the configuration needed to resolve it; do not assume a database-only backup contains the bytes. |
| External-link attachments | External URL/reference | Preserve the database reference; availability of the external resource is outside the server backup unless separately governed. |
| Instance settings | Database-backed instance settings and deployment-provided overrides | Preserve database settings and separately preserve deployment configuration that can shadow or replace them. |
| Secrets and provider credentials | Deployment/runtime secret authority | Back up or escrow through the governing secret-management process; never place reusable secrets into ordinary repository files or ordinary documentation. |
| Release/configuration identity | Application version, deployment configuration, storage topology, database driver | Record enough manifest information to reconstruct a compatible restore target and detect mismatched topology. |

## SQLite and local-file boundary

The default self-hosted path uses SQLite and can use managed local attachments under the configured data directory. That is a useful first recovery target, but a safe backup cannot be reduced to copying the SQLite file alone:

- SQLite may use WAL state while the service is active.
- Managed local attachments can exist outside database pages.
- The local attachment path template is configurable and can resolve outside the default data directory when explicitly configured.
- Deployment-provided settings may not be stored in the database.
- A successful file copy does not prove that the resulting target starts, passes readiness, or serves every expected attachment.

Any future SQLite/local backup implementation must create a consistent database snapshot, capture every managed local attachment required by that snapshot, include a machine-readable manifest, and validate restoration into a clean target.



## SQLite database snapshot primitive

memos snapshot sqlite --data <data-dir> --output <new-file.db> creates a transactionally consistent SQLite database snapshot with VACUUM INTO and verifies the result with PRAGMA quick_check.

Safety properties:

- the source must be explicit through --data or --dsn;
- the destination must not already exist;
- the command never overwrites the live database or an existing snapshot;
- newly created snapshot files are restricted to owner read/write permissions (0600) where the host filesystem supports POSIX modes;
- committed WAL-backed state is included by SQLite's snapshot operation;
- a failed integrity check removes the incomplete output; and
- command output states that the artifact is database-only.

The snapshot includes database-backed attachments because their bytes live in database rows. It does **not** capture managed local attachment files, S3 objects, deployment configuration, or runtime secret material. Those remain required for full-instance recovery.

## S3 boundary

S3-backed attachment bytes are not contained in the Memos database. Operational recovery for an S3-backed instance therefore requires coordinated object preservation and restore evidence in addition to database recovery.

GoreeCloud Memos must not claim full-instance recovery for S3 deployments until object inventory, integrity, credentials/configuration recovery, destination reconstruction, and clean-target verification are implemented and tested.

## Restore acceptance requirements

A future operational restore is accepted only when a clean target can prove, at minimum:

1. the restored database opens and schema state is compatible;
2. `/readyz` succeeds against the restored database;
3. user/account and authorization state expected to survive recovery is present;
4. memo counts and representative memo content/state are correct;
5. database-backed attachments can be read;
6. every managed local attachment reference resolves to the expected bytes;
7. every managed S3 attachment expected by the restored database resolves through the restored storage configuration;
8. instance settings and deployment overrides are reconstructed as intended;
9. recovery logs do not expose memo content or reusable secrets unnecessarily; and
10. the test records the exact source revision, backup artifact identity, restore target, and verification evidence.

## Integrity and retention requirements

Operational backup work remains incomplete until GoreeCloud defines and validates:

- scheduled execution;
- multiple recoverable generations;
- integrity verification;
- encryption and protected key handling where applicable;
- retention policy;
- off-device or failure-domain-separated copies;
- restore-test cadence;
- failed-backup and failed-restore visibility;
- storage-capacity and stale-backup diagnostics; and
- documented rollback/recovery procedures.

## Current evidence

The current repository establishes only these bounded pieces:

- private-first initialization;
- separate process liveness (`/healthz`) and database-backed readiness (`/readyz`);
- personal memo archive clean-target portability, including attachment bytes carried by that archive; and
- explicit source/documentation boundaries that keep operational backup/recovery unclaimed.

These pieces are recovery foundations. They do not constitute automated backup, full-instance restore, disaster-recovery acceptance, Everkeep acceptance, Production Acceptance, Seal, or Anchor qualification.
