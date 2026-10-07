/* GLAZE UI V1.6 — Development material, typography, density,
 * input, press, hover, and tactile-intent foundation.
 *
 * Development-only and non-consumer-eligible. Existing Stable V1.5.1
 * token/value authorities remain unchanged.
 */

const MATERIAL_ROLES = Object.freeze([
  'canvas',
  'solid',
  'raised',
  'functional-glass',
  'clear-glass',
  'overlay'
]);

const BLUR_LEVELS = Object.freeze([
  'none',
  'low',
  'standard'
]);

const DEPTH_ROLES = Object.freeze([
  'canvas',
  'base-surface',
  'raised-surface',
  'floating-surface',
  'overlay',
  'dialog',
  'modal',
  'transient-control',
  'context-surface'
]);

const SOLID_PREFERRED_CONTENT = Object.freeze([
  'dense-text',
  'critical-warning',
  'security-confirmation',
  'privacy-decision',
  'complex-form',
  'long-reading',
  'accessibility-fallback',
  'high-information-table'
]);

const TYPOGRAPHY_ROLES = Object.freeze([
  'display',
  'hero',
  'page-title',
  'section-heading',
  'subheading',
  'body',
  'secondary-body',
  'label',
  'supporting-label',
  'caption',
  'metadata',
  'numeric-data',
  'code',
  'status',
  'button-text'
]);

const TYPE_SOURCE_ROLE = Object.freeze({
  display: 'display',
  hero: 'largeTitle',
  'page-title': 'title',
  'section-heading': 'heading',
  subheading: 'subheading',
  body: 'body',
  'secondary-body': 'body',
  label: 'label',
  'supporting-label': 'label',
  caption: 'caption',
  metadata: 'caption',
  'numeric-data': 'numeric',
  code: 'monospace',
  status: 'ui',
  'button-text': 'ui'
});

const TYPE_ENVIRONMENTS = Object.freeze([
  'compact',
  'medium',
  'expanded',
  'workspace',
  'far-view',
  'wearable'
]);

const LARGE_TEXT_COMPONENTS = Object.freeze([
  'navigation',
  'card',
  'toolbar',
  'dialog',
  'form',
  'table',
  'button',
  'media-control',
  'search',
  'notification',
  'settings'
]);

const DENSITY_MODES = Object.freeze([
  'comfortable',
  'standard',
  'compact'
]);

const INPUT_MODES = Object.freeze([
  'touch',
  'pointer',
  'keyboard',
  'directional',
  'stylus',
  'voice-focus',
  'assistive-input',
  'mixed'
]);

const HOVER_INTENTS = Object.freeze([
  'interactivity',
  'supplemental-information',
  'preview',
  'focus-intent'
]);

const PRESS_FEEDBACK = Object.freeze([
  'surface-compression',
  'light-change',
  'opacity',
  'scale',
  'border',
  'material-response'
]);

