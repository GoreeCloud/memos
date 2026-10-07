/* GLAZE UI 1.5.0-dev.1 — Contextual + Capability Awareness development entrypoint. */
export * from './glaze-v1.4.1.mjs';
export * from './glaze-v1.5-context-capability.dev.mjs';
export * from './glaze-v1.5-provider-registry.dev.mjs';
export * from './glaze-v1.5-composition.dev.mjs';
export * from './glaze-v1.5-actions.dev.mjs';
export * from './glaze-v1.5-diagnostics.dev.mjs';
export * from './glaze-v1.5-resolution.dev.mjs';

export const glazeV15Development = Object.freeze({
  version: '1.5.0-dev.1',
  lifecycle: 'development',
  stableBaseline: '1.4.1',
  consumerEligible: false,
  authorityBoundary: 'presentation-only',
  providerAuthorityOwnershipEnforced: true,
  privacyAuthorityMayOwnAuthorizationTruth: true,
  providerPrecedenceInferred: false,
  accessibilityHasPresentationPrecedence: true,
  runtimePressureMayReducePresentationCost: true,
  runtimePressureMayModifyCapabilityTruth: false,
  navigationContinuityRequired: true,
  stablePrimaryActionOrdering: true,
  actionContextualReorderingBoundary: 'non-primary-contextual-only',
  explicitFallbackRequired: true,
  fallbackExecutionAutomatic: false,
  privacySafeExplainableDiagnostics: true,
  diagnosticsProviderIdentityIncludedByDefault: false,
  diagnosticsRawContextIncluded: false,
  developerFacingUnifiedResolver: true,
  unifiedResolutionProviderConflictsFailClosed: true,
  representativeConsumerProfiles: 5,
  representativeConsumerIntegrationChangesStableTarget: false,
  representativeConsumerAcceptanceEstablished: false,
  developmentConformanceScenarios: 39,
  actionConformanceScenarios: 8,
  diagnosticsConformanceScenarios: 7,
  resolutionConformanceScenarios: 10,
  consumerIntegrationConformanceScenarios: 14,
  totalDevelopmentConformanceScenarios: 78,
  stablePromotionAutomatic: false
});
