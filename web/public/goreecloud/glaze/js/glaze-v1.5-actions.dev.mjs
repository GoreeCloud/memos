import {
  normalizeGlazeContext,
  normalizeGlazeCapabilities,
  resolveCapabilityAwareActions
} from './glaze-v1.5-context-capability.dev.mjs';

const CAPABILITY_STATES = new Set([
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

const VISIBILITY_POLICIES = new Set(['preserve', 'omit-unsupported']);
const RECOVERY_KINDS = new Set([
  'request-permission',
  'restore-connectivity',
  'retry',
  'use-fallback',
  'learn-more',
  'none'
]);

const BLOCKING_STATE_PRECEDENCE = Object.freeze([
  'restricted',
  'permission-required',
  'offline',
  'temporarily-unavailable',
  'unsupported',
  'disabled',
  'unknown',
  'supported'
]);

const DEFAULT_STATE_EXPLANATIONS = Object.freeze({
  supported: 'This action is supported but is not currently declared available.',
  degraded: 'This action is available with degraded capability.',
  'temporarily-unavailable': 'This action is temporarily unavailable.',
  offline: 'This action is unavailable while its required network capability is offline.',
  'permission-required': 'Permission is required before this action can be used.',
  restricted: 'This action is restricted by an authoritative policy or permission state.',
  unsupported: 'This action is not supported in the current environment.',
  disabled: 'This action is disabled.',
  unknown: 'This action cannot be verified as available.'
});

function plainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function requiredString(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new TypeError(`${label} must be a non-empty string`);
  return result;
}

function boundedText(value, label, maxLength = 280) {
  if (value == null) return null;
  const result = String(value).trim();
  if (!result) return null;
  if (result.length > maxLength) throw new RangeError(`${label} exceeds ${maxLength} characters`);
  return result;
}

function normalizeRelevance(value, actionId) {
  if (value == null) return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError(`Relevance for action ${actionId} must be an array`);
  if (value.length > 12) throw new RangeError(`Relevance for action ${actionId} exceeds 12 clauses`);
  return Object.freeze(value.map((clause, index) => {
    if (!plainObject(clause)) throw new TypeError(`Relevance clause ${index} for action ${actionId} must be an object`);
    const domain = requiredString(clause.domain, `Relevance domain ${index} for action ${actionId}`);
    const key = requiredString(clause.key, `Relevance key ${index} for action ${actionId}`);
    if (!Array.isArray(clause.values) || clause.values.length === 0 || clause.values.length > 12) {
      throw new RangeError(`Relevance values ${index} for action ${actionId} must contain 1-12 items`);
    }
    const values = Object.freeze(clause.values.map((item, valueIndex) =>
      requiredString(item, `Relevance value ${valueIndex} for action ${actionId}`).toLowerCase()
    ));
    return Object.freeze({domain, key, values});
  }));
}

function normalizeStateMessages(value, actionId) {
  if (value == null) return Object.freeze({});
  if (!plainObject(value)) throw new TypeError(`State messages for action ${actionId} must be an object`);
  const result = {};
  for (const [state, message] of Object.entries(value)) {
    if (!CAPABILITY_STATES.has(state)) throw new RangeError(`Unsupported state message key for action ${actionId}: ${state}`);
    const text = boundedText(message, `State message ${state} for action ${actionId}`);
    if (text) result[state] = text;
  }
  return Object.freeze(result);
}

function normalizeRecoveryActions(value, actionId) {
  if (value == null) return Object.freeze({});
  if (!plainObject(value)) throw new TypeError(`Recovery actions for action ${actionId} must be an object`);
  const result = {};
  for (const [state, recovery] of Object.entries(value)) {
    if (!CAPABILITY_STATES.has(state)) throw new RangeError(`Unsupported recovery state for action ${actionId}: ${state}`);
    if (!plainObject(recovery)) throw new TypeError(`Recovery metadata for ${actionId}/${state} must be an object`);
    const kind = String(recovery.kind ?? 'none').trim();
    if (!RECOVERY_KINDS.has(kind)) throw new RangeError(`Unsupported recovery kind for ${actionId}/${state}: ${kind}`);
    result[state] = Object.freeze({
      id: requiredString(recovery.id ?? `${actionId}.${state}.recovery`, `Recovery id for ${actionId}/${state}`),
      label: boundedText(recovery.label, `Recovery label for ${actionId}/${state}`, 120),
      kind,
      targetActionId: recovery.targetActionId == null ? null : requiredString(recovery.targetActionId, `Recovery target for ${actionId}/${state}`),
      userInitiated: true,
      automaticExecutionAllowed: false
    });
  }
  return Object.freeze(result);
}

function normalizeActionMetadata(action, index) {
  if (!plainObject(action)) throw new TypeError(`Action at index ${index} must be a plain object`);
  const id = requiredString(action.id, `Action id at index ${index}`);
  const visibilityPolicy = String(action.visibilityPolicy ?? 'preserve').trim();
  if (!VISIBILITY_POLICIES.has(visibilityPolicy)) {
    throw new RangeError(`Unsupported visibility policy for action ${id}: ${visibilityPolicy}`);
  }
  return Object.freeze({
    id,
    authorIndex: index,
    primary: Boolean(action.primary),
    visibilityPolicy,
    fallbackActionId: action.fallbackActionId == null ? null : requiredString(action.fallbackActionId, `Fallback for action ${id}`),
    relevance: normalizeRelevance(action.relevance, id),
    stateMessages: normalizeStateMessages(action.stateMessages, id),
    recoveryActions: normalizeRecoveryActions(action.recoveryActions, id)
  });
}

function selectedState(decision) {
  if (decision.enabled) return decision.degraded ? 'degraded' : 'available';
  const states = new Set((decision.blockingStates || []).map(item => item.state));
  for (const state of BLOCKING_STATE_PRECEDENCE) {
    if (states.has(state)) return state;
  }
  return 'unknown';
}

function contextMatchCount(metadata, context) {
  let matches = 0;
  for (const clause of metadata.relevance) {
    const domain = context.domains?.[clause.domain];
    if (!plainObject(domain)) continue;
    const actual = domain[clause.key];
    if (actual == null) continue;
    if (clause.values.includes(String(actual).trim().toLowerCase())) matches += 1;
  }
  return matches;
}

function genericRecovery(state, actionId) {
  if (state === 'permission-required') {
    return Object.freeze({
      id: `${actionId}.permission.recovery`,
      label: null,
      kind: 'request-permission',
      targetActionId: null,
      userInitiated: true,
      automaticExecutionAllowed: false
    });
  }
  if (state === 'offline') {
    return Object.freeze({
      id: `${actionId}.connectivity.recovery`,
      label: null,
      kind: 'restore-connectivity',
      targetActionId: null,
      userInitiated: true,
      automaticExecutionAllowed: false
    });
  }
  if (state === 'temporarily-unavailable') {
    return Object.freeze({
      id: `${actionId}.retry.recovery`,
      label: null,
      kind: 'retry',
      targetActionId: null,
      userInitiated: true,
      automaticExecutionAllowed: false
    });
  }
  return null;
}

function sameSequence(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function resolveGlazeActionPrioritization(options = {}) {
  if (!plainObject(options)) throw new TypeError('Action prioritization options must be a plain object');
  const actions = Array.isArray(options.actions) ? options.actions : [];
  const context = normalizeGlazeContext(options.context || {});
  const capabilities = Array.isArray(options.capabilities)
    ? normalizeGlazeCapabilities(options.capabilities)
    : options.capabilities;
  const baseDecisions = resolveCapabilityAwareActions(actions, capabilities);
  const metadata = actions.map(normalizeActionMetadata);
  const decisionById = new Map(baseDecisions.map(decision => [decision.id, decision]));

  const preliminary = metadata.map(item => {
    const decision = decisionById.get(item.id);
    const state = selectedState(decision);
    const matchCount = contextMatchCount(item, context);
    const visible = !(state === 'unsupported' && item.visibilityPolicy === 'omit-unsupported');
    return {
      ...decision,
      state,
      visible,
      authorIndex: item.authorIndex,
      contextMatchCount: matchCount,
      contextuallyRelevant: matchCount > 0,
      metadata: item
    };
  });

  const byId = new Map(preliminary.map(item => [item.id, item]));
  const resolved = preliminary.map(item => {
    const fallback = item.metadata.fallbackActionId ? byId.get(item.metadata.fallbackActionId) : null;
    const fallbackUsable = Boolean(fallback?.visible && fallback?.enabled);
    const customMessage = item.metadata.stateMessages[item.state] || null;
    const explanation = item.state === 'available'
      ? null
      : (customMessage || DEFAULT_STATE_EXPLANATIONS[item.state] || DEFAULT_STATE_EXPLANATIONS.unknown);
    const customRecovery = item.metadata.recoveryActions[item.state] || null;
    let recoveryAction = customRecovery || genericRecovery(item.state, item.id);
    let suggestedFallbackActionId = fallbackUsable ? fallback.id : null;
    if (fallbackUsable && !recoveryAction) {
      recoveryAction = Object.freeze({
        id: `${item.id}.fallback.recovery`,
        label: null,
        kind: 'use-fallback',
        targetActionId: fallback.id,
        userInitiated: true,
        automaticExecutionAllowed: false
      });
    }
    if (recoveryAction?.kind === 'use-fallback' && recoveryAction.targetActionId) {
      const requestedFallback = byId.get(recoveryAction.targetActionId);
      suggestedFallbackActionId = requestedFallback?.visible && requestedFallback?.enabled ? requestedFallback.id : null;
    }

    return Object.freeze({
      id: item.id,
      label: item.label,
      primary: item.primary,
      enabled: item.enabled,
      degraded: item.degraded,
      visible: item.visible,
      state: item.state,
      consequential: item.consequential,
      destructive: item.destructive,
      requiredCapabilities: item.requiredCapabilities,
      blockingStates: item.blockingStates,
      reasonCodes: Object.freeze([
        ...item.reasonCodes,
        ...(item.contextuallyRelevant ? ['contextually-relevant'] : []),
        ...(!item.visible ? ['unsupported-action-omitted'] : []),
        ...(suggestedFallbackActionId ? ['explicit-fallback-available'] : [])
      ]),
      contextMatchCount: item.contextMatchCount,
      contextuallyRelevant: item.contextuallyRelevant,
      explanation,
      recoveryAction,
      suggestedFallbackActionId,
      automaticExecutionAllowed: false,
      permissionRequestedAutomatically: false,
      authorIndex: item.authorIndex
    });
  });

  const visible = resolved.filter(item => item.visible);
  const primary = visible.filter(item => item.primary).sort((a, b) => a.authorIndex - b.authorIndex);
  const secondary = visible.filter(item => !item.primary).sort((a, b) => {
    if (a.contextuallyRelevant !== b.contextuallyRelevant) return a.contextuallyRelevant ? -1 : 1;
    if (a.contextMatchCount !== b.contextMatchCount) return b.contextMatchCount - a.contextMatchCount;
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.authorIndex - b.authorIndex;
  });
  const ordered = [...primary, ...secondary];
  const authoredPrimaryIds = metadata.filter(item => item.primary).map(item => item.id);
  const acceptedPrimaryIds = primary.map(item => item.id);

  return Object.freeze({
    version: '1.5.0-dev.1',
    lifecycle: 'development',
    actions: Object.freeze(ordered),
    orderedActionIds: Object.freeze(ordered.map(item => item.id)),
    primaryActionIds: Object.freeze(acceptedPrimaryIds),
    primaryActionOrderStable: sameSequence(authoredPrimaryIds.filter(id => byId.get(id)?.visible), acceptedPrimaryIds),
    nonPrimaryContextualReorderingAllowed: true,
    reorderingBoundary: 'non-primary-contextual-only',
    automaticExecutionAllowed: false,
    permissionRequestedAutomatically: false,
    fallbackExecutionAutomatic: false,
    explanationProviderIdentityIncluded: false,
    rawContextIncludedInExplanation: false
  });
}

export function summarizeGlazeActionPrioritization(result) {
  if (!plainObject(result)) throw new TypeError('Action prioritization result must be an object');
  return Object.freeze({
    version: '1.5.0-dev.1',
    orderedActionIds: Object.freeze([...(result.orderedActionIds || [])]),
    states: Object.freeze((result.actions || []).map(action => Object.freeze({
      id: action.id,
      state: action.state,
      enabled: action.enabled,
      visible: action.visible,
      degraded: action.degraded,
      reasonCodes: action.reasonCodes,
      hasExplanation: Boolean(action.explanation),
      recoveryKind: action.recoveryAction?.kind || null,
      suggestedFallbackActionId: action.suggestedFallbackActionId || null
    }))),
    primaryActionOrderStable: Boolean(result.primaryActionOrderStable),
    automaticExecutionAllowed: false,
    permissionRequestedAutomatically: false,
    providerIdentityIncluded: false,
    rawContextIncluded: false
  });
}

export const glazeActionDevelopmentContract = Object.freeze({
  version: '1.5.0-dev.1',
  lifecycle: 'development',
  stablePrimaryActionOrdering: true,
  contextualReorderingLimitedToNonPrimaryActions: true,
  explicitFallbackRequired: true,
  fallbackExecutionAutomatic: false,
  unavailableStateExplanationSupported: true,
  recoveryMetadataUserInitiated: true,
  automaticPermissionRequestAllowed: false,
  automaticConsequentialExecutionAllowed: false,
  providerIdentityIncludedInUserExplanation: false,
  rawContextIncludedInUserExplanation: false
});
