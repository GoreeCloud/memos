/* GLAZE UI V1.7 — Motion Expression Profiles Development foundation.
 *
 * Bounded v1.2 Section 29 source layer. Connects existing Personalization 2.0
 * motionIntensity semantics to Calm, Balanced, and Expressive motion profiles.
 * Accessibility and authoritative performance constraints override optional
 * richness without rewriting the selected preference or application state.
 */

const MOTION_INTENSITIES=Object.freeze(['minimal','standard','expressive']);
const PROFILES=Object.freeze(['calm','balanced','expressive']);
const PERFORMANCE_CONSTRAINTS=Object.freeze(['none','constrained','severe']);
const PROFILE_BY_INTENSITY=Object.freeze({
  minimal:'calm',
  standard:'balanced',
  expressive:'expressive'
});
const PROFILE_TRAITS=Object.freeze({
  calm:Object.freeze({
    travel:'minimal',
    settling:'fast',
    connectedTransformations:'fewer',
    materialAnimation:'restrained',
    adaptiveRecomposition:'restrained',
    depthRelationships:'restrained',
    signatureMotion:'restrained',
    decorativeMovement:'almost-none',
    continuousDecorativeAnimation:false,
    directManipulationTrackingRequired:true
  }),
  balanced:Object.freeze({
    travel:'standard',
    settling:'standard',
    connectedTransformations:'helpful',
    materialAnimation:'moderate',
    adaptiveRecomposition:'moderate',
    depthRelationships:'moderate',
    signatureMotion:'standard',
    decorativeMovement:'restrained',
    continuousDecorativeAnimation:false,
    directManipulationTrackingRequired:true
  }),
  expressive:Object.freeze({
    travel:'richer-semantic',
    settling:'standard',
    connectedTransformations:'richer',
    materialAnimation:'pronounced-semantic',
    adaptiveRecomposition:'more-visible',
    depthRelationships:'more-pronounced',
    signatureMotion:'expanded-semantic',
    decorativeMovement:'semantically-justified-only',
    continuousDecorativeAnimation:false,
    directManipulationTrackingRequired:true
  })
});
const PROHIBITED_KEYS=Object.freeze([
  'duration','durationMs','easing','curve','spring','physics','keyframes','path',
  'travelPx','distance','distancePx','rotation','overshoot','bounce','wobble',
  'scale','scaleFactor','stiffness','damping','dampingRatio'
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
  if(!allowed.includes(normalized))throw new RangeError(`Unsupported ${label}: ${normalized}`);
  return normalized;
}

function uniqueProfiles(value){
  if(!Array.isArray(value))return Object.freeze([]);
  return Object.freeze([...new Set(
    value.map(item=>semantic(item)).filter(Boolean)
  )].slice(0,64));
}

function rejectRawMotion(input){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(`Motion Expression Profiles accept semantic intent, not raw motion control: ${key}`);
    }
  }
}

function performanceState(input){
  const requested=member(
    input.performanceConstraint,
    PERFORMANCE_CONSTRAINTS,
    'performance constraint',
    'none'
  );
  const authority=requested==='none'||input.performanceConstraintAuthoritative===true;
  return Object.freeze({
    requested,
    effective:authority?requested:'none',
    authoritative:authority,
    untrustedConstraintIgnored:!authority&&requested!=='none'
  });
}

