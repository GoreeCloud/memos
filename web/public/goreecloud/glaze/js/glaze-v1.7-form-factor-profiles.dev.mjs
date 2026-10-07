/* GLAZE UI V1.7 — First-Class Form-Factor Profiles Development foundation.
 *
 * Development-only semantic profile resolver. GLAZE UI V1.6 / 1.6.0
 * remains the current Official Stable consumer target.
 */

import {
  resolveGlazeTaskContinuity,
  resolveGlazeAdaptiveComposition
} from './glaze-v1.7-task-continuity.dev.mjs';
import {glazeV17AdaptiveInputDevelopmentContract} from './glaze-v1.7-adaptive-input.dev.mjs';

const PROFILES = Object.freeze([
  'mobile',
  'tablet',
  'desktop',
  'foldable',
  'tv',
  'wearable'
]);

const EXPERIMENTAL_PROFILES = Object.freeze(['spatial']);

const PROFILE_DIMENSIONS = Object.freeze([
  'navigation',
  'reachability',
  'density',
  'safe-areas',
  'viewing-distance',
  'primary-input',
  'typography',
  'action-placement',
  'information-hierarchy',
  'pane-behavior',
  'overlay-behavior',
  'motion',
  'interaction-targets'
]);

const FOLDABLE_POSTURES = Object.freeze([
  'folded',
  'unfolded',
  'tabletop',
  'flat',
  'unknown'
]);

const PROFILE_DEFINITIONS = Object.freeze({
  mobile: Object.freeze({
    priority: 'first',
    navigation: 'bottom-or-compact',
    reachability: 'reachable-primary-zone',
    density: 'comfortable',
    safeAreas: 'platform-insets',
    viewingDistance: 'near',
    primaryInputs: Object.freeze(['touch','keyboard','voice-access','switch-access','assistive-input']),
    typography: 'compact-near-view',
    actionPlacement: 'thumb-reachable-primary',
    informationHierarchy: 'single-primary-task',
    paneBehavior: 'single-pane',
    overlayBehavior: 'sheet-or-full-screen',
    motion: 'bounded-near-view',
    interactionTargets: 'touch-floor'
  }),
  tablet: Object.freeze({
    priority: 'first',
    navigation: 'rail-or-compact-sidebar',
    reachability: 'touch-and-pointer-aware',
    density: 'standard',
    safeAreas: 'platform-insets',
    viewingDistance: 'near',
    primaryInputs: Object.freeze(['touch','pointer','keyboard','stylus','voice-access','switch-access','assistive-input']),
    typography: 'medium-near-view',
    actionPlacement: 'reachable-primary-and-contextual',
    informationHierarchy: 'primary-plus-supporting',
    paneBehavior: 'dual-pane',
    overlayBehavior: 'sheet-or-side-pane',
    motion: 'bounded-near-view',
    interactionTargets: 'touch-floor'
  }),
  desktop: Object.freeze({
    priority: 'standard',
    navigation: 'sidebar-rail-or-toolbar',
    reachability: 'pointer-keyboard-first-with-touch-support',
    density: 'standard',
    safeAreas: 'window-and-platform-insets',
    viewingDistance: 'near',
    primaryInputs: Object.freeze(['pointer','keyboard','touch','stylus','voice-access','switch-access','assistive-input']),
    typography: 'workspace-near-view',
    actionPlacement: 'stable-toolbar-and-contextual',
    informationHierarchy: 'multi-region',
    paneBehavior: 'multi-pane',
    overlayBehavior: 'popover-dialog-or-floating-panel',
    motion: 'bounded-workspace',
    interactionTargets: 'mixed-input-floor'
  }),
  foldable: Object.freeze({
    priority: 'standard',
    navigation: 'posture-aware',
    reachability: 'posture-aware',
    density: 'standard',
    safeAreas: 'platform-insets-and-unsafe-regions',
    viewingDistance: 'near',
    primaryInputs: Object.freeze(['touch','pointer','keyboard','stylus','voice-access','switch-access','assistive-input']),
    typography: 'posture-aware-near-view',
    actionPlacement: 'avoid-unsafe-regions',
    informationHierarchy: 'posture-dependent',
    paneBehavior: 'single-or-dual-by-posture',
    overlayBehavior: 'sheet-side-pane-or-full-screen',
    motion: 'posture-continuous',
    interactionTargets: 'touch-floor'
  }),
  tv: Object.freeze({
    priority: 'standard',
    navigation: 'directional-focus',
    reachability: 'far-view-directional',
    density: 'comfortable',
    safeAreas: 'platform-safe-region',
    viewingDistance: 'far',
    primaryInputs: Object.freeze(['remote-dpad','keyboard','voice-access','switch-access','assistive-input']),
    typography: 'far-view',
    actionPlacement: 'focus-order-visible',
    informationHierarchy: 'large-structured-regions',
    paneBehavior: 'task-dependent-large-regions',
    overlayBehavior: 'far-view-panel-or-dialog',
    motion: 'bounded-far-view-focus',
    interactionTargets: 'far-view-floor'
  }),
  wearable: Object.freeze({
    priority: 'standard',
    navigation: 'shallow-and-glanceable',
    reachability: 'single-focus',
    density: 'comfortable',
    safeAreas: 'platform-insets',
    viewingDistance: 'near-glance',
    primaryInputs: Object.freeze(['touch','rotary','voice-access','switch-access','assistive-input']),
    typography: 'glanceable',
    actionPlacement: 'single-primary-action',
    informationHierarchy: 'primary-value-first',
    paneBehavior: 'single-pane',
    overlayBehavior: 'full-screen-or-platform-native',
    motion: 'minimal-glanceable',
    interactionTargets: 'wearable-platform-floor'
  })
});

function plainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function semanticId(value, fallback = null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized || fallback;
}

function uniqueStrings(values, max = 100) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze(
    [...new Set(values.map(value => semanticId(value)).filter(Boolean))].slice(0, max)
  );
}

function validateProfile(value) {
  const profile = semanticId(value);
  if (!PROFILES.includes(profile)) {
    if (EXPERIMENTAL_PROFILES.includes(profile)) {
      throw new RangeError(`Experimental profile is not first-class consumer-eligible: ${profile}`);
    }
    throw new RangeError(`Unsupported form-factor profile: ${profile}`);
  }
  return profile;
}

function normalizePosture(profile, value) {
  const posture = semanticId(value, 'unknown');
  if (profile !== 'foldable') return posture;
  if (!FOLDABLE_POSTURES.includes(posture)) {
    throw new RangeError(`Unsupported foldable posture: ${posture}`);
  }
  return posture;
}

function accessibilitySet(values) {
  return new Set(uniqueStrings(values));
}

function paneModeFor(profile, posture, profiles) {
  const largeText = profiles.has('large-text') || profiles.has('extra-large-text');

  if (profile === 'mobile' || profile === 'wearable') return 'single-pane';
  if (profile === 'tablet') return largeText ? 'single-pane' : 'dual-pane';
  if (profile === 'desktop') return largeText ? 'dual-pane' : 'multi-pane';
  if (profile === 'foldable') {
    if (largeText || posture === 'folded') return 'single-pane';
    return 'dual-pane';
  }
  if (profile === 'tv') return largeText ? 'single-pane' : 'dual-pane';
  return 'single-pane';
}

function effectiveDensity(definition, profiles) {
  if (profiles.has('large-text') || profiles.has('extra-large-text') || profiles.has('touch-assistance')) {
    return 'comfortable';
  }
  return definition.density;
}

function effectiveMotion(definition, profiles) {
  if (profiles.has('reduced-motion')) return 'reduced';
  return definition.motion;
}

function effectiveTargets(definition, profiles) {
  if (profiles.has('touch-assistance')) return 'assisted-large';
  return definition.interactionTargets;
}

function validateCallerInputs(values) {
  const inputs = uniqueStrings(values);
  const supported = new Set(glazeV17AdaptiveInputDevelopmentContract.inputModels);
  const invalid = inputs.find(input => !supported.has(input));
  if (invalid) throw new RangeError(`Unsupported caller input model: ${invalid}`);
  return inputs;
}

