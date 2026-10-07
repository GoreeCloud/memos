/* GLAZE UI V1.6 — Development search, navigation, responsive,
 * localization, icon, status, provenance, privacy, security, and
 * capability-presentation foundation.
 *
 * Development-only and non-consumer-eligible. Platform/application/provider
 * systems own task, capability, privacy, security, and source truth.
 */

import {
  resolveGlazeCapabilityPresentation
} from './glaze-v1.6-state-accessibility.dev.mjs';

const SEARCH_PHASES = Object.freeze([
  'initial',
  'typing',
  'suggestions',
  'loading',
  'partial-results',
  'results',
  'no-results',
  'offline-results',
  'filters',
  'history',
  'error'
]);

const NAVIGATION_CAPABILITY_STATES = Object.freeze([
  'available',
  'unavailable',
  'restricted',
  'degraded'
]);

const RESPONSIVE_ENVIRONMENTS = Object.freeze([
  'compact',
  'medium',
  'expanded',
  'large-screen',
  'workspace',
  'far-view',
  'wearable',
  'spatial'
]);

const PANE_STATES = Object.freeze([
  'single-pane',
  'dual-pane',
  'multi-pane',
  'overlay-pane'
]);

const POSTURES = Object.freeze([
  'folded',
  'unfolded',
  'tabletop',
  'portrait',
  'landscape',
  'external-display',
  'resized-window',
  'flat',
  'unknown'
]);

const TEXT_DIRECTIONS = Object.freeze([
  'ltr',
  'rtl',
  'mixed'
]);

const ICON_STATES = Object.freeze([
  'inactive',
  'active',
  'selected',
  'disabled',
  'unavailable'
]);

const STATUS_STATES = Object.freeze([
  'online',
  'offline',
  'local',
  'remote',
  'syncing',
  'synced',
  'unsynced',
  'protected',
  'restricted',
  'shared',
  'private',
  'updating',
  'error',
  'unverified'
]);

const BADGE_CATEGORIES = Object.freeze([
  'status',
  'count',
  'source',
  'privacy',
  'connectivity',
  'warning'
]);

const SOURCE_KINDS = Object.freeze([
  'local',
  'goreecloud-service',
  'remote',
  'cached',
  'synchronized',
  'imported',
  'unknown'
]);

const PRIVACY_STATES = Object.freeze([
  'private',
  'shared',
  'restricted',
  'permission-required',
  'consent-required',
  'local-only',
  'protected',
  'retention-limited',
  'unknown'
]);

const SECURITY_STATES = Object.freeze([
  'protected',
  'restricted',
  'warning',
  'critical',
  'unverified',
  'unknown'
]);

const CAPABILITY_STATES = Object.freeze([
  'available',
  'unavailable',
  'unsupported',
  'restricted',
  'permission-required',
  'temporarily-unavailable',
  'unknown'
]);

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

function uniqueStrings(values) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze(
    [...new Set(values.map(value => String(value ?? '').trim()).filter(Boolean))]
  );
}

function uniqueSemantic(values) {
  return Object.freeze(uniqueStrings(values).map(value => value.toLowerCase()));
}

function boundedIds(values, max = 200) {
  return Object.freeze(uniqueStrings(values).slice(0, max));
}

function stableMergeResultIds(previousIds, incomingIds) {
  const previous = boundedIds(previousIds);
  const incoming = boundedIds(incomingIds);
  const incomingSet = new Set(incoming);
  const stableExisting = previous.filter(id => incomingSet.has(id));
  const existingSet = new Set(stableExisting);
  const appended = incoming.filter(id => !existingSet.has(id));
  return Object.freeze([...stableExisting, ...appended].slice(0, 200));
}

