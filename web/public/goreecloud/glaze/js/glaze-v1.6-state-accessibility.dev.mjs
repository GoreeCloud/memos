/* GLAZE UI V1.6 — Development semantic state, accessibility profile,
 * performance adaptation, and anti-jitter foundation.
 *
 * Non-consumer-eligible Development source. The current Stable authority
 * remains GLAZE UI V1.5 / 1.5.1.
 */

const SEMANTIC_STATES = Object.freeze([
  'neutral',
  'informational',
  'positive',
  'successful',
  'warning',
  'caution',
  'error',
  'critical',
  'restricted',
  'privacy-sensitive',
  'security-sensitive',
  'offline',
  'degraded',
  'syncing',
  'loading',
  'updating',
  'stale',
  'disabled',
  'read-only',
  'selected',
  'active',
  'inactive',
  'pending',
  'scheduled',
  'paused',
  'complete'
]);

const CAPABILITY_PRESENTATION_STATES = Object.freeze([
  'available',
  'disabled',
  'unavailable',
  'restricted',
  'unsupported',
  'permission-required',
  'temporarily-unavailable',
  'unknown'
]);

const ACCESSIBILITY_PROFILES = Object.freeze([
  'default',
  'reduced-motion',
  'minimal-motion',
  'reduced-transparency',
  'solid-surfaces',
  'increased-contrast',
  'large-text',
  'extra-large-text',
  'simplified-visual-effects',
  'strong-focus',
  'touch-assistance',
  'keyboard-first',
  'screen-reader-optimized'
]);

const PERFORMANCE_LEVELS = Object.freeze([
  'full',
  'balanced',
  'efficient',
  'essential'
]);

const PERFORMANCE_RANK = Object.freeze({
  full: 0,
  balanced: 1,
  efficient: 2,
  essential: 3
});

const DEFAULT_STABILITY_WINDOW_MS = 2000;
const DEFAULT_MINIMUM_DWELL_MS = 3000;

function plainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function freezeArray(values) {
  return Object.freeze([...values]);
}

function unique(values) {
  return freezeArray([...new Set(values)]);
}

function semanticId(value, fallback = 'unknown') {
  const text = String(value ?? '').trim().toLowerCase();
  return text || fallback;
}

function nonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function bool(source, key) {
  return plainObject(source) && source[key] === true;
}

function stateCategory(state) {
  if (['error', 'critical'].includes(state)) return 'critical';
  if (['warning', 'caution'].includes(state)) return 'warning';
  if (['positive', 'successful', 'complete'].includes(state)) return 'positive';
  if (['informational', 'syncing', 'loading', 'updating', 'pending', 'scheduled'].includes(state)) return 'informational';
  if (['privacy-sensitive'].includes(state)) return 'privacy';
  if (['security-sensitive'].includes(state)) return 'security';
  if (['restricted'].includes(state)) return 'restricted';
  if (['offline', 'degraded', 'stale', 'paused'].includes(state)) return 'availability';
  if (['selected', 'active', 'inactive', 'disabled', 'read-only'].includes(state)) return 'interaction';
  return 'neutral';
}

function stateNonColorIndicator(state) {
  switch (stateCategory(state)) {
    case 'critical': return 'icon-and-label';
    case 'warning': return 'icon-and-label';
    case 'positive': return 'icon-or-label';
    case 'privacy': return 'privacy-icon-and-label';
    case 'security': return 'security-icon-and-label';
    case 'restricted': return 'restriction-icon-and-label';
    case 'availability': return 'status-icon-and-label';
    case 'informational': return 'status-label';
    case 'interaction': return 'geometry-or-label';
    default: return 'label-when-needed';
  }
}

export function resolveGlazeSemanticState(input = {}) {
  if (!plainObject(input)) throw new TypeError('Semantic state input must be a plain object');

  const state = semanticId(input.state, 'neutral');
  if (!SEMANTIC_STATES.includes(state)) {
    throw new RangeError(`Unsupported Glaze semantic state: ${state}`);
  }

  const category = stateCategory(state);
  const sourceAuthority = semanticId(input.sourceAuthority, 'caller');
  const authoritative = input.authoritative !== false;

  return Object.freeze({
    version: '1.6.0-dev.2',
    lifecycle: 'development',
    state,
    category,
    semanticRole: `state.${state}`,
    foregroundRole: `state.${state}.foreground`,
    backgroundRole: `state.${state}.background`,
    protectedSemanticRole: ['critical', 'privacy', 'security', 'restricted'].includes(category),
    nonColorIndicator: stateNonColorIndicator(state),
    colorOnlyMeaningAllowed: false,
    automaticTextColorResolutionRequired: true,
    contrastAwareAdaptationRequired: true,
    materialAwareSurfaceRequired: true,
    forcedColorCompatibleRequired: true,
    increasedContrastVariantRequired: true,
    source: Object.freeze({
      authorityClass: sourceAuthority,
      authoritative,
      rawProviderIdentityIncluded: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      stateTruthCreatedByGlaze: false,
      privacyTruthCreatedByGlaze: false,
      securityTruthCreatedByGlaze: false
    })
  });
}

export function resolveGlazeCapabilityPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Capability presentation input must be a plain object');

  const state = semanticId(input.state, 'unknown');
  if (!CAPABILITY_PRESENTATION_STATES.includes(state)) {
    throw new RangeError(`Unsupported capability presentation state: ${state}`);
  }

  const definitions = {
    available: {
      interactive: true,
      semanticState: 'active',
      explanationRecommended: false,
      reason: 'capability-available'
    },
    disabled: {
      interactive: false,
      semanticState: 'disabled',
      explanationRecommended: false,
      reason: 'local-state-disabled'
    },
    unavailable: {
      interactive: false,
      semanticState: 'inactive',
      explanationRecommended: true,
      reason: 'capability-unavailable'
    },
    restricted: {
      interactive: false,
      semanticState: 'restricted',
      explanationRecommended: true,
      reason: 'authoritative-rule-restricts-use'
    },
    unsupported: {
      interactive: false,
      semanticState: 'inactive',
      explanationRecommended: true,
      reason: 'runtime-unsupported'
    },
    'permission-required': {
      interactive: false,
      semanticState: 'pending',
      explanationRecommended: true,
      reason: 'user-authorization-required'
    },
    'temporarily-unavailable': {
      interactive: false,
      semanticState: 'degraded',
      explanationRecommended: true,
      reason: 'capability-temporarily-unavailable'
    },
    unknown: {
      interactive: false,
      semanticState: 'inactive',
      explanationRecommended: true,
      reason: 'capability-state-unknown'
    }
  };

  const definition = definitions[state];

  return Object.freeze({
    version: '1.6.0-dev.2',
    lifecycle: 'development',
    capabilityState: state,
    ...definition,
    visuallyDistinctFromDisabled: state !== 'disabled',
    colorOnlyMeaningAllowed: false,
    permissionRequestedAutomatically: false,
    capabilityHiddenAutomatically: false,
    authority: Object.freeze({
      presentationOnly: true,
      capabilityTruthOwnedByCaller: true,
      restrictionInferred: false,
      permissionGranted: false,
      providerPrecedenceInferred: false
    })
  });
}

const ACCESSIBILITY_PROFILE_MAP = Object.freeze([
  ['reducedMotion', 'reduced-motion'],
  ['minimalMotion', 'minimal-motion'],
  ['reducedTransparency', 'reduced-transparency'],
  ['solidSurfaces', 'solid-surfaces'],
  ['increasedContrast', 'increased-contrast'],
  ['largeText', 'large-text'],
  ['extraLargeText', 'extra-large-text'],
  ['simplifiedVisualEffects', 'simplified-visual-effects'],
  ['strongFocus', 'strong-focus'],
  ['touchAssistance', 'touch-assistance'],
  ['keyboardFirst', 'keyboard-first'],
  ['screenReaderOptimized', 'screen-reader-optimized']
]);

export function resolveGlazeAccessibilityProfiles(input = {}) {
  if (!plainObject(input)) throw new TypeError('Accessibility profile input must be a plain object');

  const preferences = plainObject(input.preferences) ? input.preferences : {};
  const profiles = [];
  for (const [key, profile] of ACCESSIBILITY_PROFILE_MAP) {
    if (preferences[key] === true) profiles.push(profile);
  }
  if (profiles.length === 0) profiles.push('default');

  const active = unique(profiles);
  const reducedMotion = active.includes('reduced-motion');
  const minimalMotion = active.includes('minimal-motion');
  const reducedTransparency = active.includes('reduced-transparency');
  const solidSurfaces = active.includes('solid-surfaces');
  const increasedContrast = active.includes('increased-contrast');
  const simplifiedEffects = active.includes('simplified-visual-effects');
  const strongFocus = active.includes('strong-focus');
  const touchAssistance = active.includes('touch-assistance');
  const screenReader = active.includes('screen-reader-optimized');

  return Object.freeze({
    version: '1.6.0-dev.2',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    profiles: active,
    presentation: Object.freeze({
      continuousDecorativeMotionAllowed: !(reducedMotion || minimalMotion),
      spatialTravelAllowed: !(reducedMotion || minimalMotion),
      skeletonContinuousMotionAllowed: !(reducedMotion || minimalMotion),
      transparencyAllowed: !(reducedTransparency || solidSurfaces),
      blurAllowed: !(reducedTransparency || solidSurfaces || simplifiedEffects),
      reflectionsAllowed: !simplifiedEffects,
      gradientsMayRemainWhenLegible: !simplifiedEffects,
      strongFocusRequired: strongFocus || screenReader,
      increasedContrastRequired: increasedContrast,
      minimumTouchTargetProtectionRequired: touchAssistance,
      largeTextReflowRequired: active.includes('large-text') || active.includes('extra-large-text'),
      screenReaderOptimized: screenReader
    }),
    precedence: Object.freeze({
      accessibilityOverridesDecorativeRichness: true,
      accessibilityOverridesPerformanceHungryDecoration: true,
      fallbackRemainsGlazeUI: true
    }),
    source: Object.freeze({
      authoritativePreferencesRequired: true,
      profilesInferredFromPrivateContent: false,
      rawPreferencePayloadIncludedInDiagnostics: false
    })
  });
}

