/* GLAZE UI V1.6 — Development perceived-performance, diagnostics,
 * regression, layout-stability, and graceful-degradation foundation.
 *
 * Development-only and non-consumer-eligible. This module can evaluate
 * caller-supplied evidence and produce presentation/diagnostic guidance.
 * It does not manufacture measurements, rendered/native evidence, provider
 * truth, release acceptance, or lifecycle authority.
 */

const DIAGNOSTIC_CODES = Object.freeze([
  'insufficient-contrast',
  'unsupported-token-override',
  'missing-component-state',
  'excessive-blur',
  'excessive-animation',
  'inaccessible-target-size',
  'missing-accessible-name',
  'nested-material-misuse',
  'inconsistent-semantic-state',
  'skeleton-active-too-long',
  'loading-without-recovery'
]);

const ACCESSIBILITY_CHECKS = Object.freeze([
  'contrast',
  'focus-visibility',
  'logical-focus-order',
  'minimum-target-sizing',
  'reduced-motion',
  'reduced-transparency',
  'large-text-reflow',
  'semantic-announcements',
  'screen-reader-labeling',
  'non-color-status'
]);

const VISUAL_REGRESSION_SCENES = Object.freeze([
  'appearance-light',
  'appearance-dark',
  'high-contrast',
  'reduced-motion',
  'reduced-transparency',
  'large-text',
  'loading',
  'skeleton-loading',
  'offline',
  'degraded',
  'error',
  'empty',
  'responsive-layout',
  'multiple-input-methods'
]);

const GRACEFUL_DEGRADATION_CHAINS = Object.freeze({
  blur: Object.freeze(['blur', 'translucent-solid', 'opaque-solid']),
  morph: Object.freeze(['morph', 'fade', 'immediate-state-change']),
  'animated-skeleton': Object.freeze(['animated-skeleton', 'static-skeleton']),
  'environmental-effect': Object.freeze(['environmental-effect', 'semantic-surface']),
  'complex-transition': Object.freeze(['complex-transition', 'direct-replacement'])
});

