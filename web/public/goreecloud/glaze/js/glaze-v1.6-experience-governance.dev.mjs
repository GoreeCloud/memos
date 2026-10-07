/* GLAZE UI V1.6 — Development progressive disclosure, action hierarchy,
 * cross-application behavior, token safety, truthful/privacy-minimized/local-first
 * adaptation, stable-primary-action, calm-default, and restrained-expression foundation.
 */

const ACTION_CLASSES = Object.freeze([
  'primary',
  'secondary',
  'tertiary',
  'contextual',
  'destructive'
]);

const CHROME_SURFACES = Object.freeze([
  'application-bar',
  'side-navigation',
  'search',
  'dialog',
  'menu',
  'context-surface',
  'settings',
  'loading',
  'error',
  'notification'
]);

const COMMON_OPERATIONS = Object.freeze([
  'create',
  'save',
  'search',
  'filter',
  'select',
  'open',
  'close',
  'back',
  'refresh',
  'retry',
  'share',
  'delete',
  'settings'
]);

const TOKEN_CATEGORIES = Object.freeze([
  'skeleton',
  'loading',
  'progress',
  'status',
  'surfaces',
  'content-hierarchy',
  'density',
  'motion',
  'focus',
  'elevation',
  'state',
  'typography',
  'transparency',
  'blur',
  'visual-complexity'
]);

const PROTECTED_TOKEN_DOMAINS = Object.freeze([
  'accessibility',
  'security-state',
  'privacy-state',
  'destructive-action',
  'focus-visibility',
  'minimum-interaction-size'
]);

const TRUTH_KINDS = Object.freeze([
  'capability',
  'authority',
  'privacy',
  'security',
  'connectivity',
  'availability',
  'permission'
]);

const ALLOWED_ADAPTATION_SIGNALS = Object.freeze([
  'layout-environment',
  'accessibility-profiles',
  'input-mode',
  'form-factor',
  'performance-level',
  'background-complexity',
  'foreground-importance',
  'posture',
  'appearance',
  'density'
]);

const PROHIBITED_ADAPTATION_SIGNALS = Object.freeze([
  'personal-content',
  'private-communications',
  'browsing-history',
  'precise-user-behavior',
  'unrelated-application-state'
]);

const LOCAL_FIRST_CAPABILITIES = Object.freeze([
  'ordinary-appearance',
  'accessibility',
  'responsive-behavior',
  'skeleton-loading',
  'component-state-rendering',
  'focus-presentation',
  'semantic-color-resolution',
  'density-resolution'
]);

const EXPRESSIVE_EFFECTS = Object.freeze([
  'color',
  'translucency',
  'blur',
  'reflection',
  'depth',
  'motion',
  'environmental-adaptation'
]);

