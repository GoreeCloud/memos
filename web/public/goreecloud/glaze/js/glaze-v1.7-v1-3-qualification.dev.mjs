/* Glaze V1.7 — v1.3 Combined Qualification Control.
 *
 * dev.46 composes the frozen v1.2/dev.39 37-lane acceptance matrix with
 * granular V1.3 Section 48 evidence lanes. It does not rewrite historical
 * evidence and cannot promote lifecycle state.
 */

import {
  createGlazeV17AcceptanceMatrix,
  glazeV17AcceptanceDevelopmentContract
} from './glaze-v1.7-acceptance.dev.mjs';
import {
  glazeV17Section48QualificationDevelopmentContract
} from './glaze-v1.7-section48-qualification.dev.mjs';

const defs=[
  ['workspace-continuity-v13','Workspace continuity','required',[['machine'],['rendered'],['device'],['human']]],
  ['compact-surface-v13','Compact surface behavior','required',[['machine'],['rendered'],['device'],['assistive-technology']]],
  ['agent-activity-authority-v13','Agent Activity authority','required',[['machine'],['rendered'],['provider-integration'],['human']]],
  ['privacy-attention-authority-v13','Privacy Attention authority','required',[['machine'],['rendered'],['privacy-security'],['human']]],
  ['accessibility-presentation-v13','Accessibility Presentation','required',[['machine'],['rendered'],['assistive-technology'],['human']]],
  ['creative-state-separation-v13','Creative state separation','required',[['machine'],['rendered'],['human']]],
  ['compare-neutrality-v13','Compare neutrality','required',[['machine'],['rendered'],['human']]],
  ['care-authority-v13','Care authority','required',[['machine'],['rendered'],['provider-integration'],['human']]],
  ['large-text-reflow-v13','Large Text reflow','required',[['machine'],['rendered'],['device'],['assistive-technology'],['human']]],
  ['forced-colors-v13','Forced Colors','required',[['machine'],['rendered'],['assistive-technology'],['human']]],
  ['keyboard-continuity-v13','Keyboard continuity','required',[['machine'],['human']]],
  ['switch-access-v13','Switch access','required',[['assistive-technology'],['human']]],
  ['voice-access-v13','Voice access','required',[['assistive-technology'],['human']]],
  ['compact-device-behavior-v13','Representative compact-device behavior','required',[['device'],['rendered']]],
  ['provider-integration-v13','Provider integration','required',[['provider-integration'],['machine'],['human']]],
  ['privacy-security-integration-v13','Privacy and security integration','required',[['privacy-security'],['machine'],['human']]],
  ['cross-platform-expression-v13','Cross-platform expression consistency','required',[['rendered'],['device'],['human']]],
  ['performance-v13','Measured performance','required',[['performance']]],
  ['energy-v13','Energy behavior where applicable','conditional',[['energy'],['device']]],
  ['human-visual-v13','Human visual and interaction review','required',[['human']]],
  ['artifact-provenance-v13','V1.3 artifact provenance','required',[['provenance']]]
];

export const V13_SECTION48_QUALIFICATION_LANES=Object.freeze(defs.map(def=>Object.freeze({
  id:def[0],
  label:def[1],
  applicability:def[2],
  evidenceGroups:Object.freeze(def[3].map(group=>Object.freeze([...group]))),
  evidenceTypes:Object.freeze([...new Set(def[3].flat())])
})));

