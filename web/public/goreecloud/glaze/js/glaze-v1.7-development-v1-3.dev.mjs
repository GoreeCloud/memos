/* Glaze V1.7 — v1.3 Development aggregate.
 *
 * This aggregate extends the frozen v1.2 / dev.39 compatibility aggregate
 * without rewriting historical provenance or acceptance evidence.
 */
export * from './glaze-v1.7-development.mjs';
export * from './glaze-v1.7-expression-system.dev.mjs';
export * from './glaze-v1.7-provider-adaptive-surfaces.dev.mjs';
export * from './glaze-v1.7-adaptive-experience-surfaces.dev.mjs';
export * from './glaze-v1.7-trust-care-surfaces.dev.mjs';
export * from './glaze-v1.7-creative-compare-surfaces.dev.mjs';
export * from './glaze-v1.7-section48-qualification.dev.mjs';
export * from './glaze-v1.7-v1-3-qualification.dev.mjs';
export * from './glaze-v1.7-v1-3-qualification-coverage.dev.mjs';

import {glazeV17Development as v12Aggregate} from './glaze-v1.7-development.mjs';
import {glazeV17ExpressionSystemDevelopmentContract} from './glaze-v1.7-expression-system.dev.mjs';
import {glazeV17ProviderAdaptiveSurfacesDevelopmentContract} from './glaze-v1.7-provider-adaptive-surfaces.dev.mjs';
import {glazeV17AdaptiveExperienceSurfacesDevelopmentContract} from './glaze-v1.7-adaptive-experience-surfaces.dev.mjs';
import {glazeV17TrustCareSurfacesDevelopmentContract} from './glaze-v1.7-trust-care-surfaces.dev.mjs';
import {glazeV17CreativeCompareSurfacesDevelopmentContract} from './glaze-v1.7-creative-compare-surfaces.dev.mjs';
import {glazeV17Section48QualificationDevelopmentContract} from './glaze-v1.7-section48-qualification.dev.mjs';
import {glazeV17V13QualificationDevelopmentContract} from './glaze-v1.7-v1-3-qualification.dev.mjs';
import {glazeV17V13QualificationCoverageDevelopmentContract} from './glaze-v1.7-v1-3-qualification-coverage.dev.mjs';

export const glazeV17V13Development=Object.freeze({
  version:'1.7.0-dev.47',
  lifecycle:'Development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.3',
  priorAggregateVersion:v12Aggregate.version,
  priorAggregatePlanVersion:v12Aggregate.planVersion,
  v13SpecificationSections:Object.freeze([48]),
  expressionSystemCoreVersion:glazeV17ExpressionSystemDevelopmentContract.version,
  providerAdaptiveSurfacesVersion:glazeV17ProviderAdaptiveSurfacesDevelopmentContract.version,
  adaptiveExperienceSurfacesVersion:glazeV17AdaptiveExperienceSurfacesDevelopmentContract.version,
  trustCareSurfacesVersion:glazeV17TrustCareSurfacesDevelopmentContract.version,
  creativeCompareSurfacesVersion:glazeV17CreativeCompareSurfacesDevelopmentContract.version,
  section48QualificationControlVersion:glazeV17Section48QualificationDevelopmentContract.version,
  combinedQualificationControlVersion:glazeV17V13QualificationDevelopmentContract.version,
  qualificationCoverageControlVersion:glazeV17V13QualificationCoverageDevelopmentContract.version,
  implementedRequirementGroups:Object.freeze([
    'expression-system-core',
    'provider-adaptive-surfaces',
    'adaptive-experience-surfaces',
    'trust-care-surfaces',
    'creative-compare-surfaces',
    'section48-qualification-control',
    'v1.3-combined-qualification-control',
    'v1.3-qualification-coverage-control'
  ]),
  implementedAdaptiveSurfaces:Object.freeze([
    'glaze-contextual-actions',
    'glaze-brief',
    'glaze-control-center',
    'glaze-workspace',
    'glaze-compact-surface',
    'glaze-agent-activity',
    'glaze-privacy-attention',
    'glaze-accessibility-presentation',
    'glaze-creative-surface',
    'glaze-compare',
    'glaze-care-surface'
  ]),
  remainingAdaptiveSurfaces:Object.freeze([]),
  section48SourceComplete:true,
  section48Complete:false,
  acceptanceControlVersion:'1.7.0-dev.39',
  section48AcceptanceControlVersion:'1.7.0-dev.45',
  acceptanceControlAutomaticallyCoversV13:false,
  presentationOnly:true,
  providerTruthCreatedByGlaze:false,
  personalizationMayChangeExpression:true,
  personalizationMayChangeTruth:false,
  consumerAdoptionAutomatic:false,
  releasePromotionAutomatic:false,
  deploymentAcceptanceAutomatic:false,
  productionAcceptanceAutomatic:false
});
