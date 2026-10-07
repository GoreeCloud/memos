/* GLAZE UI V1.5.0 — Stable runtime entrypoint.
 *
 * Stable promotion wrapper for the exact reviewed V1.5 Development implementation
 * anchored at ee1032a0822ab8e103f8afe48e5c1859fde65cc9.
 * Presentation/authority behavior remains implemented by the reviewed internal
 * V1.5 modules; this entrypoint promotes release identity only.
 */

export * from './glaze-v1.4.1.mjs';

import {
  resolveGlazeInterface as resolveGlazeInterfaceDevelopment,
  summarizeGlazeInterfaceResolution as summarizeGlazeInterfaceResolutionDevelopment
} from './glaze-v1.5-resolution.dev.mjs';

const REVIEWED_IMPLEMENTATION_ANCHOR = 'ee1032a0822ab8e103f8afe48e5c1859fde65cc9';

function plainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function promoteStableIdentity(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(promoteStableIdentity));
  }
  if (!plainObject(value)) return value;

  const promoted = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (key === 'version' && candidate === '1.5.0-dev.1') {
      promoted[key] = '1.5.0';
    } else if (key === 'lifecycle' && candidate === 'development') {
      promoted[key] = 'stable';
    } else {
      promoted[key] = promoteStableIdentity(candidate);
    }
  }
  return Object.freeze(promoted);
}

export function resolveGlazeInterface(options = {}) {
  return promoteStableIdentity(resolveGlazeInterfaceDevelopment(options));
}

export function summarizeGlazeInterfaceResolution(result) {
  return promoteStableIdentity(
    summarizeGlazeInterfaceResolutionDevelopment(result)
  );
}

export const glazeV15 = Object.freeze({
  version: '1.5.0',
  lifecycle: 'stable',
  stableBaseline: '1.4.1',
  consumerEligible: true,
  reviewedImplementationAnchor: REVIEWED_IMPLEMENTATION_ANCHOR,
  publicRuntimeEntrypoint: 'js/glaze-v1.5.0.mjs',
  authorityBoundary: 'presentation-only',
  providerAuthorityOwnershipEnforced: true,
  privacyAuthorityMayOwnAuthorizationTruth: true,
  providerPrecedenceInferred: false,
  accessibilityHasPresentationPrecedence: true,
  runtimePressureMayReducePresentationCost: true,
  runtimePressureMayModifyCapabilityTruth: false,
  navigationContinuityRequired: true,
  stablePrimaryActionOrdering: true,
  explicitFallbackRequired: true,
  fallbackExecutionAutomatic: false,
  privacySafeExplainableDiagnostics: true,
  developerFacingUnifiedResolver: true,
  qualifiedStabilizationObligations: 16,
  deferredToV151: Object.freeze([
    'performance-representative-budget',
    'platform-posture-continuity'
  ]),
  numericPerformanceBudgetV10AcceptanceClaimed: false,
  foldablePostureAcceptanceClaimed: false,
  downstreamConsumerAcceptanceAutomatic: false,
  releasePublicationAutomatic: false,
  deploymentAcceptanceAutomatic: false
});
