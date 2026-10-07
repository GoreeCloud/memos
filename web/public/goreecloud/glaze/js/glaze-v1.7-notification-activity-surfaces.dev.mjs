/* GLAZE UI V1.7 — Notification and Activity Surfaces Development foundation.
 *
 * Development-only presentation resolver. GLAZE UI V1.6 / 1.6.0 remains
 * the current Official Stable consumer target.
 */

import {resolveGlazeTaskContinuity} from './glaze-v1.7-task-continuity.dev.mjs';
import {
  resolveGlazeFormFactorProfile,
  glazeV17FormFactorProfilesDevelopmentContract
} from './glaze-v1.7-form-factor-profiles.dev.mjs';

const COMPONENTS = Object.freeze([
  'GlzNotificationSurface',
  'GlzActivityItem',
  'GlzActivityGroup',
  'GlzStatusFeed',
  'GlzBackgroundTask',
  'GlzProgressSurface'
]);

const ACTIVITY_KINDS = Object.freeze([
  'informational-activity',
  'background-work',
  'required-attention',
  'warning',
  'critical',
  'user-requested-progress',
  'recoverable-failure',
  'security-state',
  'privacy-state'
]);

const RUNTIME_ACTIVITY_KINDS = Object.freeze([...ACTIVITY_KINDS, 'unknown']);
const PROGRESS_MODES = Object.freeze(['none', 'determinate', 'indeterminate', 'unknown']);
const AVAILABILITY_STATES = Object.freeze(['available', 'unavailable', 'unknown']);

const PROFILE_PRESENTATION = Object.freeze({
  mobile: 'stacked-notification-activity',
  tablet: 'adaptive-pane-notification-activity',
  desktop: 'workspace-notification-activity',
  foldable: 'posture-aware-notification-activity',
  tv: 'far-view-notification-activity',
  wearable: 'shallow-notification-activity'
});

function plainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function semanticId(value, fallback = null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized || fallback;
}

function exactMember(value, allowed, label) {
  const normalized = String(value ?? '').trim();
  if (!allowed.includes(normalized)) throw new RangeError(`Unsupported ${label}: ${normalized}`);
  return normalized;
}

function semanticMember(value, allowed, label, fallback = null) {
  const normalized = semanticId(value, fallback);
  if (!allowed.includes(normalized)) throw new RangeError(`Unsupported ${label}: ${normalized}`);
  return normalized;
}

function boundedText(value, max = 240) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized.slice(0, max) : null;
}

export function resolveGlazeNotificationActivityTruth(input = {}) {
  if (!plainObject(input)) throw new TypeError('Notification/activity truth input must be a plain object');

  const requestedKind = semanticMember(
    input.kind,
    RUNTIME_ACTIVITY_KINDS,
    'notification/activity kind',
    'unknown'
  );
  const authoritative = input.authoritative === true;
  const acceptedKind = authoritative || requestedKind === 'unknown' ? requestedKind : 'unknown';

  return Object.freeze({
    requestedKind,
    acceptedKind,
    authoritative,
    sourceId: boundedText(input.sourceId, 160),
    truthWithheldWithoutAuthority: !authoritative && requestedKind !== 'unknown',
    securityStatePresented: acceptedKind === 'security-state',
    privacyStatePresented: acceptedKind === 'privacy-state',
    criticalStatePresented: acceptedKind === 'critical',
    authority: Object.freeze({
      truthOwnedByProvider: true,
      truthCreatedByGlaze: false,
      securityAuthorityCreatedByGlaze: false,
      privacyAuthorityCreatedByGlaze: false
    })
  });
}

export function resolveGlazeActivityProgress(input = {}) {
  if (!plainObject(input)) throw new TypeError('Progress input must be a plain object');

  const requestedMode = semanticMember(
    input.mode,
    PROGRESS_MODES,
    'notification/activity progress mode',
    'unknown'
  );
  const authoritative = input.authoritative === true;
  let acceptedMode = requestedMode;
  let fraction = null;

  if (!authoritative && !['none', 'unknown'].includes(requestedMode)) acceptedMode = 'unknown';

  if (acceptedMode === 'determinate') {
    const candidate = Number(input.fraction);
    if (!Number.isFinite(candidate) || candidate < 0 || candidate > 1) {
      throw new RangeError('Determinate progress fraction must be between 0 and 1');
    }
    fraction = candidate;
  }

  return Object.freeze({
    requestedMode,
    acceptedMode,
    fraction,
    authoritative,
    progressWithheldWithoutAuthority:
      !authoritative && !['none', 'unknown'].includes(requestedMode),
    authority: Object.freeze({
      progressTruthOwnedByProvider: true,
      progressTruthCreatedByGlaze: false
    })
  });
}

export function resolveGlazeActivityActions(actions = []) {
  if (!Array.isArray(actions)) throw new TypeError('Notification/activity actions must be an array');

  return Object.freeze(actions.slice(0, 20).map((action, index) => {
    if (!plainObject(action)) throw new TypeError('Notification/activity action must be a plain object');
    const id = boundedText(action.id, 120) ?? `action-${index + 1}`;
    const label = boundedText(action.label, 160) ?? id;
    const requestedState = semanticMember(
      action.state,
      AVAILABILITY_STATES,
      'notification/activity action availability',
      'unknown'
    );
    const authoritative = action.availabilityAuthoritative === true;
    const acceptedState = authoritative || requestedState === 'unknown'
      ? requestedState
      : 'unknown';

    return Object.freeze({
      id,
      label,
      requestedState,
      acceptedState,
      availabilityAuthoritative: authoritative,
      presentAsAvailable: acceptedState === 'available',
      executionPerformedByGlaze: false
    });
  }));
}