const LANE_IDS=new Set(V13_SECTION48_QUALIFICATION_LANES.map(lane=>lane.id));
const CONDITIONAL_IDS=new Set(V13_SECTION48_QUALIFICATION_LANES.filter(lane=>lane.applicability==='conditional').map(lane=>lane.id));
const EVIDENCE_TYPES=new Set([
  'machine','rendered','device','human','assistive-technology','performance',
  'energy','provenance','provider-integration','privacy-security'
]);
const TOP_KEYS=new Set([
  'exactRevision','v12Evidence','v12Applicability','v12NotApplicableJustifications',
  'section48Evidence','section48Applicability','section48NotApplicableJustifications'
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
function validateMapKeys(map,label){
  if(!plainObject(map))return;
  for(const key of Object.keys(map)){
    if(!LANE_IDS.has(key))throw new RangeError(label+' references unknown Section 48 lane: '+key);
  }
}
function normalizeRecords(records,exactRevision){
  const out=new Map();
  if(records===undefined)return out;
  if(!Array.isArray(records))throw new TypeError('Section 48 evidence must be an array');
  if(records.length>2000)throw new RangeError('Section 48 evidence exceeds bounded record limit');
  for(const raw of records){
    if(!plainObject(raw))throw new TypeError('Each Section 48 evidence record must be a plain object');
    rejectUnknownKeys(raw,RECORD_KEYS,'Section 48 evidence record');
    const id=text(raw.id);
    if(!LANE_IDS.has(id))throw new RangeError('Unknown Section 48 qualification lane: '+id);
    const evidenceType=text(raw.evidenceType).toLowerCase();
    if(!EVIDENCE_TYPES.has(evidenceType))throw new RangeError('Unsupported Section 48 evidence type: '+evidenceType);
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
function section48Matrix(input,exactRevision){
  const applicability=plainObject(input.section48Applicability)?input.section48Applicability:{};
  const justifications=plainObject(input.section48NotApplicableJustifications)?input.section48NotApplicableJustifications:{};
  validateMapKeys(applicability,'Section 48 applicability');
  validateMapKeys(justifications,'Section 48 not-applicable justification');
  for(const [id,value] of Object.entries(applicability)){
    if(value!==true&&value!==false)throw new TypeError('Section 48 applicability values must be boolean: '+id);
    if(value===false&&!CONDITIONAL_IDS.has(id))throw new RangeError('Required Section 48 lane cannot be marked not applicable: '+id);
  }
  const evidence=normalizeRecords(input.section48Evidence,exactRevision);
  const lanes=V13_SECTION48_QUALIFICATION_LANES.map(def=>{
    const applicable=applicability[def.id]!==false;
    const records=evidence.get(def.id)||[];
    const justification=text(justifications[def.id]);
    if(!applicable){
      return Object.freeze({
        id:def.id,label:def.label,applicability:def.applicability,applicable:false,
        status:justification.length>=20?'not-applicable-justified':'unverified',
        allowedEvidenceTypes:def.evidenceTypes,
        requiredEvidenceGroups:def.evidenceGroups,
        satisfiedEvidenceGroupCount:0,
        evidenceReferences:Object.freeze([]),
        evidenceTypes:Object.freeze([]),
        evidenceRevisions:Object.freeze([]),
        failureReason:justification.length>=20?null:'not-applicable-requires-specific-justification'
      });
    }
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
  const blocking=lanes.filter(lane=>!['externally-verified','not-applicable-justified'].includes(lane.status));
  return Object.freeze({
    lanes:Object.freeze(lanes),
    laneCount:lanes.length,
    externallyVerifiedCount:lanes.filter(lane=>lane.status==='externally-verified').length,
    notApplicableJustifiedCount:lanes.filter(lane=>lane.status==='not-applicable-justified').length,
    unverifiedCount:lanes.filter(lane=>lane.status==='unverified').length,
    evidenceInventoryComplete:Boolean(exactRevision)&&blocking.length===0,
    blockingLaneIds:Object.freeze(blocking.map(lane=>lane.id))
  });
}

export function createGlazeV17V13QualificationMatrix(input={}){
  if(!plainObject(input))throw new TypeError('V1.7 v1.3 qualification input must be a plain object');
  rejectUnknownKeys(input,TOP_KEYS,'V1.7 v1.3 qualification input');
  const exactRevision=validRevision(input.exactRevision)?text(input.exactRevision):null;
  const retainedV12=createGlazeV17AcceptanceMatrix({
    exactRevision,
    evidence:input.v12Evidence,
    applicability:input.v12Applicability,
    notApplicableJustifications:input.v12NotApplicableJustifications
  });
  const section48=section48Matrix(input,exactRevision);
  const sourceCoverageComplete=glazeV17Section48QualificationDevelopmentContract.section48SourceComplete===true;
  const evidenceInventoryComplete=retainedV12.evidenceInventoryComplete&&section48.evidenceInventoryComplete;
  const readyForGovernedQualificationReview=sourceCoverageComplete&&evidenceInventoryComplete;
  return Object.freeze({
    version:'1.7.0-dev.46',
    lifecycle:'DevelopmentQualification',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    v13SpecificationSections:Object.freeze([48]),
    exactRevision,
    sourceCoverageComplete,
    retainedV12:Object.freeze({
      version:glazeV17AcceptanceDevelopmentContract.version,
      laneCount:retainedV12.laneCount,
      evidenceInventoryComplete:retainedV12.evidenceInventoryComplete,
      blockingLaneIds:retainedV12.blockingLaneIds
    }),
    section48,
    totalLaneCount:retainedV12.laneCount+section48.laneCount,
    evidenceInventoryComplete,
    readyForGovernedQualificationReview,
    blockingLaneIds:Object.freeze([
      ...retainedV12.blockingLaneIds.map(id=>'v1.2:'+id),
      ...section48.blockingLaneIds.map(id=>'v1.3:'+id)
    ]),
    authority:Object.freeze({
      evidenceManufactured:false,
      predecessorAcceptanceInferred:false,
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

export const glazeV17V13QualificationDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.46',
  lifecycle:'DevelopmentQualification',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.3',
  v13SpecificationSections:Object.freeze([48]),
  retainedV12AcceptanceVersion:glazeV17AcceptanceDevelopmentContract.version,
  section48SourceCompletionVersion:glazeV17Section48QualificationDevelopmentContract.version,
  retainedV12LaneCount:glazeV17AcceptanceDevelopmentContract.laneCount,
  section48Lanes:V13_SECTION48_QUALIFICATION_LANES,
  section48LaneCount:V13_SECTION48_QUALIFICATION_LANES.length,
  totalLaneCount:glazeV17AcceptanceDevelopmentContract.laneCount+V13_SECTION48_QUALIFICATION_LANES.length,
  conditionalSection48Lanes:Object.freeze([...CONDITIONAL_IDS]),
  exactRevisionRequired:true,
  allEvidenceGroupsRequired:true,
  predecessorAcceptanceAssertionSufficient:false,
  sourceCoverageRequired:true,
  missingEvidenceMayInferPass:false,
  revisionMismatchMayPass:false,
  matrixCompletionEqualsSection48Acceptance:false,
  matrixCompletionEqualsV17Acceptance:false,
  section48SourceComplete:true,
  section48Accepted:false,
  v17Accepted:false,
  lifecyclePromotionAutomatic:false,
  authorityBoundary:'combined-qualification-control-only'
});
