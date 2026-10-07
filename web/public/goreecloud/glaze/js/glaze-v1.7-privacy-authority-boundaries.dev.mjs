/* GLAZE UI V1.7 — Privacy and Authority Boundaries.
 *
 * Bounded v1.2 Section 44 Development foundation.
 * Motion communicates authoritative truth. Motion does not create truth.
 */

import {
  createGlazeProviderSnapshot,
  glazeProviderDevelopmentContract
} from './glaze-v1.5-provider-registry.dev.mjs';
import {
  resolveGlazeVisualMotionDirectionV12,
  glazeV17VisualMotionDirectionDevelopmentContract
} from './glaze-v1.7-visual-motion-direction.dev.mjs';

export const PRIVACY_AUTHORITY_TRUTH_DOMAINS=Object.freeze([
  'security-protection',
  'privacy-consent',
  'privacy-access',
  'synchronization',
  'operation-result',
  'resilience-recovery',
  'identity-authentication',
  'connectivity-availability',
  'coordination-status'
]);

const DOMAIN_RULES=Object.freeze({
  'security-protection':Object.freeze({
    states:Object.freeze(['unknown','unprotected','protected','restricted','degraded','failed']),
    owners:Object.freeze([
      Object.freeze({ownerKind:'wardveil-security',providerId:'wardveil-security',authority:'security',scope:'system'})
    ])
  }),
  'privacy-consent':Object.freeze({
    states:Object.freeze(['unknown','granted','denied','revoked','restricted']),
    owners:Object.freeze([
      Object.freeze({ownerKind:'privacy-shield',providerId:'privacy-shield',authority:'privacy',scope:'system'})
    ])
  }),
  'privacy-access':Object.freeze({
    states:Object.freeze(['unknown','granted','denied','revoked','restricted']),
    owners:Object.freeze([
      Object.freeze({ownerKind:'privacy-shield',providerId:'privacy-shield',authority:'privacy',scope:'system'}),
      Object.freeze({ownerKind:'responsible-provider',providerId:null,authority:'service',scope:'provider-local'})
    ])
  }),
  'synchronization':Object.freeze({
    states:Object.freeze(['unknown','idle','pending','synchronizing','synchronized','paused','conflict','failed','unavailable']),
    owners:Object.freeze([
      Object.freeze({ownerKind:'responsible-provider',providerId:null,authority:'service',scope:'provider-local'})
    ])
  }),
  'operation-result':Object.freeze({
    states:Object.freeze(['unknown','pending','success','warning','failed','canceled']),
    owners:Object.freeze([
      Object.freeze({ownerKind:'responsible-provider',providerId:null,authority:'service',scope:'provider-local'}),
      Object.freeze({ownerKind:'application',providerId:null,authority:'application',scope:'application-local'})
    ])
  }),
  'resilience-recovery':Object.freeze({
    states:Object.freeze(['unknown','idle','pending','recovering','recovered','failed','unavailable']),
    owners:Object.freeze([
      Object.freeze({ownerKind:'everkeep',providerId:'everkeep',authority:'service',scope:'system'})
    ])
  }),
  'identity-authentication':Object.freeze({
    states:Object.freeze(['unknown','unauthenticated','authenticating','authenticated','locked','expired','failed']),
    owners:Object.freeze([
      Object.freeze({ownerKind:'goreecloud-identity',providerId:'goreecloud-identity',authority:'identity',scope:'system'})
    ])
  }),
  'connectivity-availability':Object.freeze({
    states:Object.freeze(['unknown','online','offline','connecting','limited','available','unavailable','failed']),
    owners:Object.freeze([
      Object.freeze({ownerKind:'platform',providerId:null,authority:'platform',scope:'platform-local'}),
      Object.freeze({ownerKind:'responsible-provider',providerId:null,authority:'service',scope:'provider-local'})
    ])
  }),
  'coordination-status':Object.freeze({
    states:Object.freeze(['unknown','idle','pending','active','delivered','failed']),
    owners:Object.freeze([
      Object.freeze({ownerKind:'goreecloud-mesh',providerId:'goreecloud-mesh',authority:'service',scope:'coordination-only'})
    ])
  })
});

