/* GLAZE UI V1.6 — Development focus, motion, microinteraction,
 * visual-state continuity, and content-transition foundation.
 *
 * This module defines Glaze UI presentation semantics. It does not promote
 * the separate Glaze Motion experimental lifecycle and does not alter the
 * current Stable GLAZE UI V1.5 / 1.5.1 release.
 */

const FOCUS_MODALITIES = Object.freeze([
  'keyboard',
  'directional',
  'pointer',
  'touch',
  'stylus',
  'assistive-input',
  'voice-focus',
  'mixed'
]);

const MOTION_FAMILIES = Object.freeze([
  'enter',
  'exit',
  'expand',
  'collapse',
  'move',
  'reorder',
  'replace',
  'reveal',
  'hide',
  'focus',
  'select',
  'load',
  'refresh',
  'complete',
  'fail',
  'connect',
  'disconnect'
]);

const MOTION_MAGNITUDES = Object.freeze([
  'micro',
  'small',
  'medium',
  'large'
]);

const SURFACE_HIERARCHIES = Object.freeze([
  'decoration',
  'secondary',
  'primary',
  'navigation'
]);

const MICROINTERACTION_INTENTS = Object.freeze([
  'toggle',
  'selection',
  'favorite',
  'save',
  'copy',
  'pin',
  'expand',
  'collapse',
  'refresh',
  'retry',
  'send',
  'download',
  'upload',
  'completion'
]);

const DEFAULT_MOTION_BUDGET = Object.freeze({
  continuousAnimatedElements: 4,
  simultaneousTransitions: 6,
  backgroundMaterialAnimations: 1,
  skeletonMotionElements: 4,
  decorativeMovements: 2,
  largeAreaTransformations: 1
});

const MAGNITUDE_RANK = Object.freeze({
  micro: 0,
  small: 1,
  medium: 2,
  large: 3
});

const HIERARCHY_MAX_MAGNITUDE = Object.freeze({
  decoration: 'micro',
  secondary: 'small',
  primary: 'medium',
  navigation: 'large'
});

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

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function bool(value) {
  return value === true;
}

function unique(values) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze([...new Set(values.map(item => String(item ?? '').trim().toLowerCase()).filter(Boolean))]);
}

function reducedMotionFromProfiles(profiles) {
  const set = new Set(unique(profiles));
  return set.has('reduced-motion') || set.has('minimal-motion');
}

function simplifiedEffectsFromProfiles(profiles) {
  const set = new Set(unique(profiles));
  return set.has('simplified-visual-effects') || set.has('solid-surfaces');
}

function normalizeBudget(input) {
  const source = plainObject(input) ? input : {};
  const normalized = {};
  for (const [key, fallback] of Object.entries(DEFAULT_MOTION_BUDGET)) {
    normalized[key] = nonNegativeInteger(source[key], fallback);
  }
  return Object.freeze(normalized);
}

function normalizeCounts(input) {
  const source = plainObject(input) ? input : {};
  const counts = {};
  for (const key of Object.keys(DEFAULT_MOTION_BUDGET)) {
    counts[key] = nonNegativeInteger(source[key], 0);
  }
  return Object.freeze(counts);
}

function exceededBudgetKeys(counts, budget) {
  return Object.freeze(
    Object.keys(DEFAULT_MOTION_BUDGET).filter(key => counts[key] > budget[key])
  );
}

function capMagnitude(requested, hierarchy) {
  const requestedRank = MAGNITUDE_RANK[requested];
  const maximum = HIERARCHY_MAX_MAGNITUDE[hierarchy];
  const maximumRank = MAGNITUDE_RANK[maximum];
  if (requestedRank <= maximumRank) return requested;
  return maximum;
}

function focusContrastRole(material) {
  const normalized = semanticId(material, 'solid');
  if (['functional-glass', 'clear-glass', 'translucent', 'glaze'].includes(normalized)) {
    return 'focus.material-protected';
  }
  if (['overlay', 'dialog', 'modal'].includes(normalized)) {
    return 'focus.overlay-protected';
  }
  return 'focus.standard';
}

