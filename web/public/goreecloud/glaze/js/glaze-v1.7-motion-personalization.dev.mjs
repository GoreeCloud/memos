/* GLAZE UI V1.7 — Motion Personalization Development foundation.
 *
 * Bounded v1.2 Section 30 source layer. Exposes a governed Theme Manager
 * Motion Expression preference without creating a second persistence authority,
 * accepting executable animation payloads, or exposing raw motion physics.
 *
 * Personalization 2.0 remains the durable preference authority. Calm, Balanced,
 * and Expressive map to its existing motionIntensity values. Minimal is a
 * bounded preview-only reduction until an authoritative durable encoding exists.
 */

import {resolveGlazeMotionExpressionProfile} from './glaze-v1.7-motion-expression-profiles.dev.mjs';

const MODES=Object.freeze(['minimal','calm','balanced','expressive']);
const ACTIONS=Object.freeze(['preview','apply-proposal']);
const PERSISTABLE_MODE_TO_INTENSITY=Object.freeze({
  calm:'minimal',
  balanced:'standard',
  expressive:'expressive'
});
const RESOLVER_MODE_TO_INTENSITY=Object.freeze({
  minimal:'minimal',
  calm:'minimal',
  balanced:'standard',
  expressive:'expressive'
});
const PROHIBITED_RAW_KEYS=Object.freeze([
  'duration','durationMs','easing','curve','spring','physics','keyframes','path',
  'travelPx','distance','distancePx','rotation','overshoot','bounce','wobble',
  'scale','scaleFactor','stiffness','damping','dampingRatio'
]);
const PROHIBITED_EXECUTABLE_PACKAGE_KEYS=Object.freeze([
  'themePackageAnimationCode','themePackageAnimationScript','themePackageAnimationModule',
  'themePackageAnimationCss','themePackageKeyframes','themePackageRemoteAnimationResource',
  'animationCode','animationScript','animationModule','executableAnimation'
]);
const MINIMAL_TRAITS=Object.freeze({
  governedReduction:true,
  optionalConnectedTransformations:'suppressed',
  decorativeMovement:'none',
  optionalDepthMotion:'suppressed',
  optionalMaterialMotion:'suppressed',
  settling:'immediate-or-minimal',
  directManipulationTrackingRequired:true,
  accessibilityStateImplied:false
});

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
  if(!allowed.includes(normalized))throw new RangeError(`Unsupported ${label}: ${normalized}`);
  return normalized;
}

function optionalMode(value,label){
  const normalized=semantic(value,null);
  if(normalized===null)return null;
  return member(normalized,MODES,label);
}

function rejectRawMotion(input){
  for(const key of PROHIBITED_RAW_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(`Motion Personalization accepts governed semantic modes, not raw motion control: ${key}`);
    }
  }
  for(const key of PROHIBITED_EXECUTABLE_PACKAGE_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(`Theme packages may request approved semantic motion profiles but may not supply executable animation payloads: ${key}`);
    }
  }
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
    motionPersonalizationSemanticLayerImplemented:true,
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

