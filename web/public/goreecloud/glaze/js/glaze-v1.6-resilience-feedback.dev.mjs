/* GLAZE UI V1.6 — Development resilience, recovery, progress,
 * notification, dialog, and destructive-action presentation foundation.
 *
 * Development-only and non-consumer-eligible. State/recovery truth remains
 * caller/provider owned; Glaze UI presents it but does not manufacture it.
 */

const EMPTY_STATE_KINDS = Object.freeze([
  'no-content-yet',
  'no-search-results',
  'filter-removed-all-results',
  'no-permission',
  'offline',
  'service-unavailable',
  'feature-unsupported',
  'content-deleted',
  'content-unavailable',
  'setup-incomplete'
]);

const RECOVERY_ACTIONS = Object.freeze([
  'retry',
  'reconnect',
  'continue-offline',
  'use-local-content',
  'restore-previous-state',
  'change-settings',
  'resolve-conflict',
  'return-to-safe-state'
]);

const CONNECTIVITY_STATES = Object.freeze([
  'fully-online',
  'fully-offline',
  'local-only',
  'partially-connected',
  'sync-pending',
  'sync-failed',
  'service-degraded'
]);

const PROGRESS_KINDS = Object.freeze([
  'indeterminate',
  'determinate',
  'step',
  'background-activity',
  'sync',
  'transfer',
  'processing'
]);

const NOTIFICATION_PRIORITIES = Object.freeze([
  'passive',
  'informational',
  'actionable',
  'important',
  'critical'
]);

const MESSAGE_SURFACES = Object.freeze([
  'toast',
  'banner',
  'inline',
  'dialog'
]);

const DESTRUCTIVE_RISK = Object.freeze([
  'none',
  'destructive',
  'irreversible',
  'security-sensitive'
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

function unique(values) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze([...new Set(values.map(value => semanticId(value)).filter(Boolean))]);
}

function validRecoveryActions(value) {
  return unique(value).filter(action => RECOVERY_ACTIONS.includes(action));
}

function safeOptimism(operation) {
  return bool(operation.optimisticEligible)
    && bool(operation.reversible)
    && !bool(operation.destructive)
    && !bool(operation.irreversible)
    && !bool(operation.securitySensitive)
    && !bool(operation.privacySensitive);
}

export function resolveGlazeEmptyState(input = {}) {
  if (!plainObject(input)) throw new TypeError('Empty-state input must be a plain object');

  const kind = semanticId(input.kind);
  if (!EMPTY_STATE_KINDS.includes(kind)) {
    throw new RangeError(`Unsupported empty-state kind: ${kind}`);
  }

  const actions = validRecoveryActions(input.availableActions);
  const stateRole = {
    'no-content-yet': 'empty.neutral',
    'no-search-results': 'empty.search',
    'filter-removed-all-results': 'empty.filtered',
    'no-permission': 'empty.permission-required',
    offline: 'empty.offline',
    'service-unavailable': 'empty.service-unavailable',
    'feature-unsupported': 'empty.unsupported',
    'content-deleted': 'empty.deleted',
    'content-unavailable': 'empty.unavailable',
    'setup-incomplete': 'empty.setup-incomplete'
  }[kind];

  return Object.freeze({
    version: '1.6.0-dev.5',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    kind,
    semanticRole: stateRole,
    genericEmptyScreenAllowed: false,
    presentation: Object.freeze({
      headingRequired: true,
      conciseExplanationRequired: true,
      reasonSpecific: true,
      nonColorIndicatorRequired: ['no-permission','offline','service-unavailable','feature-unsupported'].includes(kind)
    }),
    recovery: Object.freeze({
      availableActions: Object.freeze(actions),
      inventedActionCount: 0,
      actionCapabilityOwnedByCaller: true
    }),
    authority: Object.freeze({
      presentationOnly: true,
      permissionStateInferred: false,
      connectivityStateInferred: false,
      deletionStateInferred: false,
      unsupportedStateInferred: false
    })
  });
}

export function resolveGlazeErrorPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Error presentation input must be a plain object');

  const dataSafety = semanticId(input.dataSafety, 'unknown');
  if (!['safe','at-risk','unknown'].includes(dataSafety)) {
    throw new RangeError(`Unsupported data-safety state: ${dataSafety}`);
  }

  const availableActions = validRecoveryActions(input.availableActions);
  const retryAvailable = availableActions.includes('retry');
  const alternateAvailable = availableActions.some(action => action !== 'retry');
  const remainsAvailable = Array.isArray(input.availableCapabilities)
    ? Object.freeze(unique(input.availableCapabilities).slice(0, 32))
    : Object.freeze([]);

  return Object.freeze({
    version: '1.6.0-dev.5',
    lifecycle: 'development',
    structure: Object.freeze({
      whatHappenedRequired: true,
      whatRemainsAvailableRequired: true,
      dataSafetyRequired: true,
      retryAppropriatenessRequired: true,
      alternateActionRequiredWhenAvailable: alternateAvailable
    }),
    state: Object.freeze({
      dataSafety,
      availableCapabilities: remainsAvailable,
      retryAvailable,
      alternateAvailable
    }),
    recovery: Object.freeze({
      availableActions,
      inventedActionCount: 0
    }),
    disclosure: Object.freeze({
      sensitiveInternalDetailsIncluded: false,
      stackTraceIncluded: false,
      rawProviderErrorIncluded: false,
      credentialOrSecretIncluded: false
    }),
    authority: Object.freeze({
      dataSafetyTruthOwnedByCaller: true,
      recoveryCapabilityOwnedByCaller: true,
      retryInventedByGlaze: false,
      presentationOnly: true
    })
  });
}

export function resolveGlazeRecoveryPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Recovery presentation input must be a plain object');

  const availableActions = validRecoveryActions(input.availableActions);
  const preferredOrder = [
    'retry',
    'reconnect',
    'continue-offline',
    'use-local-content',
    'restore-previous-state',
    'resolve-conflict',
    'change-settings',
    'return-to-safe-state'
  ];
  const ordered = preferredOrder.filter(action => availableActions.includes(action));

  return Object.freeze({
    version: '1.6.0-dev.5',
    lifecycle: 'development',
    availableActions: Object.freeze(ordered),
    primarySuggestedAction: ordered[0] || null,
    explanationRequired: ordered.length > 0,
    authority: Object.freeze({
      recoveryCapabilityOwnedByCaller: true,
      inventedRecoveryActions: false,
      automaticRecoveryExecutionAllowed: false,
      settingsChangedAutomatically: false,
      conflictResolvedAutomatically: false
    })
  });
}

export function resolveGlazeConnectivityPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Connectivity presentation input must be a plain object');

  const state = semanticId(input.state);
  if (!CONNECTIVITY_STATES.includes(state)) {
    throw new RangeError(`Unsupported connectivity state: ${state}`);
  }

  const localCapabilities = unique(input.localCapabilities);
  const remoteCapabilities = unique(input.remoteCapabilities);
  const localUsable = localCapabilities.length > 0;
  const offlineLike = ['fully-offline','local-only','sync-failed'].includes(state);
  const degraded = ['partially-connected','service-degraded'].includes(state);

  return Object.freeze({
    version: '1.6.0-dev.5',
    lifecycle: 'development',
    state,
    presentation: Object.freeze({
      offlineLike,
      degraded,
      localCapabilitiesRemainAccessible: localUsable,
      localCapabilityIds: localCapabilities,
      remoteCapabilityIds: remoteCapabilities,
      semanticRole: `connectivity.${state}`
    }),
    continuity: Object.freeze({
      localWorkHiddenBecauseRemoteUnavailable: false,
      usableLocalContentMayRemainVisible: true,
      pendingSyncMayRemainExplicit: ['sync-pending','sync-failed','partially-connected'].includes(state)
    }),
    authority: Object.freeze({
      stateOwnedByCallerOrProvider: true,
      timeoutAloneMayInferState: false,
      networkProbePerformedByGlaze: false,
      presentationOnly: true
    })
  });
}

export function resolveGlazeStaleDataPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Stale-data input must be a plain object');

  const usable = bool(input.usable);
  const pendingRefresh = bool(input.pendingRefresh);
  const locallyCached = bool(input.locallyCached);
  const unsynchronizedEdits = bool(input.unsynchronizedEdits);
  const lastUpdatedKnown = input.lastUpdatedKnown === true;

  return Object.freeze({
    version: '1.6.0-dev.5',
    lifecycle: 'development',
    stale: true,
    usable,
    presentation: Object.freeze({
      keepContentVisible: usable,
      replaceWithBlankLoadingScreen: false,
      showStaleIndicator: true,
      showPendingRefresh: pendingRefresh,
      showLocallyCachedState: locallyCached,
      showUnsynchronizedEdits: unsynchronizedEdits,
      showLastUpdatedState: lastUpdatedKnown
    }),
    privacy: Object.freeze({
      exactTimestampRequiredInDiagnostic: false,
      rawContentIncludedInDiagnostic: false
    })
  });
}

export function resolveGlazeBackgroundRefresh(input = {}) {
  if (!plainObject(input)) throw new TypeError('Background-refresh input must be a plain object');

  const contentAvailable = bool(input.contentAvailable);
  const userBlocking = bool(input.userBlocking);

  return Object.freeze({
    version: '1.6.0-dev.5',
    lifecycle: 'development',
    contentAvailable,
    presentation: Object.freeze({
      preserveExistingInterface: contentAvailable,
      subtleRefreshIndicatorPreferred: contentAvailable && !userBlocking,
      skeletonReplacementPreferred: false,
      blockingProgressAllowed: userBlocking
    }),
    continuity: Object.freeze({
      focusPreservationRequired: true,
      scrollPreservationRequired: true,
      selectionPreservationRequired: true
    })
  });
}

