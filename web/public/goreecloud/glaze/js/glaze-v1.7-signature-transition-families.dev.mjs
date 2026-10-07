/* GLAZE UI V1.7 — Signature Transition Families Development foundation.
 *
 * Bounded v1.2 Section 24 source layer over dev.14/dev.15.
 * Defines semantic choreography descriptors and accessibility fallbacks only.
 * It does not claim rendered/native choreography acceptance.
 */

import {
  resolveGlazeSignatureMotionPrinciples,
  glazeV17SignatureMotionPrinciplesDevelopmentContract
} from './glaze-v1.7-signature-motion-principles.dev.mjs';

const FAMILY_CATALOG=Object.freeze({
  'Glaze Bloom':Object.freeze({id:'glaze-bloom',relationship:'same-object-expansion',intent:'same-thing-expanded',channels:Object.freeze(['shape','position','material','content-hierarchy']),requiresIdentity:true,reducedMotion:'state-preserving-crossfade'}),
  'Glaze Flow':Object.freeze({id:'glaze-flow',relationship:'workspace-recomposition',intent:'workspace-changed-task-preserved',channels:Object.freeze(['position','pane-geometry','hierarchy']),requiresIdentity:false,reducedMotion:'instant-recomposition-with-focus-continuity'}),
  'Glaze Lift':Object.freeze({id:'glaze-lift',relationship:'transient-elevation',intent:'transient-hierarchy-emerged',channels:Object.freeze(['depth','material','opacity','position']),requiresIdentity:false,reducedMotion:'opacity-and-hierarchy-state'}),
  'Glaze Veil':Object.freeze({id:'glaze-veil',relationship:'context-overlay',intent:'context-remains-attention-moved-above',channels:Object.freeze(['scrim','foreground-material','hierarchy','opacity']),requiresIdentity:false,reducedMotion:'immediate-hierarchy-with-restrained-opacity'}),
  'Glaze Fold':Object.freeze({id:'glaze-fold',relationship:'posture-partition',intent:'workspace-partition-changed',channels:Object.freeze(['pane-geometry','position','hierarchy']),requiresIdentity:false,reducedMotion:'instant-partition-with-task-continuity'}),
  'Glaze Trace':Object.freeze({id:'glaze-trace',relationship:'source-destination-continuity',intent:'source-connected-to-destination',channels:Object.freeze(['position','highlight','material','edge-emphasis']),requiresIdentity:true,reducedMotion:'source-destination-emphasis'}),
  'Glaze Settle':Object.freeze({id:'glaze-settle',relationship:'direct-manipulation-settle',intent:'manipulation-resolved-precisely',channels:Object.freeze(['position','geometry']),requiresIdentity:false,reducedMotion:'direct-tracking-then-immediate-rest'}),
  'Glaze Focus Transfer':Object.freeze({id:'glaze-focus-transfer',relationship:'focus-transfer',intent:'focus-moved-between-related-regions',channels:Object.freeze(['focus-emphasis','edge-emphasis','material']),requiresIdentity:false,reducedMotion:'immediate-focus-state-with-emphasis'}),
  'Glaze Color Shift':Object.freeze({id:'glaze-color-shift',relationship:'color-state-change',intent:'color-context-changed-coherently',channels:Object.freeze(['semantic-color','accent','atmosphere']),requiresIdentity:false,reducedMotion:'immediate-semantic-color-with-optional-restrained-fade'}),
  'Glaze Material Shift':Object.freeze({id:'glaze-material-shift',relationship:'material-role-change',intent:'surface-material-role-changed',channels:Object.freeze(['material','tint','border','luminosity','depth']),requiresIdentity:false,reducedMotion:'immediate-material-role-state'})
});

const FAMILY_ORDER=Object.freeze(Object.keys(FAMILY_CATALOG));
const RELATIONSHIP_TO_FAMILY=Object.freeze(Object.fromEntries(
  FAMILY_ORDER.map(name=>[FAMILY_CATALOG[name].relationship,name])
));

const PROHIBITED_KEYS=Object.freeze([
  'family','signatureFamily','requestedFamily','duration','durationMs','easing','spring','physics',
  'keyframes','path','travelPx','distance','rotation','overshoot','bounce','wobble'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function rejectRawChoreography(input){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(`Signature Transition Families accept semantic intent, not raw choreography control: ${key}`);
    }
  }
}

function profiles(input){
  return Array.isArray(input.accessibilityProfiles)
    ? input.accessibilityProfiles.map(value=>String(value??'').trim().toLowerCase())
    : [];
}

function authoritativeBoolean(value,authoritative){
  return Object.freeze({
    requested:value===true,
    accepted:authoritative===true?value===true:false,
    authoritative:authoritative===true,
    withheldWithoutAuthority:value===true&&authoritative!==true
  });
}

function channelPolicy(familyName,reducedMotion,reducedTransparency,criticalSurface){
  const base=FAMILY_CATALOG[familyName]?.channels??Object.freeze([]);
  const spatial=new Set(['position','pane-geometry','shape','depth']);
  const channels=base.map(channel=>Object.freeze({
    channel,
    enabled:!(reducedMotion&&spatial.has(channel)),
    reason:reducedMotion&&spatial.has(channel)?'reduced-motion':'semantic-family'
  }));
  if(familyName==='Glaze Material Shift'&&reducedTransparency){
    return Object.freeze(channels.map(entry=>entry.channel==='material'
      ?Object.freeze({...entry,mode:'solid-fallback',enabled:true})
      :entry));
  }
  if(familyName==='Glaze Veil'&&criticalSurface){
    return Object.freeze(channels.map(entry=>entry.channel==='foreground-material'
      ?Object.freeze({...entry,mode:'certainty-first-solid-capable',enabled:true})
      :entry));
  }
  return Object.freeze(channels);
}

