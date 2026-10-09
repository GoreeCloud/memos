# Backup and Recovery

GoreeCloud Memos treats **personal archive portability** and **operational instance recovery** as separate responsibilities.

The personal Memos export/import archive is useful for user-owned memo portability and has clean-target round-trip acceptance in this fork. It is **not** a complete server backup and must not be represented as one.

## Current operational state

Automated full-instance backup, scheduled restore orchestration, retention, off-device replication, encryption-at-rest for backup artifacts, integrity scheduling, and complete all-backend clean-target operational recovery are **not yet implemented or accepted** in this rebuild line. A bounded SQLite database-snapshot command is available, and a separate bounded SQLite + relative managed-local attachment bundle now captures every relative `LOCAL` attachment referenced by the exact snapshot. Neither artifact is a complete instance backup because S3 objects, deployment configuration, reusable secrets, and absolute-path LOCAL attachments remain outside their scope.

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

The current Development line now proves one bounded SQLite/local recovery path: when LOCAL attachment storage uses a relative template under the instance data directory, new attachment rows persist data-directory-relative references; a clean target can restore the SQLite snapshot plus the referenced local file at the same relative path and serve the exact bytes through the authenticated file route. Explicit administrator-configured absolute templates remain absolute and require path-specific recovery planning.

This is still not an automated full SQLite/local backup implementation. A complete implementation must inventory and capture every managed local attachment required by the snapshot, include a machine-readable manifest, handle explicitly external absolute paths, and validate the complete restored set rather than one representative file.



## SQLite database snapshot primitive

memos snapshot sqlite --data <data-dir> --output <new-file.db> creates a transactionally consistent SQLite database snapshot with VACUUM INTO, verifies the result with PRAGMA quick_check, and writes an owner-only <new-file.db>.manifest.json sidecar.

Safety properties:

- the source must be explicit through --data or --dsn;
- the destination must not already exist;
- the command never overwrites the live database or an existing snapshot;
- the destination is atomically reserved before snapshot creation with owner read/write permissions (0600) where the host filesystem supports POSIX modes;
- committed WAL-backed state is included by SQLite's snapshot operation;
- the sidecar records schema version, creation time, exact application version/commit, snapshot byte size, SHA-256 digest, successful SQLite quick-check state, and an explicit included/excluded recovery-scope matrix;
- an existing manifest path fails preflight before snapshot creation;
- snapshot or manifest failures remove the incomplete artifact set; and
- command output and the manifest state that the artifact is database-only.

The snapshot includes database-backed attachments because their bytes live in database rows. It does **not** capture managed local attachment files, S3 objects, deployment configuration, or runtime secret material. Those remain required for full-instance recovery.

## SQLite + relative managed-local recovery bundle

`memos snapshot sqlite-local --data <data-dir> --output <new-bundle-dir>` creates a bounded recovery bundle for SQLite deployments whose managed LOCAL attachment references are relative to the instance data directory. An explicit `--dsn` may be supplied when the SQLite database itself is not at the default data-directory path.

The bundle is staged in a temporary sibling directory and is published only after all required files and manifests succeed. It contains:

- `memos.db`, created with the same transactionally consistent SQLite snapshot primitive;
- `memos.db.manifest.json`, preserving the database-only artifact identity and integrity record;
- `local-files/`, containing the exact relative file tree required by every `LOCAL` attachment row in that snapshot; and
- `bundle-manifest.json`, recording exact application version/commit, database artifact identity, every attachment UID, filename, normalized relative reference, bundle path, byte size, and SHA-256 digest, plus distinct referenced-byte and physically stored-byte totals.

Safety properties:

- every relative LOCAL reference is read from the completed snapshot rather than from a separate live query;
- missing files fail the entire staged bundle;
- a database/file size mismatch fails the bundle;
- non-canonical, traversal, absolute, or data-directory-escaping references fail closed;
- symlink resolution is checked so a reference cannot silently escape the instance data directory;
- copied files and manifests are owner-only (`0600`) where POSIX modes apply;
- duplicate attachment rows that reference the same file reuse one bundled copy while preserving per-attachment manifest entries; and
- the final destination must not already exist.

