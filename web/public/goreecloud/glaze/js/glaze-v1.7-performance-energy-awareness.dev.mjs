/* GLAZE UI V1.7 — Performance and Energy Awareness Development foundation.
 *
 * Bounded v1.2 Section 45 source layer. Reuses the existing Motion Performance
 * resolver for independently-authorized environment signals and extends its
 * degradation policy across themes, materials, motion, adaptive transitions,
 * decorative presentation, and optional background visual work.
 *
 * This resolver does not measure performance or energy use, invent power or
 * thermal state, change application/provider truth, or grant acceptance.
 */

import {
  resolveGlazeMotionPerformance,
  glazeV17MotionPerformanceDevelopmentContract
} from './glaze-v1.7-motion-performance.dev.mjs';

const PRESENTATION_DOMAINS=Object.freeze([
  'theme','material','motion','adaptive-transition','decorative','background-visual-work'
]);

const PROHIBITED_KEYS=Object.freeze([
  'blur','blurPx','blurRadius','opacity','shader','shaderPasses','particleCount','layerCount',
  'textureSize','textureSizePx','renderScale','complexity','complexityScore','animationFidelity',
  'forceFrames','forcedFrames','continuousFrames','frameBudget','frameBudgetMs','fpsTarget',
  'targetFps','refreshRateHz','cpuThreshold','gpuThreshold','powerBudget','powerBudgetMw',
  'energyBudget','energyBudgetMj','batteryBudget','batteryDrain','thermalBudget',
  'measurements','samples','performanceMeasurements','energyMeasurements','batteryMeasurements',
  'performanceEvidence','energyEvidence','acceptance','accepted','productionEligible'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function semantic(value,fallback){
  const normalized=String(value??'').trim().toLowerCase();
  return normalized||fallback;
}

function domain(value){
  const normalized=semantic(value,'motion');
  if(!PRESENTATION_DOMAINS.includes(normalized))throw new RangeError('Unsupported presentation domain: '+normalized);
  return normalized;
}

function rejectRawControls(input){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError('Performance and Energy Awareness accepts governed semantic context, not raw visual complexity, forced-frame, threshold, measurement, or acceptance controls: '+key);
    }
  }
}

function motionKindFor(presentationDomain){
  if(presentationDomain==='adaptive-transition')return 'adaptive-recomposition';
  if(presentationDomain==='material')return 'material';
  if(presentationDomain==='decorative')return 'decorative';
  if(presentationDomain==='background-visual-work')return 'continuous-decorative';
  return 'task-transition';
}

function domainDirective(presentationDomain,mode,motionDirective){
  if(mode==='full'){
    if(presentationDomain==='background-visual-work')return 'allow-only-governed-visible-optional-work';
    return 'preserve-governed-presentation';
  }
  if(mode==='reduced-motion'){
    if(presentationDomain==='motion'||presentationDomain==='adaptive-transition')return motionDirective;
    if(presentationDomain==='background-visual-work'||presentationDomain==='decorative')return 'suppress-nonessential-continuous-visual-work';
    if(presentationDomain==='material')return 'use-accessibility-compatible-static-material';
    return 'preserve-theme-and-semantic-color-with-immediate-state-change';
  }
  if(mode==='minimal'){
    if(presentationDomain==='theme')return 'preserve-theme-identity-and-semantic-color-with-solid-low-cost-surfaces';
    if(presentationDomain==='material')return 'use-static-solid-material-equivalent';
    if(presentationDomain==='motion'||presentationDomain==='adaptive-transition')return motionDirective;
    if(presentationDomain==='decorative')return 'suppress-optional-decoration';
    return 'suspend-optional-background-visual-work';
  }
  if(mode==='simplified'){
    if(presentationDomain==='theme')return 'preserve-theme-identity-with-reduced-optional-material-richness';
    if(presentationDomain==='material')return 'prefer-simple-static-material-and-bounded-compositor-effects';
    if(presentationDomain==='motion'||presentationDomain==='adaptive-transition')return motionDirective;
    if(presentationDomain==='decorative')return 'suppress-most-optional-decoration';
    return 'suspend-continuous-background-visual-work';
  }
  if(presentationDomain==='theme')return 'restrain-optional-theme-material-richness';
  if(presentationDomain==='material')return 'restrain-material-effects-and-prefer-compositor-friendly-presentation';
  if(presentationDomain==='motion'||presentationDomain==='adaptive-transition')return motionDirective;
  if(presentationDomain==='decorative')return 'reduce-optional-decoration';
  return 'pause-or-reduce-optional-background-visual-work';
}

