export const QUALIFICATION_WORKSTREAMS = Object.freeze([
  'human-optical-and-icon-collision-qualification',
  'manual-assistive-technology-qualification',
  'physical-device-native-platform-qualification',
  'physical-device-production-performance-qualification',
  'native-personalization-adapter-qualification'
]);

export const STABLE_QUALIFICATION_WORKSTREAMS = Object.freeze([
  ...QUALIFICATION_WORKSTREAMS,
  'stable-activation-and-source-namespace-cleanup'
]);

export const QUALITY_RULE_IDS = Object.freeze(
  Array.from({length: 55}, (_, index) => `quality-${String(index + 1).padStart(2, '0')}`)
);

const SHA40 = /^[0-9a-f]{40}$/;
const TARGET_PRODUCT = 'GLAZE UI V1.3';
const TARGET_VERSION = '1.3.0-candidate';
const EVIDENCE_SCHEMA_VERSION = 2;
const HUMAN_OPTICAL = 'human-optical-and-icon-collision-qualification';
const QUALITY_CONTRACT = 'contracts/v1.3/quality-rules.candidate.json';

const REVIEW_MODES = Object.freeze({
  [HUMAN_OPTICAL]: new Set(['human', 'combined']),
  'manual-assistive-technology-qualification': new Set(['human', 'combined']),
  'physical-device-native-platform-qualification': new Set(['combined']),
  'physical-device-production-performance-qualification': new Set(['combined']),
  'native-personalization-adapter-qualification': new Set(['human', 'combined'])
});

function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function validSha(value) { return typeof value === 'string' && SHA40.test(value); }
function validDate(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }

function hasExactQualityRuleCoverage(value) {
  if (!Array.isArray(value) || value.length !== QUALITY_RULE_IDS.length) return false;
  const actual = new Set(value);
  return actual.size === QUALITY_RULE_IDS.length && QUALITY_RULE_IDS.every(id => actual.has(id));
}

function qualityReviewProblems(record) {
  if (!isObject(record.quality_review)) return ['quality_review is required for passed human optical evidence'];
  const review = record.quality_review;
  const problems = [];
  if (review.contract !== QUALITY_CONTRACT) problems.push('quality_review contract mismatch');
  if (!hasExactQualityRuleCoverage(review.reviewed_rule_ids)) problems.push('quality_review must cover all 55 governed quality rules exactly once');
  if (review.visual_finish_accepted !== true) problems.push('visual finish gate is not accepted');
  if (review.blandness_rejected !== true) problems.push('blandness rejection gate is not accepted');
  if (review.accessibility_beauty_reviewed !== true) problems.push('accessibility-as-beauty review is incomplete');
  if (review.responsive_beauty_reviewed !== true) problems.push('responsive-beauty review is incomplete');
  if (review.critical_final_quality_questions_accepted !== true) problems.push('final quality test is not accepted');
  return problems;
}

function recordProblems(record, workstreamId, sourceRevision, evaluatedAtMs) {
  const problems = [];
  if (!isObject(record)) return ['record is not an object'];
  if (record.schema_version !== EVIDENCE_SCHEMA_VERSION) problems.push(`schema_version must be ${EVIDENCE_SCHEMA_VERSION}`);
  if (record.workstream_id !== workstreamId) problems.push('workstream_id mismatch');
  const target = isObject(record.target) ? record.target : {};
  if (target.product !== TARGET_PRODUCT) problems.push('target.product mismatch');
  if (target.target_version !== TARGET_VERSION) problems.push('target.target_version mismatch');
  if (target.source_revision !== sourceRevision) problems.push('target.source_revision mismatch');
  if (record.status !== 'passed') problems.push('status is not passed');
  if (!isObject(record.disposition) || record.disposition.accepted_for_lifecycle_gate !== true) problems.push('record is not accepted for lifecycle gate');
  if (!isObject(record.review_authority)) problems.push('review authority is missing');
  else if (!REVIEW_MODES[workstreamId]?.has(record.review_authority.mode)) problems.push(`review mode ${record.review_authority.mode ?? 'missing'} is not accepted for ${workstreamId}`);
  if (!validDate(record.observed_at)) problems.push('observed_at is invalid');
  if (record.valid_until !== undefined && record.valid_until !== null) {
    if (!validDate(record.valid_until)) problems.push('valid_until is invalid');
    else if (Date.parse(record.valid_until) < evaluatedAtMs) problems.push('record is expired');
  }
  if (!Array.isArray(record.evidence_references) || record.evidence_references.length < 2) problems.push('passed record requires at least two evidence references');
  if (Array.isArray(record.issues) && record.issues.some(issue => isObject(issue) && issue.resolved === false)) problems.push('record contains unresolved issues');
  if (workstreamId === HUMAN_OPTICAL && record.status === 'passed') problems.push(...qualityReviewProblems(record));
  return problems;
}