const APPROVED_EFFECT_BENEFITS = Object.freeze([
  'hierarchy',
  'readability',
  'interaction-feedback',
  'continuity',
  'spatial-understanding',
  'state-comprehension',
  'identity'
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
  return Object.freeze([...new Set(values.map(value => String(value ?? '').trim()).filter(Boolean))]);
}

function uniqueSemantic(values) {
  return Object.freeze(uniqueStrings(values).map(value => value.toLowerCase()));
}

function normalizeItem(value) {
  if (!plainObject(value)) return null;
  const id = String(value.id ?? '').trim();
  if (!id) return null;
  return Object.freeze({
    id,
    essential: bool(value.essential),
    priority: semanticId(value.priority, 'secondary'),
    disclosureGroup: value.disclosureGroup == null
      ? null
      : String(value.disclosureGroup).trim() || null
  });
}

export function resolveGlazeProgressiveDisclosure(input = {}) {
  if (!plainObject(input)) throw new TypeError('Progressive-disclosure input must be a plain object');

  const items = Array.isArray(input.items)
    ? input.items.map(normalizeItem).filter(Boolean)
    : [];
  const requestedHiddenIds = new Set(uniqueStrings(input.requestedHiddenIds));
  const essentialIds = items.filter(item => item.essential).map(item => item.id);
  const attemptedEssentialHides = essentialIds.filter(id => requestedHiddenIds.has(id));
  const hiddenIds = items
    .filter(item => requestedHiddenIds.has(item.id) && !item.essential)
    .map(item => item.id);
  const visibleIds = items
    .filter(item => !hiddenIds.includes(item.id))
    .map(item => item.id);

  return Object.freeze({
    version: '1.6.0-dev.8',
    lifecycle: 'development',
    stableBaseline: '1.5.1',
    visibleIds: Object.freeze(visibleIds),
    hiddenIds: Object.freeze(hiddenIds),
    essentialIds: Object.freeze(essentialIds),
    attemptedEssentialHides: Object.freeze(attemptedEssentialHides),
    rules: Object.freeze({
      importantInformationFirst: true,
      additionalControlsMayBeRevealedOnDemand: true,
      essentialFunctionalityMayBeHidden: false,
      progressiveDisclosureMayEraseTaskState: false
    }),
    authority: Object.freeze({
      itemEssentialityOwnedByApplication: true,
      disclosurePresentationOnly: true,
      actionExecutedByResolver: false
    })
  });
}

export function resolveGlazeActionHierarchy(input = {}) {
  if (!plainObject(input)) throw new TypeError('Action-hierarchy input must be a plain object');

  const actions = Array.isArray(input.actions)
    ? input.actions
      .filter(plainObject)
      .map(action => ({
        id:String(action.id ?? '').trim(),
        class:semanticId(action.class, 'secondary'),
        visible:action.visible !== false
      }))
      .filter(action => action.id)
    : [];

  for (const action of actions) {
    if (!ACTION_CLASSES.includes(action.class)) {
      throw new RangeError(`Unsupported action class: ${action.class}`);
    }
  }

  const visible = actions.filter(action => action.visible);
  const primary = visible.filter(action => action.class === 'primary');
  const destructive = visible.filter(action => action.class === 'destructive');
  const dominantCount = primary.length + destructive.filter(action => bool(input.destructiveProminent)).length;
  const referenceDominantLimit = 1;

  return Object.freeze({
    version: '1.6.0-dev.8',
    lifecycle: 'development',
    actions:Object.freeze(actions.map(Object.freeze)),
    counts:Object.freeze(Object.fromEntries(ACTION_CLASSES.map(kind => [
      kind,
      visible.filter(action => action.class === kind).length
    ]))),
    hierarchy:Object.freeze({
      referenceDominantLimit,
      dominantCount,
      tooManyDominantActions: dominantCount > referenceDominantLimit,
      primaryVisualPriorityHighest: true,
      destructiveSemanticProtectionRequired: destructive.length > 0,
      tertiaryAndContextualRemainSubordinate: true
    }),
    authority:Object.freeze({
      actionImportanceOwnedByApplication: true,
      destructiveTruthOwnedByApplication: true,
      actionExecutedByGlaze: false
    })
  });
}

export function resolveGlazeApplicationChrome(input = {}) {
  if (!plainObject(input)) throw new TypeError('Application-chrome input must be a plain object');

  const surface = semanticId(input.surface);
  if (!CHROME_SURFACES.includes(surface)) {
    throw new RangeError(`Unsupported application chrome surface: ${surface}`);
  }

  return Object.freeze({
    version:'1.6.0-dev.8',
    lifecycle:'development',
    surface,
    sharedBehavior:Object.freeze({
      focusSemanticsRequired:true,
      keyboardSemanticsRequired:true,
      accessibilityPrecedenceRequired:true,
      loadingErrorNotificationSemanticsShared:true,
      taskContinuityRequired:true,
      applicationIdentityMayAdaptPresentation:true,
      applicationIdentityMayRedefineCoreBehavior:false
    }),
    authority:Object.freeze({
      presentationOnly:true,
      applicationTaskTruthOwnedByApplication:true
    })
  });
}

export function resolveGlazeCommonOperation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Common-operation input must be a plain object');

  const operation = semanticId(input.operation);
  if (!COMMON_OPERATIONS.includes(operation)) {
    throw new RangeError(`Unsupported common operation: ${operation}`);
  }

  const requestedBehavior = semanticId(input.requestedBehavior, operation);
  const equivalent = requestedBehavior === operation;
  const allowedPresentationVariation = uniqueSemantic(input.presentationVariation);

  return Object.freeze({
    version:'1.6.0-dev.8',
    lifecycle:'development',
    operation,
    requestedBehavior,
    equivalent,
    consistency:Object.freeze({
      equivalentInteractionShouldRemainFamiliar:true,
      arbitraryBehaviorChangeAllowed:false,
      presentationVariationAllowed:true,
      presentationVariation:allowedPresentationVariation,
      semanticOperationMustRemainRecognizable:true
    }),
    authority:Object.freeze({
      operationSemanticsOwnedByApplicationAndGlazeContract:true,
      operationExecutedByGlaze:false
    })
  });
}

