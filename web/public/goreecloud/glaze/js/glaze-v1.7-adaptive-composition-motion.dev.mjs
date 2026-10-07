/* GLAZE UI V1.7 — Adaptive Composition Motion Development foundation.
 *
 * Bounded v1.2 Section 26 source layer over Connected Transformation 2.0 dev.17
 * and Signature Transition Families dev.16. It preserves spatial/task continuity
 * when an authoritative adaptive composition change and identity are supplied.
 * It never invents layout, form-factor, pane, window, provider, navigation, or focus truth.
 */

import {
  resolveGlazeSignatureTransitionFamily,
  glazeV17SignatureTransitionFamiliesDevelopmentContract
} from './glaze-v1.7-signature-transition-families.dev.mjs';
import {
  glazeV17ConnectedTransformation2DevelopmentContract
} from './glaze-v1.7-connected-transformation-2.dev.mjs';

const COMPOSITION_CATALOG=Object.freeze({
  'reposition':Object.freeze({relationship:'workspace-recomposition',family:'Glaze Flow',identityMode:'element-set'}),
  'resize':Object.freeze({relationship:'workspace-recomposition',family:'Glaze Flow',identityMode:'element-set'}),
  'hierarchy-change':Object.freeze({relationship:'workspace-recomposition',family:'Glaze Flow',identityMode:'task-and-element-set'}),
  'move-between-panes':Object.freeze({relationship:'workspace-recomposition',family:'Glaze Flow',identityMode:'task-and-element-set'}),
  'merge':Object.freeze({relationship:'posture-partition',family:'Glaze Fold',identityMode:'task-and-element-set'}),
  'separate':Object.freeze({relationship:'posture-partition',family:'Glaze Fold',identityMode:'task-and-element-set'}),
  'reorder':Object.freeze({relationship:'workspace-recomposition',family:'Glaze Flow',identityMode:'element-set'}),
  'material-level-change':Object.freeze({relationship:'material-role-change',family:'Glaze Material Shift',identityMode:'element-set'})
});

const CHANGE_ORDER=Object.freeze(Object.keys(COMPOSITION_CATALOG));
const SUPPORTED_CONTEXTS=Object.freeze([
  'mobile-tablet-recomposition',
  'foldable-posture-change',
  'desktop-window-resize',
  'multi-pane-workspace'
]);
const PROHIBITED_KEYS=Object.freeze([
  'relationship','relationshipAuthoritative','family','signatureFamily','requestedFamily',
  'duration','durationMs','easing','spring','physics','keyframes','path','travelPx','distance',
  'rotation','overshoot','bounce','wobble'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function rejectRawMotion(input){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(`Adaptive Composition Motion accepts governed composition intent, not raw motion control: ${key}`);
    }
  }
}

function nonEmpty(value){
  return typeof value==='string'&&value.trim().length>0;
}

function profiles(input){
  return Array.isArray(input.accessibilityProfiles)
    ? input.accessibilityProfiles.map(value=>String(value??'').trim().toLowerCase())
    : [];
}

