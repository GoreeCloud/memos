# Glaze Adoption

Current shared authority: **Glaze V1.7 / 1.7.0**.

- Release integration: `1a5756daed2294155be2e9972b24f580f6222b7b`
- Qualification anchor: `7c4ded83d7a8725165bb6a55dfb175667cc9589e`
- Known-good rollback baseline: `1.6.0`

This rebuild vendors the exact governed Stable Glaze web/runtime source from the V1.7 release integration and layers an application-owned GoreeCloud presentation treatment on top, including: semantic surfaces, restrained translucency, accessibility-first fallbacks, clear focus, responsive layout, reduced-motion/reduced-transparency handling, high-contrast compatibility, and canonical product identity.

This is **not** a claim of completed Glaze consumer acceptance. The shared Glaze release does not automatically grant downstream acceptance. Fresh Memos-local rendered, accessibility, keyboard, screen-reader, responsive, performance, rollback, and human visual review remain required.


## Repository-local source contract

The GoreeCloud repository-boundary validator and frontend test suite now fail if the application-owned Memos presentation layer loses its GoreeCloud shell/sidebar/composer/memo-card surfaces, visible focus treatment, responsive mobile transparency fallback, reduced-motion suppression, reduced-transparency fallback, forced-colors semantic treatment, or transparency-disable fallback.

This is source-level regression evidence only. It does not establish rendered conformance, screen-reader or other assistive-technology acceptance, responsive or representative-device acceptance, performance acceptance, rollback acceptance, human visual review, release acceptance, or product acceptance. Memos remains an adoption-required Glaze consumer until those separate gates are satisfied.

## Authentication entry surface

The sign-in, sign-up, first-run setup, and administrator sign-in pages share an application-owned GoreeCloud authentication shell layered on the current Glaze source authority. The shell provides product identity, responsive card geometry, visible hierarchy, reduced-transparency fallback, and forced-colors fallback without changing credential, session, challenge, redirect, or identity-provider semantics.

This is source-level implementation evidence. Representative rendered review, keyboard/screen-reader acceptance, scaling/zoom, reduced-motion/contrast review, and authentication threat-model acceptance remain separate release gates.
