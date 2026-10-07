/* GLAZE UI V1.6 — Development complexity, energy, component,
 * forms, dense-data, chart, media, scroll, and background-activity foundation.
 *
 * Development-only and non-consumer-eligible. Application/provider systems
 * own workflow/data/save/activity truth. Glaze resolves presentation only.
 */

import {
  resolveGlazePerformanceLevel
} from './glaze-v1.6-state-accessibility.dev.mjs';
import {
  resolveGlazeMaterialPresentation
} from './glaze-v1.6-material-type-input.dev.mjs';

const COMPLEXITY_DIMENSIONS = Object.freeze([
  'transparentLayers',
  'blurLayers',
  'shadows',
  'animatedSurfaces',
  'gradientLayers',
  'liveBackgrounds',
  'skeletonAnimations'
]);

const DEFAULT_COMPLEXITY_BUDGET = Object.freeze({
  transparentLayers: 4,
  blurLayers: 1,
  shadows: 4,
  animatedSurfaces: 4,
  gradientLayers: 2,
  liveBackgrounds: 1,
  skeletonAnimations: 4
});

const REQUIRED_COMPONENT_STATES = Object.freeze([
  'default',
  'hover',
  'focused',
  'pressed',
  'selected',
  'disabled',
  'loading',
  'error'
]);

const OPTIONAL_COMPONENT_STATES = Object.freeze([
  'read-only',
  'expanded',
  'success',
  'warning',
  'empty',
  'offline',
  'restricted',
  'unavailable',
  'updating',
  'conflict'
]);

const COMPONENT_CONTAINER_KINDS = Object.freeze([
  'canvas',
  'surface',
  'raised-surface',
  'glaze-surface',
  'overlay',
  'dialog',
  'group',
  'field-group',
  'table-region',
  'media-region'
]);

const FIELD_DESIGNATIONS = Object.freeze(['required','optional']);
const FIELD_STATES = Object.freeze([
  'default',
  'warning',
  'invalid',
  'disabled',
  'read-only',
  'saving',
  'saved',
  'save-failed'
]);

const SAVE_STATES = Object.freeze([
  'unsaved',
  'saving',
  'saved',
  'save-failed',
  'conflict',
  'offline-pending'
]);

const TABLE_FEATURES = Object.freeze([
  'sticky-headers',
  'row-focus',
  'selection',
  'sortable-columns',
  'responsive-collapse',
  'horizontal-overflow',
  'loading-rows',
  'empty-state',
  'error-state',
  'compact-density',
  'accessible-row-column-semantics'
]);

const CHART_ALTERNATIVES = Object.freeze([
  'labels',
  'values',
  'summary',
  'accessible-description',
  'table'
]);

const MEDIA_PROTECTION = Object.freeze([
  'contrast-surface',
  'scrim',
  'adaptive-opacity',
  'bounded-blur',
  'protected-text'
]);

const SCROLL_FEATURES = Object.freeze([
  'scrollbar-presentation',
  'overscroll',
  'restoration',
  'sticky-surfaces',
  'nested-scrolling',
  'keyboard-scrolling'
]);

const BACKGROUND_ACTIVITY_SURFACES = Object.freeze([
  'toolbar-activity',
  'status-indicator',
  'inline-sync-marker',
  'small-progress-surface',
  'blocking-loader'
]);

function plainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function semanticId(value, fallback = 'unknown') {
  const text = String(value ?? '').trim().toLowerCase();
  return text || fallback;
}

function bool(value) {
  return value === true;
}

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function uniqueSemantic(values) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze([...new Set(values.map(value => semanticId(value)).filter(Boolean))]);
}

function normalizeComplexity(input) {
  const source = plainObject(input) ? input : {};
  const result = {};
  for (const key of COMPLEXITY_DIMENSIONS) {
    result[key] = nonNegativeInteger(source[key], 0);
  }
  return Object.freeze(result);
}

