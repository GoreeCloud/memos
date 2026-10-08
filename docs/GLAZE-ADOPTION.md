# Glaze Adoption

Current shared authority: **Glaze V1.7 / 1.7.0**.

- Release integration: `1a5756daed2294155be2e9972b24f580f6222b7b`
- Qualification anchor: `7c4ded83d7a8725165bb6a55dfb175667cc9589e`
- Known-good rollback baseline: `1.6.0`

This rebuild vendors the exact governed Stable Glaze web/runtime source from the V1.7 release integration and layers an application-owned GoreeCloud presentation treatment on top, including: semantic surfaces, restrained translucency, accessibility-first fallbacks, clear focus, responsive layout, reduced-motion/reduced-transparency handling, high-contrast compatibility, and canonical product identity.

This is **not** a claim of completed Glaze consumer acceptance. The shared Glaze release does not automatically grant downstream acceptance. Fresh Memos-local rendered, accessibility, keyboard, screen-reader, responsive, performance, rollback, and human visual review remain required.


## Repository-local source contract

The GoreeCloud repository-boundary validator now fails if the application-owned Memos presentation layer loses its GoreeCloud shell/sidebar/composer/memo-card surfaces, visible focus treatment, reduced-motion suppression, reduced-transparency fallback, forced-colors semantic treatment, or transparency-disable fallback.

This is source-level regression evidence only. It does not establish rendered conformance, screen-reader or other assistive-technology acceptance, responsive or representative-device acceptance, performance acceptance, rollback acceptance, human visual review, release acceptance, or product acceptance. Memos remains an adoption-required Glaze consumer until those separate gates are satisfied.
