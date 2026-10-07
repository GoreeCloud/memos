/* GLAZE UI V1.7 — Theme Transition System Development foundation.
 *
 * Bounded v1.2 Section 28 source layer. Theme preview/application presentation is
 * semantic and presentation-only. Glaze never commits or persists theme configuration.
 */

const GOVERNED_PROPERTIES=Object.freeze([
  'canvas-color',
  'surface-color',
  'accent-families',
  'material-atmosphere',
  'icon-tint',
  'selection-color',
  'decorative-color',
  'appearance-mode'
]);

const PROPERTY_CHANNEL=Object.freeze({
  'canvas-color':'color-shift',
  'surface-color':'color-shift',
  'accent-families':'color-shift',
  'material-atmosphere':'material-shift',
  'icon-tint':'icon-tint-shift',
  'selection-color':'selection-color-shift',
  'decorative-color':'decorative-color-shift',
  'appearance-mode':'appearance-mode-crossfade'
});

const SUPPORTED_MODES=Object.freeze(['preview','apply']);
const SUPPORTED_PHASES=Object.freeze(['intent','result']);
const PREVIEW_RESULTS=Object.freeze(['cancelled','unchanged']);
const APPLY_RESULTS=Object.freeze(['committed','failed','cancelled','unchanged']);
const PROHIBITED_KEYS=Object.freeze([
  'duration','durationMs','easing','curve','spring','physics','keyframes','path',
  'travelPx','distance','rotation','overshoot','bounce','wobble','scale','scaleFactor'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function nonEmpty(value){
  return typeof value==='string'&&value.trim().length>0;
}

function profiles(input){
  return Array.isArray(input.accessibilityProfiles)
    ? input.accessibilityProfiles.map(v=>String(v??'').trim().toLowerCase())
    : [];
}

function rejectRawMotion(input){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(`Theme Transition System accepts governed semantic intent, not raw motion control: ${key}`);
    }
  }
}