const TACTILE_INTENTS = Object.freeze([
  'selection',
  'toggle',
  'success',
  'warning',
  'error',
  'boundary',
  'drag-snap'
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

function numeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function unique(values) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze([...new Set(values.map(value => semanticId(value)).filter(Boolean))]);
}

function accessibilitySet(input) {
  return new Set(unique(input));
}

function complexityRank(value) {
  const normalized = semanticId(value, 'unknown');
  if (['very-high', 'extreme'].includes(normalized)) return 3;
  if (['high', 'busy'].includes(normalized)) return 2;
  if (['medium', 'moderate'].includes(normalized)) return 1;
  return 0;
}

function importanceRank(value) {
  const normalized = semanticId(value, 'standard');
  if (['critical', 'highest'].includes(normalized)) return 3;
  if (['high', 'primary'].includes(normalized)) return 2;
  if (['medium', 'standard'].includes(normalized)) return 1;
  return 0;
}

function performanceRank(level) {
  switch (semanticId(level, 'balanced')) {
    case 'essential': return 3;
    case 'efficient': return 2;
    case 'balanced': return 1;
    default: return 0;
  }
}

function chooseMaterial({
  contentKind,
  backgroundComplexity,
  foregroundImportance,
  focused,
  modal,
  accessibilityProfiles,
  performanceLevel,
  backdropSupported
}) {
  const profiles = accessibilitySet(accessibilityProfiles);
  const reducedTransparency = profiles.has('reduced-transparency')
    || profiles.has('solid-surfaces');
  const increasedContrast = profiles.has('increased-contrast');
  const simplified = profiles.has('simplified-visual-effects');
  const criticalContent = SOLID_PREFERRED_CONTENT.includes(contentKind);
  const complexity = complexityRank(backgroundComplexity);
  const importance = importanceRank(foregroundImportance);
  const performance = performanceRank(performanceLevel);

  if (
    criticalContent
    || reducedTransparency
    || increasedContrast
    || !backdropSupported
    || performance >= 3
  ) return 'solid';

  if (
    simplified
    || performance >= 2
    || complexity >= 2
    || importance >= 3
    || modal
  ) return 'raised';

  if (contentKind === 'media-control' && complexity <= 1 && !modal) {
    return 'clear-glass';
  }

  if (focused || importance >= 2 || complexity >= 1) {
    return 'functional-glass';
  }

  return 'functional-glass';
}

function materialOpacityMode(material, context) {
  if (material === 'solid') return 'solid';
  if (material === 'raised') return 'near-solid';
  if (context.modal || context.focused || complexityRank(context.backgroundComplexity) >= 2) {
    return 'strengthened';
  }
  return material === 'clear-glass' ? 'specialized-light' : 'bounded';
}

function blurLevel(material, context) {
  const profiles = accessibilitySet(context.accessibilityProfiles);
  const reducedTransparency = profiles.has('reduced-transparency')
    || profiles.has('solid-surfaces')
    || profiles.has('simplified-visual-effects');
  if (
    reducedTransparency
    || !context.backdropSupported
    || performanceRank(context.performanceLevel) >= 2
    || bool(context.batteryPreservation)
    || bool(context.resourceConstrained)
    || bool(context.overlappingBlurLimitReached)
  ) return 'none';
  if (material === 'clear-glass') return 'low';
  if (material === 'functional-glass') return 'standard';
  return 'none';
}

function depthRole(surfaceKind, modal) {
  if (modal) return 'modal';
  const requested = semanticId(surfaceKind, 'base-surface');
  return DEPTH_ROLES.includes(requested) ? requested : 'base-surface';
}

export function resolveGlazeMaterialPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Material presentation input must be a plain object');

  const contentKind = semanticId(input.contentKind, 'general-content');
  const context = {
    contentKind,
    backgroundComplexity: semanticId(input.backgroundComplexity, 'low'),
    backgroundLuminance: semanticId(input.backgroundLuminance, 'unknown'),
    foregroundImportance: semanticId(input.foregroundImportance, 'standard'),
    textDensity: semanticId(input.textDensity, 'normal'),
    scrolling: bool(input.scrolling),
    focused: bool(input.focused),
    modal: bool(input.modal),
    accessibilityProfiles: unique(input.accessibilityProfiles),
    performanceLevel: semanticId(input.performanceLevel, 'balanced'),
    inputMode: semanticId(input.inputMode, 'pointer'),
    formFactor: semanticId(input.formFactor, 'unknown'),
    backdropSupported: input.backdropSupported !== false,
    resourceConstrained: bool(input.resourceConstrained),
    batteryPreservation: bool(input.batteryPreservation),
    overlappingBlurLimitReached: bool(input.overlappingBlurLimitReached)
  };

  const material = chooseMaterial({
    contentKind,
    backgroundComplexity: context.backgroundComplexity,
    foregroundImportance: context.foregroundImportance,
    focused: context.focused,
    modal: context.modal,
    accessibilityProfiles: context.accessibilityProfiles,
    performanceLevel: context.performanceLevel,
    backdropSupported: context.backdropSupported
  });
  const blur = blurLevel(material, context);
  const opacityMode = materialOpacityMode(material, context);
  const depth = depthRole(input.surfaceKind, context.modal);
  const solidPreferred = SOLID_PREFERRED_CONTENT.includes(contentKind);

  return Object.freeze({
    version: '1.6.0-dev.4',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    material: Object.freeze({
      role: material,
      supportedRoles: MATERIAL_ROLES,
      opacityMode,
      blurLevel: blur,
      supportedBlurLevels: BLUR_LEVELS,
      depthRole: depth,
      supportedDepthRoles: DEPTH_ROLES,
      solidPreferred,
      transparentMaterialProhibited: solidPreferred || material === 'solid'
    }),
    readability: Object.freeze({
      complexityMayStrengthenSurface: true,
      focusMayStrengthenSurface: true,
      modalMayStrengthenSurface: true,
      textDensityMayPreferStableSurface: ['dense', 'very-dense'].includes(context.textDensity),
      clarityOverridesTranslucency: true,
      blurMayBeSoleContrastMechanism: false
    }),
    adaptation: Object.freeze({
      backgroundLuminanceConsidered: context.backgroundLuminance !== 'unknown',
      backgroundComplexityConsidered: true,
      foregroundImportanceConsidered: true,
      scrollingConsidered: context.scrolling,
      focusConsidered: context.focused,
      modalConsidered: context.modal,
      accessibilityConsidered: context.accessibilityProfiles.length > 0,
      performanceConsidered: true,
      inputModeConsidered: context.inputMode !== 'unknown',
      formFactorConsidered: context.formFactor !== 'unknown'
    }),
    performance: Object.freeze({
      resourceConstrained: context.resourceConstrained,
      batteryPreservation: context.batteryPreservation,
      overlappingBlurLimitReached: context.overlappingBlurLimitReached,
      unsupportedBackdropFallsBackSafely: !context.backdropSupported,
      blurIsBoundedResource: true
    }),
    authority: Object.freeze({
      presentationOnly: true,
      backgroundContentInspectedByGlaze: false,
      contentTruthModified: false,
      privacyStateInferred: false,
      securityStateInferred: false
    })
  });
}

