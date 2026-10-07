/* GLAZE UI V1.7 — Signature Motion Principles Development foundation.
 *
 * Bounded v1.2 Section 23 source layer over dev.14 Signature Motion semantics.
 * It makes principle policy machine-verifiable without claiming rendered,
 * measured-performance, native-platform, or Section 24 choreography acceptance.
 */

import {
  resolveGlazeSignatureMotion,
  glazeV17SignatureMotionSystemDevelopmentContract
} from './glaze-v1.7-signature-motion-system.dev.mjs';

const PRINCIPLE_IDS=Object.freeze([
  'respond-immediately',
  'move-with-purpose',
  'preserve-identity',
  'use-depth-meaningfully',
  'settle-quietly',
  'remain-interruptible',
  'never-block-state',
  'respect-accessibility'
]);

const RELATIONSHIP_POLICY=Object.freeze({
  'same-object-expansion':Object.freeze({purpose:'state-relationship',depthRole:'none',identityMode:'authoritative-required',settlingRole:'quiet'}),
  'workspace-recomposition':Object.freeze({purpose:'task-continuity',depthRole:'none',identityMode:'task-preserving',settlingRole:'quiet'}),
  'transient-elevation':Object.freeze({purpose:'hierarchy-change',depthRole:'transient-hierarchy',identityMode:'none',settlingRole:'quiet'}),
  'context-overlay':Object.freeze({purpose:'attention-hierarchy',depthRole:'overlay-hierarchy',identityMode:'none',settlingRole:'quiet'}),
  'posture-partition':Object.freeze({purpose:'workspace-structure',depthRole:'none',identityMode:'task-preserving',settlingRole:'quiet'}),
  'source-destination-continuity':Object.freeze({purpose:'source-destination',depthRole:'none',identityMode:'authoritative-required',settlingRole:'quiet'}),
  'direct-manipulation-settle':Object.freeze({purpose:'direct-manipulation',depthRole:'none',identityMode:'none',settlingRole:'precise'}),
  'focus-transfer':Object.freeze({purpose:'focus-relationship',depthRole:'none',identityMode:'focus-preserving',settlingRole:'quiet'}),
  'color-state-change':Object.freeze({purpose:'state-change',depthRole:'none',identityMode:'none',settlingRole:'quiet'}),
  'material-role-change':Object.freeze({purpose:'material-hierarchy',depthRole:'material-hierarchy',identityMode:'none',settlingRole:'quiet'})
});

