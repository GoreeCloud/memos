/* GLAZE UI V1.6 — Development acceptance-control foundation.
 *
 * This module defines the V1.6 acceptance matrix and final design principles.
 * It is non-consumer-eligible Development source. It evaluates supplied,
 * revision-bound evidence; it does not manufacture evidence or promote lifecycle.
 */

const ACCEPTANCE_LANES = Object.freeze([
  {id:'source-implementation',groups:[['machine']]},
  {id:'design-tokens',groups:[['machine']]},
  {id:'skeleton-system',groups:[['machine','rendered']]},
  {id:'loading-behavior',groups:[['machine','rendered']]},
  {id:'accessibility',groups:[['machine'],['human','assistive-technology']]},
  {id:'semantic-colors',groups:[['machine','rendered']]},
  {id:'reduced-motion',groups:[['machine'],['rendered','human']]},
  {id:'reduced-transparency',groups:[['machine'],['rendered','human']]},
  {id:'increased-contrast',groups:[['machine'],['rendered','human']]},
  {id:'large-text',groups:[['machine'],['rendered','human']]},
  {id:'keyboard-navigation',groups:[['machine'],['human']]},
  {id:'assistive-technology',groups:[['assistive-technology']]},
  {id:'responsive-layouts',groups:[['machine'],['rendered','device']]},
  {id:'form-factor-transitions',groups:[['device','rendered']]},
  {id:'performance',groups:[['performance']]},
  {id:'layout-stability',groups:[['machine'],['performance','rendered']]},
  {id:'offline-behavior',groups:[['machine','rendered']]},
  {id:'degraded-behavior',groups:[['machine','rendered']]},
  {id:'loading-escalation',groups:[['machine','rendered']]},
  {id:'component-state-completeness',groups:[['machine','rendered']]},
  {id:'privacy-boundaries',groups:[['machine'],['human']]},
  {id:'authority-boundaries',groups:[['machine'],['human']]},
  {id:'regression-testing',groups:[['machine'],['rendered']]},
  {id:'representative-rendering',groups:[['rendered'],['device','human']]}
].map(def=>Object.freeze({
  id:def.id,
  evidenceGroups:Object.freeze(def.groups.map(group=>Object.freeze([...group]))),
  evidenceTypes:Object.freeze([...new Set(def.groups.flat())])
})));

const CORE_PILLARS = Object.freeze([
  'skeleton-motion',
  'perceived-performance',
  'state-clarity',
  'accessibility-expansion',
  'motion-coherence',
  'material-intelligence',
  'interaction-continuity',
  'design-system-enforcement'
]);

const GOVERNING_PRINCIPLE = 'Waiting, changing, adapting, loading, failing, recovering, and transitioning must be as intentionally designed as the final static interface.';

function plainObject(v){return Boolean(v)&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;}
function text(v){return String(v??'').trim();}
function validRevision(v){return /^[0-9a-f]{40}$/.test(text(v));}

function recordsById(records){
  const out=new Map();
  if(!Array.isArray(records))return out;
  for(const raw of records.slice(0,1000)){
    if(!plainObject(raw))continue;
    const id=text(raw.id);
    if(!id)continue;
    const list=out.get(id)||[];
    list.push(raw);
    out.set(id,list);
  }
  return out;
}

function normalizeRecord(raw, exactRevision){
  const evidenceRevision=validRevision(raw?.revision)?text(raw.revision):null;
  const evidenceType=text(raw?.evidenceType).toLowerCase();
  const reference=text(raw?.reference);
  const revisionMatches=Boolean(exactRevision&&evidenceRevision===exactRevision);
  return Object.freeze({
    verified:raw?.verified===true,
    evidenceRevision,
    evidenceType:evidenceType||null,
    evidenceReference:reference||null,
    revisionMatches,
    structurallyValid:Boolean(raw?.verified===true&&evidenceRevision&&evidenceType&&reference)
  });
}

function groupSatisfied(group,records){
  return records.some(record =>
    record.verified
    && record.revisionMatches
    && record.evidenceReference
    && group.includes(record.evidenceType)
  );
}

function laneFailureReason(exactRevision, groups, records){
  if(!exactRevision)return 'matrix-exact-revision-missing';
  if(records.length===0)return 'missing-evidence';
  if(records.some(record=>record.verified&&!record.evidenceRevision))return 'evidence-revision-invalid';
  if(records.some(record=>record.verified&&record.evidenceRevision&&!record.revisionMatches))return 'evidence-revision-mismatch';
  if(records.some(record=>record.verified&&record.revisionMatches&&!record.evidenceReference))return 'evidence-reference-missing';
  const allowed=[...new Set(groups.flat())];
  if(records.some(record=>record.verified&&record.revisionMatches&&record.evidenceReference&&!allowed.includes(record.evidenceType))){
    return 'evidence-type-not-allowed';
  }
  if(records.some(record=>record.verified!==true))return 'evidence-not-verified';
  return 'required-evidence-group-unsatisfied';
}