export function resolveGlazeMotionPersonalization(input={}){
  if(!plainObject(input))throw new TypeError('Motion Personalization input must be a plain object');
  rejectRawMotion(input);

  const action=member(input.action,ACTIONS,'motion personalization action','preview');
  const requestedMode=member(input.motionExpressionMode,MODES,'motion expression mode','balanced');
  const userSelectionAuthoritative=input.motionExpressionModeAuthoritative===true;
  const themePackageMode=optionalMode(input.themePackageMotionProfile,'theme package motion profile');
  const themePackageAuthoritative=themePackageMode!==null&&input.themePackageMotionProfileAuthoritative===true;
  const themePackagePreviewRequested=input.themePackagePreviewRequested===true;
  const explicitUserIntent=input.explicitUserIntent===true;

  let selectedMode='balanced';
  let source='default';
  let selectionAccepted=false;
  let themePackagePreviewAccepted=false;

  if(userSelectionAuthoritative){
    selectedMode=requestedMode;
    source='user';
    selectionAccepted=true;
  }else if(themePackageAuthoritative&&themePackagePreviewRequested){
    selectedMode=themePackageMode;
    source='theme-package-preview';
    selectionAccepted=true;
    themePackagePreviewAccepted=true;
  }

  const persistable=Object.prototype.hasOwnProperty.call(PERSISTABLE_MODE_TO_INTENSITY,selectedMode);
  const mappedMotionIntensity=RESOLVER_MODE_TO_INTENSITY[selectedMode];
  const applyRequested=action==='apply-proposal';
  const applyAccepted=
    applyRequested
    && explicitUserIntent
    && userSelectionAuthoritative
    && persistable;

  let actionReason='preview';
  if(applyRequested&&!explicitUserIntent)actionReason='explicit-user-intent-required';
  else if(applyRequested&&!userSelectionAuthoritative)actionReason='authoritative-user-selection-required';
  else if(applyRequested&&!persistable)actionReason='minimal-mode-preview-only-until-durable-encoding-exists';
  else if(applyAccepted)actionReason='apply-proposal';

  const profile=resolveGlazeMotionExpressionProfile({
    motionIntensity:mappedMotionIntensity,
    motionIntensityAuthoritative:true,
    accessibilityProfiles:Array.isArray(input.accessibilityProfiles)?input.accessibilityProfiles:[],
    performanceConstraint:input.performanceConstraint,
    performanceConstraintAuthoritative:input.performanceConstraintAuthoritative
  });

  return Object.freeze({
    version:'1.7.0-dev.22',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([30]),
    action:Object.freeze({
      requested:action,
      accepted:action==='preview'||applyAccepted,
      reason:actionReason,
      explicitUserIntent,
      callerMustPersist:applyAccepted,
      persistencePerformedByGlaze:false
    }),
    selection:Object.freeze({
      requestedMode,
      selectedMode,
      source,
      selectionAccepted,
      userSelectionAuthoritative,
      fallbackUsed:!selectionAccepted,
      fallbackMode:selectionAccepted?null:'balanced',
      persistable,
      persistenceEncoding:persistable
        ? Object.freeze({authority:'Personalization 2.0 motionIntensity',value:PERSISTABLE_MODE_TO_INTENSITY[selectedMode]})
        : null,
      minimalPreviewOnly:selectedMode==='minimal',
      distinctMinimalDurableEncodingEstablished:false,
      secondPersistenceAuthorityCreated:false
    }),
    themePackage:Object.freeze({
      requestedMode:themePackageMode,
      authoritative:themePackageAuthoritative,
      previewRequested:themePackagePreviewRequested,
      previewAccepted:themePackagePreviewAccepted,
      mayRequestApprovedSemanticProfile:true,
      mayOverrideAuthoritativeUserSelection:false,
      mayPersistPreference:false,
      mayAutoApply:false,
      executableAnimationAccepted:false,
      remoteAnimationResourceAccepted:false
    }),
    resolvedMotion:Object.freeze({
      motionIntensity:mappedMotionIntensity,
      selectedProfile:profile.expression.selectedProfile,
      effectiveProfile:profile.expression.effectiveProfile,
      profileTraits:profile.traits,
      minimalModeTraits:selectedMode==='minimal'?MINIMAL_TRAITS:null,
      accessibility:profile.accessibility,
      performance:profile.performance,
      overrides:profile.overrides
    }),
    authority:Object.freeze({
      presentationOnly:true,
      personalization2DurablePreferenceAuthorityPreserved:true,
      motionPreferencePersistedByGlaze:false,
      themePackagePreferenceAuthorityCreated:false,
      accessibilityStateCreatedByGlaze:false,
      performanceStateCreatedByGlaze:false,
      applicationStateChangedByGlaze:false,
      providerTruthCreatedByGlaze:false
    }),
    glazeMotionBoundary:Object.freeze({
      experimentalFoundationVersion:'0.6.0',
      runtimeCompatibilityBaseline:'0.4.0',
      experimentalLifecyclePromoted:false
    }),
    acceptanceBoundary:acceptanceBlock()
  });
}

export const glazeV17MotionPersonalizationDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.22',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([30]),
  modes:MODES,
  actions:ACTIONS,
  persistableModeToMotionIntensity:PERSISTABLE_MODE_TO_INTENSITY,
  minimalModePreviewOnly:true,
  distinctMinimalDurableEncodingEstablished:false,
  rawMotionControlsAccepted:false,
  executableThemePackageAnimationAccepted:false,
  themePackageMayPersistPreference:false,
  themePackageMayAutoApply:false,
  explicitUserIntentRequiredForApply:true,
  presentationOnly:true,
  section30Complete:false,
  renderedAcceptanceEstablished:false,
  nativePlatformAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,
  performanceAcceptanceEstablished:false,
  motionFatigueAcceptanceEstablished:false,
  humanMotionReviewEstablished:false,
  glazeMotionExperimentalLifecyclePromoted:false
});
