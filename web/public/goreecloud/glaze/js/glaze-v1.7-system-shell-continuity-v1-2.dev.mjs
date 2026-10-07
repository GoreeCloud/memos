/* GLAZE UI V1.7 — System Shell Continuity v1.2 Development foundation.
 *
 * Bounded v1.2 Section 35 source layer over the historical dev.6 shell
 * continuity foundation and the dev.14-dev.25 semantic motion/performance stack.
 * It preserves task and provider truth immediately; optional motion may explain
 * shell relationships but never delays state, execution, focus, or navigation.
 */

import {
  resolveGlazeSystemShellContinuity,
  glazeV17SystemShellContinuityDevelopmentContract
} from './glaze-v1.7-system-shell-continuity.dev.mjs';
import {
  resolveGlazeSignatureTransitionFamily,
  glazeV17SignatureTransitionFamiliesDevelopmentContract
} from './glaze-v1.7-signature-transition-families.dev.mjs';
import {
  resolveGlazeMotionPerformance,
  glazeV17MotionPerformanceDevelopmentContract
} from './glaze-v1.7-motion-performance.dev.mjs';

const SECTION35_AREAS=Object.freeze([
  'notification-activity-presentation',
  'control-center',
  'multi-window',
  'split-view',
  'compact-expanded-navigation',
  'window-restoration',
  'application-system-handoff',
  'task-switching',
  'universal-search',
  'contextual-commands'
]);

const TRANSITION_RELATIONSHIPS=Object.freeze({
  'notification-activity-presentation':'transient-elevation',
  'control-center-layout':'workspace-recomposition',
  'multi-window-change':'workspace-recomposition',
  'split-view-change':'posture-partition',
  'compact-expanded-navigation':'workspace-recomposition',
  'window-restoration':'workspace-recomposition',
  'application-system-handoff':'source-destination-continuity',
  'task-switching':'source-destination-continuity',
  'shell-overlay':'context-overlay',
  'search-continuity':'same-object-expansion',
  'contextual-command-surface':'transient-elevation'
});

const SHELL_AREA_TO_SECTION35=Object.freeze({
  'notification-activity-presentation':'notification-activity-presentation',
  'control-center':'control-center',
  'persistent-control-center-layout':'control-center',
  'multi-window':'multi-window',
  'split-view':'split-view',
  'compact-expanded-navigation':'compact-expanded-navigation',
  'window-restoration':'window-restoration',
  'application-system-handoff':'application-system-handoff',
  'task-switching':'task-switching',
  'shell-overlays':'control-center',
  'search-continuity':'universal-search',
  'contextual-command-surfaces':'contextual-commands'
});

const PROHIBITED_KEYS=Object.freeze([
  'duration','durationMs','easing','curve','spring','physics','keyframes','path',
  'travelPx','distance','distancePx','rotation','scale','scaleFactor','overshoot',
  'bounce','wobble','stiffness','damping','dampingRatio','frameBudget','frameBudgetMs',
  'fpsTarget','targetFps','refreshRateHz','performanceMeasurements','performanceEvidence'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function rejectRawControls(input){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError('System Shell Continuity v1.2 accepts semantic shell state, not raw motion/performance controls: '+key);
    }
  }
}

function motionKindForRelationship(relationship){
  if(relationship==='same-object-expansion'||relationship==='source-destination-continuity')return 'connected-transformation';
  if(relationship==='workspace-recomposition'||relationship==='posture-partition')return 'adaptive-recomposition';
  return 'task-transition';
}

function motionInput(input,relationship){
  return {
    motionKind:motionKindForRelationship(relationship),
    accessibilityProfiles:input.accessibilityProfiles,
    activeMotion:input.activeMotion,
    repeatedActionPressure:input.repeatedActionPressure,
    majorTransitionActive:true,
    decorativeMotionRequested:false,
    runtimePressure:input.runtimePressure,
    runtimePressureAuthoritative:input.runtimePressureAuthoritative,
    powerSaving:input.powerSaving,
    powerSavingAuthoritative:input.powerSavingAuthoritative,
    thermalState:input.thermalState,
    thermalStateAuthoritative:input.thermalStateAuthoritative,
    hardwareClass:input.hardwareClass,
    hardwareClassAuthoritative:input.hardwareClassAuthoritative,
    refreshClass:input.refreshClass,
    refreshClassAuthoritative:input.refreshClassAuthoritative,
    performanceDegraded:input.performanceDegraded,
    performanceDegradedAuthoritative:input.performanceDegradedAuthoritative,
    visibilityClass:input.visibilityClass,
    visibilityClassAuthoritative:input.visibilityClassAuthoritative
  };
}