function normalizeBudget(input) {
  const source = plainObject(input) ? input : {};
  const result = {};
  for (const key of COMPLEXITY_DIMENSIONS) {
    result[key] = nonNegativeInteger(source[key], DEFAULT_COMPLEXITY_BUDGET[key]);
  }
  return Object.freeze(result);
}

function exceededDimensions(observed, budget) {
  return Object.freeze(COMPLEXITY_DIMENSIONS.filter(key => observed[key] > budget[key]));
}

function simplificationActions(exceeded) {
  const actions = [];
  if (exceeded.includes('transparentLayers')) actions.push('replace-optional-transparency-with-solid-or-near-solid');
  if (exceeded.includes('blurLayers')) actions.push('remove-nested-or-optional-blur');
  if (exceeded.includes('shadows')) actions.push('reduce-decorative-shadow-depth');
  if (exceeded.includes('animatedSurfaces')) actions.push('stop-optional-continuous-animation');
  if (exceeded.includes('gradientLayers')) actions.push('simplify-decorative-gradients');
  if (exceeded.includes('liveBackgrounds')) actions.push('freeze-or-replace-live-background');
  if (exceeded.includes('skeletonAnimations')) actions.push('reduce-skeleton-motion-or-use-static-placeholder');
  return Object.freeze(actions);
}

export function resolveGlazeVisualComplexity(input = {}) {
  if (!plainObject(input)) throw new TypeError('Visual complexity input must be a plain object');

  const observed = normalizeComplexity(input.observed);
  const budget = normalizeBudget(input.budget);
  const exceeded = exceededDimensions(observed, budget);
  const performanceLevel = semanticId(input.performanceLevel, 'balanced');
  const accessibilityProfiles = uniqueSemantic(input.accessibilityProfiles);
  const simplifiedEffects = accessibilityProfiles.includes('simplified-visual-effects')
    || accessibilityProfiles.includes('reduced-transparency')
    || accessibilityProfiles.includes('solid-surfaces');
  const constrainedPerformance = ['efficient','essential'].includes(performanceLevel);
  const overBudget = exceeded.length > 0;
  const simplifyOptionalEffects = overBudget || simplifiedEffects || constrainedPerformance;

  return Object.freeze({
    version: '1.6.0-dev.7',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    observed,
    budget,
    exceededDimensions: exceeded,
    overBudget,
    presentation: Object.freeze({
      simplifyOptionalEffects,
      simplificationActions: simplifyOptionalEffects
        ? simplificationActions(overBudget ? exceeded : COMPLEXITY_DIMENSIONS)
        : Object.freeze([]),
      semanticContentMayBeRemovedToMeetBudget: false,
      accessibilityMayBeReducedToMeetBudget: false,
      criticalStatusMayBeHiddenToMeetBudget: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      observedComplexityOwnedByCallerOrRenderer: true,
      runtimeCapabilityInvented: false
    })
  });
}

export function resolveGlazeEnergyPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Energy presentation input must be a plain object');

  const activity = semanticId(input.activity, 'active');
  if (!['active','idle','background'].includes(activity)) {
    throw new RangeError(`Unsupported energy activity state: ${activity}`);
  }

  const powerSaving = bool(input.powerSaving);
  const thermalPressure = semanticId(input.thermalPressure, 'normal');
  const sustainedFrameDegradation = bool(input.sustainedFrameDegradation);
  const previous = plainObject(input.previousPerformance)
    ? input.previousPerformance
    : {level:'balanced',acceptedAtMs:0};

  const performance = resolveGlazePerformanceLevel({
    nowMs: nonNegativeInteger(input.nowMs, 5000),
    previous,
    runtime: {
      pressure: ['critical','high'].includes(thermalPressure) ? 'critical' : 'normal',
      powerSaving,
      sustainedFrameDegradation,
      renderingCapability: semanticId(input.renderingCapability, 'full'),
      recoveryStableMs: nonNegativeInteger(input.recoveryStableMs, 5000)
    }
  });

  const calmIdle = activity === 'idle';
  const constrained = powerSaving
    || ['high','critical'].includes(thermalPressure)
    || ['efficient','essential'].includes(performance.acceptedLevel);

  return Object.freeze({
    version: '1.6.0-dev.7',
    lifecycle: 'development',
    activity,
    performance,
    presentation: Object.freeze({
      continuousDecorativeAnimationAllowed: !calmIdle && !constrained,
      liveBackgroundMotionAllowed: !calmIdle && !constrained,
      idleBackgroundShouldCalm: calmIdle,
      optionalMaterialAnimationAllowed: !constrained,
      essentialProgressAnimationMayRemain: true,
      directManipulationMayRemainResponsive: true
    }),
    authority: Object.freeze({
      presentationOnly: true,
      powerStateOwnedByPlatform: true,
      thermalStateOwnedByPlatform: true,
      activityTruthOwnedByApplication: true
    })
  });
}