export function resolveGlazePerformanceEnergyAwareness(input={}){
  if(!plainObject(input))throw new TypeError('Performance and Energy Awareness input must be a plain object');
  rejectRawControls(input);

  const presentationDomain=domain(input.presentationDomain);
  const motion=resolveGlazeMotionPerformance({
    motionKind:motionKindFor(presentationDomain),
    accessibilityProfiles:input.accessibilityProfiles,
    activeMotion:plainObject(input.activeMotion)?input.activeMotion:{},
    repeatedActionPressure:input.repeatedActionPressure===true,
    majorTransitionActive:input.majorTransitionActive===true,
    decorativeMotionRequested:presentationDomain==='decorative',
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
    directManipulation:input.directManipulation===true
  });

  const mode=motion.performance.mode;
  const nonVisible=motion.performance.visibility.effective!=='visible';
  const suspendOptionalWork=nonVisible||(
    presentationDomain==='background-visual-work'&&
    (mode==='simplified'||mode==='minimal'||mode==='reduced-motion')
  );
  const directive=domainDirective(presentationDomain,mode,motion.presentation.directive);

  return Object.freeze({
    version:'1.7.0-dev.38',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([45]),
    presentationDomain,
    performanceMode:mode,
    inheritedMotionPerformance:motion,
    presentation:Object.freeze({
      directive,
      optionalVisualComplexityMayDegrade:true,
      taskContinuityPreserved:true,
      accessibilityPreserved:true,
      responsivenessPreserved:true,
      semanticStatePreserved:true,
      authoritativeTruthPreserved:true,
      themeIdentityPreserved:true,
      protectedSemanticColorMeaningPreserved:true,
      materialHierarchyMeaningPreserved:true,
      directManipulationTrackingPreserved:true,
      offscreenOptionalWorkSuspended:nonVisible,
      optionalBackgroundWorkSuspended:suspendOptionalWork,
      idleRenderLoopsAllowed:false,
      continuousDecorativeAnimationDefault:false,
      forcedFramesForOptionalVisualsAllowed:false
    }),
    energy:Object.freeze({
      powerSavingEffective:motion.performance.powerSaving.effective,
      thermalStateEffective:motion.performance.thermalState.effective,
      runtimePressureEffective:motion.performance.runtimePressure.effective,
      hardwareClassEffective:motion.performance.hardwareClass.effective,
      refreshClassEffective:motion.performance.refreshClass.effective,
      visibilityEffective:motion.performance.visibility.effective,
      optionalPresentationCanSimplify:true,
      criticalTaskWorkRemainsAvailable:true,
      energyStateCreatedByGlaze:false,
      energyAcceptanceInferred:false
    }),
    evidence:Object.freeze({
      environmentSignalsRequireAuthority:true,
      measurementsAcceptedByThisResolver:false,
      measurementsManufactured:false,
      performanceAcceptanceEstablished:false,
      energyImpactEstablished:false,
      batteryImpactEstablished:false,
      thermalAcceptanceEstablished:false,
      representativeDeviceAcceptanceEstablished:false
    }),
    invariants:Object.freeze({
      applicationStateChangedByGlaze:false,
      navigationExecutedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      performanceTruthCreatedByGlaze:false,
      powerStateCreatedByGlaze:false,
      thermalStateCreatedByGlaze:false,
      semanticStateReduced:false,
      authoritativeStateReduced:false,
      taskContinuityPreserved:true,
      accessibilityPrecedence:true,
      responsivenessPrecedence:true,
      finalStateDependsOnAnimationCompletion:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,
      section45Complete:false,
      renderedAcceptanceEstablished:false,
      nativePlatformAcceptanceEstablished:false,
      assistiveTechnologyAcceptanceEstablished:false,
      representativeDeviceAcceptanceEstablished:false,
      measuredPerformanceAcceptanceEstablished:false,
      energyAcceptanceEstablished:false,
      thermalAcceptanceEstablished:false,
      batteryAcceptanceEstablished:false,
      backgroundLifecycleAcceptanceEstablished:false,
      humanVisualMotionReviewEstablished:false,
      downstreamConsumerAcceptanceAutomatic:false,
      releasePromotionAutomatic:false,
      deploymentAcceptanceAutomatic:false,
      productionAcceptanceAutomatic:false
    })
  });
}

export const glazeV17PerformanceEnergyAwarenessDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.38',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([45]),
  presentationDomains:PRESENTATION_DOMAINS,
  performanceModes:glazeV17MotionPerformanceDevelopmentContract.performanceModes,
  motionPerformanceVersion:glazeV17MotionPerformanceDevelopmentContract.version,
  optionalVisualComplexityMayDegrade:true,
  taskContinuityMayDegrade:false,
  accessibilityMayDegrade:false,
  responsivenessMayDegrade:false,
  semanticStateMayDegrade:false,
  idleRenderLoopsAllowed:false,
  continuousDecorativeAnimationDefault:false,
  forcedFramesForOptionalVisualsAllowed:false,
  measurementsManufactured:false,
  section45Complete:false
});