function navigationContext(input) {
  const source = plainObject(input) ? input : {};
  return Object.freeze({
    scrollPositionKey: source.scrollPositionKey == null
      ? null
      : String(source.scrollPositionKey).trim() || null,
    selectedId: source.selectedId == null
      ? null
      : String(source.selectedId).trim() || null,
    expandedIds: boundedIds(source.expandedIds, 100),
    activeFilters: boundedIds(source.activeFilters, 50),
    query: source.query == null ? '' : String(source.query),
    paneState: PANE_STATES.includes(semanticId(source.paneState))
      ? semanticId(source.paneState)
      : null
  });
}

function layoutComposition(environment, task, posture) {
  const taskId = semanticId(task, 'general');
  const postureId = semanticId(posture, 'unknown');

  if (['wearable'].includes(environment)) return 'single-pane';
  if (postureId === 'folded') return 'single-pane';
  if (postureId === 'tabletop') return 'dual-pane';
  if (['compact'].includes(environment)) return 'single-pane';
  if (['medium'].includes(environment)) return taskId === 'focused-reading' ? 'single-pane' : 'dual-pane';
  if (['expanded', 'large-screen', 'workspace'].includes(environment)) {
    if (['editing','management','comparison','mailbox','browser','dashboard'].includes(taskId)) return 'multi-pane';
    return 'dual-pane';
  }
  if (['far-view','spatial'].includes(environment)) return 'dual-pane';
  return 'single-pane';
}

function normalizeEnvironment(value) {
  const environment = semanticId(value, 'medium');
  return RESPONSIVE_ENVIRONMENTS.includes(environment) ? environment : 'medium';
}

function protectedStatus(state) {
  return ['protected','restricted','private','error'].includes(state);
}

function statusRole(state) {
  const map = {
    online: 'status.online',
    offline: 'status.offline',
    local: 'status.local',
    remote: 'status.remote',
    syncing: 'status.syncing',
    synced: 'status.synced',
    unsynced: 'status.unsynced',
    protected: 'status.protected',
    restricted: 'status.restricted',
    shared: 'status.shared',
    private: 'status.private',
    updating: 'status.updating',
    error: 'status.error'
  };
  return map[state];
}

function nonColorIndicatorForStatus(state) {
  if (['syncing','updating'].includes(state)) return 'icon-and-label-or-progress';
  if (['protected','private'].includes(state)) return 'icon-and-label';
  if (['restricted','error','offline','unsynced'].includes(state)) return 'icon-and-label';
  return 'label-or-icon-with-accessible-name';
}

function sourceRole(source) {
  return `source.${source}`;
}

export function resolveGlazeSearchPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Search presentation input must be a plain object');

  const phase = semanticId(input.phase, 'initial');
  if (!SEARCH_PHASES.includes(phase)) {
    throw new RangeError(`Unsupported search phase: ${phase}`);
  }

  const previousResultIds = boundedIds(input.previousResultIds);
  const incomingResultIds = boundedIds(input.incomingResultIds);
  const providerPending = uniqueSemantic(input.pendingProviders);
  const providerFailed = uniqueSemantic(input.failedProviders);
  const partial = phase === 'partial-results' || providerPending.length > 0 || providerFailed.length > 0;
  const stableResultIds = partial
    ? Object.freeze([...previousResultIds, ...incomingResultIds.filter(id => !previousResultIds.includes(id))].slice(0, 200))
    : stableMergeResultIds(previousResultIds, incomingResultIds);
  const offline = phase === 'offline-results' || bool(input.offline);
  const usableExistingResults = stableResultIds.length > 0;

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    phase,
    resultContinuity: Object.freeze({
      previousResultIds,
      incomingResultIds,
      stableResultIds,
      preserveExistingRelativeOrder: true,
      appendNewResultsWithoutArbitraryReordering: true,
      providerArrivalMayReorderExistingResults: false,
      providerPending,
      providerFailed,
      partial
    }),
    state: Object.freeze({
      offline,
      loading: phase === 'loading',
      noResults: phase === 'no-results',
      error: phase === 'error',
      filtersActive: phase === 'filters' || bool(input.filtersActive),
      historyVisible: phase === 'history',
      suggestionsVisible: phase === 'suggestions',
      typing: phase === 'typing'
    }),
    continuity: Object.freeze({
      usableExistingResultsRemainVisible: usableExistingResults,
      queryPreserved: input.query == null ? '' : String(input.query),
      filterStatePreserved: true,
      selectionPreservedWhenStillValid: true,
      focusPreserved: true
    }),
    authority: Object.freeze({
      presentationOnly: true,
      searchResultTruthOwnedByProviders: true,
      providerPrecedenceInferred: false,
      rankingInventedByGlaze: false,
      offlineStateInferredFromTimeout: false
    })
  });
}