export function resolveGlazeOptimisticInteraction(input = {}) {
  if (!plainObject(input)) throw new TypeError('Optimistic interaction input must be a plain object');

  const operation = plainObject(input.operation) ? input.operation : {};
  const allowed = safeOptimism(operation);
  const failed = bool(input.failed);
  const availableActions = validRecoveryActions(input.availableActions);
  const canRevert = allowed && bool(operation.reversible) && bool(input.reversionAvailable);

  return Object.freeze({
    version: '1.6.0-dev.5',
    lifecycle: 'development',
    requested: bool(operation.optimisticEligible),
    allowed,
    presentation: Object.freeze({
      reflectIntendedStateImmediately: allowed && !failed,
      representAsAuthoritativelyCompleteBeforeConfirmation: false,
      failureFeedbackRequired: failed,
      revertAvailable: failed && canRevert,
      retryAvailable: failed && availableActions.includes('retry'),
      explanationRequiredOnFailure: failed
    }),
    prohibitions: Object.freeze({
      destructive: bool(operation.destructive),
      irreversible: bool(operation.irreversible) || operation.reversible === false,
      securitySensitive: bool(operation.securitySensitive),
      privacySensitive: bool(operation.privacySensitive)
    }),
    authority: Object.freeze({
      operationSuccessInferred: false,
      consequentialExecutionAutomatic: false,
      reversionExecutedAutomatically: false,
      retryExecutedAutomatically: false
    })
  });
}

export function resolveGlazeProgressPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Progress input must be a plain object');

  const kind = semanticId(input.kind, 'indeterminate');
  if (!PROGRESS_KINDS.includes(kind)) {
    throw new RangeError(`Unsupported progress kind: ${kind}`);
  }

  let value = null;
  let currentStep = null;
  let totalSteps = null;
  let truthfulDeterminate = false;

  if (kind === 'determinate') {
    const candidate = Number(input.value);
    if (Number.isFinite(candidate) && candidate >= 0 && candidate <= 1) {
      value = candidate;
      truthfulDeterminate = true;
    }
  }

  if (kind === 'step') {
    const current = Number(input.currentStep);
    const total = Number(input.totalSteps);
    if (Number.isInteger(current) && Number.isInteger(total) && total > 0 && current >= 0 && current <= total) {
      currentStep = current;
      totalSteps = total;
    }
  }

  const acceptedKind = kind === 'determinate' && !truthfulDeterminate
    ? 'indeterminate'
    : kind === 'step' && totalSteps == null
      ? 'indeterminate'
      : kind;

  return Object.freeze({
    version: '1.6.0-dev.5',
    lifecycle: 'development',
    requestedKind: kind,
    acceptedKind,
    value,
    currentStep,
    totalSteps,
    semantics: Object.freeze({
      fakePercentageGenerated: false,
      fakeStepCountGenerated: false,
      actualInformationOnly: true,
      accessibleProgressStateRequired: true
    })
  });
}

function priorityRank(priority) {
  return NOTIFICATION_PRIORITIES.indexOf(priority);
}

export function resolveGlazeNotificationPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Notification input must be a plain object');

  const requested = semanticId(input.priority, 'informational');
  if (!NOTIFICATION_PRIORITIES.includes(requested)) {
    throw new RangeError(`Unsupported notification priority: ${requested}`);
  }

  const authoritativeCritical = bool(input.authoritativeCritical);
  let accepted = requested;
  if (requested === 'critical' && !authoritativeCritical) accepted = 'important';

  const persistentImpact = bool(input.persistentImpact);
  const actionRequired = bool(input.actionRequired);

  return Object.freeze({
    version: '1.6.0-dev.5',
    lifecycle: 'development',
    requestedPriority: requested,
    acceptedPriority: accepted,
    presentation: Object.freeze({
      interruptionLevel: accepted === 'critical'
        ? 'critical-alert'
        : accepted === 'important'
          ? 'prominent'
          : accepted === 'actionable'
            ? 'actionable'
            : accepted === 'informational'
              ? 'informational'
              : 'passive',
      persistentImpact,
      actionRequired,
      criticalTreatmentReservedForAuthoritativeCritical: true,
      colorOnlyPriorityMeaningAllowed: false
    }),
    authority: Object.freeze({
      criticalityOwnedByCallerOrProvider: true,
      criticalityUpgradedByGlaze: false,
      operatingSystemNotificationSentByResolver: false
    })
  });
}