const CAPABILITY_DOMAIN_BY_TRUTH=Object.freeze({
  'security-protection':'authorization',
  'privacy-consent':'authorization',
  'privacy-access':'authorization',
  'synchronization':'service',
  'resilience-recovery':'service',
  'identity-authentication':'authorization',
  'connectivity-availability':'connectivity',
  'coordination-status':'service'
});

const PROHIBITED_KEYS=Object.freeze([
  'providerPrecedence','providerRank','providerScore','authorityRank','authorityScore',
  'confidence','probability','inferredState','assumedState','forceState','forceSuccess',
  'protected','isProtected','secure','isSecure','success','isSuccess','completed','isCompleted',
  'synced','isSynced','revoked','isRevoked','authenticated','isAuthenticated',
  'authorized','isAuthorized','permissionGranted','consentGranted','accessGranted','accessRevoked',
  'successAnimation','protectionAnimation','privacyAnimation','completionAnimation',
  'duration','durationMs','easing','curve','spring','physics','keyframes','path',
  'blurPx','backdropBlurPx','pixelHash','screenshotSimilarityScore','score','rating','winner'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function text(value,label,max=160){
  const normalized=String(value??'').trim();
  if(!normalized)throw new TypeError(label+' must be a non-empty string');
  return normalized.slice(0,max);
}

function member(value,allowed,label,fallback=null){
  const normalized=String(value??fallback??'').trim().toLowerCase();
  if(!allowed.includes(normalized))throw new RangeError('Unsupported '+label+': '+normalized);
  return normalized;
}

function rejectRawControls(input,scope='privacy/authority input'){
  if(!plainObject(input))return;
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(scope+' cannot infer, rank, force, or visually manufacture authoritative truth: '+key);
    }
  }
}

function ownerRule(domain,claim){
  return DOMAIN_RULES[domain].owners.find(rule=>
    rule.ownerKind===claim.ownerKind &&
    rule.authority===claim.authority &&
    rule.scope===claim.scope &&
    (rule.providerId===null||rule.providerId===claim.providerId)
  )??null;
}

function capabilityDomain(domain,authority){
  if(domain==='operation-result')return authority==='application'?'application':'service';
  if(domain==='privacy-access')return authority==='privacy'?'authorization':'service';
  return CAPABILITY_DOMAIN_BY_TRUTH[domain];
}

function normalizeClaim(domain,claim,index){
  if(!plainObject(claim))throw new TypeError('Truth claim at index '+index+' must be a plain object');
  rejectRawControls(claim,'truth claim');
  const providerId=text(claim.providerId,'providerId');
  const ownerKind=text(claim.ownerKind,'ownerKind',80).toLowerCase();
  const authority=text(claim.authority,'authority',40).toLowerCase();
  const scope=text(claim.scope,'scope',80).toLowerCase();
  const requestedState=member(claim.state,DOMAIN_RULES[domain].states,'truth state','unknown');
  return Object.freeze({
    providerId,ownerKind,authority,scope,requestedState,
    authorityAttested:claim.authorityAttested===true,
    ownerAllowed:Boolean(ownerRule(domain,{providerId,ownerKind,authority,scope}))
  });
}

function providerSnapshotFor(domain,claims){
  const byProvider=new Map();
  for(const claim of claims.filter(claim=>claim.ownerAllowed)){
    if(!byProvider.has(claim.providerId)){
      byProvider.set(claim.providerId,{
        id:claim.providerId,
        authority:claim.authority,
        scope:claim.scope,
        capabilities:[]
      });
    }else{
      const current=byProvider.get(claim.providerId);
      if(current.authority!==claim.authority||current.scope!==claim.scope){
        throw new RangeError('A provider cannot claim multiple authority classes or scopes in one truth resolution');
      }
    }
    byProvider.get(claim.providerId).capabilities.push({
      id:'truth-domain:'+domain,
      domain:capabilityDomain(domain,claim.authority),
      state:claim.authorityAttested?'available':'unknown',
      provenance:{provider:claim.providerId,authority:claim.authority,scope:claim.scope}
    });
  }
  return createGlazeProviderSnapshot([...byProvider.values()]);
}

