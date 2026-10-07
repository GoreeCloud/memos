import {evaluateQualificationReadiness, QUALIFICATION_WORKSTREAMS} from './glaze-v1.3-qualification.candidate.mjs';

export const STABLE_CLEANUP_WORKSTREAM = 'stable-activation-and-source-namespace-cleanup';
const SHA40 = /^[0-9a-f]{40}$/;
const TARGET_PRODUCT = 'GLAZE UI V1.3';
const TARGET_VERSION = '1.3.0-candidate';

function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function validSha(value) { return typeof value === 'string' && SHA40.test(value); }
function validDate(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }

function stableRecordProblems(record, candidateSourceRevision, stableSourceRevision, evaluatedAtMs) {
  const problems = [];
  if (!isObject(record)) return ['record is not an object'];
  if (record.schema_version !== 2) problems.push('schema_version must be 2');
  if (record.workstream_id !== STABLE_CLEANUP_WORKSTREAM) problems.push('workstream_id mismatch');
  const target = isObject(record.target) ? record.target : {};
  if (target.product !== TARGET_PRODUCT) problems.push('target.product mismatch');
  if (target.target_version !== TARGET_VERSION) problems.push('target.target_version mismatch');
  if (target.source_revision !== stableSourceRevision) problems.push('target.source_revision must match exact Stable-promotion source revision');
  if (record.status !== 'passed') problems.push('status is not passed');
  if (!isObject(record.disposition) || record.disposition.accepted_for_lifecycle_gate !== true) problems.push('record is not accepted for lifecycle gate');
  if (!isObject(record.review_authority) || record.review_authority.mode !== 'combined') problems.push('Stable cleanup requires combined review authority');
  if (!validDate(record.observed_at)) problems.push('observed_at is invalid');
  if (record.valid_until !== undefined && record.valid_until !== null) {
    if (!validDate(record.valid_until)) problems.push('valid_until is invalid');
    else if (Date.parse(record.valid_until) < evaluatedAtMs) problems.push('record is expired');
  }
  if (!Array.isArray(record.evidence_references) || record.evidence_references.length < 2) problems.push('passed Stable cleanup requires at least two evidence references');
  if (Array.isArray(record.issues) && record.issues.some(issue => isObject(issue) && issue.resolved === false)) problems.push('record contains unresolved issues');
  const env = isObject(record.environment) ? record.environment : {};
  if (env.qualified_candidate_source_revision !== candidateSourceRevision) problems.push('qualified Candidate source revision provenance mismatch');
  if (env.stable_promotion_source_revision !== stableSourceRevision) problems.push('Stable-promotion source revision provenance mismatch');
  if (env.candidate_lifecycle_observed !== 'active') problems.push('Stable cleanup must observe an active Candidate lifecycle');
  if (env.equivalence_review_completed !== true) problems.push('equivalence review is incomplete');
  if (env.import_closure_validated !== true) problems.push('import-closure validation is incomplete');
  if (env.rollback_verified !== true) problems.push('rollback verification is incomplete');
  return problems;
}

function chooseStableRecord(records, candidateSourceRevision, stableSourceRevision, evaluatedAtMs) {
  return records
    .filter(record => isObject(record) && record.workstream_id === STABLE_CLEANUP_WORKSTREAM)
    .map(record => ({record, problems: stableRecordProblems(record, candidateSourceRevision, stableSourceRevision, evaluatedAtMs)}))
    .filter(item => item.problems.length === 0)
    .sort((a, b) => Date.parse(b.record.observed_at) - Date.parse(a.record.observed_at))[0]?.record ?? null;
}

