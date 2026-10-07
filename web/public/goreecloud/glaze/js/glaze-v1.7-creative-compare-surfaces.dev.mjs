/* Glaze V1.7 — Creative and Compare Surfaces Development foundation.
 *
 * Bounded V1.7 v1.3 Section 48 source layer for Glaze Creative Surface
 * and Glaze Compare.
 */

import {
  resolveGlazeExpressionV13,
  glazeV17ExpressionSystemDevelopmentContract
} from './glaze-v1.7-expression-system.dev.mjs';

export const CREATIVE_COMPARE_SURFACES=Object.freeze(['glaze-creative-surface','glaze-compare']);
const CREATIVE_STAGES=Object.freeze(['proposal','preview','edit','pending-change','committed','rejected']);
const CREATIVE_OPERATIONS=Object.freeze(['create','transform','edit','generate','assist','approve']);
const COMPARE_MODES=Object.freeze(['side-by-side','before-after','overlay-difference','semantic-summary']);
const COMPARE_KINDS=Object.freeze(['theme','generated-content','edit','setting','layout','other']);
const RAW_KEYS=Object.freeze([
  'confidence','probability','rank','score','rating','winner','preferredWinner',
  'approved','approval','committed','success','durationMs','easing','spring','physics',
  'colorHex','blurPx','opacity','pixelDifference','similarityScore','acceptance','accepted'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function text(value,label,max=200){
  const normalized=String(value??'').trim();
  if(!normalized)throw new TypeError(label+' is required');
  return normalized.slice(0,max);
}
function optionalText(value,max=300){
  const normalized=String(value??'').trim();
  return normalized?normalized.slice(0,max):null;
}
function member(value,allowed,label,fallback){
  const normalized=String(value??fallback??'').trim().toLowerCase();
  if(!allowed.includes(normalized))throw new RangeError('Unsupported '+label+': '+normalized);
  return normalized;
}
function rejectRaw(input,scope){
  if(!plainObject(input))return;
  for(const key of RAW_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(scope+' accepts semantic proposal/comparison state, not inferred approval, ranking, raw effects, pixel scoring, or acceptance controls: '+key);
    }
  }
}
function expression(input,componentRole='creative'){
  return resolveGlazeExpressionV13({
    geometryRole:'grouped',
    emphasisRole:'standard',
    typographyRole:'body',
    containmentRole:'task-region',
    componentRole,
    formFactor:member(input.formFactor,['mobile','tablet','desktop','foldable','tv','wearable','compact'],'form factor','desktop'),
    inputContext:member(input.inputContext,['touch','pointer','keyboard','remote','voice','switch','mixed'],'input context','mixed'),
    densityRole:member(input.densityRole,['compact','standard','spacious'],'density role','standard'),
    colorIntent:'interaction',
    compositionRole:componentRole==='comparison'?'primary-secondary':'single-pane',
    expressionProfile:member(input.expressionProfile,['calm','balanced','expressive'],'expression profile','balanced'),
    expressionProfileAuthoritative:input.expressionProfileAuthoritative===true,
    performancePressure:member(input.performancePressure,['neutral','constrained','severe'],'performance pressure','neutral'),
    performancePressureAuthoritative:input.performancePressureAuthoritative===true,
    accessibility:plainObject(input.accessibility)?input.accessibility:{},
    accessibilityAuthoritative:input.accessibilityAuthoritative===true,
    semanticSeverity:'ordinary',
    semanticSeverityAuthoritative:false,
    motionPurpose:'state-change',
    transitionOccurrenceAuthoritative:input.transitionOccurrenceAuthoritative===true
  });
}

export function resolveGlazeCreativeSurface(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Creative Surface input must be a plain object');
  rejectRaw(input,'Glaze Creative Surface');
  const operationId=text(input.operationId,'operationId');
  const operation=member(input.operation,CREATIVE_OPERATIONS,'creative operation','assist');
  const requestedStage=member(input.stage,CREATIVE_STAGES,'creative stage','proposal');
  const stageAuthoritative=input.stageAuthoritative===true;
  const acceptedStage=stageAuthoritative?requestedStage:'proposal';
  const providerId=optionalText(input.providerId);
  const providerIdentityAuthoritative=input.providerIdentityAuthoritative===true;
  const sourceId=optionalText(input.sourceId);
  const proposalId=optionalText(input.proposalId);
  const committedResultId=optionalText(input.committedResultId);
  const committedState=acceptedStage==='committed';
  if(committedState&&(!stageAuthoritative||committedResultId===null)){
    throw new RangeError('Committed creative state requires authoritative stage and committedResultId');
  }

  return Object.freeze({
    version:'1.7.0-dev.44',
    lifecycle:'Development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    component:'Glaze Creative Surface',
    operationId,operation,
    stage:Object.freeze({
      requested:requestedStage,
      authoritative:stageAuthoritative,
      accepted:acceptedStage,
      proposalIsCommitment:false,
      previewIsCommitment:false,
      suggestionIsUserIntent:false,
      generationIsApproval:false
    }),
    identity:Object.freeze({
      sourceId,
      proposalId,
      committedResultId:committedState?committedResultId:null,
      sourceTargetSeparationRequired:true
    }),
    provider:Object.freeze({
      requestedProviderId:providerId,
      authoritative:providerIdentityAuthoritative,
      acceptedProviderId:providerIdentityAuthoritative?providerId:null
    }),
    presentation:Object.freeze({
      editable:acceptedStage==='proposal'||acceptedStage==='preview'||acceptedStage==='edit'||acceptedStage==='pending-change',
      commitmentVisibleOnlyWhenAuthoritative:committedState,
      expression:expression(input,'creative')
    }),
    authority:Object.freeze({
      presentationOnly:true,
      userIntentCreatedByGlaze:false,
      approvalCreatedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      modelOutputMadeAuthoritativeByGlaze:false,
      applicationStateCommittedByGlaze:false,
      contentMutationExecutedByGlaze:false
    })
  });
}

export function resolveGlazeCompare(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Compare input must be a plain object');
  rejectRaw(input,'Glaze Compare');
  const comparisonId=text(input.comparisonId,'comparisonId');
  const kind=member(input.kind,COMPARE_KINDS,'compare kind','other');
  const mode=member(input.mode,COMPARE_MODES,'compare mode','side-by-side');
  const sourceId=text(input.sourceId,'sourceId');
  const targetId=text(input.targetId,'targetId');
  if(sourceId===targetId)throw new RangeError('Glaze Compare requires distinct sourceId and targetId');
  const requestedSelection=optionalText(input.selectedId);
  const selectionAuthoritative=input.selectionAuthoritative===true;
  const acceptedSelection=selectionAuthoritative&&[sourceId,targetId].includes(requestedSelection)?requestedSelection:null;
  const requestedCommitment=optionalText(input.committedId);
  const commitmentAuthoritative=input.commitmentAuthoritative===true;
  const acceptedCommitment=commitmentAuthoritative&&[sourceId,targetId].includes(requestedCommitment)?requestedCommitment:null;

  return Object.freeze({
    version:'1.7.0-dev.44',
    lifecycle:'Development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    component:'Glaze Compare',
    comparisonId,kind,mode,
    identity:Object.freeze({
      sourceId,targetId,
      sourceTargetIdentityPreserved:true,
      sourceTargetInterchangeable:false
    }),
    selection:Object.freeze({
      requested:requestedSelection,
      authoritative:selectionAuthoritative,
      accepted:acceptedSelection,
      inferredByGlaze:false
    }),
    commitment:Object.freeze({
      requested:requestedCommitment,
      authoritative:commitmentAuthoritative,
      accepted:acceptedCommitment,
      inferredByGlaze:false
    }),
    presentation:Object.freeze({
      understandableWithoutColorOrMotion:true,
      beforeAfterDirectionMustRemainExplicit:mode==='before-after',
      selectionImpliedByProminence:false,
      commitmentImpliedBySelection:false,
      expression:expression(input,'comparison')
    }),
    authority:Object.freeze({
      presentationOnly:true,
      selectionCreatedByGlaze:false,
      commitmentCreatedByGlaze:false,
      winnerSelectedByGlaze:false,
      rankingInventedByGlaze:false,
      applicationStateChangedByGlaze:false
    })
  });
}

function acceptanceBoundary(){
  return Object.freeze({
    sourceFoundationOnly:true,
    creativeSurfaceImplemented:true,
    compareImplemented:true,
    renderedAcceptanceEstablished:false,
    accessibilityAcceptanceEstablished:false,
    humanVisualReviewEstablished:false,
    providerIntegrationAcceptanceEstablished:false,
    section48Accepted:false
  });
}

export const glazeV17CreativeCompareSurfacesDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.44',
  lifecycle:'Development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.3',
  v13SpecificationSections:Object.freeze([48]),
  requirementGroup:'creative-compare-surfaces',
  surfaces:CREATIVE_COMPARE_SURFACES,
  creativeStages:CREATIVE_STAGES,
  creativeOperations:CREATIVE_OPERATIONS,
  compareModes:COMPARE_MODES,
  compareKinds:COMPARE_KINDS,
  expressionSystemFoundationVersion:glazeV17ExpressionSystemDevelopmentContract.version,
  proposalIsCommitment:false,
  previewIsCommitment:false,
  suggestionIsUserIntent:false,
  generationIsApproval:false,
  comparisonSelectionAutomatic:false,
  section48SourceComplete:false,
  acceptance:acceptanceBoundary()
});
