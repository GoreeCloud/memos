/* Glaze V1.7 — Trust and Care Surfaces Development foundation.
 *
 * Bounded V1.7 v1.3 Section 48 source layer for Glaze Agent Activity,
 * Glaze Privacy Attention, and Glaze Care Surface.
 */

import {
  resolveGlazePrivacyAuthorityBoundaryV12,
  glazeV17PrivacyAuthorityBoundariesDevelopmentContract
} from './glaze-v1.7-privacy-authority-boundaries.dev.mjs';
import {
  resolveGlazePerformanceEnergyAwareness,
  glazeV17PerformanceEnergyAwarenessDevelopmentContract
} from './glaze-v1.7-performance-energy-awareness.dev.mjs';
import {
  resolveGlazeExpressionV13,
  glazeV17ExpressionSystemDevelopmentContract
} from './glaze-v1.7-expression-system.dev.mjs';

export const TRUST_CARE_SURFACES=Object.freeze([
  'glaze-agent-activity','glaze-privacy-attention','glaze-care-surface'
]);
const AGENT_ACTIVITY_KINDS=Object.freeze(['access','action','scope','result','history']);
const AGENT_RESULT_STATES=Object.freeze(['unknown','pending','success','warning','failed','canceled']);
const CARE_DOMAINS=Object.freeze(['device','application','storage','performance','energy','maintenance','recovery','service']);
const ATTENTION_DOMAINS=Object.freeze(['security-protection','privacy-consent','privacy-access']);
const RAW_KEYS=Object.freeze([
  'confidence','probability','rank','score','rating','winner','trusted','trustworthy',
  'authorized','authorization','permission','permissionGranted','consent','consentGranted',
  'healthy','safe','protected','secure','recovered','success','completed',
  'durationMs','easing','spring','physics','colorHex','blurPx','opacity',
  'measurements','performanceMeasurements','energyMeasurements','acceptance','accepted'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function text(value,label,max=200){
  const normalized=String(value??'').trim();
  if(!normalized)throw new TypeError(label+' is required');
  return normalized.slice(0,max);
}
function optionalText(value,max=240){
  const normalized=String(value??'').trim();
  return normalized?normalized.slice(0,max):null;
}
function member(value,allowed,label,fallback){
  const normalized=String(value??fallback??'').trim().toLowerCase();
  if(!allowed.includes(normalized))throw new RangeError('Unsupported '+label+': '+normalized);
  return normalized;
}
function rejectRaw(input,scope){
  if(!plainObject(input))return;
  for(const key of RAW_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(scope+' accepts provider-owned semantic state, not inferred truth, raw effects, measurements, or acceptance controls: '+key);
    }
  }
}
function expression(input,overrides={}){
  return resolveGlazeExpressionV13({
    geometryRole:overrides.geometryRole??'grouped',
    emphasisRole:overrides.emphasisRole??'standard',
    typographyRole:overrides.typographyRole??'body',
    containmentRole:overrides.containmentRole??'related-content',
    componentRole:overrides.componentRole??'status',
    formFactor:member(input.formFactor,['mobile','tablet','desktop','foldable','tv','wearable','compact'],'form factor','desktop'),
    inputContext:member(input.inputContext,['touch','pointer','keyboard','remote','voice','switch','mixed'],'input context','mixed'),
    densityRole:member(input.densityRole,['compact','standard','spacious'],'density role','standard'),
    colorIntent:overrides.colorIntent??'protected-state',
    compositionRole:'single-pane',
    expressionProfile:member(input.expressionProfile,['calm','balanced','expressive'],'expression profile','balanced'),
    expressionProfileAuthoritative:input.expressionProfileAuthoritative===true,
    performancePressure:member(input.performancePressure,['neutral','constrained','severe'],'performance pressure','neutral'),
    performancePressureAuthoritative:input.performancePressureAuthoritative===true,
    accessibility:plainObject(input.accessibility)?input.accessibility:{},
    accessibilityAuthoritative:input.accessibilityAuthoritative===true,
    semanticSeverity:overrides.semanticSeverity??'ordinary',
    semanticSeverityAuthoritative:overrides.semanticSeverityAuthoritative===true,
    motionPurpose:'state-change',
    transitionOccurrenceAuthoritative:input.transitionOccurrenceAuthoritative===true
  });
}

export function resolveGlazeAgentActivity(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Agent Activity input must be a plain object');
  rejectRaw(input,'Glaze Agent Activity');
  const activityId=text(input.activityId,'activityId');
  const kind=member(input.kind,AGENT_ACTIVITY_KINDS,'agent activity kind','action');
  const providerId=optionalText(input.providerId);
  const providerIdentityAuthoritative=input.providerIdentityAuthoritative===true;
  const scopeId=optionalText(input.scopeId);
  const scopeAuthoritative=input.scopeAuthoritative===true;
  const occurrenceAuthoritative=input.occurrenceAuthoritative===true;
  const requestedResult=member(input.resultState,AGENT_RESULT_STATES,'agent result state','unknown');
  const resultAuthoritative=input.resultAuthoritative===true;
  const acceptedResult=resultAuthoritative?requestedResult:'unknown';
  const presentable=providerIdentityAuthoritative&&providerId!==null&&occurrenceAuthoritative;

  return Object.freeze({
    version:'1.7.0-dev.43',
    lifecycle:'Development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    component:'Glaze Agent Activity',
    activityId,kind,
    provider:Object.freeze({
      requestedProviderId:providerId,
      authoritative:providerIdentityAuthoritative,
      acceptedProviderId:providerIdentityAuthoritative?providerId:null
    }),
    scope:Object.freeze({
      requestedScopeId:scopeId,
      authoritative:scopeAuthoritative,
      acceptedScopeId:scopeAuthoritative?scopeId:null
    }),
    occurrence:Object.freeze({
      authoritative:occurrenceAuthoritative,
      presentable
    }),
    result:Object.freeze({
      requested:requestedResult,
      authoritative:resultAuthoritative,
      accepted:acceptedResult,
      resultCreatedByGlaze:false,
      resultTrustworthinessInferredByGlaze:false
    }),
    presentation:Object.freeze({
      visible:presentable,
      sourceAttributionRequired:true,
      scopeDisclosureRequired:scopeId!==null,
      historyMeaningMustRemainProviderOwned:true,
      expression:expression(input,{
        componentRole:'agent-activity',
        emphasisRole:acceptedResult==='failed'?'prominent':'standard',
        colorIntent:'protected-state',
        semanticSeverity:acceptedResult==='failed'?'attention':'ordinary',
        semanticSeverityAuthoritative:resultAuthoritative
      })
    }),
    authority:Object.freeze({
      presentationOnly:true,
      accessOccurrenceInferredByGlaze:false,
      actionOccurrenceInferredByGlaze:false,
      scopeGrantedByGlaze:false,
      permissionGrantedByGlaze:false,
      authorizationGrantedByGlaze:false,
      executionPerformedByGlaze:false,
      successCreatedByGlaze:false,
      resultTrustworthinessInferredByGlaze:false
    })
  });
}

function attentionLevel(domain,state){
  if(state==='unknown')return 'unknown';
  if(['failed','denied','revoked','unprotected'].includes(state))return 'critical';
  if(['restricted','degraded'].includes(state))return 'attention';
  return 'ordinary';
}

export function resolveGlazePrivacyAttention(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Privacy Attention input must be a plain object');
  rejectRaw(input,'Glaze Privacy Attention');
  const domain=member(input.truthDomain,ATTENTION_DOMAINS,'privacy attention truth domain','privacy-access');
  const boundary=resolveGlazePrivacyAuthorityBoundaryV12({
    truthDomain:domain,
    claims:input.claims,
    transitionOccurrenceAuthoritative:input.transitionOccurrenceAuthoritative===true,
    expressionProfile:input.expressionProfile,
    expressionProfileAuthoritative:input.expressionProfileAuthoritative===true,
    performancePressure:input.performancePressure,
    performancePressureAuthoritative:input.performancePressureAuthoritative===true,
    accessibility:plainObject(input.accessibility)?input.accessibility:{},
    accessibilityAuthoritative:input.accessibilityAuthoritative===true
  });
  const level=attentionLevel(domain,boundary.truth.effectiveState);
  return Object.freeze({
    version:'1.7.0-dev.43',
    lifecycle:'Development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    component:'Glaze Privacy Attention',
    truthDomain:domain,
    boundary,
    attention:Object.freeze({
      level,
      prominent:level==='critical'||level==='attention',
      ordinaryPositiveStateExaggerated:false,
      unknownPresentedAsPositive:false,
      providerTruthRequiredForNonUnknown:true
    }),
    authority:Object.freeze({
      privacyTruthOwnedByPrivacyShield:domain.startsWith('privacy-'),
      securityTruthOwnedByWardveil:domain==='security-protection',
      providerTruthCreatedByGlaze:false,
      protectionInferredByGlaze:false,
      consentInferredByGlaze:false,
      attentionProminenceCreatesTruth:false
    })
  });
}

export function resolveGlazeCareSurface(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Care Surface input must be a plain object');
  rejectRaw(input,'Glaze Care Surface');
  const itemId=text(input.itemId,'itemId');
  const domain=member(input.domain,CARE_DOMAINS,'care domain','service');
  const providerId=optionalText(input.providerId);
  const providerIdentityAuthoritative=input.providerIdentityAuthoritative===true;
  const requestedState=optionalText(input.stateId)??'unknown';
  const stateAuthoritative=input.stateAuthoritative===true;
  const acceptedState=stateAuthoritative?requestedState:'unknown';

  let degradation=null;
  if(domain==='performance'||domain==='energy'){
    degradation=resolveGlazePerformanceEnergyAwareness({
      presentationDomain:'material',
      accessibilityProfiles:Array.isArray(input.accessibilityProfiles)?input.accessibilityProfiles:[],
      runtimePressure:input.runtimePressure,
      runtimePressureAuthoritative:input.runtimePressureAuthoritative===true,
      powerSaving:input.powerSaving,
      powerSavingAuthoritative:input.powerSavingAuthoritative===true,
      thermalState:input.thermalState,
      thermalStateAuthoritative:input.thermalStateAuthoritative===true,
      hardwareClass:input.hardwareClass,
      hardwareClassAuthoritative:input.hardwareClassAuthoritative===true,
      refreshClass:input.refreshClass,
      refreshClassAuthoritative:input.refreshClassAuthoritative===true,
      performanceDegraded:input.performanceDegraded,
      performanceDegradedAuthoritative:input.performanceDegradedAuthoritative===true,
      visibilityClass:input.visibilityClass,
      visibilityClassAuthoritative:input.visibilityClassAuthoritative===true
    });
  }

  return Object.freeze({
    version:'1.7.0-dev.43',
    lifecycle:'Development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    component:'Glaze Care Surface',
    itemId,domain,
    provider:Object.freeze({
      requestedProviderId:providerId,
      authoritative:providerIdentityAuthoritative,
      acceptedProviderId:providerIdentityAuthoritative?providerId:null
    }),
    state:Object.freeze({
      requested:requestedState,
      authoritative:stateAuthoritative,
      accepted:acceptedState,
      stateCreatedByGlaze:false
    }),
    presentation:Object.freeze({
      eligible:providerIdentityAuthoritative&&providerId!==null,
      unknownStateExplicit:acceptedState==='unknown',
      degradation,
      expression:expression(input,{
        componentRole:'care',
        emphasisRole:'standard',
        colorIntent:acceptedState==='unknown'?'none':'semantic-state',
        semanticSeverity:'ordinary',
        semanticSeverityAuthoritative:false
      })
    }),
    authority:Object.freeze({
      presentationOnly:true,
      deviceHealthCreatedByGlaze:false,
      maintenanceStateCreatedByGlaze:false,
      recoveryStateCreatedByGlaze:false,
      storageSafetyCreatedByGlaze:false,
      energyStateCreatedByGlaze:false,
      performanceStateCreatedByGlaze:false,
      serviceTruthCreatedByGlaze:false
    })
  });
}

function acceptanceBoundary(){
  return Object.freeze({
    sourceFoundationOnly:true,
    agentActivityImplemented:true,
    privacyAttentionImplemented:true,
    careSurfaceImplemented:true,
    providerIntegrationAcceptanceEstablished:false,
    privacyAcceptanceEstablished:false,
    securityAcceptanceEstablished:false,
    renderedAcceptanceEstablished:false,
    humanTruthCommunicationReviewEstablished:false,
    section48Accepted:false
  });
}

export const glazeV17TrustCareSurfacesDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.43',
  lifecycle:'Development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.3',
  v13SpecificationSections:Object.freeze([48]),
  requirementGroup:'trust-care-surfaces',
  surfaces:TRUST_CARE_SURFACES,
  agentActivityKinds:AGENT_ACTIVITY_KINDS,
  careDomains:CARE_DOMAINS,
  privacyAuthorityFoundationVersion:glazeV17PrivacyAuthorityBoundariesDevelopmentContract.version,
  performanceEnergyFoundationVersion:glazeV17PerformanceEnergyAwarenessDevelopmentContract.version,
  expressionSystemFoundationVersion:glazeV17ExpressionSystemDevelopmentContract.version,
  providerTruthCreatedByGlaze:false,
  privacyTruthCreatedByGlaze:false,
  securityTruthCreatedByGlaze:false,
  resultTrustworthinessInferredByGlaze:false,
  section48SourceComplete:false,
  acceptance:acceptanceBoundary()
});
