/* Glaze V1.7.1 — Development successor aggregate.
 *
 * Historical 1.7.0-dev.47 source remains immutable provenance. This wrapper
 * establishes the new patch-development identity without promoting any retained
 * source or qualification evidence to Stable.
 */

export * from './glaze-v1.7-development-v1-3.dev.mjs';

import {glazeV17V13Development} from './glaze-v1.7-development-v1-3.dev.mjs';

export const glazeV171Development = Object.freeze({
  version: '1.7.1-dev.1',
  lifecycle: 'Development',
  stableBaseline: '1.7.0',
  consumerEligible: false,
  inheritedHistoricalAggregateVersion: glazeV17V13Development.version,
  inheritedHistoricalPlanVersion: glazeV17V13Development.planVersion,
  inheritedHistoricalSourceRevision: '4b9d085a5177b96cc31d4270b38d792a59872e37',
  retainedDevelopmentSourceOnly: true,
  retainedEvidenceAutomaticallyRebound: false,
  section48SourceAvailable: true,
  section48Accepted: false,
  releasePromotionAutomatic: false,
  deploymentAcceptanceAutomatic: false,
  productionAcceptanceAutomatic: false
});
