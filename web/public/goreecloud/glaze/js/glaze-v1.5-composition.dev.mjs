import {
  normalizeGlazeContext,
  normalizeGlazeCapabilities,
  resolveGlazeCapability,
  resolveCapabilityAwareActions
} from './glaze-v1.5-context-capability.dev.mjs';

function plainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function requiredString(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new TypeError(`${label} must be a non-empty string`);
  return result;
}

function normalizeContextInput(value) {
  if (value?.domains && Array.isArray(value?.availableDomains)) return value;
  return normalizeGlazeContext(value || {});
}

function normalizeCapabilityInput(value) {
  if (value?.byId && Array.isArray(value?.ids)) return value;
  return normalizeGlazeCapabilities(value || []);
}

function semanticValue(domain, keys, fallback = null) {
  if (!plainObject(domain)) return fallback;
  for (const key of keys) {
    if (domain[key] != null && String(domain[key]).trim()) return String(domain[key]).trim().toLowerCase();
  }
  return fallback;
}

function semanticBoolean(domain, keys) {
  if (!plainObject(domain)) return false;
  for (const key of keys) {
    const value = domain[key];
    if (value === true || value === 1 || value === '1') return true;
    if (typeof value === 'string' && ['true', 'yes', 'enabled', 'on'].includes(value.trim().toLowerCase())) return true;
  }
  return false;
}