export function evaluateGlazeComponentStateCompleteness(input = {}) {
  if (!plainObject(input)) throw new TypeError('Component-state input must be a plain object');

  const componentId = String(input.componentId ?? '').trim();
  if (!componentId) throw new RangeError('componentId is required');

  const declared = uniqueSemantic(input.declaredStates);
  const applicableAdditional = uniqueSemantic(input.applicableAdditionalStates)
    .filter(state => OPTIONAL_COMPONENT_STATES.includes(state));
  const required = Object.freeze([...REQUIRED_COMPONENT_STATES, ...applicableAdditional]);
  const missing = Object.freeze(required.filter(state => !declared.includes(state)));

  return Object.freeze({
    version: '1.6.0-dev.7',
    lifecycle: 'development',
    componentId,
    declaredStates: declared,
    requiredStates: required,
    missingStates: missing,
    complete: missing.length === 0,
    rules: Object.freeze({
      applicationSpecificGuessworkAllowedForMissingCriticalStates: false,
      additionalRelevantStatesMayBeRequired: true,
      semanticStateMeaningMustRemainConsistent: true
    })
  });
}

export function evaluateGlazeComponentComposition(input = {}) {
  if (!plainObject(input)) throw new TypeError('Component-composition input must be a plain object');

  const parentKind = semanticId(input.parentKind, 'surface');
  const childKind = semanticId(input.childKind, 'group');
  if (!COMPONENT_CONTAINER_KINDS.includes(parentKind) || !COMPONENT_CONTAINER_KINDS.includes(childKind)) {
    throw new RangeError(`Unsupported composition: ${parentKind} -> ${childKind}`);
  }

  const transparentAncestors = nonNegativeInteger(input.transparentAncestors, 0);
  const borderAncestors = nonNegativeInteger(input.borderAncestors, 0);
  const elevationAncestors = nonNegativeInteger(input.elevationAncestors, 0);
  const repeatedPaddingLayers = nonNegativeInteger(input.repeatedPaddingLayers, 0);
  const childTransparent = bool(input.childTransparent);
  const childBordered = bool(input.childBordered);
  const childElevated = bool(input.childElevated);

  const violations = [];
  if (childTransparent && transparentAncestors > 0) violations.push('nested-transparency');
  if (childBordered && borderAncestors > 0) violations.push('repeated-borders');
  if (childElevated && elevationAncestors > 1) violations.push('conflicting-elevation');
  if (repeatedPaddingLayers > 1) violations.push('repeated-padding');
  if (transparentAncestors + elevationAncestors > 3) violations.push('excessive-container-hierarchy');

  return Object.freeze({
    version: '1.6.0-dev.7',
    lifecycle: 'development',
    parentKind,
    childKind,
    safeToNest: violations.length === 0,
    violations: Object.freeze(violations),
    rules: Object.freeze({
      nestedTransparencyDefaultAllowed: false,
      unnecessaryRepeatedBordersAllowed: false,
      conflictingElevationAllowed: false,
      repeatedPaddingAllowed: false,
      hierarchyMustRemainUnderstandable: true
    })
  });
}

