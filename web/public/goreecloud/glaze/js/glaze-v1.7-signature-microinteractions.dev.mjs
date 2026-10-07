/* GLAZE UI V1.7 — Signature Microinteractions Development foundation.
 *
 * Bounded v1.2 Section 27 source layer. It provides semantic presentation feedback
 * for common actions without executing those actions or manufacturing their result.
 * Intent feedback and authoritative result feedback remain distinct.
 */

const ACTION_CATALOG=Object.freeze({
  toggle:Object.freeze({category:'state-control',channels:Object.freeze(['geometry','color','icon-transformation'])}),
  select:Object.freeze({category:'state-control',channels:Object.freeze(['color','material','opacity'])}),
  favorite:Object.freeze({category:'state-control',channels:Object.freeze(['icon-transformation','color','bounded-scale'])}),
  save:Object.freeze({category:'command',channels:Object.freeze(['icon-transformation','material','opacity'])}),
  copy:Object.freeze({category:'command',channels:Object.freeze(['icon-transformation','material','opacity'])}),
  pin:Object.freeze({category:'state-control',channels:Object.freeze(['icon-transformation','color','bounded-scale'])}),
  expand:Object.freeze({category:'disclosure',channels:Object.freeze(['geometry','position','opacity'])}),
  collapse:Object.freeze({category:'disclosure',channels:Object.freeze(['geometry','position','opacity'])}),
  refresh:Object.freeze({category:'command',channels:Object.freeze(['icon-transformation','opacity','material'])}),
  retry:Object.freeze({category:'recovery-command',channels:Object.freeze(['icon-transformation','material','opacity'])}),
  send:Object.freeze({category:'transfer-command',channels:Object.freeze(['position','icon-transformation','opacity'])}),
  download:Object.freeze({category:'transfer-command',channels:Object.freeze(['position','icon-transformation','opacity'])}),
  upload:Object.freeze({category:'transfer-command',channels:Object.freeze(['position','icon-transformation','opacity'])}),
  completion:Object.freeze({category:'result-state',channels:Object.freeze(['icon-transformation','color','material'])}),
  reorder:Object.freeze({category:'direct-manipulation',channels:Object.freeze(['position','geometry','material'])})
});

const ACTION_ORDER=Object.freeze(Object.keys(ACTION_CATALOG));
const SUPPORTED_PHASES=Object.freeze(['intent','result']);
const SUPPORTED_RESULTS=Object.freeze(['confirmed','failed','cancelled','unchanged']);
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

function normalizedProfiles(input){
  return Array.isArray(input.accessibilityProfiles)
    ? input.accessibilityProfiles.map(value=>String(value??'').trim().toLowerCase())
    : [];
}

function rejectRawMotion(input){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(`Signature Microinteractions accepts governed action intent, not raw motion control: ${key}`);
    }
  }
}

function staticSignals(phase,resultState){
  return Object.freeze({
    phase,
    resultState:phase==='result'?resultState:null,
    semanticResultRole:phase==='result'?`action-${resultState}`:null,
    authoritativeStateMustRemainVisible:true
  });
}

function fallback(reason,input){
  const profiles=normalizedProfiles(input);
  const reducedMotion=profiles.includes('reduced-motion');
  const reducedTransparency=profiles.includes('reduced-transparency');
  return Object.freeze({
    version:'1.7.0-dev.19',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([27]),
    sourceFoundation:Object.freeze({
      adaptiveCompositionMotionVersion:'1.7.0-dev.18',
      signatureTransitionFamiliesVersion:'1.7.0-dev.16',
      signatureMotionPrinciplesVersion:'1.7.0-dev.15',
      actionAccepted:false
    }),
    interaction:Object.freeze({
      mode:'static-control-state',
      requestedAction:nonEmpty(input.action)?input.action.trim():null,
      phase:nonEmpty(input.phase)?input.phase.trim():null,
      controlIdentityAccepted:null,
      fallbackReason:reason
    }),
    motion:Object.freeze({
      channels:Object.freeze([]),
      maximumMotionChannels:3,
      quickReadableNonDisruptive:true,
      repeatedActionFatigueReductionApplied:false,
      performanceDegradationApplied:false
    }),
    staticSignals:staticSignals('intent',null),
    accessibility:Object.freeze({
      reducedMotionApplied:reducedMotion,
      immediateStateFeedbackEquivalent:true,
      reducedTransparencyApplied:reducedTransparency,
      motionRequiredToUnderstandResult:false,
      focusStateIndependentOfAnimation:true,
      accessibilityOutranksExpression:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      actionCreatedByGlaze:false,
      controlIdentityCreatedByGlaze:false,
      resultCreatedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      applicationStateChangedByGlaze:false,
      commandExecutedByGlaze:false,
      transferExecutedByGlaze:false,
      completionDeclaredByGlaze:false
    }),
    performance:Object.freeze({
      optionalMotionMayDegrade:true,
      authoritativeStateCorrect:true,
      measuredPerformanceAcceptanceEstablished:false
    }),
    glazeMotionBoundary:Object.freeze({
      experimentalFoundationVersion:'0.6.0',
      runtimeCompatibilityBaseline:'0.4.0',
      experimentalLifecyclePromoted:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,
      section22Complete:false,
      section23Complete:false,
      section24Complete:false,
      section25Complete:false,
      section26Complete:false,
      section27Complete:false,
      microinteractionCatalogImplemented:true,
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
    })
  });
}

