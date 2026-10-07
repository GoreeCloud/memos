/* GLAZE UI V1.7 — Reduced Motion Equivalents Development foundation.
 *
 * Bounded v1.2 Section 31 source layer over Signature Transition Families dev.16.
 * Every signature family receives a state-first Reduced Motion equivalent.
 * No raw timing, choreography, application-state, navigation, or provider authority
 * is introduced by this layer.
 */

import {
  resolveGlazeSignatureTransitionFamily,
  glazeV17SignatureTransitionFamiliesDevelopmentContract
} from './glaze-v1.7-signature-transition-families.dev.mjs';

const EQUIVALENTS=Object.freeze({
  'Glaze Bloom':Object.freeze({
    id:'bloom-opacity-shape-state-replacement',
    presentation:'opacity-shape-state-replacement',
    travel:'none',
    geometryTransition:'immediate-final-shape',
    emphasis:'restrained-opacity',
    destinationHighlight:'none'
  }),
  'Glaze Flow':Object.freeze({
    id:'flow-immediate-recomposition-brief-emphasis',
    presentation:'immediate-recomposition-with-brief-emphasis',
    travel:'none',
    geometryTransition:'immediate-final-layout',
    emphasis:'brief-static-emphasis',
    destinationHighlight:'none'
  }),
  'Glaze Lift':Object.freeze({
    id:'lift-opacity-no-travel',
    presentation:'opacity-change-without-travel',
    travel:'none',
    geometryTransition:'immediate-final-position',
    emphasis:'restrained-opacity',
    destinationHighlight:'none'
  }),
  'Glaze Veil':Object.freeze({
    id:'veil-immediate-hierarchy-restrained-fade',
    presentation:'immediate-hierarchy-change-with-restrained-fade',
    travel:'none',
    geometryTransition:'immediate-hierarchy-state',
    emphasis:'restrained-opacity',
    destinationHighlight:'none'
  }),
  'Glaze Fold':Object.freeze({
    id:'fold-immediate-layout-replacement',
    presentation:'immediate-layout-replacement',
    travel:'none',
    geometryTransition:'immediate-final-layout',
    emphasis:'none',
    destinationHighlight:'none'
  }),
  'Glaze Trace':Object.freeze({
    id:'trace-static-destination-highlight',
    presentation:'static-destination-highlight',
    travel:'none',
    geometryTransition:'immediate-destination-state',
    emphasis:'static-destination',
    destinationHighlight:'required-when-semantically-useful'
  }),
  'Glaze Settle':Object.freeze({
    id:'settle-direct-tracking-immediate-final-position',
    presentation:'direct-tracking-then-immediate-final-position',
    travel:'direct-manipulation-only',
    geometryTransition:'immediate-after-release',
    emphasis:'none',
    destinationHighlight:'none'
  }),
  'Glaze Focus Transfer':Object.freeze({
    id:'focus-transfer-immediate-focus-ring-update',
    presentation:'immediate-focus-ring-update',
    travel:'none',
    geometryTransition:'none',
    emphasis:'focus-ring-state',
    destinationHighlight:'focus-indicator'
  }),
  'Glaze Color Shift':Object.freeze({
    id:'color-shift-immediate-palette-replacement',
    presentation:'immediate-or-restrained-palette-replacement',
    travel:'none',
    geometryTransition:'none',
    emphasis:'optional-restrained-opacity',
    destinationHighlight:'none'
  }),
  'Glaze Material Shift':Object.freeze({
    id:'material-shift-immediate-material-replacement',
    presentation:'immediate-material-replacement',
    travel:'none',
    geometryTransition:'none',
    emphasis:'none',
    destinationHighlight:'none'
  }),
  'Standard transition':Object.freeze({
    id:'standard-immediate-state-replacement',
    presentation:'immediate-state-replacement',
    travel:'none',
    geometryTransition:'immediate-final-state',
    emphasis:'none',
    destinationHighlight:'none'
  })
});

function profiles(input){
  return Array.isArray(input.accessibilityProfiles)
    ? Object.freeze([...new Set(input.accessibilityProfiles.map(v=>String(v??'').trim().toLowerCase()).filter(Boolean))].slice(0,64))
    : Object.freeze([]);
}

