# Glaze Adoption

Current shared authority: **Glaze V1.7 / 1.7.0**.

- Release integration: `1a5756daed2294155be2e9972b24f580f6222b7b`
- Qualification anchor: `7c4ded83d7a8725165bb6a55dfb175667cc9589e`
- Known-good rollback baseline: `1.6.0`

This rebuild vendors the exact governed Stable Glaze web/runtime source from the V1.7 release integration and layers an application-owned GoreeCloud presentation treatment on top, including: semantic surfaces, restrained translucency, accessibility-first fallbacks, clear focus, responsive layout, reduced-motion/reduced-transparency handling, high-contrast compatibility, and canonical product identity.

The pinned stable Glaze stylesheet is loaded directly from production HTML instead of through a late CSS import. Repository validation requires that direct stylesheet link, and rendered-browser acceptance verifies a Glaze V1.4.1 semantic custom property is present at runtime so production optimization cannot silently drop the shared stylesheet.

This is **not** a claim of completed Glaze consumer acceptance. The shared Glaze release does not automatically grant downstream acceptance. Fresh Memos-local rendered, accessibility, keyboard, screen-reader, responsive, performance, rollback, and human visual review remain required.


## Repository-local source contract

The GoreeCloud repository-boundary validator and frontend test suite now fail if the application-owned Memos presentation layer loses its GoreeCloud shell/sidebar/composer/memo-card surfaces, visible focus treatment, responsive mobile transparency fallback, reduced-motion suppression, reduced-transparency fallback, forced-colors semantic treatment, or transparency-disable fallback.

This is source-level regression evidence only. It does not establish rendered conformance, screen-reader or other assistive-technology acceptance, responsive or representative-device acceptance, performance acceptance, rollback acceptance, human visual review, release acceptance, or product acceptance. Memos remains an adoption-required Glaze consumer until those separate gates are satisfied.

## Authentication entry surface

The sign-in, sign-up, first-run setup, and administrator sign-in pages share an application-owned GoreeCloud authentication shell layered on the current Glaze source authority. The shell provides product identity, responsive card geometry, visible hierarchy, reduced-transparency fallback, and forced-colors fallback without changing credential, session, challenge, redirect, or identity-provider semantics.

This is source-level implementation evidence. Representative rendered review, keyboard/screen-reader acceptance, scaling/zoom, reduced-motion/contrast review, and authentication threat-model acceptance remain separate release gates.


## Automated rendered browser acceptance

The Development validation matrix now includes a real Chromium lane against a clean private GoreeCloud Memos instance with the exact embedded production frontend. It exercises the first-run GoreeCloud/Glaze setup shell at representative desktop, phone, and tablet viewport sizes; light and dark appearance; forced-colors; reduced motion; keyboard focus visibility; 200% text scaling/reflow; horizontal-overflow detection; programmatic credential labels; and serious/critical axe accessibility violations. Passing runs retain rendered screenshots as CI evidence.

This is automated rendered evidence only. It does not replace required human visual review, independent screen-reader acceptance, representative physical-device/browser review, reduced-transparency rendered review, full RTL/localization review, performance acceptance, rollback evidence, or production acceptance.


## Authenticated rendered browser acceptance

A separate clean private instance and Playwright setup project exercise the authenticated GoreeCloud home/composer shell without contaminating first-run acceptance. The lane provisions one test administrator, reuses browser storage state across serialized desktop-light, phone-dark, and tablet-forced-colors projects, creates a real memo through the CodeMirror composer, and checks the Glaze consumer/version markers, main landmark, composer visibility, memo-card rendering, visible keyboard focus, 200% text reflow, horizontal overflow, reduced-motion media state, dark/forced-colors media state, page errors, and serious/critical axe findings.

The rendered-browser matrix also exercises an Arabic phone context with right-to-left document direction and Chromium-emulated prefers-reduced-transparency: reduce on both first-run and authenticated core surfaces. Those contexts verify RTL direction, no horizontal overflow, serious/critical axe results, and the application-owned opaque fallbacks for the auth card, composer, and memo card.

This remains automated Chromium Development evidence. It does not replace human visual review, independent screen-reader/assistive-technology review, representative physical-device/browser testing, broader locale/localization review, performance acceptance, rollback evidence, or production acceptance.

## Control presentation preference

Memos now exposes the GoreeCloud Button Style preference for the shared icon-button primitive. The default is **Icons & Glyphs**, with **Icons + Text** and **Text** alternatives that reuse each control's existing accessible name rather than introducing a second semantic label. The preference is browser-local in this Development slice and is applied through a root presentation contract so shared toolbar/navigation icon buttons can adapt without duplicating per-screen state.

The shared icon-button primitive now also reaches the memo-share Copy/Revoke actions and the focus-mode Exit action because those icon-only controls expose explicit accessible names. That keeps their existing behavior and visible icon treatment while allowing Icons + Text and Text modes to reuse the same owned labels.

This is not yet whole-application control-presentation acceptance. Components outside the shared icon-button primitive, human translation of the new control terminology beyond the English fallback entries required by the locale-parity contract, localization/human review, compact-layout edge cases, independent assistive-technology validation, and any future account/device synchronization remain open.


### Button Style native-control rollout

The browser-local Button Style presentation contract now also covers the existing localized icon-only controls for map zoom in, map zoom out, fit-all, and the memo-panel close action even though those controls use native/button-render surfaces rather than the shared Button primitive. The controls retain their original accessible names and behavior; GoreeCloud presentation data only supplies the already-owned label to Icons + Text and Text modes.

This remains an incremental control-presentation rollout. Other native/custom icon controls require individual review before they are brought under the same preference, and whole-application human visual, independent assistive-technology, localization, compact-layout, representative-browser/device, performance, rollback, and production acceptance remain open.
