/* GLAZE UI V1.7 — Provider Adaptive Surfaces Development foundation.
 *
 * Bounded V1.7 v1.3 Section 48 source layer for:
 * - Glaze Contextual Actions
 * - Glaze Brief
 * - Glaze Control Center
 *
 * These surfaces present provider-owned capability and state. They do not
 * manufacture user intent, provider identity, availability, authorization,
 * permission, control state, success, completion, or other provider truth.
 */

import {
  resolveGlazeSemanticAction,
  glazeV17AdaptiveInputDevelopmentContract
} from './glaze-v1.7-adaptive-input.dev.mjs';
import {
  resolveGlazeExpressionV13,
  glazeV17ExpressionSystemDevelopmentContract
} from './glaze-v1.7-expression-system.dev.mjs';

export const PROVIDER_ADAPTIVE_SURFACES=Object.freeze([
  'glaze-contextual-actions',
  'glaze-brief',
  'glaze-control-center'
]);

export const CONTEXTUAL_ACTION_ROLES=Object.freeze([
  'standard','primary','secondary','overflow','navigation','destructive','recovery'
]);

export const BRIEF_CARD_KINDS=Object.freeze([
  'activity','event','task','media','device','synchronization','security','privacy','recovery','other'
]);

export const BRIEF_ATTENTION_STATES=Object.freeze([
  'ordinary','attention','required','critical','unknown'
]);

export const CONTROL_KINDS=Object.freeze([
  'action','toggle','selection','range','navigation'
]);

export const CONTROL_STATES=Object.freeze([
  'inactive','active','mixed','indeterminate','unknown'
]);

const FORM_FACTORS=Object.freeze(['mobile','tablet','desktop','foldable','tv','wearable','compact']);
const INPUT_CONTEXTS=Object.freeze(['touch','pointer','keyboard','remote','voice','switch','mixed']);

const PROHIBITED_KEYS=Object.freeze([
  'rank','score','rating','winner','preferredWinner','confidence','relevanceScore',
  'permission','permissionGranted','authorized','authorization','consent','consented',
  'success','completed','completion','providerTruth','forceAvailable','forceState',
  'radius','borderRadius','cornerRadiusPx','fontSizePx','fontWeight','color','colorHex',
  'paddingPx','gapPx','elevationDp','opacity','blurPx','durationMs','easing','spring',
  'fps','frameBudget','energyBudget','performanceMeasurements','acceptance','accepted'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function boundedText(value,max=160){
  const normalized=String(value??'').trim();
  return normalized?normalized.slice(0,max):null;
}

function requiredText(value,label,max=160){
  const normalized=boundedText(value,max);
  if(normalized===null)throw new TypeError(label+' is required');
  return normalized;
}

function member(value,allowed,label,fallback){
  const normalized=String(value??fallback??'').trim().toLowerCase();
  if(!allowed.includes(normalized))throw new RangeError('Unsupported '+label+': '+normalized);
  return normalized;
}

function rejectUngoverned(input,scope){
  if(!plainObject(input))return;
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(scope+' accepts governed semantic/provider state, not raw ranking, authority, truth, design, measurement, or acceptance controls: '+key);
    }
  }
}

function providerIdentity(input){
  const requestedProviderId=boundedText(input.providerId,160);
  const authoritative=input.providerIdentityAuthoritative===true;
  return Object.freeze({
    requestedProviderId,
    authoritative,
    acceptedProviderId:authoritative?requestedProviderId:null,
    complete:authoritative&&requestedProviderId!==null,
    withheldWithoutAuthority:!authoritative&&requestedProviderId!==null,
    providerIdentityCreatedByGlaze:false
  });
}

function contextIdentity(input){
  const requestedContextId=boundedText(input.contextId,160);
  const authoritative=input.contextIdentityAuthoritative===true;
  return Object.freeze({
    requestedContextId,
    authoritative,
    acceptedContextId:authoritative?requestedContextId:null,
    complete:authoritative&&requestedContextId!==null,
    withheldWithoutAuthority:!authoritative&&requestedContextId!==null,
    contextCreatedByGlaze:false
  });
}