export function resolveGlazeTokenConsumption(input = {}) {
  if (!plainObject(input)) throw new TypeError('Token-consumption input must be a plain object');

  const category = semanticId(input.category);
  if (!TOKEN_CATEGORIES.includes(category)) {
    throw new RangeError(`Unsupported token category: ${category}`);
  }

  const semanticToken = String(input.semanticToken ?? '').trim();
  const rawValueRequested = bool(input.rawValueRequested);
  const protectedDomains = uniqueSemantic(input.protectedDomains)
    .filter(domain => PROTECTED_TOKEN_DOMAINS.includes(domain));
  const overrideRequested = bool(input.overrideRequested);
  const protectedOverrideBlocked = overrideRequested && protectedDomains.length > 0;

  return Object.freeze({
    version:'1.6.0-dev.8',
    lifecycle:'development',
    category,
    semanticToken:semanticToken || null,
    consumption:Object.freeze({
      semanticTokenRequired:true,
      rawValueDuplicationPreferred:false,
      rawValueRequested,
      rawValueAccepted:rawValueRequested === false && semanticToken.length > 0,
      overrideRequested,
      protectedOverrideBlocked,
      protectedDomains:Object.freeze(protectedDomains)
    }),
    safety:Object.freeze({
      accessibilityMayBeBrokenByOverride:false,
      securityMeaningMayBeRedefined:false,
      privacyMeaningMayBeRedefined:false,
      destructiveMeaningMayBeRedefined:false,
      focusVisibilityMayBeSuppressed:false,
      minimumInteractionSizeMayBeReduced:false
    })
  });
}

export function resolveGlazeTruthfulPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Truthful-presentation input must be a plain object');

  const kind = semanticId(input.kind);
  if (!TRUTH_KINDS.includes(kind)) {
    throw new RangeError(`Unsupported truth kind: ${kind}`);
  }

  const requestedState = semanticId(input.state, 'unknown');
  const authoritative = bool(input.authoritative);
  const acceptedState = authoritative
    ? requestedState
    : ['security','authority'].includes(kind)
      ? 'unverified'
      : 'unknown';

  return Object.freeze({
    version:'1.6.0-dev.8',
    lifecycle:'development',
    kind,
    requestedState,
    acceptedState,
    authoritative,
    presentation:Object.freeze({
      positiveOrSpecificTruthWithoutAuthorityAllowed:false,
      failClosed:!authoritative,
      semanticRole:`${kind}.${acceptedState}`
    }),
    authority:Object.freeze({
      truthOwnedByResponsibleProvider:true,
      stateManufacturedByGlaze:false,
      permissionGrantedByGlaze:false,
      capabilityCreatedByGlaze:false
    })
  });
}

export function resolveGlazePrivacyMinimizedAdaptation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Privacy-minimized adaptation input must be a plain object');

  const requestedSignals = uniqueSemantic(input.requestedSignals);
  const acceptedSignals = requestedSignals.filter(signal => ALLOWED_ADAPTATION_SIGNALS.includes(signal));
  const rejectedSignals = requestedSignals.filter(signal => !ALLOWED_ADAPTATION_SIGNALS.includes(signal));
  const explicitlyProhibited = rejectedSignals.filter(signal => PROHIBITED_ADAPTATION_SIGNALS.includes(signal));

  return Object.freeze({
    version:'1.6.0-dev.8',
    lifecycle:'development',
    requestedSignals,
    acceptedSignals:Object.freeze(acceptedSignals),
    rejectedSignals:Object.freeze(rejectedSignals),
    explicitlyProhibited:Object.freeze(explicitlyProhibited),
    privacy:Object.freeze({
      minimumNecessarySignalsOnly:true,
      personalContentRequired:false,
      privateCommunicationsRequired:false,
      browsingHistoryRequired:false,
      preciseUserBehaviorRequired:false,
      unrelatedApplicationStateRequired:false
    }),
    authority:Object.freeze({
      signalValuesOwnedByCallerOrPlatform:true,
      privateDataCollectedByResolver:false
    })
  });
}

export function resolveGlazeLocalFirstPresentation(input = {}) {
  if (!plainObject(input)) throw new TypeError('Local-first presentation input must be a plain object');

  const capability = semanticId(input.capability);
  if (!LOCAL_FIRST_CAPABILITIES.includes(capability)) {
    throw new RangeError(`Unsupported local-first capability: ${capability}`);
  }

  const localInputsAvailable = input.localInputsAvailable !== false;

  return Object.freeze({
    version:'1.6.0-dev.8',
    lifecycle:'development',
    capability,
    resolution:Object.freeze({
      localInputsAvailable,
      remoteProcessingRequired:false,
      remoteIdentityRequired:false,
      networkAvailabilityRequired:false,
      mayResolveLocally:localInputsAvailable,
      unavailableLocalInputsMayUseSafeFallback:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      remoteServiceInvokedByResolver:false
    })
  });
}

