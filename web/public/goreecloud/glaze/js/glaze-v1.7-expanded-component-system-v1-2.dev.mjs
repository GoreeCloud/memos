/* GLAZE UI V1.7 — Expanded Component System v1.2 Development foundation.
 *
 * Bounded v1.2 Section 38 layer over historical dev.10 / v1.1 Section 25.
 * Components expose governed semantic transition relationships where appropriate
 * instead of embedding arbitrary local animation. Provider/application state,
 * connected identity, transition occurrence, and platform behavior remain external.
 */

import {
  resolveGlazeExpandedComponent,
  glazeV17ExpandedComponentSystemDevelopmentContract
} from './glaze-v1.7-expanded-component-system.dev.mjs';
import {
  resolveGlazeSignatureTransitionFamily,
  glazeV17SignatureTransitionFamiliesDevelopmentContract
} from './glaze-v1.7-signature-transition-families.dev.mjs';
import {
  resolveGlazeNotificationActivitySurfaceV12,
  glazeV17NotificationActivitySurfacesV12DevelopmentContract
} from './glaze-v1.7-notification-activity-surfaces-v1-2.dev.mjs';
import {
  resolveGlazeMotionPerformance,
  glazeV17MotionPerformanceDevelopmentContract
} from './glaze-v1.7-motion-performance.dev.mjs';
import {
  glazeV17NativeGlazeKitsV12DevelopmentContract
} from './glaze-v1.7-native-glaze-kits-v1-2.dev.mjs';

const COMPONENT_RELATIONSHIPS=Object.freeze({
  GlzAdaptivePane:Object.freeze(['workspace-recomposition','focus-transfer']),
  GlzCommandSurface:Object.freeze(['context-overlay','transient-elevation','focus-transfer','source-destination-continuity']),
  GlzActivitySurface:Object.freeze(['transient-elevation','material-role-change','focus-transfer']),
  GlzNotificationSurface:Object.freeze(['transient-elevation','same-object-expansion','material-role-change','color-state-change','focus-transfer']),
  GlzAdaptiveToolbar:Object.freeze(['workspace-recomposition','focus-transfer']),
  GlzActionCluster:Object.freeze(['workspace-recomposition','focus-transfer']),
  GlzRecoverySurface:Object.freeze(['material-role-change','focus-transfer']),
  GlzProgressSurface:Object.freeze(['color-state-change','material-role-change','focus-transfer']),
  GlzPreferenceGroup:Object.freeze(['same-object-expansion','focus-transfer']),
  GlzAppearancePicker:Object.freeze(['context-overlay','same-object-expansion','focus-transfer']),
  GlzThemePreview:Object.freeze(['same-object-expansion','color-state-change','material-role-change']),
  GlzColorRolePicker:Object.freeze(['context-overlay','same-object-expansion','color-state-change']),
  GlzPalettePreview:Object.freeze(['same-object-expansion','color-state-change']),
  GlzAdaptiveSplitView:Object.freeze(['workspace-recomposition','posture-partition','focus-transfer'])
});

