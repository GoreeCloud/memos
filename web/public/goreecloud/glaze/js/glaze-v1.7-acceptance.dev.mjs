/* GLAZE UI V1.7 — Development acceptance-control foundation.
 *
 * Bounded v1.2 Section 46 source layer. This module defines the V1.7
 * qualification evidence matrix and evaluates supplied exact-revision evidence.
 * It does not manufacture evidence, establish V1.7 acceptance, or promote
 * lifecycle state.
 */

const ACCEPTANCE_LANES = Object.freeze([
  {id:'task-continuity',label:"Task continuity",applicability:'required',groups:[["machine"],["rendered","human"]]},
  {id:'adaptive-composition',label:"Adaptive composition",applicability:'required',groups:[["machine"],["rendered","device"]]},
  {id:'semantic-color',label:"Semantic color",applicability:'required',groups:[["machine"],["rendered","human"]]},
  {id:'theme-safety',label:"Theme safety",applicability:'required',groups:[["machine"],["rendered","human"]]},
  {id:'custom-theme-accessibility',label:"Custom-theme accessibility",applicability:'required',groups:[["machine"],["rendered","human","assistive-technology"]]},
  {id:'signature-motion',label:"Signature motion",applicability:'required',groups:[["machine"],["rendered","human"]]},
  {id:'connected-transformations',label:"Connected transformations",applicability:'required',groups:[["machine"],["rendered","human"]]},
  {id:'animation-interruption',label:"Animation interruption",applicability:'required',groups:[["machine"],["rendered","human"]]},
  {id:'animation-reversal',label:"Animation reversal",applicability:'required',groups:[["machine"],["rendered","human"]]},
  {id:'reduced-motion',label:"Reduced Motion",applicability:'required',groups:[["machine"],["rendered","human"]]},
  {id:'frame-pacing',label:"Frame pacing",applicability:'required',groups:[["performance"]]},
  {id:'input-latency',label:"Input latency",applicability:'required',groups:[["performance"]]},
  {id:'mobile',label:"Mobile",applicability:'required',groups:[["device"],["rendered"]]},
  {id:'tablet',label:"Tablet",applicability:'required',groups:[["device"],["rendered"]]},
  {id:'desktop',label:"Desktop",applicability:'required',groups:[["device"],["rendered"]]},
  {id:'foldable',label:"Foldable",applicability:'required',groups:[["device"],["rendered"]]},
  {id:'tv',label:"TV",applicability:'required',groups:[["device"],["rendered"]]},
  {id:'wearable',label:"Wearable where claimed",applicability:'conditional',groups:[["device"],["rendered"]]},
  {id:'keyboard',label:"Keyboard",applicability:'required',groups:[["machine"],["human"]]},
  {id:'pointer',label:"Pointer",applicability:'required',groups:[["machine"],["human"]]},
  {id:'touch',label:"Touch",applicability:'required',groups:[["device"],["human"]]},
  {id:'alternative-input',label:"Alternative input",applicability:'required',groups:[["assistive-technology"],["human"]]},
  {id:'reduced-transparency',label:"Reduced Transparency",applicability:'required',groups:[["machine"],["rendered","human"]]},
  {id:'increased-contrast',label:"Increased Contrast",applicability:'required',groups:[["machine"],["rendered","human"]]},
  {id:'forced-colors',label:"Forced Colors",applicability:'required',groups:[["machine"],["rendered","human"]]},
  {id:'large-text',label:"Large text",applicability:'required',groups:[["machine"],["rendered","human"]]},
  {id:'rtl',label:"RTL",applicability:'required',groups:[["machine"],["rendered"]]},
  {id:'representative-rendering',label:"Representative rendering",applicability:'required',groups:[["rendered"],["human"]]},
  {id:'native-behavior',label:"Native behavior",applicability:'required',groups:[["device"],["human"]]},
  {id:'performance',label:"Performance",applicability:'required',groups:[["performance"]]},
  {id:'energy-behavior',label:"Energy behavior where applicable",applicability:'conditional',groups:[["energy"],["device"]]},
  {id:'regression',label:"Regression",applicability:'required',groups:[["machine"],["rendered"]]},
  {id:'human-visual-motion-review',label:"Human visual and motion review",applicability:'required',groups:[["human"]]},
  {id:'assistive-technology',label:"Assistive technology",applicability:'required',groups:[["assistive-technology"]]},
  {id:'privacy-boundaries',label:"Privacy boundaries",applicability:'required',groups:[["machine"],["human"]]},
  {id:'security-boundaries',label:"Security boundaries",applicability:'required',groups:[["machine"],["human"]]},
  {id:'artifact-provenance',label:"Artifact provenance",applicability:'required',groups:[["provenance"]]}
].map(def=>Object.freeze({
  id:def.id,
  label:def.label,
  applicability:def.applicability,
  evidenceGroups:Object.freeze(def.groups.map(group=>Object.freeze([...group]))),
  evidenceTypes:Object.freeze([...new Set(def.groups.flat())])
})));