export function resolveGlazeNotificationActivitySurface(input = {}) {
  if (!plainObject(input)) throw new TypeError('Notification/activity surface input must be a plain object');

  const component = exactMember(input.component, COMPONENTS, 'notification/activity component');
  const profile = semanticMember(
    input.profile,
    glazeV17FormFactorProfilesDevelopmentContract.profiles,
    'form-factor profile'
  );

  const truth = resolveGlazeNotificationActivityTruth({
    kind: input.kind,
    authoritative: input.truthAuthoritative,
    sourceId: input.sourceId
  });
  const progress = resolveGlazeActivityProgress({
    mode: input.progressMode,
    fraction: input.progressFraction,
    authoritative: input.progressAuthoritative
  });
  const actions = resolveGlazeActivityActions(input.actions ?? []);

  const profileResolution = resolveGlazeFormFactorProfile({
    profile,
    posture: input.posture,
    accessibilityProfiles: input.accessibilityProfiles,
    availableInputs: input.availableInputs,
    inputCapabilityAuthoritative: input.inputCapabilityAuthoritative,
    unsafeRegionIds: input.unsafeRegionIds,
    semanticSurfaceId: boundedText(input.surfaceId, 120) ?? 'glaze-notification-activity',
    surfaceRole: 'status',
    constrained: input.constrained
  });

  const continuity = resolveGlazeTaskContinuity({
    environmentChange: 'multi-pane-recomposition',
    previous: input.previousTaskState,
    incoming: input.incomingTaskState,
    stateClasses: input.stateClasses,
    clearFields: input.clearFields,
    clearAuthoritative: input.clearAuthoritative,
    temporaryDisposableFields: input.temporaryDisposableFields,
    lossDirectedFields: input.lossDirectedFields,
    providerAuthoritativeFields: input.providerAuthoritativeFields,
    recoveryStateFields: input.recoveryStateFields
  });

  const attention = ['required-attention', 'warning', 'critical', 'recoverable-failure', 'security-state', 'privacy-state']
    .includes(truth.acceptedKind);
  const assertive = ['critical', 'security-state', 'privacy-state'].includes(truth.acceptedKind);

  return Object.freeze({
    version: '1.7.0-dev.7',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    component,
    profile,
    presentation: Object.freeze({
      form: PROFILE_PRESENTATION[profile],
      profileExpectations: profileResolution.expectations,
      attentionRequired: attention,
      liveRegion: assertive ? 'assertive' : 'polite',
      semanticIdentityPreservedAcrossProfiles: true
    }),
    truth,
    progress,
    actions,
    taskState: continuity.state,
    stateClasses: continuity.stateClasses,
    decisions: continuity.decisions,
    continuity: Object.freeze({
      ...continuity.continuity,
      activeTaskPreserved: true,
      navigationPreserved: true,
      focusPreserved: true,
      draftsPreserved: true,
      providerOwnedTruthPreserved: true,
      presentationAdaptationMayResetTask: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      notificationTruthOwnedByProvider: true,
      activityTruthOwnedByProvider: true,
      progressTruthOwnedByProvider: true,
      actionAvailabilityOwnedByProvider: true,
      notificationTruthCreatedByGlaze: false,
      activityTruthCreatedByGlaze: false,
      progressTruthCreatedByGlaze: false,
      securityAuthorityCreatedByGlaze: false,
      privacyAuthorityCreatedByGlaze: false,
      systemNotificationPermissionGrantedByGlaze: false,
      backgroundTaskExecutionPerformedByGlaze: false,
      actionExecutionPerformedByGlaze: false,
      persistencePerformedByGlaze: false,
      crossDeviceSyncEstablished: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export const glazeV17NotificationActivitySurfacesDevelopmentContract = Object.freeze({
  version: '1.7.0-dev.7',
  lifecycle: 'development',
  stableBaseline: '1.6.0',
  consumerEligible: false,
  implementedSpecificationSections: Object.freeze([8]),
  components: COMPONENTS,
  activityKinds: ACTIVITY_KINDS,
  fallbackActivityKind: 'unknown',
  progressModes: PROGRESS_MODES,
  availabilityStates: AVAILABILITY_STATES,
  presentationByProfile: PROFILE_PRESENTATION,
  taskContinuityRequired: true,
  formFactorProfileIntegrationRequired: true,
  truthAuthorityRequired: true,
  progressAuthorityRequired: true,
  actionAvailabilityAuthorityRequired: true,
  presentationOnly: true,
  notificationTruthCreatedByGlaze: false,
  activityTruthCreatedByGlaze: false,
  securityAuthorityCreatedByGlaze: false,
  privacyAuthorityCreatedByGlaze: false,
  systemNotificationPermissionGrantedByGlaze: false,
  backgroundTaskExecutionPerformedByGlaze: false,
  actionExecutionPerformedByGlaze: false,
  persistencePerformedByGlaze: false,
  crossDeviceSyncEstablished: false,
  consequentialExecutionAutomatic: false
});
