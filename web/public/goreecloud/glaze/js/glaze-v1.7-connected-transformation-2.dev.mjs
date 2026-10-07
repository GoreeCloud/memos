/* GLAZE UI V1.7 — Connected Transformation 2.0 Development foundation.
 *
 * Bounded v1.2 Section 25 source layer over Signature Transition Families dev.16.
 * Preserves authoritative object/task identity when a real connected relationship is supplied.
 * It never invents connection identity, platform capability, navigation authority, or state truth.
 */

import {
  resolveGlazeSignatureTransitionFamily,
  glazeV17SignatureTransitionFamiliesDevelopmentContract
} from './glaze-v1.7-signature-transition-families.dev.mjs';

const CONNECTION_CATALOG=Object.freeze({
  'search-control-to-search-interface':Object.freeze({identityKind:'object',relationship:'same-object-expansion',family:'Glaze Bloom',platformAppropriatenessRequired:false}),
  'navigation-item-to-destination':Object.freeze({identityKind:'task',relationship:'source-destination-continuity',family:'Glaze Trace',platformAppropriatenessRequired:false}),
  'app-icon-to-application-surface':Object.freeze({identityKind:'task',relationship:'source-destination-continuity',family:'Glaze Trace',platformAppropriatenessRequired:true}),
  'card-to-detail-view':Object.freeze({identityKind:'object',relationship:'same-object-expansion',family:'Glaze Bloom',platformAppropriatenessRequired:false}),
  'thumbnail-to-viewer':Object.freeze({identityKind:'object',relationship:'same-object-expansion',family:'Glaze Bloom',platformAppropriatenessRequired:false}),
  'quick-setting-to-expanded-setting':Object.freeze({identityKind:'object',relationship:'same-object-expansion',family:'Glaze Bloom',platformAppropriatenessRequired:false}),
  'compact-player-to-full-player':Object.freeze({identityKind:'object',relationship:'same-object-expansion',family:'Glaze Bloom',platformAppropriatenessRequired:false}),
  'folder-to-folder-contents':Object.freeze({identityKind:'task',relationship:'source-destination-continuity',family:'Glaze Trace',platformAppropriatenessRequired:false}),
  'notification-to-related-event':Object.freeze({identityKind:'task',relationship:'source-destination-continuity',family:'Glaze Trace',platformAppropriatenessRequired:false}),
  'widget-to-expanded-experience':Object.freeze({identityKind:'object',relationship:'same-object-expansion',family:'Glaze Bloom',platformAppropriatenessRequired:false}),
  'command-result-to-resulting-interface':Object.freeze({identityKind:'task',relationship:'source-destination-continuity',family:'Glaze Trace',platformAppropriatenessRequired:false}),
  'compact-pane-to-expanded-pane':Object.freeze({identityKind:'object',relationship:'same-object-expansion',family:'Glaze Bloom',platformAppropriatenessRequired:false})
});

const CONNECTION_ORDER=Object.freeze(Object.keys(CONNECTION_CATALOG));
const PROHIBITED_KEYS=Object.freeze([
  'relationship','relationshipAuthoritative','objectIdentity','objectIdentityAuthoritative',
  'family','signatureFamily','requestedFamily','duration','durationMs','easing','spring','physics',
  'keyframes','path','travelPx','distance','rotation','overshoot','bounce','wobble'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function nonEmptyIdentity(value){
  if(typeof value!=='string')return null;
  const normalized=value.trim();
  return normalized.length>0?normalized:null;
}

function rejectDirectMotionControl(input){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(`Connected Transformation 2.0 accepts governed connection intent, not direct motion control: ${key}`);
    }
  }
}

function authorityFlag(requested,authoritative){
  return Object.freeze({
    requested:requested===true,
    accepted:authoritative===true?requested===true:false,
    authoritative:authoritative===true,
    withheldWithoutAuthority:requested===true&&authoritative!==true
  });
}

function fallbackTransition(input){
  return resolveGlazeSignatureTransitionFamily({
    relationship:'workspace-recomposition',
    relationshipAuthoritative:false,
    accessibilityProfiles:Array.isArray(input.accessibilityProfiles)?input.accessibilityProfiles:[],
    activeMotion:plainObject(input.activeMotion)?input.activeMotion:undefined,
    userDriven:input.userDriven
  });
}

