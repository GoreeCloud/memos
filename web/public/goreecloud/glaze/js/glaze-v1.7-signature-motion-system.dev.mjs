/* GLAZE UI V1.7 — Signature Motion System Development foundation.
 *
 * First V1.7 v1.2-bound Development tranche.
 * Defines semantic Signature Motion vocabulary only. It does not implement
 * Section 24 choreography and does not promote Experimental Glaze Motion.
 */

import {
  resolveGlazeMotionPlan,
  resolveGlazeStateContinuity
} from './glaze-v1.6-focus-motion.dev.mjs';

const MOTION_PILLARS=Object.freeze([
  'continuity',
  'depth',
  'material',
  'precision',
  'quiet-settling'
]);

const RELATIONSHIP_CATALOG=Object.freeze({
  'same-object-expansion':Object.freeze({familyId:'glaze-bloom',family:'Glaze Bloom',baseFamily:'expand',magnitude:'medium',hierarchy:'primary',requiresObjectIdentityAuthority:true}),
  'workspace-recomposition':Object.freeze({familyId:'glaze-flow',family:'Glaze Flow',baseFamily:'move',magnitude:'medium',hierarchy:'primary',requiresObjectIdentityAuthority:false}),
  'transient-elevation':Object.freeze({familyId:'glaze-lift',family:'Glaze Lift',baseFamily:'enter',magnitude:'small',hierarchy:'secondary',requiresObjectIdentityAuthority:false}),
  'context-overlay':Object.freeze({familyId:'glaze-veil',family:'Glaze Veil',baseFamily:'enter',magnitude:'medium',hierarchy:'primary',requiresObjectIdentityAuthority:false}),
  'posture-partition':Object.freeze({familyId:'glaze-fold',family:'Glaze Fold',baseFamily:'reorder',magnitude:'medium',hierarchy:'primary',requiresObjectIdentityAuthority:false}),
  'source-destination-continuity':Object.freeze({familyId:'glaze-trace',family:'Glaze Trace',baseFamily:'move',magnitude:'small',hierarchy:'secondary',requiresObjectIdentityAuthority:true}),
  'direct-manipulation-settle':Object.freeze({familyId:'glaze-settle',family:'Glaze Settle',baseFamily:'move',magnitude:'small',hierarchy:'secondary',requiresObjectIdentityAuthority:false}),
  'focus-transfer':Object.freeze({familyId:'glaze-focus-transfer',family:'Glaze Focus Transfer',baseFamily:'focus',magnitude:'micro',hierarchy:'primary',requiresObjectIdentityAuthority:false}),
  'color-state-change':Object.freeze({familyId:'glaze-color-shift',family:'Glaze Color Shift',baseFamily:'replace',magnitude:'micro',hierarchy:'secondary',requiresObjectIdentityAuthority:false}),
  'material-role-change':Object.freeze({familyId:'glaze-material-shift',family:'Glaze Material Shift',baseFamily:'replace',magnitude:'small',hierarchy:'secondary',requiresObjectIdentityAuthority:false})
});

