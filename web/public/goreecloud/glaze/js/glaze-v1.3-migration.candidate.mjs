export const MIGRATION_EVIDENCE_CATEGORIES = Object.freeze([
  'renderedOrNative',
  'interaction',
  'accessibility',
  'responsiveFormFactor',
  'platformIntegration',
  'productWorkflows',
  'performance'
]);

const SUPPORTED_PLATFORM_KINDS = new Set([
  'web', 'desktop', 'mobile', 'tablet', 'tv', 'smartwatch', 'other-user-facing'
]);
const ACCEPTED_EVIDENCE_STATES = new Set(['passed', 'not-applicable']);
const SHA40 = /^[0-9a-f]{40}$/;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validSha(value) {
  return typeof value === 'string' && SHA40.test(value);
}

function validateEvidenceItem(name, item, consumerRevision, errors) {
  if (!isObject(item)) {
    errors.push(`evidence.${name} is required`);
    return;
  }
  if (!ACCEPTED_EVIDENCE_STATES.has(item.status)) {
    errors.push(`evidence.${name}.status must be passed or not-applicable`);
  }
  if (item.repositoryLocal !== true) {
    errors.push(`evidence.${name} must be repository-local`);
  }
  if (item.consumerRevision !== consumerRevision) {
    errors.push(`evidence.${name} must match the exact consumer revision`);
  }
  if (Array.isArray(item.platforms)) {
    for (const platform of item.platforms) {
      if (!SUPPORTED_PLATFORM_KINDS.has(platform)) {
        errors.push(`evidence.${name} contains unsupported platform kind ${platform}`);
      }
    }
  }
}

export function validateConsumerAdoptionRecord(record) {
  const errors = [];
  if (!isObject(record)) return Object.freeze(['adoption record must be an object']);

  if (record.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (typeof record.consumerName !== 'string' || !record.consumerName.trim()) errors.push('consumerName is required');
  if (typeof record.repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(record.repository)) errors.push('repository must use owner/name form');
  if (!validSha(record.consumerRevision)) errors.push('consumerRevision must be an exact 40-character lowercase commit SHA');
  if (typeof record.designSystemVersion !== 'string' || !record.designSystemVersion.trim()) errors.push('designSystemVersion is required');
  if (!validSha(record.designSystemRevision)) errors.push('designSystemRevision must be an exact 40-character lowercase commit SHA');

  if (!Array.isArray(record.supportedPlatforms) || record.supportedPlatforms.length === 0) {
    errors.push('supportedPlatforms must contain at least one platform');
  } else {
    const seen = new Set();
    for (const platform of record.supportedPlatforms) {
      if (!SUPPORTED_PLATFORM_KINDS.has(platform)) errors.push(`unsupported platform kind ${platform}`);
      if (seen.has(platform)) errors.push(`duplicate supported platform ${platform}`);
      seen.add(platform);
    }
  }

  for (const name of MIGRATION_EVIDENCE_CATEGORIES) {
    validateEvidenceItem(name, record.evidence?.[name], record.consumerRevision, errors);
  }

  if (!isObject(record.rollback)) {
    errors.push('rollback record is required');
  } else {
    if (!validSha(record.rollback.lastKnownGoodRevision)) errors.push('rollback.lastKnownGoodRevision must be an exact commit SHA');
    if (record.rollback.verified !== true) errors.push('rollback must be verified before production migration');
    if (record.rollback.independentlyReversible !== true) errors.push('rollback must be independently reversible');
  }

  if (!isObject(record.productionApproval)) {
    errors.push('productionApproval record is required');
  } else {
    if (typeof record.productionApproval.approved !== 'boolean') errors.push('productionApproval.approved must be boolean');
    if (typeof record.productionApproval.authority !== 'string' || !record.productionApproval.authority.trim()) errors.push('productionApproval.authority is required');
    if (record.productionApproval.consumerRevision !== record.consumerRevision) errors.push('productionApproval must reference the exact consumer revision');
  }

  return Object.freeze(errors);
}

function normalizeReleaseState(release = {}) {
  const value = isObject(release) ? release : {};
  return Object.freeze({
    version: typeof value.version === 'string' ? value.version : null,
    revision: validSha(value.revision) ? value.revision : null,
    lifecycle: typeof value.lifecycle === 'string' ? value.lifecycle : 'unknown',
    consumerEligible: value.consumerEligible === true
  });
}

export function evaluateConsumerMigration(record, releaseState = {}) {
  const release = normalizeReleaseState(releaseState);
  const recordErrors = [...validateConsumerAdoptionRecord(record)];
  const blockers = [...recordErrors];

  if (recordErrors.length === 0) {
    if (release.version !== record.designSystemVersion) blockers.push('design-system version does not match the evaluated release');
    if (release.revision !== record.designSystemRevision) blockers.push('design-system revision does not match the evaluated release');
  }

  const lifecycleEligibleForProduction = release.lifecycle === 'stable';
  const releaseEligibleForProduction = lifecycleEligibleForProduction && release.consumerEligible;

  if (!releaseEligibleForProduction) {
    return Object.freeze({
      state: 'evaluation-only',
      productionEligible: false,
      conformanceGranted: false,
      lifecycleEligibleForProduction,
      releaseConsumerEligible: release.consumerEligible,
      blockers: Object.freeze(blockers),
      reason: 'V1.3 evaluation may not become a production migration until the evaluated release is Stable and consumer-eligible.'
    });
  }

  if (blockers.length > 0) {
    return Object.freeze({
      state: 'blocked',
      productionEligible: false,
      conformanceGranted: false,
      lifecycleEligibleForProduction: true,
      releaseConsumerEligible: true,
      blockers: Object.freeze(blockers),
      reason: 'Exact-anchor or repository-local consumer evidence requirements are incomplete.'
    });
  }

  if (record.productionApproval.approved !== true) {
    return Object.freeze({
      state: 'ready-for-consumer-acceptance',
      productionEligible: false,
      conformanceGranted: false,
      lifecycleEligibleForProduction: true,
      releaseConsumerEligible: true,
      blockers: Object.freeze(['explicit consumer production approval is still required']),
      reason: 'Technical migration evidence is complete, but the consumer has not recorded production approval.'
    });
  }

  return Object.freeze({
    state: 'eligible-after-independent-acceptance',
    productionEligible: true,
    conformanceGranted: false,
    lifecycleEligibleForProduction: true,
    releaseConsumerEligible: true,
    blockers: Object.freeze([]),
    reason: 'The record satisfies the migration control plane; downstream conformance remains the consumer repository’s independent claim.'
  });
}

export const migrationCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  liveRequiredConsumerVersion: '1.2.0',
  canMutateConsumerRepository: false,
  canMutateLifecycle: false,
  canGrantConformance: false,
  canGrantProductionApproval: false,
  proposedEvaluationIsNonProductionOnly: true,
  productionRequiresStableConsumerEligibleRelease: true,
  evidenceCategories: MIGRATION_EVIDENCE_CATEGORIES
});
