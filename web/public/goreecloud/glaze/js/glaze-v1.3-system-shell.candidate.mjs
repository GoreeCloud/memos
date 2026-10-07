import {resolveNavigationPresentation} from './glaze-v1.3-adaptive-navigation.candidate.mjs';

const ENVIRONMENTS = new Set(['compact', 'medium', 'expanded', 'workspace', 'farView', 'wearable']);
const MODULE_TYPES = new Set([
  'compact-control',
  'wide-control',
  'tall-control',
  'slider',
  'media-module',
  'device-module',
  'connectivity-module',
  'system-status-module'
]);
const MODULE_SIZES = new Set(['icon', 'compact', 'wide', 'tall', 'expanded']);
const MOVE_DIRECTIONS = new Set(['previous', 'next', 'start', 'end']);

function normalizeEnvironment(value) {
  if (value === 'far-view' || value === 'largeFarView') return 'farView';
  return ENVIRONMENTS.has(value) ? value : 'compact';
}

function controlCenterPolicy(environment) {
  switch (environment) {
    case 'medium': return {presentation: 'side-or-overlay-panel', density: 'comfortable'};
    case 'expanded': return {presentation: 'side-or-overlay-panel', density: 'balanced'};
    case 'workspace': return {presentation: 'side-panel-or-overlay', density: 'productive'};
    case 'farView': return {presentation: 'focused-panel', density: 'low'};
    case 'wearable': return {presentation: 'shallow-system-controls', density: 'glanceable'};
    default: return {presentation: 'in-flow-sheet-or-dedicated-panel', density: 'comfortable'};
  }
}

function searchPolicy(environment, largeText) {
  if (largeText) return 'dedicated-view';
  switch (environment) {
    case 'medium':
    case 'expanded': return 'overlay-panel';
    case 'workspace': return 'command-overlay';
    case 'farView': return 'focused-overlay';
    case 'wearable': return 'platform-supported-shallow-entry';
    default: return 'reachable-overlay-or-dedicated-view';
  }
}

export function resolveSystemShell(options = {}) {
  const environment = normalizeEnvironment(options.environment);
  const navigation = resolveNavigationPresentation({
    ...options,
    environment,
    destinationCount: options.destinationCount ?? 0
  });
  const largeText = Boolean(options.largeText || options.reflow || options.largeTextOrReflow);
  const forcedColors = Boolean(options.forcedColors);
  const reducedTransparency = Boolean(options.reducedTransparency);
  const solidFallback = forcedColors || reducedTransparency;
  const farView = environment === 'farView';
  const minimumTargetPx = Math.max(farView || options.touchAssistance ? 56 : 48, Number(options.platformMinimumTargetPx) || 0);
  const controlCenter = controlCenterPolicy(environment);

  return Object.freeze({
    environment,
    navigation,
    searchPresentation: searchPolicy(environment, largeText),
    searchScopeVisible: true,
    controlCenterPresentation: controlCenter.presentation,
    criticalSystemMaterial: forcedColors ? 'platform-forced-colors' : 'high-opacity-raised-or-solid',
    criticalSystemBackdropDependent: false,
    criticalStateProducerAuthoritative: true,
    criticalStateMayUseContextAccentAsAuthority: false,
    workspaceMaterial: solidFallback ? 'solid-neutral' : 'surface',
    transientShellMaterial: solidFallback ? 'solid-neutral' : 'living-material-2-bounded-glaze',
    minimumTargetPx,
    stableSpatialMemoryRequired: true,
    predictionMayReorderPrimaryNavigation: false,
    currentDestinationRequiresStructuralCue: true,
    currentDestinationMayDependOnColorAlone: false,
    generatedSearchResultsDistinctFromSystemTruth: true,
    destructiveSearchActionRequiresConfirmation: true,
    immediateTransitions: Boolean(options.reducedMotion),
    rawViewportWidthAuthority: false
  });
}

export function resolveControlCenterPresentation(options = {}) {
  const environment = normalizeEnvironment(options.environment);
  const policy = controlCenterPolicy(environment);
  const forcedColors = Boolean(options.forcedColors);
  const reducedTransparency = Boolean(options.reducedTransparency);
  return Object.freeze({
    environment,
    presentation: policy.presentation,
    moduleDensity: policy.density,
    parentMaterial: forcedColors ? 'platform-forced-colors' : reducedTransparency ? 'solid-raised' : 'deep-glaze',
    minimumTargetPx: options.touchAssistance || environment === 'farView' ? 56 : 48,
    nestedBackdropBlurAllowed: false,
    parentRemainsSubstantiallyNeutral: true,
    keyboardEditingRequired: true,
    semanticAnnouncementsRequired: true,
    rtlLogicalOrderRequired: true,
    persistentStorageEstablished: false,
    crossDeviceSyncEstablished: false
  });
}

