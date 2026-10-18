# Changelog

## Development responsive-title integration acceptance — 2026-10-18

- Restored Home dashboard Grid/List switching and retained the standalone View options menu while preserving All Memos as the default root page and its separate Home dashboard at `/dashboard`.
- Removed the duplicate rectangular dashboard New Memo control; the floating circular compose action remains available. Quick Actions continue to open the same editor.
- Fixed dark-mode memo timestamp contrast and Show more button reflow at mobile 200% text sizing; strengthened authenticated browser tests to distinguish Home masonry from the All Memos feed and scope Arabic language selection to its listbox.
- Verified in a disposable, loopback-only Development instance: 10/10 authenticated Chromium cases, 8/8 anonymous first-run/responsive cases, TypeScript and Biome, production frontend build, and anonymous memo API HTTP 401. The baseline integrated frontend unit suite passed 1,709 tests across 207 suites; the modified Home-focused tests passed separately. No VPS container, live memo database, production deployment, or native Android/Linux build was modified by this acceptance work.

## 0.1.0-dev — 2026-10-07

- Recreated GoreeCloud Memos as a maintained fork of Memos v0.31.0 while preserving upstream history.
- Added explicit upstream, Glaze, and branding provenance.
- Added GoreeCloud platform/lifecycle documentation and nonconformance gates.
- Applied canonical GoreeCloud Memos branding.
- Added a Home-only slash keyboard shortcut to focus the persistent search, with IME/dialog/editable-target guards and accessibility metadata.
- Added private-first instance initialization.
- Added Glaze-aligned GoreeCloud application styling and accessibility fallbacks.
- Disabled arbitrary administrator-provided script execution in the GoreeCloud browser client.
- Added a bounded `memos snapshot sqlite-local` recovery bundle that pairs the exact SQLite snapshot with all relative managed-local attachment files, per-file integrity metadata, fail-closed path containment, and atomic staged publication.
- Added standalone `memos snapshot verify-sqlite-local` integrity checks for bounded SQLite + managed-local recovery bundles, including strict manifests, SQLite quick-check, hashes, path safeguards, and aggregate verification.
- Added automated clean-instance and authenticated-core rendered Chromium Development acceptance across responsive, keyboard-focus, 200% reflow, dark/forced-colors, reduced-motion, overflow, and serious/critical axe checks.
- Added dedicated cross-user core-isolation Development acceptance for private memos, attachments, personal export, saved views, settings, relations, reactions, sharing, webhooks, Spaces, and instance statistics.
- Added SQLite/MySQL/PostgreSQL migration and maintained-fork baseline upgrade acceptance, including direct v0.31.0 upgrade gates.
- Added bounded image-preview panning, pinch-to-zoom, and fit-zoom horizontal swipe navigation through selectively reviewed upstream maintenance.
- Hardened link-preview metadata extraction to read beyond the initial parse window only when preview title/image metadata remains incomplete, with a bounded maximum read.