export function resolveGlazeFormField(input = {}) {
  if (!plainObject(input)) throw new TypeError('Form-field input must be a plain object');

  const designation = semanticId(input.designation, 'optional');
  const state = semanticId(input.state, 'default');
  if (!FIELD_DESIGNATIONS.includes(designation)) {
    throw new RangeError(`Unsupported field designation: ${designation}`);
  }
  if (!FIELD_STATES.includes(state)) {
    throw new RangeError(`Unsupported field state: ${state}`);
  }

  const message = input.message == null ? null : String(input.message).trim() || null;
  const help = input.inlineHelp == null ? null : String(input.inlineHelp).trim() || null;
  const invalid = state === 'invalid';
  const warning = state === 'warning';
  const saveFailed = state === 'save-failed';

  return Object.freeze({
    version: '1.6.0-dev.7',
    lifecycle: 'development',
    designation,
    state,
    presentation: Object.freeze({
      requiredIndicator: designation === 'required',
      optionalIndicator: designation === 'optional',
      validationNearFieldRequired: invalid || warning || saveFailed,
      accessibleValidationAssociationRequired: invalid || warning || saveFailed,
      message,
      inlineHelp: help,
      disabledDistinctFromReadOnly: true,
      stateMayRelyOnColorAlone: false
    }),
    interaction: Object.freeze({
      editable: !['disabled','read-only'].includes(state),
      focusable: state !== 'disabled',
      valueStillReadableWhenDisabledOrReadOnly: true
    }),
    authority: Object.freeze({
      validationTruthOwnedByApplication: true,
      requiredTruthOwnedByApplication: true,
      saveTruthOwnedByApplication: true
    })
  });
}

export function resolveGlazeSaveState(input = {}) {
  if (!plainObject(input)) throw new TypeError('Save-state input must be a plain object');

  const state = semanticId(input.state, 'unsaved');
  if (!SAVE_STATES.includes(state)) {
    throw new RangeError(`Unsupported save state: ${state}`);
  }

  const authoritative = bool(input.authoritative);
  const positive = state === 'saved';
  const acceptedState = positive && !authoritative ? 'unsaved' : state;

  return Object.freeze({
    version: '1.6.0-dev.7',
    lifecycle: 'development',
    requestedState: state,
    acceptedState,
    semanticRole: `save.${acceptedState}`,
    presentation: Object.freeze({
      explicitFeedbackRequired: true,
      nonColorIndicatorRequired: true,
      pending: ['saving','offline-pending'].includes(acceptedState),
      failure: ['save-failed','conflict'].includes(acceptedState),
      positiveSavedStateRequiresAuthority: true
    }),
    authority: Object.freeze({
      persistenceTruthOwnedByApplicationOrStorageProvider: true,
      savedStateCreatedByGlaze: false,
      conflictResolutionAutomatic: false,
      retryAutomatic: false
    })
  });
}

export function resolveGlazeTablePresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Table presentation input must be a plain object');

  const enabledFeatures = uniqueSemantic(input.features)
    .filter(feature => TABLE_FEATURES.includes(feature));
  const density = semanticId(input.density, 'standard');
  const narrow = bool(input.narrow);
  const largeText = bool(input.largeText);

  return Object.freeze({
    version: '1.6.0-dev.7',
    lifecycle: 'development',
    features: enabledFeatures,
    presentation: Object.freeze({
      stickyHeaders: enabledFeatures.includes('sticky-headers'),
      rowFocus: enabledFeatures.includes('row-focus'),
      selection: enabledFeatures.includes('selection'),
      sortableColumns: enabledFeatures.includes('sortable-columns'),
      responsiveCollapse: enabledFeatures.includes('responsive-collapse'),
      horizontalOverflow: enabledFeatures.includes('horizontal-overflow'),
      loadingRows: enabledFeatures.includes('loading-rows'),
      emptyState: enabledFeatures.includes('empty-state'),
      errorState: enabledFeatures.includes('error-state'),
      density,
      transparencyPolicy: 'solid-or-near-solid',
      compactMayShrinkTargetsBelowMinimum: false
    }),
    accessibility: Object.freeze({
      rowColumnSemanticsRequired: true,
      keyboardRowAndCellAccessRequired: true,
      sortStateMustBeProgrammatic: enabledFeatures.includes('sortable-columns'),
      selectionStateMustBeProgrammatic: enabledFeatures.includes('selection'),
      largeTextMayPreferResponsiveCollapse: largeText || narrow
    }),
    authority: Object.freeze({
      dataTruthOwnedByApplication: true,
      sortExecutedByGlaze: false,
      selectionExecutedByGlaze: false
    })
  });
}

