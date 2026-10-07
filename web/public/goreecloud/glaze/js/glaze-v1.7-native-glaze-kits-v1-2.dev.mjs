/* GLAZE UI V1.7 — Native Glaze Kits v1.2 Development foundation.
 *
 * Bounded v1.2 Section 37 source layer over historical dev.9 native semantic
 * mappings plus governed Signature Motion and Motion Performance foundations.
 * Shared motion character is semantic; native choreography remains platform-owned.
 */

import {
  resolveGlazeNativeKit,
  glazeV17NativeGlazeKitsDevelopmentContract
} from './glaze-v1.7-native-glaze-kits.dev.mjs';
import {
  resolveGlazeSignatureTransitionFamily,
  glazeV17SignatureTransitionFamiliesDevelopmentContract
} from './glaze-v1.7-signature-transition-families.dev.mjs';
import {
  resolveGlazeMotionPerformance,
  glazeV17MotionPerformanceDevelopmentContract
} from './glaze-v1.7-motion-performance.dev.mjs';

const PLATFORMS=Object.freeze(['android-compose','apple-swiftui','web','linux-native']);
const RELATIONSHIPS=Object.freeze([
  'same-object-expansion',
  'workspace-recomposition',
  'transient-elevation',
  'context-overlay',
  'posture-partition',
  'source-destination-continuity',
  'direct-manipulation-settle',
  'focus-transfer',
  'color-state-change',
  'material-role-change'
]);
const MOTION_CHARACTER=Object.freeze(['continuity','depth','material','precision','quiet-settling']);
const AVAILABILITY=Object.freeze(['available','unavailable','unknown']);

const PLATFORM_MOTION_BRIDGES=Object.freeze({
  'android-compose':Object.freeze({
    framework:'Jetpack Compose',
    preferredPrimitiveClass:'state-driven-compose-or-android-native-motion',
    systemMotionPreferenceBridge:'android-platform-accessibility-and-animation-settings'
  }),
  'apple-swiftui':Object.freeze({
    framework:'SwiftUI',
    preferredPrimitiveClass:'state-driven-swiftui-or-apple-native-motion',
    systemMotionPreferenceBridge:'swiftui-accessibility-reduce-motion'
  }),
  web:Object.freeze({
    framework:'Web Platform',
    preferredPrimitiveClass:'css-transitions-or-web-animations-native-browser-motion',
    systemMotionPreferenceBridge:'prefers-reduced-motion'
  }),
  'linux-native':Object.freeze({
    framework:'Supported Linux native UI toolkit',
    preferredPrimitiveClass:'supported-native-toolkit-motion',
    systemMotionPreferenceBridge:'desktop-toolkit-reduced-motion-or-animation-setting'
  })
});

const PROHIBITED_KEYS=Object.freeze([
  'duration','durationMs','easing','curve','timingFunction','spring','physics','animationSpec',
  'nativeAnimationSpec','keyframes','path','travelPx','distance','distancePx','rotation',
  'scale','scaleFactor','overshoot','bounce','wobble','stiffness','damping','dampingRatio',
  'frameBudget','frameBudgetMs','fpsTarget','targetFps','refreshRateHz'
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
      throw new RangeError('Native Glaze Kits v1.2 accepts semantic intent, not raw cross-platform animation controls: '+key);
    }
  }
}

function governedAvailability(value,authoritative){
  const requested=member(value,AVAILABILITY,'native motion capability','unknown');
  const trusted=requested==='unknown'||authoritative===true;
  const accepted=trusted?requested:'unknown';
  return Object.freeze({
    requested,
    accepted,
    authoritative:requested==='unknown'||authoritative===true,
    presentAsAvailable:accepted==='available',
    withheldWithoutAuthority:requested!=='unknown'&&authoritative!==true
  });
}

function motionKindForRelationship(relationship){
  if(relationship==='same-object-expansion'||relationship==='source-destination-continuity')return 'connected-transformation';
  if(relationship==='workspace-recomposition'||relationship==='posture-partition')return 'adaptive-recomposition';
  if(relationship==='material-role-change')return 'material';
  if(relationship==='direct-manipulation-settle')return 'direct-manipulation';
  return 'task-transition';
}

function performanceInput(input,relationship){
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
    visibilityClassAuthoritative:input.visibilityClassAuthoritative,
    directManipulation:relationship==='direct-manipulation-settle'
  };
}