export function resolveGlazeFormFactorProfile(input = {}) {
  if (!plainObject(input)) throw new TypeError('Form-factor profile input must be a plain object');

  const profile = validateProfile(input.profile);
  const definition = PROFILE_DEFINITIONS[profile];
  const posture = normalizePosture(profile, input.posture);
  const profiles = accessibilitySet(input.accessibilityProfiles);
  const callerInputs = validateCallerInputs(input.availableInputs);
  const inputCapabilityAuthoritative = input.inputCapabilityAuthoritative === true;
  const primaryInputSet = new Set(definition.primaryInputs);
  const effectiveAvailableInputs = inputCapabilityAuthoritative
    ? Object.freeze(callerInputs.filter(model => primaryInputSet.has(model)))
    : Object.freeze([]);
  const unsafeRegionIds = uniqueStrings(input.unsafeRegionIds, 50);

  const semanticSurfaceId = String(input.semanticSurfaceId ?? 'profile-root').trim() || 'profile-root';
  const composition = resolveGlazeAdaptiveComposition({
    profile,
    semanticSurfaceId,
    surfaceRole: semanticId(input.surfaceRole, 'task'),
    posture,
    accessibilityProfiles: [...profiles],
    constrained: input.constrained === true
  });

  return Object.freeze({
    version: '1.7.0-dev.3',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    profile,
    semanticRole: `profile.${profile}`,
    priority: definition.priority,
    dimensions: PROFILE_DIMENSIONS,
    expectations: Object.freeze({
      navigation: definition.navigation,
      reachability: definition.reachability,
      density: effectiveDensity(definition, profiles),
      safeAreas: definition.safeAreas,
      viewingDistance: definition.viewingDistance,
      primaryInputs: definition.primaryInputs,
      typography: definition.typography,
      actionPlacement: definition.actionPlacement,
      informationHierarchy: definition.informationHierarchy,
      paneBehavior: paneModeFor(profile, posture, profiles),
      overlayBehavior: definition.overlayBehavior,
      motion: effectiveMotion(definition, profiles),
      interactionTargets: effectiveTargets(definition, profiles)
    }),
    composition: Object.freeze({
      semanticSurfaceId: composition.semanticSurfaceId,
      presentation: composition.presentation,
      semanticIdentityPreserved: composition.preservation.semanticIdentityPreserved,
      accessibilitySemanticsPreserved: composition.preservation.accessibilitySemanticsPreserved,
      taskStateResetOnRecompositionAllowed: composition.preservation.taskStateResetOnRecompositionAllowed
    }),
    input: Object.freeze({
      declaredPrimaryInputs: definition.primaryInputs,
      callerAvailableInputs: callerInputs,
      effectiveAvailableInputs,
      inputCapabilityAuthoritative,
      unknownWhenNotAuthoritative: !inputCapabilityAuthoritative
    }),
    safeArea: Object.freeze({
      platformProvidedInsetsRequired: true,
      unsafeRegionIds,
      unsafeRegionsCallerOrPlatformSupplied: true,
      hardCodedDeviceCutoutInsetsAllowed: false
    }),
    accessibility: Object.freeze({
      profiles: Object.freeze([...profiles]),
      mayOverrideDensity: true,
      mayReducePaneCount: true,
      targetSizeMayShrinkToPreservePaneCount: false,
      semanticHierarchyPreserved: true
    }),
    supportBoundary: Object.freeze({
      firstClassDevelopmentProfile: true,
      nativeDeviceAcceptanceImplied: false,
      downstreamConsumerAcceptanceImplied: false,
      productionSupportImplied: false,
      wearableGovernedProfileDefined: profile === 'wearable'
    }),
    authority: Object.freeze({
      presentationOnly: true,
      profileSelectedByCallerOrPlatform: true,
      widthAloneIsProfileAuthority: false,
      deviceBrandBreakpointAuthority: false,
      inputCapabilityCreatedByGlaze: false,
      hardwareCapabilityCreatedByGlaze: false,
      safeAreaCreatedByGlaze: false,
      consumerSupportCreatedByGlaze: false,
      authorizationGrantedByGlaze: false,
      permissionGrantedByGlaze: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export function resolveGlazeFormFactorTransition(input = {}) {
  if (!plainObject(input)) throw new TypeError('Form-factor transition input must be a plain object');

  const from = validateProfile(input.from);
  const to = validateProfile(input.to);

  const continuity = resolveGlazeTaskContinuity({
    environmentChange: 'form-factor',
    previous: input.previousTaskState,
    incoming: input.incomingTaskState,
    stateClasses: input.stateClasses,
    clearFields: input.clearFields,
    clearAuthoritative: input.clearAuthoritative,
    temporaryDisposableFields: input.temporaryDisposableFields,
    lossDirectedFields: input.lossDirectedFields,
    providerAuthoritativeFields: input.providerAuthoritativeFields,
    recoveryStateFields: input.recoveryStateFields
  });

  const fromProfile = resolveGlazeFormFactorProfile({
    profile: from,
    posture: input.fromPosture,
    accessibilityProfiles: input.accessibilityProfiles,
    availableInputs: input.fromAvailableInputs,
    inputCapabilityAuthoritative: input.fromInputCapabilityAuthoritative,
    unsafeRegionIds: input.fromUnsafeRegionIds,
    semanticSurfaceId: input.semanticSurfaceId,
    surfaceRole: input.surfaceRole
  });
  const toProfile = resolveGlazeFormFactorProfile({
    profile: to,
    posture: input.toPosture,
    accessibilityProfiles: input.accessibilityProfiles,
    availableInputs: input.toAvailableInputs,
    inputCapabilityAuthoritative: input.toInputCapabilityAuthoritative,
    unsafeRegionIds: input.toUnsafeRegionIds,
    semanticSurfaceId: input.semanticSurfaceId,
    surfaceRole: input.surfaceRole
  });

  return Object.freeze({
    version: '1.7.0-dev.3',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    transitionKey: `${from}->${to}`,
    from: fromProfile,
    to: toProfile,
    taskState: continuity.state,
    stateClasses: continuity.stateClasses,
    decisions: continuity.decisions,
    continuity: Object.freeze({
      ...continuity.continuity,
      semanticMeaningPreservedAcrossProfileChange: true,
      taskLossAllowed: false,
      navigationResetAllowed: false,
      focusResetAllowed: false,
      selectionResetAllowed: false,
      draftResetAllowed: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      profileSelectedByCallerOrPlatform: true,
      providerTruthOwnedByProvider: true,
      inputCapabilityCreatedByGlaze: false,
      hardwareCapabilityCreatedByGlaze: false,
      safeAreaCreatedByGlaze: false,
      consumerSupportCreatedByGlaze: false,
      authorizationGrantedByGlaze: false,
      permissionGrantedByGlaze: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export function resolveGlazeExperimentalFormFactorBoundary(input = {}) {
  if (!plainObject(input)) throw new TypeError('Experimental profile boundary input must be a plain object');

  const profile = semanticId(input.profile);
  if (!EXPERIMENTAL_PROFILES.includes(profile)) {
    throw new RangeError(`Unsupported experimental profile: ${profile}`);
  }

  return Object.freeze({
    version: '1.7.0-dev.3',
    lifecycle: 'experimental',
    stableBaseline: '1.6.0',
    profile,
    firstClassConsumerEligible: false,
    nativePlatformEvidenceRequired: true,
    accessibilityEvidenceRequired: true,
    interactionEvidenceRequired: true,
    performanceEvidenceRequired: true,
    representativeDeviceEvidenceRequired: true,
    authority: Object.freeze({
      presentationOnly: true,
      consumerSupportCreatedByGlaze: false,
      productionSupportImplied: false
    })
  });
}

export const glazeV17FormFactorProfilesDevelopmentContract = Object.freeze({
  version: '1.7.0-dev.3',
  lifecycle: 'development',
  stableBaseline: '1.6.0',
  consumerEligible: false,
  implementedSpecificationSections: Object.freeze([3]),
  profiles: PROFILES,
  priorityProfiles: Object.freeze(['mobile','tablet']),
  profileDimensions: PROFILE_DIMENSIONS,
  experimentalProfiles: EXPERIMENTAL_PROFILES,
  widthAloneIsProfileAuthority: false,
  deviceBrandBreakpointAuthority: false,
  taskContinuityRequired: true,
  accessibilityMayReducePaneCount: true,
  targetSizeMayShrinkToPreservePaneCount: false,
  wearableNativeDeviceAcceptanceImplied: false,
  spatialFirstClassConsumerEligible: false,
  presentationOnly: true,
  inputCapabilityCreatedByGlaze: false,
  consumerSupportCreatedByGlaze: false,
  consequentialExecutionAutomatic: false
});
