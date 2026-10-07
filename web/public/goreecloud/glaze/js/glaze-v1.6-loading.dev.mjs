/* GLAZE UI V1.6 — Development loading and skeleton foundation.
 *
 * This module is non-consumer-eligible Development source. It implements a
 * bounded presentation resolver for V1.6 loading/skeleton behavior while the
 * current Stable release remains GLAZE UI V1.5 / 1.5.1.
 */

const SKELETON_TYPES = Object.freeze([
  'text', 'heading', 'paragraph', 'avatar', 'profile-information', 'icon',
  'button', 'card', 'list', 'grid-item', 'table', 'row', 'navigation-item',
  'image', 'album-artwork', 'video-thumbnail', 'media-metadata', 'chart',
  'form', 'search-result', 'message', 'notification', 'dashboard-widget',
  'sidebar', 'detail-pane', 'custom'
]);

const MOTION_MODES = Object.freeze([
  'static',
  'soft-pulse',
  'flow',
  'progressive-resolve',
  'skeleton-to-content-morph'
]);

const PRESENTATIONS = Object.freeze([
  'quiet-wait',
  'immediate-content',
  'optimistic-state',
  'inline-progress',
  'skeleton',
  'indeterminate-progress',
  'determinate-progress',
  'background-refresh',
  'full-blocking-progress',
  'empty',
  'error',
  'offline',
  'degraded',
  'stale-content'
]);

const OPERATION_STATES = new Set([
  'idle',
  'initial',
  'updating',
  'refreshing',
  'loading-more',
  'processing',
  'offline',
  'degraded',
  'failed',
  'complete',
  'empty'
]);

const DEFAULT_THRESHOLDS = Object.freeze({
  skeletonDelayMs: 160,
  extendedLoadMs: 2000,
  delayedResponseMs: 6000
});

function plainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function finiteNonNegative(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function truthy(value) {
  return value === true;
}

function uniqueStrings(values) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze([...new Set(values.map(value => String(value ?? '').trim()).filter(Boolean))]);
}

function normalizeThresholds(input) {
  const source = plainObject(input) ? input : {};
  const normalized = {
    skeletonDelayMs: finiteNonNegative(source.skeletonDelayMs, DEFAULT_THRESHOLDS.skeletonDelayMs),
    extendedLoadMs: finiteNonNegative(source.extendedLoadMs, DEFAULT_THRESHOLDS.extendedLoadMs),
    delayedResponseMs: finiteNonNegative(source.delayedResponseMs, DEFAULT_THRESHOLDS.delayedResponseMs)
  };
  if (normalized.extendedLoadMs < normalized.skeletonDelayMs) {
    throw new RangeError('extendedLoadMs must be greater than or equal to skeletonDelayMs');
  }
  if (normalized.delayedResponseMs < normalized.extendedLoadMs) {
    throw new RangeError('delayedResponseMs must be greater than or equal to extendedLoadMs');
  }
  return Object.freeze(normalized);
}

function normalizeProgress(progress) {
  if (!plainObject(progress)) {
    return Object.freeze({kind: 'unknown', value: null, truthful: true});
  }
  const raw = Number(progress.value);
  if (progress.kind === 'determinate' && Number.isFinite(raw) && raw >= 0 && raw <= 1) {
    return Object.freeze({kind: 'determinate', value: raw, truthful: true});
  }
  return Object.freeze({kind: 'indeterminate', value: null, truthful: true});
}

function loadingStage(state, elapsedMs, thresholds) {
  if (state === 'complete') return 'complete';
  if (state === 'failed') return 'failed';
  if (state === 'offline') return 'offline';
  if (state === 'degraded') return 'degraded';
  if (elapsedMs < thresholds.extendedLoadMs) return 'initial-load';
  if (elapsedMs < thresholds.delayedResponseMs) return 'extended-load';
  return 'delayed-response';
}

function assistiveState(state) {
  switch (state) {
    case 'refreshing': return 'refreshing';
    case 'updating': return 'updating';
    case 'loading-more': return 'loading-additional-results';
    case 'processing': return 'processing';
    case 'complete': return 'content-available';
    case 'failed': return 'loading-failed';
    case 'offline': return 'offline';
    case 'degraded': return 'degraded';
    case 'empty': return 'empty';
    default: return 'loading';
  }
}

function optimisticAllowed(operation) {
  return truthy(operation.optimisticEligible)
    && truthy(operation.reversible)
    && !truthy(operation.securitySensitive)
    && !truthy(operation.privacySensitive)
    && !truthy(operation.destructive)
    && !truthy(operation.irreversible);
}

