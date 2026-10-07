export const DURATION_FAMILIES=Object.freeze(['instant','micro','short','medium','long','ambient']);
export const EASING_FAMILIES=Object.freeze(['standard','enter','exit','emphasized','linear']);
export const MOTION_MAGNITUDES=Object.freeze(['minimal','restrained','standard','emphasized']);
export const SECTION39_DOMAINS=Object.freeze([
  'current-motion-family','transition-source-destination','connected-identity-relationship',
  'duration-family','easing-family','motion-magnitude','motion-budget','reduced-motion-mapping',
  'theme-resolution','semantic-color-resolution','material-resolution','focus-state',
  'accessibility-overrides','motion-selection-explanation'
]);

const MAGNITUDE_RANK=Object.freeze({minimal:0,restrained:1,standard:2,emphasized:3});
const PERFORMANCE_MAGNITUDE_CEILING=Object.freeze({
  full:'emphasized',restrained:'restrained',simplified:'restrained',minimal:'minimal','reduced-motion':'minimal'
});
const EXTRA_RAW_KEYS=Object.freeze([
  'durationMilliseconds','cubicBezier','measurements','samples','frameTimeMs','fps','cpuThreshold','gpuThreshold'
]);

function text(value,max=180){
  const normalized=String(value??'').trim();
  return normalized?normalized.slice(0,max):null;
}

export function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

export function rejectExtraRawControls(input){
  for(const key of EXTRA_RAW_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError('Glaze Inspector v1.2 accepts semantic diagnostic evidence, not raw animation/performance controls: '+key);
    }
  }
}

export function observedSemantic(value,allowed,authoritative,label){
  const requested=text(value,80);
  if(requested!==null&&!allowed.includes(requested))throw new RangeError('Unsupported '+label+': '+requested);
  const trusted=requested!==null&&authoritative===true;
  return Object.freeze({
    requested,
    accepted:trusted?requested:'unknown',
    authoritative:authoritative===true,
    withheldWithoutAuthority:requested!==null&&!trusted
  });
}

export function transitionEndpoints(input){
  const source=text(input.transitionSource,200);
  const destination=text(input.transitionDestination,200);
  const authoritative=input.transitionEndpointsAuthoritative===true;
  const complete=source!==null&&destination!==null;
  return Object.freeze({
    requestedSource:source,
    requestedDestination:destination,
    acceptedSource:authoritative&&complete?source:null,
    acceptedDestination:authoritative&&complete?destination:null,
    authoritative,
    complete,
    accepted:authoritative&&complete,
    reason:authoritative&&complete?'authoritative-transition-endpoints':
      !complete?'complete-source-and-destination-required':'transition-endpoint-authority-required'
  });
}

export function connectedIdentity(input,relationship){
  const requested=text(input.connectedIdentity,200);
  const authoritative=input.connectedIdentityAuthoritative===true;
  const required=['same-object-expansion','source-destination-continuity'].includes(relationship);
  const satisfied=!required||(authoritative&&requested!==null);
  return Object.freeze({
    relationship,
    requestedIdentity:requested,
    acceptedIdentity:authoritative&&requested!==null?requested:null,
    authoritative,
    required,
    satisfied,
    createdByInspector:false
  });
}

export function motionKindForRelationship(relationship){
  if(['same-object-expansion','source-destination-continuity'].includes(relationship))return 'connected-transformation';
  if(['workspace-recomposition','posture-partition'].includes(relationship))return 'adaptive-recomposition';
  if(['color-state-change','material-role-change'].includes(relationship))return 'material';
  return 'task-transition';
}

export function magnitudeEvidence(observation,performanceMode){
  const ceiling=PERFORMANCE_MAGNITUDE_CEILING[performanceMode]??'minimal';
  const accepted=observation.accepted;
  const compliance=accepted==='unknown'
    ?'unverified'
    :MAGNITUDE_RANK[accepted]<=MAGNITUDE_RANK[ceiling]?'within-governed-ceiling':'exceeds-governed-ceiling';
  return Object.freeze({
    ...observation,
    governedMaximum:ceiling,
    performanceMode,
    compliance,
    inspectorMayIncreaseMagnitude:false,
    inspectorMayOverridePerformance:false
  });
}

function decision(code,applied,detail){
  return Object.freeze({code,applied:applied===true,detail:text(detail,260)});
}

export function selectionExplanation({component,relationship,identity,endpoints,duration,easing,magnitude,reduced,performance,budget}){
  const decisions=[];
  decisions.push(decision('semantic-relationship-observed',relationship!==null,relationship??'none'));
  decisions.push(decision('transition-occurrence-authoritative',component.semanticTransition.transitionAuthoritative===true,
    component.semanticTransition.transitionAuthoritative?'caller/provider supplied authoritative transition occurrence':'motion remains ineligible without transition authority'));
  decisions.push(decision('connected-identity-requirement',identity.required,identity.required
    ?identity.satisfied?'authoritative connected identity satisfied':'connected identity missing or untrusted; identity-dependent continuity fails closed'
    :'current relationship does not require connected identity'));
  decisions.push(decision('signature-family-selected',component.semanticTransition.relationshipAccepted===true,
    component.semanticTransition.relationshipAccepted?component.semanticTransition.signatureFamily:'Standard transition / fail-closed state-first presentation'));
  decisions.push(decision('transition-endpoints-verified',endpoints.accepted,endpoints.reason));
  decisions.push(decision('duration-family-verified',duration.accepted!=='unknown',duration.accepted));
  decisions.push(decision('easing-family-verified',easing.accepted!=='unknown',easing.accepted));
  decisions.push(decision('motion-magnitude-verified',magnitude.accepted!=='unknown',magnitude.compliance));
  decisions.push(decision('reduced-motion-equivalent',reduced.accessibility.reducedMotionApplied===true,reduced.equivalent.presentation));
  decisions.push(decision('performance-degradation',performance.performance.mode!=='full',performance.performance.mode+': '+performance.presentation.directive));
  decisions.push(decision('motion-budget-pressure',budget.exhausted===true,
    budget.exhausted?'exceeded: '+budget.exceededDimensions.join(', '):'within governed reference budget'));
  return Object.freeze({
    summary:component.semanticTransition.relationshipAccepted
      ?'Motion family follows the authoritative semantic relationship; accessibility, budget, and performance may simplify optional presentation.'
      :'Motion family failed closed to state-first standard presentation because required semantic/authority evidence was incomplete.',
    decisions:Object.freeze(decisions),
    rawAnimationValuesRequired:false,
    sourceMutationPerformed:false
  });
}
