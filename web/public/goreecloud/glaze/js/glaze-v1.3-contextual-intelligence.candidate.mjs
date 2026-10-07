const SIGNAL_FAMILIES = new Set([
  'current-task',
  'current-destination',
  'selected-object-kind',
  'available-source-kind',
  'interaction-mode',
  'local-environment-summary',
  'producer-declared-state'
]);

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, finite(value, 0)));
}

export function normalizeContextSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError('Context snapshot must be an object');
  }
  const signals = {};
  for (const [family, value] of Object.entries(snapshot.signals || {})) {
    if (!SIGNAL_FAMILIES.has(family)) continue;
    if (value == null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      signals[family] = value;
    }
  }
  return Object.freeze({
    signals: Object.freeze(signals),
    source: String(snapshot.source || 'consumer-or-platform-adapter'),
    contextAvailable: Object.keys(signals).length > 0,
    rawPrivateActivityRetained: false,
    rawContentRetained: false,
    persisted: false
  });
}

function normalizeSuggestion(suggestion, index) {
  if (!suggestion || typeof suggestion !== 'object') throw new TypeError(`Suggestion at index ${index} must be an object`);
  const id = String(suggestion.id ?? '').trim();
  if (!id) throw new TypeError(`Suggestion at index ${index} requires a stable id`);
  const label = String(suggestion.label ?? '').trim();
  if (!label) throw new TypeError(`Suggestion ${id} requires a visible label`);
  const provenance = String(suggestion.provenance ?? '').trim();
  if (!provenance) throw new TypeError(`Suggestion ${id} requires provenance`);
  return Object.freeze({
    ...suggestion,
    id,
    label,
    provenance,
    relevance: clamp01(suggestion.relevance),
    consequential: Boolean(suggestion.consequential),
    destructive: Boolean(suggestion.destructive),
    dismissible: suggestion.dismissible !== false,
    generated: suggestion.generated !== false
  });
}

export function rankOptionalSuggestions(suggestions) {
  if (!Array.isArray(suggestions)) throw new TypeError('Suggestions must be an array');
  const normalized = suggestions.map(normalizeSuggestion);
  const ids = normalized.map(item => item.id);
  if (new Set(ids).size !== ids.length) throw new RangeError('Suggestion ids must be unique');
  return Object.freeze(
    normalized
      .map((suggestion, originalIndex) => ({suggestion, originalIndex}))
      .sort((a, b) => b.suggestion.relevance - a.suggestion.relevance || a.originalIndex - b.originalIndex)
      .map(({suggestion}) => suggestion)
  );
}

export function resolveContextualPresentation(options = {}) {
  const context = normalizeContextSnapshot(options.context || {});
  const suggestions = rankOptionalSuggestions(options.suggestions || []);
  const dismissedIds = new Set(Array.isArray(options.dismissedSuggestionIds) ? options.dismissedSuggestionIds.map(String) : []);
  const activeSuggestions = suggestions.filter(item => !dismissedIds.has(item.id));
  return Object.freeze({
    context,
    suggestions,
    activeSuggestions: Object.freeze(activeSuggestions),
    contextNeutralFallback: !context.contextAvailable,
    primaryNavigationReordered: false,
    primaryNavigationInvented: false,
    semanticTruthRedefined: false,
    productIdentityErased: false,
    contextColorAuthority: 'below-semantic-product-identity-and-user-accent',
    generatedResultsAreSystemTruth: false,
    pageReloadRequired: false,
    taskStateReset: false,
    reducedMotionImmediateContextChange: Boolean(options.reducedMotion),
    largeTextKeepsProvenanceVisible: true
  });
}

export function actionSafetyForSuggestion(suggestion) {
  const normalized = normalizeSuggestion(suggestion, 0);
  const confirmationRequired = normalized.consequential || normalized.destructive;
  return Object.freeze({
    suggestionId: normalized.id,
    confirmationRequired,
    automaticExecutionAllowed: false,
    generatedSuggestionIsSoleAuthority: false,
    producerTruthRemainsAuthoritative: true
  });
}

export function dismissContextualSuggestion(suggestions, suggestionId) {
  const normalized = rankOptionalSuggestions(suggestions);
  const id = String(suggestionId);
  const target = normalized.find(item => item.id === id);
  if (!target) throw new RangeError('Suggestion id was not found');
  if (!target.dismissible) throw new RangeError('Suggestion is not dismissible');
  return Object.freeze(normalized.filter(item => item.id !== id));
}

export function applyContextualPresentation(target, options = {}) {
  if (!target?.dataset || !target?.style || typeof target.style.setProperty !== 'function') {
    throw new TypeError('Contextual target must expose dataset and style.setProperty');
  }
  const result = resolveContextualPresentation(options);
  target.dataset.glazeContextV13 = result.context.contextAvailable ? 'contextual' : 'neutral';
  target.dataset.glazeSuggestionCount = String(result.activeSuggestions.length);
  target.style.setProperty('--glz13-context-provenance-visible', '1');
  target.style.setProperty('--glz13-context-navigation-stable', '1');
  return result;
}

export const contextualIntelligenceCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  allowedSignalFamilies: Object.freeze([...SIGNAL_FAMILIES]),
  optionalSuggestionsOnly: true,
  primaryNavigationReorderingAllowed: false,
  semanticTruthRedefinitionAllowed: false,
  automaticConsequentialExecutionAllowed: false,
  remoteInferenceRequired: false,
  telemetryRequired: false,
  runtimePersistenceRequired: false,
  humanIntelligenceAcceptanceEstablished: false
});
