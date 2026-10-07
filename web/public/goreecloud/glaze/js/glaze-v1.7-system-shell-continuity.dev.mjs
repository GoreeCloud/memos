/* GLAZE UI V1.7 — System Shell Continuity Development foundation.
 *
 * Development-only presentation resolver. GLAZE UI V1.6 / 1.6.0 remains
 * the current Official Stable consumer target.
 */

import {resolveGlazeTaskContinuity} from './glaze-v1.7-task-continuity.dev.mjs';
import {
  resolveGlazeFormFactorProfile,
  glazeV17FormFactorProfilesDevelopmentContract
} from './glaze-v1.7-form-factor-profiles.dev.mjs';
import {glazeV17AdaptiveInputDevelopmentContract} from './glaze-v1.7-adaptive-input.dev.mjs';
import {glazeV17CommandSurfaceDevelopmentContract} from './glaze-v1.7-command-surface.dev.mjs';
import {glazeV17PersonalizationDevelopmentContract} from './glaze-v1.7-personalization.dev.mjs';

const SHELL_AREAS = Object.freeze([
  'notification-activity-presentation',
  'control-center',
  'persistent-control-center-layout',
  'multi-window',
  'split-view',
  'compact-expanded-navigation',
  'window-restoration',
  'application-system-handoff',
  'task-switching',
  'shell-overlays',
  'search-continuity',
  'contextual-command-surfaces'
]);

const TRANSITION_KINDS = Object.freeze([
  'notification-activity-presentation',
  'control-center-layout',
  'multi-window-change',
  'split-view-change',
  'compact-expanded-navigation',
  'window-restoration',
  'application-system-handoff',
  'task-switching',
  'shell-overlay',
  'search-continuity',
  'contextual-command-surface'
]);

const CAPABILITY_STATES = Object.freeze(['available','unavailable','unknown']);

const CAPABILITY_BY_AREA = Object.freeze({
  'notification-activity-presentation': 'notification-activity-presentation',
  'control-center': 'control-center',
  'persistent-control-center-layout': 'persistent-control-center-layout',
  'multi-window': 'multi-window',
  'split-view': 'split-view',
  'compact-expanded-navigation': 'navigation-recomposition',
  'window-restoration': 'window-restoration',
  'application-system-handoff': 'application-system-handoff',
  'task-switching': 'task-switching',
  'shell-overlays': 'shell-overlays',
  'search-continuity': 'system-search',
  'contextual-command-surfaces': 'contextual-command-surfaces'
});

const KNOWN_CAPABILITIES = Object.freeze([...new Set(Object.values(CAPABILITY_BY_AREA))]);

const PROFILE_PRESENTATION = Object.freeze({
  mobile: 'compact-shell',
  tablet: 'adaptive-pane-shell',
  desktop: 'multi-window-capable-shell',
  foldable: 'posture-aware-shell',
  tv: 'far-view-shell',
  wearable: 'shallow-shell'
});

const SHELL_CONTEXT_FIELDS = Object.freeze([
  'windowState',
  'controlCenterLayout',
  'activeOverlay',
  'searchScope',
  'commandContext',
  'notificationActivityContext'
]);

function plainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function semanticId(value, fallback = null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized || fallback;
}

function validateMember(value, allowed, label, fallback = null) {
  const normalized = semanticId(value, fallback);
  if (!allowed.includes(normalized)) throw new RangeError(`Unsupported ${label}: ${normalized}`);
  return normalized;
}

function uniqueStrings(values, max = 100) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze([...new Set(
    values.map(value => semanticId(value)).filter(Boolean)
  )].slice(0, max));
}

function cloneJsonLike(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return Object.freeze(value.map(cloneJsonLike));
  if (plainObject(value)) {
    const copy = {};
    for (const [key,item] of Object.entries(value)) copy[key] = cloneJsonLike(item);
    return Object.freeze(copy);
  }
  if (['string','number','boolean'].includes(typeof value)) return value;
  throw new TypeError('System Shell context values must be JSON-like primitives, arrays, or plain objects');
}

function normalizeShellContext(value) {
  const source = plainObject(value) ? value : {};
  const result = {};
  for (const field of SHELL_CONTEXT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source, field)) result[field] = cloneJsonLike(source[field]);
  }
  return Object.freeze(result);
}

function resolveShellContext(previousValue, incomingValue, authoritative) {
  const previous = normalizeShellContext(previousValue);
  const incoming = normalizeShellContext(incomingValue);
  const result = {};
  const decisions = {};

  for (const field of SHELL_CONTEXT_FIELDS) {
    const hasPrevious = Object.prototype.hasOwnProperty.call(previous, field);
    const hasIncoming = Object.prototype.hasOwnProperty.call(incoming, field);

    if (hasIncoming && authoritative) {
      result[field] = incoming[field];
      decisions[field] = 'accepted-authoritative-caller-platform-context';
    } else if (hasIncoming && !authoritative && hasPrevious) {
      result[field] = previous[field];
      decisions[field] = 'preserved-existing-context-incoming-not-authoritative';
    } else if (hasIncoming && !authoritative) {
      decisions[field] = 'withheld-incoming-context-not-authoritative';
    } else if (hasPrevious) {
      result[field] = previous[field];
      decisions[field] = 'preserved-existing-context';
    } else {
      decisions[field] = 'no-context-supplied';
    }
  }

  return Object.freeze({
    context: Object.freeze(result),
    decisions: Object.freeze(decisions),
    incomingAuthoritative: authoritative
  });
}