const SEMANTIC_RELATIONSHIPS=Object.freeze(Object.keys(RELATIONSHIP_CATALOG));
const SIGNATURE_FAMILIES=Object.freeze(SEMANTIC_RELATIONSHIPS.map(key=>RELATIONSHIP_CATALOG[key].family));
const PROHIBITED_RAW_KEYS=Object.freeze([
  'family',
  'signatureFamily',
  'requestedFamily',
  'duration',
  'durationMs',
  'easing',
  'spring',
  'physics',
  'keyframes',
  'stiffness',
  'damping',
  'overshoot'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function semanticId(value){
  return String(value??'').trim().toLowerCase();
}
function bounded(value,max=160){
  const text=String(value??'').trim();
  return text?text.slice(0,max):null;
}
function supplied(value,authoritative){
  return Object.freeze({
    requested:value??null,
    accepted:authoritative===true?(value??null):null,
    authoritative:authoritative===true,
    withheldWithoutAuthority:value!=null&&authoritative!==true
  });
}
function assertSemanticRequest(input){
  for(const key of PROHIBITED_RAW_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(`Signature Motion accepts semantic relationship intent, not raw motion parameter: ${key}`);
    }
  }
}
function relationshipEntry(value){
  const relationship=semanticId(value);
  if(!SEMANTIC_RELATIONSHIPS.includes(relationship)){
    throw new RangeError(`Unsupported Signature Motion semantic relationship: ${relationship}`);
  }
  return Object.freeze({relationship,definition:RELATIONSHIP_CATALOG[relationship]});
}
function reducedMotionActive(profiles){
  return Array.isArray(profiles)&&profiles
    .map(profile=>semanticId(profile))
    .some(profile=>profile==='reduced-motion'||profile==='minimal-motion');
}

export function resolveGlazeSignatureMotion(input={}){
  if(!plainObject(input))throw new TypeError('Signature Motion input must be a plain object');
  assertSemanticRequest(input);

  const {relationship,definition}=relationshipEntry(input.relationship);
  const relationshipAuthoritative=input.relationshipAuthoritative===true;
  const objectIdentity=supplied(bounded(input.objectIdentity),input.objectIdentityAuthoritative);
  const identityAuthoritySatisfied=!definition.requiresObjectIdentityAuthority
    ||(objectIdentity.authoritative&&objectIdentity.accepted!==null);
  const signatureFamilyApplied=relationshipAuthoritative&&identityAuthoritySatisfied;

  const baseFamily=signatureFamilyApplied?definition.baseFamily:'replace';
  const magnitude=signatureFamilyApplied?definition.magnitude:'micro';
  const hierarchy=signatureFamilyApplied?definition.hierarchy:'secondary';
  const directManipulation=relationship==='direct-manipulation-settle'||input.directManipulation===true;

  const motion=resolveGlazeMotionPlan({
    family:baseFamily,
    magnitude,
    surfaceHierarchy:hierarchy,
    accessibilityProfiles:input.accessibilityProfiles,
    activeMotion:input.activeMotion,
    budget:input.budget,
    userDriven:input.userDriven!==false,
    directManipulation
  });

  const continuity=resolveGlazeStateContinuity({
    fromState:bounded(input.fromState,100)??'before',
    toState:bounded(input.toState,100)??'after',
    conceptualIdentitySame:signatureFamilyApplied&&definition.requiresObjectIdentityAuthority,
    accessibilityProfiles:input.accessibilityProfiles
  });

  const reducedMotion=reducedMotionActive(input.accessibilityProfiles)||motion.accessibility.reducedMotionApplied;

  return Object.freeze({
    version:'1.7.0-dev.14',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([22]),
    request:Object.freeze({
      requestedRelationship:relationship,
      acceptedRelationship:signatureFamilyApplied?relationship:null,
      relationshipAuthoritative,
      relationshipWithheldWithoutAuthority:!relationshipAuthoritative,
      objectIdentity
    }),
    signature:Object.freeze({
      familyId:signatureFamilyApplied?definition.familyId:'standard-transition',
      family:signatureFamilyApplied?definition.family:'Standard transition',
      signatureFamilyApplied,
      motionPillars:MOTION_PILLARS,
      semanticIntentOnly:true,
      arbitraryAnimationAccepted:false
    }),
    motion,
    continuity,
    accessibility:Object.freeze({
      reducedMotionApplied:reducedMotion,
      equivalentPresentationRequired:true,
      directManipulationTrackingPreserved:directManipulation,
      motionRequiredToUnderstandState:false,
      accessibilityOutranksExpression:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      semanticRelationshipCreatedByGlaze:false,
      objectIdentityCreatedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      securityTruthCreatedByGlaze:false,
      privacyTruthCreatedByGlaze:false,
      stateChangedByMotion:false,
      actionExecutedByMotion:false,
      navigationExecutedByMotion:false,
      permissionGrantedByMotion:false,
      consentCreatedByMotion:false
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
      section23PrinciplesComplete:false,
      section24ChoreographyComplete:false,
      renderedAcceptanceRequired:true,
      nativePlatformAcceptanceRequired:true,
      assistiveTechnologyAcceptanceRequired:true,
      performanceAcceptanceRequired:true,
      motionFatigueAcceptanceRequired:true,
      humanMotionReviewRequired:true,
      downstreamConsumerAcceptanceAutomatic:false,
      releasePromotionAutomatic:false,
      deploymentAcceptanceAutomatic:false,
      productionAcceptanceAutomatic:false
    })
  });
}

export const glazeV17SignatureMotionSystemDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.14',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([22]),
  motionPillars:MOTION_PILLARS,
  semanticRelationships:SEMANTIC_RELATIONSHIPS,
  signatureFamilies:SIGNATURE_FAMILIES,
  semanticIntentOnly:true,
  rawMotionParameterControl:false,
  reducedMotionPrecedence:true,
  finalStateDependsOnAnimationCompletion:false,
  presentationOnly:true,
  glazeMotionExperimentalLifecyclePromoted:false,
  section22Complete:false,
  section23PrinciplesComplete:false,
  section24ChoreographyComplete:false,
  releasePromotionAutomatic:false,
  deploymentAcceptanceAutomatic:false,
  productionAcceptanceAutomatic:false
});
