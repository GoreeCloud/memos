/* GLAZE UI V1.7 — Motion Performance Development foundation.
 *
 * Bounded v1.2 Section 33 source layer. Resolves independently-authorized
 * caller/provider environmental signals into deterministic presentation
 * simplification. It does not manufacture measurements, mutate application
 * state, or create release/acceptance authority. The approved performance budget
 * remains external exact-revision qualification authority.
 */

import {
  resolveGlazeMotionFatigueProtection,
  glazeV17MotionFatigueProtectionDevelopmentContract
} from './glaze-v1.7-motion-fatigue-protection.dev.mjs';
import {glazeV16PerformanceDiagnosticsDevelopmentContract} from './glaze-v1.6-performance-diagnostics.dev.mjs';

const RUNTIME_PRESSURE=Object.freeze(['none','elevated','severe']);
const THERMAL_STATE=Object.freeze(['none','constrained','critical']);
const HARDWARE_CLASS=Object.freeze(['standard','constrained']);
const REFRESH_CLASS=Object.freeze(['normal','low']);
const VISIBILITY_CLASS=Object.freeze(['visible','offscreen','background','obscured']);
const MOTION_KINDS=Object.freeze([
  'direct-manipulation','task-transition','connected-transformation','adaptive-recomposition',
  'material','skeleton','decorative','continuous-decorative'
]);
const PERFORMANCE_MODES=Object.freeze(['full','restrained','simplified','minimal','reduced-motion']);
const PROHIBITED_KEYS=Object.freeze([
  'duration','durationMs','easing','curve','spring','physics','keyframes','path',
  'travelPx','distance','distancePx','rotation','scale','scaleFactor','overshoot',
  'bounce','wobble','stiffness','damping','dampingRatio','frameBudget','frameBudgetMs',
  'fpsTarget','targetFps','refreshRateHz','cpuThreshold','gpuThreshold','thermalThreshold',
  'measurements','samples','performanceMeasurements','performanceEvidence',
  'frameTimeMs','fps','resolverP95Ms','resolverP99Ms','interactionPaintP95Ms',
  'interactionPaintP99Ms','severeFrameStallRate'
]);

const APPROVED_PERFORMANCE_BUDGET=glazeV16PerformanceDiagnosticsDevelopmentContract.approvedPerformanceBudget;

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function semantic(value,fallback){
  const normalized=String(value??'').trim().toLowerCase();
  return normalized||fallback;
}

function member(value,allowed,label,fallback){
  const normalized=semantic(value,fallback);
  if(!allowed.includes(normalized))throw new RangeError('Unsupported '+label+': '+normalized);
  return normalized;
}

function profiles(value){
  if(!Array.isArray(value))return Object.freeze([]);
  return Object.freeze([...new Set(value.map(v=>semantic(v,'')).filter(Boolean))].slice(0,64));
}

function rejectRawControls(input){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError('Motion Performance accepts semantic signals, not raw animation controls, measurements, or caller performance thresholds: '+key);
    }
  }
}

function governedSignal(requested,neutral,authoritative){
  const isNeutral=requested===neutral;
  const trusted=isNeutral||authoritative===true;
  return Object.freeze({
    requested,
    effective:trusted?requested:neutral,
    authoritative:isNeutral||authoritative===true,
    fallbackUsed:!trusted
  });
}

function governedBoolean(requested,authoritative){
  const value=requested===true;
  const trusted=!value||authoritative===true;
  return Object.freeze({
    requested:value,
    effective:trusted?value:false,
    authoritative:!value||authoritative===true,
    fallbackUsed:!trusted
  });
}

function directiveFor(kind,mode){
  if(kind==='direct-manipulation'){
    return mode==='full'
      ? 'preserve-input-tracking-with-governed-settle'
      : 'preserve-input-tracking-and-simplify-post-release-settle';
  }
  if(mode==='full')return 'preserve-governed-semantic-motion';
  if(mode==='reduced-motion')return 'use-reduced-motion-semantic-equivalent';
  if(kind==='skeleton')return 'static-skeleton';
  if(kind==='material')return mode==='restrained'?'restrain-material-animation':'static-material-state';
  if(kind==='decorative')return 'suppress-optional-decorative-motion';
  if(kind==='continuous-decorative')return 'stop-optional-continuous-motion';
  if(kind==='adaptive-recomposition')return mode==='restrained'
    ? 'restrain-recomposition-motion'
    : 'immediate-recomposition-with-stable-focus';
  if(kind==='connected-transformation')return mode==='restrained'
    ? 'simplify-connected-transformation'
    : 'simple-state-transition-or-replacement';
  return mode==='restrained'
    ? 'restrain-semantic-transition'
    : mode==='simplified'
      ? 'simpler-semantic-transition'
      : 'immediate-state-with-brief-semantic-emphasis';
}

