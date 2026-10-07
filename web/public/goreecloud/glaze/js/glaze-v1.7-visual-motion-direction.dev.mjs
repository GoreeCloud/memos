/* GLAZE UI V1.7 — Visual and Motion Direction.
 *
 * Bounded v1.2 Section 43 Development foundation.
 * Comprehension precedes spectacle; material and motion remain semantic,
 * restrained, accessible, performance-aware, native, and truth-preserving.
 */

import {glazeV17CrossDeviceConsistencyDevelopmentContract}
  from './glaze-v1.7-cross-device-consistency.dev.mjs';

export const VISUAL_MOTION_ADVANCEMENT_OBJECTIVES=Object.freeze([
  'adaptive-composition','theme-architecture','semantic-color','connected-transitions',
  'spatial-continuity','microinteractions','native-platform-adaptation',
  'quiet-recognizable-motion'
]);

const SURFACE_ROLES=Object.freeze([
  'content','navigation','control','transient','overlay','system','decorative'
]);
const MATERIAL_PURPOSES=Object.freeze([
  'none','readability','hierarchy','transient-separation','connected-continuity','ambient-accent'
]);
const MOTION_PURPOSES=Object.freeze([
  'none','connected-identity','adaptive-composition','microinteraction','focus-transfer',
  'theme-change','state-change','direct-manipulation'
]);
const PROMINENCE=Object.freeze(['routine','prominent','critical']);
const EXPRESSION_PROFILES=Object.freeze(['calm','balanced','expressive']);
const PERFORMANCE_PRESSURE=Object.freeze(['neutral','constrained','severe']);
const PROHIBITED_KEYS=Object.freeze([
  'blur','blurPx','backdropBlur','backdropBlurPx','opacity','materialOpacity',
  'glassAmount','glassCoverage','glassScore','duration','durationMs','delay','delayMs',
  'easing','curve','spring','physics','damping','stiffness','keyframes','path',
  'travelPx','distancePx','scale','scaleFactor','frameTimeMs','fps','targetFps',
  'pixelHash','screenshot','screenshotSimilarity','screenshotSimilarityScore',
  'rank','score','rating','winner','preferredWinner','spectacleScore'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function member(value,allowed,label,fallback=null){
  const normalized=String(value??fallback??'').trim().toLowerCase();
  if(!allowed.includes(normalized))throw new RangeError('Unsupported '+label+': '+normalized);
  return normalized;
}

function uniqueMembers(value,allowed,label){
  const source=Array.isArray(value)?value:[];
  const out=[];
  for(const item of source){
    const normalized=member(item,allowed,label);
    if(!out.includes(normalized))out.push(normalized);
  }
  return Object.freeze(out);
}

function rejectRawControls(input,scope='visual/motion input'){
  if(!plainObject(input))return;
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(scope+' accepts semantic direction, not raw effect, pixel, performance, ranking, or acceptance controls: '+key);
    }
  }
}

function resolveAccessibility(input){
  const source=plainObject(input.accessibility)?input.accessibility:{};
  rejectRawControls(source,'accessibility input');
  const requested=Object.freeze({
    reducedMotion:source.reducedMotion===true,
    reducedTransparency:source.reducedTransparency===true,
    increasedContrast:source.increasedContrast===true,
    forcedColors:source.forcedColors===true
  });
  const authoritative=input.accessibilityAuthoritative===true;
  const effective=authoritative?requested:Object.freeze({
    reducedMotion:false,
    reducedTransparency:false,
    increasedContrast:false,
    forcedColors:false
  });
  return Object.freeze({
    requested,
    authoritative,
    effective,
    safetyReductionApplied:Object.values(effective).some(Boolean),
    untrustedNonNeutralIgnored:!authoritative&&Object.values(requested).some(Boolean),
    truthCreatedByGlaze:false
  });
}