export function createGlazeV16AcceptanceMatrix(input={}){
  if(!plainObject(input))throw new TypeError('Acceptance-matrix input must be a plain object');

  const exactRevision=validRevision(input.exactRevision)?text(input.exactRevision):null;
  const evidence=recordsById(input.evidence);
  const applicability=plainObject(input.applicability)?input.applicability:{};
  const notApplicableJustifications=plainObject(input.notApplicableJustifications)?input.notApplicableJustifications:{};

  const lanes=ACCEPTANCE_LANES.map(def=>{
    const applicable=applicability[def.id]!==false;
    const rawRecords=evidence.get(def.id)||[];
    const records=Object.freeze(rawRecords.map(raw=>normalizeRecord(raw,exactRevision)));
    const justification=text(notApplicableJustifications[def.id]);

    if(!applicable){
      return Object.freeze({
        id:def.id,
        applicable:false,
        status:justification?'not-applicable':'unverified',
        allowedEvidenceTypes:def.evidenceTypes,
        requiredEvidenceGroups:def.evidenceGroups,
        satisfiedEvidenceGroupCount:0,
        evidenceReferences:Object.freeze([]),
        evidenceTypes:Object.freeze([]),
        evidenceRevisions:Object.freeze([]),
        failureReason:justification?null:'not-applicable-requires-justification'
      });
    }

    const groupResults=def.evidenceGroups.map(group=>Object.freeze({
      allowedEvidenceTypes:group,
      satisfied:groupSatisfied(group,records)
    }));
    const satisfiedEvidenceGroupCount=groupResults.filter(group=>group.satisfied).length;
    const verified=Boolean(exactRevision)&&groupResults.every(group=>group.satisfied);
    const validRecords=records.filter(record=>record.verified&&record.revisionMatches&&record.evidenceReference);

    return Object.freeze({
      id:def.id,
      applicable:true,
      status:verified?'verified':'unverified',
      allowedEvidenceTypes:def.evidenceTypes,
      requiredEvidenceGroups:def.evidenceGroups,
      evidenceGroupResults:Object.freeze(groupResults),
      satisfiedEvidenceGroupCount,
      evidenceReferences:Object.freeze(validRecords.map(record=>record.evidenceReference)),
      evidenceTypes:Object.freeze(validRecords.map(record=>record.evidenceType)),
      evidenceRevisions:Object.freeze(validRecords.map(record=>record.evidenceRevision)),
      failureReason:verified?null:laneFailureReason(exactRevision,def.evidenceGroups,records)
    });
  });

  const blocking=lanes.filter(lane=>!['verified','not-applicable'].includes(lane.status));
  const qualificationEvidenceComplete=Boolean(exactRevision)&&blocking.length===0;

  return Object.freeze({
    version:'1.6.0-dev.12',
    lifecycle:'development',
    stableBaseline:'1.5.1',
    consumerEligible:false,
    exactRevision,
    lanes:Object.freeze(lanes),
    laneCount:lanes.length,
    verifiedCount:lanes.filter(l=>l.status==='verified').length,
    notApplicableCount:lanes.filter(l=>l.status==='not-applicable').length,
    unverifiedCount:lanes.filter(l=>l.status==='unverified').length,
    qualificationEvidenceComplete,
    readyForGovernedQualificationReview:qualificationEvidenceComplete,
    blockingLaneIds:Object.freeze(blocking.map(l=>l.id)),
    authority:Object.freeze({
      evidenceManufactured:false,
      staleEvidenceAccepted:false,
      mismatchedRevisionAccepted:false,
      missingEvidenceInferredPassing:false,
      partialEvidenceGroupInferredPassing:false,
      lifecyclePromotionAutomatic:false,
      stableStatusGranted:false,
      consumerAcceptanceAutomatic:false,
      deploymentAcceptanceAutomatic:false,
      productionAcceptanceAutomatic:false
    })
  });
}

export function describeGlazeV16CorePillars(){
  return Object.freeze({
    version:'1.6.0-dev.12',
    lifecycle:'development',
    pillars:CORE_PILLARS,
    count:CORE_PILLARS.length,
    summaryOnly:true,
    lifecycleAuthority:false
  });
}

export function describeGlazeV16GoverningPrinciple(){
  return Object.freeze({
    version:'1.6.0-dev.12',
    lifecycle:'development',
    principle:GOVERNING_PRINCIPLE,
    states:Object.freeze([
      'before-content-loads','while-content-loads','after-content-loads',
      'while-content-updates','connectivity-lost','capability-unavailable',
      'operation-failed','accessibility-simplified','form-factor-changed',
      'resources-constrained'
    ]),
    desiredQualities:Object.freeze([
      'alive-without-distraction','adaptive-without-unpredictability',
      'beautiful-without-sacrificing-clarity',
      'sophisticated-without-sacrificing-accessibility-or-performance'
    ]),
    accessibilityPrecedence:true,
    performancePrecedenceOverDecoration:true,
    truthPreservationRequired:true
  });
}

export const glazeV16AcceptanceDevelopmentContract=Object.freeze({
  version:'1.6.0-dev.12',
  lifecycle:'development',
  stableBaseline:'1.5.1',
  consumerEligible:false,
  acceptanceLanes:ACCEPTANCE_LANES,
  corePillars:CORE_PILLARS,
  governingPrinciple:GOVERNING_PRINCIPLE,
  exactRevisionRequired:true,
  evidenceReferenceRequired:true,
  notApplicableRequiresJustification:true,
  allEvidenceGroupsRequired:true,
  missingEvidenceMayInferPass:false,
  revisionMismatchMayPass:false,
  partialEvidenceGroupMayPass:false,
  lifecyclePromotionAutomatic:false,
  authorityBoundary:'qualification-control-only'
});
