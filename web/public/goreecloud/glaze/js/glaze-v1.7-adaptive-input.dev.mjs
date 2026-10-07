/* GLAZE UI V1.7 — Adaptive Input 2.0 Development foundation.
 *
 * Development-only semantic interaction resolver. GLAZE UI V1.6 / 1.6.0
 * remains the current Official Stable consumer target.
 */

import {resolveGlazeTaskContinuity} from './glaze-v1.7-task-continuity.dev.mjs';

const INPUT_MODELS = Object.freeze([
  'touch',
  'pointer',
  'keyboard',
  'stylus',
  'remote-dpad',
  'rotary',
  'switch-access',
  'voice-access',
  'assistive-input'
]);

const ACTION_STATES = Object.freeze([
  'available',
  'unavailable',
  'unsupported',
  'restricted',
  'permission-required',
  'temporarily-unavailable',
  'unknown'
]);

const INTERACTION_DEPENDENCIES = Object.freeze([
  'drag',
  'swipe',
  'hover',
  'long-press',
  'precision-pointer',
  'multi-touch'
]);

const DEPENDENCY_ALTERNATIVES = Object.freeze({
  drag: Object.freeze(['move-before', 'move-after', 'move-by-step']),
  swipe: Object.freeze(['previous', 'next', 'dismiss']),
  hover: Object.freeze(['focus', 'explicit-info']),
  'long-press': Object.freeze(['open-context', 'explicit-more-actions']),
  'precision-pointer': Object.freeze(['coarse-step', 'direct-value-entry']),
  'multi-touch': Object.freeze(['zoom-in', 'zoom-out', 'zoom-reset'])
});

const BINDING_PRESENTATIONS = Object.freeze({
  touch: 'touch-target',
  pointer: 'pointer-target',
  keyboard: 'keyboard-command',
  stylus: 'stylus-target',
  'remote-dpad': 'directional-control',
  rotary: 'rotary-control',
  'switch-access': 'switch-selectable-control',
  'voice-access': 'voice-addressable-control',
  'assistive-input': 'platform-mediated-control'
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
  const normalized = semanticId(value);
  if (!normalized) throw new TypeError(`${label} is required`);
  return normalized;
}

function uniqueStrings(values, max = 100) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze(
    [...new Set(values.map(value => semanticId(value)).filter(Boolean))].slice(0, max)
  );
}

function validateInputModel(value) {
  const model = semanticId(value);
  if (!INPUT_MODELS.includes(model)) {
    throw new RangeError(`Unsupported input model: ${model}`);
  }
  return model;
}

function validateActionState(value) {
  const state = semanticId(value, 'unknown');
  if (!ACTION_STATES.includes(state)) {
    throw new RangeError(`Unsupported semantic action availability state: ${state}`);
  }
  return state;
}

function validateDependency(value) {
  const dependency = semanticId(value);
  if (!INTERACTION_DEPENDENCIES.includes(dependency)) {
    throw new RangeError(`Unsupported interaction dependency: ${dependency}`);
  }
  return dependency;
}

function normalizedSemanticActions(actions) {
  if (!Array.isArray(actions)) return Object.freeze([]);
  return Object.freeze(actions.map(action => {
    if (!plainObject(action)) {
      throw new TypeError('Each semantic action must be a plain object');
    }
    return resolveGlazeSemanticAction(action);
  }));
}

