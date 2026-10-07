/* Glaze V1.7 — v1.3 Qualification Coverage Extension.
 *
 * dev.47 extends the dev.46 combined qualification model with explicit
 * evidence lanes for Section 48 surfaces that were source-complete but not
 * represented as dedicated v1.3 qualification lanes.
 */

import {
  createGlazeV17V13QualificationMatrix,
  glazeV17V13QualificationDevelopmentContract
} from './glaze-v1.7-v1-3-qualification.dev.mjs';

const defs=[
  ['expression-system-v13','Expression System','required',[['machine'],['rendered'],['human']]],
  ['contextual-actions-v13','Contextual Actions','required',[['machine'],['rendered'],['provider-integration'],['human']]],
  ['brief-v13','Glaze Brief','required',[['machine'],['rendered'],['provider-integration'],['human']]],
  ['control-center-v13','Glaze Control Center','required',[['machine'],['rendered'],['provider-integration'],['human']]]
];

export const V13_SECTION48_COVERAGE_LANES=Object.freeze(defs.map(def=>Object.freeze({
  id:def[0],
  label:def[1],
  applicability:def[2],
  evidenceGroups:Object.freeze(def[3].map(group=>Object.freeze([...group]))),
  evidenceTypes:Object.freeze([...new Set(def[3].flat())])
})));

const LANE_IDS=new Set(V13_SECTION48_COVERAGE_LANES.map(lane=>lane.id));
const EVIDENCE_TYPES=new Set(['machine','rendered','provider-integration','human']);
const TOP_KEYS=new Set([
  'exactRevision',
  'v12Evidence','v12Applicability','v12NotApplicableJustifications',
  'section48Evidence','section48Applicability','section48NotApplicableJustifications',
  'coverageEvidence'
]);
const RECORD_KEYS=new Set(['id','verified','revision','evidenceType','reference']);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function text(value){return String(value??'').trim();}
function validRevision(value){return /^[0-9a-f]{40}$/.test(text(value));}
function rejectUnknownKeys(input,allowed,label){
  for(const key of Object.keys(input)){
    if(!allowed.has(key))throw new RangeError(label+' contains unsupported key: '+key);
  }
}
function normalizeRecords(records,exactRevision){
  const out=new Map();
  if(records===undefined)return out;
  if(!Array.isArray(records))throw new TypeError('Section 48 coverage evidence must be an array');
  if(records.length>500)throw new RangeError('Section 48 coverage evidence exceeds bounded record limit');
  for(const raw of records){
    if(!plainObject(raw))throw new TypeError('Each coverage evidence record must be a plain object');
    rejectUnknownKeys(raw,RECORD_KEYS,'Section 48 coverage evidence record');
    const id=text(raw.id);
    if(!LANE_IDS.has(id))throw new RangeError('Unknown Section 48 coverage lane: '+id);
    const evidenceType=text(raw.evidenceType).toLowerCase();
    if(!EVIDENCE_TYPES.has(evidenceType))throw new RangeError('Unsupported Section 48 coverage evidence type: '+evidenceType);
    const evidenceRevision=validRevision(raw.revision)?text(raw.revision):null;
    const record=Object.freeze({
      externallyVerified:raw.verified===true,
      evidenceRevision,
      evidenceType,
      evidenceReference:text(raw.reference)||null,
      revisionMatches:Boolean(exactRevision&&evidenceRevision===exactRevision)
    });
    const list=out.get(id)||[];
    list.push(record);
    out.set(id,list);
  }
  return out;
}
function groupSatisfied(group,records){
  return records.some(record=>record.externallyVerified&&record.revisionMatches&&record.evidenceReference&&group.includes(record.evidenceType));
}
function failureReason(exactRevision,groups,records){
  if(!exactRevision)return 'matrix-exact-revision-missing';
  if(records.length===0)return 'missing-evidence';
  if(records.some(record=>record.externallyVerified&&!record.evidenceRevision))return 'evidence-revision-invalid';
  if(records.some(record=>record.externallyVerified&&record.evidenceRevision&&!record.revisionMatches))return 'evidence-revision-mismatch';
  if(records.some(record=>record.externallyVerified&&record.revisionMatches&&!record.evidenceReference))return 'evidence-reference-missing';
  const allowed=[...new Set(groups.flat())];
  if(records.some(record=>record.externallyVerified&&record.revisionMatches&&record.evidenceReference&&!allowed.includes(record.evidenceType)))return 'evidence-type-not-allowed';
  if(records.some(record=>record.externallyVerified!==true))return 'evidence-not-externally-verified';
  return 'required-evidence-group-unsatisfied';
}
function coverageMatrix(recordsInput,exactRevision){
  const evidence=normalizeRecords(recordsInput,exactRevision);
  const lanes=V13_SECTION48_COVERAGE_LANES.map(def=>{
    const records=evidence.get(def.id)||[];
    const groupResults=def.evidenceGroups.map(group=>Object.freeze({
      allowedEvidenceTypes:group,
      satisfied:groupSatisfied(group,records)
    }));
    const satisfiedEvidenceGroupCount=groupResults.filter(group=>group.satisfied).length;
    const externallyVerified=Boolean(exactRevision)&&groupResults.every(group=>group.satisfied);
    const validRecords=records.filter(record=>record.externallyVerified&&record.revisionMatches&&record.evidenceReference);
    return Object.freeze({
      id:def.id,label:def.label,applicability:def.applicability,applicable:true,
      status:externallyVerified?'externally-verified':'unverified',
      allowedEvidenceTypes:def.evidenceTypes,
      requiredEvidenceGroups:def.evidenceGroups,
      evidenceGroupResults:Object.freeze(groupResults),
      satisfiedEvidenceGroupCount,
      evidenceReferences:Object.freeze(validRecords.map(record=>record.evidenceReference)),
      evidenceTypes:Object.freeze(validRecords.map(record=>record.evidenceType)),
      evidenceRevisions:Object.freeze(validRecords.map(record=>record.evidenceRevision)),
      failureReason:externallyVerified?null:failureReason(exactRevision,def.evidenceGroups,records)
    });
  });
  const blocking=lanes.filter(lane=>lane.status!=='externally-verified');
  return Object.freeze({
    lanes:Object.freeze(lanes),
    laneCount:lanes.length,
    externallyVerifiedCount:lanes.filter(lane=>lane.status==='externally-verified').length,
    unverifiedCount:blocking.length,
    evidenceInventoryComplete:Boolean(exactRevision)&&blocking.length===0,
    blockingLaneIds:Object.freeze(blocking.map(lane=>lane.id))
  });
}