const APPROVED_PERFORMANCE_BUDGET = Object.freeze({
  source: 'GoreeCloud Standard — Glaze UI Performance Budget',
  sourceVersion: 'v1.0',
  effectiveDate: '2026-09-15',
  resolverP95MsMax: 10.0,
  resolverP99MsMax: 16.7,
  interactionPaintP95MsMax: 100,
  interactionPaintP99MsMax: 200,
  activeFrameP95MinimumCeilingMs: 20,
  activeFrameP95IdleMultiplier: 1.25,
  severeFrameStallRateMax: 0.01,
  catastrophicForegroundStallCountMax: 0,
  taskStateResetCountMax: 0,
  pageReloadRequiredCountMax: 0,
  automaticAuthorityActionCountMax: 0,
  minimumSamples: Object.freeze({
    resolver: 200,
    interactionPaint: 30,
    idleFrames: 120,
    activeFrames: 240
  })
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

function bool(value) {
  return value === true;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function finiteNonNegative(value) {
  const number = finite(value);
  return number !== null && number >= 0 ? number : null;
}

function integerNonNegative(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function uniqueStrings(values, max = 200) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze(
    [...new Set(values.map(value => String(value ?? '').trim()).filter(Boolean))].slice(0, max)
  );
}

function diagnostic(code, severity, domain, detail) {
  return Object.freeze({
    code,
    severity,
    domain,
    detail: String(detail || code),
    autofixExecuted: false
  });
}

function diagnosticCheck(id, status, detail) {
  return Object.freeze({
    id,
    status,
    detail: String(detail || id)
  });
}

function checkMetric(id, actual, comparator, limit, evidencePresent = true) {
  if (!evidencePresent || actual === null || limit === null) {
    return Object.freeze({id, status: 'unverified', actual, limit});
  }
  return Object.freeze({
    id,
    status: comparator(actual, limit) ? 'pass' : 'fail',
    actual,
    limit
  });
}

function aggregateCheckStatus(checks) {
  if (checks.some(check => check.status === 'fail')) return 'fail';
  if (checks.every(check => check.status === 'pass')) return 'pass';
  return 'unverified';
}

function requiredEnvironmentMetadata(input) {
  const environment = plainObject(input) ? input : {};
  const fields = [
    'exactRevision',
    'lifecycle',
    'operatingSystem',
    'runtime',
    'hardware',
    'foregroundState',
    'presentationMode',
    'measurementDate'
  ];
  const missing = fields.filter(field => String(environment[field] ?? '').trim() === '');
  return Object.freeze({
    requiredFields: Object.freeze(fields),
    missingFields: Object.freeze(missing),
    complete: missing.length === 0,
    displayRefreshRateHz: finiteNonNegative(environment.displayRefreshRateHz)
  });
}

export function resolveGlazePerceivedPerformance(input = {}) {
  if (!plainObject(input)) throw new TypeError('Perceived-performance input must be a plain object');

  const visibleContentReady = bool(input.visibleContentReady);
  const secondaryContentReady = bool(input.secondaryContentReady);
  const interactionAcknowledged = bool(input.interactionAcknowledged);
  const layoutSpaceReserved = input.layoutSpaceReserved !== false;
  const incrementalRenderingAvailable = input.incrementalRenderingAvailable !== false;
  const progressiveDisclosureAvailable = input.progressiveDisclosureAvailable !== false;
  const staleUsableContent = bool(input.staleUsableContent);
  const secondaryHydrationPending = bool(input.secondaryHydrationPending);
  const nonessentialEffectsPending = bool(input.nonessentialEffectsPending);

  const partiallyUseful = visibleContentReady || staleUsableContent;
  const canBecomeInteractiveBeforeSecondaryComplete = partiallyUseful && !secondaryContentReady;

  return Object.freeze({
    version: '1.6.0-dev.9',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    consumerEligible: false,
    readiness: Object.freeze({
      visibleContentReady,
      secondaryContentReady,
      partiallyUseful,
      canBecomeInteractiveBeforeSecondaryComplete,
      interactionAcknowledged
    }),
    presentation: Object.freeze({
      immediateInteractionFeedbackRequired: true,
      stableLayoutDuringAsyncRequired: true,
      layoutSpaceReserved,
      incrementalRenderingPreferred: incrementalRenderingAvailable,
      progressiveDisclosurePreferred: progressiveDisclosureAvailable,
      deferNonessentialEffects: nonessentialEffectsPending,
      prioritizeVisibleContent: true,
      backgroundHydrateSecondaryContent: secondaryHydrationPending,
      preserveUsableStaleContent: staleUsableContent,
      placeholderGeometryMustPreventLayoutJumps: true,
      temporarySurfaceReplacementMustPreserveContinuity: true,
      fullSecondaryCompletionRequiredBeforeInteraction: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      actualContentReadinessOwnedByApplicationOrProvider: true,
      taskExecutionPerformedByGlaze: false,
      networkWorkStartedByGlaze: false,
      measurementsManufactured: false
    })
  });
}

export function runGlazeDeveloperDiagnostics(input = {}) {
  if (!plainObject(input)) throw new TypeError('Developer-diagnostics input must be a plain object');

  const findings = [];

  if (input.contrastSufficient === false) {
    findings.push(diagnostic('insufficient-contrast', 'error', 'accessibility', 'Contrast is below the caller-validated requirement.'));
  }
  if (bool(input.unsupportedTokenOverride)) {
    findings.push(diagnostic('unsupported-token-override', 'error', 'tokens', 'A protected or unsupported token override was detected.'));
  }

  const missingStates = uniqueStrings(input.missingComponentStates, 100);
  for (const state of missingStates) {
    findings.push(diagnostic('missing-component-state', 'error', 'components', `Missing component state: ${state}`));
  }

  if (bool(input.blurOverBudget)) {
    findings.push(diagnostic('excessive-blur', 'warning', 'materials', 'Blur usage exceeds the applicable caller/governance budget.'));
  }
  if (bool(input.animationOverBudget)) {
    findings.push(diagnostic('excessive-animation', 'warning', 'motion', 'Animation usage exceeds the applicable caller/governance budget.'));
  }
  if (input.targetSizeAccessible === false) {
    findings.push(diagnostic('inaccessible-target-size', 'error', 'accessibility', 'Interactive target size does not meet the applicable minimum.'));
  }
  if (bool(input.missingAccessibleName)) {
    findings.push(diagnostic('missing-accessible-name', 'error', 'accessibility', 'Interactive content is missing an accessible name.'));
  }
  if (bool(input.nestedMaterialMisuse)) {
    findings.push(diagnostic('nested-material-misuse', 'warning', 'materials', 'Nested material treatment conflicts with the current material hierarchy.'));
  }
  if (bool(input.semanticStateInconsistent)) {
    findings.push(diagnostic('inconsistent-semantic-state', 'error', 'semantics', 'Presented semantic state conflicts with the authoritative state.'));
  }
  if (bool(input.skeletonActiveTooLong)) {
    findings.push(diagnostic('skeleton-active-too-long', 'warning', 'loading', 'Skeleton activity exceeded the applicable caller/governance duration.'));
  }
  if (bool(input.loadingWithoutRecovery)) {
    findings.push(diagnostic('loading-without-recovery', 'error', 'loading', 'Loading presentation lacks required failure escalation or recovery behavior.'));
  }

  return Object.freeze({
    version: '1.6.0-dev.9',
    lifecycle: 'development',
    findings: Object.freeze(findings),
    findingCount: findings.length,
    codes: Object.freeze([...new Set(findings.map(finding => finding.code))]),
    clean: findings.length === 0,
    supportedCodes: DIAGNOSTIC_CODES,
    safety: Object.freeze({
      autofixExecuted: false,
      sourceModifiedByDiagnostic: false,
      privateContentIncluded: false,
      providerSecretsIncluded: false
    })
  });
}

export function runGlazeAccessibilityDiagnostics(input = {}) {
  if (!plainObject(input)) throw new TypeError('Accessibility-diagnostics input must be a plain object');

  const checks = [
    diagnosticCheck('contrast', input.contrastSufficient === true ? 'pass' : input.contrastSufficient === false ? 'fail' : 'unverified', 'Contrast must satisfy the applicable semantic context.'),
    diagnosticCheck('focus-visibility', input.focusVisible === true ? 'pass' : input.focusVisible === false ? 'fail' : 'unverified', 'Focus must remain visibly distinguishable.'),
    diagnosticCheck('logical-focus-order', input.focusOrderLogical === true ? 'pass' : input.focusOrderLogical === false ? 'fail' : 'unverified', 'Focus order must follow semantic task order.'),
    diagnosticCheck('minimum-target-sizing', input.targetSizeAccessible === true ? 'pass' : input.targetSizeAccessible === false ? 'fail' : 'unverified', 'Targets must meet the applicable minimum sizing.'),
    diagnosticCheck('reduced-motion', input.reducedMotionCompatible === true ? 'pass' : input.reducedMotionCompatible === false ? 'fail' : 'unverified', 'Reduced Motion must preserve meaning and usability.'),
    diagnosticCheck('reduced-transparency', input.reducedTransparencyCompatible === true ? 'pass' : input.reducedTransparencyCompatible === false ? 'fail' : 'unverified', 'Reduced Transparency must preserve hierarchy and meaning.'),
    diagnosticCheck('large-text-reflow', input.largeTextReflow === true ? 'pass' : input.largeTextReflow === false ? 'fail' : 'unverified', 'Large text must reflow without clipping or target shrinkage.'),
    diagnosticCheck('semantic-announcements', input.semanticAnnouncementsCorrect === true ? 'pass' : input.semanticAnnouncementsCorrect === false ? 'fail' : 'unverified', 'Assistive announcements must match semantic state.'),
    diagnosticCheck('screen-reader-labeling', input.screenReaderLabelsComplete === true ? 'pass' : input.screenReaderLabelsComplete === false ? 'fail' : 'unverified', 'Interactive and meaningful elements must be labeled.'),
    diagnosticCheck('non-color-status', input.statusMeaningAvailableWithoutColor === true ? 'pass' : input.statusMeaningAvailableWithoutColor === false ? 'fail' : 'unverified', 'Status meaning must survive without color.')
  ];

  return Object.freeze({
    version: '1.6.0-dev.9',
    lifecycle: 'development',
    checks: Object.freeze(checks),
    supportedChecks: ACCESSIBILITY_CHECKS,
    status: aggregateCheckStatus(checks),
    failureIds: Object.freeze(checks.filter(check => check.status === 'fail').map(check => check.id)),
    unverifiedIds: Object.freeze(checks.filter(check => check.status === 'unverified').map(check => check.id)),
    renderedOrAssistiveTechnologyEvidenceManufactured: false
  });
}

export function runGlazeSkeletonDiagnostics(input = {}) {
  if (!plainObject(input)) throw new TypeError('Skeleton-diagnostics input must be a plain object');

  const findings = [];
  const skeletonActive = bool(input.skeletonActive);
  const contentReady = bool(input.contentReady);
  const reducedMotion = bool(input.reducedMotion);
  const motionMode = semanticId(input.motionMode, 'static');
  const simultaneousShimmerCount = integerNonNegative(input.simultaneousShimmerCount);
  const simultaneousShimmerBudget = integerNonNegative(input.simultaneousShimmerBudget);
  const elapsedMs = finiteNonNegative(input.elapsedMs);
  const maximumSkeletonDurationMs = finiteNonNegative(input.maximumSkeletonDurationMs);

  if (skeletonActive && contentReady) {
    findings.push(diagnostic('skeleton-after-content-ready', 'error', 'loading', 'Skeleton remains active after authoritative content readiness.'));
  }
  if (reducedMotion && motionMode !== 'static') {
    findings.push(diagnostic('skeleton-reduced-motion-incompatible', 'error', 'accessibility', 'Reduced Motion requires a non-animated skeleton presentation.'));
  }
  if (
    simultaneousShimmerCount !== null
    && simultaneousShimmerBudget !== null
    && simultaneousShimmerCount > simultaneousShimmerBudget
  ) {
    findings.push(diagnostic('skeleton-simultaneous-shimmer-over-budget', 'warning', 'motion', 'Simultaneous shimmer exceeds the supplied applicable budget.'));
  }
  if (input.layoutStable === false || bool(input.geometryCausesMajorLayoutShift)) {
    findings.push(diagnostic('skeleton-layout-shift', 'error', 'layout', 'Skeleton geometry causes material layout movement.'));
  }
  if (input.loadingSemanticsPresent === false) {
    findings.push(diagnostic('skeleton-loading-semantics-missing', 'error', 'accessibility', 'Skeleton presentation lacks loading semantics.'));
  }
  if (input.failureEscalationAvailable === false) {
    findings.push(diagnostic('skeleton-failure-escalation-missing', 'error', 'recovery', 'Skeleton loading has no failure escalation path.'));
  }
  if (
    skeletonActive
    && elapsedMs !== null
    && maximumSkeletonDurationMs !== null
    && elapsedMs > maximumSkeletonDurationMs
  ) {
    findings.push(diagnostic('skeleton-endless', 'error', 'loading', 'Skeleton exceeded the supplied maximum duration without resolution.'));
  }
  if (input.focusPreservedOnResolve === false) {
    findings.push(diagnostic('skeleton-focus-loss', 'error', 'accessibility', 'Skeleton-to-content resolution does not preserve or restore focus.'));
  }

  const durationEvidenceAvailable = elapsedMs !== null && maximumSkeletonDurationMs !== null;
  const shimmerBudgetEvidenceAvailable = simultaneousShimmerCount !== null && simultaneousShimmerBudget !== null;

  return Object.freeze({
    version: '1.6.0-dev.9',
    lifecycle: 'development',
    findings: Object.freeze(findings),
    findingCount: findings.length,
    clean: findings.length === 0,
    evidence: Object.freeze({
      durationEvidenceAvailable,
      shimmerBudgetEvidenceAvailable,
      inventedDurationThreshold: false,
      inventedShimmerBudget: false
    }),
    privacy: Object.freeze({
      rawContentIncluded: false,
      providerIdentityIncluded: false,
      privateUserBehaviorIncluded: false
    })
  });
}

export function buildGlazeVisualRegressionMatrix(input = {}) {
  if (!plainObject(input)) throw new TypeError('Visual-regression matrix input must be a plain object');

  const additionalScenes = uniqueStrings(input.additionalScenes, 100)
    .filter(scene => !VISUAL_REGRESSION_SCENES.includes(scene));
  const scenes = Object.freeze([...VISUAL_REGRESSION_SCENES, ...additionalScenes]);

  return Object.freeze({
    version: '1.6.0-dev.9',
    lifecycle: 'development',
    deterministic: true,
    scenes,
    requiredSceneCount: VISUAL_REGRESSION_SCENES.length,
    includes: Object.freeze({
      light: scenes.includes('appearance-light'),
      dark: scenes.includes('appearance-dark'),
      highContrast: scenes.includes('high-contrast'),
      reducedMotion: scenes.includes('reduced-motion'),
      reducedTransparency: scenes.includes('reduced-transparency'),
      largeText: scenes.includes('large-text'),
      loading: scenes.includes('loading'),
      skeletonLoading: scenes.includes('skeleton-loading'),
      offline: scenes.includes('offline'),
      degraded: scenes.includes('degraded'),
      error: scenes.includes('error'),
      empty: scenes.includes('empty'),
      responsive: scenes.includes('responsive-layout'),
      multipleInputMethods: scenes.includes('multiple-input-methods')
    }),
    evidence: Object.freeze({
      screenshotsCapturedByResolver: false,
      renderedAcceptanceClaimed: false,
      exactRevisionMustBeRecordedExternally: true
    })
  });
}

export function evaluateGlazeSemanticRegression(input = {}) {
  if (!plainObject(input)) throw new TypeError('Semantic-regression input must be a plain object');

  const cases = Array.isArray(input.cases) ? input.cases.slice(0, 200) : [];
  const results = cases.map((entry, index) => {
    const item = plainObject(entry) ? entry : {};
    const expected = semanticId(item.expected, 'unknown');
    const actual = semanticId(item.actual, 'unknown');
    return Object.freeze({
      id: String(item.id ?? `case-${index + 1}`),
      expected,
      actual,
      status: expected === actual ? 'pass' : 'fail'
    });
  });

  return Object.freeze({
    version: '1.6.0-dev.9',
    lifecycle: 'development',
    results: Object.freeze(results),
    status: results.length === 0 ? 'unverified' : aggregateCheckStatus(results),
    failedIds: Object.freeze(results.filter(result => result.status === 'fail').map(result => result.id)),
    invariants: Object.freeze({
      errorMustRemainErrorAcrossThemes: true,
      focusDistinctFromSelection: true,
      loadingNotCompletion: true,
      restrictedNotMerelyDisabled: true,
      offlineNotGenericFailure: true,
      semanticMeaningMayNotBeChangedByTheme: true
    }),
    authority: Object.freeze({
      expectedSemanticsOwnedByContractOrCaller: true,
      actualSemanticsObservedByCallerOrTestHarness: true,
      stateTruthInventedByGlaze: false
    })
  });
}

export function evaluateGlazePerformanceMeasurements(input = {}) {
  if (!plainObject(input)) throw new TypeError('Performance-measurement input must be a plain object');

  const environment = requiredEnvironmentMetadata(input.environment);
  const samples = plainObject(input.samples) ? input.samples : {};
  const measurements = plainObject(input.measurements) ? input.measurements : {};

  const resolverSamples = integerNonNegative(samples.resolver);
  const interactionSamples = integerNonNegative(samples.interactionPaint);
  const idleFrameSamples = integerNonNegative(samples.idleFrames);
  const activeFrameSamples = integerNonNegative(samples.activeFrames);

  const resolverP95 = finiteNonNegative(measurements.resolverP95Ms);
  const resolverP99 = finiteNonNegative(measurements.resolverP99Ms);
  const interactionP95 = finiteNonNegative(measurements.interactionPaintP95Ms);
  const interactionP99 = finiteNonNegative(measurements.interactionPaintP99Ms);
  const idleMedian = finiteNonNegative(measurements.idleMedianFrameIntervalMs);
  const activeP95 = finiteNonNegative(measurements.activeFrameP95Ms);
  const severeRate = finiteNonNegative(measurements.severeFrameStallRate);
  const catastrophic = integerNonNegative(measurements.catastrophicForegroundStallCount);
  const resets = integerNonNegative(measurements.taskStateResetCount);
  const reloads = integerNonNegative(measurements.pageReloadRequiredCount);
  const authorityActions = integerNonNegative(measurements.automaticAuthorityActionCount);

  const activeFrameP95Limit = idleMedian === null
    ? null
    : Math.max(
      APPROVED_PERFORMANCE_BUDGET.activeFrameP95MinimumCeilingMs,
      APPROVED_PERFORMANCE_BUDGET.activeFrameP95IdleMultiplier * idleMedian
    );

  const sampleChecks = [
    checkMetric('resolver-sample-count', resolverSamples, (a,b) => a >= b, APPROVED_PERFORMANCE_BUDGET.minimumSamples.resolver),
    checkMetric('interaction-sample-count', interactionSamples, (a,b) => a >= b, APPROVED_PERFORMANCE_BUDGET.minimumSamples.interactionPaint),
    checkMetric('idle-frame-sample-count', idleFrameSamples, (a,b) => a >= b, APPROVED_PERFORMANCE_BUDGET.minimumSamples.idleFrames),
    checkMetric('active-frame-sample-count', activeFrameSamples, (a,b) => a >= b, APPROVED_PERFORMANCE_BUDGET.minimumSamples.activeFrames)
  ];

  const metricChecks = [
    checkMetric('resolver-p95-ms', resolverP95, (a,b) => a <= b, APPROVED_PERFORMANCE_BUDGET.resolverP95MsMax),
    checkMetric('resolver-p99-ms', resolverP99, (a,b) => a <= b, APPROVED_PERFORMANCE_BUDGET.resolverP99MsMax),
    checkMetric('interaction-paint-p95-ms', interactionP95, (a,b) => a <= b, APPROVED_PERFORMANCE_BUDGET.interactionPaintP95MsMax),
    checkMetric('interaction-paint-p99-ms', interactionP99, (a,b) => a <= b, APPROVED_PERFORMANCE_BUDGET.interactionPaintP99MsMax),
    checkMetric('active-frame-p95-ms', activeP95, (a,b) => a <= b, activeFrameP95Limit, idleMedian !== null),
    checkMetric('severe-frame-stall-rate', severeRate, (a,b) => a <= b, APPROVED_PERFORMANCE_BUDGET.severeFrameStallRateMax),
    checkMetric('catastrophic-foreground-stalls', catastrophic, (a,b) => a <= b, APPROVED_PERFORMANCE_BUDGET.catastrophicForegroundStallCountMax),
    checkMetric('task-state-resets', resets, (a,b) => a <= b, APPROVED_PERFORMANCE_BUDGET.taskStateResetCountMax),
    checkMetric('page-reloads-required', reloads, (a,b) => a <= b, APPROVED_PERFORMANCE_BUDGET.pageReloadRequiredCountMax),
    checkMetric('automatic-authority-actions', authorityActions, (a,b) => a <= b, APPROVED_PERFORMANCE_BUDGET.automaticAuthorityActionCountMax)
  ];

  const allChecks = [...sampleChecks, ...metricChecks];
  const measurementStatus = aggregateCheckStatus(allChecks);
  const status = environment.complete ? measurementStatus : measurementStatus === 'fail' ? 'fail' : 'unverified';

  return Object.freeze({
    version: '1.6.0-dev.9',
    lifecycle: 'development',
    budget: APPROVED_PERFORMANCE_BUDGET,
    environment,
    sampleChecks: Object.freeze(sampleChecks),
    metricChecks: Object.freeze(metricChecks),
    derived: Object.freeze({
      activeFrameP95LimitMs: activeFrameP95Limit
    }),
    status,
    evidence: Object.freeze({
      measurementsManufactured: false,
      missingMeasurementInferredPassing: false,
      missingEnvironmentMetadataInferredPassing: false,
      exactRevisionBindingRequired: true,
      representativeRenderedOrNativeEvidenceRequiredForAcceptance: true
    }),
    authority: Object.freeze({
      performanceAdaptationMayChangeTruth: false,
      automaticNavigationAllowed: false,
      automaticPermissionRequestAllowed: false,
      consequentialExecutionAllowed: false,
      fallbackExecutionAllowed: false
    })
  });
}

export function evaluateGlazeLayoutStability(input = {}) {
  if (!plainObject(input)) throw new TypeError('Layout-stability input must be a plain object');

  const checks = [
    diagnosticCheck('skeleton-space-reserved', input.skeletonSpaceReserved === true ? 'pass' : input.skeletonSpaceReserved === false ? 'fail' : 'unverified', 'Skeleton geometry should preserve final-content space.'),
    diagnosticCheck('image-space-reserved', input.imageSpaceReserved === true ? 'pass' : input.imageSpaceReserved === false ? 'fail' : 'unverified', 'Images should reserve expected layout space where practical.'),
    diagnosticCheck('dynamic-control-space-reserved', input.dynamicControlSpaceReserved === true ? 'pass' : input.dynamicControlSpaceReserved === false ? 'fail' : 'unverified', 'Dynamic controls should avoid unnecessary layout displacement.'),
    diagnosticCheck('async-content-space-reserved', input.asyncContentSpaceReserved === true ? 'pass' : input.asyncContentSpaceReserved === false ? 'fail' : 'unverified', 'Asynchronous content should preserve space where practical.'),
    diagnosticCheck('unexpected-layout-movement', input.unexpectedLayoutMovement === false ? 'pass' : input.unexpectedLayoutMovement === true ? 'fail' : 'unverified', 'Unexpected page movement should be minimized.')
  ];

  const measuredShift = finiteNonNegative(input.measuredShift);
  const suppliedBudget = finiteNonNegative(input.suppliedShiftBudget);
  const measuredCheck = suppliedBudget === null
    ? Object.freeze({id:'measured-layout-shift',status:'unverified',actual:measuredShift,limit:null})
    : checkMetric('measured-layout-shift', measuredShift, (a,b) => a <= b, suppliedBudget);

  const allChecks = [...checks, measuredCheck];

  return Object.freeze({
    version: '1.6.0-dev.9',
    lifecycle: 'development',
    checks: Object.freeze(allChecks),
    status: aggregateCheckStatus(allChecks),
    evidence: Object.freeze({
      suppliedShiftBudget: suppliedBudget,
      inventedShiftBudget: false,
      measuredShiftManufactured: false
    }),
    continuity: Object.freeze({
      focusMayBeLostFromLayoutShift: false,
      scrollMayBeResetFromAsyncContent: false,
      stableGeometryPreferred: true
    })
  });
}

export function resolveGlazeGracefulDegradation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Graceful-degradation input must be a plain object');

  const effect = semanticId(input.effect);
  const chain = GRACEFUL_DEGRADATION_CHAINS[effect];
  if (!chain) throw new RangeError(`Unsupported degradation effect: ${effect}`);

  const capabilityAvailable = input.capabilityAvailable !== false;
  const accessibilityRequiresSimplification = bool(input.accessibilityRequiresSimplification);
  const performanceRequiresSimplification = bool(input.performanceRequiresSimplification);
  const forceSimplest = bool(input.forceSimplest);

  let index = 0;
  if (!capabilityAvailable || accessibilityRequiresSimplification || performanceRequiresSimplification) {
    index = Math.min(1, chain.length - 1);
  }
  if (forceSimplest) index = chain.length - 1;

  const selected = chain[index];

  return Object.freeze({
    version: '1.6.0-dev.9',
    lifecycle: 'development',
    effect,
    chain,
    selected,
    simplified: index > 0,
    reason: forceSimplest
      ? 'simplest-fallback-required'
      : !capabilityAvailable
        ? 'capability-unavailable'
        : accessibilityRequiresSimplification
          ? 'accessibility-precedence'
          : performanceRequiresSimplification
            ? 'performance-budget'
            : 'preferred-effect-available',
    invariants: Object.freeze({
      meaningPreserved: true,
      usabilityPreserved: true,
      semanticStatePreserved: true,
      authorityStatePreserved: true,
      fallbackMayManufactureCapability: false,
      fallbackExecutionAutomatic: false
    })
  });
}

export const glazeV16PerformanceDiagnosticsDevelopmentContract = Object.freeze({
  version: '1.6.0-dev.9',
  lifecycle: 'development',
  stableBaseline: '1.5.1',
  consumerEligible: false,
  diagnosticCodes: DIAGNOSTIC_CODES,
  accessibilityChecks: ACCESSIBILITY_CHECKS,
  visualRegressionScenes: VISUAL_REGRESSION_SCENES,
  gracefulDegradationChains: GRACEFUL_DEGRADATION_CHAINS,
  approvedPerformanceBudget: APPROVED_PERFORMANCE_BUDGET,
  partiallyUsefulScreenMayBecomeInteractiveBeforeSecondaryCompletion: true,
  diagnosticsMayAutofixSource: false,
  diagnosticsMayIncludePrivateContentByDefault: false,
  missingEvidenceMayInferPass: false,
  visualRegressionMatrixClaimsRenderedEvidence: false,
  performanceMeasurementsMayBeManufactured: false,
  layoutShiftBudgetMayBeInvented: false,
  gracefulFallbackMustPreserveMeaning: true,
  authorityBoundary: 'presentation-and-evidence-evaluation-only'
});