const PROHIBITED_PRINCIPLE_KEYS=Object.freeze([
  'depth',
  'depthPx',
  'translateZ',
  'bounce',
  'wobble'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function rejectRawPrincipleControls(input){
  for(const key of PROHIBITED_PRINCIPLE_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(`Signature Motion Principles accept semantic intent, not raw principle control: ${key}`);
    }
  }
}

function stateBlockingSummary(motion){
  return Object.freeze({
    finalStateDependsOnAnimationCompletion:motion.presentation.finalStateDependsOnAnimationCompletion,
    focusBlockedByAnimation:false,
    navigationBlockedByAnimation:motion.interaction.navigationBlockedByAnimation,
    selectionBlockedByAnimation:motion.interaction.selectionBlockedByAnimation,
    closeBlockedByAnimation:motion.interaction.closeBlockedByAnimation,
    taskCompletionBlockedByAnimation:false
  });
}

export function resolveGlazeSignatureMotionPrinciples(input={}){
  if(!plainObject(input))throw new TypeError('Signature Motion Principles input must be a plain object');
  rejectRawPrincipleControls(input);

  const signatureMotion=resolveGlazeSignatureMotion(input);
  const requestedRelationship=signatureMotion.request.requestedRelationship;
  const acceptedRelationship=signatureMotion.request.acceptedRelationship;
  const policy=RELATIONSHIP_POLICY[requestedRelationship];
  const relationshipAccepted=acceptedRelationship!==null;
  const userControlled=signatureMotion.motion.interaction.userDriven===true
    ||signatureMotion.motion.interaction.directManipulation===true;
  const interruptibilityRequired=userControlled;
  const interruptibilitySatisfied=!interruptibilityRequired
    ||signatureMotion.motion.interaction.interruptible===true;
  const stateBlocking=stateBlockingSummary(signatureMotion.motion);

  return Object.freeze({
    version:'1.7.0-dev.15',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([23]),
    sourceFoundation:Object.freeze({
      signatureMotionSystemVersion:signatureMotion.version,
      signatureMotionSystemPlanSection:22,
      relationshipAccepted,
      requestedRelationship,
      acceptedRelationship
    }),
    principles:Object.freeze({
      respondImmediately:Object.freeze({
        artificialDelayAllowed:false,
        acknowledgementMode:'state-first',
        feedbackMayWaitForAnimationCompletion:false,
        measuredResponsivenessAcceptanceEstablished:false
      }),
      moveWithPurpose:Object.freeze({
        semanticRelationshipRequired:true,
        relationshipAccepted,
        purpose:relationshipAccepted?policy.purpose:'fallback-replacement',
        decorativeOnlyMotionDefault:false,
        arbitraryAnimationAccepted:false
      }),
      preserveIdentity:Object.freeze({
        identityMode:policy.identityMode,
        identityClaimApplied:signatureMotion.continuity.conceptualIdentitySame===true,
        authoritativeIdentityRequired:policy.identityMode==='authoritative-required',
        identityMayBeInferredByGlaze:false
      }),
      useDepthMeaningfully:Object.freeze({
        depthRole:relationshipAccepted?policy.depthRole:'none',
        depthMustCommunicateHierarchy:true,
        rawDepthControlAccepted:false,
        spectacleOnlyDepthAllowed:false
      }),
      settleQuietly:Object.freeze({
        settlingRole:relationshipAccepted?policy.settlingRole:'quiet',
        routineBounceAllowed:false,
        routineWobbleAllowed:false,
        repetitiveOvershootAllowed:false,
        restrainedSettlingRequired:true
      }),
      remainInterruptible:Object.freeze({
        userControlled,
        interruptibilityRequired,
        interruptibilitySatisfied,
        reversalMayBeBlockedByAnimation:signatureMotion.motion.interaction.reversalBlockedByAnimation
      }),
      neverBlockState:stateBlocking,
      respectAccessibility:Object.freeze({
        accessibilityPrecedence:true,
        reducedMotionPrecedence:true,
        reducedMotionApplied:signatureMotion.accessibility.reducedMotionApplied,
        equivalentPresentationRequired:true,
        directManipulationTrackingPreserved:signatureMotion.accessibility.directManipulationTrackingPreserved,
        motionRequiredToUnderstandState:false,
        expressionMayOverrideAccessibility:false
      })
    }),
    signatureMotion,
    authority:Object.freeze({
      presentationOnly:true,
      relationshipAuthorityInheritedFromDev14:true,
      identityAuthorityInheritedFromDev14:true,
      providerTruthCreatedByGlaze:false,
      objectIdentityCreatedByGlaze:false,
      hierarchyTruthCreatedByGlaze:false,
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
      section23Complete:false,
      section24ChoreographyComplete:false,
      measuredResponsivenessAcceptanceEstablished:false,
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

export const glazeV17SignatureMotionPrinciplesDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.15',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([23]),
  principleIds:PRINCIPLE_IDS,
  dependsOnSignatureMotionSystemVersion:glazeV17SignatureMotionSystemDevelopmentContract.version,
  artificialDelayAllowed:false,
  arbitraryAnimationAccepted:false,
  identityMayBeInferredByGlaze:false,
  rawDepthControlAccepted:false,
  routineBounceAllowed:false,
  userControlledTransitionsInterruptible:true,
  finalStateDependsOnAnimationCompletion:false,
  accessibilityPrecedence:true,
  glazeMotionExperimentalLifecyclePromoted:false,
  section22Complete:false,
  section23Complete:false,
  section24ChoreographyComplete:false,
  measuredResponsivenessAcceptanceEstablished:false,
  releasePromotionAutomatic:false,
  deploymentAcceptanceAutomatic:false,
  productionAcceptanceAutomatic:false
});