export function resolveGlazeChartAccessibility(input = {}) {
  if (!plainObject(input)) throw new TypeError('Chart accessibility input must be a plain object');

  const alternatives = uniqueSemantic(input.alternatives)
    .filter(item => CHART_ALTERNATIVES.includes(item));
  const essentialInformation = bool(input.essentialInformation);
  const hasTextAlternative = alternatives.some(item => ['summary','accessible-description','table','values'].includes(item));
  const hasStructuredAlternative = alternatives.includes('table');

  return Object.freeze({
    version: '1.6.0-dev.7',
    lifecycle: 'development',
    alternatives,
    complete: !essentialInformation || hasTextAlternative,
    accessibility: Object.freeze({
      colorOnlyMeaningAllowed: false,
      labelsSupported: alternatives.includes('labels'),
      valuesSupported: alternatives.includes('values'),
      summarySupported: alternatives.includes('summary'),
      accessibleDescriptionSupported: alternatives.includes('accessible-description'),
      tableAlternativeSupported: hasStructuredAlternative,
      essentialInformationRequiresNonvisualAlternative: true
    }),
    authority: Object.freeze({
      chartDataTruthOwnedByApplication: true,
      summaryContentInventedByGlaze: false,
      numericValuesInventedByGlaze: false
    })
  });
}

export function resolveGlazeMediaControls(input = {}) {
  if (!plainObject(input)) throw new TypeError('Media-controls input must be a plain object');

  const backgroundComplexity = semanticId(input.backgroundComplexity, 'high');
  const accessibilityProfiles = uniqueSemantic(input.accessibilityProfiles);
  const performanceLevel = semanticId(input.performanceLevel, 'balanced');

  const material = resolveGlazeMaterialPresentation({
    contentKind: 'media-control',
    backgroundComplexity,
    foregroundImportance: 'high',
    accessibilityProfiles,
    performanceLevel,
    backdropSupported: input.backdropSupported !== false,
    resourceConstrained: bool(input.resourceConstrained),
    batteryPreservation: bool(input.batteryPreservation),
    overlappingBlurLimitReached: bool(input.overlappingBlurLimitReached)
  });

  const protection = [];
  if (['high','very-high','busy','extreme'].includes(backgroundComplexity)) {
    protection.push('contrast-surface','scrim','adaptive-opacity','protected-text');
  } else {
    protection.push('contrast-surface','adaptive-opacity','protected-text');
  }
  if (material.material.blurLevel !== 'none') protection.push('bounded-blur');

  return Object.freeze({
    version: '1.6.0-dev.7',
    lifecycle: 'development',
    backgroundComplexity,
    material,
    protection: Object.freeze([...new Set(protection)]),
    rules: Object.freeze({
      controlLegibilityProtected: true,
      mediaContentMayOverrideControlContrast: false,
      blurIsBounded: true,
      protectedTextRequired: true
    })
  });
}