function resolveSkeletonMotion({
  accessibility,
  runtime,
  skeletonCount,
  requestedMotionMode,
  progressive,
  geometrySimilar
}) {
  const reducedMotion = truthy(accessibility.reducedMotion) || truthy(accessibility.minimalMotion);
  const performanceLevel = String(runtime.performanceLevel || 'balanced').toLowerCase();
  const animationBudgetAvailable = runtime.animationBudgetAvailable !== false;
  const manySkeletons = skeletonCount >= 12;
  const constrained = ['efficient', 'essential'].includes(performanceLevel);

  let baseMode = 'soft-pulse';
  if (reducedMotion || constrained || manySkeletons || !animationBudgetAvailable) {
    baseMode = 'static';
  } else if (requestedMotionMode === 'flow' && ['full', 'balanced'].includes(performanceLevel) && skeletonCount <= 4) {
    baseMode = 'flow';
  } else if (requestedMotionMode === 'static') {
    baseMode = 'static';
  }

  const progressiveResolve = truthy(progressive);
  const morphAllowed = truthy(geometrySimilar)
    && !reducedMotion
    && performanceLevel !== 'essential';

  return Object.freeze({
    baseMode,
    progressiveResolve,
    morphAllowed,
    supportedModes: MOTION_MODES,
    reducedMotionApplied: reducedMotion,
    motionFatigueProtectionApplied: manySkeletons,
    performanceConstraintApplied: constrained || !animationBudgetAvailable,
    flashingAllowed: false,
    continuousMotionRequired: false
  });
}

export function createGlazeSkeletonDescriptor(input = {}) {
  if (!plainObject(input)) throw new TypeError('Skeleton descriptor input must be a plain object');

  const type = String(input.type || '').trim();
  if (!SKELETON_TYPES.includes(type)) {
    throw new RangeError(`Unsupported Glaze skeleton type: ${type || '(empty)'}`);
  }

  const geometry = plainObject(input.geometry) ? input.geometry : {};
  const hierarchy = String(input.hierarchy || 'content').trim() || 'content';

  return Object.freeze({
    type,
    geometry: Object.freeze({
      width: geometry.width ?? null,
      height: geometry.height ?? null,
      cornerRole: String(geometry.cornerRole || 'inherit').trim(),
      aspectRatio: geometry.aspectRatio ?? null,
      lineCount: Number.isInteger(geometry.lineCount) && geometry.lineCount > 0 ? geometry.lineCount : null,
      spacingRole: String(geometry.spacingRole || 'inherit').trim(),
      alignment: String(geometry.alignment || 'inherit').trim()
    }),
    hierarchy,
    expectedContentRole: String(input.expectedContentRole || type).trim(),
    accessibility: Object.freeze({
      hiddenFromAccessibilityTree: true,
      announcesPlaceholderIndividually: false
    }),
    truth: Object.freeze({
      fakeContentGenerated: false,
      structuralApproximationOnly: true
    })
  });
}

