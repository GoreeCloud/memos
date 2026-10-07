import {resolveSystemShell} from './glaze-v1.3-system-shell.candidate.mjs';
import {resolvePaneComposition} from './glaze-v1.3-multi-pane.candidate.mjs';
import {resolvePersonalization} from './glaze-v1.3-personalization.candidate.mjs';

export const SIGNATURE_COMPONENT_IDS = Object.freeze([
  'GlzCapsule',
  'GlzMorphCard',
  'GlzSmartRail',
  'GlzAuroraSurface',
  'GlzUniversalSearch'
]);

export const REFERENCE_SCENE_IDS = Object.freeze([
  'home-dashboard',
  'data-heavy-administration',
  'settings',
  'file-browser',
  'search',
  'form',
  'detail-inspector',
  'media'
]);

const SIGNATURE_IDS = new Set(SIGNATURE_COMPONENT_IDS);
const SCENE_IDS = new Set(REFERENCE_SCENE_IDS);
const ENVIRONMENTS = new Set(['compact', 'medium', 'expanded', 'workspace', 'farView', 'wearable']);

const COMPONENT_PURPOSE = Object.freeze({
  GlzCapsule: 'compact-expandable-status-or-action-chrome',
  GlzMorphCard: 'durable-content-card-with-state-preserving-expansion',
  GlzSmartRail: 'primary-navigation-container',
  GlzAuroraSurface: 'nonsemantic-atmospheric-substrate',
  GlzUniversalSearch: 'scope-visible-universal-search-entry-and-results'
});

const SCENE_POLICY = Object.freeze({
  'home-dashboard': Object.freeze({primaryTask: 'primary-state-and-critical-exceptions', secondaryTaskValue: true, inspectorTaskValue: false, durableReading: true}),
  'data-heavy-administration': Object.freeze({primaryTask: 'durable-data-administration', secondaryTaskValue: true, inspectorTaskValue: true, durableReading: true}),
  settings: Object.freeze({primaryTask: 'scanable-settings-and-risk-separated-controls', secondaryTaskValue: true, inspectorTaskValue: false, durableReading: true}),
  'file-browser': Object.freeze({primaryTask: 'file-list-and-selection', secondaryTaskValue: false, inspectorTaskValue: true, durableReading: true}),
  search: Object.freeze({primaryTask: 'search-query-and-results', secondaryTaskValue: false, inspectorTaskValue: false, durableReading: true}),
  form: Object.freeze({primaryTask: 'form-completion-and-save-state', secondaryTaskValue: false, inspectorTaskValue: false, durableReading: true}),
  'detail-inspector': Object.freeze({primaryTask: 'primary-content-with-subordinate-inspector', secondaryTaskValue: false, inspectorTaskValue: true, durableReading: true}),
  media: Object.freeze({primaryTask: 'media-content-and-reachable-controls', secondaryTaskValue: false, inspectorTaskValue: false, durableReading: true})
});

function normalizeEnvironment(value) {
  if (value === 'far-view' || value === 'largeFarView') return 'farView';
  return ENVIRONMENTS.has(value) ? value : 'compact';
}

function componentPresentation(componentId, environment, shell, personalization) {
  const solid = Boolean(
    personalization.accessibility?.forcedColors ||
    personalization.accessibility?.reducedTransparency
  );

  switch (componentId) {
    case 'GlzCapsule':
      return Object.freeze({
        presentation: environment === 'wearable' ? 'glanceable-capsule' : environment === 'farView' ? 'focusable-capsule' : 'reachable-capsule',
        material: solid ? 'solid-neutral' : 'glaze',
        criticalContentExclusiveProhibited: true
      });
    case 'GlzMorphCard':
      return Object.freeze({
        presentation: environment === 'compact' || environment === 'wearable' ? 'stacked-durable-card' : 'durable-morph-card',
        material: 'solid-by-default',
        optionalMaterial: solid ? null : 'soft-glaze',
        durableReadingBackdropDependent: false
      });
    case 'GlzSmartRail':
      return Object.freeze({
        presentation: shell.navigation.presentation,
        material: solid ? 'solid-neutral' : 'glaze',
        currentStateDistinctFromFocus: true,
        primaryNavigationOrderMayBePersonalized: false
      });
    case 'GlzAuroraSurface':
      return Object.freeze({
        presentation: 'atmospheric-substrate',
        material: solid ? 'solid-neutral' : 'live-glaze',
        atmosphereEnabled: !solid && personalization.expressionProfile !== 'calm',
        semanticMeaningMayDependOnAtmosphere: false
      });
    case 'GlzUniversalSearch':
      return Object.freeze({
        presentation: shell.searchPresentation,
        material: solid ? 'solid-neutral' : 'deep-glaze',
        scopeVisible: shell.searchScopeVisible,
        generatedResultsDistinctFromSystemTruth: shell.generatedSearchResultsDistinctFromSystemTruth,
        destructiveActionRequiresConfirmation: shell.destructiveSearchActionRequiresConfirmation,
        nestedBackdropBlurAllowed: false
      });
    default:
      throw new RangeError(`Unknown Signature component: ${componentId}`);
  }
}