function platformDirective(bridge,eligible,performance,reducedMotion){
  if(!eligible)return 'state-first-native-equivalent-or-static';
  if(reducedMotion)return 'use-platform-reduced-motion-semantic-equivalent';
  if(performance.performance.mode==='minimal')return 'use-minimal-native-semantic-transition-or-immediate-state';
  if(performance.performance.mode==='simplified')return 'use-simplified-native-semantic-transition';
  if(performance.performance.mode==='restrained')return 'use-restrained-'+bridge.preferredPrimitiveClass;
  return bridge.preferredPrimitiveClass;
}

export function resolveGlazeNativeKitMotionV12(input={}){
  if(!plainObject(input))throw new TypeError('Native Glaze Kits v1.2 input must be a plain object');
  rejectRawControls(input);

  const base=resolveGlazeNativeKit(input);
  const platform=member(base.platform,PLATFORMS,'Native Glaze platform');
  const relationship=member(input.relationship,RELATIONSHIPS,'native semantic motion relationship');
  const bridge=PLATFORM_MOTION_BRIDGES[platform];
  const nativeMotionCapability=governedAvailability(
    input.nativeMotionCapabilityState,
    input.nativeMotionCapabilityAuthoritative
  );

  const signature=resolveGlazeSignatureTransitionFamily({
    relationship,
    relationshipAuthoritative:input.relationshipAuthoritative,
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
  const performance=resolveGlazeMotionPerformance(performanceInput(input,relationship));
  const reducedMotion=signature.accessibility.reducedMotionApplied===true
    ||performance.accessibility.reducedMotionApplied===true;

  const platformCapabilityAvailable=base.capabilities.platform.presentAsAvailable===true;
  const relationshipAccepted=signature.sourceFoundation.relationshipAccepted===true;
  const semanticTransitionEligible=
    platformCapabilityAvailable
    &&nativeMotionCapability.presentAsAvailable
    &&relationshipAccepted;

  return Object.freeze({
    version:'1.7.0-dev.29',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([37]),
    component:'GlazeNativeKitMotionV12',
    historicalFoundation:Object.freeze({
      version:glazeV17NativeGlazeKitsDevelopmentContract.version,
      planNumbering:'v1.1-historical-numbering',
      historicalSpecificationSection:24,
      reinterpretedAsV12Section37:false
    }),
    nativeKit:base,
    platformMotion:Object.freeze({
      platform,
      framework:bridge.framework,
      nativeMotionCapability,
      preferredPrimitiveClass:bridge.preferredPrimitiveClass,
      systemMotionPreferenceBridge:bridge.systemMotionPreferenceBridge,
      platformCapabilityAvailable,
      semanticTransitionEligible,
      directive:platformDirective(bridge,semanticTransitionEligible,performance,reducedMotion),
      implementationAuthority:'platform-and-application',
      nativePrimitiveSelectionOwnedByPlatformOrApplication:true,
      nativeInteractionBehaviorPreserved:true,
      nativeAccessibilitySettingsPreserved:true,
      nativeRenderingArchitecturePreserved:true,
      nativePerformanceCharacteristicsPreserved:true,
      identicalAnimationImplementationRequired:false,
      exactTimingEqualityRequired:false,
      exactCurveEqualityRequired:false,
      exactPathEqualityRequired:false,
      exactPhysicsEqualityRequired:false
    }),
    semanticMotion:Object.freeze({
      relationship,
      relationshipAuthoritative:input.relationshipAuthoritative===true,
      family:signature.choreography.family,
      familyId:signature.choreography.familyId,
      semanticIntent:signature.choreography.semanticIntent,
      relationshipAccepted,
      sharedMotionCharacter:MOTION_CHARACTER,
      semanticFamilyConsistencyRequired:true,
      semanticIntentConsistencyRequired:true,
      stateMeaningConsistencyRequired:true,
      motionCharacterConsistencyRequired:true,
      rawAnimationControlsAccepted:false,
      animationRequired:false,
      stateFirstFallbackRequired:true,
      finalStateDependsOnAnimationCompletion:false,
      navigationMayWaitForMotion:false,
      focusMayWaitForMotion:false,
      taskCompletionMayWaitForMotion:false
    }),
    accessibility:Object.freeze({
      reducedMotionApplied:reducedMotion,
      reducedMotionEquivalent:signature.accessibility.reducedMotionEquivalent,
      nativeSystemPreferenceAuthoritative:true,
      accessibilityOutranksExpression:true,
      motionRequiredToUnderstandState:false,
      focusStateIndependentOfAnimation:true
    }),
    performance:Object.freeze({
      mode:performance.performance.mode,
      directive:performance.presentation.directive,
      optionalMotionMaySimplify:true,
      optionalMotionMayBeRemoved:true,
      nativePerformanceArchitecturePreserved:true,
      measuredPerformanceAcceptanceEstablished:false
    }),
    authority:Object.freeze({
      presentationOnly:true,
      platformCapabilityOwnedByCallerOrPlatform:true,
      nativeMotionCapabilityOwnedByCallerOrPlatform:true,
      semanticRelationshipOwnedByCallerOrProvider:true,
      nativePrimitiveSelectionOwnedByPlatformOrApplication:true,
      systemMotionPreferenceOwnedByPlatform:true,
      renderingArchitectureOwnedByPlatform:true,
      performanceCharacteristicsOwnedByPlatform:true,
      platformCapabilityCreatedByGlaze:false,
      nativeMotionCapabilityCreatedByGlaze:false,
      nativePrimitiveAvailabilityCreatedByGlaze:false,
      systemMotionPreferenceCreatedByGlaze:false,
      performanceAcceptanceCreatedByGlaze:false,
      applicationStateChangedByGlazeMotion:false,
      navigationExecutedByGlazeMotion:false,
      focusAuthorityCreatedByGlazeMotion:false,
      providerTruthCreatedByGlaze:false
    }),
    dependencies:Object.freeze({
      historicalNativeGlazeKits:glazeV17NativeGlazeKitsDevelopmentContract.version,
      signatureTransitionFamilies:glazeV17SignatureTransitionFamiliesDevelopmentContract.version,
      motionPerformance:glazeV17MotionPerformanceDevelopmentContract.version
    }),
    signatureMotion:signature,
    motionPerformance:performance,
    researchBoundary:Object.freeze({
      record:'research/v1.7-native-glaze-kits-v1-2.md',
      independentReimplementation:true,
      upstreamSourceCopied:false,
      upstreamTimingValuesCopied:false,
      upstreamCurvesCopied:false,
      upstreamAssetsCopied:false,
      upstreamVisualIdentityCopied:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceMappingOnly:true,
      section37Complete:false,
      nativeReferenceImplementationsComplete:false,
      nativePlatformAcceptanceEstablished:false,
      renderedAcceptanceEstablished:false,
      assistiveTechnologyAcceptanceEstablished:false,
      measuredPerformanceAcceptanceEstablished:false,
      representativeDeviceAcceptanceEstablished:false,
      energyAcceptanceEstablished:false,
      interruptionReversalAcceptanceEstablished:false,
      humanMotionReviewEstablished:false,
      downstreamConsumerAcceptanceAutomatic:false,
      releasePromotionAutomatic:false,
      deploymentAcceptanceAutomatic:false,
      productionAcceptanceAutomatic:false
    })
  });
}

export const glazeV17NativeGlazeKitsV12DevelopmentContract=Object.freeze({
  version:'1.7.0-dev.29',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([37]),
  platforms:PLATFORMS,
  semanticMotionRelationships:RELATIONSHIPS,
  sharedMotionCharacter:MOTION_CHARACTER,
  platformMotionBridges:PLATFORM_MOTION_BRIDGES,
  historicalFoundationVersion:glazeV17NativeGlazeKitsDevelopmentContract.version,
  historicalFoundationPlanNumbering:'v1.1-historical-numbering',
  historicalFoundationReinterpreted:false,
  semanticFamilyConsistencyRequired:true,
  semanticIntentConsistencyRequired:true,
  identicalAnimationImplementationRequired:false,
  rawAnimationControlsAccepted:false,
  reducedMotionPrecedence:true,
  finalStateDependsOnAnimationCompletion:false,
  section37Complete:false,
  nativeReferenceImplementationsComplete:false,
  nativePlatformAcceptanceEstablished:false,
  renderedAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,
  measuredPerformanceAcceptanceEstablished:false,
  representativeDeviceAcceptanceEstablished:false,
  energyAcceptanceEstablished:false,
  humanMotionReviewEstablished:false,
  glazeMotionExperimentalLifecyclePromoted:false
});