export function resolveGlazeNavigationContinuity(input = {}) {
  if (!plainObject(input)) throw new TypeError('Navigation continuity input must be a plain object');

  const previous = navigationContext(input.previous);
  const nextRequested = navigationContext(input.next);
  const validSelectedIds = new Set(boundedIds(input.validSelectedIds));
  const preserveSelection = previous.selectedId != null
    && (validSelectedIds.size === 0 || validSelectedIds.has(previous.selectedId));

  const capabilityState = semanticId(input.capabilityState, 'available');
  if (!NAVIGATION_CAPABILITY_STATES.includes(capabilityState)) {
    throw new RangeError(`Unsupported navigation capability state: ${capabilityState}`);
  }

  const primaryDestinations = boundedIds(input.primaryDestinations, 30);
  const requestedPrimaryDestinations = boundedIds(input.requestedPrimaryDestinations, 30);
  const stablePrimaryDestinations = Object.freeze(
    [...primaryDestinations, ...requestedPrimaryDestinations.filter(id => !primaryDestinations.includes(id))].slice(0, 30)
  );

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    context: Object.freeze({
      scrollPositionKey: nextRequested.scrollPositionKey || previous.scrollPositionKey,
      selectedId: preserveSelection ? previous.selectedId : nextRequested.selectedId,
      expandedIds: nextRequested.expandedIds.length > 0 ? nextRequested.expandedIds : previous.expandedIds,
      activeFilters: nextRequested.activeFilters.length > 0 ? nextRequested.activeFilters : previous.activeFilters,
      query: nextRequested.query || previous.query,
      paneState: nextRequested.paneState || previous.paneState
    }),
    primaryNavigation: Object.freeze({
      destinations: stablePrimaryDestinations,
      continuousReorderingFromTransientRuntimeChangesAllowed: false,
      capabilityState,
      annotateCapabilityWithoutReordering: true,
      silentRemovalPreferred: false
    }),
    continuity: Object.freeze({
      scrollPreservationRequired: true,
      selectionPreservationRequiredWhenValid: true,
      expandedStatePreservationRequired: true,
      filtersPreservationRequired: true,
      queryPreservationRequired: true,
      paneStatePreservationRequired: true,
      responsiveTransformationMayDestroyTaskState: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      navigationExecutedByGlaze: false,
      taskStateOwnedByApplication: true,
      capabilityTruthOwnedByProvider: true
    })
  });
}