function targetPerformanceLevel(runtime) {
  const pressure = semanticId(runtime.pressure, 'normal');
  const renderingCapability = semanticId(runtime.renderingCapability, 'full');

  if (
    pressure === 'critical'
    || renderingCapability === 'essential'
    || bool(runtime, 'severeFrameDegradation')
    || bool(runtime, 'criticalMemoryPressure')
    || bool(runtime, 'criticalThermalPressure')
  ) return 'essential';

  let constraints = 0;
  if (pressure === 'constrained') constraints += 2;
  if (pressure === 'elevated') constraints += 1;
  if (renderingCapability === 'efficient') constraints += 2;
  if (renderingCapability === 'balanced') constraints += 1;
  if (bool(runtime, 'sustainedFrameDegradation')) constraints += 2;
  if (bool(runtime, 'memoryPressure')) constraints += 1;
  if (bool(runtime, 'powerSaving')) constraints += 1;
  if (bool(runtime, 'thermalPressure')) constraints += 1;
  if (nonNegative(runtime.activeEffectCount, 0) >= 12) constraints += 1;

  if (constraints >= 4) return 'essential';
  if (constraints >= 2) return 'efficient';
  if (constraints >= 1) return 'balanced';
  return 'full';
}

function performancePresentation(level) {
  switch (level) {
    case 'full':
      return Object.freeze({
        material: 'full-supported',
        motion: 'full-supported',
        blur: 'bounded-full',
        transparency: 'bounded-full',
        decorativeEffects: 'supported-within-budget'
      });
    case 'balanced':
      return Object.freeze({
        material: 'reduced-expensive-effects',
        motion: 'standard',
        blur: 'bounded-reduced',
        transparency: 'preserved',
        decorativeEffects: 'reduced'
      });
    case 'efficient':
      return Object.freeze({
        material: 'simplified',
        motion: 'minimal-functional',
        blur: 'minimal-or-none',
        transparency: 'reduced',
        decorativeEffects: 'disabled'
      });
    case 'essential':
      return Object.freeze({
        material: 'solid-primary',
        motion: 'minimal',
        blur: 'none',
        transparency: 'minimal-or-none',
        decorativeEffects: 'disabled'
      });
    default:
      throw new RangeError(`Unsupported performance level: ${level}`);
  }
}