The bundle deliberately does not copy administrator-configured absolute LOCAL paths because their recovery mapping is deployment-specific and cannot be safely inferred. It also excludes S3 objects, deployment/runtime configuration, and reusable secret material. Those exclusions remain mandatory recovery work.


## SQLite + relative managed-local clean-target restore

`memos restore sqlite-local --bundle <bundle-dir> --data <new-data-dir>` restores an existing verified bounded bundle into a target data directory that must not already exist.

The command:

- runs the existing strict `verify-sqlite-local` checks before any restore staging;
- rejects a target inside the source bundle and rejects any existing target file or directory;
- stages the restore in a private sibling directory and atomically publishes only after every required artifact succeeds;
- copies the verified SQLite artifact to the default `memos_prod.db` path with owner-only file permissions;
- restores each unique relative managed-local file to its recorded data-directory-relative path;
- rechecks copied byte counts and SHA-256 digests and runs a fresh SQLite `PRAGMA quick_check` on the staged database; and
- leaves the target absent when verification or staged restore fails.

This is bounded restore tooling for the default SQLite + relative managed-local path. It does **not** restore S3 objects, administrator-configured absolute LOCAL references, deployment/runtime configuration, reusable secrets, scheduled generations, or off-device copies. Operators must restore those separately before making a full-instance recovery claim.

## Standalone bundle integrity verification

`memos snapshot verify-sqlite-local --bundle <bundle-dir>` verifies an existing bounded SQLite + relative managed-local recovery bundle without restoring or mutating it. This is intended for post-copy/off-host integrity checks and pre-restore evidence.

The verifier fails closed unless all of the following remain internally consistent:

- `bundle-manifest.json` uses the supported schema/artifact identity and retains the explicit included/excluded scope boundary;
- `memos.db` matches the manifest byte size and SHA-256 and passes a fresh SQLite `PRAGMA quick_check`;
- `memos.db.manifest.json` matches the bundle's database and application identity and records a successful quick-check;
- every manifest attachment UID, filename, size, and relative reference matches the exact SQLite snapshot row;
- every bundled attachment path is canonical, relative, free of symbolic-link components, present as a regular file, and matches the recorded size and SHA-256;
- attachment count, unique-file count, referenced bytes, and physically stored bytes recompute to the manifest values; and
- `local-files/` contains no unexpected regular files beyond those represented by the manifest.

JSON decoding rejects unknown fields and trailing data. Verification establishes artifact integrity and internal consistency only; it does not cryptographically authenticate bundle origin, because a writer who can replace the bundle and recompute its unsigned manifests can produce a different internally consistent artifact. Verification also does not reconstruct a data directory, restore S3 objects, map absolute LOCAL references, apply deployment configuration, recover reusable secrets, schedule generations, enforce retention, or constitute a full restore workflow.

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
- scheduled and multi-generation integrity verification beyond the implemented SQLite snapshot manifests and standalone bounded sqlite-local bundle verifier;
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
- separate process liveness (/healthz) and database-backed readiness (/readyz);
- personal memo archive clean-target portability, including attachment bytes carried by that archive;
- a bounded SQLite database snapshot primitive plus automated clean-target boot/readiness/data-preservation acceptance for that database artifact, including explicitly database-backed attachment bytes;
- a bounded SQLite + relative managed-local recovery bundle that inventories, copies, size-checks, and SHA-256 records every relative LOCAL file referenced by the exact snapshot;
- a standalone fail-closed verifier for that bundle, rechecking manifest/schema boundaries, database SHA-256 and SQLite quick-check state, exact attachment-row correspondence, per-file hashes/sizes/path containment, aggregate counts/bytes, and unexpected-file absence;
- clean-target recovery acceptance for the relative managed-local storage model, including representative served bytes after relocation; and
- explicit source/documentation boundaries that keep S3, external absolute local paths, deployment configuration, secret authority, scheduling, retention, off-device copies, and full operational backup/recovery unclaimed.

These pieces are recovery foundations. They do not constitute automated backup, full-instance restore, disaster-recovery acceptance, Everkeep acceptance, Production Acceptance, Seal, or Anchor qualification.