export function resolveGlazeResponsiveLayout(input = {}) {
  if (!plainObject(input)) throw new TypeError('Responsive layout input must be a plain object');

  const environment = normalizeEnvironment(input.environment);
  const viewingDistance = semanticId(input.viewingDistance, 'near');
  const inputMode = semanticId(input.inputMode, 'pointer');
  const posture = semanticId(input.posture, 'unknown');
  const density = semanticId(input.contentDensity, 'standard');
  const task = semanticId(input.task, 'general');
  const accessibilityProfiles = uniqueSemantic(input.accessibilityProfiles);
  const largeText = accessibilityProfiles.includes('large-text')
    || accessibilityProfiles.includes('extra-large-text');
  const touchAssistance = accessibilityProfiles.includes('touch-assistance');

  let composition = layoutComposition(environment, task, posture);
  if (largeText && composition === 'multi-pane') composition = 'dual-pane';
  if (largeText && environment === 'compact') composition = 'single-pane';

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    environment,
    composition,
    inputs: Object.freeze({
      availableWindowSpace: environment,
      viewingDistance,
      inputMode,
      posture,
      contentDensity: density,
      applicationTask: task,
      accessibilityProfiles
    }),
    rules: Object.freeze({
      widthAloneIsAuthority: false,
      rawViewportWidthRequired: false,
      deviceBrandBreakpointAuthority: false,
      semanticEnvironmentOwnedByPlatformOrApplication: true,
      taskValueRequiredForAdditionalPanes: true,
      accessibilityMayReducePaneCount: true,
      inputChangeAloneMayDramaticallyRearrange: false,
      targetSizeMayShrinkToPreservePaneCount: false,
      touchAssistance,
      largeText
    }),
    continuity: Object.freeze({
      selectedContentPreservedWhenValid: true,
      currentLocationPreserved: true,
      userEnteredDataPreserved: true,
      focusPreservedWherePractical: true,
      scrollContextPreservedWherePractical: true
    }),
    authority: Object.freeze({
      presentationOnly: true,
      environmentTruthOwnedByCallerOrPlatform: true,
      postureInferredFromGeometry: false,
      taskInferredFromPrivateContent: false
    })
  });
}

export function resolveGlazePaneTransition(input = {}) {
  if (!plainObject(input)) throw new TypeError('Pane transition input must be a plain object');

  const from = semanticId(input.from, 'single-pane');
  const to = semanticId(input.to, 'single-pane');
  if (!PANE_STATES.includes(from) || !PANE_STATES.includes(to)) {
    throw new RangeError(`Unsupported pane transition: ${from} -> ${to}`);
  }

  const selectedId = input.selectedId == null ? null : String(input.selectedId).trim() || null;
  const selectionStillValid = input.selectionStillValid !== false;
  const paneHistory = boundedIds(input.paneHistory, 20);

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    from,
    to,
    transitionKey: `${from}->${to}`,
    preserved: Object.freeze({
      selectedId: selectionStillValid ? selectedId : null,
      selectionPreserved: Boolean(selectedId && selectionStillValid),
      paneHistory,
      queryState: input.queryState == null ? '' : String(input.queryState),
      filters: boundedIds(input.filters, 50),
      scrollContextKey: input.scrollContextKey == null ? null : String(input.scrollContextKey)
    }),
    determinism: Object.freeze({
      sameInputsProduceSameTransition: true,
      selectedContentPreservedWhenPossible: true,
      overlayDismissalDoesNotEraseUnderlyingTask: true,
      applicationOwnsActualPaneNavigation: true
    }),
    authority: Object.freeze({
      transitionPresentationOnly: true,
      navigationExecutedByGlaze: false,
      selectionTruthOwnedByApplication: true
    })
  });
}

export function resolveGlazePosturePresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Posture presentation input must be a plain object');

  const posture = semanticId(input.posture, 'unknown');
  if (!POSTURES.includes(posture)) {
    throw new RangeError(`Unsupported posture: ${posture}`);
  }

  const unsafeRegionIds = boundedIds(input.unsafeRegionIds, 20);
  const unsafeRegionsProvided = unsafeRegionIds.length > 0;
  const externalDisplay = posture === 'external-display' || bool(input.externalDisplay);

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    posture,
    externalDisplay,
    unsafeRegions: Object.freeze({
      ids: unsafeRegionIds,
      providedByPlatform: unsafeRegionsProvided,
      hardCodedDeviceGeometryAllowed: false,
      criticalControlsMayCrossUnsafeRegions: false,
      textMayCrossUnsafeRegions: false,
      hingeMayActAsStructuralDivider: posture === 'tabletop' || posture === 'unfolded'
    }),
    adaptation: Object.freeze({
      foldedPrefersSinglePane: posture === 'folded',
      tabletopMayUseDualRegion: posture === 'tabletop',
      externalDisplayMayExpandTaskComposition: externalDisplay,
      resizedWindowUsesSemanticEnvironment: posture === 'resized-window',
      portraitLandscapeAreContextInputsNotDeviceIdentity: ['portrait','landscape'].includes(posture)
    }),
    authority: Object.freeze({
      presentationOnly: true,
      postureOwnedByPlatform: true,
      unsafeRegionGeometryOwnedByPlatform: true,
      deviceModelInferred: false
    })
  });
}

export function resolveGlazeLocalizationPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Localization presentation input must be a plain object');

  const direction = semanticId(input.direction, 'ltr');
  if (!TEXT_DIRECTIONS.includes(direction)) {
    throw new RangeError(`Unsupported text direction: ${direction}`);
  }

  const expansion = semanticId(input.textExpansion, 'normal');
  const highExpansion = ['high','very-high','extreme'].includes(expansion);
  const mixedDirection = direction === 'mixed';
  const directionalIcon = bool(input.directionalIcon);

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    direction,
    textExpansion: expansion,
    layout: Object.freeze({
      logicalPropertiesRequired: true,
      englishLengthAssumptionsAllowed: false,
      wrappingAndReflowPreferred: true,
      clippingAllowedByDefault: false,
      highExpansionRequiresReflow: highExpansion,
      mixedDirectionIsolationRequired: mixedDirection,
      semanticOrderPreserved: true,
      focusOrderPreserved: true
    }),
    iconography: Object.freeze({
      directionalIcon,
      directionalMirroringRequiredWhenMeaningReverses: directionalIcon && direction === 'rtl',
      nondirectionalIconsMustNotMirrorAutomatically: true
    }),
    formatting: Object.freeze({
      localeSpecificNumbersRequired: true,
      localeSpecificDatesRequired: true,
      applicationOrPlatformFormatterOwnsLocaleFormatting: true,
      GlazeDoesNotInventLocale: true
    }),
    authority: Object.freeze({
      presentationOnly: true,
      localeOwnedByApplicationOrPlatform: true,
      localeInferredFromPrivateContent: false
    })
  });
}

export function resolveGlazeIconPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Icon presentation input must be a plain object');

  const state = semanticId(input.state, 'inactive');
  if (!ICON_STATES.includes(state)) {
    throw new RangeError(`Unsupported icon state: ${state}`);
  }

  const semanticMeaning = input.semanticMeaning == null
    ? ''
    : String(input.semanticMeaning).trim();
  const meaningClearWithoutLabel = bool(input.meaningClearWithoutLabel);
  const interactive = bool(input.interactive);
  const directional = bool(input.directional);
  const direction = semanticId(input.direction, 'ltr');

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    state,
    semanticMeaning,
    presentation: Object.freeze({
      consistentOpticalWeightRequired: true,
      scalableConstructionRequired: true,
      sufficientContrastRequired: true,
      activeInactiveDistinct: true,
      labelRequired: !meaningClearWithoutLabel,
      accessibleNameRequired: interactive,
      directionalCorrectionRequired: directional,
      mirrorForRTLWhenMeaningReverses: directional && direction === 'rtl',
      filledStatePreservesPerceivedWeight: true
    }),
    identity: Object.freeze({
      temporaryStateSeparateFromUnderlyingIdentity: true,
      colorAloneCreatesMeaning: false,
      productIdentityMayBeReplacedByStatusGlyph: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      semanticMeaningOwnedByCaller: true,
      iconDoesNotCreateCapabilityTruth: true
    })
  });
}

export function resolveGlazeStatusIndicator(input = {}) {
  if (!plainObject(input)) throw new TypeError('Status indicator input must be a plain object');

  const state = semanticId(input.state);
  if (!STATUS_STATES.includes(state)) {
    throw new RangeError(`Unsupported status state: ${state}`);
  }

  const authoritative = bool(input.authoritative);
  const acceptedState = authoritative || state === 'unverified' ? state : 'unverified';
  const acceptedRole = acceptedState === 'unverified' ? 'status.unverified' : statusRole(acceptedState);

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    requestedState: state,
    acceptedState,
    semanticRole: acceptedRole,
    presentation: Object.freeze({
      nonColorIndicator: nonColorIndicatorForStatus(acceptedState),
      colorOnlyMeaningAllowed: false,
      protectedSemanticRole: protectedStatus(acceptedState),
      standardizedAcrossApplications: true,
      secondaryToPrimaryIdentity: true
    }),
    evidence: Object.freeze({
      authoritativeEvidenceProvided: authoritative,
      requestedStateWithheldWithoutAuthority: acceptedState !== state,
      unknownOrUnverifiedMayUpgradeToPositive: false
    }),
    authority: Object.freeze({
      stateTruthOwnedByCallerOrProvider: true,
      privacyTruthCreatedByGlaze: false,
      securityTruthCreatedByGlaze: false,
      connectivityTruthCreatedByGlaze: false
    })
  });
}