export function resolveSignatureComponent(componentId, options = {}) {
  if (!SIGNATURE_IDS.has(componentId)) throw new RangeError(`Unknown Signature component: ${componentId}`);
  const environment = normalizeEnvironment(options.environment);
  const shell = resolveSystemShell({...options, environment});
  const personalization = resolvePersonalization(options.personalization, {
    ...options,
    farView: environment === 'farView'
  });
  const presentation = componentPresentation(componentId, environment, shell, personalization);

  return Object.freeze({
    id: componentId,
    tier: 'signature',
    semanticPurpose: COMPONENT_PURPOSE[componentId],
    environment,
    presentation,
    shell,
    personalization,
    minimumInteractiveTargetPx: shell.minimumTargetPx,
    semanticIdentityPreserved: true,
    productIdentityPreserved: true,
    stateMayDependOnColorOnly: false,
    focusDistinctFromCurrentOrSelectedState: true,
    motionDefinesState: false,
    rawViewportWidthAuthority: false,
    deviceBrandBreakpointAuthority: false
  });
}

export function resolveReferenceScene(sceneId, options = {}) {
  if (!SCENE_IDS.has(sceneId)) throw new RangeError(`Unknown reference scene: ${sceneId}`);
  const environment = normalizeEnvironment(options.environment);
  const policy = SCENE_POLICY[sceneId];
  const pane = resolvePaneComposition({
    ...options,
    environment,
    secondaryTaskValue: policy.secondaryTaskValue,
    inspectorTaskValue: policy.inspectorTaskValue
  });
  const shell = resolveSystemShell({...options, environment});
  const personalization = resolvePersonalization(options.personalization, {
    ...options,
    farView: environment === 'farView'
  });

  return Object.freeze({
    id: sceneId,
    environment,
    primaryTask: policy.primaryTask,
    pane,
    shell,
    personalization,
    primaryTaskVisuallyDominant: true,
    durableReadingBackdropDependent: false,
    semanticOrderPreserved: true,
    responsiveTransformationRequired: true,
    additionalPaneRequiresTaskValue: true,
    currentTaskPreserved: true,
    selectionPreserved: true,
    typedInputPreserved: true,
    unsavedWorkPreserved: true,
    focusPreserved: true,
    minimumInteractiveTargetPx: shell.minimumTargetPx,
    horizontalPageOverflowAllowedToPreserveComposition: false,
    rawViewportWidthAuthority: false,
    deviceBrandBreakpointAuthority: false
  });
}

export function validateReferenceManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') return Object.freeze(['manifest must be an object']);

  const componentIds = Array.isArray(manifest.signatureComponents)
    ? manifest.signatureComponents.map(item => item?.id)
    : [];
  const sceneIds = Array.isArray(manifest.referenceScenes)
    ? manifest.referenceScenes.map(item => item?.id)
    : [];

  if (componentIds.length !== SIGNATURE_COMPONENT_IDS.length || new Set(componentIds).size !== componentIds.length) {
    errors.push('signature component list must contain five unique canonical ids');
  }
  if (SIGNATURE_COMPONENT_IDS.some(id => !componentIds.includes(id))) {
    errors.push('signature component list is missing canonical ids');
  }
  if (sceneIds.length !== REFERENCE_SCENE_IDS.length || new Set(sceneIds).size !== sceneIds.length) {
    errors.push('reference scene list must contain eight unique canonical ids');
  }
  if (REFERENCE_SCENE_IDS.some(id => !sceneIds.includes(id))) {
    errors.push('reference scene list is missing canonical ids');
  }

  const rules = manifest.rules || {};
  if (rules.referenceSuiteCreatesNewTokenAuthority !== false) errors.push('reference suite may not create token authority');
  if (rules.referenceSuiteCreatesNewMaterialAuthority !== false) errors.push('reference suite may not create material authority');
  if (rules.personalizationMayChangeSemanticMeaning !== false) errors.push('personalization may not change semantic meaning');
  if (rules.accessibilityMayRecomposePresentation !== true) errors.push('accessibility must be able to recompose presentation');
  if (rules.durableReadingBackdropDependent !== false) errors.push('durable reading may not depend on backdrop effects');
  if (rules.complete32ComponentCoverageClaimed !== false) errors.push('Phase 14 may not claim complete 32-component coverage');

  return Object.freeze(errors);
}

export const componentExperienceCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  catalogAuthority: 'contracts/components/v1/catalog.json',
  signatureComponents: SIGNATURE_COMPONENT_IDS,
  referenceScenes: REFERENCE_SCENE_IDS,
  referenceSuiteCreatesNewTokenAuthority: false,
  complete32ComponentCoverageEstablished: false,
  nativeComponentParityEstablished: false,
  humanOpticalAcceptanceEstablished: false
});