function uniqueIds(values,max=200){
  if(!Array.isArray(values))return Object.freeze([]);
  return Object.freeze([...new Set(values.map(v=>boundedText(v,160)).filter(Boolean))].slice(0,max));
}

function stablePresentIds(previousIds,currentIds){
  const previous=uniqueIds(previousIds);
  const current=uniqueIds(currentIds);
  const set=new Set(current);
  const retained=previous.filter(id=>set.has(id));
  const retainedSet=new Set(retained);
  return Object.freeze([...retained,...current.filter(id=>!retainedSet.has(id))]);
}

function formFactor(input){
  return member(input.formFactor,FORM_FACTORS,'form factor','desktop');
}

function inputContext(input){
  return member(input.inputContext,INPUT_CONTEXTS,'input context','mixed');
}

function expressionFor(input,overrides={}){
  return resolveGlazeExpressionV13({
    geometryRole:overrides.geometryRole??'interactive',
    emphasisRole:overrides.emphasisRole??'standard',
    typographyRole:overrides.typographyRole??'label',
    containmentRole:overrides.containmentRole??'interactive-group',
    componentRole:overrides.componentRole??'control',
    formFactor:formFactor(input),
    inputContext:inputContext(input),
    densityRole:member(input.densityRole,['compact','standard','spacious'],'density role','standard'),
    colorIntent:overrides.colorIntent??'interaction',
    compositionRole:overrides.compositionRole??'single-pane',
    expressionProfile:member(input.expressionProfile,['calm','balanced','expressive'],'expression profile','balanced'),
    expressionProfileAuthoritative:input.expressionProfileAuthoritative===true,
    performancePressure:member(input.performancePressure,['neutral','constrained','severe'],'performance pressure','neutral'),
    performancePressureAuthoritative:input.performancePressureAuthoritative===true,
    accessibility:plainObject(input.accessibility)?input.accessibility:{},
    accessibilityAuthoritative:input.accessibilityAuthoritative===true,
    semanticSeverity:overrides.semanticSeverity??'ordinary',
    semanticSeverityAuthoritative:overrides.semanticSeverityAuthoritative===true,
    motionPurpose:overrides.motionPurpose??'microinteraction',
    transitionOccurrenceAuthoritative:input.transitionOccurrenceAuthoritative===true
  });
}