export function resolveGlazeComposition(options = {}) {
  if (!plainObject(options)) throw new TypeError('Composition options must be a plain object');
  const context = normalizeContextInput(options.context || {});
  const intent = plainObject(options.intent) ? options.intent : {};
  const layout = context.domains.layout || {};
  const posture = context.domains['device-posture'] || {};
  const input = context.domains.input || {};
  const task = context.domains.task || {};
  const content = context.domains.content || {};
  const accessibility = context.domains.accessibility || {};
  const runtime = context.domains.runtime || {};
  const connectivity = context.domains.connectivity || {};
  const windowState = context.domains['window-state'] || {};

  const layoutClass = semanticValue(layout, ['category', 'sizeClass', 'density'], 'medium');
  const postureClass = semanticValue(posture, ['posture', 'mode'], 'unknown');
  const primaryInput = semanticValue(input, ['primary', 'method'], 'unknown');
  const taskKind = semanticValue(task, ['kind', 'mode'], 'unknown');
  const contentKind = semanticValue(content, ['kind', 'density'], 'unknown');
  const performanceClass = semanticValue(runtime, ['performanceLevel', 'performance', 'tier'], 'normal');
  const pressureClass = semanticValue(runtime, ['resourcePressure', 'pressure'], 'normal');
  const connectivityClass = semanticValue(connectivity, ['class', 'state'], 'unknown');
  const windowClass = semanticValue(windowState, ['state', 'mode'], 'foreground');
  const supportsMultiPane = Boolean(intent.supportsMultiPane);

  const reducedMotion = semanticBoolean(accessibility, ['reducedMotion']);
  const reducedTransparency = semanticBoolean(accessibility, ['reducedTransparency']);
  const increasedContrast = semanticBoolean(accessibility, ['increasedContrast']);
  const forcedColors = semanticBoolean(accessibility, ['forcedColors']);
  const largeText = semanticBoolean(accessibility, ['largeText']);
  const touchAssistance = semanticBoolean(accessibility, ['touchAssistance']);
  const constrainedRuntime = ['low', 'minimal', 'constrained', 'durable'].includes(performanceClass)
    || ['high', 'critical', 'severe'].includes(pressureClass);
  const constrainedConnectivity = ['offline', 'constrained', 'reconnecting'].includes(connectivityClass);
  const constrainedWindow = ['picture-in-picture', 'pip', 'background'].includes(windowClass);

  let paneMode = 'single-pane';
  const reasonCodes = [];
  if (!constrainedWindow && supportsMultiPane && ['expanded', 'multi-pane', 'unfolded'].includes(layoutClass)) {
    paneMode = 'multi-pane';
    reasonCodes.push('expanded-layout-multi-pane');
  } else if (!constrainedWindow && supportsMultiPane && ['unfolded', 'book-style'].includes(postureClass)) {
    paneMode = 'multi-pane';
    reasonCodes.push('posture-multi-pane');
  } else if (constrainedWindow) {
    paneMode = 'single-pane';
    reasonCodes.push('window-state-single-pane-continuity');
  } else if (['compact', 'folded'].includes(layoutClass) || postureClass === 'folded') {
    paneMode = 'single-pane';
    reasonCodes.push('compact-continuity');
  }

  let controlDensity = 'comfortable';
  let commandSurface = 'direct-controls';
  let navigationMode = 'standard';
  if (primaryInput === 'remote') {
    controlDensity = 'spacious';
    commandSurface = 'focus-actions';
    navigationMode = 'focus-navigation';
    reasonCodes.push('remote-input');
  } else if (['pointer', 'keyboard'].includes(primaryInput) && layoutClass !== 'compact') {
    controlDensity = 'dense';
    commandSurface = 'toolbar-and-shortcuts';
    reasonCodes.push('desktop-input-density');
  } else if (['touch', 'stylus'].includes(primaryInput)) {
    controlDensity = 'comfortable';
    commandSurface = 'direct-controls';
    reasonCodes.push('direct-input');
  }

  let materialPreference = 'standard';
  let motionPreference = 'standard';
  let labelMode = 'balanced';
  if (taskKind === 'reading' || contentKind === 'text-heavy') {
    materialPreference = 'quiet';
    motionPreference = 'reduced';
    reasonCodes.push('reading-clarity');
  }
  if (taskKind === 'configuring' || contentKind === 'critical') {
    materialPreference = 'high-clarity';
    labelMode = 'explicit';
    reasonCodes.push('critical-clarity');
  }
  if (taskKind === 'viewing-media' || contentKind === 'media-heavy' || contentKind === 'immersive') {
    materialPreference = 'atmospheric';
    reasonCodes.push('media-atmosphere');
  }

  // Runtime constraints may reduce presentation cost, but never manufacture capability state.
  if (constrainedRuntime) {
    materialPreference = 'durable';
    motionPreference = 'reduced';
    reasonCodes.push('runtime-pressure-durable-presentation');
  }

  // Accessibility has final presentation precedence over device/input richness.
  if (reducedMotion) {
    motionPreference = 'reduced';
    reasonCodes.push('reduced-motion-authority');
  }
  if (reducedTransparency || increasedContrast || forcedColors) {
    materialPreference = 'high-clarity';
    labelMode = 'explicit';
    reasonCodes.push('accessibility-clarity-authority');
  }
  if (largeText || touchAssistance) {
    controlDensity = 'spacious';
    labelMode = 'explicit';
    reasonCodes.push(largeText ? 'large-text-spacing-authority' : 'touch-assistance-spacing-authority');
    if (largeText && touchAssistance) reasonCodes.push('touch-assistance-spacing-authority');
  }

  if (constrainedConnectivity) reasonCodes.push(`connectivity-${connectivityClass}-preserve-composition`);

  return Object.freeze({
    version: '1.5.0-dev.1',
    lifecycle: 'development',
    paneMode,
    controlDensity,
    commandSurface,
    navigationMode,
    materialPreference,
    motionPreference,
    labelMode,
    runtimeCostProfile: constrainedRuntime ? 'reduced' : 'normal',
    connectivityPresentation: constrainedConnectivity ? connectivityClass : 'normal',
    windowPresentation: constrainedWindow ? 'constrained' : 'normal',
    accessibilityPriorityApplied: Boolean(reducedMotion || reducedTransparency || increasedContrast || forcedColors || largeText || touchAssistance),
    actionOrderingPolicy: 'preserve-author-order',
    navigationContinuityPolicy: 'preserve-destination-identity',
    pageReloadRequired: false,
    taskStateReset: false,
    automaticNavigationAllowed: false,
    capabilityTruthModified: false,
    reasonCodes: Object.freeze(reasonCodes)
  });
}

function normalizeDestination(destination, index) {
  if (!plainObject(destination)) throw new TypeError(`Destination at index ${index} must be a plain object`);
  const id = requiredString(destination.id, `Destination id at index ${index}`);
  const visibilityPolicy = String(destination.visibilityPolicy ?? 'preserve').trim();
  if (!['preserve', 'omit-unsupported'].includes(visibilityPolicy)) {
    throw new RangeError(`Unsupported destination visibility policy: ${visibilityPolicy}`);
  }
  return Object.freeze({
    id,
    label: String(destination.label ?? id),
    capabilityId: destination.capabilityId == null ? null : requiredString(destination.capabilityId, `Capability for destination ${id}`),
    visibilityPolicy,
    fallbackId: destination.fallbackId == null ? null : requiredString(destination.fallbackId, `Fallback for destination ${id}`)
  });
}