function enabledChannel(channel,{reducedMotion,repeatedAction,performancePressure,reducedTransparency}){
  if(reducedMotion){
    return Object.freeze({channel,enabled:false,reason:'reduced-motion'});
  }
  if(repeatedAction&&['position','geometry','bounded-scale','icon-transformation'].includes(channel)){
    return Object.freeze({channel,enabled:false,reason:'repetition-fatigue'});
  }
  if(performancePressure&&['position','geometry','bounded-scale','material'].includes(channel)){
    return Object.freeze({channel,enabled:false,reason:'performance-pressure'});
  }
  if(reducedTransparency&&channel==='material'){
    return Object.freeze({channel:'material-solid-equivalent',enabled:true,reason:'reduced-transparency'});
  }
  return Object.freeze({channel,enabled:true,reason:'semantic-action-feedback'});
}

export function resolveGlazeSignatureMicrointeraction(input={}){
  if(!plainObject(input))throw new TypeError('Signature Microinteractions input must be a plain object');
  rejectRawMotion(input);

  const action=nonEmpty(input.action)?input.action.trim():null;
  if(action!==null&&!Object.prototype.hasOwnProperty.call(ACTION_CATALOG,action)){
    throw new RangeError(`Unsupported signature microinteraction action: ${action}`);
  }
  if(action===null||input.actionAuthoritative!==true){
    return fallback('untrusted-action',input);
  }
  if(!nonEmpty(input.controlIdentity)||input.controlIdentityAuthoritative!==true){
    return fallback('unclear-control-identity',input);
  }

  const phase=nonEmpty(input.phase)?input.phase.trim():null;
  if(phase===null)return fallback('missing-phase',input);
  if(!SUPPORTED_PHASES.includes(phase)){
    throw new RangeError(`Unsupported signature microinteraction phase: ${phase}`);
  }

  let resultState=null;
  if(phase==='result'){
    resultState=nonEmpty(input.resultState)?input.resultState.trim():null;
    if(input.resultAuthoritative!==true||!SUPPORTED_RESULTS.includes(resultState)){
      return fallback('untrusted-result-state',input);
    }
  }

  const policy=ACTION_CATALOG[action];
  const profiles=normalizedProfiles(input);
  const reducedMotion=profiles.includes('reduced-motion');
  const reducedTransparency=profiles.includes('reduced-transparency');
  const repeatedAction=input.repeatedAction===true;
  const performancePressure=input.performancePressure===true;
  const channels=policy.channels.map(channel=>enabledChannel(channel,{
    reducedMotion,repeatedAction,performancePressure,reducedTransparency
  }));

  return Object.freeze({
    version:'1.7.0-dev.19',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([27]),
    sourceFoundation:Object.freeze({
      adaptiveCompositionMotionVersion:'1.7.0-dev.18',
      signatureTransitionFamiliesVersion:'1.7.0-dev.16',
      signatureMotionPrinciplesVersion:'1.7.0-dev.15',
      actionAccepted:true
    }),
    interaction:Object.freeze({
      mode:'signature-microinteraction',
      action,
      category:policy.category,
      phase,
      controlIdentityAccepted:input.controlIdentity.trim(),
      resultAuthorityAccepted:phase==='result',
      resultState
    }),
    motion:Object.freeze({
      channels:Object.freeze(channels),
      maximumMotionChannels:3,
      quickReadableNonDisruptive:true,
      repeatedActionFatigueReductionApplied:repeatedAction,
      performanceDegradationApplied:performancePressure
    }),
    staticSignals:staticSignals(phase,resultState),
    accessibility:Object.freeze({
      reducedMotionApplied:reducedMotion,
      immediateStateFeedbackEquivalent:reducedMotion,
      reducedTransparencyApplied:reducedTransparency,
      motionRequiredToUnderstandResult:false,
      focusStateIndependentOfAnimation:true,
      accessibilityOutranksExpression:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      actionCreatedByGlaze:false,
      controlIdentityCreatedByGlaze:false,
      resultCreatedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      applicationStateChangedByGlaze:false,
      commandExecutedByGlaze:false,
      transferExecutedByGlaze:false,
      completionDeclaredByGlaze:false
    }),
    performance:Object.freeze({
      optionalMotionMayDegrade:true,
      authoritativeStateCorrect:true,
      measuredPerformanceAcceptanceEstablished:false
    }),
    glazeMotionBoundary:Object.freeze({
      experimentalFoundationVersion:'0.6.0',
      runtimeCompatibilityBaseline:'0.4.0',
      experimentalLifecyclePromoted:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,
      section22Complete:false,
      section23Complete:false,
      section24Complete:false,
      section25Complete:false,
      section26Complete:false,
      section27Complete:false,
      microinteractionCatalogImplemented:true,
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
    })
  });
}

export const glazeV17SignatureMicrointeractionsDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.19',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([27]),
  actionOrder:ACTION_ORDER,
  supportedPhases:SUPPORTED_PHASES,
  supportedResultStates:SUPPORTED_RESULTS,
  maximumMotionChannels:3,
  resultFeedbackRequiresAuthoritativeResult:true,
  repeatedActionFatigueReduction:true,
  section27Complete:false,
  renderedAcceptanceEstablished:false,
  nativePlatformAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,
  performanceAcceptanceEstablished:false,
  motionFatigueAcceptanceEstablished:false,
  humanMotionReviewEstablished:false,
  glazeMotionExperimentalLifecyclePromoted:false
});