function resolvePerformance(input){
  const requested=member(input.performancePressure,PERFORMANCE_PRESSURE,'performance pressure','neutral');
  const authoritative=input.performancePressureAuthoritative===true;
  return Object.freeze({
    requested,
    authoritative,
    effective:requested==='neutral'||authoritative?requested:'neutral',
    untrustedNonNeutralIgnored:requested!=='neutral'&&!authoritative,
    truthCreatedByGlaze:false
  });
}

function resolveExpression(input){
  const requested=member(input.expressionProfile,EXPRESSION_PROFILES,'expression profile','balanced');
  const authoritative=input.expressionProfileAuthoritative===true;
  return Object.freeze({
    requested,
    authoritative,
    effective:authoritative?requested:'balanced',
    durablePreferenceChangedByGlaze:false
  });
}

function materialDirection({surfaceRole,materialPurpose,prominence,accessibility}){
  const a=accessibility.effective;
  if(a.forcedColors)return 'forced-colors-semantic-equivalent';
  if(a.reducedTransparency||a.increasedContrast||prominence==='critical')return 'solid-certainty';
  if(surfaceRole==='decorative')return materialPurpose==='ambient-accent'
    ?'restrained-accent-only':'no-material-enrichment';

  switch(materialPurpose){
    case 'none': return 'no-material-enrichment';
    case 'readability': return 'solid-or-opaque-surface';
    case 'hierarchy': return 'restrained-hierarchy-material';
    case 'transient-separation': return 'localized-glaze-eligible';
    case 'connected-continuity': return 'coordinated-material-shift-eligible';
    case 'ambient-accent': return 'restrained-accent-only';
    default: return 'no-material-enrichment';
  }
}

function motionDirection({
  surfaceRole,motionPurpose,prominence,transitionOccurrenceAuthoritative,
  accessibility,performance,expression
}){
  if(motionPurpose==='none')return Object.freeze({directive:'none',richness:'none',reason:'no-semantic-motion-purpose'});
  if(surfaceRole==='decorative')return Object.freeze({directive:'none',richness:'none',reason:'decorative-motion-suppressed'});
  if(!transitionOccurrenceAuthoritative){
    return Object.freeze({directive:'immediate-state',richness:'minimal',reason:'transition-occurrence-not-authoritative'});
  }
  if(accessibility.effective.reducedMotion){
    return Object.freeze({directive:'reduced-motion-equivalent',richness:'minimal',reason:'reduced-motion-precedence'});
  }
  if(performance.effective==='severe'){
    return Object.freeze({directive:'immediate-state',richness:'minimal',reason:'severe-performance-pressure'});
  }
  if(accessibility.effective.forcedColors||accessibility.effective.increasedContrast){
    return Object.freeze({directive:'restrained-semantic',richness:'restrained',reason:'accessibility-clarity-precedence'});
  }
  if(prominence==='critical'){
    return Object.freeze({directive:'restrained-semantic',richness:'restrained',reason:'critical-certainty-first'});
  }
  if(performance.effective==='constrained'||expression.effective==='calm'){
    return Object.freeze({directive:'restrained-semantic',richness:'restrained',reason:'optional-richness-reduced'});
  }
  const expressiveRelationship=['connected-identity','adaptive-composition','theme-change'].includes(motionPurpose);
  if(expression.effective==='expressive'&&prominence==='prominent'&&expressiveRelationship){
    return Object.freeze({directive:'signature-emphasized',richness:'enhanced',reason:'meaningful-prominent-relationship'});
  }
  return Object.freeze({directive:'signature-standard',richness:'standard',reason:'governed-semantic-motion'});
}

function acceptanceBoundary(){
  return Object.freeze({
    sourceFoundationOnly:true,
    section43Complete:false,
    renderedAcceptanceEstablished:false,
    nativePlatformAcceptanceEstablished:false,
    assistiveTechnologyAcceptanceEstablished:false,
    representativeDeviceAcceptanceEstablished:false,
    measuredPerformanceAcceptanceEstablished:false,
    energyAcceptanceEstablished:false,
    humanVisualMotionReviewEstablished:false,
    crossDeviceVisualMotionAcceptanceEstablished:false,
    downstreamConsumerAcceptanceAutomatic:false,
    releasePromotionAutomatic:false,
    deploymentAcceptanceAutomatic:false,
    productionAcceptanceAutomatic:false
  });
}