function normalizeProperties(value){
  if(!Array.isArray(value))return null;
  const seen=new Set();
  const out=[];
  for(const item of value){
    const normalized=String(item??'').trim();
    if(!GOVERNED_PROPERTIES.includes(normalized)){
      throw new RangeError(`Unsupported theme transition property: ${normalized}`);
    }
    if(!seen.has(normalized)){
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out.length>0?out:null;
}

function channelDescriptor(channel,{reducedMotion,reducedTransparency,performancePressure}){
  if(reducedMotion){
    return Object.freeze({channel,enabled:false,reason:'reduced-motion-immediate-replacement'});
  }
  if(reducedTransparency&&channel==='material-shift'){
    return Object.freeze({channel:'material-solid-equivalent',enabled:true,reason:'reduced-transparency'});
  }
  if(performancePressure&&['material-shift','appearance-mode-crossfade'].includes(channel)){
    return Object.freeze({channel,enabled:false,reason:'performance-pressure'});
  }
  return Object.freeze({channel,enabled:true,reason:'semantic-theme-continuity'});
}

function uniqueChannels(properties,options){
  const channels=[];
  const seen=new Set();
  for(const property of properties){
    const channel=PROPERTY_CHANNEL[property];
    if(seen.has(channel))continue;
    seen.add(channel);
    channels.push(channelDescriptor(channel,options));
  }
  return Object.freeze(channels.slice(0,4));
}

function authorityBlock(){
  return Object.freeze({
    presentationOnly:true,
    themeIdentityCreatedByGlaze:false,
    changedPropertiesCreatedByGlaze:false,
    themeCommitCreatedByGlaze:false,
    themeConfigurationPersistedByGlaze:false,
    providerTruthCreatedByGlaze:false,
    applicationStateChangedByGlaze:false
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
    themeTransitionCatalogImplemented:true,
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

function fallback(reason,input){
  const a11y=profiles(input);
  return Object.freeze({
    version:'1.7.0-dev.20',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([28]),
    sourceFoundation:Object.freeze({
      themeSemanticColorVersion:'1.7.0-dev.8',
      personalizationVersion:'1.7.0-dev.5',
      signatureTransitionFamiliesVersion:'1.7.0-dev.16',
      signatureMicrointeractionsVersion:'1.7.0-dev.19',
      requestAccepted:false
    }),
    transition:Object.freeze({
      mode:nonEmpty(input.mode)?input.mode.trim():null,
      phase:nonEmpty(input.phase)?input.phase.trim():null,
      sourceThemeIdentity:nonEmpty(input.sourceThemeIdentity)?input.sourceThemeIdentity.trim():null,
      targetThemeIdentity:nonEmpty(input.targetThemeIdentity)?input.targetThemeIdentity.trim():null,
      changedProperties:Object.freeze([]),
      semanticChannels:Object.freeze([]),
      effectiveThemeIdentity:nonEmpty(input.sourceThemeIdentity)?input.sourceThemeIdentity.trim():null,
      appliedThemeIdentity:nonEmpty(input.sourceThemeIdentity)?input.sourceThemeIdentity.trim():null,
      applicationState:'not-applied',
      fallbackReason:reason
    }),
    accessibility:Object.freeze({
      reducedMotionApplied:a11y.includes('reduced-motion'),
      immediateThemeReplacement:true,
      reducedTransparencyApplied:a11y.includes('reduced-transparency'),
      forcedColorsAuthorityPreserved:true,
      motionRequiredToUnderstandThemeState:false,
      accessibilityOutranksExpression:true
    }),
    performance:Object.freeze({
      optionalInterpolationMayDegrade:true,
      authoritativeThemeStateCorrect:true,
      measuredPerformanceAcceptanceEstablished:false
    }),
    authority:authorityBlock(),
    glazeMotionBoundary:Object.freeze({
      experimentalFoundationVersion:'0.6.0',
      runtimeCompatibilityBaseline:'0.4.0',
      experimentalLifecyclePromoted:false
    }),
    acceptanceBoundary:acceptanceBlock()
  });
}

export function resolveGlazeThemeTransition(input={}){
  if(!plainObject(input))throw new TypeError('Theme Transition System input must be a plain object');
  rejectRawMotion(input);

  const mode=nonEmpty(input.mode)?input.mode.trim():null;
  if(mode!==null&&!SUPPORTED_MODES.includes(mode)){
    throw new RangeError(`Unsupported theme transition mode: ${mode}`);
  }
  const phase=nonEmpty(input.phase)?input.phase.trim():null;
  if(phase!==null&&!SUPPORTED_PHASES.includes(phase)){
    throw new RangeError(`Unsupported theme transition phase: ${phase}`);
  }

  if(mode===null||phase===null||input.themeChangeAuthoritative!==true){
    return fallback('untrusted-theme-change',input);
  }
  if(
    !nonEmpty(input.sourceThemeIdentity)||
    !nonEmpty(input.targetThemeIdentity)||
    input.themeIdentityAuthoritative!==true
  ){
    return fallback('unclear-theme-identity',input);
  }

  let changedProperties;
  try{
    changedProperties=normalizeProperties(input.changedProperties);
  }catch(error){
    throw error;
  }
  if(changedProperties===null||input.changedPropertiesAuthoritative!==true){
    return fallback('untrusted-changed-properties',input);
  }

  let resultState=null;
  if(phase==='result'){
    resultState=nonEmpty(input.resultState)?input.resultState.trim():null;
    const allowed=mode==='preview'?PREVIEW_RESULTS:APPLY_RESULTS;
    if(input.resultAuthoritative!==true||!allowed.includes(resultState)){
      return fallback('untrusted-result-state',input);
    }
  }

  const source=input.sourceThemeIdentity.trim();
  const target=input.targetThemeIdentity.trim();
  const a11y=profiles(input);
  const reducedMotion=a11y.includes('reduced-motion');
  const reducedTransparency=a11y.includes('reduced-transparency');
  const performancePressure=input.performancePressure===true;
  const semanticChannels=uniqueChannels(changedProperties,{
    reducedMotion,reducedTransparency,performancePressure
  });

  let effectiveThemeIdentity=source;
  let appliedThemeIdentity=source;
  let applicationState='not-applied';

  if(mode==='preview'){
    if(phase==='intent'){
      effectiveThemeIdentity=target;
      applicationState='preview-only';
    }else{
      effectiveThemeIdentity=source;
      applicationState=resultState==='cancelled'?'preview-cancelled':'preview-unchanged';
    }
  }else if(phase==='intent'){
    effectiveThemeIdentity=target;
    applicationState='pending';
  }else if(resultState==='committed'){
    effectiveThemeIdentity=target;
    appliedThemeIdentity=target;
    applicationState='committed';
  }else{
    effectiveThemeIdentity=source;
    applicationState=resultState==='failed'?'failed':
      resultState==='cancelled'?'cancelled':'unchanged';
  }

  return Object.freeze({
    version:'1.7.0-dev.20',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([28]),
    sourceFoundation:Object.freeze({
      themeSemanticColorVersion:'1.7.0-dev.8',
      personalizationVersion:'1.7.0-dev.5',
      signatureTransitionFamiliesVersion:'1.7.0-dev.16',
      signatureMicrointeractionsVersion:'1.7.0-dev.19',
      requestAccepted:true
    }),
    transition:Object.freeze({
      mode,
      phase,
      sourceThemeIdentity:source,
      targetThemeIdentity:target,
      changedProperties:Object.freeze([...changedProperties]),
      semanticChannels,
      effectiveThemeIdentity,
      appliedThemeIdentity,
      applicationState,
      resultState
    }),
    accessibility:Object.freeze({
      reducedMotionApplied:reducedMotion,
      immediateThemeReplacement:reducedMotion,
      reducedTransparencyApplied:reducedTransparency,
      forcedColorsAuthorityPreserved:true,
      motionRequiredToUnderstandThemeState:false,
      accessibilityOutranksExpression:true
    }),
    performance:Object.freeze({
      optionalInterpolationMayDegrade:true,
      degradationApplied:performancePressure,
      authoritativeThemeStateCorrect:true,
      measuredPerformanceAcceptanceEstablished:false
    }),
    authority:authorityBlock(),
    glazeMotionBoundary:Object.freeze({
      experimentalFoundationVersion:'0.6.0',
      runtimeCompatibilityBaseline:'0.4.0',
      experimentalLifecyclePromoted:false
    }),
    acceptanceBoundary:acceptanceBlock()
  });
}

export const glazeV17ThemeTransitionSystemDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.20',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([28]),
  governedProperties:GOVERNED_PROPERTIES,
  supportedModes:SUPPORTED_MODES,
  supportedPhases:SUPPORTED_PHASES,
  appliedOnlyAfterAuthoritativeCommittedResult:true,
  previewCancellable:true,
  fullScreenSpectacleAllowed:false,
  maximumSemanticChannels:4,
  section28Complete:false,
  renderedAcceptanceEstablished:false,
  nativePlatformAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,
  performanceAcceptanceEstablished:false,
  motionFatigueAcceptanceEstablished:false,
  humanMotionReviewEstablished:false,
  glazeMotionExperimentalLifecyclePromoted:false
});