function chooseAcceptedRecord(records, workstreamId, sourceRevision, evaluatedAtMs) {
  return records
    .filter(record => isObject(record) && record.workstream_id === workstreamId)
    .map(record => ({record, problems: recordProblems(record, workstreamId, sourceRevision, evaluatedAtMs)}))
    .filter(item => item.problems.length === 0)
    .sort((a, b) => Date.parse(b.record.observed_at) - Date.parse(a.record.observed_at))[0]?.record ?? null;
}

export function evaluateQualificationReadiness(records = [], options = {}) {
  const sourceRevision = options.sourceRevision;
  const evaluatedAt = options.evaluatedAt ?? new Date().toISOString();
  const evaluatedAtMs = Date.parse(evaluatedAt);
  const blockers = [];
  const accepted = {};
  if (!validSha(sourceRevision)) blockers.push('sourceRevision must be an exact lowercase 40-character Git SHA');
  if (!validDate(evaluatedAt)) blockers.push('evaluatedAt must be a valid date-time');
  if (!Array.isArray(records)) blockers.push('records must be an array');
  const safeRecords = Array.isArray(records) ? records : [];

  if (validSha(sourceRevision) && Number.isFinite(evaluatedAtMs)) {
    for (const workstreamId of QUALIFICATION_WORKSTREAMS) {
      const record = chooseAcceptedRecord(safeRecords, workstreamId, sourceRevision, evaluatedAtMs);
      if (record) {
        accepted[workstreamId] = Object.freeze({
          observedAt: record.observed_at,
          reviewMode: record.review_authority.mode,
          evidenceReferences: Object.freeze([...record.evidence_references]),
          qualityRuleCount: workstreamId === HUMAN_OPTICAL ? QUALITY_RULE_IDS.length : null
        });
      } else {
        const related = safeRecords.filter(record => isObject(record) && record.workstream_id === workstreamId);
        if (related.length === 0) blockers.push(`${workstreamId}: missing qualification evidence`);
        else blockers.push(`${workstreamId}: ${[...new Set(related.flatMap(record => recordProblems(record, workstreamId, sourceRevision, evaluatedAtMs)))].join('; ') || 'no acceptable record'}`);
      }
    }
  }

  const qualificationGateSatisfied = blockers.length === 0 && Object.keys(accepted).length === QUALIFICATION_WORKSTREAMS.length;
  return Object.freeze({
    state: qualificationGateSatisfied ? 'ready-for-governed-candidate-promotion-review' : 'blocked',
    qualificationGateSatisfied,
    acceptedWorkstreamCount: Object.keys(accepted).length,
    requiredWorkstreamCount: QUALIFICATION_WORKSTREAMS.length,
    deferredStableWorkstreamCount: STABLE_QUALIFICATION_WORKSTREAMS.length - QUALIFICATION_WORKSTREAMS.length,
    stableQualificationComplete: false,
    sourceRevision: validSha(sourceRevision) ? sourceRevision : null,
    evaluatedAt: validDate(evaluatedAt) ? evaluatedAt : null,
    accepted: Object.freeze(accepted),
    blockers: Object.freeze(blockers),
    lifecyclePromotionGranted: false,
    candidateActivated: false,
    stablePromoted: false,
    consumerEligibilityGranted: false,
    consumerConformanceGranted: false
  });
}

export const qualificationCandidate = Object.freeze({
  product: 'GLAZE UI V1.3 — Adaptive Resonance',
  targetProduct: TARGET_PRODUCT,
  targetVersion: TARGET_VERSION,
  releaseLifecycle: 'proposed',
  qualificationLifecycle: 'qualification-active',
  evidenceSchemaVersion: EVIDENCE_SCHEMA_VERSION,
  qualityContract: QUALITY_CONTRACT,
  qualityRuleCount: QUALITY_RULE_IDS.length,
  consumerEligible: false,
  canActivateCandidate: false,
  canPromoteStable: false,
  canChangeLifecycleRegistry: false,
  canChangeVersionFile: false,
  canGrantConsumerEligibility: false,
  canGrantConsumerConformance: false,
  canTreatAutomatedCIAsHumanEvidence: false,
  canTreatAutomatedCIAsPhysicalDeviceEvidence: false,
  requiredWorkstreams: QUALIFICATION_WORKSTREAMS,
  deferredStableWorkstreams: Object.freeze(['stable-activation-and-source-namespace-cleanup'])
});
