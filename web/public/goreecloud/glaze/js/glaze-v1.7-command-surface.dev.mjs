/* GLAZE UI V1.7 — GlzCommandSurface Development foundation.
 *
 * Development-only semantic command/search presentation resolver.
 * GLAZE UI V1.6 / 1.6.0 remains the current Official Stable target.
 */

import {resolveGlazeTaskContinuity} from './glaze-v1.7-task-continuity.dev.mjs';
import {
  resolveGlazeSemanticAction,
  resolveGlazeAdaptiveInputBinding,
  glazeV17AdaptiveInputDevelopmentContract
} from './glaze-v1.7-adaptive-input.dev.mjs';
import {
  resolveGlazeFormFactorProfile,
  glazeV17FormFactorProfilesDevelopmentContract
} from './glaze-v1.7-form-factor-profiles.dev.mjs';

const INTERACTION_CONCEPTS = Object.freeze([
  'universal-search',
  'application-search',
  'command',
  'action',
  'contextual-action',
  'navigation-shortcut'
]);

const PROVIDER_SCOPES = Object.freeze([
  'universal',
  'application',
  'contextual',
  'navigation',
  'system',
  'unknown'
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

const SURFACE_PHASES = Object.freeze([
  'closed',
  'initial',
  'typing',
  'suggestions',
  'loading',
  'partial-results',
  'results',
  'no-results',
  'filters',
  'history',
  'error'
]);

const PRESENTATION_BY_PROFILE = Object.freeze({
  mobile: 'reachable-sheet',
  tablet: 'expanded-search-command-pane',
  desktop: 'keyboard-first-command-palette',
  foldable: 'posture-aware-command-pane',
  tv: 'directional-command-panel',
  wearable: 'glanceable-command-list'
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

function requiredId(value, label) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new TypeError(`${label} is required`);
  return normalized;
}

function uniqueStrings(values, max = 200) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze(
    [...new Set(values.map(value => String(value ?? '').trim()).filter(Boolean))].slice(0, max)
  );
}

function validateMember(value, allowed, label, fallback = null) {
  const normalized = semanticId(value, fallback);
  if (!allowed.includes(normalized)) {
    throw new RangeError(`Unsupported ${label}: ${normalized}`);
  }
  return normalized;
}

function stableMergeIds(previousIds, incomingIds) {
  const previous = uniqueStrings(previousIds);
  const incoming = uniqueStrings(incomingIds);
  const incomingSet = new Set(incoming);
  const retained = previous.filter(id => incomingSet.has(id));
  const retainedSet = new Set(retained);
  const appended = incoming.filter(id => !retainedSet.has(id));
  return Object.freeze([...retained, ...appended].slice(0, 200));
}

function partialMergeIds(previousIds, incomingIds) {
  const previous = uniqueStrings(previousIds);
  const incoming = uniqueStrings(incomingIds);
  const previousSet = new Set(previous);
  return Object.freeze(
    [...previous, ...incoming.filter(id => !previousSet.has(id))].slice(0, 200)
  );
}

function normalizeCommandItems(values) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze(values.map(resolveGlazeCommandItem));
}

function commandSurfaceTaskState(input) {
  const previous = plainObject(input.previousTaskState)
    ? {...input.previousTaskState}
    : {};
  const incoming = plainObject(input.incomingTaskState)
    ? {...input.incomingTaskState}
    : {};

  if (input.query != null) incoming.query = String(input.query);
  if (Array.isArray(input.filters)) incoming.activeFilters = uniqueStrings(input.filters, 50);
  if (input.selectedCommandId != null) {
    const selected = String(input.selectedCommandId).trim();
    incoming.selectionIds = selected ? [selected] : [];
  }
  if (input.focusId != null) incoming.focusId = String(input.focusId).trim() || null;
  if (input.navigationDestination != null) {
    incoming.navigationDestination = String(input.navigationDestination).trim() || null;
  }

  return {previous, incoming};
}

export function resolveGlazeCommandItem(input = {}) {
  if (!plainObject(input)) throw new TypeError('Command item input must be a plain object');

  const commandId = requiredId(input.commandId, 'commandId');
  const concept = validateMember(input.concept, INTERACTION_CONCEPTS, 'command interaction concept', 'command');
  const requestedProviderScope = validateMember(input.providerScope, PROVIDER_SCOPES, 'provider scope', 'unknown');
  const requestedSourceKind = validateMember(input.sourceKind, SOURCE_KINDS, 'source kind', 'unknown');
  const providerScopeAuthoritative = input.providerScopeAuthoritative === true;
  const sourceIdentityAuthoritative = input.sourceIdentityAuthoritative === true;
  const sourceId = input.sourceId == null ? null : String(input.sourceId).trim() || null;

  const availability = resolveGlazeSemanticAction({
    actionId: commandId,
    state: input.availabilityState ?? 'unknown',
    authoritative: input.availabilityAuthoritative === true,
    essential: input.essential !== false
  });

  const acceptedProviderScope = providerScopeAuthoritative ? requestedProviderScope : 'unknown';
  const acceptedSourceKind = sourceIdentityAuthoritative ? requestedSourceKind : 'unknown';
  const acceptedSourceId = sourceIdentityAuthoritative ? sourceId : null;
  const providerScopeComplete = providerScopeAuthoritative && acceptedProviderScope !== 'unknown';
  const sourceIdentityComplete = sourceIdentityAuthoritative && acceptedSourceKind !== 'unknown';
  const availabilityComplete = availability.availability.acceptedState !== 'unknown';
  const available = availability.availability.acceptedState === 'available';
  const authorityComplete = providerScopeComplete && sourceIdentityComplete && availabilityComplete;

  return Object.freeze({
    version: '1.7.0-dev.4',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    commandId,
    concept,
    semanticRole: `command.${concept}`,
    provider: Object.freeze({
      requestedScope: requestedProviderScope,
      acceptedScope: acceptedProviderScope,
      scopeAuthoritative: providerScopeAuthoritative,
      requestedScopeWithheldWithoutAuthority: !providerScopeAuthoritative && requestedProviderScope !== 'unknown',
      scopeComplete: providerScopeComplete,
      providerPrecedenceInferredByGlaze: false
    }),
    source: Object.freeze({
      requestedKind: requestedSourceKind,
      acceptedKind: acceptedSourceKind,
      requestedSourceId: sourceId,
      acceptedSourceId,
      identityAuthoritative: sourceIdentityAuthoritative,
      requestedIdentityWithheldWithoutAuthority:
        !sourceIdentityAuthoritative && (requestedSourceKind !== 'unknown' || sourceId !== null),
      identityComplete: sourceIdentityComplete,
      ownershipImplied: false,
      authorizationImplied: false
    }),
    availability: availability.availability,
    presentation: Object.freeze({
      authorityComplete,
      available,
      executablePresentationEnabled: authorityComplete && available,
      unavailableExplanationRequired: !available,
      semanticIdentityIndependentFromPhysicalPresentation: true
    }),
    authority: Object.freeze({
      presentationOnly: true,
      providerScopeOwnedByCallerOrProvider: true,
      sourceIdentityOwnedByCallerOrProvider: true,
      availabilityOwnedByCallerOrProvider: true,
      providerScopeInferredByGlaze: false,
      sourceIdentityInferredByGlaze: false,
      capabilityCreatedByGlaze: false,
      authorizationGrantedByGlaze: false,
      permissionGrantedByGlaze: false,
      consentGrantedByGlaze: false,
      navigationExecutedByGlaze: false,
      commandExecutionAutomatic: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export function resolveGlzCommandSurface(input = {}) {
  if (!plainObject(input)) throw new TypeError('GlzCommandSurface input must be a plain object');

  const phase = validateMember(input.phase, SURFACE_PHASES, 'command surface phase', 'initial');
  const profile = validateMember(
    input.profile,
    glazeV17FormFactorProfilesDevelopmentContract.profiles,
    'form-factor profile'
  );
  const inputModel = validateMember(
    input.inputModel,
    glazeV17AdaptiveInputDevelopmentContract.inputModels,
    'input model'
  );
  const surfaceConcept = validateMember(
    input.surfaceConcept,
    INTERACTION_CONCEPTS,
    'command surface concept',
    'universal-search'
  );

  const profileResolution = resolveGlazeFormFactorProfile({
    profile,
    posture: input.posture,
    accessibilityProfiles: input.accessibilityProfiles,
    availableInputs: input.availableInputs,
    inputCapabilityAuthoritative: input.inputCapabilityAuthoritative,
    unsafeRegionIds: input.unsafeRegionIds,
    semanticSurfaceId: 'glz-command-surface',
    surfaceRole: 'task'
  });

  const invocationBinding = resolveGlazeAdaptiveInputBinding({
    actionId: 'glz-command-surface.invoke',
    inputModel,
    state: input.invocationAvailabilityState ?? 'unknown',
    authoritative: input.invocationAvailabilityAuthoritative === true,
    essential: true,
    interactionDependencies: input.invocationInteractionDependencies,
    unavailableDependencies: input.unavailableInvocationDependencies,
    unsuitableDependencies: input.unsuitableInvocationDependencies,
    alternatives: input.invocationAlternatives
  });

  const items = normalizeCommandItems(input.items);
  const incomingIds = items.map(item => item.commandId);
  const previousIds = uniqueStrings(input.previousCommandIds);
  const pendingProviders = uniqueStrings(input.pendingProviders, 100);
  const failedProviders = uniqueStrings(input.failedProviders, 100);
  const partial = phase === 'partial-results' || pendingProviders.length > 0 || failedProviders.length > 0;
  const stableCommandIds = partial
    ? partialMergeIds(previousIds, incomingIds)
    : stableMergeIds(previousIds, incomingIds);

  const validCommandIds = new Set(stableCommandIds);
  const requestedSelection = input.selectedCommandId == null
    ? null
    : String(input.selectedCommandId).trim() || null;
  const selectedCommandId = requestedSelection && validCommandIds.has(requestedSelection)
    ? requestedSelection
    : null;

  const {previous, incoming} = commandSurfaceTaskState({
    ...input,
    selectedCommandId
  });
  const environmentChange = validateMember(
    input.environmentChange,
    ['input-method','form-factor','accessibility-mode','compact-expanded-layout'],
    'command surface environment change',
    'input-method'
  );

  const continuity = resolveGlazeTaskContinuity({
    environmentChange,
    previous,
    incoming,
    stateClasses: input.stateClasses,
    clearFields: input.clearFields,
    clearAuthoritative: input.clearAuthoritative,
    temporaryDisposableFields: input.temporaryDisposableFields,
    lossDirectedFields: input.lossDirectedFields,
    providerAuthoritativeFields: input.providerAuthoritativeFields,
    recoveryStateFields: input.recoveryStateFields
  });

  const query = continuity.state.query == null ? '' : String(continuity.state.query);
  const filters = Array.isArray(continuity.state.activeFilters)
    ? continuity.state.activeFilters
    : Object.freeze([]);
  const focusId = continuity.state.focusId == null ? null : String(continuity.state.focusId);
  const navigationDestination = continuity.state.navigationDestination == null
    ? null
    : String(continuity.state.navigationDestination);

  return Object.freeze({
    version: '1.7.0-dev.4',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    component: 'GlzCommandSurface',
    semanticSurfaceId: 'glz-command-surface',
    surfaceConcept,
    phase,
    profile,
    inputModel,
    presentation: Object.freeze({
      form: PRESENTATION_BY_PROFILE[profile],
      oneCommandConceptAcrossProfiles: true,
      oneCommandConceptAcrossInputModels: true,
      commandIdentityMayChangeFromPresentationAlone: false,
      profileExpectations: profileResolution.expectations,
      invocationBinding
    }),
    items,
    itemContinuity: Object.freeze({
      previousCommandIds: previousIds,
      incomingCommandIds: Object.freeze([...incomingIds]),
      stableCommandIds,
      preserveExistingRelativeOrder: true,
      providerArrivalMayArbitrarilyReorderExistingItems: false,
      pendingProviders,
      failedProviders,
      partial,
      providerPrecedenceInferredByGlaze: false,
      rankingInventedByGlaze: false
    }),
    context: Object.freeze({
      query,
      filters,
      selectedCommandId,
      focusId,
      navigationDestination
    }),
    continuity: Object.freeze({
      ...continuity.continuity,
      queryPreserved: true,
      filtersPreserved: true,
      selectionPreservedWhenValid: true,
      focusPreserved: true,
      navigationContextPreserved: true,
      providerScopePreserved: true,
      sourceIdentityPreserved: true,
      presentationChangeMayResetTask: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      providerScopeOwnedByCallerOrProvider: true,
      sourceIdentityOwnedByCallerOrProvider: true,
      availabilityOwnedByCallerOrProvider: true,
      providerScopeInferredByGlaze: false,
      sourceIdentityInferredByGlaze: false,
      capabilityCreatedByGlaze: false,
      authorizationGrantedByGlaze: false,
      permissionGrantedByGlaze: false,
      consentGrantedByGlaze: false,
      navigationExecutedByGlaze: false,
      commandExecutionAutomatic: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export const glazeV17CommandSurfaceDevelopmentContract = Object.freeze({
  version: '1.7.0-dev.4',
  lifecycle: 'development',
  stableBaseline: '1.6.0',
  consumerEligible: false,
  implementedSpecificationSections: Object.freeze([5]),
  component: 'GlzCommandSurface',
  interactionConcepts: INTERACTION_CONCEPTS,
  providerScopes: PROVIDER_SCOPES,
  sourceKinds: SOURCE_KINDS,
  surfacePhases: SURFACE_PHASES,
  presentationByProfile: PRESENTATION_BY_PROFILE,
  oneCommandConceptAcrossProfiles: true,
  oneCommandConceptAcrossInputModels: true,
  providerArrivalMayArbitrarilyReorderExistingItems: false,
  providerPrecedenceInferredByGlaze: false,
  rankingInventedByGlaze: false,
  presentationOnly: true,
  commandExecutionAutomatic: false,
  consequentialExecutionAutomatic: false
});
