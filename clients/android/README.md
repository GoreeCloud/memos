# GoreeCloud Memos — Native Android Local Preview

**Status: new, original native Android reconstruction in development.** The earlier reported November 7, 2026 laptop-only prototype could not be located in scoped source searches and has **not** been recovered. This is independently authored Kotlin/Jetpack Compose source, not a claim that the missing earlier files were restored. Do not publish or install until the source, Android build, tests, package and platform release gates are verified.

## What this preview does

- A real native Kotlin/Jetpack Compose Android activity (not a WebView).
- Creates, opens, edits, pins, archives, soft-deletes/restores, and duplicates notes **locally on this Android device**.
- Persists memos in an **app-private SQLite database** with a history row for each changed previous version. Rejects concurrent-version overwrites and validates title/body/color limits.
- Searches memo headings/bodies, extracts hashtags, filters pinned/archive/trash, groups chronological dates correctly around DST transitions, and displays pastel, variable-height cards using a Compose staggered grid.
- Applies source-verified GoreeCloud UI Iris light/dark semantic colors and note-card color values from `GoreeCloud/gc-ui` and `GoreeCloud/memos/web/style.css`.
- Keeps unsaved editor data only in composable state. If users discard changes or the app process is killed, **unsaved text may be lost**; there is no draft recovery or synchronization yet.
- Shows visible controls for attachments, reminders, sharing, Sync, settings, preview and related future capabilities. They display **“Not available yet”** instead of feigning support.
- Native header consistently says **“LOCAL ONLY · NO BACKUP”**, while **More → Local data & backups** opens a real dialog explaining the absence of sync/export/restore and risk of losing local notes after app-data clearing or uninstall. Quick-save confirmation also discloses that there is no backup. This is an honesty/usability improvement, **not** a backup implementation or proof of Android screen-reader/device behavior.

## Privacy / security boundaries

**This is a separate, local-only preview; it does not connect to or migrate notes from the existing Memos web/API SQLite store.** There is no INTERNET permission, account system, authentication, sync, collaboration, background service, camera, audio, location, storage, contacts or notification permission. `android:allowBackup=false` and `android:fullBackupContent=false`; Android 12+ cloud/device-transfer exclusions are explicit and cross-platform transfer is not enabled; Android cleartext traffic is disabled and no exported components other than the launcher activity exist. The app-private database is **not encrypted at the application layer**. Do not treat it as a secure vault, disaster-recovery system, full conflict-resolution implementation or proven multi-device storage. Uninstalling the app or clearing Android application data can permanently delete its memos. No off-device export/restore is implemented.

The Android package name is `com.goreecloud.memos`; the debug APK is **not a release deliverable** without independent build, signing, device and owner-required Google Drive/Artifacts delivery verification. This code does not replace the existing web or Linux client.

## Build and test

Use an Android SDK with platform 36, JDK 21 and Gradle 9.7.1 or the compatible installed distribution. From the repository root:

```bash
gradle -p clients/android --no-daemon :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
python3 clients/android/qa/verify_manifest.py
python3 clients/android/qa/verify_apk.py clients/android/app/build/outputs/apk/debug/app-debug.apk
```

CI also exercises these commands without publishing a binary. Separately, merged [PR #54](https://github.com/GoreeCloud/memos/pull/54) runs an isolated Android 35 emulator smoke covering startup, the local-data warning, synthetic quick memo persistence across force-stop/relaunch, and phone/tablet-size UI hierarchy; only fictional screenshots and test logs are retained in a short-lived GitHub QA artifact, never a distributable APK. Android compile and JVM tests alone do **not** prove handset usability. A complete acceptance requires manual or emulator/physical-device launch, dark/light and font scaling, rotation, process death, database upgrade/non-destructive migration, data retention/recovery, visual audit against the official Memos mockup, and the applicable privacy/security gates.

Refer to [product requirements](../../docs/FEATURES.md) and [verified status](../../docs/STATUS.md). The larger full product specification is not claimed implemented here.

### Packaged APK privacy review

The static source-manifest check is insufficient by itself: libraries can contribute merged components and permissions. The packaged-APK gate rejects unexpected exported activities/services/receivers/providers, unexpected permissions (except AndroidX's app-defined signature-level receiver permission), an unexpected package/SDK identity, missing data-extraction rules, or insecure backup/cleartext flags. An earlier local debug build included an exported Compose tooling PreviewActivity; its dependency was removed before release review. **Build/debug package verification does not authorize installation or delivery.**