function performanceState(input,fatigue,reducedMotion){
  const runtimePressure=governedSignal(
    member(input.runtimePressure,RUNTIME_PRESSURE,'runtime pressure','none'),
    'none',input.runtimePressureAuthoritative
  );
  const powerSaving=governedBoolean(input.powerSaving,input.powerSavingAuthoritative);
  const thermalState=governedSignal(
    member(input.thermalState,THERMAL_STATE,'thermal state','none'),
    'none',input.thermalStateAuthoritative
  );
  const hardwareClass=governedSignal(
    member(input.hardwareClass,HARDWARE_CLASS,'hardware class','standard'),
    'standard',input.hardwareClassAuthoritative
  );
  const refreshClass=governedSignal(
    member(input.refreshClass,REFRESH_CLASS,'refresh class','normal'),
    'normal',input.refreshClassAuthoritative
  );
  const performanceDegraded=governedBoolean(input.performanceDegraded,input.performanceDegradedAuthoritative);
  const visibility=governedSignal(
    member(input.visibilityClass,VISIBILITY_CLASS,'visibility class','visible'),
    'visible',input.visibilityClassAuthoritative
  );

  const signals=Object.freeze({
    runtimePressure,powerSaving,thermalState,hardwareClass,refreshClass,performanceDegraded,visibility
  });
  const untrustedNonNeutralSignalIgnored=Object.values(signals).some(signal=>signal.fallbackUsed===true);

  const reasons=[];
  if(runtimePressure.effective!=='none')reasons.push('runtime-pressure-'+runtimePressure.effective);
  if(powerSaving.effective)reasons.push('power-saving');
  if(thermalState.effective!=='none')reasons.push('thermal-'+thermalState.effective);
  if(hardwareClass.effective==='constrained')reasons.push('constrained-hardware');
  if(refreshClass.effective==='low')reasons.push('low-refresh');
  if(performanceDegraded.effective)reasons.push('performance-degraded');
  if(visibility.effective!=='visible')reasons.push('visibility-'+visibility.effective);
  if(fatigue.budget.exhausted)reasons.push('motion-budget-pressure');
  if(reducedMotion)reasons.push('reduced-motion');

  let severity=0;
  if(reasons.length>0)severity=1;
  if(reasons.filter(reason=>reason!=='reduced-motion').length>=2)severity=2;
  if(runtimePressure.effective==='severe'||thermalState.effective==='critical'||visibility.effective!=='visible')severity=3;

  const mode=reducedMotion
    ? 'reduced-motion'
    : severity>=3?'minimal'
      : severity===2?'simplified'
        : severity===1?'restrained'
          :'full';

  return Object.freeze({
    mode,severity,reasons:Object.freeze(reasons),
    runtimePressure,powerSaving,thermalState,hardwareClass,refreshClass,performanceDegraded,visibility,
    untrustedNonNeutralSignalIgnored
  });
}

function performanceBudgetReference(){
  return Object.freeze({
    source:APPROVED_PERFORMANCE_BUDGET.source,
    sourceVersion:APPROVED_PERFORMANCE_BUDGET.sourceVersion,
    thresholds:Object.freeze({
      resolverP95MsMax:APPROVED_PERFORMANCE_BUDGET.resolverP95MsMax,
      resolverP99MsMax:APPROVED_PERFORMANCE_BUDGET.resolverP99MsMax,
      interactionPaintP95MsMax:APPROVED_PERFORMANCE_BUDGET.interactionPaintP95MsMax,
      interactionPaintP99MsMax:APPROVED_PERFORMANCE_BUDGET.interactionPaintP99MsMax,
      activeFrameP95MinimumCeilingMs:APPROVED_PERFORMANCE_BUDGET.activeFrameP95MinimumCeilingMs,
      activeFrameP95IdleMultiplier:APPROVED_PERFORMANCE_BUDGET.activeFrameP95IdleMultiplier,
      severeFrameStallRateMax:APPROVED_PERFORMANCE_BUDGET.severeFrameStallRateMax,
      catastrophicForegroundStallCountMax:APPROVED_PERFORMANCE_BUDGET.catastrophicForegroundStallCountMax,
      taskStateResetCountMax:APPROVED_PERFORMANCE_BUDGET.taskStateResetCountMax,
      pageReloadRequiredCountMax:APPROVED_PERFORMANCE_BUDGET.pageReloadRequiredCountMax,
      automaticAuthorityActionCountMax:APPROVED_PERFORMANCE_BUDGET.automaticAuthorityActionCountMax
    }),
    minimumSamples:APPROVED_PERFORMANCE_BUDGET.minimumSamples,
    exactRevisionRepresentativeMeasurementsRequired:true,
    acceptanceMayBeInferredFromThisResolver:false
  });
}