export function createGlazeV17V13QualificationCoverageMatrix(input={}){
  if(!plainObject(input))throw new TypeError('V1.7 v1.3 qualification coverage input must be a plain object');
  rejectUnknownKeys(input,TOP_KEYS,'V1.7 v1.3 qualification coverage input');

  const exactRevision=validRevision(input.exactRevision)?text(input.exactRevision):null;
  const combined=createGlazeV17V13QualificationMatrix({
    exactRevision,
    v12Evidence:input.v12Evidence,
    v12Applicability:input.v12Applicability,
    v12NotApplicableJustifications:input.v12NotApplicableJustifications,
    section48Evidence:input.section48Evidence,
    section48Applicability:input.section48Applicability,
    section48NotApplicableJustifications:input.section48NotApplicableJustifications
  });
  const coverage=coverageMatrix(input.coverageEvidence,exactRevision);
  const evidenceInventoryComplete=combined.evidenceInventoryComplete&&coverage.evidenceInventoryComplete;

  return Object.freeze({
    version:'1.7.0-dev.47',
    lifecycle:'DevelopmentQualification',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    v13SpecificationSections:Object.freeze([48]),
    exactRevision,
    sourceCoverageComplete:combined.sourceCoverageComplete,
    retainedCombinedQualification:Object.freeze({
      version:glazeV17V13QualificationDevelopmentContract.version,
      laneCount:combined.totalLaneCount,
      evidenceInventoryComplete:combined.evidenceInventoryComplete,
      blockingLaneIds:combined.blockingLaneIds
    }),
    coverage,
    totalLaneCount:combined.totalLaneCount+coverage.laneCount,
    evidenceInventoryComplete,
    readyForGovernedQualificationReview:combined.sourceCoverageComplete&&evidenceInventoryComplete,
    blockingLaneIds:Object.freeze([
      ...combined.blockingLaneIds,
      ...coverage.blockingLaneIds.map(id=>'v1.3-coverage:'+id)
    ]),
    authority:Object.freeze({
      evidenceManufactured:false,
      implicitSurfaceCoverageAccepted:false,
      externalEvidenceTrustInferred:false,
      staleEvidenceAccepted:false,
      mismatchedRevisionAccepted:false,
      missingEvidenceInferredPassing:false,
      matrixCompletionEqualsSection48Acceptance:false,
      matrixCompletionEqualsV17Acceptance:false,
      section48Accepted:false,
      v17AcceptanceEstablished:false,
      sealStatusGranted:false,
      anchorStatusGranted:false,
      stableStatusGranted:false,
      consumerEligibilityGranted:false,
      lifecyclePromotionAutomatic:false,
      deploymentAcceptanceGranted:false,
      productionAcceptanceGranted:false
    })
  });
}

export const glazeV17V13QualificationCoverageDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.47',
  lifecycle:'DevelopmentQualification',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.3',
  v13SpecificationSections:Object.freeze([48]),
  retainedCombinedQualificationVersion:glazeV17V13QualificationDevelopmentContract.version,
  retainedCombinedLaneCount:glazeV17V13QualificationDevelopmentContract.totalLaneCount,
  addedCoverageLanes:V13_SECTION48_COVERAGE_LANES,
  addedCoverageLaneCount:V13_SECTION48_COVERAGE_LANES.length,
  totalLaneCount:glazeV17V13QualificationDevelopmentContract.totalLaneCount+V13_SECTION48_COVERAGE_LANES.length,
  exactRevisionRequired:true,
  allEvidenceGroupsRequired:true,
  implicitSurfaceCoverageAccepted:false,
  section48SourceComplete:true,
  section48Accepted:false,
  v17Accepted:false,
  lifecyclePromotionAutomatic:false,
  authorityBoundary:'qualification-coverage-extension-only'
});