export function resolveGlazeVisualMotionDirectionV12(input={}){
  if(!plainObject(input))throw new TypeError('Visual and Motion Direction input must be a plain object');
  rejectRawControls(input);

  const advancementAreas=uniqueMembers(input.advancementAreas,VISUAL_MOTION_ADVANCEMENT_OBJECTIVES,'advancement objective');
  if(advancementAreas.length===0)throw new RangeError('At least one governed advancement objective is required');

  const surfaceRole=member(input.surfaceRole,SURFACE_ROLES,'surface role','content');
  const materialPurpose=member(input.materialPurpose,MATERIAL_PURPOSES,'material purpose','readability');
  const motionPurpose=member(input.motionPurpose,MOTION_PURPOSES,'motion purpose','none');
  const prominence=member(input.prominence,PROMINENCE,'prominence','routine');
  const accessibility=resolveAccessibility(input);
  const performance=resolvePerformance(input);
  const expression=resolveExpression(input);
  const transitionOccurrenceAuthoritative=input.transitionOccurrenceAuthoritative===true;

  const materialDirective=materialDirection({surfaceRole,materialPurpose,prominence,accessibility});
  const motion=motionDirection({
    surfaceRole,motionPurpose,prominence,transitionOccurrenceAuthoritative,
    accessibility,performance,expression
  });

  return Object.freeze({
    version:'1.7.0-dev.36',
    lifecycle:'Development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([43]),
    advancementAreas,
    surfaceRole,
    semanticIntent:Object.freeze({materialPurpose,motionPurpose,prominence,transitionOccurrenceAuthoritative}),
    accessibility,
    performance,
    expression,
    direction:Object.freeze({
      materialDirective,
      motionDirective:motion.directive,
      motionRichness:motion.richness,
      motionReason:motion.reason,
      comprehensionBeforeSpectacle:true,
      glassEverywhereAllowed:false,
      animationEverywhereAllowed:false,
      continuousDecorativeMotionDefault:false,
      rawEffectControlsAccepted:false,
      nativeAdaptationRequired:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      transitionOccurrenceOwnedByCallerOrProvider:true,
      semanticStateOwnedByCallerOrProvider:true,
      accessibilityStateOwnedByCallerOrPlatform:true,
      performanceStateOwnedByCallerOrPlatform:true,
      nativeImplementationOwnedByPlatformOrApplication:true,
      providerTruthCreatedByGlaze:false,
      accessibilityTruthCreatedByGlaze:false,
      performanceTruthCreatedByGlaze:false,
      applicationStateChangedByGlaze:false,
      navigationExecutedByGlaze:false,
      permissionGrantedByGlaze:false,
      authorizationGrantedByGlaze:false,
      acceptanceGrantedByGlaze:false
    }),
    acceptance:acceptanceBoundary()
  });
}

export const glazeV17VisualMotionDirectionDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.36',
  lifecycle:'Development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([43]),
  advancementObjectives:VISUAL_MOTION_ADVANCEMENT_OBJECTIVES,
  crossDeviceConsistencyVersion:glazeV17CrossDeviceConsistencyDevelopmentContract.version,
  comprehensionBeforeSpectacle:true,
  glassEverywhereAllowed:false,
  animationEverywhereAllowed:false,
  continuousDecorativeMotionDefault:false,
  rawEffectControlsAccepted:false,
  rankingAllowed:false,
  winnerSelectionAllowed:false,
  stateDependsOnAnimationCompletion:false,
  section43Complete:false,
  acceptance:acceptanceBoundary()
});
