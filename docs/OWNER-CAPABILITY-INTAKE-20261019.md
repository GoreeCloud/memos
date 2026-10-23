# GoreeCloud Memos — 2026-10-19 owner capability intake and delivery map

**Status:** proposed-scope reconciliation; **not** release acceptance or blanket roadmap approval.
**Owner input:** *GoreeCloud Memos — Complete Features and Capabilities* (604-line owner-provided inventory; 22 numbered capability areas and an explicit proposed-only status).
**Baseline:** GoreeCloud/memos `main` at `cdde8274d6ec87327793caed9d4630ccf80db7eb` (merged Development Inbox, PR #145).
**Authoritative companions:** [Product Specifications](PROJECT-SPECIFICATIONS.md), [Existing Capability Catalog](PRODUCT-CAPABILITY-CATALOG.md), [Implemented Features](IMPLEMENTED-FEATURES.md), [Planned Features](PLANNED-FEATURES.md), [Release and Rollback](RELEASE-AND-ROLLBACK.md).

## Governing interpretation

This intake preserves the owner's comprehensive vision while honoring its own final warning: **proposed/exploratory features are neither automatically approved implementation commitments nor verified implementations**. Do not paste the inventory into the implemented-feature ledger or advertise all 22 areas as shipped. The existing 734-line product capability catalog already covers much of this broader vision. Keep that catalog the proposal library rather than creating a competing second source of truth.

**Memos product boundary:** fast, private, portable quick capture; the advanced notebook hierarchy, knowledge graph, relational database and comprehensive project-management capabilities remain in GoreeCloud Notes or other dedicated applications. Core memo creation and self-hosting must function without AI services or external GoreeCloud integrations.

## 22-area reconciliation

| Owner area | Development evidence or classification | Next acceptance boundary |
|---|---|---|
| 1. Memo creation and editing | Markdown editor, optional titles, draft support, single-click editing and floating create action have Development implementation | Verify draft restoration, title-only save, duplication and touch/keyboard workflows; **duplication remains proposed until tested** |
| 2. Rich text and Markdown | Existing Markdown editing/rendering foundation | Evaluate optional toolbar and richer editing without damaging Markdown portability |
| 3. Checklists and tasks | Markdown task-list foundation | Reorder/templates/conversion, and opt-in Tasks transfer require discrete design and tests |
| 4. Images and attachments | Existing upload/attachment foundation | Test copy/paste, upload and previews on real devices; OCR is separate optional work |
| 5. Drawing and handwriting | Proposed, not verified | Define native editable drawing attachment format, privacy and stylus/touch acceptance |
| 6. Voice recording | Proposed, not verified | Media permissions, lifecycle, upload, offline behavior and opt-in transcription/privacy gate |
| 7. Organization | Tags, spaces, pin/archive and view-layout foundation | Server-backed managed labels/colors, lossless migration, bulk actions, recoverable Trash |
| 8. Search and filtering | Existing content search, facet filters and saved-view foundation | Scope-aware permissions, date/attachment facets and representative search tests |
| 9. Reminders and scheduling | Planned; not accepted as a notification or scheduling service | Server data model, timezones, recurrence, delivery, opt-in and revocation |
| 10. Sharing and collaboration | Existing per-memo and Space permission/comment foundation | Cross-user isolation, link-revocation and richer collaboration authorization |
| 11. GoreeCloud AI | Optional provider foundation; no claim of default data transfer | Explicit external-data permission, local-first evaluation, disabled-path parity |
| 12. Ecosystem integrations | Opportunities only; no universal live integration claim | One approved contract, auth/scope/privacy and acceptance per integration |
| 13. Cross-platform accessibility | Responsive browser and Development Android/Linux preview packages | Real device, keyboard, screen-reader, localization, install/upgrade/rollback |
| 14. Widgets and quick capture | Floating New Memo supported | Keyboard shortcut, widgets, browser capture require platform-specific deliverables |
| 15. Offline and sync | Server-backed connected flow only | Separate encrypted cache, write queue, conflict-resolution and offline-auth threat model |
| 16. History, recovery and Trash | Archive; bounded SQLite-and-managed-local recovery | Recoverable deletion/versions and robust full-instance clean-target recovery |
| 17. Appearance | Glaze target, light/dark and responsive layout foundation | Representative forced-colors, RTL, reduced-motion/transparency and synchronized prefs |
| 18. Privacy and security | Private-first self-hosting and existing auth/authorization foundations | Exact-runtime isolation, secrets, CSP, third-party permissions and security review |
| 19. Import/export/backup | Portable content foundation and bounded sqlite-local bundle tooling | Full config/S3/absolute-path backup, off-device restore, retention, recovery drills |
| 20. Developer/API/automation | REST/Connect-compatible API foundation | Authenticated scopes, compatibility/version checks and governed automation |
| 21. Hosting/admin | Docker, three database engines and health/readiness foundation | Deployment approval, protected artifacts, ops monitoring and rollback exercises |
| 22. Product boundaries | Project Specifications already define lightweight Memos vs advanced Notes | Maintain that boundary in every approved feature's acceptance |

## Recommended sequence — candidate priorities, not approvals

1. **P0 — verify and stabilize existing quick-capture foundations.** Close Android/Linux preview login, clipboard, attachments, navigation, draft persistence and screen-reader gaps; keep the all-green Chromium/database-upgrade CI gates. Complete signed-in visual acceptance of the Development Inbox and maintain a tested recovery/rollback path. No claims of Stable readiness.
2. **P1 — complete low-dependency everyday actions.** Design **Duplicate memo** (new memo identity, no inherited share links or comments, preserve only authorized content and safe attachment associations); reusable checklists/templates; label and card-color persistence; and safe Trash/restore. Deliver each in an isolated feature branch with UI, API-authorization, export, search and recovery coverage.
3. **P1 — reminders as a deliberate vertical.** Specify schema and timezone semantics, recurring schedules, state transitions, opt-in delivery, snooze/complete/cancel, tests under clock changes, and clear ownership boundaries with GoreeCloud Tasks/Calendar/Notify before implementation.
4. **P2 — capture extensions.** Voice notes, drawing and handwriting, OCR and optional transcription: individually gated on permissions, storage, upload, accessibility, device support and privacy. No mandatory AI dependency.
5. **P2/P3 — offline and ecosystem.** Treat offline edits/conflict resolution and cross-product connectors as higher-risk separate programs, requiring exact identity, cache encryption, data transfer authority, migrations, recovery and upstream compatibility.
6. **Release work across all lanes.** Keep sandbox/Development isolated from Stable. Obtain exact-head CI, post-merge CI, representative runtime acceptance, bounded recovery proof, and a reversible deployment before marking a feature **Development deployed**. Reserve **Stable** for the full acceptance process.

## Definition of done for each individual capability

- Owner-visible behavior and clear UI states, including empty/loading/error/retry and mobile touch.
- Verified permissions and privacy boundary; explicit approval for data sent outside the self-hosted server.
- Accessible keyboard/screen-reader semantics, reduced motion/contrast/RTL and translation fallback.
- Persistence, reload, export/import and safe failure/rollback where relevant.
- Automated unit/integration/browser and 3-engine migration checks as dictated by change scope.
- Updated `IMPLEMENTED-FEATURES.md` **only after verified implementation**; maintain proposed or blocked status otherwise.
- Current revision, CI run, rollback evidence, known gaps, Development/Stable classification.

**Reconciliation conclusion:** the owner document refines the existing catalog and emphasizes Memos as a lightweight personal productivity tool. It **does not** establish that all proposed media, AI, reminders, offline, widgets, collaboration, and integration capabilities currently exist.