const LANE_IDS=new Set(ACCEPTANCE_LANES.map(lane=>lane.id));
const CONDITIONAL_IDS=new Set(ACCEPTANCE_LANES.filter(lane=>lane.applicability==='conditional').map(lane=>lane.id));
const TOP_LEVEL_KEYS=new Set(['exactRevision','evidence','applicability','notApplicableJustifications']);
const RECORD_KEYS=new Set(['id','verified','revision','evidenceType','reference']);
const EVIDENCE_TYPES=new Set(['machine','rendered','device','human','assistive-technology','performance','energy','provenance']);

function plainObject(v){
  if(v===null||typeof v!=='object'||Array.isArray(v))return false;
  const proto=Object.getPrototypeOf(v);
  return proto===Object.prototype||proto===null;
}
function text(v){return String(v??'').trim();}
function validRevision(v){return /^[0-9a-f]{40}$/.test(text(v));}
function rejectUnknownKeys(input,allowed,label){
  for(const key of Object.keys(input))if(!allowed.has(key))throw new RangeError(label+' contains unsupported key: '+key);
}
function validateMapKeys(map,label){
  if(!plainObject(map))return;
  for(const key of Object.keys(map))if(!LANE_IDS.has(key))throw new RangeError(label+' references unknown qualification lane: '+key);
}
function recordsById(records){
  const out=new Map();
  if(records===undefined)return out;
  if(!Array.isArray(records))throw new TypeError('Acceptance evidence must be an array');
  if(records.length>2000)throw new RangeError('Acceptance evidence exceeds the bounded record limit');
  for(const raw of records){
    if(!plainObject(raw))throw new TypeError('Each acceptance evidence record must be a plain object');
    rejectUnknownKeys(raw,RECORD_KEYS,'Acceptance evidence record');
    const id=text(raw.id);
    if(!LANE_IDS.has(id))throw new RangeError('Acceptance evidence references unknown qualification lane: '+id);
    const evidenceType=text(raw.evidenceType).toLowerCase();
    if(evidenceType&&!EVIDENCE_TYPES.has(evidenceType))throw new RangeError('Unsupported acceptance evidence type: '+evidenceType);
    const list=out.get(id)||[];
    list.push(raw);
    out.set(id,list);
  }
  return out;
}
function normalizeRecord(raw,exactRevision){
  const evidenceRevision=validRevision(raw?.revision)?text(raw.revision):null;
  const evidenceType=text(raw?.evidenceType).toLowerCase();
  const reference=text(raw?.reference);
  const revisionMatches=Boolean(exactRevision&&evidenceRevision===exactRevision);
  return Object.freeze({
    externallyVerified:raw?.verified===true,
    evidenceRevision,
    evidenceType:evidenceType||null,
    evidenceReference:reference||null,
    revisionMatches,
    structurallyValid:Boolean(raw?.verified===true&&evidenceRevision&&evidenceType&&reference)
  });
}
function groupSatisfied(group,records){
  return records.some(record=>record.externallyVerified&&record.revisionMatches&&record.evidenceReference&&group.includes(record.evidenceType));
}
function laneFailureReason(exactRevision,groups,records){
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

export function createGlazeV17AcceptanceMatrix(input={}){
  if(!plainObject(input))throw new TypeError('V1.7 acceptance-matrix input must be a plain object');
  rejectUnknownKeys(input,TOP_LEVEL_KEYS,'V1.7 acceptance-matrix input');
  const exactRevision=validRevision(input.exactRevision)?text(input.exactRevision):null;
  const applicability=plainObject(input.applicability)?input.applicability:{};
  const notApplicableJustifications=plainObject(input.notApplicableJustifications)?input.notApplicableJustifications:{};
  validateMapKeys(applicability,'Applicability');
  validateMapKeys(notApplicableJustifications,'Not-applicable justification');
  for(const [id,value] of Object.entries(applicability)){
    if(value===false&&!CONDITIONAL_IDS.has(id))throw new RangeError('Required V1.7 qualification lane cannot be marked not applicable: '+id);
    if(value!==true&&value!==false)throw new TypeError('Applicability values must be boolean: '+id);
  }
  const evidence=recordsById(input.evidence);
  const lanes=ACCEPTANCE_LANES.map(def=>{
    const applicable=applicability[def.id]!==false;
    const rawRecords=evidence.get(def.id)||[];
    const records=Object.freeze(rawRecords.map(raw=>normalizeRecord(raw,exactRevision)));
    const justification=text(notApplicableJustifications[def.id]);
    if(!applicable){
      return Object.freeze({
        id:def.id,label:def.label,applicability:def.applicability,applicable:false,
        status:justification.length>=20?'not-applicable-justified':'unverified',
        allowedEvidenceTypes:def.evidenceTypes,requiredEvidenceGroups:def.evidenceGroups,
        satisfiedEvidenceGroupCount:0,evidenceReferences:Object.freeze([]),evidenceTypes:Object.freeze([]),evidenceRevisions:Object.freeze([]),
        failureReason:justification.length>=20?null:'not-applicable-requires-specific-justification'
      });
    }
    const groupResults=def.evidenceGroups.map(group=>Object.freeze({allowedEvidenceTypes:group,satisfied:groupSatisfied(group,records)}));
    const satisfiedEvidenceGroupCount=groupResults.filter(group=>group.satisfied).length;
    const externallyVerified=Boolean(exactRevision)&&groupResults.every(group=>group.satisfied);
    const validRecords=records.filter(record=>record.externallyVerified&&record.revisionMatches&&record.evidenceReference);
    return Object.freeze({
      id:def.id,label:def.label,applicability:def.applicability,applicable:true,
      status:externallyVerified?'externally-verified':'unverified',
      allowedEvidenceTypes:def.evidenceTypes,requiredEvidenceGroups:def.evidenceGroups,evidenceGroupResults:Object.freeze(groupResults),
      satisfiedEvidenceGroupCount,evidenceReferences:Object.freeze(validRecords.map(record=>record.evidenceReference)),
      evidenceTypes:Object.freeze(validRecords.map(record=>record.evidenceType)),evidenceRevisions:Object.freeze(validRecords.map(record=>record.evidenceRevision)),
      failureReason:externallyVerified?null:laneFailureReason(exactRevision,def.evidenceGroups,records)
    });
  });
  const blocking=lanes.filter(lane=>!['externally-verified','not-applicable-justified'].includes(lane.status));
  const evidenceInventoryComplete=Boolean(exactRevision)&&blocking.length===0;
  return Object.freeze({
    version:'1.7.0-dev.39',lifecycle:'development',stableBaseline:'1.6.0',consumerEligible:false,planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([46]),exactRevision,lanes:Object.freeze(lanes),laneCount:lanes.length,
    externallyVerifiedCount:lanes.filter(l=>l.status==='externally-verified').length,
    notApplicableJustifiedCount:lanes.filter(l=>l.status==='not-applicable-justified').length,
    unverifiedCount:lanes.filter(l=>l.status==='unverified').length,evidenceInventoryComplete,
    readyForGovernedQualificationReview:evidenceInventoryComplete,blockingLaneIds:Object.freeze(blocking.map(l=>l.id)),
    authority:Object.freeze({
      evidenceManufactured:false,externalEvidenceTrustInferred:false,staleEvidenceAccepted:false,mismatchedRevisionAccepted:false,
      missingEvidenceInferredPassing:false,partialEvidenceGroupInferredPassing:false,unsupportedNotApplicableAccepted:false,
      automatedTestsAloneMayEstablishMotionAcceptance:false,v17AcceptanceEstablished:false,lifecyclePromotionAutomatic:false,
      stableStatusGranted:false,consumerEligibilityGranted:false,deploymentAcceptanceAutomatic:false,productionAcceptanceAutomatic:false
    })
  });
}

export const glazeV17AcceptanceDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.39',lifecycle:'development',stableBaseline:'1.6.0',consumerEligible:false,planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([46]),acceptanceLanes:ACCEPTANCE_LANES,laneCount:ACCEPTANCE_LANES.length,
  conditionalApplicabilityLanes:Object.freeze([...CONDITIONAL_IDS]),exactRevisionRequired:true,evidenceReferenceRequired:true,
  allEvidenceGroupsRequired:true,missingEvidenceMayInferPass:false,revisionMismatchMayPass:false,partialEvidenceGroupMayPass:false,
  automatedTestsAloneMayEstablishMotionAcceptance:false,matrixCompletionEqualsV17Acceptance:false,lifecyclePromotionAutomatic:false,
  section46Complete:false,authorityBoundary:'qualification-control-only'
});
