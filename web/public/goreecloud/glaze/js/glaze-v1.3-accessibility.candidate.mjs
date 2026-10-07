const MATERIAL_CLARITIES = new Set(['clear', 'balanced', 'solid']);
const DENSITIES = new Set(['compact', 'standard', 'comfortable']);
const DIRECTIONS = new Set(['ltr', 'rtl']);

export const ACCESSIBILITY_TARGET_FLOORS = Object.freeze({
  default: 48,
  touchAssistance: 56,
  farView: 56
});

export const ACCESSIBILITY_RESOLUTION_ORDER = Object.freeze([
  'protected-semantic-meaning',
  'forced-colors',
  'reduced-motion',
  'reduced-transparency',
  'increased-contrast-and-show-boundaries',
  'large-text-and-touch-assistance',
  'material-clarity',
  'expression-and-accent'
]);

export const PRESERVED_CONTINUITY = Object.freeze([
  'current-task',
  'current-destination',
  'selection',
  'draft-state',
  'typed-input',
  'unsaved-work',
  'focus',
  'logical-focus-order',
  'media-state'
]);

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function oneOf(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function frozenArray(value) {
  return Object.freeze([...value]);
}

export function resolveAccessibilityProfile(preferences = {}, context = {}) {
  const forcedColors = Boolean(preferences.forcedColors);
  const reducedMotion = Boolean(preferences.reducedMotion);
  const reducedTransparency = Boolean(preferences.reducedTransparency);
  const increasedContrast = Boolean(preferences.increasedContrast);
  const showBoundaries = Boolean(preferences.showBoundaries);
  const touchAssistance = Boolean(preferences.touchAssistance);
  const farView = Boolean(context.farView);
  const textScalePercent = Math.max(100, finite(preferences.textScalePercent, 100));
  const largeText = Boolean(preferences.largeText) || textScalePercent > 100;
  const requestedMaterialClarity = oneOf(preferences.materialClarity, MATERIAL_CLARITIES, 'balanced');
  const requestedDensity = oneOf(preferences.density, DENSITIES, 'standard');
  const direction = oneOf(context.direction, DIRECTIONS, 'ltr');
  const reflowRequired = largeText || textScalePercent >= 200;
  const effectiveMaterialClarity = (forcedColors || reducedTransparency) ? 'solid' : requestedMaterialClarity;
  const targetFloorPx = (touchAssistance || farView)
    ? ACCESSIBILITY_TARGET_FLOORS.touchAssistance
    : ACCESSIBILITY_TARGET_FLOORS.default;
  const strongBoundaries = forcedColors || increasedContrast || showBoundaries;

  return Object.freeze({
    forcedColors,
    reducedMotion,
    reducedTransparency,
    increasedContrast,
    showBoundaries,
    touchAssistance,
    farView,
    textScalePercent,
    largeText,
    direction,
    targetFloorPx,
    reflowRequired,
    horizontalPageOverflowAllowed: false,
    criticalTextClippingAllowed: false,
    effectiveDensity: reflowRequired && requestedDensity === 'compact'
      ? 'standard-or-comfortable-as-needed'
      : requestedDensity,
    effectiveMaterialClarity,
    blurAllowed: !(forcedColors || reducedTransparency),
    refractionAllowed: !(forcedColors || reducedTransparency),
    distortionAllowed: !(forcedColors || reducedTransparency),
    ambientColorAllowed: !forcedColors,
    customSemanticColorMapping: forcedColors ? 'platform' : 'governed-semantic',
    contextualAccentMayOverrideSemanticColor: false,
    motionRole: reducedMotion ? 'reduced' : String(context.motionRole || 'standard'),
    nonessentialMotionMayBecomeImmediate: reducedMotion,
    directManipulationPreserved: true,
    focusVisibility: strongBoundaries ? 'strong' : 'required',
    boundaryStrength: strongBoundaries ? 'accessibility-required' : 'component-required',
    semanticStateMayRelyOnColorOnly: false,
    expressionMayOverrideAccessibility: false,
    preserve: PRESERVED_CONTINUITY,
    resolutionOrder: ACCESSIBILITY_RESOLUTION_ORDER,
    screenReaderAcceptanceEstablished: false,
    assistiveTechnologyAcceptanceEstablished: false,
    physicalDeviceAccessibilityAcceptanceEstablished: false,
    nativePlatformAccessibilityParityEstablished: false
  });
}

function issue(code, detail) {
  return Object.freeze({code, detail});
}

export function auditAccessibleNode(node = {}, profile = resolveAccessibilityProfile()) {
  const issues = [];
  const interactive = Boolean(node.interactive);
  const widthPx = Math.max(0, finite(node.widthPx, 0));
  const heightPx = Math.max(0, finite(node.heightPx, 0));
  const accessibleName = String(node.accessibleName || '').trim();
  const role = String(node.role || '').trim();

  if (interactive && !accessibleName) {
    issues.push(issue('missing-accessible-name', 'Interactive controls require a stable accessible name.'));
  }
  if (interactive && !role) {
    issues.push(issue('missing-semantic-role', 'Interactive controls require a semantic role.'));
  }
  if (interactive && node.focusable !== false && node.focusIndicatorVisible === false) {
    issues.push(issue('focus-not-visible', 'Focusable controls require a visible focus indicator.'));
  }
  if (interactive && (widthPx < profile.targetFloorPx || heightPx < profile.targetFloorPx)) {
    issues.push(issue('undersized-target', `Interactive target is below the ${profile.targetFloorPx}px resolved floor.`));
  }
  if (Boolean(node.stateCommunicatedByColorOnly)) {
    issues.push(issue('color-only-state', 'State and authority require a non-color semantic or structural cue.'));
  }
  if (Boolean(node.criticalTextClipped)) {
    issues.push(issue('critical-text-clipped', 'Critical text must reflow instead of clipping.'));
  }
  if (Boolean(node.horizontalPageOverflow)) {
    issues.push(issue('horizontal-page-overflow', 'Accessibility reflow must not introduce horizontal page overflow.'));
  }
  if (Boolean(node.stateRequiresSemantics) && node.stateExposed !== true) {
    issues.push(issue('state-not-exposed', 'State/value relationships must remain machine-observable when applicable.'));
  }
  if (profile.direction === 'rtl' && node.logicalOrderPreserved === false) {
    issues.push(issue('rtl-logical-order-broken', 'RTL adaptation must preserve logical navigation and reading order.'));
  }

  return Object.freeze({
    pass: issues.length === 0,
    issues: Object.freeze(issues),
    machineObservableOnly: true,
    establishesScreenReaderAcceptance: false,
    establishesPhysicalDeviceAcceptance: false
  });
}

export function resolveResilientComposition(state = {}, profile = resolveAccessibilityProfile()) {
  const preserve = frozenArray(PRESERVED_CONTINUITY);
  const collapsePaneCountBeforeOverflow = Boolean(profile.reflowRequired || state.availableWidthConstrained);
  return Object.freeze({
    preserve,
    collapsePaneCountBeforeOverflow,
    shrinkInteractiveTargetsBeforeReflow: false,
    clipCriticalTextBeforeReflow: false,
    reloadRequired: false,
    resetSelectionRequired: false,
    resetDraftRequired: false,
    resetFocusRequired: false,
    direction: profile.direction,
    targetFloorPx: profile.targetFloorPx
  });
}

export function createAccessibilityResolver(defaultPreferences = {}, defaultContext = {}) {
  return Object.freeze({
    kind: 'glaze-v1.3-accessibility-resilience-resolver',
    resolve(preferences = {}, context = {}) {
      return resolveAccessibilityProfile(
        {...defaultPreferences, ...preferences},
        {...defaultContext, ...context}
      );
    },
    audit(node, preferences = {}, context = {}) {
      const profile = this.resolve(preferences, context);
      return auditAccessibleNode(node, profile);
    }
  });
}

export const accessibilityResilienceCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  parallelAccessibilityAuthorityIntroduced: false,
  targetFloors: ACCESSIBILITY_TARGET_FLOORS,
  acceptanceTextScalePercent: 200,
  automatedEvidenceEstablishesHumanAcceptance: false,
  automatedEvidenceEstablishesAssistiveTechnologyAcceptance: false,
  automatedEvidenceEstablishesPhysicalDeviceAcceptance: false,
  nativePlatformAccessibilityParityEstablished: false
});
