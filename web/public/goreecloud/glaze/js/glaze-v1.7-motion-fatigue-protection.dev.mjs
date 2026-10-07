/* GLAZE UI V1.7 — Motion Fatigue Protection Development foundation.
 *
 * Bounded v1.2 Section 32 source layer. Preserves the established V1.6
 * reference motion-budget dimensions and adds deterministic optional-motion
 * reduction without reducing semantic state or creating execution authority.
 */

const REFERENCE_BUDGET=Object.freeze({
  simultaneousTransitions:6,
  skeletonMotionElements:4,
  backgroundMaterialAnimations:1,
  decorativeMovements:2,
  largeAreaTransformations:1,
  continuousAnimatedElements:4
});

const DIMENSIONS=Object.freeze(Object.keys(REFERENCE_BUDGET));

const REDUCTION_ORDER=Object.freeze([
  'decorativeMovements',
  'continuousAnimatedElements',
  'skeletonMotionElements',
  'backgroundMaterialAnimations',
  'largeAreaTransformations',
  'simultaneousTransitions'
]);

const PROHIBITED_KEYS=Object.freeze([
  'budget','budgetOverride','motionBudget','maxConcurrentMotion','maxAnimations',
  'duration','durationMs','easing','curve','spring','physics','keyframes','path',
  'travelPx','distance','distancePx','rotation','scale','scaleFactor','overshoot',
  'bounce','wobble','stiffness','damping','dampingRatio'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function nonNegativeInteger(value,label){
  const n=Number(value??0);
  if(!Number.isInteger(n)||n<0)throw new RangeError(`${label} must be a non-negative integer`);
  return n;
}

function normalizedProfiles(input){
  return Array.isArray(input.accessibilityProfiles)
    ? Object.freeze([...new Set(input.accessibilityProfiles.map(v=>String(v??'').trim().toLowerCase()).filter(Boolean))].slice(0,64))
    : Object.freeze([]);
}

function normalizeCounts(value){
  if(value!==undefined&&!plainObject(value))throw new TypeError('activeMotion must be a plain object');
  const source=plainObject(value)?value:{};
  const result={};
  for(const key of DIMENSIONS)result[key]=nonNegativeInteger(source[key],key);
  return Object.freeze(result);
}

function rejectRawControls(input){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(`Motion Fatigue Protection uses the governed reference budget and semantic counts, not caller motion controls: ${key}`);
    }
  }
}

function budgetStatus(counts){
  const exceeded=[];
  const pressure={};
  for(const key of DIMENSIONS){
    const limit=REFERENCE_BUDGET[key];
    const observed=counts[key];
    const over=Math.max(0,observed-limit);
    pressure[key]=Object.freeze({observed,limit,exceeded:over>0,overBy:over});
    if(over>0)exceeded.push(key);
  }
  return Object.freeze({pressure:Object.freeze(pressure),exceeded:Object.freeze(exceeded)});
}

function reductionForDimension(key,{reducedMotion,exceeded}){
  if(reducedMotion){
    if(key==='skeletonMotionElements')return 'static-skeleton';
    if(key==='largeAreaTransformations')return 'immediate-or-static-state';
    if(key==='simultaneousTransitions')return 'state-first-equivalents';
    return 'suppress-optional-motion';
  }
  if(!exceeded)return 'preserve-governed-motion';
  switch(key){
    case 'decorativeMovements': return 'suppress-excess-decorative-motion';
    case 'continuousAnimatedElements': return 'stop-or-freeze-excess-continuous-motion';
    case 'skeletonMotionElements': return 'convert-excess-to-static-skeleton';
    case 'backgroundMaterialAnimations': return 'convert-excess-to-static-material';
    case 'largeAreaTransformations': return 'replace-excess-with-simpler-state-transition';
    case 'simultaneousTransitions': return 'simplify-or-immediately-resolve-excess-transitions';
    default: return 'preserve-governed-motion';
  }
}