export function evaluateStableReadiness(records = [], options = {}) {
  const candidateSourceRevision = options.candidateSourceRevision;
  const stableSourceRevision = options.stableSourceRevision;
  const candidateActive = options.candidateActive === true;
  const evaluatedAt = options.evaluatedAt ?? new Date().toISOString();
  const evaluatedAtMs = Date.parse(evaluatedAt);
  const blockers = [];

  if (!validSha(candidateSourceRevision)) blockers.push('candidateSourceRevision must be an exact lowercase 40-character Git SHA');
  if (!validSha(stableSourceRevision)) blockers.push('stableSourceRevision must be an exact lowercase 40-character Git SHA');
  if (!validDate(evaluatedAt)) blockers.push('evaluatedAt must be a valid date-time');
  if (!Array.isArray(records)) blockers.push('records must be an array');
  if (!candidateActive) blockers.push('Candidate lifecycle is not active');

  const safeRecords = Array.isArray(records) ? records : [];
  let candidateResult = null;
  if (validSha(candidateSourceRevision) && validDate(evaluatedAt)) {
    candidateResult = evaluateQualificationReadiness(safeRecords, {sourceRevision: candidateSourceRevision, evaluatedAt});
    if (!candidateResult.qualificationGateSatisfied) blockers.push(...candidateResult.blockers.map(value => `Candidate qualification: ${value}`));
  }

  let stableRecord = null;
  if (validSha(candidateSourceRevision) && validSha(stableSourceRevision) && Number.isFinite(evaluatedAtMs)) {
    stableRecord = chooseStableRecord(safeRecords, candidateSourceRevision, stableSourceRevision, evaluatedAtMs);
    if (!stableRecord) {
      const related = safeRecords.filter(record => isObject(record) && record.workstream_id === STABLE_CLEANUP_WORKSTREAM);
      if (related.length === 0) blockers.push(`${STABLE_CLEANUP_WORKSTREAM}: missing qualification evidence`);
      else blockers.push(`${STABLE_CLEANUP_WORKSTREAM}: ${[...new Set(related.flatMap(record => stableRecordProblems(record, candidateSourceRevision, stableSourceRevision, evaluatedAtMs)))].join('; ') || 'no acceptable record'}`);
    }
  }

  const stableGateSatisfied = blockers.length === 0 && candidateResult?.qualificationGateSatisfied === true && Boolean(stableRecord);
  const candidateCount = candidateResult?.acceptedWorkstreamCount ?? 0;
  return Object.freeze({
    state: stableGateSatisfied ? 'ready-for-governed-stable-promotion-review' : 'blocked',
    stableGateSatisfied,
    candidateQualificationGateSatisfied: candidateResult?.qualificationGateSatisfied === true,
    candidateAcceptedWorkstreamCount: candidateCount,
    stableAcceptedWorkstreamCount: stableRecord ? 1 : 0,
    satisfiedQualificationRequirementCount: candidateCount + (stableRecord ? 1 : 0),
    requiredQualificationRequirementCount: QUALIFICATION_WORKSTREAMS.length + 1,
    candidateSourceRevision: validSha(candidateSourceRevision) ? candidateSourceRevision : null,
    stableSourceRevision: validSha(stableSourceRevision) ? stableSourceRevision : null,
    candidateActive,
    evaluatedAt: validDate(evaluatedAt) ? evaluatedAt : null,
    stableEvidence: stableRecord ? Object.freeze({observedAt: stableRecord.observed_at, reviewMode: stableRecord.review_authority.mode, evidenceReferences: Object.freeze([...stableRecord.evidence_references])}) : null,
    blockers: Object.freeze(blockers),
    lifecyclePromotionGranted: false,
    stablePromoted: false,
    consumerEligibilityGranted: false,
    consumerConformanceGranted: false
  });
}

export const stableReadinessCandidate = Object.freeze({
  product: 'GLAZE UI V1.3 — Adaptive Resonance',
  candidateVersion: TARGET_VERSION,
  stableVersion: '1.3.0',
  stage: 'post-candidate-pre-stable',
  requiresActiveCandidate: true,
  candidateQualificationWorkstreamCount: QUALIFICATION_WORKSTREAMS.length,
  stableStageWorkstream: STABLE_CLEANUP_WORKSTREAM,
  canPromoteStable: false,
  canGrantConsumerConformance: false
});