export function resolveGlazeLoadingPresentation(options = {}) {
  if (!plainObject(options)) throw new TypeError('Loading presentation options must be a plain object');

  const state = String(options.state || 'initial').trim().toLowerCase();
  if (!OPERATION_STATES.has(state)) throw new RangeError(`Unsupported loading state: ${state}`);

  const elapsedMs = finiteNonNegative(options.elapsedMs, 0);
  const thresholds = normalizeThresholds(options.thresholds);
  const content = plainObject(options.content) ? options.content : {};
  const operation = plainObject(options.operation) ? options.operation : {};
  const accessibility = plainObject(options.accessibility) ? options.accessibility : {};
  const runtime = plainObject(options.runtime) ? options.runtime : {};
  const skeleton = plainObject(options.skeleton) ? options.skeleton : {};
  const recovery = plainObject(options.recovery) ? options.recovery : {};
  const progress = normalizeProgress(options.progress);

  const hasContent = truthy(content.available);
  const staleUsable = truthy(content.staleUsable);
  const canRetry = truthy(recovery.retryAvailable);
  const canContinueOffline = truthy(recovery.continueOfflineAvailable);
  const preserveExistingContent = hasContent && ['refreshing', 'updating', 'loading-more'].includes(state);
  const stage = loadingStage(state, elapsedMs, thresholds);
  const safeOptimism = optimisticAllowed(operation);

  let presentation = 'quiet-wait';
  let visible = false;
  let reason = 'short-operation-quiet-window';

  if (state === 'complete') {
    presentation = hasContent ? 'immediate-content' : 'empty';
    visible = true;
    reason = hasContent ? 'content-available' : 'completed-without-content';
  } else if (state === 'empty') {
    presentation = 'empty';
    visible = true;
    reason = 'authoritative-empty-state';
  } else if (state === 'failed') {
    presentation = 'error';
    visible = true;
    reason = 'authoritative-failure-state';
  } else if (state === 'offline') {
    presentation = 'offline';
    visible = true;
    reason = staleUsable || hasContent ? 'offline-with-usable-content' : 'offline-without-usable-content';
  } else if (state === 'degraded') {
    presentation = 'degraded';
    visible = true;
    reason = 'authoritative-degraded-state';
  } else if (preserveExistingContent) {
    presentation = state === 'loading-more' ? 'inline-progress' : 'background-refresh';
    visible = true;
    reason = 'preserve-existing-content';
  } else if (staleUsable) {
    presentation = 'stale-content';
    visible = true;
    reason = 'stale-content-remains-usable';
  } else if (safeOptimism) {
    presentation = 'optimistic-state';
    visible = true;
    reason = 'reversible-safe-optimistic-operation';
  } else if (truthy(operation.blocking)) {
    presentation = 'full-blocking-progress';
    visible = true;
    reason = 'operation-is-genuinely-blocking';
  } else if (progress.kind === 'determinate') {
    presentation = 'determinate-progress';
    visible = true;
    reason = 'truthful-determinate-progress-available';
  } else if (state === 'processing') {
    presentation = 'indeterminate-progress';
    visible = true;
    reason = 'processing-without-determinate-progress';
  } else if (elapsedMs >= thresholds.skeletonDelayMs && ['initial', 'updating'].includes(state)) {
    presentation = 'skeleton';
    visible = true;
    reason = 'initial-structure-not-yet-available';
  } else if (state === 'loading-more') {
    presentation = 'inline-progress';
    visible = true;
    reason = 'loading-additional-results';
  }

  const skeletonCount = Number.isInteger(skeleton.count) && skeleton.count >= 0 ? skeleton.count : 0;
  const skeletonMotion = resolveSkeletonMotion({
    accessibility,
    runtime,
    skeletonCount,
    requestedMotionMode: String(skeleton.requestedMotionMode || 'soft-pulse').toLowerCase(),
    progressive: skeleton.progressiveResolve,
    geometrySimilar: skeleton.geometrySimilar
  });

  const reducedTransparency = truthy(accessibility.reducedTransparency);
  const increasedContrast = truthy(accessibility.increasedContrast) || truthy(accessibility.forcedColors);
  const solidSkeletonAlternative = reducedTransparency || increasedContrast;

  return Object.freeze({
    version: '1.6.0-dev.1',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    consumerEligible: false,
    state,
    elapsedMs,
    thresholds,
    stage,
    presentation: Object.freeze({
      kind: presentation,
      visible,
      reason,
      supportedKinds: PRESENTATIONS,
      preserveExistingContent,
      contentBlankedForRefresh: false,
      progress,
      fakePercentageGenerated: false
    }),
    skeleton: Object.freeze({
      active: presentation === 'skeleton',
      count: skeletonCount,
      geometryMustApproximateFinalContent: true,
      hiddenFromAccessibilityTree: true,
      individualAnnouncementsAllowed: false,
      opacityOnlyMeaningAllowed: false,
      solidAlternativeApplied: solidSkeletonAlternative,
      motion: skeletonMotion
    }),
    accessibility: Object.freeze({
      semanticState: assistiveState(state),
      reducedMotionApplied: skeletonMotion.reducedMotionApplied,
      reducedTransparencyApplied: reducedTransparency,
      increasedContrastApplied: increasedContrast,
      singleStateAnnouncementPreferred: true,
      essentialMeaningDependsOnMotion: false,
      essentialMeaningDependsOnOpacity: false
    }),
    escalation: Object.freeze({
      stage,
      delayedResponse: stage === 'delayed-response',
      retryAvailable: canRetry,
      continueOfflineAvailable: canContinueOffline,
      timeoutAloneInfersOffline: false,
      timeoutAloneInfersDegraded: false
    }),
    optimism: Object.freeze({
      requested: truthy(operation.optimisticEligible),
      allowed: safeOptimism,
      prohibitedForSecuritySensitive: truthy(operation.securitySensitive),
      prohibitedForPrivacySensitive: truthy(operation.privacySensitive),
      prohibitedForDestructive: truthy(operation.destructive),
      prohibitedForIrreversible: truthy(operation.irreversible) || operation.reversible === false
    }),
    authority: Object.freeze({
      boundary: 'presentation-only',
      stateTruthOwnedByCaller: true,
      connectivityInferred: false,
      privacyStateInferred: false,
      securityStateInferred: false,
      authorizationInferred: false,
      permissionGranted: false,
      consequentialExecutionAutomatic: false,
      recoveryCapabilityInvented: false
    }),
    continuity: Object.freeze({
      layoutPositionPreservationRequired: true,
      focusPreservationRequired: true,
      scrollPositionPreservationRequired: true,
      usableStaleContentMayRemainVisible: true
    }),
    diagnostics: Object.freeze({
      rawContentIncluded: false,
      providerIdentityIncluded: false,
      privateUserBehaviorIncluded: false,
      localResolutionSupported: true
    })
  });
}

export const glazeV16LoadingDevelopmentContract = Object.freeze({
  version: '1.6.0-dev.1',
  lifecycle: 'development',
  stableBaseline: '1.5.1',
  consumerEligible: false,
  skeletonTypes: SKELETON_TYPES,
  skeletonMotionModes: MOTION_MODES,
  loadingPresentations: PRESENTATIONS,
  defaultThresholds: DEFAULT_THRESHOLDS,
  accessibilityPrecedence: true,
  reducedMotionForcesStaticSkeleton: true,
  preserveExistingContentDuringRefresh: true,
  determinateProgressMustBeTruthful: true,
  optimisticSecuritySensitiveAllowed: false,
  optimisticIrreversibleAllowed: false,
  timeoutMayInferOffline: false,
  timeoutMayInferDegraded: false,
  authorityBoundary: 'presentation-only'
});