export function resolveGlazeContextualAction(input={}){
  if(!plainObject(input))throw new TypeError('Contextual Action input must be a plain object');
  rejectUngoverned(input,'Contextual Action');

  const actionId=requiredText(input.actionId,'actionId');
  const requestedRole=member(input.role,CONTEXTUAL_ACTION_ROLES,'contextual action role','standard');
  const roleAuthoritative=input.roleAuthoritative===true;
  const acceptedRole=requestedRole==='destructive'&&!roleAuthoritative?'standard':requestedRole;

  const provider=providerIdentity(input);
  const context=contextIdentity(input);
  const availability=resolveGlazeSemanticAction({
    actionId,
    state:input.availabilityState??'unknown',
    authoritative:input.availabilityAuthoritative===true,
    essential:input.essential===true
  });

  const availabilityKnown=availability.availability.acceptedState!=='unknown';
  const available=availability.availability.acceptedState==='available';
  const presentationEligible=provider.complete&&context.complete&&availabilityKnown;
  const actionablePresentationEnabled=presentationEligible&&available;

  const consequenceSeverity=input.consequenceSeverity??'ordinary';
  const consequenceSeverityAuthoritative=input.consequenceSeverityAuthoritative===true;
  const expression=expressionFor(input,{
    geometryRole:'interactive',
    emphasisRole:acceptedRole==='primary'?'prominent':'standard',
    typographyRole:'label',
    containmentRole:'interactive-group',
    componentRole:'control',
    colorIntent:acceptedRole==='destructive'?'semantic-state':'interaction',
    semanticSeverity:consequenceSeverity,
    semanticSeverityAuthoritative:consequenceSeverityAuthoritative,
    motionPurpose:'microinteraction'
  });

  return Object.freeze({
    version:'1.7.0-dev.41',
    lifecycle:'Development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    v13SpecificationSections:Object.freeze([48]),
    requirementGroup:'provider-adaptive-surfaces',
    component:'Glaze Contextual Actions',
    actionId,
    label:boundedText(input.label,200),
    role:Object.freeze({
      requested:requestedRole,
      authoritative:roleAuthoritative,
      accepted:acceptedRole,
      destructiveRoleWithheldWithoutAuthority:requestedRole==='destructive'&&!roleAuthoritative,
      visualRoleCreatesConsequenceTruth:false
    }),
    provider,
    context,
    availability:availability.availability,
    presentation:Object.freeze({
      eligible:presentationEligible,
      enabled:actionablePresentationEnabled,
      unavailableOrUnknownExplanationRequired:!actionablePresentationEnabled,
      expression,
      keyboardEquivalentRequired:true,
      accessibleNameRequired:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      userIntentCreatedByGlaze:false,
      providerIdentityCreatedByGlaze:false,
      contextCreatedByGlaze:false,
      availabilityCreatedByGlaze:false,
      permissionGrantedByGlaze:false,
      authorizationGrantedByGlaze:false,
      consentGrantedByGlaze:false,
      commandExecutedByGlaze:false,
      navigationExecutedByGlaze:false,
      successCreatedByGlaze:false,
      rankingInventedByGlaze:false
    })
  });
}

export function resolveGlazeContextualActions(input={}){
  if(!plainObject(input))throw new TypeError('Contextual Actions surface input must be a plain object');
  rejectUngoverned(input,'Contextual Actions surface');

  const actions=Object.freeze((Array.isArray(input.actions)?input.actions:[]).map(resolveGlazeContextualAction));
  const currentIds=actions.map(a=>a.actionId);
  const stableIds=stablePresentIds(input.previousActionIds,currentIds);
  const selectedRequested=boundedText(input.selectedActionId,160);
  const selectedActionId=selectedRequested&&stableIds.includes(selectedRequested)?selectedRequested:null;

  return Object.freeze({
    version:'1.7.0-dev.41',
    lifecycle:'Development',
    component:'Glaze Contextual Actions',
    actions,
    continuity:Object.freeze({
      stableActionIds:stableIds,
      selectedActionId,
      existingRelativeOrderPreserved:true,
      providerArrivalMayArbitrarilyReorderExistingItems:false,
      selectionPreservedWhenStillValid:true,
      focusReturnToInvokingContextRequired:true
    }),
    accessibility:Object.freeze({
      keyboardInteractionRequired:true,
      focusVisibleRequired:true,
      disabledStateMustRemainDiscoverable:true,
      menuOrButtonRoleMustMatchActualInteraction:true,
      colorOnlyMeaningAllowed:false
    }),
    authority:Object.freeze({
      presentationOnly:true,
      actionRankingInventedByGlaze:false,
      providerPrecedenceInventedByGlaze:false,
      actionExecutionAutomatic:false
    })
  });
}

function resolveBriefAttention(input){
  const requested=member(input.attention,BRIEF_ATTENTION_STATES,'brief attention','unknown');
  const authoritative=input.attentionAuthoritative===true;
  const accepted=requested==='ordinary'||requested==='unknown'||authoritative?requested:'unknown';
  return Object.freeze({
    requested,
    authoritative,
    accepted,
    requiredCommunicationProtected:accepted==='required'||accepted==='critical',
    severityCreatedByGlaze:false
  });
}