export function resolveGlazeBadgePresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Badge presentation input must be a plain object');

  const category = semanticId(input.category, 'status');
  if (!BADGE_CATEGORIES.includes(category)) {
    throw new RangeError(`Unsupported badge category: ${category}`);
  }

  const compact = bool(input.compact);
  const requestedCount = Number(input.count);
  const count = Number.isInteger(requestedCount) && requestedCount >= 0 ? requestedCount : null;
  const visibleBadgeCount = Number.isInteger(Number(input.visibleBadgeCount))
    ? Math.max(0, Number(input.visibleBadgeCount))
    : 1;
  const overCompactBudget = compact && visibleBadgeCount > 1;

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    category,
    count: category === 'count' ? count : null,
    presentation: Object.freeze({
      secondaryToPrimaryContent: true,
      maxVisibleCompact: 1,
      overflowTreatment: overCompactBudget ? 'compound-or-expanded-labeled-status' : 'none',
      excessiveStackingAllowed: false,
      nonColorMeaningRequired: category !== 'count',
      labelOrAccessibleNameRequired: true
    }),
    authority: Object.freeze({
      presentationOnly: true,
      countTruthOwnedByCaller: true,
      stateTruthOwnedByCallerOrProvider: true
    })
  });
}

export function resolveGlazeSourceProvenance(input = {}) {
  if (!plainObject(input)) throw new TypeError('Source provenance input must be a plain object');

  const source = semanticId(input.source, 'unknown');
  if (!SOURCE_KINDS.includes(source)) {
    throw new RangeError(`Unsupported source kind: ${source}`);
  }

  const authoritative = bool(input.authoritative);
  const providerLabel = input.providerLabel == null ? null : String(input.providerLabel).trim() || null;
  const exposeProviderLabel = bool(input.exposeProviderLabel) && authoritative && providerLabel !== null;

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    source,
    semanticRole: sourceRole(source),
    presentation: Object.freeze({
      truthfulSourceRequired: true,
      implementationDetailsMinimized: true,
      providerLabel: exposeProviderLabel ? providerLabel : null,
      ownershipImplied: false,
      authorizationImplied: false,
      trustImplied: false
    }),
    authority: Object.freeze({
      sourceTruthOwnedByCallerOrProvider: true,
      providerPrecedenceInferred: false,
      ownershipCreatedByGlaze: false,
      authorizationCreatedByGlaze: false
    })
  });
}

export function resolveGlazePrivacyPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Privacy presentation input must be a plain object');

  const state = semanticId(input.state, 'unknown');
  if (!PRIVACY_STATES.includes(state)) {
    throw new RangeError(`Unsupported privacy state: ${state}`);
  }

  const authoritative = bool(input.authoritative);
  const positive = ['private','protected'].includes(state);
  const acceptedState = positive && !authoritative ? 'unknown' : state;

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    requestedState: state,
    acceptedState,
    semanticRole: `privacy.${acceptedState}`,
    presentation: Object.freeze({
      nonColorIndicatorRequired: true,
      privacySemanticProtected: true,
      permissionRequiredDistinct: acceptedState === 'permission-required',
      consentRequiredDistinct: acceptedState === 'consent-required',
      retentionLimitedDistinct: acceptedState === 'retention-limited'
    }),
    authority: Object.freeze({
      privacyTruthOwnedByPrivacyShieldOrCaller: true,
      privacyStateCreatedByGlaze: false,
      permissionGrantedByGlaze: false,
      consentGrantedByGlaze: false,
      positiveStateRequiresAuthority: true
    })
  });
}