function acceptanceBlock(){
  return Object.freeze({
    sourceFoundationOnly:true,
    section22Complete:false,
    section23Complete:false,
    section24Complete:false,
    section25Complete:false,
    section26Complete:false,
    section27Complete:false,
    section28Complete:false,
    section29Complete:false,
    section30Complete:false,
    section31Complete:false,
    reducedMotionEquivalentCatalogImplemented:true,
    renderedAcceptanceEstablished:false,
    nativePlatformAcceptanceEstablished:false,
    assistiveTechnologyAcceptanceEstablished:false,
    performanceAcceptanceEstablished:false,
    motionFatigueAcceptanceEstablished:false,
    humanMotionReviewEstablished:false,
    downstreamConsumerAcceptanceAutomatic:false,
    releasePromotionAutomatic:false,
    deploymentAcceptanceAutomatic:false,
    productionAcceptanceAutomatic:false
  });
}

export function resolveGlazeReducedMotionEquivalent(input={}){
  const family=resolveGlazeSignatureTransitionFamily(input);
  const accessibilityProfiles=profiles(input);
  const reducedMotion=accessibilityProfiles.includes('reduced-motion')
    || accessibilityProfiles.includes('minimal-motion')
    || family.accessibility.reducedMotionApplied===true;
  const familyName=family.choreography.family;
  const equivalent=EQUIVALENTS[familyName]??EQUIVALENTS['Standard transition'];

  return Object.freeze({
    version:'1.7.0-dev.23',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([31]),
    sourceFoundation:Object.freeze({
      signatureTransitionFamiliesVersion:glazeV17SignatureTransitionFamiliesDevelopmentContract.version,
      resolvedFamily:familyName,
      relationshipAccepted:family.sourceFoundation.relationshipAccepted,
      acceptedRelationship:family.sourceFoundation.acceptedRelationship
    }),
    accessibility:Object.freeze({
      profiles:accessibilityProfiles,
      reducedMotionApplied:reducedMotion,
      precedence:true,
      equivalentPresentationRequired:true,
      motionRequiredToUnderstandState:false,
      criticalInteractionMayRequireObservingMotion:false
    }),
    equivalent:Object.freeze({
      ...equivalent,
      applied:reducedMotion,
      family:familyName,
      statePreserved:true,
      meaningPreserved:true,
      focusPreserved:true,
      navigationPreserved:true,
      taskContinuityPreserved:true,
      directManipulationTrackingPreserved:true,
      finalStateDependsOnAnimationCompletion:false,
      semanticStateReduced:false,
      motionDependencyCreated:false
    }),
    execution:Object.freeze({
      presentationOnly:true,
      stateMutationPerformedByGlaze:false,
      navigationPerformedByGlaze:false,
      focusAuthorityCreatedByGlaze:false,
      taskIdentityCreatedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      directManipulationTrackingRemainsInputDriven:true
    }),
    family,
    glazeMotionBoundary:Object.freeze({
      experimentalFoundationVersion:'0.6.0',
      runtimeCompatibilityBaseline:'0.4.0',
      experimentalLifecyclePromoted:false
    }),
    acceptanceBoundary:acceptanceBlock()
  });
}

export const glazeV17ReducedMotionEquivalentsDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.23',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([31]),
  familyOrder:glazeV17SignatureTransitionFamiliesDevelopmentContract.familyOrder,
  equivalentCatalog:EQUIVALENTS,
  reducedMotionProfiles:Object.freeze(['reduced-motion','minimal-motion']),
  statePreserved:true,
  meaningPreserved:true,
  focusPreserved:true,
  navigationPreserved:true,
  taskContinuityPreserved:true,
  directManipulationTrackingPreserved:true,
  motionRequiredToUnderstandState:false,
  criticalInteractionMayRequireObservingMotion:false,
  finalStateDependsOnAnimationCompletion:false,
  presentationOnly:true,
  section31Complete:false,
  renderedAcceptanceEstablished:false,
  nativePlatformAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,
  performanceAcceptanceEstablished:false,
  motionFatigueAcceptanceEstablished:false,
  humanMotionReviewEstablished:false,
  glazeMotionExperimentalLifecyclePromoted:false
});