function stateCue(state){
  if(state==='unknown')return 'unknown';
  if(['protected','granted','synchronized','success','recovered','authenticated','online','available','delivered'].includes(state))return 'positive';
  if(['pending','synchronizing','recovering','authenticating','connecting','active'].includes(state))return 'in-progress';
  if(['restricted','degraded','warning','paused','limited','conflict','expired','locked'].includes(state))return 'attention';
  if(['failed','denied','revoked','unavailable','offline','unprotected','canceled'].includes(state))return 'negative';
  return 'neutral';
}

function motionProminence(domain,state){
  if(['security-protection','privacy-consent','privacy-access','resilience-recovery','identity-authentication'].includes(domain)
    && ['failed','denied','revoked','restricted','unprotected','locked'].includes(state))return 'critical';
  if(['protected','synchronized','success','recovered','authenticated'].includes(state))return 'prominent';
  return 'routine';
}

function acceptanceBoundary(){
  return Object.freeze({
    sourceFoundationOnly:true,
    section44Complete:false,
    renderedAcceptanceEstablished:false,
    nativePlatformAcceptanceEstablished:false,
    assistiveTechnologyAcceptanceEstablished:false,
    representativeDeviceAcceptanceEstablished:false,
    privacyBoundaryAcceptanceEstablished:false,
    securityBoundaryAcceptanceEstablished:false,
    providerIntegrationAcceptanceEstablished:false,
    humanTruthCommunicationReviewEstablished:false,
    downstreamConsumerAcceptanceAutomatic:false,
    releasePromotionAutomatic:false,
    deploymentAcceptanceAutomatic:false,
    productionAcceptanceAutomatic:false
  });
}

