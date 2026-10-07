/* GLAZE UI V1.7 — Notification and Activity Surfaces v1.2 Development foundation.
 *
 * Bounded v1.2 Section 36 source layer over historical dev.7 notification/activity
 * presentation plus governed Signature Motion and Motion Performance foundations.
 * Provider truth, transition occurrence, and connected identity remain externally owned.
 */
import {
  resolveGlazeNotificationActivitySurface,
  glazeV17NotificationActivitySurfacesDevelopmentContract
} from './glaze-v1.7-notification-activity-surfaces.dev.mjs';
import {
  resolveGlazeSignatureTransitionFamily,
  glazeV17SignatureTransitionFamiliesDevelopmentContract
} from './glaze-v1.7-signature-transition-families.dev.mjs';
import {
  resolveGlazeMotionPerformance,
  glazeV17MotionPerformanceDevelopmentContract
} from './glaze-v1.7-motion-performance.dev.mjs';

const TRANSITION_KINDS=Object.freeze(['progress','completion','recovery','arrival','expansion','dismissal']);
const RELATIONSHIP=Object.freeze({
  progress:'color-state-change',
  completion:'material-role-change',
  recovery:'material-role-change',
  arrival:'transient-elevation',
  expansion:'same-object-expansion',
  dismissal:'transient-elevation'
});
const PROHIBITED_KEYS=Object.freeze([
  'duration','durationMs','easing','curve','spring','physics','keyframes','path','travelPx',
  'distance','distancePx','rotation','scale','scaleFactor','overshoot','bounce','wobble',
  'stiffness','damping','dampingRatio','frameBudget','frameBudgetMs','fpsTarget','targetFps'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function semantic(value,fallback=null){
  const normalized=String(value??'').trim().toLowerCase();
  return normalized||fallback;
}
function member(value,allowed,label,fallback=null){
  const normalized=semantic(value,fallback);
  if(!allowed.includes(normalized))throw new RangeError('Unsupported '+label+': '+normalized);
  return normalized;
}
function rejectRawControls(input){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError('Notification and Activity Surfaces v1.2 accepts semantic state, not raw motion/performance controls: '+key);
    }
  }
}
function truthSatisfied(kind,base){
  if(kind==='progress')return base.progress.authoritative===true&&!['none','unknown'].includes(base.progress.acceptedMode);
  if(kind==='completion'||kind==='recovery')return base.truth.authoritative===true;
  return true;
}
function motionKind(kind){
  if(kind==='expansion')return 'connected-transformation';
  if(kind==='progress'||kind==='completion'||kind==='recovery')return 'material';
  return 'task-transition';
}
function performanceInput(input,kind){
  return {
    motionKind:motionKind(kind),
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

export function resolveGlazeNotificationActivitySurfaceV12(input={}){
  if(!plainObject(input))throw new TypeError('Notification and Activity Surfaces v1.2 input must be a plain object');
  rejectRawControls(input);
  const base=resolveGlazeNotificationActivitySurface(input);
  const transitionKind=member(input.transitionKind,TRANSITION_KINDS,'notification/activity transition kind');
  const relationship=RELATIONSHIP[transitionKind];
  const transitionAuthoritative=input.transitionAuthoritative===true;
  const providerTruthSatisfied=truthSatisfied(transitionKind,base);
  const signature=resolveGlazeSignatureTransitionFamily({
    relationship,
    relationshipAuthoritative:transitionAuthoritative&&providerTruthSatisfied,
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
  const performance=resolveGlazeMotionPerformance(performanceInput(input,transitionKind));
  const motionApplied=base.presentation!==null
    &&transitionAuthoritative
    &&providerTruthSatisfied
    &&signature.sourceFoundation.relationshipAccepted===true;
  const persistentPulsingRequested=input.persistentPulsing===true;

  return Object.freeze({
    version:'1.7.0-dev.28',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([36]),
    component:'GlazeNotificationActivitySurfaceV12',
    historicalFoundation:Object.freeze({
      version:glazeV17NotificationActivitySurfacesDevelopmentContract.version,
      planNumbering:'v1.0-historical-numbering',
      historicalSpecificationSection:8,
      reinterpretedAsV12Section36:false
    }),
    surface:base,
    transition:Object.freeze({
      kind:transitionKind,
      authoritative:transitionAuthoritative,
      providerTruthSatisfied,
      semanticRelationship:relationship,
      signatureFamily:signature.choreography.family,
      signatureRelationshipAccepted:signature.sourceFoundation.relationshipAccepted,
      optionalMotionApplied:motionApplied,
      finalStateDependsOnAnimationCompletion:false,
      progressTruthDependsOnAnimation:false,
      completionTruthDependsOnAnimation:false,
      recoveryTruthDependsOnAnimation:false,
      dismissalTruthDependsOnAnimation:false
    }),
    attention:Object.freeze({
      attentionRequired:base.presentation.attentionRequired,
      persistentPulsingRequested,
      persistentPulsingApplied:false,
      persistentPulsingDefault:false,
      continuousAttentionAnimationAllowed:false,
      staticSemanticEmphasisAvailable:true,
      defaultCue:base.presentation.attentionRequired?'static-semantic-emphasis':'none'
    }),
    accessibility:Object.freeze({
      reducedMotionApplied:signature.accessibility.reducedMotionApplied||performance.accessibility.reducedMotionApplied,
      motionRequiredToUnderstandState:false,
      progressMeaningIndependentOfMotion:true,
      completionMeaningIndependentOfMotion:true,
      recoveryMeaningIndependentOfMotion:true,
      focusStateIndependentOfAnimation:true
    }),
    performance:Object.freeze({
      mode:performance.performance.mode,
      directive:performance.presentation.directive,
      optionalMotionMaySimplify:true,
      optionalMotionMayBeRemoved:true,
      continuousAttentionAnimationAllowed:false,
      measuredPerformanceAcceptanceEstablished:false
    }),
    authority:Object.freeze({
      presentationOnly:true,
      providerTruthOwnedByProvider:true,
      progressTruthOwnedByProvider:true,
      transitionOccurrenceOwnedByCallerOrProvider:true,
      notificationTruthCreatedByGlaze:false,
      activityTruthCreatedByGlaze:false,
      progressTruthCreatedByGlaze:false,
      completionTruthCreatedByGlaze:false,
      recoveryTruthCreatedByGlaze:false,
      objectIdentityCreatedByGlaze:false,
      actionExecutedByGlaze:false,
      backgroundTaskExecutionPerformedByGlaze:false,
      systemNotificationPermissionGrantedByGlaze:false
    }),
    dependencies:Object.freeze({
      historicalNotificationActivitySurfaces:glazeV17NotificationActivitySurfacesDevelopmentContract.version,
      signatureTransitionFamilies:glazeV17SignatureTransitionFamiliesDevelopmentContract.version,
      motionPerformance:glazeV17MotionPerformanceDevelopmentContract.version
    }),
    signatureMotion:signature,
    motionPerformance:performance,
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,
      section36Complete:false,
      renderedAcceptanceEstablished:false,
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

export const glazeV17NotificationActivitySurfacesV12DevelopmentContract=Object.freeze({
  version:'1.7.0-dev.28',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([36]),
  transitionKinds:TRANSITION_KINDS,
  transitionRelationships:RELATIONSHIP,
  historicalFoundationVersion:glazeV17NotificationActivitySurfacesDevelopmentContract.version,
  historicalFoundationPlanNumbering:'v1.0-historical-numbering',
  historicalFoundationReinterpreted:false,
  persistentPulsingDefault:false,
  continuousAttentionAnimationAllowed:false,
  providerTruthAuthorityRequired:true,
  transitionOccurrenceAuthorityRequired:true,
  finalStateDependsOnAnimationCompletion:false,
  section36Complete:false,
  renderedAcceptanceEstablished:false,
  nativePlatformAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,
  measuredPerformanceAcceptanceEstablished:false,
  physicalDeviceAcceptanceEstablished:false,
  energyAcceptanceEstablished:false,
  humanMotionReviewEstablished:false,
  glazeMotionExperimentalLifecyclePromoted:false
});