const RELATIONSHIPS=Object.freeze([...new Set(Object.values(COMPONENT_RELATIONSHIPS).flat())]);
const STATE_CHANGE_RELATIONSHIPS=Object.freeze(['color-state-change','material-role-change']);
const PROVIDER_STATE_COMPONENTS=Object.freeze(['GlzActivitySurface','GlzRecoverySurface']);
const NOTIFICATION_ACTIVITY_COMPONENTS=Object.freeze(['GlzNotificationSurface','GlzProgressSurface']);
const NOTIFICATION_TRANSITION_RELATIONSHIP=Object.freeze({
  progress:'color-state-change',
  completion:'material-role-change',
  recovery:'material-role-change',
  arrival:'transient-elevation',
  expansion:'same-object-expansion',
  dismissal:'transient-elevation'
});
const PROHIBITED_KEYS=Object.freeze([
  'family','signatureFamily','requestedFamily','duration','durationMs','easing','curve','spring',
  'physics','keyframes','path','travelPx','distance','distancePx','rotation','scale','scaleFactor',
  'overshoot','bounce','wobble','stiffness','damping','dampingRatio','frameBudget','frameBudgetMs',
  'fpsTarget','targetFps','refreshRateHz','performanceMeasurements','performanceEvidence'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function text(value){
  const normalized=String(value??'').trim();
  return normalized||null;
}
function rejectRawControls(input){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError('Expanded Component System v1.2 accepts semantic component state, not direct family/raw animation or performance controls: '+key);
    }
  }
}
function requestedRelationship(value){
  const normalized=text(value);
  if(normalized===null)return null;
  if(!RELATIONSHIPS.includes(normalized)){
    throw new RangeError('Unsupported Expanded Component System v1.2 semantic relationship: '+normalized);
  }
  return normalized;
}
function motionKind(relationship){
  if(['same-object-expansion','source-destination-continuity'].includes(relationship))return 'connected-transformation';
  if(['workspace-recomposition','posture-partition'].includes(relationship))return 'adaptive-recomposition';
  if(['color-state-change','material-role-change'].includes(relationship))return 'material';
  return 'task-transition';
}
function performanceInput(input,relationship){
  return {
    motionKind:motionKind(relationship),
    accessibilityProfiles:input.accessibilityProfiles,
    activeMotion:input.activeMotion,
    repeatedActionPressure:input.repeatedActionPressure,
    majorTransitionActive:relationship!==null,
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
function staticSignature(){
  return Object.freeze({
    relationshipAccepted:false,
    family:'Standard transition',
    familyId:'standard-transition',
    semanticIntent:'state-first-standard-transition',
    reducedMotionApplied:false
  });
}
function genericSignature(input,relationship,relationshipAuthoritative){
  const resolved=resolveGlazeSignatureTransitionFamily({
    relationship,
    relationshipAuthoritative,
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
  return Object.freeze({
    relationshipAccepted:resolved.sourceFoundation.relationshipAccepted===true,
    family:resolved.choreography.family,
    familyId:resolved.choreography.familyId,
    semanticIntent:resolved.choreography.semanticIntent,
    reducedMotionApplied:resolved.accessibility.reducedMotionApplied===true,
    full:resolved
  });
}

export function resolveGlazeExpandedComponentV12(input={}){
  if(!plainObject(input))throw new TypeError('Expanded Component System v1.2 input must be a plain object');
  rejectRawControls(input);

  const base=resolveGlazeExpandedComponent(input);
  const component=base.component;
  const notificationKind=text(input.notificationTransitionKind);
  let relationship=requestedRelationship(input.transitionRelationship);
  let specialized=null;

  if(notificationKind!==null){
    if(!NOTIFICATION_ACTIVITY_COMPONENTS.includes(component)){
      throw new RangeError('notificationTransitionKind is only valid for GlzNotificationSurface or GlzProgressSurface');
    }
    const derived=NOTIFICATION_TRANSITION_RELATIONSHIP[notificationKind];
    if(!derived)throw new RangeError('Unsupported notification/activity transition kind for Section 38: '+notificationKind);
    if(relationship!==null&&relationship!==derived){
      throw new RangeError('transitionRelationship does not match the Section 36 notification/activity transition mapping');
    }
    relationship=derived;
    specialized=resolveGlazeNotificationActivitySurfaceV12({
      ...input,
      component,
      profile:input.profile??'mobile',
      transitionKind:notificationKind,
      transitionAuthoritative:input.transitionAuthoritative
    });
  }

  if(relationship!==null&&!COMPONENT_RELATIONSHIPS[component].includes(relationship)){
    throw new RangeError(component+' does not expose semantic relationship '+relationship);
  }

  if(
    NOTIFICATION_ACTIVITY_COMPONENTS.includes(component)
    &&relationship!==null
    &&relationship!=='focus-transfer'
    &&specialized===null
  ){
    throw new RangeError(component+' provider/activity motion must use notificationTransitionKind so Section 36 truth authority is preserved');
  }

  const transitionAuthoritative=input.transitionAuthoritative===true;
  const stateAuthorityRequired=relationship!==null&&STATE_CHANGE_RELATIONSHIPS.includes(relationship);
  let stateAuthoritySatisfied=!stateAuthorityRequired||input.semanticStateAuthoritative===true;
  if(specialized!==null&&stateAuthorityRequired){
    stateAuthoritySatisfied=specialized.transition.providerTruthSatisfied===true;
  }
  const providerStateAuthorityRequired=PROVIDER_STATE_COMPONENTS.includes(component)
    &&base.providerState.requestedState!==null
    &&relationship==='material-role-change';
  const providerStateAuthoritySatisfied=!providerStateAuthorityRequired||base.providerState.authoritative===true;

  let signature=staticSignature();
  let performance;
  let relationshipEligible=false;
  let optionalMotionApplied=false;

  if(specialized!==null){
    signature=Object.freeze({
      relationshipAccepted:specialized.transition.signatureRelationshipAccepted===true,
      family:specialized.transition.signatureFamily,
      familyId:specialized.signatureMotion.choreography.familyId,
      semanticIntent:specialized.signatureMotion.choreography.semanticIntent,
      reducedMotionApplied:specialized.accessibility.reducedMotionApplied===true,
      full:specialized.signatureMotion
    });
    performance=specialized.motionPerformance;
    relationshipEligible=specialized.transition.authoritative
      &&specialized.transition.providerTruthSatisfied
      &&signature.relationshipAccepted;
    optionalMotionApplied=specialized.transition.optionalMotionApplied===true;
  }else{
    relationshipEligible=relationship!==null
      &&transitionAuthoritative
      &&stateAuthoritySatisfied
      &&providerStateAuthoritySatisfied;
    if(relationship!==null){
      signature=genericSignature(input,relationship,relationshipEligible);
    }
    performance=resolveGlazeMotionPerformance(performanceInput(input,relationship));
    optionalMotionApplied=relationshipEligible&&signature.relationshipAccepted;
  }

  const reducedMotionApplied=signature.reducedMotionApplied
    ||performance.accessibility.reducedMotionApplied===true;

  return Object.freeze({
    version:'1.7.0-dev.30',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([38]),
    component,
    family:base.family,
    historicalFoundation:Object.freeze({
      version:glazeV17ExpandedComponentSystemDevelopmentContract.version,
      planNumbering:'v1.1-historical-numbering',
      historicalSpecificationSection:25,
      reinterpretedAsV12Section38:false
    }),
    componentState:base,
    semanticTransition:Object.freeze({
      requestedRelationship:relationship,
      allowedRelationships:COMPONENT_RELATIONSHIPS[component],
      transitionAuthoritative,
      stateAuthorityRequired,
      stateAuthoritySatisfied,
      providerStateAuthorityRequired,
      providerStateAuthoritySatisfied,
      specializedNotificationActivityDelegation:specialized!==null,
      relationshipEligible,
      relationshipAccepted:signature.relationshipAccepted,
      signatureFamily:signature.family,
      signatureFamilyId:signature.familyId,
      semanticIntent:signature.semanticIntent,
      directSignatureFamilySelectionAccepted:false,
      localArbitraryAnimationAllowed:false,
      rawAnimationControlsAccepted:false,
      optionalMotionApplied,
      finalStateDependsOnAnimationCompletion:false,
      focusMayWaitForMotion:false,
      navigationMayWaitForMotion:false,
      taskStateMayWaitForMotion:false
    }),
    accessibility:Object.freeze({
      reducedMotionApplied,
      accessibleSemanticsRequired:true,
      keyboardAndFocusSemanticsPreserved:true,
      focusStateIndependentOfAnimation:true,
      motionRequiredToUnderstandState:false,
      colorOnlyMeaningAllowed:false,
      accessibilityOutranksExpression:true
    }),
    performance:Object.freeze({
      mode:performance.performance.mode,
      directive:performance.presentation.directive,
      optionalMotionMaySimplify:true,
      optionalMotionMayBeRemoved:true,
      measuredPerformanceAcceptanceEstablished:false
    }),
    authority:Object.freeze({
      presentationOnly:true,
      transitionOccurrenceOwnedByCallerOrProvider:true,
      semanticStateOwnedByCallerOrProvider:true,
      connectedIdentityOwnedByCallerOrProvider:true,
      providerTruthOwnedByProvider:true,
      semanticRelationshipCreatedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      progressTruthCreatedByGlaze:false,
      recoveryTruthCreatedByGlaze:false,
      themeTruthCreatedByGlaze:false,
      actionExecutionPerformedByGlaze:false,
      navigationExecutionPerformedByGlaze:false,
      applicationStateChangedByGlazeMotion:false
    }),
    dependencies:Object.freeze({
      historicalExpandedComponentSystem:glazeV17ExpandedComponentSystemDevelopmentContract.version,
      signatureTransitionFamilies:glazeV17SignatureTransitionFamiliesDevelopmentContract.version,
      notificationActivitySurfaces:glazeV17NotificationActivitySurfacesV12DevelopmentContract.version,
      motionPerformance:glazeV17MotionPerformanceDevelopmentContract.version,
      nativeGlazeKits:glazeV17NativeGlazeKitsV12DevelopmentContract.version
    }),
    signatureMotion:signature.full??null,
    motionPerformance:performance,
    specializedNotificationActivity:specialized,
    researchBoundary:Object.freeze({
      record:'research/v1.7-expanded-component-system-v1-2.md',
      rootRecord:'OPEN-SOURCE-RESEARCH.md',
      independentReimplementation:true,
      upstreamSourceCopied:false,
      upstreamAnimationValuesCopied:false,
      upstreamAssetsCopied:false,
      upstreamVisualIdentityCopied:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,
      section38Complete:false,
      renderedAcceptanceEstablished:false,
      nativePlatformAcceptanceEstablished:false,
      assistiveTechnologyAcceptanceEstablished:false,
      measuredPerformanceAcceptanceEstablished:false,
      representativeDeviceAcceptanceEstablished:false,
      energyAcceptanceEstablished:false,
      humanMotionReviewEstablished:false,
      downstreamConsumerAcceptanceAutomatic:false,
      releasePromotionAutomatic:false,
      deploymentAcceptanceAutomatic:false,
      productionAcceptanceAutomatic:false
    })
  });
}

function resolver(component){
  return input=>resolveGlazeExpandedComponentV12({...input,component});
}

export const resolveGlzAdaptivePaneV12=resolver('GlzAdaptivePane');
export const resolveGlzCommandSurfaceV12=resolver('GlzCommandSurface');
export const resolveGlzActivitySurfaceV12=resolver('GlzActivitySurface');
export const resolveGlzNotificationSurfaceV12=resolver('GlzNotificationSurface');
export const resolveGlzAdaptiveToolbarV12=resolver('GlzAdaptiveToolbar');
export const resolveGlzActionClusterV12=resolver('GlzActionCluster');
export const resolveGlzRecoverySurfaceV12=resolver('GlzRecoverySurface');
export const resolveGlzProgressSurfaceV12=resolver('GlzProgressSurface');
export const resolveGlzPreferenceGroupV12=resolver('GlzPreferenceGroup');
export const resolveGlzAppearancePickerV12=resolver('GlzAppearancePicker');
export const resolveGlzThemePreviewV12=resolver('GlzThemePreview');
export const resolveGlzColorRolePickerV12=resolver('GlzColorRolePicker');
export const resolveGlzPalettePreviewV12=resolver('GlzPalettePreview');
export const resolveGlzAdaptiveSplitViewV12=resolver('GlzAdaptiveSplitView');

export const glazeV17ExpandedComponentSystemV12DevelopmentContract=Object.freeze({
  version:'1.7.0-dev.30',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([38]),
  componentCatalog:Object.freeze(Object.keys(COMPONENT_RELATIONSHIPS)),
  componentTransitionRelationships:COMPONENT_RELATIONSHIPS,
  historicalFoundationVersion:glazeV17ExpandedComponentSystemDevelopmentContract.version,
  historicalFoundationPlanNumbering:'v1.1-historical-numbering',
  historicalFoundationReinterpreted:false,
  directSignatureFamilySelectionAccepted:false,
  localArbitraryAnimationAllowed:false,
  rawAnimationControlsAccepted:false,
  transitionOccurrenceAuthorityRequired:true,
  reducedMotionPrecedence:true,
  finalStateDependsOnAnimationCompletion:false,
  specializedNotificationActivityTruthOwnedBySection36:true,
  section38Complete:false,
  renderedAcceptanceEstablished:false,
  nativePlatformAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,
  measuredPerformanceAcceptanceEstablished:false,
  representativeDeviceAcceptanceEstablished:false,
  energyAcceptanceEstablished:false,
  humanMotionReviewEstablished:false,
  glazeMotionExperimentalLifecyclePromoted:false
});