function fallback(reason,input){
  const reducedMotion=profiles(input).includes('reduced-motion');
  return Object.freeze({
    version:'1.7.0-dev.18',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([26]),
    sourceFoundation:Object.freeze({
      connectedTransformationVersion:'1.7.0-dev.17',
      signatureTransitionFamiliesVersion:'1.7.0-dev.16',
      compositionAccepted:false,
      acceptedCompositionChange:null
    }),
    composition:Object.freeze({
      mode:'immediate-final-composition',
      requestedChange:nonEmpty(input.compositionChange)?input.compositionChange.trim():null,
      identityAccepted:null,
      fallbackReason:reason,
      fromComposition:nonEmpty(input.fromComposition)?input.fromComposition.trim():null,
      toComposition:nonEmpty(input.toComposition)?input.toComposition.trim():null
    }),
    motion:Object.freeze({
      family:'Standard transition',
      relationship:null,
      channels:Object.freeze([]),
      unnecessaryDisappearReappearAllowed:false,
      finalCompositionAppliesIndependentlyOfAnimation:true
    }),
    continuity:Object.freeze({
      spatialUnderstandingPreserved:true,
      elementIdentityPreserved:false,
      taskIdentityPreserved:true,
      focusOrderPreserved:true,
      readingOrderPreserved:true,
      selectionPreserved:true,
      navigationContextPreserved:true,
      layoutCommitDependsOnAnimationCompletion:false,
      taskCompletionDependsOnAnimationCompletion:false
    }),
    accessibility:Object.freeze({
      reducedMotionApplied:reducedMotion,
      immediateRecompositionEquivalent:true,
      focusStateIndependentOfAnimation:true,
      motionRequiredToUnderstandComposition:false,
      accessibilityOutranksExpression:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      compositionChangeCreatedByGlaze:false,
      compositionIdentityCreatedByGlaze:false,
      formFactorTruthCreatedByGlaze:false,
      windowStateCreatedByGlaze:false,
      paneStateCreatedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      navigationAuthorityCreatedByGlaze:false,
      focusAuthorityCreatedByGlaze:false,
      stateChangedByMotion:false
    }),
    performance:Object.freeze({
      optionalInterpolationMayDegrade:true,
      degradationApplied:false,
      finalCompositionCorrect:true,
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
      adaptiveCompositionCatalogImplemented:true,
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

export function resolveGlazeAdaptiveCompositionMotion(input={}){
  if(!plainObject(input))throw new TypeError('Adaptive Composition Motion input must be a plain object');
  rejectRawMotion(input);

  const change=nonEmpty(input.compositionChange)?input.compositionChange.trim():null;
  if(change!==null&&!Object.prototype.hasOwnProperty.call(COMPOSITION_CATALOG,change)){
    throw new RangeError(`Unsupported adaptive composition change: ${change}`);
  }

  if(change===null||input.compositionAuthoritative!==true){
    return fallback('untrusted-composition-change',input);
  }
  if(!nonEmpty(input.compositionIdentity)||input.compositionIdentityAuthoritative!==true){
    return fallback('unclear-composition-identity',input);
  }
  if(!nonEmpty(input.fromComposition)||!nonEmpty(input.toComposition)){
    return fallback('incomplete-composition-state',input);
  }

  const policy=COMPOSITION_CATALOG[change];
  const accessibilityProfiles=profiles(input);
  const reducedMotion=accessibilityProfiles.includes('reduced-motion');
  const performancePressure=input.performancePressure===true;
  const family=resolveGlazeSignatureTransitionFamily({
    relationship:policy.relationship,
    relationshipAuthoritative:true,
    accessibilityProfiles
  });

  const channels=family.choreography.channels.map(entry=>Object.freeze({
    ...entry,
    enabled:reducedMotion?false:(performancePressure&&['position','pane-geometry','depth'].includes(entry.channel)?false:entry.enabled),
    reason:reducedMotion?'reduced-motion':(performancePressure&&['position','pane-geometry','depth'].includes(entry.channel)?'performance-pressure':entry.reason)
  }));

  return Object.freeze({
    version:'1.7.0-dev.18',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([26]),
    sourceFoundation:Object.freeze({
      connectedTransformationVersion:'1.7.0-dev.17',
      signatureTransitionFamiliesVersion:family.version,
      compositionAccepted:true,
      acceptedCompositionChange:change
    }),
    composition:Object.freeze({
      mode:'adaptive-composition-motion',
      change,
      identityAccepted:input.compositionIdentity.trim(),
      identityMode:policy.identityMode,
      fromComposition:input.fromComposition.trim(),
      toComposition:input.toComposition.trim(),
      supportedContext:SUPPORTED_CONTEXTS.includes(String(input.adaptiveContext??'').trim())
        ?String(input.adaptiveContext).trim()
        :null
    }),
    motion:Object.freeze({
      family:policy.family,
      relationship:policy.relationship,
      channels:Object.freeze(channels),
      unnecessaryDisappearReappearAllowed:false,
      finalCompositionAppliesIndependentlyOfAnimation:true
    }),
    continuity:Object.freeze({
      spatialUnderstandingPreserved:true,
      elementIdentityPreserved:true,
      taskIdentityPreserved:true,
      focusOrderPreserved:true,
      readingOrderPreserved:true,
      selectionPreserved:true,
      navigationContextPreserved:true,
      layoutCommitDependsOnAnimationCompletion:false,
      taskCompletionDependsOnAnimationCompletion:false,
      interruptibleWhereUserControlled:true
    }),
    accessibility:Object.freeze({
      reducedMotionApplied:reducedMotion,
      immediateRecompositionEquivalent:reducedMotion,
      focusStateIndependentOfAnimation:true,
      motionRequiredToUnderstandComposition:false,
      accessibilityOutranksExpression:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      compositionChangeCreatedByGlaze:false,
      compositionIdentityCreatedByGlaze:false,
      formFactorTruthCreatedByGlaze:false,
      windowStateCreatedByGlaze:false,
      paneStateCreatedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      navigationAuthorityCreatedByGlaze:false,
      focusAuthorityCreatedByGlaze:false,
      stateChangedByMotion:false
    }),
    performance:Object.freeze({
      optionalInterpolationMayDegrade:true,
      degradationApplied:performancePressure,
      finalCompositionCorrect:true,
      measuredPerformanceAcceptanceEstablished:false
    }),
    signatureTransitionFamily:family,
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
      adaptiveCompositionCatalogImplemented:true,
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

export const glazeV17AdaptiveCompositionMotionDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.18',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([26]),
  compositionChangeOrder:CHANGE_ORDER,
  supportedAdaptiveContexts:SUPPORTED_CONTEXTS,
  dependsOnConnectedTransformationVersion:glazeV17ConnectedTransformation2DevelopmentContract.version,
  dependsOnSignatureTransitionFamiliesVersion:glazeV17SignatureTransitionFamiliesDevelopmentContract.version,
  compositionAuthorityRequired:true,
  compositionIdentityAuthorityRequired:true,
  reducedMotionPrecedence:true,
  finalCompositionDependsOnAnimationCompletion:false,
  glazeMotionExperimentalLifecyclePromoted:false,
  section22Complete:false,
  section23Complete:false,
  section24Complete:false,
  section25Complete:false,
  section26Complete:false,
  adaptiveCompositionCatalogImplemented:true,
  measuredPerformanceAcceptanceEstablished:false,
  releasePromotionAutomatic:false,
  deploymentAcceptanceAutomatic:false,
  productionAcceptanceAutomatic:false
});