export function resolveGlazeTypography(input = {}) {
  if (!plainObject(input)) throw new TypeError('Typography input must be a plain object');

  const role = semanticId(input.role, 'body');
  if (!TYPOGRAPHY_ROLES.includes(role)) {
    throw new RangeError(`Unsupported typography role: ${role}`);
  }

  const environment = semanticId(input.environment, 'medium');
  const acceptedEnvironment = TYPE_ENVIRONMENTS.includes(environment) ? environment : 'medium';
  const textScale = Math.max(1, numeric(input.textScale, 1));
  const languageExpansion = semanticId(input.languageExpansion, 'normal');
  const density = semanticId(input.density, 'standard');
  const interactionMode = semanticId(input.interactionMode, 'pointer');
  const availableSpace = semanticId(input.availableSpace, 'normal');
  const largeText = textScale >= 2;
  const expansionPressure = ['high', 'very-high'].includes(languageExpansion);
  const constrainedSpace = ['constrained', 'very-constrained'].includes(availableSpace);

  return Object.freeze({
    version: '1.6.0-dev.4',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    role,
    sourceRole: TYPE_SOURCE_ROLE[role],
    semanticToken: `type.${role}`,
    environment: acceptedEnvironment,
    adaptation: Object.freeze({
      responsive: true,
      textScale,
      languageExpansion,
      density,
      interactionMode,
      availableSpace,
      semanticHierarchyPreserved: true,
      uniformScaleOnly: false,
      widthCompressionAllowed: !largeText && !expansionPressure,
      arbitraryFontSizeAllowed: false
    }),
    reflow: Object.freeze({
      largeText,
      required: largeText || expansionPressure || constrainedSpace,
      wrappingPreferred: true,
      clippingAllowedByDefault: false,
      horizontalTextOverflowPreferred: false
    }),
    fontPolicy: Object.freeze({
      systemPlatformNativeFirst: true,
      locallyBundledApprovedFontAllowed: true,
      remoteRuntimeFontDependencyAllowed: false,
      unsupportedVariableAxesFallBackToStaticTypography: true
    }),
    authority: Object.freeze({
      presentationOnly: true,
      semanticHierarchyOwnedByGlaze: true,
      contentMeaningModified: false,
      localeInferredFromContent: false
    })
  });
}