export function resolveGlazePrivacyAuthorityBoundaryV12(input={}){
  if(!plainObject(input))throw new TypeError('Privacy and Authority Boundary input must be a plain object');
  rejectRawControls(input);
  const domain=member(input.truthDomain,PRIVACY_AUTHORITY_TRUTH_DOMAINS,'truth domain');
  const rawClaims=Array.isArray(input.claims)?input.claims:[];
  if(rawClaims.length===0)throw new RangeError('At least one truth claim is required');
  if(rawClaims.length>8)throw new RangeError('Truth resolution is bounded to eight claims');
  const claims=Object.freeze(rawClaims.map((claim,index)=>normalizeClaim(domain,claim,index)));
  const snapshot=providerSnapshotFor(domain,claims);
  const capabilityId='truth-domain:'+domain;
  const conflict=snapshot.conflicts.capabilityIds.includes(capabilityId);
  const surviving=snapshot.capabilities.byId[capabilityId]??null;

  let acceptedClaim=null;
  if(!conflict&&surviving?.state==='available'){
    acceptedClaim=claims.find(claim=>
      claim.providerId===surviving.provenance?.provider &&
      claim.authority===surviving.provenance?.authority &&
      claim.ownerAllowed &&
      claim.authorityAttested
    )??null;
  }

  const requestedStates=Object.freeze(claims.map(claim=>claim.requestedState));
  const effectiveState=acceptedClaim&&acceptedClaim.requestedState!=='unknown'
    ?acceptedClaim.requestedState
    :'unknown';
  const accepted=effectiveState!=='unknown';
  const occurrenceAuthoritative=accepted&&input.transitionOccurrenceAuthoritative===true;

  const visualMotion=resolveGlazeVisualMotionDirectionV12({
    advancementAreas:['semantic-color','quiet-recognizable-motion'],
    surfaceRole:'content',
    materialPurpose:'readability',
    motionPurpose:'state-change',
    prominence:motionProminence(domain,effectiveState),
    transitionOccurrenceAuthoritative:occurrenceAuthoritative,
    expressionProfile:input.expressionProfile??'balanced',
    expressionProfileAuthoritative:input.expressionProfileAuthoritative===true,
    performancePressure:input.performancePressure??'neutral',
    performancePressureAuthoritative:input.performancePressureAuthoritative===true,
    accessibility:plainObject(input.accessibility)?input.accessibility:{},
    accessibilityAuthoritative:input.accessibilityAuthoritative===true
  });

  return Object.freeze({
    version:'1.7.0-dev.37',
    lifecycle:'Development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([44]),
    truthDomain:domain,
    claims,
    providerSnapshot:Object.freeze({
      conflict,
      conflictPolicy:snapshot.conflictPolicy,
      authorityOwnershipEnforced:snapshot.authorityOwnershipEnforced,
      providerPrecedenceInferred:snapshot.providerPrecedenceInferred,
      capabilityState:surviving?.state??'unknown'
    }),
    truth:Object.freeze({
      requestedStates,
      accepted,
      effectiveState,
      acceptedProviderId:acceptedClaim?.providerId??null,
      acceptedOwnerKind:acceptedClaim?.ownerKind??null,
      acceptedAuthority:acceptedClaim?.authority??null,
      acceptedScope:acceptedClaim?.scope??null,
      cue:stateCue(effectiveState),
      truthCreatedByGlaze:false,
      rejectedReason:accepted?null:
        conflict?'provider-conflict-failed-closed':
        claims.some(claim=>!claim.ownerAllowed)?'owner-not-authorized':
        claims.some(claim=>!claim.authorityAttested)?'authority-not-attested':
        'truth-unverified'
    }),
    presentation:Object.freeze({
      truthBearingCueAllowed:accepted,
      animatedTransitionAllowed:accepted&&occurrenceAuthoritative&&!['none','immediate-state'].includes(visualMotion.direction.motionDirective),
      protectionCueAllowed:domain==='security-protection'&&effectiveState==='protected',
      privacyRevocationCueAllowed:['privacy-consent','privacy-access'].includes(domain)&&effectiveState==='revoked',
      synchronizationCompletionCueAllowed:domain==='synchronization'&&effectiveState==='synchronized',
      successCueAllowed:domain==='operation-result'&&effectiveState==='success',
      recoveryCompletionCueAllowed:domain==='resilience-recovery'&&effectiveState==='recovered',
      authenticationSuccessCueAllowed:domain==='identity-authentication'&&effectiveState==='authenticated',
      visualMotion
    }),
    authority:Object.freeze({
      presentationOnly:true,
      providerRegistryInherited:true,
      provenanceImpersonationAllowed:false,
      providerPrecedenceInferred:false,
      providerConflictsFailClosed:true,
      motionCreatesTruth:false,
      colorCreatesTruth:false,
      materialCreatesTruth:false,
      adaptivePresentationCreatesTruth:false,
      meshCoordinationTruthOnly:domain==='coordination-status',
      meshGovernanceAuthorityInherited:false,
      meshAuthorizationAuthorityInherited:false,
      applicationStateChangedByGlaze:false,
      permissionGrantedByGlaze:false,
      authorizationGrantedByGlaze:false,
      acceptanceGrantedByGlaze:false
    }),
    acceptance:acceptanceBoundary()
  });
}

export const glazeV17PrivacyAuthorityBoundariesDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.37',
  lifecycle:'Development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([44]),
  truthDomains:PRIVACY_AUTHORITY_TRUTH_DOMAINS,
  v15ProviderRegistryVersion:glazeProviderDevelopmentContract.version,
  visualMotionDirectionVersion:glazeV17VisualMotionDirectionDevelopmentContract.version,
  motionCommunicatesTruth:true,
  motionCreatesTruth:false,
  providerPrecedenceInferred:false,
  providerConflictsFailClosed:true,
  meshGovernanceAuthorityInherited:false,
  meshAuthorizationAuthorityInherited:false,
  section44Complete:false,
  acceptance:acceptanceBoundary()
});
