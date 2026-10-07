/* GLAZE UI V1.5.1-rc.1 — Release Candidate identity entrypoint.
 *
 * This patch candidate does not change the qualified V1.5 presentation or
 * authority behavior. It inherits the V1.5.0 Stable runtime and exposes only
 * bounded Release Candidate identity and qualification provenance.
 */

export * from './glaze-v1.5.0.mjs';

export const glazeV151ReleaseCandidate = Object.freeze({
  version: '1.5.1-rc.1',
  lifecycle: 'release-candidate',
  stableBaseline: '1.5.0',
  consumerEligible: false,
  sourceQualificationAnchor: '5b59d0e36950d737dba35b58ae58058684e0831b',
  qualificationIntegrationCommit: 'f7ef915f0aabea6cf92748018f2220a99e3a9c92',
  inheritedStableRuntime: 'js/glaze-v1.5.0.mjs',
  qualifiedObligations: Object.freeze([
    'performance-representative-budget',
    'platform-posture-continuity'
  ]),
  authorizationInferred: false,
  permissionRequestAutomatic: false,
  consequentialExecutionAutomatic: false,
  fallbackExecutionAutomatic: false,
  automaticNavigationAllowed: false,
  telemetryRequired: false,
  remoteAnalysisRequired: false,
  downstreamConsumerAcceptanceAutomatic: false,
  stablePromotionAutomatic: false,
  deploymentAcceptanceAutomatic: false,
  productionAcceptanceAutomatic: false
});
