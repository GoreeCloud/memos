/* GLAZE UI V1.6 — Release Candidate identity wrapper.
 *
 * This module adds Release Candidate identity only over the fully qualified
 * frozen V1.6 Development implementation. It must not change presentation
 * behavior, evidence bindings, operational authority, or consumer eligibility.
 */

export * from './glaze-v1.6-development.mjs';

export const glazeV160ReleaseCandidate = Object.freeze({
  version: '1.6.0-rc.1',
  internalVersion: '1.6.0-rc.1',
  externalVersion: '1.6.0-rc.1',
  versionName: null,
  lifecycle: 'release-candidate',
  stableBaseline: '1.5.1',
  sourceQualificationAnchor: 'c7509c79256b04b0aa67cb9dd0737d7588e0ae4a',
  acceptanceModelVersion: '1.6.0-dev.12',
  qualificationEvidenceIntegrationCommit: '354f5759385c28596fcfec26a3ad525e89fb1c35',
  qualificationReview: 'acceptance/v1.6-qualification-review.json',
  qualificationEvidenceComplete: true,
  verifiedQualificationLanes: 24,
  consumerEligible: false,
  presentationOnly: true,
  authorizationInferred: false,
  permissionRequestAutomatic: false,
  automaticNavigationAllowed: false,
  consequentialExecutionAutomatic: false,
  fallbackExecutionAutomatic: false,
  downstreamConsumerAcceptanceAutomatic: false,
  deploymentAcceptanceAutomatic: false,
  productionAcceptanceAutomatic: false,
  stablePromotionAutomatic: false,
  tagPublicationAutomatic: false,
  githubReleasePublicationAutomatic: false
});
