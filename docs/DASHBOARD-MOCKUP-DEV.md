# GoreeCloud Memos — Dashboard Mockup Implementation

Status: **Development source candidate; not released or promoted to Stable.**

Source of design: owner's GoreeCloud Memos Home dashboard mockup, October 12, 2026.
Tracking: GoreeCloud/memos#130.

## Intended behavior

- Home uses a spacious search/compose/layout header; a light-blue welcome panel with CSS-only note artwork and four benefit points; up to three actual user-authorized recent memo cards; and quick actions.
- Dashboard-specific sidebar navigation offers Home, All Memos, Favorites, Private, Labels, Archived, Recent, My Tasks and Attachments.
- Favorites, Private and Tasks are implemented with server-side CEL filters, not filtering only the first three loaded memos. Labels are populated from the signed-in user's configured label information.
- The **New Memo** action opens the existing authenticated global memo editor. No custom storage, authentication, mutation endpoints, or database schema are introduced.
- The dashboard preview defaults to grid; the Grid and List controls switch the preview and preserve view preferences for full feeds.
- On non-Home routes, preserve the preexisting contextual sidebar, saved-view management, account footer, and navigation.
- The snapshot describes `Trash` but the product currently has recoverable **Archived** memos, which must not be mislabeled deleted. The dashboard uses Archived until a verified Trash lifecycle exists.
- Artwork is CSS and existing Lucide icons; no generated imagery.

## Testing and release gates

Perform TypeScript, Biome, full Vitest frontend, web build, and exact-head GitHub CI. Test search and Space scope, pinned/visibility filters, inaccessible/denied memos, empty/error/loading states, New Memo, grid/list layout and alternate routes. Validate desktop/mobile browser rendering, 200% zoom, tab order, accessible labels and dark mode. Native-language translation of newly written marketing and navigation copy remains an acceptance task.

A build or unit test alone is **not** evidence of visual parity. The user-provided screenshot is the visual acceptance specification. Do not report exact-match completion before comparing authenticated rendered layouts.

## Safe Development-only deployment

Target host: `memos-dev.goreecloud.com`; container: `goreecloud-memos-development`; compose file on VPS: `/home/ladamian/GoreeCloud/memos-development/compose.yaml`. The persistent development data volume is `goreecloud-memos-development-data`. The separate regular `goreecloud-memos` service is out of scope.

Before changing the Development service: verify account, commit SHA, image identity, its own compose stack, existing image tag/digest, `/healthz`, and data backup readiness. Build a uniquely tagged artifact from the verified exact commit. Update only the Development compose image, keep a rollback copy, recreate only `memos-development`, and verify that the new container starts healthy, serves the intended web assets and functions for an authenticated user. On failure, revert the compose image and recreate only Development; never touch the regular service or its data. Record tested checks and runtime evidence in the PR/issue.

## Known visual/accessibility exceptions pending acceptance

- No direct authored image assets are included; the hero illustration is reconstructed with CSS shapes and icons.
- New English marketing/navigation copy is not yet localized across all 45 existing locale resources.
- Archived is not Trash because archival and deletion semantics differ.
- Authenticated screenshot comparison and physical-device/browser/assistive-technology acceptance must be recorded separately.