export function resolveGlazeNavigation(options = {}) {
  if (!plainObject(options)) throw new TypeError('Navigation options must be a plain object');
  const destinations = Array.isArray(options.destinations) ? options.destinations.map(normalizeDestination) : [];
  const ids = destinations.map(destination => destination.id);
  if (new Set(ids).size !== ids.length) throw new RangeError('Destination ids must be unique');
  const capabilities = normalizeCapabilityInput(options.capabilities || []);
  const currentId = options.currentId == null ? null : String(options.currentId).trim();

  const resolved = destinations.map(destination => {
    if (!destination.capabilityId) {
      return Object.freeze({...destination, visible: true, enabled: true, state: 'available', reasonCodes: Object.freeze([])});
    }
    const capability = resolveGlazeCapability(capabilities, destination.capabilityId);
    const visible = !(capability.state === 'unsupported' && destination.visibilityPolicy === 'omit-unsupported');
    return Object.freeze({
      ...destination,
      visible,
      enabled: capability.availableForInvocation,
      state: capability.state,
      reasonCodes: Object.freeze([
        ...(capability.state === 'degraded' ? ['degraded-capability'] : []),
        ...(!capability.availableForInvocation ? [`capability-${capability.state}`] : []),
        ...(!visible ? ['unsupported-destination-omitted'] : [])
      ])
    });
  });

  const visible = resolved.filter(destination => destination.visible);
  const current = resolved.find(destination => destination.id === currentId) || null;
  let acceptedId = currentId && current?.visible ? currentId : null;
  const continuityReasons = [];
  if (!acceptedId && currentId) {
    const explicitFallback = current?.fallbackId ? visible.find(destination => destination.id === current.fallbackId) : null;
    acceptedId = explicitFallback?.id || visible[0]?.id || null;
    continuityReasons.push('current-destination-unavailable-preserve-task-context');
  }

  return Object.freeze({
    version: '1.5.0-dev.1',
    lifecycle: 'development',
    destinations: Object.freeze(resolved),
    visibleDestinationIds: Object.freeze(visible.map(destination => destination.id)),
    requestedCurrentId: currentId,
    acceptedCurrentId: acceptedId,
    currentDestinationChanged: Boolean(currentId && acceptedId !== currentId),
    taskStateReset: false,
    pageReloadRequired: false,
    automaticNavigationAllowed: false,
    reasonCodes: Object.freeze(continuityReasons)
  });
}

export function resolveGlazeControlPresentation(actions = [], capabilities = []) {
  const decisions = resolveCapabilityAwareActions(actions, normalizeCapabilityInput(capabilities));
  return Object.freeze(decisions.map(decision => {
    const blockingState = decision.blockingStates[0]?.state || null;
    let presentationState = decision.degraded ? 'degraded' : 'available';
    if (!decision.enabled) presentationState = blockingState || 'unknown';
    return Object.freeze({
      id: decision.id,
      label: decision.label,
      visible: true,
      enabled: decision.enabled,
      presentationState,
      explanationRequired: !decision.enabled || decision.degraded,
      recovery: decision.recovery,
      reasonCodes: decision.reasonCodes,
      automaticExecutionAllowed: false,
      permissionRequestedAutomatically: false
    });
  }));
}

export const glazeCompositionDevelopmentContract = Object.freeze({
  version: '1.5.0-dev.1',
  lifecycle: 'development',
  semanticContextOnly: true,
  rawDimensionInferenceRequired: false,
  accessibilityHasPresentationPrecedence: true,
  runtimePressureMayReducePresentationCost: true,
  runtimePressureMayModifyCapabilityTruth: false,
  connectivityChangesPreserveCompositionContinuity: true,
  constrainedWindowPreservesTaskState: true,
  primaryActionReorderingAutomatic: false,
  navigationContinuityRequired: true,
  taskStateResetOnCapabilityChange: false,
  automaticNavigationAllowed: false,
  automaticConsequentialExecutionAllowed: false
});