export function resolveGlazeScrollPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Scroll presentation input must be a plain object');

  const features = uniqueSemantic(input.features)
    .filter(feature => SCROLL_FEATURES.includes(feature));
  const nested = features.includes('nested-scrolling') || bool(input.nested);
  const restorationKey = input.restorationKey == null ? null : String(input.restorationKey).trim() || null;

  return Object.freeze({
    version: '1.6.0-dev.7',
    lifecycle: 'development',
    features,
    presentation: Object.freeze({
      scrollbarPresentationStandardized: true,
      overscrollMustNotHideContent: true,
      restorationSupported: features.includes('restoration') || restorationKey !== null,
      stickySurfacesMayObscureFocusedContent: false,
      nestedScrollingAllowedWhenTaskRequires: nested,
      nestedScrollingMustExposeClearScrollOwnership: nested,
      keyboardScrollingRequired: true,
      decorativeScrollEffectsMayBlockContentAccess: false
    }),
    continuity: Object.freeze({
      restorationKey,
      focusPreservedWherePractical: true,
      scrollContextPreservedAcrossResponsiveTransformation: true
    }),
    authority: Object.freeze({
      presentationOnly: true,
      scrollPositionOwnedByApplicationOrPlatform: true,
      navigationExecutedByGlaze: false
    })
  });
}

export function resolveGlazeBackgroundActivity(input = {}) {
  if (!plainObject(input)) throw new TypeError('Background-activity input must be a plain object');

  const blocking = bool(input.blocking);
  const kind = semanticId(input.kind, 'background-work');
  const progressKnown = Number.isFinite(Number(input.progress))
    && Number(input.progress) >= 0
    && Number(input.progress) <= 1;

  let surface = 'status-indicator';
  if (blocking) surface = 'blocking-loader';
  else if (kind === 'sync') surface = 'inline-sync-marker';
  else if (kind === 'transfer' || kind === 'processing') surface = progressKnown
    ? 'small-progress-surface'
    : 'toolbar-activity';

  return Object.freeze({
    version: '1.6.0-dev.7',
    lifecycle: 'development',
    kind,
    blocking,
    surface,
    supportedSurfaces: BACKGROUND_ACTIVITY_SURFACES,
    progress: progressKnown ? Number(input.progress) : null,
    presentation: Object.freeze({
      interruptUser: blocking,
      fullBlockingLoaderAllowed: blocking,
      nonBlockingWorkMayUseFullBlockingLoader: false,
      existingInterfaceRemainsUsable: !blocking,
      subtleFeedbackPreferred: !blocking,
      fakeProgressGenerated: false
    }),
    authority: Object.freeze({
      blockingTruthOwnedByApplication: true,
      progressTruthOwnedByApplicationOrProvider: true,
      backgroundTaskExecutedByGlaze: false,
      cancellationCapabilityInvented: false
    })
  });
}

export const glazeV16ComponentSystemsDevelopmentContract = Object.freeze({
  version: '1.6.0-dev.7',
  lifecycle: 'development',
  stableBaseline: '1.5.1',
  consumerEligible: false,
  complexityDimensions: COMPLEXITY_DIMENSIONS,
  referenceComplexityBudget: DEFAULT_COMPLEXITY_BUDGET,
  requiredComponentStates: REQUIRED_COMPONENT_STATES,
  optionalComponentStates: OPTIONAL_COMPONENT_STATES,
  containerKinds: COMPONENT_CONTAINER_KINDS,
  fieldDesignations: FIELD_DESIGNATIONS,
  fieldStates: FIELD_STATES,
  saveStates: SAVE_STATES,
  tableFeatures: TABLE_FEATURES,
  chartAlternatives: CHART_ALTERNATIVES,
  mediaProtection: MEDIA_PROTECTION,
  scrollFeatures: SCROLL_FEATURES,
  backgroundActivitySurfaces: BACKGROUND_ACTIVITY_SURFACES,
  optionalEffectsSimplifyWhenOverBudget: true,
  idleBackgroundsCalm: true,
  componentCriticalStatesMayBeApplicationGuesswork: false,
  nestedTransparencyDefaultAllowed: false,
  formValidationNearFieldRequired: true,
  savedStateRequiresAuthority: true,
  denseDataTransparencyConservative: true,
  chartColorOnlyMeaningAllowed: false,
  decorativeScrollEffectsMayBlockAccess: false,
  nonBlockingActivityMayUseBlockingLoader: false,
  authorityBoundary: 'presentation-only'
});