export function resolveGlazeConnectedTransformation(input={}){
  if(!plainObject(input))throw new TypeError('Connected Transformation 2.0 input must be a plain object');
  rejectDirectMotionControl(input);

  const connection=String(input.connection??'').trim();
  if(connection&&!Object.prototype.hasOwnProperty.call(CONNECTION_CATALOG,connection)){
    throw new RangeError(`Unsupported Connected Transformation 2.0 connection: ${connection}`);
  }

  const policy=connection?CONNECTION_CATALOG[connection]:null;
  const authoritativeConnection=connection!==''&&input.connectionAuthoritative===true;
  const identity=nonEmptyIdentity(input.connectionIdentity);
  const identityAuthoritative=input.connectionIdentityAuthoritative===true;
  const identityAccepted=authoritativeConnection&&identity!==null&&identityAuthoritative;
  const platformSupport=authorityFlag(input.platformConnectionSupported,input.platformConnectionSupportAuthoritative);
  const platformAccepted=!policy?.platformAppropriatenessRequired||platformSupport.accepted===true;
  const accepted=Boolean(policy&&identityAccepted&&platformAccepted);

  const transition=accepted
    ? resolveGlazeSignatureTransitionFamily({
        relationship:policy.relationship,
        relationshipAuthoritative:true,
        objectIdentity:identity,
        objectIdentityAuthoritative:true,
        fromState:input.fromState,
        toState:input.toState,
        accessibilityProfiles:Array.isArray(input.accessibilityProfiles)?input.accessibilityProfiles:[],
        activeMotion:plainObject(input.activeMotion)?input.activeMotion:undefined,
        userDriven:input.userDriven
      })
    : fallbackTransition(input);

  const connectedIdentity=Object.freeze({
    kind:policy?.identityKind??null,
    supplied:identity!==null,
    authoritative:identityAuthoritative,
    accepted:accepted?identity:null,
    withheldWithoutAuthority:identity!==null&&!identityAuthoritative,
    unclear:identity===null
  });

  return Object.freeze({
    version:'1.7.0-dev.17',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([25]),
    sourceFoundation:Object.freeze({
      signatureTransitionFamiliesVersion:glazeV17SignatureTransitionFamiliesDevelopmentContract.version,
      connectionAccepted:accepted,
      acceptedConnection:accepted?connection:null
    }),
    connection:Object.freeze({
      requested:connection||null,
      authoritative:input.connectionAuthoritative===true,
      policyKnown:policy!==null,
      identity:connectedIdentity,
      platformSupport,
      platformAppropriatenessRequired:policy?.platformAppropriatenessRequired===true,
      fallbackReason:accepted?null:
        !policy?'missing-connection':
        !authoritativeConnection?'untrusted-connection':
        identity===null?'unclear-identity':
        !identityAuthoritative?'untrusted-identity':
        !platformAccepted?'unsupported-platform-connection':
        'standard-fallback'
    }),
    transformation:Object.freeze({
      mode:accepted?'connected-transformation':'standard-transition',
      semanticRelationship:accepted?policy.relationship:null,
      family:transition.choreography.family,
      familyId:transition.choreography.familyId,
      semanticIntent:transition.choreography.semanticIntent,
      channels:transition.choreography.channels,
      preserveIdentityPreferentially:true,
      connectionRelationshipInventedByGlaze:false,
      directFamilyRequestAccepted:false,
      rawChoreographyControlAccepted:false
    }),
    continuity:Object.freeze({
      identityKind:policy?.identityKind??null,
      objectIdentityPreserved:accepted&&policy.identityKind==='object',
      taskIdentityPreserved:accepted&&policy.identityKind==='task',
      taskContinuityRequired:true,
      focusOrderPreserved:true,
      readingOrderPreserved:true,
      stateDependsOnAnimationCompletion:false,
      navigationDependsOnAnimationCompletion:false,
      taskCompletionDependsOnAnimationCompletion:false,
      interruptibleWhereUserControlled:true,
      ambiguousIdentityFallsBackToStandardTransition:true
    }),
    accessibility:Object.freeze({
      reducedMotionApplied:transition.accessibility.reducedMotionApplied===true,
      reducedMotionEquivalent:transition.accessibility.reducedMotionEquivalent,
      equivalentPresentationRequired:true,
      focusStateIndependentOfAnimation:true,
      motionRequiredToUnderstandRelationship:false,
      accessibilityOutranksExpression:true
    }),
    performance:Object.freeze({
      progressiveComplexityRequired:true,
      optionalConnectedMotionMayDegrade:true,
      degradationMayRemoveRequiredSemantics:false,
      stateIntegrityRequiredUnderInterruption:true,
      measuredPerformanceAcceptanceEstablished:false
    }),
    authority:Object.freeze({
      presentationOnly:true,
      connectionRelationshipCreatedByGlaze:false,
      connectionIdentityCreatedByGlaze:false,
      platformSupportCreatedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      navigationAuthorityCreatedByGlaze:false,
      actionAuthorityCreatedByGlaze:false,
      focusAuthorityCreatedByGlaze:false,
      stateChangedByMotion:false,
      actionExecutedByMotion:false,
      navigationExecutedByMotion:false
    }),
    glazeMotionBoundary:Object.freeze({
      experimentalFoundationVersion:'0.6.0',
      runtimeCompatibilityBaseline:'0.4.0',
      experimentalLifecyclePromoted:false,
      motionStudioPromoted:false,
      motionSpatialPromoted:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,
      section22Complete:false,
      section23Complete:false,
      section24Complete:false,
      section25Complete:false,
      connectedTransformationCatalogImplemented:true,
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

export const glazeV17ConnectedTransformation2DevelopmentContract=Object.freeze({
  version:'1.7.0-dev.17',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([25]),
  connectionOrder:CONNECTION_ORDER,
  dependsOnSignatureTransitionFamiliesVersion:glazeV17SignatureTransitionFamiliesDevelopmentContract.version,
  preserveIdentityPreferentially:true,
  unclearIdentityFallsBackToStandardTransition:true,
  appSurfaceConnectionRequiresAuthoritativePlatformSupport:true,
  reducedMotionPrecedence:true,
  stateDependsOnAnimationCompletion:false,
  glazeMotionExperimentalLifecyclePromoted:false,
  section22Complete:false,
  section23Complete:false,
  section24Complete:false,
  section25Complete:false,
  connectedTransformationCatalogImplemented:true,
  renderedAcceptanceEstablished:false,
  performanceAcceptanceEstablished:false,
  releasePromotionAutomatic:false,
  deploymentAcceptanceAutomatic:false,
  productionAcceptanceAutomatic:false
});
