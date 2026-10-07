/* Glaze V1.7 — Section 48 Qualification Control Development foundation.
 *
 * This layer records V1.7 v1.3 Section 48 source coverage and the additional
 * evidence groups required before Section 48 can be accepted. It does not
 * create evidence, accept external reviewers, or promote lifecycle state.
 */

import {glazeV17ExpressionSystemDevelopmentContract} from './glaze-v1.7-expression-system.dev.mjs';
import {glazeV17ProviderAdaptiveSurfacesDevelopmentContract} from './glaze-v1.7-provider-adaptive-surfaces.dev.mjs';
import {glazeV17AdaptiveExperienceSurfacesDevelopmentContract} from './glaze-v1.7-adaptive-experience-surfaces.dev.mjs';
import {glazeV17TrustCareSurfacesDevelopmentContract} from './glaze-v1.7-trust-care-surfaces.dev.mjs';
import {glazeV17CreativeCompareSurfacesDevelopmentContract} from './glaze-v1.7-creative-compare-surfaces.dev.mjs';

export const SECTION48_SURFACES=Object.freeze([
  'glaze-contextual-actions','glaze-brief','glaze-control-center','glaze-workspace',
  'glaze-compact-surface','glaze-agent-activity','glaze-privacy-attention',
  'glaze-accessibility-presentation','glaze-creative-surface','glaze-compare','glaze-care-surface'
]);

export const SECTION48_QUALIFICATION_LANES=Object.freeze([
  Object.freeze({id:'expression-system',groups:Object.freeze(['machine','rendered','human'])}),
  Object.freeze({id:'workspace-continuity',groups:Object.freeze(['machine','rendered','device','human'])}),
  Object.freeze({id:'compact-surface',groups:Object.freeze(['machine','rendered','device','assistive-technology'])}),
  Object.freeze({id:'agent-activity',groups:Object.freeze(['machine','rendered','provider-integration','human'])}),
  Object.freeze({id:'privacy-attention',groups:Object.freeze(['machine','rendered','privacy-security','human'])}),
  Object.freeze({id:'accessibility-presentation',groups:Object.freeze(['machine','rendered','assistive-technology','human'])}),
  Object.freeze({id:'creative-surface',groups:Object.freeze(['machine','rendered','human'])}),
  Object.freeze({id:'compare',groups:Object.freeze(['machine','rendered','human'])}),
  Object.freeze({id:'care-surface',groups:Object.freeze(['machine','rendered','provider-integration','human'])}),
  Object.freeze({id:'cross-platform',groups:Object.freeze(['rendered','device','human'])}),
  Object.freeze({id:'performance-energy',groups:Object.freeze(['performance','energy','device'])}),
  Object.freeze({id:'artifact-provenance',groups:Object.freeze(['provenance'])})
]);