export function resolveGlazeBriefCard(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Brief card input must be a plain object');
  rejectUngoverned(input,'Glaze Brief card');

  const cardId=requiredText(input.cardId,'cardId');
  const kind=member(input.kind,BRIEF_CARD_KINDS,'Brief card kind','other');
  const provider=providerIdentity(input);
  const attention=resolveBriefAttention(input);
  const stateAuthoritative=input.stateAuthoritative===true;
  const requestedState=boundedText(input.stateId,120)??'unknown';
  const acceptedState=stateAuthoritative?requestedState:'unknown';
  const personalizationIntentAuthoritative=input.personalizationIntentAuthoritative===true;
  const requestedHidden=input.requestedHidden===true;
  const protectedVisibility=attention.requiredCommunicationProtected;
  const hidden=personalizationIntentAuthoritative&&requestedHidden&&!protectedVisibility;

  const semanticSeverity=attention.accepted==='critical'
    ?'critical'
    :attention.accepted==='required'||attention.accepted==='attention'?'attention':'ordinary';

  const expression=expressionFor(input,{
    geometryRole:'grouped',
    emphasisRole:protectedVisibility?'prominent':'standard',
    typographyRole:protectedVisibility?'title':'body',
    containmentRole:'related-content',
    componentRole:kind==='security'||kind==='privacy'?'status':'content',
    colorIntent:kind==='security'||kind==='privacy'?'protected-state':'none',
    semanticSeverity,
    semanticSeverityAuthoritative:attention.authoritative,
    motionPurpose:'state-change'
  });

  return Object.freeze({
    version:'1.7.0-dev.41',
    lifecycle:'Development',
    component:'Glaze Brief',
    cardId,
    kind,
    provider,
    state:Object.freeze({
      requested:requestedState,
      authoritative:stateAuthoritative,
      accepted:acceptedState,
      withheldWithoutAuthority:!stateAuthoritative&&requestedState!=='unknown',
      stateCreatedByGlaze:false
    }),
    attention,
    content:Object.freeze({
      title:boundedText(input.title,240),
      summary:boundedText(input.summary,600),
      sourceLabel:boundedText(input.sourceLabel,160)
    }),
    personalization:Object.freeze({
      intentAuthoritative:personalizationIntentAuthoritative,
      requestedHidden,
      hidden,
      protectedVisibility,
      mayChangeOrdering:true,
      mayChangeDensity:true,
      mayChangeExpression:true,
      mayChangeTruth:false,
      criticalCommunicationMayBeSuppressed:false,
      preferencePersistedByGlaze:false
    }),
    presentation:Object.freeze({
      expression,
      eligible:provider.complete,
      visible:provider.complete&&!hidden,
      semanticStructureRequired:true,
      readingOrderMustMatchVisualOrder:true,
      missingProviderIdentityFailsClosed:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      providerStateCreatedByGlaze:false,
      attentionCreatedByGlaze:false,
      securityTruthCreatedByGlaze:false,
      privacyTruthCreatedByGlaze:false,
      recoveryTruthCreatedByGlaze:false,
      completionCreatedByGlaze:false
    })
  });
}

function applyPreferredOrder(cards,preferredIds){
  const preferred=uniqueIds(preferredIds);
  const byId=new Map(cards.map(card=>[card.cardId,card]));
  const ordered=[];
  for(const id of preferred){
    if(byId.has(id)){
      ordered.push(byId.get(id));
      byId.delete(id);
    }
  }
  for(const card of cards){
    if(byId.has(card.cardId)){
      ordered.push(card);
      byId.delete(card.cardId);
    }
  }
  return Object.freeze(ordered);
}