function taskContinuityEnvironment(transitionKind) {
  if (transitionKind === 'compact-expanded-navigation') return 'compact-expanded-layout';
  if (transitionKind === 'application-system-handoff') return 'form-factor';
  if (transitionKind === 'window-restoration') return 'multi-pane-recomposition';
  if (transitionKind === 'task-switching') return 'multi-pane-recomposition';
  if (transitionKind === 'multi-window-change') return 'multi-pane-recomposition';
  if (transitionKind === 'split-view-change') return 'multi-pane-recomposition';
  if (transitionKind === 'shell-overlay') return 'multi-pane-recomposition';
  if (transitionKind === 'search-continuity') return 'multi-pane-recomposition';
  if (transitionKind === 'contextual-command-surface') return 'multi-pane-recomposition';
  if (transitionKind === 'control-center-layout') return 'multi-pane-recomposition';
  return 'multi-pane-recomposition';
}

export function resolveGlazeShellCapability(input = {}) {
  if (!plainObject(input)) throw new TypeError('System Shell capability input must be a plain object');

  const capability = semanticId(input.capability);
  if (!capability) throw new TypeError('capability is required');
  if (!KNOWN_CAPABILITIES.includes(capability)) {
    throw new RangeError(`Unsupported System Shell capability: ${capability}`);
  }
  const requestedState = validateMember(
    input.state,
    CAPABILITY_STATES,
    'System Shell capability state',
    'unknown'
  );
  const authoritative = input.authoritative === true;
  const acceptedState = authoritative || requestedState === 'unknown'
    ? requestedState
    : 'unknown';

  return Object.freeze({
    version: '1.7.0-dev.6',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    capability,
    requestedState,
    acceptedState,
    authoritative,
    available: acceptedState === 'available',
    requestedStateWithheldWithoutAuthority: !authoritative && requestedState !== 'unknown',
    authority: Object.freeze({
      presentationOnly: true,
      capabilityOwnedByCallerOrPlatform: true,
      capabilityCreatedByGlaze: false,
      systemPrivilegeGrantedByGlaze: false,
      executionAuthorityCreatedByGlaze: false
    })
  });
}

