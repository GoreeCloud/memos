/* GLAZE UI V1.7 — Glaze Studio v1.2 Development foundation.
 * Bounded v1.2 Section 40 preview/comparison layer over historical dev.12.
 */
import {
  createGlazeStudioSession,
  glazeV17StudioDevelopmentContract
} from './glaze-v1.7-studio.dev.mjs';
import {
  inspectGlazeElementV12,
  glazeV17InspectorV12DevelopmentContract
} from './glaze-v1.7-inspector-v1-2.dev.mjs';
import {
  resolveGlazeMotionExpressionProfile,
  glazeV17MotionExpressionProfilesDevelopmentContract
} from './glaze-v1.7-motion-expression-profiles.dev.mjs';
import {
  glazeV17ReducedMotionEquivalentsDevelopmentContract
} from './glaze-v1.7-reduced-motion-equivalents.dev.mjs';
import {
  glazeV17MotionPerformanceDevelopmentContract
} from './glaze-v1.7-motion-performance.dev.mjs';
import {
  glazeV17AdvancedThemeSystemV12DevelopmentContract
} from './glaze-v1.7-advanced-theme-system-v1-2.dev.mjs';
import {
  glazeV17ExpandedComponentSystemV12DevelopmentContract
} from './glaze-v1.7-expanded-component-system-v1-2.dev.mjs';

