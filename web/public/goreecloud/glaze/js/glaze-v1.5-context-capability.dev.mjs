const CONTEXT_DOMAINS = Object.freeze([
  'layout',
  'device-posture',
  'input',
  'interaction',
  'task',
  'content',
  'environment',
  'accessibility',
  'runtime',
  'connectivity',
  'window-state'
]);

const CAPABILITY_DOMAINS = Object.freeze([
  'rendering',
  'platform',
  'device',
  'application',
  'service',
  'authorization',
  'connectivity',
  'intelligence'
]);

const CAPABILITY_STATES = Object.freeze([
  'supported',
  'available',
  'degraded',
  'temporarily-unavailable',
  'offline',
  'permission-required',
  'restricted',
  'unsupported',
  'disabled',
  'unknown'
]);

const CONTEXT_DOMAIN_SET = new Set(CONTEXT_DOMAINS);
const CAPABILITY_DOMAIN_SET = new Set(CAPABILITY_DOMAINS);
const CAPABILITY_STATE_SET = new Set(CAPABILITY_STATES);
const INVOCABLE_STATES = new Set(['available', 'degraded']);
const PRESENTABLE_STATES = new Set(['supported', 'available', 'degraded']);
const PROVENANCE_AUTHORITIES = new Set([
  'platform',
  'application',
  'service',
  'policy',
  'security',
  'privacy',
  'identity',
  'runtime',
  'accessibility',
  'unknown'
]);

const SENSITIVE_CONTEXT_KEY = /(?:password|passcode|credential|secret|token|cookie|session|clipboard|messagebody|emailbody|rawcontent|rawactivity|rawsensor|preciselocation|biometric|userid|accountid)/i;

function plainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function stringId(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new TypeError(`${label} must be a non-empty string`);
  return result;
}