export function resolveGlazeStablePrimaryActions(input = {}) {
  if (!plainObject(input)) throw new TypeError('Stable-primary-actions input must be a plain object');

  const previous = uniqueStrings(input.previousIds);
  const requested = uniqueStrings(input.requestedIds);
  const taskRelatedReason = bool(input.taskRelatedReason);
  const requestedSet = new Set(requested);
  const surviving = previous.filter(id => requestedSet.has(id));
  const survivingSet = new Set(surviving);
  const additions = requested.filter(id => !survivingSet.has(id));
  const stableIds = taskRelatedReason ? requested : Object.freeze([...surviving, ...additions]);

  return Object.freeze({
    version:'1.6.0-dev.8',
    lifecycle:'development',
    previousIds:previous,
    requestedIds:requested,
    acceptedIds:Object.freeze([...stableIds]),
    taskRelatedReason,
    stability:Object.freeze({
      preserveSurvivingRelativeOrder:!taskRelatedReason,
      transientAdaptationMayReorderPrimaryActions:false,
      strongTaskReasonMayPermitRecomposition:true,
      spatialPredictabilityRequired:true
    }),
    authority:Object.freeze({
      taskReasonTruthOwnedByApplication:true,
      actionsExecutedByGlaze:false
    })
  });
}

export function resolveGlazeCalmDefault(input = {}) {
  if (!plainObject(input)) throw new TypeError('Calm-default input must be a plain object');

  const requestedEffects = uniqueSemantic(input.effects)
    .filter(effect => EXPRESSIVE_EFFECTS.includes(effect));
  const emphasizedRegions = Math.max(0, Number.isInteger(Number(input.emphasizedRegions))
    ? Number(input.emphasizedRegions)
    : 0);
  const continuousMotionRequested = bool(input.continuousMotionRequested);
  const defaultContext = input.defaultContext !== false;

  return Object.freeze({
    version:'1.6.0-dev.8',
    lifecycle:'development',
    requestedEffects,
    presentation:Object.freeze({
      defaultContext,
      controlledAnimationRequired:true,
      intentionalColorRequired:true,
      clearHierarchyRequired:true,
      restrainedTransparencyRequired:true,
      purposefulDepthRequired:true,
      readableTypographyRequired:true,
      continuousDecorativeMotionAllowed:!defaultContext && continuousMotionRequested,
      excessiveSimultaneousEmphasis:emphasizedRegions > 2,
      expressiveEffectsConcentratedWhereValuable:true
    })
  });
}

export function evaluateGlazeExpressiveEffect(input = {}) {
  if (!plainObject(input)) throw new TypeError('Expressive-effect input must be a plain object');

  const effect = semanticId(input.effect);
  if (!EXPRESSIVE_EFFECTS.includes(effect)) {
    throw new RangeError(`Unsupported expressive effect: ${effect}`);
  }

  const benefits = uniqueSemantic(input.benefits)
    .filter(benefit => APPROVED_EFFECT_BENEFITS.includes(benefit));
  const justified = benefits.length > 0;

  return Object.freeze({
    version:'1.6.0-dev.8',
    lifecycle:'development',
    effect,
    benefits:Object.freeze(benefits),
    justified,
    recommendation:justified ? 'retain-within-budgets' : 'remove-or-simplify',
    principle:Object.freeze({
      visualIntensityEqualsQuality:false,
      effectMustImproveAtLeastOneApprovedOutcome:true,
      accessibilityAndClarityRemainHigherPriority:true
    })
  });
}

export const glazeV16ExperienceGovernanceDevelopmentContract = Object.freeze({
  version:'1.6.0-dev.8',
  lifecycle:'development',
  stableBaseline:'1.5.1',
  consumerEligible:false,
  actionClasses:ACTION_CLASSES,
  chromeSurfaces:CHROME_SURFACES,
  commonOperations:COMMON_OPERATIONS,
  tokenCategories:TOKEN_CATEGORIES,
  protectedTokenDomains:PROTECTED_TOKEN_DOMAINS,
  truthKinds:TRUTH_KINDS,
  allowedAdaptationSignals:ALLOWED_ADAPTATION_SIGNALS,
  prohibitedAdaptationSignals:PROHIBITED_ADAPTATION_SIGNALS,
  localFirstCapabilities:LOCAL_FIRST_CAPABILITIES,
  expressiveEffects:EXPRESSIVE_EFFECTS,
  approvedEffectBenefits:APPROVED_EFFECT_BENEFITS,
  essentialFunctionalityMayBeHidden:false,
  protectedSemanticOverrideAllowed:false,
  presentationMayManufactureTruth:false,
  ordinaryPresentationRequiresRemoteProcessing:false,
  transientAdaptationMayReorderPrimaryActions:false,
  continuousDecorativeMotionDefaultAllowed:false,
  unjustifiedExpressiveEffectsAllowed:false,
  authorityBoundary:'presentation-only'
});