export function resolveGlazeBrief(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Brief input must be a plain object');
  rejectUngoverned(input,'Glaze Brief');

  const cards=Object.freeze((Array.isArray(input.cards)?input.cards:[]).map(resolveGlazeBriefCard));
  const preferenceAuthoritative=input.orderPreferenceAuthoritative===true;
  const orderedCards=preferenceAuthoritative?applyPreferredOrder(cards,input.preferredCardIds):cards;
  const visibleCards=Object.freeze(orderedCards.filter(card=>card.presentation.visible));

  return Object.freeze({
    version:'1.7.0-dev.41',
    lifecycle:'Development',
    component:'Glaze Brief',
    cards:orderedCards,
    visibleCards,
    personalization:Object.freeze({
      orderPreferenceAuthoritative:preferenceAuthoritative,
      requestedOrderIgnoredWithoutAuthority:!preferenceAuthoritative&&uniqueIds(input.preferredCardIds).length>0,
      rankingInventedByGlaze:false,
      truthChangedByPersonalization:false,
      protectedCommunicationSuppressed:false,
      preferencePersistedByGlaze:false
    }),
    accessibility:Object.freeze({
      semanticCardStructureRequired:true,
      predictableReadingOrderRequired:true,
      visualOrderMustMatchReadingOrder:true,
      criticalMeaningMustNotDependOnColorOrMotion:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      providerTruthCreatedByGlaze:false,
      providerPrecedenceInventedByGlaze:false,
      rankingInventedByGlaze:false
    })
  });
}

export function resolveGlazeControl(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Control input must be a plain object');
  rejectUngoverned(input,'Glaze Control');

  const controlId=requiredText(input.controlId,'controlId');
  const kind=member(input.kind,CONTROL_KINDS,'control kind','action');
  const provider=providerIdentity(input);
  const availability=resolveGlazeSemanticAction({
    actionId:controlId,
    state:input.availabilityState??'unknown',
    authoritative:input.availabilityAuthoritative===true,
    essential:input.essential===true
  });

  const requestedState=member(input.state,CONTROL_STATES,'control state','unknown');
  const stateAuthoritative=input.stateAuthoritative===true;
  const acceptedState=stateAuthoritative?requestedState:'unknown';
  const available=availability.availability.acceptedState==='available';
  const stateRequired=!['action','navigation'].includes(kind);
  const stateKnown=!stateRequired||acceptedState!=='unknown';
  const ready=provider.complete&&available&&stateKnown;

  const requestedTargetState=boundedText(input.requestedTargetState,120);
  const userIntentAuthoritative=input.userIntentAuthoritative===true;
  const proposalEligible=ready&&userIntentAuthoritative&&requestedTargetState!==null;

  const expression=expressionFor(input,{
    geometryRole:'interactive',
    emphasisRole:input.prominent===true?'prominent':'standard',
    typographyRole:'label',
    containmentRole:'interactive-group',
    componentRole:'control',
    colorIntent:'interaction',
    semanticSeverity:'ordinary',
    semanticSeverityAuthoritative:false,
    motionPurpose:'state-change'
  });

  return Object.freeze({
    version:'1.7.0-dev.41',
    lifecycle:'Development',
    component:'Glaze Control Center',
    controlId,
    kind,
    label:boundedText(input.label,200),
    provider,
    availability:availability.availability,
    state:Object.freeze({
      requested:requestedState,
      authoritative:stateAuthoritative,
      accepted:acceptedState,
      withheldWithoutAuthority:!stateAuthoritative&&requestedState!=='unknown',
      stateCreatedByGlaze:false
    }),
    proposal:Object.freeze({
      requestedTargetState,
      userIntentAuthoritative,
      eligible:proposalEligible,
      executionPerformed:false,
      resultAssumed:false
    }),
    presentation:Object.freeze({
      expression,
      enabled:ready,
      stateRequired,
      knownState:stateKnown,
      accessibleNameRequired:true,
      keyboardEquivalentRequired:true,
      visibleFocusRequired:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      controlStateOwnedByProvider:true,
      availabilityOwnedByProvider:true,
      permissionOwnedByProviderOrPlatform:true,
      authorizationOwnedByProviderOrPlatform:true,
      policyOwnedByResponsibleSystem:true,
      executionOwnedByResponsibleSystem:true,
      resultTruthOwnedByResponsibleSystem:true,
      permissionGrantedByGlaze:false,
      authorizationGrantedByGlaze:false,
      policyCreatedByGlaze:false,
      actionExecutedByGlaze:false,
      resultCreatedByGlaze:false
    })
  });
}