export function resolveGlazeSecurityPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Security presentation input must be a plain object');

  const state = semanticId(input.state, 'unknown');
  if (!SECURITY_STATES.includes(state)) {
    throw new RangeError(`Unsupported security state: ${state}`);
  }

  const authoritative = bool(input.authoritative);
  const positive = state === 'protected';
  const acceptedState = positive && !authoritative ? 'unverified' : state;

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    requestedState: state,
    acceptedState,
    semanticRole: `security.${acceptedState}`,
    presentation: Object.freeze({
      distinguishFromOrdinaryWarning: true,
      nonColorIndicatorRequired: true,
      securitySemanticProtected: true,
      criticalTreatment: acceptedState === 'critical',
      warningTreatment: acceptedState === 'warning'
    }),
    authority: Object.freeze({
      securityTruthOwnedByWardveilOrAuthoritativeProvider: true,
      securityStateInferredByGlaze: false,
      positiveStateRequiresAuthority: true,
      authorizationGrantedByGlaze: false
    })
  });
}

export function resolveGlazeCapabilityControl(input = {}) {
  if (!plainObject(input)) throw new TypeError('Capability control input must be a plain object');

  const state = semanticId(input.state, 'unknown');
  if (!CAPABILITY_STATES.includes(state)) {
    throw new RangeError(`Unsupported capability control state: ${state}`);
  }

  const base = resolveGlazeCapabilityPresentation({state});
  const essential = input.essential !== false;
  const explanationAvailable = input.explanationAvailable !== false;

  return Object.freeze({
    version: '1.6.0-dev.6',
    lifecycle: 'development',
    state,
    basePresentation: base,
    control: Object.freeze({
      visible: essential || state === 'available' || bool(input.keepVisible),
      enabled: state === 'available',
      explainUnavailableWhereUseful: state !== 'available' && explanationAvailable,
      silentRemovalPreferred: false,
      permissionRequestAutomatic: false,
      retryAutomatic: false,
      unsupportedMayBeHiddenOnlyWhenNonessentialAndCallerChooses: !essential && state === 'unsupported'
    }),
    authority: Object.freeze({
      capabilityTruthOwnedByCallerOrProvider: true,
      permissionGrantedByGlaze: false,
      restrictionInferredByGlaze: false,
      supportInferredFromViewport: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export const glazeV16NavigationStatusDevelopmentContract = Object.freeze({
  version: '1.6.0-dev.6',
  lifecycle: 'development',
  stableBaseline: '1.5.1',
  consumerEligible: false,
  searchPhases: SEARCH_PHASES,
  navigationCapabilityStates: NAVIGATION_CAPABILITY_STATES,
  responsiveEnvironments: RESPONSIVE_ENVIRONMENTS,
  paneStates: PANE_STATES,
  postures: POSTURES,
  textDirections: TEXT_DIRECTIONS,
  iconStates: ICON_STATES,
  statusStates: STATUS_STATES,
  badgeCategories: BADGE_CATEGORIES,
  sourceKinds: SOURCE_KINDS,
  privacyStates: PRIVACY_STATES,
  securityStates: SECURITY_STATES,
  capabilityStates: CAPABILITY_STATES,
  widthAloneIsResponsiveAuthority: false,
  primaryNavigationMayContinuouslyReorderFromTransientState: false,
  searchProvidersMayArbitrarilyReorderExistingResults: false,
  hardCodedHingeGeometryAllowed: false,
  englishLengthAssumptionsAllowed: false,
  colorOnlyStatusMeaningAllowed: false,
  privacyTruthCreatedByGlaze: false,
  securityTruthCreatedByGlaze: false,
  capabilityTruthCreatedByGlaze: false,
  authorityBoundary: 'presentation-only'
});