export function resolveGlazeSemanticAction(input = {}) {
  if (!plainObject(input)) throw new TypeError('Semantic action input must be a plain object');

  const actionId = requiredId(input.actionId, 'actionId');
  const requestedState = validateActionState(input.state);
  const authoritative = input.authoritative === true;
  const acceptedState = authoritative || requestedState === 'unknown'
    ? requestedState
    : 'unknown';

  return Object.freeze({
    version: '1.7.0-dev.2',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    actionId,
    semanticRole: `action.${actionId}`,
    availability: Object.freeze({
      requestedState,
      acceptedState,
      authoritative,
      enabled: acceptedState === 'available',
      requestedStateWithheldWithoutAuthority: !authoritative && requestedState !== 'unknown',
      inputMethodMayChangeAvailabilityByItself: false
    }),
    presentation: Object.freeze({
      visibleWhenEssential: input.essential === true,
      explainUnavailableWhereUseful: acceptedState !== 'available',
      physicalKeyOrGestureIsSemanticAuthority: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      actionAvailabilityOwnedByApplicationOrProvider: true,
      availabilityCreatedByGlaze: false,
      permissionGrantedByGlaze: false,
      authorizationGrantedByGlaze: false,
      capabilityCreatedByGlaze: false,
      executionAuthorityCreatedByGlaze: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export function resolveGlazeInteractionAlternative(input = {}) {
  if (!plainObject(input)) throw new TypeError('Interaction alternative input must be a plain object');

  const dependency = validateDependency(input.dependency);
  const unavailableOrUnsuitable = input.unavailable === true || input.unsuitable === true;
  const callerAlternatives = uniqueStrings(input.alternatives);
  const defaultAlternatives = DEPENDENCY_ALTERNATIVES[dependency];
  const alternatives = callerAlternatives.length > 0 ? callerAlternatives : defaultAlternatives;

  if (unavailableOrUnsuitable && alternatives.length === 0) {
    throw new RangeError(`Interaction dependency requires a semantic alternative: ${dependency}`);
  }

  return Object.freeze({
    version: '1.7.0-dev.2',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    dependency,
    unavailableOrUnsuitable,
    alternatives,
    alternativeRequired: unavailableOrUnsuitable,
    physicalTechniqueRequiredForMeaning: false,
    authority: Object.freeze({
      presentationOnly: true,
      alternativeSelectionExecutesAction: false,
      capabilityCreatedByGlaze: false,
      executionAuthorityCreatedByGlaze: false
    })
  });
}

export function resolveGlazeAdaptiveInputBinding(input = {}) {
  if (!plainObject(input)) throw new TypeError('Adaptive input binding input must be a plain object');

  const inputModel = validateInputModel(input.inputModel);
  const action = resolveGlazeSemanticAction({
    actionId: input.actionId,
    state: input.state,
    authoritative: input.authoritative,
    essential: input.essential
  });

  const dependencies = uniqueStrings(input.interactionDependencies);
  const invalidDependency = dependencies.find(dependency => !INTERACTION_DEPENDENCIES.includes(dependency));
  if (invalidDependency) {
    throw new RangeError(`Unsupported interaction dependency: ${invalidDependency}`);
  }

  const unavailableDependencies = new Set(uniqueStrings(input.unavailableDependencies));
  const unsuitableDependencies = new Set(uniqueStrings(input.unsuitableDependencies));
  const suppliedAlternatives = plainObject(input.alternatives) ? input.alternatives : {};

  const alternativePlans = Object.freeze(dependencies.map(dependency => resolveGlazeInteractionAlternative({
    dependency,
    unavailable: unavailableDependencies.has(dependency),
    unsuitable: unsuitableDependencies.has(dependency),
    alternatives: suppliedAlternatives[dependency]
  })));

  const requiredAlternativePlans = alternativePlans.filter(plan => plan.alternativeRequired);
  const canPresentAsEnabled = action.availability.enabled;

  return Object.freeze({
    version: '1.7.0-dev.2',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    actionId: action.actionId,
    inputModel,
    binding: Object.freeze({
      role: `binding.${inputModel}`,
      presentation: BINDING_PRESENTATIONS[inputModel],
      semanticActionId: action.actionId,
      physicalBindingCreatesSemanticAuthority: false,
      canPresentAsEnabled,
      executionAutomatic: false
    }),
    dependencies: alternativePlans,
    alternatives: Object.freeze({
      required: requiredAlternativePlans.length > 0,
      plans: Object.freeze(requiredAlternativePlans),
      allUnavailableOrUnsuitableDependenciesCovered: requiredAlternativePlans.every(plan => plan.alternatives.length > 0)
    }),
    availability: action.availability,
    continuity: Object.freeze({
      inputMethodChangeMayResetTask: false,
      inputMethodChangeMayResetNavigation: false,
      inputMethodChangeMayChangeActionAvailabilityByItself: false
    }),
    authority: action.authority
  });
}

export function resolveGlazeInputTransition(input = {}) {
  if (!plainObject(input)) throw new TypeError('Input transition input must be a plain object');

  const from = validateInputModel(input.from);
  const to = validateInputModel(input.to);
  const actions = normalizedSemanticActions(input.actions);

  const continuity = resolveGlazeTaskContinuity({
    environmentChange: 'input-method',
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

  return Object.freeze({
    version: '1.7.0-dev.2',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    transitionKey: `${from}->${to}`,
    from,
    to,
    taskState: continuity.state,
    stateClasses: continuity.stateClasses,
    semanticActions: actions,
    continuity: Object.freeze({
      ...continuity.continuity,
      taskLossAllowed: false,
      navigationResetAllowed: false,
      focusResetAllowed: false,
      selectionResetAllowed: false,
      draftResetAllowed: false,
      actionAvailabilityMayVaryOnlyFromInputChange: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      inputModelOwnedByCallerOrPlatform: true,
      actionAvailabilityOwnedByApplicationOrProvider: true,
      providerTruthOwnedByProvider: true,
      availabilityCreatedByGlaze: false,
      permissionGrantedByGlaze: false,
      authorizationGrantedByGlaze: false,
      capabilityCreatedByGlaze: false,
      executionAuthorityCreatedByGlaze: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export const glazeV17AdaptiveInputDevelopmentContract = Object.freeze({
  version: '1.7.0-dev.2',
  lifecycle: 'development',
  stableBaseline: '1.6.0',
  consumerEligible: false,
  implementedSpecificationSections: Object.freeze([2]),
  inputModels: INPUT_MODELS,
  actionStates: ACTION_STATES,
  interactionDependencies: INTERACTION_DEPENDENCIES,
  dependencyAlternatives: DEPENDENCY_ALTERNATIVES,
  presentationOnly: true,
  actionDefinedIndependentlyFromPhysicalBinding: true,
  inputMethodChangeMayChangeAvailabilityByItself: false,
  taskLossAllowed: false,
  permissionGrantedByGlaze: false,
  authorizationGrantedByGlaze: false,
  capabilityCreatedByGlaze: false,
  executionAuthorityCreatedByGlaze: false,
  consequentialExecutionAutomatic: false
});