export function resolveGlazeSystemShellContinuity(input = {}) {
  if (!plainObject(input)) throw new TypeError('System Shell continuity input must be a plain object');

  const shellArea = validateMember(input.shellArea, SHELL_AREAS, 'System Shell area');
  const transitionKind = validateMember(input.transitionKind, TRANSITION_KINDS, 'System Shell transition');
  const profile = validateMember(
    input.profile,
    glazeV17FormFactorProfilesDevelopmentContract.profiles,
    'form-factor profile'
  );

  const requiredCapability = CAPABILITY_BY_AREA[shellArea];
  const capabilityStates = plainObject(input.capabilityStates) ? input.capabilityStates : {};
  const authoritativeCapabilities = new Set(uniqueStrings(input.authoritativeCapabilities));
  const capability = resolveGlazeShellCapability({
    capability: requiredCapability,
    state: capabilityStates[requiredCapability] ?? 'unknown',
    authoritative: authoritativeCapabilities.has(requiredCapability)
  });

  const profileResolution = resolveGlazeFormFactorProfile({
    profile,
    posture: input.posture,
    accessibilityProfiles: input.accessibilityProfiles,
    availableInputs: input.availableInputs,
    inputCapabilityAuthoritative: input.inputCapabilityAuthoritative,
    unsafeRegionIds: input.unsafeRegionIds,
    semanticSurfaceId: 'glaze-system-shell',
    surfaceRole: 'task',
    constrained: input.constrained
  });

  const continuity = resolveGlazeTaskContinuity({
    environmentChange: taskContinuityEnvironment(transitionKind),
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

  const shellContext = resolveShellContext(
    input.previousShellContext,
    input.incomingShellContext,
    input.shellContextAuthoritative === true
  );

  const persistentControlCenterLayout = shellArea === 'persistent-control-center-layout';
  const providerExecutionRequired = [
    'window-restoration',
    'application-system-handoff',
    'task-switching',
    'multi-window-change',
    'split-view-change'
  ].includes(transitionKind);

  return Object.freeze({
    version: '1.7.0-dev.6',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    component: 'GlazeSystemShellContinuity',
    shellArea,
    transitionKind,
    profile,
    presentation: Object.freeze({
      form: PROFILE_PRESENTATION[profile],
      profileExpectations: profileResolution.expectations,
      capabilityState: capability.acceptedState,
      capabilityAuthoritative: capability.authoritative,
      available: capability.available,
      unavailableOrUnknownExplanationRequired: !capability.available,
      semanticIdentityMayChangeFromShellRecomposition: false
    }),
    taskState: continuity.state,
    stateClasses: continuity.stateClasses,
    shellContext: shellContext.context,
    decisions: Object.freeze({
      task: continuity.decisions,
      shellContext: shellContext.decisions
    }),
    continuity: Object.freeze({
      ...continuity.continuity,
      activeTaskPreserved: true,
      navigationDestinationPreserved: true,
      focusPreserved: true,
      selectionPreserved: true,
      draftsPreserved: true,
      queryFilterContextPreserved: true,
      paneWindowStatePreserved: true,
      safePendingInteractionsPreserved: true,
      providerOwnedTruthPreserved: true,
      shellRecompositionMayResetTask: false,
      transitionPredictable: true,
      transitionReversible: true
    }),
    controlCenter: Object.freeze({
      persistentLayoutRequested: persistentControlCenterLayout,
      persistentLayoutAvailable:
        persistentControlCenterLayout && capability.available,
      callerOrPlatformMustPersistLayout: persistentControlCenterLayout && capability.available,
      persistencePerformedByGlaze: false,
      crossDeviceSyncEstablished: false
    }),
    notificationActivity: Object.freeze({
      presentationContinuityIncluded: shellArea === 'notification-activity-presentation',
      truthOwnedByProvider: true,
      truthCreatedByGlaze: false,
      section8ComponentCatalogImplemented: false
    }),
    transition: Object.freeze({
      proposalOnly: true,
      providerExecutionRequired,
      executionPerformedByGlaze: false,
      navigationExecutedByGlaze: false,
      consequentialExecutionAutomatic: false
    }),
    integrations: Object.freeze({
      taskContinuity: 'js/glaze-v1.7-task-continuity.dev.mjs',
      adaptiveInput: 'js/glaze-v1.7-adaptive-input.dev.mjs',
      formFactorProfiles: 'js/glaze-v1.7-form-factor-profiles.dev.mjs',
      adaptiveComposition: 'js/glaze-v1.7-task-continuity.dev.mjs',
      commandSurface: 'js/glaze-v1.7-command-surface.dev.mjs',
      personalization: 'js/glaze-v1.7-personalization.dev.mjs',
      adaptiveInputVersion: glazeV17AdaptiveInputDevelopmentContract.version,
      commandSurfaceVersion: glazeV17CommandSurfaceDevelopmentContract.version,
      personalizationVersion: glazeV17PersonalizationDevelopmentContract.version
    }),
    authority: Object.freeze({
      presentationOnly: true,
      shellConfigurationOwnedByCallerOrPlatform: true,
      capabilityOwnedByCallerOrPlatform: true,
      providerTruthOwnedByProvider: true,
      windowingSupportCreatedByGlaze: false,
      systemPrivilegesGrantedByGlaze: false,
      notificationTruthCreatedByGlaze: false,
      activityTruthCreatedByGlaze: false,
      searchAuthorityCreatedByGlaze: false,
      navigationAuthorityCreatedByGlaze: false,
      executionAuthorityCreatedByGlaze: false,
      persistencePerformedByGlaze: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export function resolveGlazeControlCenterContinuity(input = {}) {
  if (!plainObject(input)) throw new TypeError('Control Center continuity input must be a plain object');
  const persistent = input.persistentLayoutRequested === true;
  return resolveGlazeSystemShellContinuity({
    ...input,
    shellArea: persistent ? 'persistent-control-center-layout' : 'control-center',
    transitionKind: 'control-center-layout'
  });
}

export const glazeV17SystemShellContinuityDevelopmentContract = Object.freeze({
  version: '1.7.0-dev.6',
  lifecycle: 'development',
  stableBaseline: '1.6.0',
  consumerEligible: false,
  implementedSpecificationSections: Object.freeze([7]),
  shellAreas: SHELL_AREAS,
  transitionKinds: TRANSITION_KINDS,
  capabilityStates: CAPABILITY_STATES,
  knownCapabilities: KNOWN_CAPABILITIES,
  shellContextFields: SHELL_CONTEXT_FIELDS,
  presentationByProfile: PROFILE_PRESENTATION,
  taskContinuityRequired: true,
  adaptiveInputIntegrationRequired: true,
  formFactorProfileIntegrationRequired: true,
  adaptiveCompositionIntegrationRequired: true,
  commandSurfaceIntegrationRequired: true,
  personalizationIntegrationRequired: true,
  section8ComponentCatalogImplemented: false,
  persistentLayoutAutomatic: false,
  crossDeviceSyncEstablished: false,
  presentationOnly: true,
  windowingSupportCreatedByGlaze: false,
  systemPrivilegesGrantedByGlaze: false,
  notificationTruthCreatedByGlaze: false,
  searchAuthorityCreatedByGlaze: false,
  navigationAuthorityCreatedByGlaze: false,
  executionAuthorityCreatedByGlaze: false,
  consequentialExecutionAutomatic: false
});