export function resolveGlazeMotionPerformance(input={}){
  if(!plainObject(input))throw new TypeError('Motion Performance input must be a plain object');
  rejectRawControls(input);

  const accessibilityProfiles=profiles(input.accessibilityProfiles);
  const reducedMotion=accessibilityProfiles.includes('reduced-motion')||accessibilityProfiles.includes('minimal-motion');
  const motionKind=member(input.motionKind,MOTION_KINDS,'motion kind','task-transition');
  const fatigue=resolveGlazeMotionFatigueProtection({
    activeMotion:plainObject(input.activeMotion)?input.activeMotion:{},
    accessibilityProfiles,
    repeatedActionPressure:input.repeatedActionPressure===true,
    majorTransitionActive:input.majorTransitionActive===true,
    decorativeMotionRequested:input.decorativeMotionRequested===true
  });
  const performance=performanceState(input,fatigue,reducedMotion);
  const directManipulation=motionKind==='direct-manipulation'||input.directManipulation===true;
  const offscreen=performance.visibility.effective!=='visible';
  const directive=offscreen&&!directManipulation
    ? 'suspend-or-immediately-resolve-offscreen-optional-motion'
    : directiveFor(directManipulation?'direct-manipulation':motionKind,performance.mode);

  return Object.freeze({
    version:'1.7.0-dev.25',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([33]),
    motionKind,
    performance,
    performanceBudgetReference:performanceBudgetReference(),
    presentation:Object.freeze({
      directive,
      compositorFriendlyTechniquesPreferred:true,
      preferredTechniques:Object.freeze(['transform','opacity','bounded-clipping','platform-native-compositor-primitives']),
      avoidWhenEquivalent:Object.freeze([
        'layout-driven-animation','synchronous-layout-measurement-loops','unbounded-repainting',
        'continuous-main-thread-rendering','unbounded-shader-complexity'
      ]),
      optionalMotionMayDegrade:true,
      offscreenOptionalWorkSuspended:offscreen,
      idleRenderLoopsAllowed:false,
      directManipulationTrackingPreserved:true,
      taskRelevantStateChangePreserved:true,
      semanticMeaningPreserved:true
    }),
    inheritedFatigueProtection:fatigue,
    accessibility:Object.freeze({
      profiles:accessibilityProfiles,
      reducedMotionApplied:reducedMotion,
      reducedMotionEquivalentCatalogRequired:reducedMotion,
      precedence:true,
      criticalInteractionMayRequireObservingMotion:false
    }),
    evidence:Object.freeze({
      environmentSignalsRequireAuthority:true,
      untrustedNonNeutralSignalIgnored:performance.untrustedNonNeutralSignalIgnored,
      measurementsAcceptedByThisResolver:false,
      measurementsManufactured:false,
      measuredFramePacingEstablished:false,
      measuredInteractionLatencyEstablished:false,
      energyImpactEstablished:false,
      performanceAcceptanceEstablished:false
    }),
    invariants:Object.freeze({
      applicationStateChangedByGlaze:false,
      navigationExecutedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      performanceTruthCreatedByGlaze:false,
      semanticStatePreserved:true,
      authoritativeStatePreserved:true,
      focusPreserved:true,
      taskContinuityPreserved:true,
      finalStateDependsOnAnimationCompletion:false,
      directManipulationTrackingPreserved:true,
      inputMayWaitForDecorativeMotion:false
    }),
    glazeMotionBoundary:Object.freeze({
      experimentalFoundationVersion:'0.6.0',
      runtimeCompatibilityBaseline:'0.4.0',
      experimentalLifecyclePromoted:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,
      section33Complete:false,
      motionPerformancePolicyImplemented:true,
      measuredPerformanceAcceptanceEstablished:false,
      renderedAcceptanceEstablished:false,
      nativePlatformAcceptanceEstablished:false,
      assistiveTechnologyAcceptanceEstablished:false,
      thermalPowerAcceptanceEstablished:false,
      lowEndHardwareAcceptanceEstablished:false,
      lowRefreshAcceptanceEstablished:false,
      highRefreshAcceptanceEstablished:false,
      humanMotionReviewEstablished:false,
      downstreamConsumerAcceptanceAutomatic:false,
      releasePromotionAutomatic:false,
      deploymentAcceptanceAutomatic:false,
      productionAcceptanceAutomatic:false
    })
  });
}

export const glazeV17MotionPerformanceDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.25',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([33]),
  runtimePressure:RUNTIME_PRESSURE,
  thermalState:THERMAL_STATE,
  hardwareClass:HARDWARE_CLASS,
  refreshClass:REFRESH_CLASS,
  visibilityClass:VISIBILITY_CLASS,
  motionKinds:MOTION_KINDS,
  performanceModes:PERFORMANCE_MODES,
  environmentSignalsRequireAuthority:true,
  untrustedNonNeutralSignalsIgnored:true,
  measurementsAcceptedByResolver:false,
  approvedPerformanceBudget:APPROVED_PERFORMANCE_BUDGET,
  compositorFriendlyTechniquesPreferred:true,
  offscreenOptionalWorkSuspended:true,
  idleRenderLoopsAllowed:false,
  directManipulationTrackingPreserved:true,
  semanticStatePreserved:true,
  measurementsManufactured:false,
  section33Complete:false,
  measuredPerformanceAcceptanceEstablished:false,
  thermalPowerAcceptanceEstablished:false,
  humanMotionReviewEstablished:false,
  motionFatigueDependencyVersion:glazeV17MotionFatigueProtectionDevelopmentContract.version,
  glazeMotionExperimentalLifecyclePromoted:false
});