export function resolveGlazeFocusPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Focus presentation input must be a plain object');

  const modality = semanticId(input.modality, 'keyboard');
  if (!FOCUS_MODALITIES.includes(modality)) {
    throw new RangeError(`Unsupported focus modality: ${modality}`);
  }

  const focused = bool(input.focused);
  const callerFocusVisible = input.focusVisible;
  const modalityRequiresStrongFocus = ['keyboard', 'directional', 'assistive-input', 'voice-focus'].includes(modality);
  const focusVisible = focused && (
    callerFocusVisible === true
    || modalityRequiresStrongFocus
    || bool(input.alwaysShowFocus)
  );

  const distinctStates = Object.freeze({
    focused,
    selected: bool(input.selected),
    hovered: bool(input.hovered),
    pressed: bool(input.pressed),
    activated: bool(input.activated),
    dragging: bool(input.dragging)
  });

  const requestedRestoreTarget = input.requestedRestoreTarget == null
    ? null
    : String(input.requestedRestoreTarget).trim() || null;
  const restoreTargetValid = bool(input.restoreTargetValid);

  return Object.freeze({
    version: '1.6.0-dev.3',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    focus: Object.freeze({
      visible: focusVisible,
      strongIndicator: focusVisible,
      contrastRole: focusContrastRole(input.material),
      distinctFromSelection: true,
      distinctFromHover: true,
      distinctFromPress: true,
      distinctFromActivation: true,
      distinctFromDrag: true,
      states: distinctStates
    }),
    continuity: Object.freeze({
      keyboardFocusPreservationRequired: true,
      directionalFocusContinuityRequired: true,
      dynamicUpdateFocusPreservationRequired: true,
      focusStealingAllowed: false,
      restoration: Object.freeze({
        requestedTarget: requestedRestoreTarget,
        targetValidatedByCaller: restoreTargetValid,
        suggestedAction: requestedRestoreTarget && restoreTargetValid
          ? 'restore-authoritative-target'
          : requestedRestoreTarget
            ? 'resolve-nearest-logical-valid-target'
            : 'preserve-current-valid-focus',
        automaticExecutionByGlaze: false
      })
    }),
    accessibility: Object.freeze({
      focusMayBeHiddenSolelyForVisualMinimalism: false,
      translucentSurfaceMayReduceFocusLegibility: false,
      materialAwareContrastRequired: true
    }),
    authority: Object.freeze({
      presentationOnly: true,
      focusTargetTruthOwnedByCaller: true,
      navigationExecutedByGlaze: false
    })
  });
}

function reducedMotionFallback(family) {
  if (['enter', 'exit', 'replace', 'reveal', 'hide'].includes(family)) return 'opacity-or-immediate';
  if (['load', 'refresh'].includes(family)) return 'static-state-indicator';
  return 'immediate-state-change';
}