export function resolveGlazeLargeTextResilience(input = {}) {
  if (!plainObject(input)) throw new TypeError('Large-text resilience input must be a plain object');

  const component = semanticId(input.component);
  if (!LARGE_TEXT_COMPONENTS.includes(component)) {
    throw new RangeError(`Unsupported large-text component class: ${component}`);
  }
  const textScale = Math.max(1, numeric(input.textScale, 1));
  const largeText = textScale >= 2;

  return Object.freeze({
    version: '1.6.0-dev.4',
    lifecycle: 'development',
    component,
    textScale,
    largeText,
    behavior: Object.freeze({
      wrapOrReflowRequired: true,
      clippingAllowed: false,
      targetSizeMayShrinkToPreserveLayout: false,
      densityMayYieldToReflow: true,
      paneCountMayYieldToAccessibility: true,
      semanticOrderPreserved: true,
      focusOrderPreserved: true
    })
  });
}

export function resolveGlazeDensity(input = {}) {
  if (!plainObject(input)) throw new TypeError('Density input must be a plain object');

  const requested = semanticId(input.mode, 'standard');
  if (!DENSITY_MODES.includes(requested)) {
    throw new RangeError(`Unsupported density mode: ${requested}`);
  }

  const profiles = accessibilitySet(input.accessibilityProfiles);
  const touchAssistance = profiles.has('touch-assistance');
  const largeText = profiles.has('large-text') || profiles.has('extra-large-text');
  const inputMode = semanticId(input.inputMode, 'pointer');

  let accepted = requested;
  if (largeText && requested === 'compact') accepted = 'standard';

  const coarseInput = ['touch', 'directional', 'assistive-input', 'voice-focus'].includes(inputMode);
  const targetFloorRole = touchAssistance || coarseInput
    ? 'coarse-minimum'
    : accepted === 'compact'
      ? 'pointer-compact-minimum'
      : 'coarse-minimum';

  return Object.freeze({
    version: '1.6.0-dev.4',
    lifecycle: 'development',
    requestedMode: requested,
    acceptedMode: accepted,
    spacingProfile: accepted === 'comfortable'
      ? 'expanded'
      : accepted === 'compact'
        ? 'reduced'
        : 'baseline',
    targetProtection: Object.freeze({
      targetFloorRole,
      targetFloorSource: 'tokens/layout.json#/interactiveGeometry',
      compactMayReduceBelowSupportedMinimum: false,
      smallVisualIconMayUseLargerHitRegion: true,
      neighborSpacingMustReduceAccidentalActivation: true
    }),
    accessibility: Object.freeze({
      compactRejectedForLargeText: requested === 'compact' && accepted !== requested,
      touchAssistanceApplied: touchAssistance,
      densityMayNotOverrideAccessibility: true
    })
  });
}

function hoverSupported(inputMode) {
  return ['pointer', 'stylus', 'mixed'].includes(inputMode);
}