export function resolveGlazeMotionFatigueProtection(input={}){
  if(!plainObject(input))throw new TypeError('Motion Fatigue Protection input must be a plain object');
  rejectRawControls(input);

  const counts=normalizeCounts(input.activeMotion);
  const profiles=normalizedProfiles(input);
  const reducedMotion=profiles.includes('reduced-motion')||profiles.includes('minimal-motion');
  const status=budgetStatus(counts);

  const reductions={};
  for(const key of DIMENSIONS){
    reductions[key]=Object.freeze({
      dimension:key,
      action:reductionForDimension(key,{reducedMotion,exceeded:status.pressure[key].exceeded}),
      optionalMotionReduced:reducedMotion||status.pressure[key].exceeded,
      semanticStateReduced:false
    });
  }

  const repeatedActionPressure=input.repeatedActionPressure===true;
  const majorTransitionActive=input.majorTransitionActive===true;
  const decorativeMotionRequested=input.decorativeMotionRequested===true;
  const decorativeSuspendedForMajorTransition=majorTransitionActive&&decorativeMotionRequested;

  return Object.freeze({
    version:'1.7.0-dev.24',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([32]),
    budget:Object.freeze({
      source:'V1.6 reference motion budget',
      inheritedWithoutExpansion:true,
      reference:REFERENCE_BUDGET,
      observed:counts,
      exceededDimensions:status.exceeded,
      pressure:status.pressure,
      exhausted:status.exceeded.length>0,
      callerMayRaiseLimits:false,
      callerMayOverrideBudget:false
    }),
    reduction:Object.freeze({
      order:REDUCTION_ORDER,
      byDimension:Object.freeze(reductions),
      optionalAnimationReducedAutomatically:reducedMotion||status.exceeded.length>0||repeatedActionPressure||decorativeSuspendedForMajorTransition,
      repeatedActionFatigueReductionApplied:repeatedActionPressure,
      decorativeSuspendedForMajorTransition,
      continuousDecorativeLoopsRequired:false,
      largeAreaSpectacleRequired:false
    }),
    accessibility:Object.freeze({
      profiles,
      reducedMotionApplied:reducedMotion,
      precedence:true,
      directManipulationTrackingPreserved:true,
      motionRequiredToUnderstandState:false,
      criticalInteractionMayRequireObservingMotion:false
    }),
    invariants:Object.freeze({
      semanticStatePreserved:true,
      authoritativeStatePreserved:true,
      focusPreserved:true,
      navigationPreserved:true,
      taskContinuityPreserved:true,
      directManipulationTrackingPreserved:true,
      finalStateDependsOnAnimationCompletion:false,
      userInputBlockedByBudgetReduction:false
    }),
    authority:Object.freeze({
      presentationOnly:true,
      applicationStateChangedByGlaze:false,
      navigationExecutedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      performanceTruthCreatedByGlaze:false,
      accessibilityStateCreatedByGlaze:false
    }),
    glazeMotionBoundary:Object.freeze({
      experimentalFoundationVersion:'0.6.0',
      runtimeCompatibilityBaseline:'0.4.0',
      experimentalLifecyclePromoted:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,
      section32Complete:false,
      motionFatigueBudgetLayerImplemented:true,
      measuredFatigueAcceptanceEstablished:false,
      renderedAcceptanceEstablished:false,
      nativePlatformAcceptanceEstablished:false,
      assistiveTechnologyAcceptanceEstablished:false,
      performanceAcceptanceEstablished:false,
      humanMotionReviewEstablished:false,
      downstreamConsumerAcceptanceAutomatic:false,
      releasePromotionAutomatic:false,
      deploymentAcceptanceAutomatic:false,
      productionAcceptanceAutomatic:false
    })
  });
}

export const glazeV17MotionFatigueProtectionDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.24',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([32]),
  referenceBudget:REFERENCE_BUDGET,
  budgetDimensions:DIMENSIONS,
  reductionOrder:REDUCTION_ORDER,
  callerMayRaiseLimits:false,
  callerMayOverrideBudget:false,
  semanticStatePreserved:true,
  directManipulationTrackingPreserved:true,
  continuousDecorativeLoopsRequired:false,
  section32Complete:false,
  measuredFatigueAcceptanceEstablished:false,
  renderedAcceptanceEstablished:false,
  nativePlatformAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,
  performanceAcceptanceEstablished:false,
  humanMotionReviewEstablished:false,
  glazeMotionExperimentalLifecyclePromoted:false
});