const EVIDENCE_TYPES=Object.freeze([
  'machine','rendered','device','human','assistive-technology',
  'provider-integration','privacy-security','performance','energy','provenance'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function revision(value){
  const v=String(value??'').trim().toLowerCase();
  if(!/^[0-9a-f]{40}$/.test(v))throw new RangeError('sourceRevision must be a 40-character Git commit SHA');
  return v;
}
function text(value,label,max=300){
  const v=String(value??'').trim();
  if(!v)throw new TypeError(label+' is required');
  return v.slice(0,max);
}
function normalizeEvidence(value,sourceRevision){
  if(!Array.isArray(value))return Object.freeze([]);
  return Object.freeze(value.map((item,index)=>{
    if(!plainObject(item))throw new TypeError('Evidence item '+index+' must be a plain object');
    const laneId=text(item.laneId,'laneId',80).toLowerCase();
    const type=text(item.type,'type',80).toLowerCase();
    if(!EVIDENCE_TYPES.includes(type))throw new RangeError('Unsupported evidence type: '+type);
    const evidenceRevision=revision(item.sourceRevision);
    return Object.freeze({
      laneId,type,
      sourceRevision:evidenceRevision,
      exactRevisionMatch:evidenceRevision===sourceRevision,
      reference:text(item.reference,'reference',500),
      reviewer:text(item.reviewer,'reviewer',160),
      acceptedByGovernedReview:item.acceptedByGovernedReview===true
    });
  }));
}

function sourceCoverage(){
  const implemented=Object.freeze([
    ...glazeV17ProviderAdaptiveSurfacesDevelopmentContract.surfaces,
    ...glazeV17AdaptiveExperienceSurfacesDevelopmentContract.surfaces,
    ...glazeV17TrustCareSurfacesDevelopmentContract.surfaces,
    ...glazeV17CreativeCompareSurfacesDevelopmentContract.surfaces
  ]);
  return Object.freeze({
    expressionSystemCoreImplemented:glazeV17ExpressionSystemDevelopmentContract.expressionSystemCoreImplemented===true,
    implementedSurfaces:implemented,
    missingSurfaces:Object.freeze(SECTION48_SURFACES.filter(surface=>!implemented.includes(surface))),
    allPlannedSurfacesSourceImplemented:SECTION48_SURFACES.every(surface=>implemented.includes(surface)),
    section48SourceComplete:glazeV17ExpressionSystemDevelopmentContract.expressionSystemCoreImplemented===true
      && SECTION48_SURFACES.every(surface=>implemented.includes(surface))
  });
}

export function evaluateGlazeV17Section48Qualification(input={}){
  if(!plainObject(input))throw new TypeError('Section 48 qualification input must be a plain object');
  const sourceRevision=revision(input.sourceRevision);
  const predecessor=plainObject(input.predecessorQualification)?input.predecessorQualification:{};
  const predecessorRevision=String(predecessor.sourceRevision??'').trim().toLowerCase();
  const predecessorAccepted=predecessor.acceptedByGovernedReview===true
    && predecessorRevision===sourceRevision
    && String(predecessor.reference??'').trim()!=='';
  const evidence=normalizeEvidence(input.evidence,sourceRevision);
  const coverage=sourceCoverage();

  const lanes=Object.freeze(SECTION48_QUALIFICATION_LANES.map(lane=>{
    const laneEvidence=evidence.filter(item=>item.laneId===lane.id&&item.exactRevisionMatch&&item.acceptedByGovernedReview);
    const presentTypes=new Set(laneEvidence.map(item=>item.type));
    const missingGroups=lane.groups.filter(group=>!presentTypes.has(group));
    return Object.freeze({
      id:lane.id,
      requiredGroups:lane.groups,
      acceptedEvidenceCount:laneEvidence.length,
      missingGroups:Object.freeze(missingGroups),
      complete:missingGroups.length===0
    });
  }));

  const blockingLanes=Object.freeze(lanes.filter(lane=>!lane.complete).map(lane=>lane.id));
  const evidenceComplete=blockingLanes.length===0;
  const readyForGovernedQualificationReview=coverage.section48SourceComplete
    && predecessorAccepted
    && evidenceComplete;

  return Object.freeze({
    version:'1.7.0-dev.45',
    lifecycle:'DevelopmentQualification',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    section:48,
    sourceRevision,
    sourceCoverage:coverage,
    predecessor:Object.freeze({
      required:true,
      acceptanceModelVersion:'1.7.0-dev.39',
      exactRevisionRequired:true,
      accepted:predecessorAccepted
    }),
    lanes,
    blockingLanes,
    evidenceComplete,
    readyForGovernedQualificationReview,
    authority:Object.freeze({
      evidenceCreatedByEvaluator:false,
      reviewerAuthorityInferred:false,
      section48Accepted:false,
      v17Accepted:false,
      lifecyclePromotionAutomatic:false,
      anchorStatusGranted:false,
      consumerEligibilityGranted:false,
      deploymentAcceptanceGranted:false,
      productionAcceptanceGranted:false
    })
  });
}

export const glazeV17Section48QualificationDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.45',
  lifecycle:'DevelopmentQualification',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.3',
  v13SpecificationSections:Object.freeze([48]),
  requirementGroup:'section48-qualification-control',
  sourceVersions:Object.freeze({
    expressionSystem:glazeV17ExpressionSystemDevelopmentContract.version,
    providerAdaptiveSurfaces:glazeV17ProviderAdaptiveSurfacesDevelopmentContract.version,
    adaptiveExperienceSurfaces:glazeV17AdaptiveExperienceSurfacesDevelopmentContract.version,
    trustCareSurfaces:glazeV17TrustCareSurfacesDevelopmentContract.version,
    creativeCompareSurfaces:glazeV17CreativeCompareSurfacesDevelopmentContract.version
  }),
  surfaces:SECTION48_SURFACES,
  qualificationLanes:SECTION48_QUALIFICATION_LANES,
  predecessorAcceptanceModelVersion:'1.7.0-dev.39',
  predecessorAcceptanceAutomaticallyInherited:false,
  section48SourceComplete:true,
  section48Accepted:false,
  v17Accepted:false,
  lifecyclePromotionAutomatic:false,
  anchorStatusGranted:false
});
