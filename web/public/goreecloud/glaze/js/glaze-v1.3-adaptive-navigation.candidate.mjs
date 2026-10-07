const ENVIRONMENTS = new Set(['compact', 'medium', 'expanded', 'workspace', 'farView', 'wearable']);
const INPUTS = new Set(['touch', 'pointer', 'keyboard', 'directional', 'rotary', 'assistiveSwitch', 'voice']);
const POSTURES = new Set(['flat', 'folded', 'half-open', 'unfolded', 'unknown']);

const PRESENTATIONS = Object.freeze({
  compact: 'navigation-capsule',
  medium: 'navigation-rail',
  expanded: 'persistent-sidebar',
  workspace: 'persistent-sidebar-plus-toolbar',
  farView: 'directional-focus-navigation',
  wearable: 'shallow-list'
});

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeEnvironment(value) {
  if (value === 'far-view' || value === 'largeFarView') return 'farView';
  return ENVIRONMENTS.has(value) ? value : 'compact';
}

function normalizeInput(value) {
  return INPUTS.has(value) ? value : 'touch';
}

function normalizePosture(value) {
  return POSTURES.has(value) ? value : 'unknown';
}

function compactForcesInFlow(options) {
  return Boolean(
    options.largeText ||
    options.reflow ||
    options.touchAssistance ||
    options.safeAreaObstructed ||
    options.keyboardOccluded ||
    options.visibleContentOccluded
  );
}

function presentationFor(environment, inputModality, options) {
  if (environment === 'compact') {
    return compactForcesInFlow(options) ? 'navigation-capsule-in-flow' : PRESENTATIONS.compact;
  }
  if (environment === 'medium') {
    return options.prefersSidebar && options.supportsPersistentSidebar ? 'adaptive-sidebar' : PRESENTATIONS.medium;
  }
  if (environment === 'expanded') {
    return options.supportsPersistentSidebar === false ? 'navigation-rail' : PRESENTATIONS.expanded;
  }
  if (environment === 'workspace') return PRESENTATIONS.workspace;
  if (environment === 'farView') return PRESENTATIONS.farView;
  if (environment === 'wearable') {
    return inputModality === 'rotary' ? 'platform-rotary-or-swipe' : PRESENTATIONS.wearable;
  }
  return PRESENTATIONS.compact;
}

export function resolveNavigationPresentation(options = {}) {
  const environment = normalizeEnvironment(options.environment);
  const inputModality = normalizeInput(options.inputModality);
  const posture = normalizePosture(options.posture);
  const presentation = presentationFor(environment, inputModality, options);
  const detached = presentation === 'navigation-capsule';
  const farView = environment === 'farView';
  const touchAssistance = Boolean(options.touchAssistance);
  const minimumTargetPx = Math.max(
    farView || touchAssistance ? 56 : 48,
    finite(options.platformMinimumTargetPx, 0)
  );
  const destinationCount = Math.max(0, Math.floor(finite(options.destinationCount, 0)));
  const compactOverflow = environment === 'compact' && destinationCount > 5;

  return Object.freeze({
    environment,
    inputModality,
    posture,
    presentation,
    detached,
    lowerReachabilityPreferred: environment === 'compact',
    minimumTargetPx,
    safeAreaAware: true,
    requiresDirectionalFocus: farView,
    focusBeforeActivation: farView,
    destinationOrderStable: true,
    currentLocationPreserved: true,
    compactPrimaryDestinationLimit: environment === 'compact' ? 5 : null,
    compactOverflowPresentation: compactOverflow ? 'more-destination' : null,
    rawViewportWidthAuthority: false,
    accessibilityForcedInFlow: environment === 'compact' && !detached,
    reducedMotionImmediateTransform: Boolean(options.reducedMotion),
    reducedTransparencySolidFallbackAllowed: Boolean(options.reducedTransparency)
  });
}

function normalizeDestination(destination, index) {
  if (!destination || typeof destination !== 'object') {
    throw new TypeError(`Navigation destination at index ${index} must be an object`);
  }
  const id = String(destination.id ?? '').trim();
  if (!id) throw new TypeError(`Navigation destination at index ${index} requires a stable id`);
  return Object.freeze({...destination, id});
}

export function transformNavigationModel(destinations, currentDestinationId, options = {}) {
  if (!Array.isArray(destinations)) throw new TypeError('Navigation destinations must be an array');
  const normalized = destinations.map(normalizeDestination);
  const ids = normalized.map(item => item.id);
  if (new Set(ids).size !== ids.length) throw new RangeError('Navigation destination ids must be unique');

  const current = currentDestinationId == null ? null : String(currentDestinationId);
  if (current !== null && !ids.includes(current)) {
    throw new RangeError('Current destination must exist in the navigation destination model');
  }

  const resolved = resolveNavigationPresentation({...options, destinationCount: normalized.length});
  const visibleLimit = resolved.environment === 'compact' ? 5 : normalized.length;
  const primary = normalized.slice(0, visibleLimit);
  const overflow = normalized.slice(visibleLimit);

  return Object.freeze({
    destinations: Object.freeze(normalized),
    primaryDestinations: Object.freeze(primary),
    overflowDestinations: Object.freeze(overflow),
    currentDestinationId: current,
    presentation: resolved,
    destinationOrderStable: true,
    semanticDestinationIdentityPreserved: true,
    predictionReorderingAllowed: false,
    taskStateResetByPresentationTransform: false
  });
}

export function applyNavigationPresentation(target, options = {}) {
  if (!target?.style || typeof target.style.setProperty !== 'function' || !target.dataset) {
    throw new TypeError('Navigation target must expose dataset and style.setProperty');
  }
  const result = resolveNavigationPresentation(options);
  target.dataset.glazeNavigationV13 = result.presentation;
  target.dataset.glazeNavigationEnvironment = result.environment;
  target.dataset.glazeNavigationDetached = String(result.detached);
  target.style.setProperty('--glz13-navigation-min-target', `${result.minimumTargetPx}px`);
  target.style.setProperty('--glz13-navigation-placement', result.lowerReachabilityPreferred ? 'lower-reachable-region' : 'environment-governed');
  return result;
}

export const adaptiveNavigationCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  environments: Object.freeze([...ENVIRONMENTS]),
  destinationOrderStable: true,
  predictionMayReorderPrimaryDestinations: false,
  rawViewportWidthAuthority: false,
  accessibilityMayForceInFlowPresentation: true,
  humanNavigationAcceptanceEstablished: false,
  physicalDeviceNavigationAcceptanceEstablished: false
});
