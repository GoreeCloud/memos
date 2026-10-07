/* GLAZE UI V1.5.1 — Stable qualification-hardening entrypoint.
 *
 * V1.5.1 does not change the reviewed V1.5 presentation or authority behavior.
 * It inherits the V1.5.0 Stable runtime, promotes Stable patch identity only, and
 * records the two independently reviewed V1.5.1 qualification expansions.
 */

export * from './glaze-v1.5.0.mjs';

import {
  resolveGlazeInterface as resolveGlazeInterfaceV150,
  summarizeGlazeInterfaceResolution as summarizeGlazeInterfaceResolutionV150
} from './glaze-v1.5.0.mjs';

const REVIEWED_IMPLEMENTATION_ANCHOR = 'ee1032a0822ab8e103f8afe48e5c1859fde65cc9';
const V151_QUALIFICATION_ANCHOR = '5b59d0e36950d737dba35b58ae58058684e0831b';

function plainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function promotePatchIdentity(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(promotePatchIdentity));
  }
  if (!plainObject(value)) return value;

  const promoted = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (key === 'version' && candidate === '1.5.0') {
      promoted[key] = '1.5.1';
    } else {
      promoted[key] = promotePatchIdentity(candidate);
    }
  }
  return Object.freeze(promoted);
}

export function resolveGlazeInterface(options = {}) {
  return promotePatchIdentity(resolveGlazeInterfaceV150(options));
}

export function summarizeGlazeInterfaceResolution(result) {
  return promotePatchIdentity(
    summarizeGlazeInterfaceResolutionV150(result)
  );
}

export const glazeV151 = Object.freeze({
  version: '1.5.1',
  lifecycle: 'stable',
  stableBaseline: '1.5.0',
  consumerEligible: true,
  reviewedImplementationAnchor: REVIEWED_IMPLEMENTATION_ANCHOR,
  sourceQualificationAnchor: V151_QUALIFICATION_ANCHOR,
  qualificationIntegrationCommit: 'f7ef915f0aabea6cf92748018f2220a99e3a9c92',
  releaseCandidateIntegrationCommit: 'a9c93506dd062d29c6c894940b71d060e8c39110',
  inheritedStableRuntime: 'js/glaze-v1.5.0.mjs',
  publicRuntimeEntrypoint: 'js/glaze-v1.5.1.mjs',
  authorityBoundary: 'presentation-only',
  providerAuthorityOwnershipEnforced: true,
  providerPrecedenceInferred: false,
  accessibilityHasPresentationPrecedence: true,
  runtimePressureMayModifyCapabilityTruth: false,
  navigationContinuityRequired: true,
  stablePrimaryActionOrdering: true,
  explicitFallbackRequired: true,
  fallbackExecutionAutomatic: false,
  qualifiedStabilizationObligations: 18,
  qualifiedV151Obligations: Object.freeze([
    'performance-representative-budget',
    'platform-posture-continuity'
  ]),
  numericPerformanceBudgetV10AcceptanceClaimedForReviewedSharedEnvironment: true,
  foldablePostureAcceptanceClaimedForReviewedSharedEnvironment: true,
  authorizationInferred: false,
  permissionRequestAutomatic: false,
  automaticNavigationAllowed: false,
  consequentialExecutionAutomatic: false,
  telemetryRequired: false,
  remoteAnalysisRequired: false,
  downstreamConsumerAcceptanceAutomatic: false,
  releasePublicationAutomatic: false,
  deploymentAcceptanceAutomatic: false,
  productionAcceptanceAutomatic: false
});