export const STUDIO_V12_PREVIEW_DOMAINS=Object.freeze([
  'signature-transitions','motion-profiles','components','adaptive-layout-changes',
  'form-factor-transitions','themes','color-palettes','accessibility-modes',
  'reduced-motion','input-models','semantic-states'
]);
export const STUDIO_V12_PREVIEW_KINDS=Object.freeze([
  'signature-transition','motion-profile','component','adaptive-layout-change',
  'form-factor-transition','theme','color-palette','accessibility-mode',
  'reduced-motion','input-model','semantic-state'
]);
export const STUDIO_V12_COMPARISON_MODES=Object.freeze(['calm','balanced','expressive','reduced-motion']);
const MODE_TO_INTENSITY=Object.freeze({calm:'minimal',balanced:'standard',expressive:'expressive','reduced-motion':'standard'});
const RAW_OR_ACCEPTANCE_KEYS=Object.freeze([
  'duration','durationMs','durationMilliseconds','easing','curve','cubicBezier','spring','physics','keyframes','path',
  'travelPx','distance','distancePx','rotation','scale','scaleFactor','overshoot','bounce','wobble','stiffness','damping',
  'dampingRatio','frameBudget','frameBudgetMs','fpsTarget','targetFps','refreshRateHz','cpuThreshold','gpuThreshold',
  'measurements','samples','performanceMeasurements','performanceEvidence','frameTimeMs','fps','acceptedWinner','ranking','score','rating'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function boundedText(value,max=180){
  const normalized=String(value??'').trim();
  return normalized?normalized.slice(0,max):null;
}
function member(value,allowed,label,fallback=null){
  const normalized=boundedText(value,100)??fallback;
  if(!allowed.includes(normalized))throw new RangeError(`Unsupported ${label}: ${normalized}`);
  return normalized;
}
function uniqueStrings(values,max=64){
  if(!Array.isArray(values))return Object.freeze([]);
  return Object.freeze([...new Set(values.map(value=>boundedText(value,100)).filter(Boolean))].slice(0,max));
}
function rejectRawOrAcceptanceControls(input){
  for(const key of RAW_OR_ACCEPTANCE_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError('Glaze Studio v1.2 accepts semantic preview state, not raw animation/performance or acceptance controls: '+key);
    }
  }
}
function withReducedMotion(profiles){
  return Object.freeze([...new Set([...profiles,'reduced-motion'])]);
}
function motionProfileForPreview(input,comparisonMode=null){
  const baseProfiles=uniqueStrings(input.accessibilityProfiles);
  if(comparisonMode!==null){
    const mode=member(comparisonMode,STUDIO_V12_COMPARISON_MODES,'Studio comparison mode');
    const accessibilityProfiles=mode==='reduced-motion'?withReducedMotion(baseProfiles):baseProfiles;
    const resolved=resolveGlazeMotionExpressionProfile({
      motionIntensity:MODE_TO_INTENSITY[mode],
      motionIntensityAuthoritative:true,
      accessibilityProfiles,
      performanceConstraint:input.performanceConstraint,
      performanceConstraintAuthoritative:input.performanceConstraintAuthoritative
    });
    return Object.freeze({
      mode,
      simulationSelection:true,
      durablePreferenceAuthorityCreated:false,
      durablePreferencePersisted:false,
      resolved
    });
  }
  const resolved=resolveGlazeMotionExpressionProfile({
    motionIntensity:input.motionIntensity,
    motionIntensityAuthoritative:input.motionIntensityAuthoritative,
    accessibilityProfiles:baseProfiles,
    performanceConstraint:input.performanceConstraint,
    performanceConstraintAuthoritative:input.performanceConstraintAuthoritative
  });
  return Object.freeze({
    mode:null,
    simulationSelection:false,
    durablePreferenceAuthorityCreated:false,
    durablePreferencePersisted:false,
    resolved
  });
}
function inspectorInput(input,accessibilityProfiles){
  return {
    ...input,
    component:input.component??'GlzThemePreview',
    profile:input.profile??'mobile',
    accessibilityProfiles
  };
}
function buildPreview(input,comparisonMode=null){
  if(!plainObject(input))throw new TypeError('Glaze Studio v1.2 preview input must be a plain object');
  rejectRawOrAcceptanceControls(input);
  const previewKind=member(input.previewKind,STUDIO_V12_PREVIEW_KINDS,'Studio preview kind','component');
  const scenarioId=boundedText(input.scenarioId,120)??'studio-v1-2-scenario';
  const baseAccessibility=uniqueStrings(input.accessibilityProfiles);
  const comparisonAccessibility=comparisonMode==='reduced-motion'?withReducedMotion(baseAccessibility):baseAccessibility;
  const inspected=inspectGlazeElementV12(inspectorInput(input,comparisonAccessibility));
  const motionProfile=motionProfileForPreview({...input,accessibilityProfiles:comparisonAccessibility},comparisonMode);
  const sourceStateAuthoritative=input.sourceStateAuthoritative===true;

  return Object.freeze({
    version:'1.7.0-dev.33',lifecycle:'development',stableBaseline:'1.6.0',consumerEligible:false,
    planVersion:'v1.2',v12SpecificationSections:Object.freeze([40]),
    historicalFoundation:Object.freeze({
      version:glazeV17StudioDevelopmentContract.version,
      planNumbering:'v1.1-historical-numbering',historicalSpecificationSection:27,reinterpretedAsV12Section40:false
    }),
    scenario:Object.freeze({
      id:scenarioId,previewKind,sourceStateAuthoritative,simulation:!sourceStateAuthoritative,
      productionStateMutated:false,providerTruthCreatedByStudio:false
    }),
    preview:Object.freeze({
      currentMotionFamily:inspected.currentMotionFamily,
      transitionEndpoints:inspected.transitionEndpoints,
      connectedIdentity:inspected.connectedIdentity,
      semanticTiming:inspected.semanticTiming,
      motionMagnitude:inspected.motionMagnitude,
      motionBudget:inspected.motionBudget,
      reducedMotionMapping:inspected.reducedMotionMapping,
      motionProfile,
      component:inspected.component,
      adaptiveLayout:inspected.currentComponentResolution.componentState.presentation.adaptive,
      formFactor:Object.freeze({profile:inspected.currentComponentResolution.componentState.presentation.adaptive.profile}),
      themeResolution:inspected.themeResolution,
      advancedThemeResolution:inspected.advancedThemeResolution,
      semanticColorResolution:inspected.semanticColorResolution,
      materialResolution:inspected.materialResolution,
      focusState:inspected.focusState,
      accessibilityOverrides:inspected.accessibilityOverrides,
      inputModel:inspected.historicalInspection.inputMapping,
      semanticState:inspected.currentComponentResolution.componentState.semanticColor,
      selectionExplanation:inspected.selectionExplanation
    }),
    inspector:inspected,
    evidenceBoundary:Object.freeze({
      previewOnly:true,renderedEvidenceClaimed:false,nativeAcceptanceClaimed:false,
      assistiveTechnologyAcceptanceClaimed:false,measuredPerformanceAcceptanceClaimed:false,
      representativeDeviceAcceptanceClaimed:false,energyAcceptanceClaimed:false,humanReviewClaimed:false
    }),
    privacy:Object.freeze({
      localFirst:true,networkRequired:false,telemetryRequired:false,privateContentRequired:false,
      rawUserContentCapturedByDefault:false,remoteRuntimeResourcesRequired:false
    }),
    authority:Object.freeze({
      boundary:'development-preview-comparison-only',advisoryOnly:true,sourceModifiedAutomatically:false,
      animationExecutedByStudio:false,themePersistedAutomatically:false,userPreferenceCreatedByStudio:false,
      providerTruthCreatedByStudio:false,semanticTruthCreatedByStudio:false,accessibilityStateCreatedByStudio:false,
      platformCapabilityCreatedByStudio:false,applicationActionsExecutedByStudio:false,navigationExecutedByStudio:false,
      acceptanceGrantedByStudio:false,lifecyclePromotionAutomatic:false,deploymentAcceptanceAutomatic:false,
      productionAcceptanceAutomatic:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,section40Complete:false,renderedAcceptanceEstablished:false,
      nativePlatformAcceptanceEstablished:false,assistiveTechnologyAcceptanceEstablished:false,
      measuredPerformanceAcceptanceEstablished:false,representativeDeviceAcceptanceEstablished:false,
      energyAcceptanceEstablished:false,humanVisualMotionReviewEstablished:false,
      downstreamConsumerAcceptanceAutomatic:false,releasePromotionAutomatic:false,
      deploymentAcceptanceAutomatic:false,productionAcceptanceAutomatic:false
    })
  });
}

export function createGlazeStudioSessionV12(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Studio v1.2 session input must be a plain object');
  rejectRawOrAcceptanceControls(input);
  const historical=createGlazeStudioSession(input);
  return Object.freeze({
    version:'1.7.0-dev.33',lifecycle:'development',stableBaseline:'1.6.0',consumerEligible:false,
    planVersion:'v1.2',v12SpecificationSections:Object.freeze([40]),
    historicalFoundation:Object.freeze({
      version:historical.version,planNumbering:'v1.1-historical-numbering',historicalSpecificationSection:27,
      reinterpretedAsV12Section40:false
    }),
    sessionId:historical.sessionId,role:historical.role,historicalSession:historical,
    previewDomains:STUDIO_V12_PREVIEW_DOMAINS,previewKinds:STUDIO_V12_PREVIEW_KINDS,
    comparisonModes:STUDIO_V12_COMPARISON_MODES,
    localOnly:true,networkRequired:false,telemetryRequired:false,sourceMutationAutomatic:false,
    animationExecutionAutomatic:false,themePersistenceAutomatic:false,acceptanceGrantedByStudio:false
  });
}

export function createGlazeStudioPreviewV12(input={}){
  return buildPreview(input,null);
}

export function compareGlazeStudioPreviewsV12(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Studio v1.2 comparison input must be a plain object');
  rejectRawOrAcceptanceControls(input);
  if(!Array.isArray(input.scenarios)||input.scenarios.length<2||input.scenarios.length>8){
    throw new RangeError('Glaze Studio v1.2 comparison requires 2 to 8 scenarios');
  }
  const previews=Object.freeze(input.scenarios.map((scenario,index)=>{
    if(!plainObject(scenario))throw new TypeError(`Studio comparison scenario ${index+1} must be a plain object`);
    return buildPreview({...scenario,scenarioId:scenario.scenarioId??`studio-v1-2-scenario-${index+1}`},null);
  }));
  return Object.freeze({
    version:'1.7.0-dev.33',comparisonType:'semantic-preview-side-by-side',previews,
    comparisonDomains:STUDIO_V12_PREVIEW_DOMAINS,rankingPerformed:false,acceptedWinner:null,
    sourceMutationPerformed:false,animationExecuted:false,acceptanceGrantedByStudio:false,
    lifecyclePromotionAutomatic:false
  });
}

export function compareGlazeStudioMotionModesV12(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Studio v1.2 motion comparison input must be a plain object');
  rejectRawOrAcceptanceControls(input);
  const previews=Object.freeze(STUDIO_V12_COMPARISON_MODES.map(mode=>buildPreview({
    ...input,previewKind:'motion-profile',scenarioId:`${boundedText(input.scenarioId,100)??'motion-comparison'}:${mode}`
  },mode)));
  return Object.freeze({
    version:'1.7.0-dev.33',comparisonType:'motion-expression-side-by-side',
    modeOrder:STUDIO_V12_COMPARISON_MODES,previews,
    calm:previews[0],balanced:previews[1],expressive:previews[2],reducedMotion:previews[3],
    rankingPerformed:false,acceptedWinner:null,preferencePersistedByStudio:false,
    sourceMutationPerformed:false,animationExecuted:false,acceptanceGrantedByStudio:false,
    lifecyclePromotionAutomatic:false
  });
}

export const glazeV17StudioV12DevelopmentContract=Object.freeze({
  version:'1.7.0-dev.33',lifecycle:'development',stableBaseline:'1.6.0',consumerEligible:false,
  planVersion:'v1.2',v12SpecificationSections:Object.freeze([40]),
  previewDomains:STUDIO_V12_PREVIEW_DOMAINS,previewKinds:STUDIO_V12_PREVIEW_KINDS,
  comparisonModes:STUDIO_V12_COMPARISON_MODES,
  historicalFoundationVersion:glazeV17StudioDevelopmentContract.version,
  historicalFoundationPlanNumbering:'v1.1-historical-numbering',historicalFoundationReinterpreted:false,
  inspectorFoundationVersion:glazeV17InspectorV12DevelopmentContract.version,
  motionExpressionProfilesFoundationVersion:glazeV17MotionExpressionProfilesDevelopmentContract.version,
  reducedMotionFoundationVersion:glazeV17ReducedMotionEquivalentsDevelopmentContract.version,
  motionPerformanceFoundationVersion:glazeV17MotionPerformanceDevelopmentContract.version,
  advancedThemeFoundationVersion:glazeV17AdvancedThemeSystemV12DevelopmentContract.version,
  expandedComponentFoundationVersion:glazeV17ExpandedComponentSystemV12DevelopmentContract.version,
  rawAnimationValuesAccepted:false,rawPerformanceMeasurementsAccepted:false,
  animationExecutedByStudio:false,sourceMutationAllowed:false,themePersistenceAutomatic:false,
  providerTruthCreatedByStudio:false,userPreferenceCreatedByStudio:false,rankingPerformed:false,
  localFirst:true,networkRequired:false,telemetryRequired:false,section40Complete:false,
  renderedAcceptanceEstablished:false,nativePlatformAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,measuredPerformanceAcceptanceEstablished:false,
  representativeDeviceAcceptanceEstablished:false,energyAcceptanceEstablished:false,
  humanVisualMotionReviewEstablished:false,glazeMotionExperimentalLifecyclePromoted:false
});
