/* GLAZE UI V1.7 — Continuity-Aware Motion Development foundation. */

import {
  resolveGlazeMotionPlan,
  resolveGlazeStateContinuity
} from './glaze-v1.6-focus-motion.dev.mjs';
import {resolveGlazeTaskContinuity} from './glaze-v1.7-task-continuity.dev.mjs';

const EVENTS=Object.freeze(["surface-relocation","composition-change","retained-object-identity","focus-movement","pane-primacy-change","compact-expanded-transition","theme-change"]);

const DEFAULTS=Object.freeze({
  'surface-relocation':Object.freeze({family:'move',magnitude:'medium',surfaceHierarchy:'primary',environmentChange:'multi-pane-recomposition'}),
  'composition-change':Object.freeze({family:'replace',magnitude:'small',surfaceHierarchy:'primary',environmentChange:'multi-pane-recomposition'}),
  'retained-object-identity':Object.freeze({family:'move',magnitude:'small',surfaceHierarchy:'secondary',environmentChange:'multi-pane-recomposition'}),
  'focus-movement':Object.freeze({family:'focus',magnitude:'micro',surfaceHierarchy:'primary',environmentChange:'multi-pane-recomposition'}),
  'pane-primacy-change':Object.freeze({family:'reorder',magnitude:'medium',surfaceHierarchy:'navigation',environmentChange:'multi-pane-recomposition'}),
  'compact-expanded-transition':Object.freeze({family:'expand',magnitude:'medium',surfaceHierarchy:'primary',environmentChange:'compact-expanded-layout'}),
  'theme-change':Object.freeze({family:'replace',magnitude:'micro',surfaceHierarchy:'secondary',environmentChange:'appearance'})
});

function plainObject(v){if(v===null||typeof v!=='object'||Array.isArray(v))return false;const p=Object.getPrototypeOf(v);return p===Object.prototype||p===null;}
function member(v,allowed,label){const n=String(v??'').trim().toLowerCase();if(!allowed.includes(n))throw new RangeError(`Unsupported ${label}: ${n}`);return n;}
function bounded(v,max=160){const s=String(v??'').trim();return s?s.slice(0,max):null;}
function supplied(v,authoritative){return Object.freeze({requested:v??null,accepted:authoritative===true?(v??null):null,authoritative:authoritative===true,withheldWithoutAuthority:v!=null&&authoritative!==true});}
function reducedMotionActive(profiles){return Array.isArray(profiles)&&profiles.map(v=>String(v??'').trim().toLowerCase()).some(v=>v==='reduced-motion'||v==='minimal-motion');}

function explanation(event,input,identity,focus,pane){
  if(event==='surface-relocation') return 'Explain where the active surface moved while preserving the active task.';
  if(event==='composition-change') return 'Explain why the composition changed without implying task reset.';
  if(event==='retained-object-identity') return identity.accepted
    ? `Preserve and explain retained identity for ${identity.accepted}.`
    : 'Retained object identity remains unverified; use bounded continuity presentation only.';
  if(event==='focus-movement') return focus.accepted
    ? `Explain authoritative focus movement to ${focus.accepted}.`
    : 'Focus destination remains unverified; do not imply a new focus target.';
  if(event==='pane-primacy-change') return pane.accepted
    ? `Explain authoritative primary-pane change to ${pane.accepted}.`
    : 'Pane primacy remains unverified; do not imply a new primary pane.';
  if(event==='compact-expanded-transition') return `Explain the ${input.direction==='collapse'?'expanded-to-compact':'compact-to-expanded'} presentation change while preserving task state.`;
  return 'Use bounded color/material transition only to explain theme continuity.';
}