export function resolveGlazeControlCenter(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Control Center input must be a plain object');
  rejectUngoverned(input,'Glaze Control Center');

  const controls=Object.freeze((Array.isArray(input.controls)?input.controls:[]).map(resolveGlazeControl));
  const currentIds=controls.map(c=>c.controlId);
  const stableControlIds=stablePresentIds(input.previousControlIds,currentIds);

  return Object.freeze({
    version:'1.7.0-dev.41',
    lifecycle:'Development',
    component:'Glaze Control Center',
    controls,
    continuity:Object.freeze({
      stableControlIds,
      existingRelativeOrderPreserved:true,
      formFactorMayChangePresentationWithoutChangingControlMeaning:true,
      stateResetAllowed:false
    }),
    accessibility:Object.freeze({
      keyboardInteractionRequired:true,
      switchAndVoiceEquivalentsRequiredWhereSupported:true,
      visibleFocusRequired:true,
      stateMustNotDependOnColorOrMotionAlone:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      controlAvailabilityCreatedByGlaze:false,
      controlStateCreatedByGlaze:false,
      permissionGrantedByGlaze:false,
      authorizationGrantedByGlaze:false,
      executionPerformedByGlaze:false,
      resultCreatedByGlaze:false
    })
  });
}

function acceptanceBoundary(){
  return Object.freeze({
    sourceFoundationOnly:true,
    expressionSystemCoreImplemented:true,
    contextualActionsImplemented:true,
    glazeBriefImplemented:true,
    glazeControlCenterImplemented:true,
    workspaceImplemented:false,
    compactSurfaceImplemented:false,
    agentActivityImplemented:false,
    privacyAttentionImplemented:false,
    accessibilityPresentationImplemented:false,
    creativeSurfaceImplemented:false,
    compareImplemented:false,
    careSurfaceImplemented:false,
    section48Complete:false,
    renderedAcceptanceEstablished:false,
    nativePlatformAcceptanceEstablished:false,
    assistiveTechnologyAcceptanceEstablished:false,
    representativeDeviceAcceptanceEstablished:false,
    measuredPerformanceAcceptanceEstablished:false,
    energyAcceptanceEstablished:false,
    humanVisualReviewEstablished:false,
    downstreamConsumerAcceptanceAutomatic:false,
    releasePromotionAutomatic:false,
    deploymentAcceptanceAutomatic:false,
    productionAcceptanceAutomatic:false
  });
}

export const glazeV17ProviderAdaptiveSurfacesDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.41',
  lifecycle:'Development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.3',
  v13SpecificationSections:Object.freeze([48]),
  requirementGroup:'provider-adaptive-surfaces',
  surfaces:PROVIDER_ADAPTIVE_SURFACES,
  contextualActionRoles:CONTEXTUAL_ACTION_ROLES,
  briefCardKinds:BRIEF_CARD_KINDS,
  briefAttentionStates:BRIEF_ATTENTION_STATES,
  controlKinds:CONTROL_KINDS,
  controlStates:CONTROL_STATES,
  adaptiveInputFoundationVersion:glazeV17AdaptiveInputDevelopmentContract.version,
  expressionSystemFoundationVersion:glazeV17ExpressionSystemDevelopmentContract.version,
  providerTruthCreatedByGlaze:false,
  userIntentCreatedByGlaze:false,
  actionRankingInventedByGlaze:false,
  controlExecutionPerformedByGlaze:false,
  personalizationMayChangeExpression:true,
  personalizationMayChangeTruth:false,
  criticalCommunicationMayBeSuppressed:false,
  section48Complete:false,
  acceptance:acceptanceBoundary()
});