function sanitizeContextValue(value, path, depth = 0) {
  if (value == null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (depth >= 2) throw new TypeError(`Context value at ${path} exceeds the bounded nesting depth`);

  if (Array.isArray(value)) {
    if (value.length > 16) throw new RangeError(`Context array at ${path} exceeds 16 items`);
    return Object.freeze(value.map((item, index) => sanitizeContextValue(item, `${path}[${index}]`, depth + 1)));
  }

  if (!plainObject(value)) throw new TypeError(`Context value at ${path} must be serializable bounded data`);
  const entries = Object.entries(value);
  if (entries.length > 24) throw new RangeError(`Context object at ${path} exceeds 24 fields`);
  const output = {};
  for (const [key, child] of entries) {
    if (SENSITIVE_CONTEXT_KEY.test(key)) {
      throw new TypeError(`Sensitive or raw context field is not accepted: ${path}.${key}`);
    }
    output[key] = sanitizeContextValue(child, `${path}.${key}`, depth + 1);
  }
  return Object.freeze(output);
}

function normalizeAccessibility(value = {}) {
  const input = plainObject(value) ? value : {};
  return Object.freeze({
    reducedMotion: Boolean(input.reducedMotion),
    reducedTransparency: Boolean(input.reducedTransparency),
    increasedContrast: Boolean(input.increasedContrast),
    forcedColors: Boolean(input.forcedColors),
    largeText: Boolean(input.largeText),
    touchAssistance: Boolean(input.touchAssistance)
  });
}

export const GLAZE_CONTEXT_DOMAINS = CONTEXT_DOMAINS;
export const GLAZE_CAPABILITY_DOMAINS = CAPABILITY_DOMAINS;
export const GLAZE_CAPABILITY_STATES = CAPABILITY_STATES;

export function normalizeGlazeContext(snapshot = {}) {
  if (!plainObject(snapshot)) throw new TypeError('GlazeContext must be a plain object');
  const domains = {};
  for (const [domain, value] of Object.entries(snapshot)) {
    if (!CONTEXT_DOMAIN_SET.has(domain)) continue;
    domains[domain] = sanitizeContextValue(value, domain);
  }
  return Object.freeze({
    domains: Object.freeze(domains),
    availableDomains: Object.freeze(Object.keys(domains)),
    contextAvailable: Object.keys(domains).length > 0,
    persisted: false,
    telemetryRequired: false,
    remoteAnalysisRequired: false,
    rawPrivateActivityRetained: false,
    rawContentRetained: false
  });
}

function normalizeProvenance(value) {
  if (!plainObject(value)) return null;
  const provider = String(value.provider ?? '').trim();
  const authority = String(value.authority ?? 'unknown').trim();
  if (!provider || !PROVENANCE_AUTHORITIES.has(authority)) return null;
  const scope = String(value.scope ?? 'current-runtime').trim() || 'current-runtime';
  const observedAt = value.observedAt == null ? null : String(value.observedAt);
  return Object.freeze({provider, authority, scope, observedAt});
}

export function normalizeGlazeCapability(record = {}) {
  if (!plainObject(record)) throw new TypeError('Capability record must be a plain object');
  const id = stringId(record.id, 'Capability id');
  const domain = String(record.domain ?? '').trim();
  if (!CAPABILITY_DOMAIN_SET.has(domain)) throw new RangeError(`Unsupported capability domain: ${domain || '(empty)'}`);

  const requestedState = String(record.state ?? 'unknown').trim();
  const validRequestedState = CAPABILITY_STATE_SET.has(requestedState) ? requestedState : 'unknown';
  const provenance = normalizeProvenance(record.provenance);
  const state = validRequestedState !== 'unknown' && !provenance ? 'unknown' : validRequestedState;
  const reasonCodes = [];
  if (!CAPABILITY_STATE_SET.has(requestedState)) reasonCodes.push('invalid-state-failed-closed');
  if (validRequestedState !== 'unknown' && !provenance) reasonCodes.push('missing-provenance-failed-closed');
  if (state === 'unknown') reasonCodes.push('capability-unverified');

  return Object.freeze({
    id,
    domain,
    state,
    requestedState: validRequestedState,
    provenance,
    availableForInvocation: INVOCABLE_STATES.has(state),
    presentableAsAvailable: PRESENTABLE_STATES.has(state),
    degraded: state === 'degraded',
    permissionRequired: state === 'permission-required',
    restricted: state === 'restricted',
    reasonCodes: Object.freeze([...new Set(reasonCodes)])
  });
}

export function normalizeGlazeCapabilities(records = []) {
  if (!Array.isArray(records)) throw new TypeError('GlazeCapabilities must be an array of capability records');
  const byId = {};
  for (const record of records) {
    const normalized = normalizeGlazeCapability(record);
    if (Object.hasOwn(byId, normalized.id)) throw new RangeError(`Duplicate capability id: ${normalized.id}`);
    byId[normalized.id] = normalized;
  }
  return Object.freeze({
    byId: Object.freeze(byId),
    ids: Object.freeze(Object.keys(byId)),
    count: Object.keys(byId).length,
    inferredPermissionGranted: false,
    glazeIsAuthorizationAuthority: false
  });
}

export function resolveGlazeCapability(capabilities, capabilityId) {
  const normalized = Array.isArray(capabilities) ? normalizeGlazeCapabilities(capabilities) : capabilities;
  const id = stringId(capabilityId, 'Capability id');
  const record = normalized?.byId?.[id];
  if (record) return record;
  return Object.freeze({
    id,
    domain: 'application',
    state: 'unknown',
    requestedState: 'unknown',
    provenance: null,
    availableForInvocation: false,
    presentableAsAvailable: false,
    degraded: false,
    permissionRequired: false,
    restricted: false,
    reasonCodes: Object.freeze(['capability-not-provided', 'capability-unverified'])
  });
}

function normalizeAction(action, index) {
  if (!plainObject(action)) throw new TypeError(`Action at index ${index} must be a plain object`);
  const id = stringId(action.id, `Action id at index ${index}`);
  const requiredCapabilities = Array.isArray(action.requiredCapabilities)
    ? Object.freeze(action.requiredCapabilities.map((item, capabilityIndex) => stringId(item, `Capability ${capabilityIndex} for action ${id}`)))
    : Object.freeze([]);
  return Object.freeze({
    id,
    label: String(action.label ?? id),
    requiredCapabilities,
    consequential: Boolean(action.consequential),
    destructive: Boolean(action.destructive),
    primary: Boolean(action.primary)
  });
}

function actionDecision(action, capabilities) {
  const records = action.requiredCapabilities.map(id => resolveGlazeCapability(capabilities, id));
  const blocking = records.filter(record => !record.availableForInvocation);
  const permissionRequired = blocking.some(record => record.state === 'permission-required');
  const restricted = blocking.some(record => record.state === 'restricted');
  const offline = blocking.some(record => record.state === 'offline');
  const temporary = blocking.some(record => record.state === 'temporarily-unavailable');
  const unknown = blocking.some(record => record.state === 'unknown');
  const unsupported = blocking.some(record => record.state === 'unsupported');
  const disabled = blocking.some(record => record.state === 'disabled');
  const enabled = blocking.length === 0;
  const degraded = records.some(record => record.state === 'degraded');

  let recovery = null;
  if (permissionRequired) recovery = 'request-permission-user-initiated';
  else if (offline) recovery = 'restore-connectivity';
  else if (temporary) recovery = 'retry-when-available';

  return Object.freeze({
    id: action.id,
    label: action.label,
    primary: action.primary,
    enabled,
    degraded,
    consequential: action.consequential,
    destructive: action.destructive,
    automaticExecutionAllowed: false,
    permissionRequestedAutomatically: false,
    requiredCapabilities: action.requiredCapabilities,
    blockingStates: Object.freeze(blocking.map(record => Object.freeze({id: record.id, state: record.state}))),
    reasonCodes: Object.freeze([
      ...(permissionRequired ? ['permission-required'] : []),
      ...(restricted ? ['restricted-by-authority'] : []),
      ...(offline ? ['offline'] : []),
      ...(temporary ? ['temporarily-unavailable'] : []),
      ...(unknown ? ['capability-unknown'] : []),
      ...(unsupported ? ['unsupported'] : []),
      ...(disabled ? ['disabled'] : []),
      ...(degraded ? ['degraded-capability'] : [])
    ]),
    recovery
  });
}

export function resolveCapabilityAwareActions(actions = [], capabilityRecords = []) {
  if (!Array.isArray(actions)) throw new TypeError('Actions must be an array');
  const normalizedActions = actions.map(normalizeAction);
  const ids = normalizedActions.map(action => action.id);
  if (new Set(ids).size !== ids.length) throw new RangeError('Action ids must be unique');
  const capabilities = Array.isArray(capabilityRecords) ? normalizeGlazeCapabilities(capabilityRecords) : capabilityRecords;
  return Object.freeze(normalizedActions.map(action => actionDecision(action, capabilities)));
}

function resolveOpticalPresentation(accessibility, capabilities) {
  if (accessibility.forcedColors) {
    return Object.freeze({mode: 'solid-forced-colors', motionAllowed: false, reasonCodes: Object.freeze(['forced-colors-authority'])});
  }
  if (accessibility.reducedTransparency) {
    return Object.freeze({mode: 'solid-reduced-transparency', motionAllowed: !accessibility.reducedMotion, reasonCodes: Object.freeze(['reduced-transparency-authority'])});
  }

  const backdrop = resolveGlazeCapability(capabilities, 'rendering.backdrop-blur');
  let mode = 'full-optical';
  const reasons = [];
  if (!backdrop.availableForInvocation) {
    mode = 'solid-fallback';
    reasons.push(`backdrop-blur-${backdrop.state}`);
  } else if (backdrop.degraded) {
    mode = 'reduced-optical';
    reasons.push('backdrop-blur-degraded');
  }
  if (accessibility.increasedContrast) reasons.push('increased-contrast');
  return Object.freeze({mode, motionAllowed: !accessibility.reducedMotion, reasonCodes: Object.freeze(reasons)});
}

export function explainGlazeAdaptation(decision) {
  if (!plainObject(decision)) throw new TypeError('Adaptation decision must be an object');
  return Object.freeze({
    version: '1.5.0-dev.1',
    contextDomains: Object.freeze([...(decision.context?.availableDomains || [])]),
    capabilityStateCounts: Object.freeze({...decision.capabilityStateCounts}),
    actionReasonCodes: Object.freeze((decision.actions || []).map(action => Object.freeze({id: action.id, reasonCodes: action.reasonCodes}))),
    opticalReasonCodes: Object.freeze([...(decision.optical?.reasonCodes || [])]),
    privacy: Object.freeze({
      rawContextIncluded: false,
      capabilityProvidersIncluded: false,
      telemetryRequired: false,
      remoteAnalysisRequired: false
    })
  });
}

export function resolveGlazeAdaptation(options = {}) {
  if (!plainObject(options)) throw new TypeError('Adaptation options must be a plain object');
  const context = normalizeGlazeContext(options.context || {});
  const capabilities = normalizeGlazeCapabilities(options.capabilities || []);
  const accessibility = normalizeAccessibility(options.accessibility || context.domains.accessibility || {});
  const actions = resolveCapabilityAwareActions(options.actions || [], capabilities);
  const capabilityStateCounts = {};
  for (const record of Object.values(capabilities.byId)) {
    capabilityStateCounts[record.state] = (capabilityStateCounts[record.state] || 0) + 1;
  }
  const optical = resolveOpticalPresentation(accessibility, capabilities);
  const decision = {
    version: '1.5.0-dev.1',
    lifecycle: 'development',
    context,
    capabilities,
    accessibility,
    actions,
    optical,
    capabilityStateCounts: Object.freeze(capabilityStateCounts),
    primaryActionOrderStable: true,
    navigationContinuityRequired: true,
    semanticTruthRedefined: false,
    authorizationInferred: false,
    automaticConsequentialExecutionAllowed: false,
    pageReloadRequired: false,
    taskStateReset: false
  };
  decision.explanation = explainGlazeAdaptation(decision);
  return Object.freeze(decision);
}

export function createGlazeAdaptationStabilizer(options = {}) {
  const input = plainObject(options) ? options : {};
  const minStableSamples = Math.max(1, Math.floor(Number(input.minStableSamples) || 2));
  const minDwellMs = Math.max(0, Math.floor(Number(input.minDwellMs) || 120));
  let acceptedSignature = null;
  let acceptedValue = null;
  let pendingSignature = null;
  let pendingValue = null;
  let pendingSamples = 0;
  let pendingSince = 0;

  return Object.freeze({
    minStableSamples,
    minDwellMs,
    update(signatureValue, value, nowMs = Date.now()) {
      const signature = stringId(signatureValue, 'Adaptation signature');
      const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
      if (acceptedSignature == null) {
        acceptedSignature = signature;
        acceptedValue = value;
        return Object.freeze({accepted: true, changed: true, signature, value, pending: false});
      }
      if (signature === acceptedSignature) {
        pendingSignature = null;
        pendingValue = null;
        pendingSamples = 0;
        return Object.freeze({accepted: true, changed: false, signature, value: acceptedValue, pending: false});
      }
      if (signature !== pendingSignature) {
        pendingSignature = signature;
        pendingValue = value;
        pendingSamples = 1;
        pendingSince = now;
      } else {
        pendingSamples += 1;
        pendingValue = value;
      }
      const ready = pendingSamples >= minStableSamples && now - pendingSince >= minDwellMs;
      if (ready) {
        acceptedSignature = pendingSignature;
        acceptedValue = pendingValue;
        pendingSignature = null;
        pendingValue = null;
        pendingSamples = 0;
        return Object.freeze({accepted: true, changed: true, signature: acceptedSignature, value: acceptedValue, pending: false});
      }
      return Object.freeze({accepted: false, changed: false, signature: acceptedSignature, value: acceptedValue, pending: true, pendingSignature, pendingSamples});
    },
    reset() {
      acceptedSignature = null;
      acceptedValue = null;
      pendingSignature = null;
      pendingValue = null;
      pendingSamples = 0;
      pendingSince = 0;
    }
  });
}

export function mapV141OpticalCapabilities(optical = {}) {
  const input = plainObject(optical) ? optical : {};
  const capabilities = plainObject(input.capabilities) ? input.capabilities : {};
  const provenance = Object.freeze({provider: 'glaze-v1.4.1-optical-engine', authority: 'runtime', scope: 'rendering-only'});
  const mapState = value => value === false ? 'unsupported' : 'available';
  return Object.freeze([
    Object.freeze({id: 'rendering.backdrop-blur', domain: 'rendering', state: mapState(capabilities.backdropBlur), provenance}),
    Object.freeze({id: 'rendering.dynamic-sampling', domain: 'rendering', state: mapState(capabilities.dynamicSampling), provenance}),
    Object.freeze({id: 'rendering.dynamic-reflection', domain: 'rendering', state: mapState(capabilities.dynamicReflection), provenance}),
    Object.freeze({id: 'rendering.aura', domain: 'rendering', state: mapState(capabilities.aura), provenance}),
    Object.freeze({id: 'rendering.motion', domain: 'rendering', state: mapState(capabilities.motion), provenance})
  ]);
}

export const glazeContextCapabilityDevelopment = Object.freeze({
  version: '1.5.0-dev.1',
  lifecycle: 'development',
  stableBaseline: '1.4.1',
  consumerEligible: false,
  contextDomains: GLAZE_CONTEXT_DOMAINS,
  capabilityDomains: GLAZE_CAPABILITY_DOMAINS,
  capabilityStates: GLAZE_CAPABILITY_STATES,
  provenanceRequiredForNonUnknownState: true,
  noSilentCapabilityInference: true,
  automaticPermissionRequestAllowed: false,
  automaticConsequentialExecutionAllowed: false,
  glazeIsAuthorizationAuthority: false,
  remoteContextRequired: false,
  telemetryRequired: false,
  persistenceRequired: false,
  humanAcceptanceEstablished: false,
  stablePromotionAutomatic: false
});