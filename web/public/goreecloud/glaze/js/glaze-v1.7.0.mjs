/* Glaze V1.7.0 — bounded Stable entrypoint.
 *
 * V1.7.0 intentionally inherits the exact accepted V1.6.0 runtime surface.
 * The retained 1.7.0-dev.47 implementation is NOT imported by this Stable
 * entrypoint; unfinished and unverified V1.7 feature work continues as V1.7.1.
 */

export * from './glaze-v1.6.0.mjs';

export const glazeV170 = Object.freeze({
  version: '1.7.0',
  product: 'Glaze V1.7',
  lifecycle: 'stable',
  canonicalLifecycle: 'anchor',
  stableBaseline: '1.6.0',
  consumerEligible: true,
  inheritedStableRuntime: 'js/glaze-v1.6.0.mjs',
  inheritedAcceptedRelease: '1.6.0',
  newPresentationBehaviorIncluded: false,
  retainedDev47RuntimeIncluded: false,
  section48RuntimeIncluded: false,
  successorDevelopmentVersion: '1.7.1-dev.1',
  successorDevelopmentEntrypoint: 'js/glaze-v1.7.1-development.mjs',
  presentationOnly: true,
  authorizationInferred: false,
  permissionRequestAutomatic: false,
  automaticNavigationAllowed: false,
  consequentialExecutionAutomatic: false,
  fallbackExecutionAutomatic: false,
  downstreamConsumerAcceptanceAutomatic: false,
  deploymentAcceptanceAutomatic: false,
  productionAcceptanceAutomatic: false,
  publicationAutomatic: false
});

export const glazeV17 = glazeV170;