export function resolveGlazePerformanceLevel(input = {}) {
  if (!plainObject(input)) throw new TypeError('Performance level input must be a plain object');

  const runtime = plainObject(input.runtime) ? input.runtime : {};
  const previous = plainObject(input.previous) ? input.previous : {};
  const nowMs = nonNegative(input.nowMs, 0);
  const stabilityWindowMs = nonNegative(input.stabilityWindowMs, DEFAULT_STABILITY_WINDOW_MS);
  const minimumDwellMs = nonNegative(input.minimumDwellMs, DEFAULT_MINIMUM_DWELL_MS);
  const recoveryStableMs = nonNegative(runtime.recoveryStableMs, 0);

  const requestedCurrent = semanticId(previous.level, 'balanced');
  const current = PERFORMANCE_LEVELS.includes(requestedCurrent) ? requestedCurrent : 'balanced';
  const target = targetPerformanceLevel(runtime);
  const acceptedAtMs = nonNegative(previous.acceptedAtMs, 0);
  const dwellMs = Math.max(0, nowMs - acceptedAtMs);

  const currentRank = PERFORMANCE_RANK[current];
  const targetRank = PERFORMANCE_RANK[target];

  let accepted = current;
  let decision = 'hold-current';
  let antiJitterApplied = false;

  if (targetRank > currentRank) {
    accepted = target;
    decision = 'immediate-cost-reduction';
  } else if (targetRank < currentRank) {
    const dwellSatisfied = dwellMs >= minimumDwellMs;
    const stabilitySatisfied = recoveryStableMs >= stabilityWindowMs;
    if (dwellSatisfied && stabilitySatisfied) {
      accepted = target;
      decision = 'stable-recovery-upgrade';
    } else {
      antiJitterApplied = true;
      decision = 'recovery-held-by-hysteresis';
    }
  }

  const reasons = [];
  if (bool(runtime, 'sustainedFrameDegradation')) reasons.push('sustained-frame-degradation');
  if (bool(runtime, 'severeFrameDegradation')) reasons.push('severe-frame-degradation');
  if (bool(runtime, 'memoryPressure') || bool(runtime, 'criticalMemoryPressure')) reasons.push('memory-pressure');
  if (bool(runtime, 'powerSaving')) reasons.push('power-saving');
  if (bool(runtime, 'thermalPressure') || bool(runtime, 'criticalThermalPressure')) reasons.push('thermal-pressure');
  if (nonNegative(runtime.activeEffectCount, 0) >= 12) reasons.push('active-effect-budget-pressure');
  if (antiJitterApplied) reasons.push('anti-jitter-hysteresis');

  return Object.freeze({
    version: '1.6.0-dev.2',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    requestedTarget: target,
    previousLevel: current,
    acceptedLevel: accepted,
    decision,
    presentation: performancePresentation(accepted),
    antiJitter: Object.freeze({
      applied: antiJitterApplied,
      stabilityWindowMs,
      minimumDwellMs,
      recoveryStableMs,
      dwellMs,
      rapidUpgradeAllowed: false,
      immediateCostReductionAllowed: true,
      stateChangeCoalescingRequired: true,
      hysteresisRequired: true
    }),
    diagnostics: Object.freeze({
      reasonCodes: unique(reasons),
      rawRuntimePayloadIncluded: false,
      deviceIdentityIncluded: false,
      privateContentIncluded: false
    }),
    invariants: Object.freeze({
      semanticsPreserved: true,
      interactionCapabilityPreserved: true,
      capabilityTruthModified: false,
      accessibilityPrecedencePreserved: true
    }),
    authority: Object.freeze({
      presentationOnly: true,
      runtimeSignalsOwnedByCaller: true,
      runtimeStateManufacturedByGlaze: false,
      permissionOrAuthorizationChanged: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export function createGlazeAdaptationDiagnostic(input = {}) {
  if (!plainObject(input)) throw new TypeError('Adaptation diagnostic input must be a plain object');

  const reasons = Array.isArray(input.reasonCodes)
    ? unique(input.reasonCodes.map(value => semanticId(value, 'redacted-reason')).slice(0, 32))
    : Object.freeze([]);

  const profiles = Array.isArray(input.accessibilityProfiles)
    ? unique(input.accessibilityProfiles.filter(profile => ACCESSIBILITY_PROFILES.includes(profile)))
    : Object.freeze([]);

  const performanceLevel = semanticId(input.performanceLevel, 'balanced');

  return Object.freeze({
    version: '1.6.0-dev.2',
    lifecycle: 'development',
    reasonCodes: reasons,
    accessibilityProfiles: profiles,
    performanceLevel: PERFORMANCE_LEVELS.includes(performanceLevel) ? performanceLevel : 'balanced',
    explanationKinds: Object.freeze([
      'reduced-transparency-applied',
      'density-adapted',
      'expensive-blur-disabled',
      'capability-unavailable',
      'offline-fallback-active',
      'high-contrast-mode-active',
      'performance-level-adapted',
      'anti-jitter-hysteresis-active'
    ]),
    privacy: Object.freeze({
      rawContentIncluded: false,
      privateCommunicationsIncluded: false,
      preciseBehaviorIncluded: false,
      providerIdentityIncluded: false,
      credentialsIncluded: false
    }),
    authority: Object.freeze({
      diagnosticOnly: true,
      operationalAuthorityGranted: false,
      securityStateManufactured: false,
      privacyStateManufactured: false,
      capabilityStateManufactured: false
    })
  });
}

export const glazeV16StateAccessibilityDevelopmentContract = Object.freeze({
  version: '1.6.0-dev.2',
  lifecycle: 'development',
  stableBaseline: '1.5.1',
  consumerEligible: false,
  semanticStates: SEMANTIC_STATES,
  capabilityPresentationStates: CAPABILITY_PRESENTATION_STATES,
  accessibilityProfiles: ACCESSIBILITY_PROFILES,
  performanceLevels: PERFORMANCE_LEVELS,
  accessibilityPrecedence: true,
  semanticMeaningThemeIndependent: true,
  colorOnlyMeaningAllowed: false,
  providerTruthManufactured: false,
  performanceAdaptationMayModifyCapabilityTruth: false,
  antiJitterStabilityWindowMs: DEFAULT_STABILITY_WINDOW_MS,
  antiJitterMinimumDwellMs: DEFAULT_MINIMUM_DWELL_MS,
  immediateCostReductionAllowed: true,
  rapidVisualCostUpgradeAllowed: false,
  authorityBoundary: 'presentation-only'
});