export function resolveGlazeMotionPlan(input = {}) {
  if (!plainObject(input)) throw new TypeError('Motion plan input must be a plain object');

  const family = semanticId(input.family);
  if (!MOTION_FAMILIES.includes(family)) {
    throw new RangeError(`Unsupported motion family: ${family}`);
  }

  const requestedMagnitude = semanticId(input.magnitude, 'small');
  if (!MOTION_MAGNITUDES.includes(requestedMagnitude)) {
    throw new RangeError(`Unsupported motion magnitude: ${requestedMagnitude}`);
  }

  const hierarchy = semanticId(input.surfaceHierarchy, 'secondary');
  if (!SURFACE_HIERARCHIES.includes(hierarchy)) {
    throw new RangeError(`Unsupported surface hierarchy: ${hierarchy}`);
  }

  const budget = normalizeBudget(input.budget);
  const counts = normalizeCounts(input.activeMotion);
  const exceeded = exceededBudgetKeys(counts, budget);
  const reducedMotion = reducedMotionFromProfiles(input.accessibilityProfiles);
  const simplifiedEffects = simplifiedEffectsFromProfiles(input.accessibilityProfiles);
  const budgetPressure = exceeded.length > 0;

  const acceptedMagnitude = capMagnitude(requestedMagnitude, hierarchy);
  const userDriven = input.userDriven !== false;
  const directManipulation = bool(input.directManipulation);

  let presentationMode = 'semantic-motion';
  let spatialTravelAllowed = true;
  let continuousMotionAllowed = true;
  let reason = 'semantic-motion-family';

  if (reducedMotion) {
    presentationMode = reducedMotionFallback(family);
    spatialTravelAllowed = directManipulation;
    continuousMotionAllowed = false;
    reason = 'reduced-motion-precedence';
  } else if (budgetPressure || simplifiedEffects) {
    presentationMode = ['enter', 'exit', 'replace', 'reveal', 'hide'].includes(family)
      ? 'short-opacity-transition'
      : 'simplified-semantic-motion';
    spatialTravelAllowed = directManipulation || acceptedMagnitude === 'micro';
    continuousMotionAllowed = false;
    reason = budgetPressure ? 'motion-budget-pressure' : 'simplified-effects-profile';
  }

  return Object.freeze({
    version: '1.6.0-dev.3',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    family,
    hierarchy,
    requestedMagnitude,
    acceptedMagnitude,
    presentation: Object.freeze({
      mode: presentationMode,
      spatialTravelAllowed,
      continuousMotionAllowed,
      finalStateDependsOnAnimationCompletion: false,
      flashingAllowed: false,
      largeUnexpectedMovementAllowed: false
    }),
    interaction: Object.freeze({
      userDriven,
      directManipulation,
      interruptible: userDriven || directManipulation,
      scrollingBlockedByAnimation: false,
      navigationBlockedByAnimation: false,
      selectionBlockedByAnimation: false,
      closeBlockedByAnimation: false,
      reversalBlockedByAnimation: false
    }),
    budget: Object.freeze({
      reference: budget,
      observed: counts,
      exceededKeys: exceeded,
      fatigueProtectionApplied: budgetPressure,
      optionalMotionReducedAutomatically: budgetPressure
    }),
    accessibility: Object.freeze({
      reducedMotionApplied: reducedMotion,
      simplifiedEffectsApplied: simplifiedEffects,
      reducedMotionFallback: reducedMotion ? reducedMotionFallback(family) : null
    }),
    diagnostics: Object.freeze({
      reason,
      rawContentIncluded: false,
      privateBehaviorIncluded: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      taskStateChangedByMotionResolver: false,
      actionExecutedByMotionResolver: false
    })
  });
}

const MICROINTERACTION_FAMILY = Object.freeze({
  toggle: ['select', 'micro'],
  selection: ['select', 'micro'],
  favorite: ['select', 'micro'],
  save: ['complete', 'small'],
  copy: ['complete', 'micro'],
  pin: ['select', 'micro'],
  expand: ['expand', 'small'],
  collapse: ['collapse', 'small'],
  refresh: ['refresh', 'small'],
  retry: ['refresh', 'small'],
  send: ['complete', 'small'],
  download: ['load', 'small'],
  upload: ['load', 'small'],
  completion: ['complete', 'small']
});

export function resolveGlazeMicrointeraction(input = {}) {
  if (!plainObject(input)) throw new TypeError('Microinteraction input must be a plain object');

  const intent = semanticId(input.intent);
  if (!MICROINTERACTION_INTENTS.includes(intent)) {
    throw new RangeError(`Unsupported microinteraction intent: ${intent}`);
  }

  const [family, magnitude] = MICROINTERACTION_FAMILY[intent];
  const plan = resolveGlazeMotionPlan({
    family,
    magnitude,
    surfaceHierarchy: input.surfaceHierarchy || 'secondary',
    accessibilityProfiles: input.accessibilityProfiles,
    activeMotion: input.activeMotion,
    budget: input.budget,
    userDriven: true,
    directManipulation: bool(input.directManipulation)
  });

  return Object.freeze({
    version: '1.6.0-dev.3',
    lifecycle: 'development',
    intent,
    family,
    magnitude: plan.acceptedMagnitude,
    plan,
    shortByDefault: true,
    interruptible: true,
    accessibilityAware: true,
    persistentAnimationRequired: false,
    finalSemanticStateIndependentOfAnimation: true
  });
}