export function resolveGlazeSignatureTransitionFamily(input={}){
  if(!plainObject(input))throw new TypeError('Signature Transition Families input must be a plain object');
  rejectRawChoreography(input);

  const principles=resolveGlazeSignatureMotionPrinciples(input);
  const acceptedRelationship=principles.sourceFoundation.acceptedRelationship;
  const familyName=acceptedRelationship?RELATIONSHIP_TO_FAMILY[acceptedRelationship]:null;
  const family=familyName?FAMILY_CATALOG[familyName]:null;
  const accessibilityProfiles=profiles(input);
  const reducedMotion=principles.principles.respectAccessibility.reducedMotionApplied===true;
  const reducedTransparency=accessibilityProfiles.includes('reduced-transparency')
    ||accessibilityProfiles.includes('opaque-materials');
  const criticalSurface=authoritativeBoolean(input.criticalSurface,input.criticalSurfaceAuthoritative);

  return Object.freeze({
    version:'1.7.0-dev.16',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([24]),
    sourceFoundation:Object.freeze({
      signatureMotionSystemVersion:'1.7.0-dev.14',
      signatureMotionPrinciplesVersion:principles.version,
      relationshipAccepted:acceptedRelationship!==null,
      acceptedRelationship
    }),
    choreography:Object.freeze({
      family:familyName??'Standard transition',
      familyId:family?.id??'standard-transition',
      semanticIntent:family?.intent??'state-first-standard-transition',
      channels:channelPolicy(familyName,reducedMotion,reducedTransparency,criticalSurface.accepted),
      directFamilyRequestAccepted:false,
      rawChoreographyControlAccepted:false,
      renderedChoreographyAcceptanceEstablished:false
    }),
    familyRules:Object.freeze({
      bloomSameObjectClaimRequiresAuthoritativeIdentity:familyName==='Glaze Bloom'||familyName==='Glaze Trace',
      veilCriticalSurfaceCertaintyFirst:familyName==='Glaze Veil'&&criticalSurface.accepted,
      veilTranslucencyRequired:false,
      foldLiteralFoldSimulationAllowed:false,
      traceContinuousDecorativeTrailAllowed:false,
      settleRoutineBounceAllowed:false,
      focusStateIndependentOfAnimation:true,
      colorProtectedSemanticMeaningImmediate:true,
      materialReducedTransparencySolidEquivalent:true
    }),
    accessibility:Object.freeze({
      reducedMotionApplied:reducedMotion,
      reducedMotionEquivalent:family?.reducedMotion??'state-first-standard-transition',
      reducedTransparencyApplied:reducedTransparency,
      equivalentPresentationRequired:true,
      directManipulationTrackingPreserved:principles.principles.respectAccessibility.directManipulationTrackingPreserved,
      focusStateIndependentOfAnimation:true,
      protectedSemanticMeaningImmediate:true,
      motionRequiredToUnderstandState:false,
      accessibilityOutranksExpression:true
    }),
    context:Object.freeze({criticalSurface}),
    principles,
    authority:Object.freeze({
      presentationOnly:true,
      relationshipAuthorityInheritedFromDev14:true,
      identityAuthorityInheritedFromDev14:true,
      principlePolicyInheritedFromDev15:true,
      providerTruthCreatedByGlaze:false,
      objectIdentityCreatedByGlaze:false,
      criticalityCreatedByGlaze:false,
      focusAuthorityCreatedByGlaze:false,
      semanticColorMeaningCreatedByGlaze:false,
      materialRoleCreatedByGlaze:false,
      stateChangedByMotion:false,
      actionExecutedByMotion:false,
      navigationExecutedByMotion:false
    }),
    glazeMotionBoundary:Object.freeze({
      experimentalFoundationVersion:'0.6.0',
      runtimeCompatibilityBaseline:'0.4.0',
      experimentalLifecyclePromoted:false,
      motionStudioPromoted:false,
      motionSpatialPromoted:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,
      section22Complete:false,
      section23Complete:false,
      section24Complete:false,
      familyCatalogImplemented:true,
      renderedChoreographyAcceptanceEstablished:false,
      nativePlatformAcceptanceEstablished:false,
      assistiveTechnologyAcceptanceEstablished:false,
      performanceAcceptanceEstablished:false,
      motionFatigueAcceptanceEstablished:false,
      humanMotionReviewEstablished:false,
      downstreamConsumerAcceptanceAutomatic:false,
      releasePromotionAutomatic:false,
      deploymentAcceptanceAutomatic:false,
      productionAcceptanceAutomatic:false
    })
  });
}

export const glazeV17SignatureTransitionFamiliesDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.16',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([24]),
  familyOrder:FAMILY_ORDER,
  dependsOnSignatureMotionPrinciplesVersion:glazeV17SignatureMotionPrinciplesDevelopmentContract.version,
  directFamilyRequestAccepted:false,
  rawChoreographyControlAccepted:false,
  reducedMotionPrecedence:true,
  reducedTransparencyPrecedence:true,
  finalStateDependsOnAnimationCompletion:false,
  glazeMotionExperimentalLifecyclePromoted:false,
  section22Complete:false,
  section23Complete:false,
  section24Complete:false,
  familyCatalogImplemented:true,
  renderedChoreographyAcceptanceEstablished:false,
  releasePromotionAutomatic:false,
  deploymentAcceptanceAutomatic:false,
  productionAcceptanceAutomatic:false
});
