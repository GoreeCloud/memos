const ENVIRONMENTS = new Set(['compact', 'medium', 'expanded', 'workspace', 'farView', 'wearable']);
const POSTURES = new Set(['folded', 'unfolded', 'halfOpen', 'flat', 'unknown']);
const PANE_ROLES = new Set(['primary', 'secondary', 'inspector', 'navigation', 'utility']);

function normalizeEnvironment(value) {
  if (value === 'far-view' || value === 'largeFarView') return 'farView';
  return ENVIRONMENTS.has(value) ? value : 'compact';
}

function normalizePosture(value) {
  if (value === 'half-open') return 'halfOpen';
  return POSTURES.has(value) ? value : 'unknown';
}

function safeRegionCount(options) {
  if (!Array.isArray(options.availableRegions)) return 0;
  return options.availableRegions.filter(region => region && region.safe !== false).length;
}

function accessibilityPolicy(options) {
  const largeTextOrReflow = Boolean(options.largeTextOrReflow || options.largeText || options.reflow);
  const forceSinglePane = Boolean(options.forceSinglePaneForAccessibility || options.reflowRequiresSinglePane);
  return Object.freeze({largeTextOrReflow, forceSinglePane});
}

function environmentCapacity(environment) {
  switch (environment) {
    case 'medium': return 2;
    case 'expanded': return 3;
    case 'workspace': return 3;
    case 'farView': return 2;
    default: return 1;
  }
}

function taskValueCapacity(options) {
  let value = 1;
  if (options.secondaryTaskValue && options.supportsPersistentSecondary !== false) value += 1;
  if (options.inspectorTaskValue && options.supportsInspector !== false) value += 1;
  return value;
}

function chooseComposition(environment, posture, options, accessibility) {
  if (posture === 'folded' || accessibility.forceSinglePane) return 'singlePane';

  if (
    posture === 'halfOpen' &&
    safeRegionCount(options) >= 2 &&
    options.secondaryTaskValue &&
    !accessibility.largeTextOrReflow
  ) {
    return 'dualRegionHinge';
  }

  let capacity = Math.min(environmentCapacity(environment), taskValueCapacity(options));
  if (accessibility.largeTextOrReflow) capacity = Math.min(capacity, 2);

  if (environment === 'compact' || environment === 'wearable') capacity = 1;
  if (capacity >= 3) return 'triplePane';
  if (capacity === 2) return 'dualPane';
  return 'singlePane';
}

function visibleRolesFor(composition, options) {
  const roles = ['primary'];
  if (composition === 'dualPane' || composition === 'dualRegionHinge' || composition === 'triplePane') {
    if (options.secondaryTaskValue && options.supportsPersistentSecondary !== false) roles.push('secondary');
    else if (options.inspectorTaskValue && options.supportsInspector !== false) roles.push('inspector');
  }
  if (composition === 'triplePane' && options.inspectorTaskValue && options.supportsInspector !== false && !roles.includes('inspector')) {
    roles.push('inspector');
  }
  return Object.freeze(roles);
}

export function resolvePaneComposition(options = {}) {
  const environment = normalizeEnvironment(options.environment);
  const posture = normalizePosture(options.posture);
  const accessibility = accessibilityPolicy(options);
  const composition = chooseComposition(environment, posture, options, accessibility);
  const visiblePaneRoles = visibleRolesFor(composition, options);

  return Object.freeze({
    environment,
    posture,
    composition,
    paneCount: visiblePaneRoles.length,
    visiblePaneRoles,
    informationGain: visiblePaneRoles.length > 1,
    addsInformationRatherThanOnlyScale: visiblePaneRoles.length > 1,
    usesHingeAsStructuralDivider: composition === 'dualRegionHinge',
    platformUnsafeRegionsRequiredForHingeLayout: composition === 'dualRegionHinge',
    criticalTargetsAvoidUnsafeRegions: true,
    textMayCrossUnsafeRegions: false,
    rawViewportWidthAuthority: false,
    deviceIdentityInferenceAllowed: false,
    accessibilityCollapsedPaneCount: accessibility.largeTextOrReflow && visiblePaneRoles.length < Math.min(environmentCapacity(environment), taskValueCapacity(options)),
    minimumInteractiveTargetPx: options.touchAssistance ? 56 : 48,
    taskContinuityRequired: true,
    immediateRecomposition: Boolean(options.reducedMotion),
    solidPaneFallbackAllowed: Boolean(options.reducedTransparency)
  });
}

function normalizePane(pane, index) {
  if (!pane || typeof pane !== 'object') throw new TypeError(`Pane at index ${index} must be an object`);
  const role = String(pane.role ?? '').trim();
  if (!PANE_ROLES.has(role)) throw new TypeError(`Pane at index ${index} requires a governed semantic role`);
  return Object.freeze({...pane, role});
}

export function recomposePaneModel(panes, options = {}) {
  if (!Array.isArray(panes)) throw new TypeError('Pane model must be an array');
  const normalized = panes.map(normalizePane);
  const roleCounts = normalized.reduce((counts, pane) => {
    counts[pane.role] = (counts[pane.role] || 0) + 1;
    return counts;
  }, {});
  if ((roleCounts.primary || 0) !== 1) throw new RangeError('Pane model must contain exactly one primary pane');

  const composition = resolvePaneComposition(options);
  const visible = [];
  const deferred = [];
  for (const pane of normalized) {
    if (composition.visiblePaneRoles.includes(pane.role) || pane.role === 'navigation' || pane.role === 'utility') visible.push(pane);
    else deferred.push(pane);
  }

  return Object.freeze({
    composition,
    panes: Object.freeze(normalized),
    visiblePanes: Object.freeze(visible),
    deferredPanes: Object.freeze(deferred),
    currentTaskPreserved: true,
    selectionPreserved: true,
    typedInputPreserved: true,
    unsavedWorkPreserved: true,
    logicalBackHistoryPreserved: true,
    pageReloadRequired: false,
    semanticMeaningPreserved: true
  });
}

export function applyPaneComposition(target, options = {}) {
  if (!target?.style || typeof target.style.setProperty !== 'function' || !target.dataset) {
    throw new TypeError('Pane target must expose dataset and style.setProperty');
  }
  const result = resolvePaneComposition(options);
  target.dataset.glazePaneV13 = result.composition;
  target.dataset.glazePaneEnvironment = result.environment;
  target.dataset.glazePanePosture = result.posture;
  target.style.setProperty('--glz13-pane-count', String(result.paneCount));
  target.style.setProperty('--glz13-pane-min-target', `${result.minimumInteractiveTargetPx}px`);
  target.style.setProperty('--glz13-pane-hinge-divider', result.usesHingeAsStructuralDivider ? '1' : '0');
  return result;
}

export const multiPaneCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  semanticPaneRoles: Object.freeze([...PANE_ROLES]),
  environments: Object.freeze([...ENVIRONMENTS]),
  postures: Object.freeze([...POSTURES]),
  rawViewportWidthAuthority: false,
  deviceIdentityInferenceAllowed: false,
  hardCodedHingeGeometryAllowed: false,
  accessibilityMayCollapsePaneCount: true,
  physicalFoldableAcceptanceEstablished: false,
  humanLargeScreenAcceptanceEstablished: false
});
