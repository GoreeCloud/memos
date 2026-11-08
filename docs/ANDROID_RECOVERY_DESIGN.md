# Native Android Memos — Private Recovery Design and Release Gates

**Status:** Proposed architecture plus an **unexposed encryption-envelope prototype**, not a user-facing backup, migration, export, import or restore feature. Reviewed against the November 8, 2026 native source. [Android release issue #52](https://github.com/GoreeCloud/memos/issues/52) is OPEN.

## Why this gate matters

Native Android Memos currently saves notes and prior revisions only in a single app-private SQLite database. Automatic cloud backup, Android device transfer and network access are deliberately disabled. Uninstalling or clearing application data can permanently lose notes. The existing **LOCAL ONLY · NO BACKUP** warning must remain visible until the entire export/restore process has been independently tested. The current corruption handler preserves damaged bytes but cannot repair them.

**Scope:** user-initiated, explicitly consented, private, portable encrypted offline backup and safe restore. No vendor cloud storage account, telemetry, network permission or automatic sync. A user may *choose* their own documents provider through Android's Storage Access Framework (SAF); that does not authorize scanning other files or silently syncing with any cloud provider.

## Governing responsibilities

- **GoreeShield — privacy:** consent, explicit picker, no implicit sharing, data minimization and retention, no content, URI or passphrase logging; warn users the selected provider and their passphrase practices affect privacy.
- **Wardveil — cybersecurity:** authenticated encryption, KDF cost/bounds, parsing limits, key lifetime, hostile-file testing, corrupted-input and interrupted-write behavior, dependency review and upgrade/recovery drills.
- **GoreeCloud Mesh — integration:** no sync contract or cross-device identity claim until separately specified, consented, implemented and verified.
- **GoreeCloud UI — design:** use verified shared semantic tokens, accessible large-text confirmation, precise recovery feedback and existing **Not available yet** buttons during staged work.

## Crypto foundation presently in source

`clients/android/app/src/main/java/com/goreecloud/memos/BackupEnvelope.kt` is an **internal, unused** proof using standard Android/JDK crypto providers with no added dependency. Its provisional version-1 binary envelope is:

```text
ASCII "GCMEMO1\n" (8 bytes)
PBKDF2-HMAC-SHA256 iteration count, unsigned-format positive big-endian 32-bit (4 bytes)
Cryptographically random salt (16 bytes)
Cryptographically random AES-GCM nonce (12 bytes)
AES-256-GCM ciphertext followed by 128-bit tag (variable size)
```

The full 40-byte header is authenticated as AEAD associated data, and plaintext is returned only after GCM tag verification. The proof **currently writes 600,000 KDF iterations** and rejects reading any value outside 250,000–2,000,000. Envelopes larger than an 8 MiB plaintext plus overhead, empty payloads and invalid format versions are rejected, never truncated. Length and KDF bounds are checked before deriving a key. Caller passphrase arrays remain caller-owned; temporary derivation buffers are cleared where Java APIs allow. This does not constitute zeroization of every JVM/provider copy or a certified cryptographic implementation.

**Explicit limitations:** no real memo serialization, no file picker, no file writing, no snapshot of SQLite `revisions`, no password collection UI, no restore, no database swap, no app-level KDF interoperability test between independently implemented platforms, no streaming/large backup support, and no key recovery if a passphrase is forgotten. The class must not be marketed as a completed backup. Its unit tests use invented byte sequences and synthetic passphrases, never real notes. A further QEMU-only AndroidJUnit4 check tests authenticated roundtrip/tamper rejection through Android's platform crypto provider; it never opens an actual memo or user-selected file.

## In-memory snapshot checkpoint (not yet a backup)

A new internal prototype reads a consistent SQLite transaction of every memo and prior revision row, including deleted/archived notes, and checks quick integrity and foreign keys. An internal canonical versioned binary codec validates UTF-8, unique sorted IDs, contiguous history, supported flags, total count and 8 MiB experimental memory bounds; it can be passed to the previously verified unexposed encryption envelope **without** writing any file. Synthetic JVM and Android QEMU tests exercise this composition. These checks are intentionally **fail closed** on large or inconsistent datasets and cannot produce a partial "successful" export. **No user-facing export or restore exists**; platform SAF, stream/output durability, staged restore, authentication/portability reviews and adversarial full recovery remain open.

## Design required before activation

1. **Threat model and format review.** Document what user data is in scope (memos, revision history, tags derived from content, timestamps, version and deletion flags) and exclusions. Establish canonical encoding, metadata version, Unicode normalization, schema compatibility, maximum dataset size, parse-depth and entry-count quotas. Benchmark KDF on low-end Android hardware, with bounded CPU/memory and clear progress/cancel behavior. Review cryptographic implementation and portability against a *separate* reference implementation. Never introduce custom unauthenticated encryption or a plaintext fallback.
2. **Consistent snapshot.** Export the complete private memo dataset **including revision history** within one readable SQLite snapshot/transaction, with bounds before allocation. Ensure foreign keys and version relations are validated. Encrypt before requesting a final user-selected file. Do not write plaintext to public/shared storage or to application logs. If temporary private staging is unavoidable, apply documented encryption, permissions, lifecycle cleanup, and failure handling.
3. **User-chosen file location.** Initiate SAF `ACTION_CREATE_DOCUMENT` for export, `ACTION_OPEN_DOCUMENT` for import, with explicit content descriptions and a truthful private-backup warning. No broad `READ_EXTERNAL_STORAGE` or storage-management permission is required for ordinary SAF selections. An external documents provider may store data remotely; communicate that before the user chooses. A cancelled picker performs no mutation.
4. **Write integrity and interruption.** Never claim export success until a finished encrypted file is written, closed and read back or checked through documented provider guarantees. Handle provider exceptions, a revoked URI grant, interrupted writes, insufficient space and invalid output; do not overwrite an existing backup silently.
5. **Restore by staging, never direct overwrite.** Bound file size and KDF before work, fully authenticate and parse hostile input without acting on any unauthenticated bytes, validate schema/foreign keys/row constraints, and build a **new randomly named app-private SQLite database**. Verify `integrity_check`, `foreign_key_check`, counts, revision references and expected data before presenting a summary. Require explicit user choice to keep existing notes, merge (after conflict rules) or replace (after a **verified** backup). Test transactional install and rollback across process termination. Never silently delete the original database or import directly into it.
6. **Adversarial QA.** Use only disposable Android 35 QEMU test instances (attested by existing CI plus a test-specific opt-in). Include wrong passphrase, bit-flipped headers/salt/tag/data, truncation, over-large inputs, invented malicious JSON/SQLite, duplicate IDs, version incompatibility, Unicode, timestamps, refusal, cancel, app process death, device storage exhaustion and repeated export/restore cycles. Prove zero real-note access and no unnecessary permissions. Screen-reader/high zoom and mockup parity remain separate manual visual gates.
7. **Release and documentation.** A user-visible backup button becomes functional only after end-to-end encrypted snapshot + SAF export + import + verified restore and privacy acceptance pass. Until then it must say **Not available yet**. Keep issue #52 open, verify signing and the standalone release APK via authorized `GoreeCloud/Artifacts` Drive readback, and never label a debug APK production-ready.

## Primary platform reference

[Android Storage Access Framework — documents and files](https://developer.android.com/training/data-storage/shared/documents-files): system picker is user-driven and document access does not require broad system storage permissions.

**Release classification:** architecture/design and isolated cryptographic building block, **not an implemented user data recovery path**. Any production use requires review, tested staged restore, and an independently verified successful recovery.