export function resolveGlazeSystemShellContinuityV12(input={}){
  if(!plainObject(input))throw new TypeError('System Shell Continuity v1.2 input must be a plain object');
  rejectRawControls(input);

  const base=resolveGlazeSystemShellContinuity(input);
  const relationship=TRANSITION_RELATIONSHIPS[base.transitionKind];
  const transitionAuthoritative=input.shellTransitionAuthoritative===true;
  const signature=resolveGlazeSignatureTransitionFamily({
    relationship,
    relationshipAuthoritative:transitionAuthoritative,
    objectIdentity:input.connectedIdentity,
    objectIdentityAuthoritative:input.connectedIdentityAuthoritative,
    accessibilityProfiles:input.accessibilityProfiles,
    activeMotion:input.activeMotion,
    userDriven:input.userDriven,
    fromState:input.fromMotionState,
    toState:input.toMotionState,
    criticalSurface:input.criticalSurface,
    criticalSurfaceAuthoritative:input.criticalSurfaceAuthoritative
  });
  const performance=resolveGlazeMotionPerformance(motionInput(input,relationship));
  const section35Area=SHELL_AREA_TO_SECTION35[base.shellArea];
  const signatureRelationshipAccepted=signature.sourceFoundation.relationshipAccepted===true;
  const motionPermitted=base.presentation.available&&transitionAuthoritative;
  const optionalMotionApplied=motionPermitted&&signatureRelationshipAccepted;

  return Object.freeze({
    version:'1.7.0-dev.27',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([35]),
    component:'GlazeSystemShellContinuityV12',
    section35Area,
    historicalFoundation:Object.freeze({
      version:glazeV17SystemShellContinuityDevelopmentContract.version,
      planNumbering:'v1.0-historical-numbering',
      historicalSpecificationSection:7,
      reinterpretedAsV12Section35:false
    }),
    shell:base,
    motion:Object.freeze({
      semanticRelationship:relationship,
      transitionAuthoritative,
      signatureFamily:signature.choreography.family,
      signatureFamilyId:signature.choreography.familyId,
      signatureRelationshipAccepted,
      optionalMotionApplied,
      performanceMode:performance.performance.mode,
      performanceDirective:performance.presentation.directive,
      reducedMotionApplied:signature.accessibility.reducedMotionApplied||performance.accessibility.reducedMotionApplied,
      stateFirst:true,
      artificialDelayAllowed:false,
      navigationMayWaitForMotion:false,
      focusMayWaitForMotion:false,
      shellExecutionMayWaitForMotion:false,
      taskStateMayWaitForMotion:false,
      finalStateDependsOnAnimationCompletion:false,
      motionRequiredToUnderstandState:false,
      shellNavigationMayBeSlowedForMotion:false
    }),
    continuity:Object.freeze({
      activeTaskPreserved:base.continuity.activeTaskPreserved,
      navigationDestinationPreserved:base.continuity.navigationDestinationPreserved,
      focusPreserved:base.continuity.focusPreserved,
      selectionPreserved:base.continuity.selectionPreserved,
      draftsPreserved:base.continuity.draftsPreserved,
      queryFilterContextPreserved:base.continuity.queryFilterContextPreserved,
      paneWindowStatePreserved:base.continuity.paneWindowStatePreserved,
      safePendingInteractionsPreserved:base.continuity.safePendingInteractionsPreserved,
      providerOwnedTruthPreserved:base.continuity.providerOwnedTruthPreserved,
      signatureMotionMayResetTask:false,
      performanceDegradationMayResetTask:false
    }),
    authority:Object.freeze({
      presentationOnly:true,
      shellCapabilityOwnedByCallerOrPlatform:true,
      shellTransitionOccurrenceOwnedByCallerOrPlatform:true,
      transitionRelationshipDerivedOnlyAfterAuthoritativeOccurrence:true,
      connectedIdentityOwnedByCallerOrProvider:true,
      providerTruthOwnedByProvider:true,
      shellStateCreatedByGlaze:false,
      shellExecutionPerformedByGlaze:false,
      navigationExecutedByGlaze:false,
      focusAuthorityCreatedByGlaze:false,
      notificationTruthCreatedByGlaze:false,
      activityTruthCreatedByGlaze:false,
      searchAuthorityCreatedByGlaze:false,
      commandExecutionAuthorityCreatedByGlaze:false,
      performanceTruthCreatedByGlaze:false
    }),
    dependencies:Object.freeze({
      historicalSystemShellContinuity:glazeV17SystemShellContinuityDevelopmentContract.version,
      signatureTransitionFamilies:glazeV17SignatureTransitionFamiliesDevelopmentContract.version,
      motionPerformance:glazeV17MotionPerformanceDevelopmentContract.version
    }),
    signatureMotion:signature,
    motionPerformance:performance,
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,
      section35Complete:false,
      renderedShellAcceptanceEstablished:false,
      nativePlatformAcceptanceEstablished:false,
      assistiveTechnologyAcceptanceEstablished:false,
      measuredPerformanceAcceptanceEstablished:false,
      physicalDeviceAcceptanceEstablished:false,
      energyAcceptanceEstablished:false,
      humanMotionReviewEstablished:false,
      downstreamConsumerAcceptanceAutomatic:false,
      releasePromotionAutomatic:false,
      deploymentAcceptanceAutomatic:false,
      productionAcceptanceAutomatic:false
    })
  });
}

export const glazeV17SystemShellContinuityV12DevelopmentContract=Object.freeze({
  version:'1.7.0-dev.27',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([35]),
  section35Areas:SECTION35_AREAS,
  transitionRelationships:TRANSITION_RELATIONSHIPS,
  historicalFoundationVersion:glazeV17SystemShellContinuityDevelopmentContract.version,
  historicalFoundationPlanNumbering:'v1.0-historical-numbering',
  historicalFoundationReinterpreted:false,
  signatureTransitionFamiliesVersion:glazeV17SignatureTransitionFamiliesDevelopmentContract.version,
  motionPerformanceVersion:glazeV17MotionPerformanceDevelopmentContract.version,
  transitionOccurrenceAuthorityRequired:true,
  artificialDelayAllowed:false,
  finalStateDependsOnAnimationCompletion:false,
  shellNavigationMayBeSlowedForMotion:false,
  presentationOnly:true,
  section35Complete:false,
  renderedShellAcceptanceEstablished:false,
  nativePlatformAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,
  measuredPerformanceAcceptanceEstablished:false,
  physicalDeviceAcceptanceEstablished:false,
  energyAcceptanceEstablished:false,
  humanMotionReviewEstablished:false,
  glazeMotionExperimentalLifecyclePromoted:false
});