function reducedMotionTraits(){
  return Object.freeze({
    travel:'none',
    settling:'immediate-state',
    connectedTransformations:'none',
    materialAnimation:'state-change-only',
    adaptiveRecomposition:'immediate-recomposition',
    depthRelationships:'static',
    signatureMotion:'reduced-motion-equivalent',
    decorativeMovement:'none',
    continuousDecorativeAnimation:false,
    directManipulationTrackingRequired:true
  });
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
    motionExpressionProfileCatalogImplemented:true,
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

export function resolveGlazeMotionExpressionProfile(input={}){
  if(!plainObject(input))throw new TypeError('Motion Expression Profiles input must be a plain object');
  rejectRawMotion(input);

  const requestedMotionIntensity=member(
    input.motionIntensity,
    MOTION_INTENSITIES,
    'motion intensity',
    'standard'
  );
  const selectionAccepted=input.motionIntensityAuthoritative===true;
  const selectedMotionIntensity=selectionAccepted?requestedMotionIntensity:'standard';
  const selectedProfile=PROFILE_BY_INTENSITY[selectedMotionIntensity];

  const accessibilityProfiles=uniqueProfiles(input.accessibilityProfiles);
  const accessibility=new Set(accessibilityProfiles);
  const reducedMotion=accessibility.has('reduced-motion')||accessibility.has('minimal-motion');
  const simplifiedVisualEffects=accessibility.has('simplified-visual-effects');
  const performance=performanceState(input);

  let effectiveProfile=selectedProfile;
  const overrideReasons=[];
  if(reducedMotion||simplifiedVisualEffects){
    effectiveProfile='calm';
    overrideReasons.push(reducedMotion?'reduced-motion':'simplified-visual-effects');
  }else if(performance.effective==='severe'){
    effectiveProfile='calm';
    overrideReasons.push('severe-performance');
  }else if(performance.effective==='constrained'&&selectedProfile==='expressive'){
    effectiveProfile='balanced';
    overrideReasons.push('constrained-performance');
  }

  const traits=reducedMotion
    ? reducedMotionTraits()
    : PROFILE_TRAITS[effectiveProfile];

  return Object.freeze({
    version:'1.7.0-dev.21',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([29]),
    sourceFoundation:Object.freeze({
      personalizationVersion:'1.7.0-dev.5',
      signatureTransitionFamiliesVersion:'1.7.0-dev.16',
      connectedTransformationVersion:'1.7.0-dev.17',
      adaptiveCompositionMotionVersion:'1.7.0-dev.18',
      signatureMicrointeractionsVersion:'1.7.0-dev.19',
      themeTransitionSystemVersion:'1.7.0-dev.20'
    }),
    expression:Object.freeze({
      requestedMotionIntensity,
      selectedMotionIntensity,
      selectedProfile,
      effectiveProfile,
      selectionAccepted,
      fallbackUsed:!selectionAccepted,
      fallbackReason:selectionAccepted?null:'untrusted-motion-intensity',
      mapping:Object.freeze({...PROFILE_BY_INTENSITY}),
      createsNewUserPreference:false,
      storedPreferenceRewrittenByOverride:false
    }),
    traits,
    accessibility:Object.freeze({
      profiles:accessibilityProfiles,
      precedence:true,
      reducedMotionApplied:reducedMotion,
      simplifiedVisualEffectsApplied:simplifiedVisualEffects,
      capsEffectiveProfileAtCalm:reducedMotion||simplifiedVisualEffects,
      directManipulationTrackingRequired:true,
      motionRequiredToUnderstandState:false
    }),
    performance:Object.freeze({
      ...performance,
      precedence:true,
      optionalRichnessMayDegrade:true,
      authoritativeApplicationStateCorrect:true,
      storedPreferenceRewritten:false,
      measuredPerformanceAcceptanceEstablished:false
    }),
    overrides:Object.freeze({
      applied:overrideReasons.length>0,
      reasons:Object.freeze(overrideReasons),
      selectedProfilePreserved:true,
      selectedPreferencePreserved:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      motionPreferenceCreatedByGlaze:false,
      motionPreferencePersistedByGlaze:false,
      performanceStateCreatedByGlaze:false,
      accessibilityStateCreatedByGlaze:false,
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

export const glazeV17MotionExpressionProfilesDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.21',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([29]),
  motionIntensityLevels:MOTION_INTENSITIES,
  profiles:PROFILES,
  profileByMotionIntensity:PROFILE_BY_INTENSITY,
  performanceConstraints:PERFORMANCE_CONSTRAINTS,
  accessibilityPrecedence:true,
  performancePrecedence:true,
  continuousDecorativeAnimation:false,
  directManipulationTrackingRequired:true,
  createsNewUserPreference:false,
  section29Complete:false,
  renderedAcceptanceEstablished:false,
  nativePlatformAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,
  performanceAcceptanceEstablished:false,
  motionFatigueAcceptanceEstablished:false,
  humanMotionReviewEstablished:false,
  glazeMotionExperimentalLifecyclePromoted:false
});