export function resolveGlazeMessageSurface(input = {}) {
  if (!plainObject(input)) throw new TypeError('Message-surface input must be a plain object');

  const briefConfirmation = bool(input.briefConfirmation);
  const persistentPageImpact = bool(input.persistentPageImpact);
  const interruptionNecessary = bool(input.interruptionNecessary);
  const inlineClearer = bool(input.inlineClearer);

  let surface = 'inline';
  if (briefConfirmation && !persistentPageImpact && !interruptionNecessary) surface = 'toast';
  else if (persistentPageImpact && !interruptionNecessary) surface = 'banner';
  else if (interruptionNecessary && !inlineClearer) surface = 'dialog';

  return Object.freeze({
    version: '1.6.0-dev.5',
    lifecycle: 'development',
    surface,
    supportedSurfaces: MESSAGE_SURFACES,
    governance: Object.freeze({
      toastForBriefConfirmation: surface === 'toast',
      bannerForPersistentPageImpact: surface === 'banner',
      dialogOnlyWhenInterruptionNecessary: true,
      inlinePreferredWhenClearer: inlineClearer
    })
  });
}

export function resolveGlazeDialogPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Dialog input must be a plain object');

  const modal = input.modal !== false;
  const destructive = bool(input.destructive);
  const inlineWouldBeClearer = bool(input.inlineWouldBeClearer);
  const titlePresent = String(input.title ?? '').trim().length > 0;
  const purposePresent = String(input.purpose ?? '').trim().length > 0;
  const restoreTargetValid = bool(input.restoreTargetValid);

  return Object.freeze({
    version: '1.6.0-dev.5',
    lifecycle: 'development',
    useDialog: !inlineWouldBeClearer,
    semantics: Object.freeze({
      clearTitleRequired: true,
      titlePresent,
      concisePurposeRequired: true,
      purposePresent,
      predictableActionPlacementRequired: true,
      destructiveActionExplicit: destructive,
      keyboardNavigationRequired: true
    }),
    focus: Object.freeze({
      trapRequired: modal,
      restorationRequired: true,
      restoreTargetValidatedByCaller: restoreTargetValid,
      automaticFocusExecutionByResolver: false,
      focusStealingOutsideDialogAllowed: false
    }),
    dismissal: Object.freeze({
      safeDismissalRequired: true,
      destructiveDismissalMayImplyConfirmation: false
    }),
    authority: Object.freeze({
      actionExecutedByResolver: false,
      navigationExecutedByResolver: false
    })
  });
}

export function resolveGlazeDestructiveAction(input = {}) {
  if (!plainObject(input)) throw new TypeError('Destructive-action input must be a plain object');

  const risk = semanticId(input.risk, 'destructive');
  if (!DESTRUCTIVE_RISK.includes(risk)) {
    throw new RangeError(`Unsupported destructive-action risk: ${risk}`);
  }

  const destructive = risk !== 'none';
  const highRisk = ['irreversible','security-sensitive'].includes(risk);

  return Object.freeze({
    version: '1.6.0-dev.5',
    lifecycle: 'development',
    risk,
    destructive,
    presentation: Object.freeze({
      explicitLanguageRequired: destructive,
      semanticColorRequired: destructive,
      iconographyRequired: destructive,
      placementSeparationRequired: destructive,
      confirmationRequired: highRisk || bool(input.confirmationRequired),
      colorOnlyIntentAllowed: false,
      safeDefaultActionRequired: destructive
    }),
    authority: Object.freeze({
      destructiveIntentOwnedByCaller: true,
      actionExecutedAutomatically: false,
      confirmationGrantedByGlaze: false,
      securityStateInferred: false
    })
  });
}

export const glazeV16ResilienceFeedbackDevelopmentContract = Object.freeze({
  version: '1.6.0-dev.5',
  lifecycle: 'development',
  stableBaseline: '1.5.1',
  consumerEligible: false,
  emptyStateKinds: EMPTY_STATE_KINDS,
  recoveryActions: RECOVERY_ACTIONS,
  connectivityStates: CONNECTIVITY_STATES,
  progressKinds: PROGRESS_KINDS,
  notificationPriorities: NOTIFICATION_PRIORITIES,
  messageSurfaces: MESSAGE_SURFACES,
  destructiveRisk: DESTRUCTIVE_RISK,
  genericEmptyScreenAllowed: false,
  recoveryCapabilityMayBeInvented: false,
  timeoutAloneMayInferConnectivity: false,
  staleUsableContentMayRemainVisible: true,
  backgroundRefreshPreservesContent: true,
  fakeProgressAllowed: false,
  criticalNotificationMayBeInvented: false,
  dialogPreferredOverClearInlineSurface: false,
  destructiveIntentMayRelyOnColorAlone: false,
  authorityBoundary: 'presentation-only'
});