export function resolveGlazeInputPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Input presentation input must be a plain object');

  const mode = semanticId(input.mode, 'pointer');
  if (!INPUT_MODES.includes(mode)) {
    throw new RangeError(`Unsupported input mode: ${mode}`);
  }

  const previousMode = semanticId(input.previousMode, mode);
  const modeChanged = previousMode !== mode;
  const hoverAvailable = hoverSupported(mode);
  const profiles = accessibilitySet(input.accessibilityProfiles);
  const reducedMotion = profiles.has('reduced-motion') || profiles.has('minimal-motion');

  const requestedHoverIntents = unique(input.hoverIntents)
    .filter(intent => HOVER_INTENTS.includes(intent));

  return Object.freeze({
    version: '1.6.0-dev.4',
    lifecycle: 'development',
    mode,
    previousMode,
    modeChanged,
    composition: Object.freeze({
      dramaticRearrangementAllowedForInputChangeAlone: false,
      taskContinuityRequired: true,
      currentLocationPreserved: true,
      userEnteredDataPreserved: true,
      focusPreservedWherePractical: true,
      scrollContextPreservedWherePractical: true
    }),
    hover: Object.freeze({
      available: hoverAvailable,
      enhancementOnly: true,
      intents: Object.freeze(requestedHoverIntents),
      essentialControlMayBeHoverOnly: false,
      equivalentNonHoverPathRequired: requestedHoverIntents.length > 0
    }),
    press: Object.freeze({
      immediateFeedbackRequired: ['touch', 'pointer', 'stylus', 'mixed'].includes(mode),
      supportedFeedback: PRESS_FEEDBACK,
      recommendedFeedback: reducedMotion
        ? Object.freeze(['light-change', 'border', 'material-response'])
        : Object.freeze(['surface-compression', 'light-change', 'scale', 'material-response']),
      subtleAndFastRequired: true,
      semanticStateDependsOnFeedbackAnimation: false
    }),
    accessibility: Object.freeze({
      reducedMotionApplied: reducedMotion,
      keyboardCoreOperationRequired: mode === 'keyboard',
      directionalLogicalFocusPathRequired: mode === 'directional',
      assistiveActionEquivalenceRequired: mode === 'assistive-input'
    }),
    authority: Object.freeze({
      presentationOnly: true,
      inputModeOwnedByCallerOrPlatform: true,
      capabilityTruthModified: false,
      taskStateReset: false
    })
  });
}

export function resolveGlazeTactileIntent(input = {}) {
  if (!plainObject(input)) throw new TypeError('Tactile intent input must be a plain object');

  const intent = semanticId(input.intent);
  if (!TACTILE_INTENTS.includes(intent)) {
    throw new RangeError(`Unsupported tactile intent: ${intent}`);
  }

  const platformSupported = bool(input.platformSupported);
  const userEnabled = input.userEnabled !== false;

  return Object.freeze({
    version: '1.6.0-dev.4',
    lifecycle: 'development',
    intent,
    semanticToken: `tactile.${intent}`,
    eligible: platformSupported && userEnabled,
    platformSupported,
    userEnabled,
    mapping: Object.freeze({
      hardwarePatternHardcodedByGlaze: false,
      platformAdapterOwnsHardwareMapping: true,
      localPlatformCapabilityRequired: true
    }),
    execution: Object.freeze({
      automaticHardwareExecutionByResolver: false,
      callerMayInvokeMappedFeedbackWhenEligible: platformSupported && userEnabled
    }),
    accessibility: Object.freeze({
      tactileFeedbackRequiredForMeaning: false,
      visualOrSemanticEquivalentRequired: true
    })
  });
}

export const glazeV16MaterialTypeInputDevelopmentContract = Object.freeze({
  version: '1.6.0-dev.4',
  lifecycle: 'development',
  stableBaseline: '1.5.1',
  consumerEligible: false,
  materialRoles: MATERIAL_ROLES,
  blurLevels: BLUR_LEVELS,
  depthRoles: DEPTH_ROLES,
  solidPreferredContent: SOLID_PREFERRED_CONTENT,
  typographyRoles: TYPOGRAPHY_ROLES,
  typographyEnvironments: TYPE_ENVIRONMENTS,
  largeTextComponents: LARGE_TEXT_COMPONENTS,
  densityModes: DENSITY_MODES,
  inputModes: INPUT_MODES,
  hoverIntents: HOVER_INTENTS,
  pressFeedback: PRESS_FEEDBACK,
  tactileIntents: TACTILE_INTENTS,
  accessibilityOverridesRichness: true,
  clarityOverridesTranslucency: true,
  blurIsBoundedResource: true,
  compactMayReduceBelowMinimumTarget: false,
  hoverMayBeSoleEssentialPath: false,
  tactileMeaningOnlyAllowed: false,
  authorityBoundary: 'presentation-only'
});