function normalizeModule(module, index) {
  if (!module || typeof module !== 'object') throw new TypeError(`Control Center module at index ${index} must be an object`);
  const id = String(module.id ?? '').trim();
  const type = String(module.type ?? '').trim();
  const size = String(module.size ?? 'compact').trim();
  if (!id) throw new TypeError(`Control Center module at index ${index} requires a stable id`);
  if (!MODULE_TYPES.has(type)) throw new TypeError(`Control Center module ${id} uses an ungoverned type`);
  if (!MODULE_SIZES.has(size)) throw new TypeError(`Control Center module ${id} uses an ungoverned size`);
  return Object.freeze({...module, id, type, size});
}

export function normalizeControlCenterModules(modules) {
  if (!Array.isArray(modules)) throw new TypeError('Control Center modules must be an array');
  const normalized = modules.map(normalizeModule);
  const ids = normalized.map(module => module.id);
  if (new Set(ids).size !== ids.length) throw new RangeError('Control Center module ids must be unique');
  return Object.freeze(normalized);
}

export function moveControlCenterModule(modules, moduleId, direction) {
  if (!MOVE_DIRECTIONS.has(direction)) throw new TypeError('Control Center reorder direction must be previous, next, start, or end');
  const normalized = [...normalizeControlCenterModules(modules)];
  const index = normalized.findIndex(module => module.id === moduleId);
  if (index < 0) throw new RangeError('Control Center module id was not found');
  let target = index;
  if (direction === 'previous') target = Math.max(0, index - 1);
  if (direction === 'next') target = Math.min(normalized.length - 1, index + 1);
  if (direction === 'start') target = 0;
  if (direction === 'end') target = normalized.length - 1;
  if (target !== index) {
    const [module] = normalized.splice(index, 1);
    normalized.splice(target, 0, module);
  }
  return Object.freeze(normalized);
}

export function resizeControlCenterModule(modules, moduleId, size) {
  if (!MODULE_SIZES.has(size)) throw new TypeError('Control Center module size is not governed');
  const normalized = normalizeControlCenterModules(modules);
  let found = false;
  const resized = normalized.map(module => {
    if (module.id !== moduleId) return module;
    found = true;
    return Object.freeze({...module, size});
  });
  if (!found) throw new RangeError('Control Center module id was not found');
  return Object.freeze(resized);
}

export function resetControlCenterModules(modules, defaultOrder) {
  const normalized = normalizeControlCenterModules(modules);
  if (!Array.isArray(defaultOrder)) throw new TypeError('Default Control Center order must be an array');
  const currentIds = normalized.map(module => module.id);
  const order = defaultOrder.map(value => String(value));
  if (order.length !== currentIds.length || new Set(order).size !== order.length || order.some(id => !currentIds.includes(id))) {
    throw new RangeError('Default Control Center order must contain every current module id exactly once');
  }
  const byId = new Map(normalized.map(module => [module.id, module]));
  return Object.freeze(order.map(id => byId.get(id)));
}

export function applySystemShellPresentation(target, options = {}) {
  if (!target?.style || typeof target.style.setProperty !== 'function' || !target.dataset) {
    throw new TypeError('System Shell target must expose dataset and style.setProperty');
  }
  const result = resolveSystemShell(options);
  target.dataset.glazeShellV13 = result.environment;
  target.dataset.glazeShellNavigation = result.navigation.presentation;
  target.style.setProperty('--glz13-shell-min-target', `${result.minimumTargetPx}px`);
  target.style.setProperty('--glz13-shell-transient-material', result.transientShellMaterial);
  target.style.setProperty('--glz13-shell-critical-material', result.criticalSystemMaterial);
  return result;
}

export const systemShellCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  shellRegions: Object.freeze(['workspace', 'navigation', 'universal-search', 'control-center', 'critical-system']),
  adaptiveNavigationOwnsPrimaryNavigationPresentation: true,
  criticalStateProducerAuthoritative: true,
  criticalDecisionsBackdropDependent: false,
  rawViewportWidthAuthority: false,
  fullNotificationCenterRuntimeEstablished: false,
  nativeShellParityEstablished: false
});

export const controlCenterCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  moduleTypes: Object.freeze([...MODULE_TYPES]),
  governedSizes: Object.freeze([...MODULE_SIZES]),
  dragIsSoleReorderMechanism: false,
  persistentStorageEstablished: false,
  crossDeviceSyncEstablished: false,
  physicalDeviceEditingAcceptanceEstablished: false
});