export function resolveGlazeContinuityAwareMotion(input={}){
  if(!plainObject(input))throw new TypeError('Continuity-Aware Motion input must be a plain object');
  const event=member(input.event,EVENTS,'continuity event');
  const defaults=DEFAULTS[event];
  const direction=String(input.direction??'expand').trim().toLowerCase();
  if(event==='compact-expanded-transition'&&!['expand','collapse'].includes(direction))throw new RangeError(`Unsupported compact/expanded direction: ${direction}`);

  const objectIdentity=supplied(bounded(input.objectIdentity,160),input.objectIdentityAuthoritative);
  const focusTarget=supplied(bounded(input.focusTarget,160),input.focusTargetAuthoritative);
  const primaryPane=supplied(bounded(input.primaryPane,160),input.primaryPaneAuthoritative);

  const family=event==='compact-expanded-transition'?(direction==='collapse'?'collapse':'expand'):defaults.family;
  const motion=resolveGlazeMotionPlan({
    family,
    magnitude:input.magnitude??defaults.magnitude,
    surfaceHierarchy:input.surfaceHierarchy??defaults.surfaceHierarchy,
    accessibilityProfiles:input.accessibilityProfiles,
    activeMotion:input.activeMotion,
    budget:input.budget,
    userDriven:input.userDriven!==false,
    directManipulation:input.directManipulation===true
  });

  const identityContinuity=resolveGlazeStateContinuity({
    fromState:bounded(input.fromState,100)??'before',
    toState:bounded(input.toState,100)??'after',
    conceptualIdentitySame:input.conceptualIdentitySame!==false,
    accessibilityProfiles:input.accessibilityProfiles
  });

  const task=resolveGlazeTaskContinuity({
    environmentChange:defaults.environmentChange,
    previous:input.previousTaskState,
    incoming:input.incomingTaskState,
    stateClasses:input.stateClasses,
    clearFields:input.clearFields,
    clearAuthoritative:input.clearAuthoritative,
    temporaryDisposableFields:input.temporaryDisposableFields,
    lossDirectedFields:input.lossDirectedFields,
    providerAuthoritativeFields:input.providerAuthoritativeFields,
    recoveryStateFields:input.recoveryStateFields
  });

  const reduced=reducedMotionActive(input.accessibilityProfiles);

  return Object.freeze({
    version:'1.7.0-dev.13',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    planVersion:'v1.1',
    v11SpecificationSections:Object.freeze([28]),
    event,
    direction:event==='compact-expanded-transition'?direction:null,
    motion,
    identityContinuity,
    taskState:task.state,
    stateClasses:task.stateClasses,
    decisions:task.decisions,
    continuity:Object.freeze({
      ...task.continuity,
      motionPurpose:'explain-continuity',
      explanation:explanation(event,{direction},objectIdentity,focusTarget,primaryPane),
      taskResetAllowed:false,
      finalStateDependsOnAnimationCompletion:false,
      motionRequiredToUnderstandState:false
    }),
    observed:Object.freeze({
      objectIdentity,
      focusTarget,
      primaryPane
    }),
    accessibility:Object.freeze({
      reducedMotionApplied:reduced||motion.accessibility.reducedMotionApplied,
      staticOrMinimalEquivalentRequired:true,
      equivalentPresentation:motion.presentation.mode,
      accessibilityOutranksVisualRichness:true
    }),
    chromatic:Object.freeze({
      themeColorMaterialTransitionAllowed:event==='theme-change',
      continuousRainbowAllowed:false,
      unnecessaryChromaticMovementAllowed:false,
      decorativeAnimationDefault:false
    }),
    authority:Object.freeze({
      presentationOnly:true,
      taskStateChangedByMotion:false,
      providerTruthCreatedByMotion:false,
      objectIdentityCreatedByMotion:false,
      focusTargetCreatedByMotion:false,
      panePrimacyCreatedByMotion:false,
      actionExecutedByMotion:false,
      navigationExecutedByMotion:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,
      section28Complete:false,
      renderedAcceptanceRequired:true,
      assistiveTechnologyAcceptanceRequired:true,
      representativePlatformAcceptanceRequired:true,
      performanceAcceptanceRequired:true,
      motionFatigueAcceptanceRequired:true,
      humanReviewRequired:true,
      downstreamConsumerAcceptanceAutomatic:false
    })
  });
}

export function resolveGlazeThemeContinuityTransition(input={}){
  return resolveGlazeContinuityAwareMotion({
    ...input,
    event:'theme-change',
    conceptualIdentitySame:true,
    fromState:input.fromTheme??'theme-before',
    toState:input.toTheme??'theme-after'
  });
}

export const glazeV17ContinuityAwareMotionDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.13',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.1',
  v11SpecificationSections:Object.freeze([28]),
  continuityEvents:EVENTS,
  primaryPurpose:'explain-continuity',
  retainedMotionFoundation:'js/glaze-v1.6-focus-motion.dev.mjs',
  reducedMotionPrecedence:true,
  staticOrMinimalEquivalentRequired:true,
  finalStateDependsOnAnimationCompletion:false,
  continuousRainbowDefault:false,
  unnecessaryChromaticMovementDefault:false,
  decorativeAnimationDefault:false,
  presentationOnly:true,
  section28Complete:false,
  releasePromotionAutomatic:false,
  deploymentAcceptanceAutomatic:false,
  productionAcceptanceAutomatic:false
});