export function resolveGlazeStateContinuity(input = {}) {
  if (!plainObject(input)) throw new TypeError('State continuity input must be a plain object');

  const conceptualIdentitySame = input.conceptualIdentitySame !== false;
  const reducedMotion = reducedMotionFromProfiles(input.accessibilityProfiles);
  const fromState = semanticId(input.fromState, 'unknown');
  const toState = semanticId(input.toState, 'unknown');

  let transition = 'direct-replacement';
  if (conceptualIdentitySame && !reducedMotion) transition = 'continuous-transform';
  else if (conceptualIdentitySame && reducedMotion) transition = 'immediate-state-change';

  return Object.freeze({
    version: '1.6.0-dev.3',
    lifecycle: 'development',
    fromState,
    toState,
    conceptualIdentitySame,
    transition,
    requirements: Object.freeze({
      preserveControlIdentityWhenPractical: conceptualIdentitySame,
      destroyAndRecreateByDefault: false,
      preserveFocus: true,
      preserveAccessibleNameOrUpdateSemantically: true,
      finalStateIndependentOfAnimationCompletion: true
    }),
    accessibility: Object.freeze({
      reducedMotionApplied: reducedMotion,
      motionRequiredToUnderstandState: false
    })
  });
}

export function resolveGlazeContentTransition(input = {}) {
  if (!plainObject(input)) throw new TypeError('Content transition input must be a plain object');

  const sameConceptualRegion = input.sameConceptualRegion !== false;
  const reducedMotion = reducedMotionFromProfiles(input.accessibilityProfiles);
  const budget = normalizeBudget(input.budget);
  const counts = normalizeCounts(input.activeMotion);
  const budgetPressure = exceededBudgetKeys(counts, budget).length > 0;

  let mode = 'direct-replacement';
  if (sameConceptualRegion && !reducedMotion && !budgetPressure) mode = 'subtle-replacement';
  if (sameConceptualRegion && reducedMotion) mode = 'immediate-or-opacity';
  if (sameConceptualRegion && budgetPressure) mode = 'direct-replacement';

  return Object.freeze({
    version: '1.6.0-dev.3',
    lifecycle: 'development',
    sameConceptualRegion,
    mode,
    preserve: Object.freeze({
      focus: true,
      scrollPosition: true,
      regionIdentity: sameConceptualRegion,
      selectionWhenStillValid: true
    }),
    prohibited: Object.freeze({
      flashing: true,
      largeUnexpectedMovement: true,
      focusLoss: true,
      scrollJump: true
    }),
    accessibility: Object.freeze({
      reducedMotionApplied: reducedMotion,
      transitionSimplified: reducedMotion || budgetPressure
    }),
    authority: Object.freeze({
      presentationOnly: true,
      contentTruthChangedByResolver: false
    })
  });
}

export const glazeV16FocusMotionDevelopmentContract = Object.freeze({
  version: '1.6.0-dev.3',
  lifecycle: 'development',
  stableBaseline: '1.5.1',
  consumerEligible: false,
  focusModalities: FOCUS_MODALITIES,
  motionFamilies: MOTION_FAMILIES,
  motionMagnitudes: MOTION_MAGNITUDES,
  surfaceHierarchies: SURFACE_HIERARCHIES,
  microinteractionIntents: MICROINTERACTION_INTENTS,
  referenceMotionBudget: DEFAULT_MOTION_BUDGET,
  focusStealingAllowed: false,
  userDrivenMotionInterruptible: true,
  motionMayBlockTaskInteraction: false,
  reducedMotionPrecedence: true,
  finalStateDependsOnAnimationCompletion: false,
  colorOrMotionOnlyMeaningAllowed: false,
  glazeMotionExperimentalLifecyclePromoted: false,
  authorityBoundary: 'presentation-only'
});
