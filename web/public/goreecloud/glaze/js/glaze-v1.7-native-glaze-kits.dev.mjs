/* GLAZE UI V1.7 — Native Glaze Kits Development foundation.
 *
 * Development-only semantic mapping resolver for v1.1 Section 24.
 * GLAZE UI V1.6 / 1.6.0 remains the current Official Stable consumer target.
 */

import {resolveGlazeTaskContinuity} from './glaze-v1.7-task-continuity.dev.mjs';
import {
  resolveGlazeFormFactorProfile,
  glazeV17FormFactorProfilesDevelopmentContract
} from './glaze-v1.7-form-factor-profiles.dev.mjs';
import {
  resolveGlazeSemanticColor,
  resolveGlazeThemeLayer,
  glazeV17ThemeSemanticColorDevelopmentContract
} from './glaze-v1.7-theme-semantic-color.dev.mjs';

const PLATFORMS = Object.freeze([
  'android-compose',
  'apple-swiftui',
  'web',
  'linux-native'
]);

const SEMANTIC_ROLES = Object.freeze([
  'surface',
  'action',
  'navigation',
  'focus',
  'input',
  'state',
  'progress',
  'recovery',
  'privacy',
  'security'
]);

const AVAILABILITY_STATES = Object.freeze(['available', 'unavailable', 'unknown']);

const PLATFORM_MAPPINGS = Object.freeze({
  'android-compose': Object.freeze({
    framework: 'Jetpack Compose',
    controlPolicy: 'platform-native-first-when-semantics-preserved',
    accessibilityBridge: 'compose-semantics-and-android-accessibility-services',
    inputBridge: 'android-input-and-compose-input-semantics',
    renderingBridge: 'compose-rendering-and-platform-window-surfaces',
    appearanceBridge: 'android-system-appearance-and-accessibility-state',
    colorBridge: 'android-platform-color-and-gamut-capabilities',
    performanceBridge: 'android-runtime-performance-and-power-signals',
    supportedProfiles: Object.freeze(['mobile','tablet','foldable','tv','wearable'])
  }),
  'apple-swiftui': Object.freeze({
    framework: 'SwiftUI',
    controlPolicy: 'platform-native-first-when-semantics-preserved',
    accessibilityBridge: 'swiftui-accessibility-and-platform-services',
    inputBridge: 'swiftui-and-apple-platform-input-semantics',
    renderingBridge: 'swiftui-rendering-and-platform-window-surfaces',
    appearanceBridge: 'apple-system-appearance-and-accessibility-state',
    colorBridge: 'apple-platform-color-and-gamut-capabilities',
    performanceBridge: 'apple-runtime-performance-and-power-signals',
    supportedProfiles: Object.freeze(['mobile','tablet','desktop','tv','wearable'])
  }),
  web: Object.freeze({
    framework: 'Web Platform',
    controlPolicy: 'semantic-web-platform-first',
    accessibilityBridge: 'semantic-html-accessibility-tree-and-user-preferences',
    inputBridge: 'web-input-and-event-semantics',
    renderingBridge: 'css-layout-paint-and-compositing',
    appearanceBridge: 'web-system-appearance-and-accessibility-media-features',
    colorBridge: 'css-color-and-display-capabilities',
    performanceBridge: 'web-runtime-performance-and-energy-sensitive-degradation',
    supportedProfiles: Object.freeze(['mobile','tablet','desktop','foldable','tv'])
  }),
  'linux-native': Object.freeze({
    framework: 'Supported Linux native UI toolkit',
    controlPolicy: 'platform-native-first-when-semantics-preserved',
    accessibilityBridge: 'native-toolkit-accessibility-and-platform-services',
    inputBridge: 'native-toolkit-and-linux-input-semantics',
    renderingBridge: 'native-toolkit-rendering-and-window-system',
    appearanceBridge: 'desktop-environment-appearance-and-accessibility-state',
    colorBridge: 'native-toolkit-color-and-display-capabilities',
    performanceBridge: 'native-runtime-performance-and-power-signals',
    supportedProfiles: Object.freeze(['desktop'])
  })
});

function plainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function exactMember(value, allowed, label) {
  const normalized = String(value ?? '').trim();
  if (!allowed.includes(normalized)) throw new RangeError(`Unsupported ${label}: ${normalized}`);
  return normalized;
}

function boundedText(value, max = 200) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized.slice(0, max) : null;
}

function defaultProfile(platform) {
  if (platform === 'linux-native' || platform === 'web') return 'desktop';
  return 'mobile';
}

export function resolveGlazeNativeCapability(input = {}) {
  if (!plainObject(input)) throw new TypeError('Native capability input must be a plain object');
  const requestedState = exactMember(
    input.state ?? 'unknown',
    AVAILABILITY_STATES,
    input.label ?? 'native capability availability'
  );
  const authoritative = input.authoritative === true;
  const acceptedState = authoritative || requestedState === 'unknown' ? requestedState : 'unknown';

  return Object.freeze({
    requestedState,
    acceptedState,
    authoritative,
    presentAsAvailable: acceptedState === 'available',
    withheldWithoutAuthority: !authoritative && requestedState !== 'unknown',
    authority: Object.freeze({
      capabilityOwnedByCallerOrPlatform: true,
      availabilityOwnedByCallerOrPlatform: true,
      capabilityCreatedByGlaze: false,
      availabilityTruthCreatedByGlaze: false
    })
  });
}

export function resolveGlazeNativeKit(input = {}) {
  if (!plainObject(input)) throw new TypeError('Native Glaze Kit input must be a plain object');

  const platform = exactMember(input.platform, PLATFORMS, 'Native Glaze platform');
  const semanticRole = exactMember(input.semanticRole, SEMANTIC_ROLES, 'Glaze semantic role');
  const mapping = PLATFORM_MAPPINGS[platform];
  const profile = exactMember(
    input.profile ?? defaultProfile(platform),
    mapping.supportedProfiles,
    `${platform} form-factor profile`
  );

  const nativeCapability = resolveGlazeNativeCapability({
    state: input.capabilityState,
    authoritative: input.capabilityAuthoritative,
    label: 'platform capability availability'
  });
  const systemAppearanceCapability = resolveGlazeNativeCapability({
    state: input.systemAppearanceApiState,
    authoritative: input.systemAppearanceApiAuthoritative,
    label: 'system appearance API availability'
  });
  const platformColorCapability = resolveGlazeNativeCapability({
    state: input.platformColorApiState,
    authoritative: input.platformColorApiAuthoritative,
    label: 'platform color API availability'
  });

  const nativeControlAuthoritative = input.nativeControlMappingAuthoritative === true;
  const requestedNativeControl = boundedText(input.nativeControl, 160);
  const acceptedNativeControl = nativeControlAuthoritative ? requestedNativeControl : null;

  const semanticColor = resolveGlazeSemanticColor({
    role: input.semanticColorRole,
    prominence: input.semanticProminence,
    authoritative: input.semanticColorAuthoritative
  });

  const themeLayer = resolveGlazeThemeLayer({
    accessibilityToken: input.accessibilityThemeToken,
    accessibilityAuthoritative: input.accessibilityThemeAuthoritative,
    protectedSemanticToken: input.protectedSemanticThemeToken,
    protectedSemanticAuthoritative: input.protectedSemanticThemeAuthoritative,
    productIdentityToken: input.productIdentityThemeToken,
    productIdentityAuthoritative: input.productIdentityThemeAuthoritative,
    userThemeToken: input.userThemeToken,
    userThemeAuthoritative: input.userThemeAuthoritative,
    contextualAccentToken: input.contextualAccentToken,
    contextualAccentAuthoritative: input.contextualAccentAuthoritative,
    glazeDefaultToken: input.glazeDefaultThemeToken
  });

  const profileResolution = resolveGlazeFormFactorProfile({
    profile,
    posture: input.posture,
    accessibilityProfiles: input.accessibilityProfiles,
    availableInputs: input.availableInputs,
    inputCapabilityAuthoritative: input.inputCapabilityAuthoritative,
    unsafeRegionIds: input.unsafeRegionIds,
    semanticSurfaceId: boundedText(input.semanticSurfaceId, 120) ?? 'native-glaze-surface',
    surfaceRole: semanticRole === 'navigation' ? 'navigation' : semanticRole === 'surface' ? 'task' : 'detail',
    constrained: input.constrained === true
  });

  const continuity = resolveGlazeTaskContinuity({
    environmentChange: 'form-factor',
    previous: input.previousTaskState,
    incoming: input.incomingTaskState,
    stateClasses: input.stateClasses,
    clearFields: input.clearFields,
    clearAuthoritative: input.clearAuthoritative,
    temporaryDisposableFields: input.temporaryDisposableFields,
    lossDirectedFields: input.lossDirectedFields,
    providerAuthoritativeFields: input.providerAuthoritativeFields,
    recoveryStateFields: input.recoveryStateFields
  });

  return Object.freeze({
    version: '1.7.0-dev.9',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    planVersion: 'v1.1',
    v11SpecificationSections: Object.freeze([24]),
    platform,
    framework: mapping.framework,
    semanticRole,
    bridges: Object.freeze({
      accessibility: mapping.accessibilityBridge,
      input: mapping.inputBridge,
      rendering: mapping.renderingBridge,
      systemAppearance: mapping.appearanceBridge,
      color: mapping.colorBridge,
      performance: mapping.performanceBridge
    }),
    mapping: Object.freeze({
      controlPolicy: mapping.controlPolicy,
      profile,
      nativeControl: acceptedNativeControl,
      nativeControlMappingAuthoritative: nativeControlAuthoritative,
      nativeControlWithheldWithoutAuthority:
        requestedNativeControl !== null && !nativeControlAuthoritative,
      platformNativeBehaviorPreferredWhenSemanticsPreserved: true,
      semanticConsistencyRequired: true,
      pixelIdenticalPresentationRequired: false
    }),
    capabilities: Object.freeze({
      platform: nativeCapability,
      systemAppearance: systemAppearanceCapability,
      platformColor: platformColorCapability
    }),
    theme: Object.freeze({
      layer: themeLayer,
      semanticColor,
      semanticThemesPreserved: true,
      semanticColorRolesPreserved: true,
      protectedSemanticOverrideAllowed: false,
      providerSemanticTruthRequired: true
    }),
    profile: profileResolution,
    taskState: continuity.state,
    stateClasses: continuity.stateClasses,
    decisions: continuity.decisions,
    continuity: Object.freeze({
      ...continuity.continuity,
      semanticVocabularyPreserved: true,
      taskContinuityRequired: true,
      adaptiveInputContinuityRequired: true,
      formFactorContinuityRequired: true,
      accessibilityPrecedence: true,
      nativeMappingMayResetTask: false
    }),
    acceptanceBoundary: Object.freeze({
      sourceMappingOnly: true,
      nativeReferenceImplementationAcceptanceRequired: true,
      nativeDeviceAcceptanceRequired: true,
      renderedAcceptanceRequired: true,
      assistiveTechnologyAcceptanceRequired: true,
      performanceAcceptanceRequired: true,
      downstreamConsumerAcceptanceAutomatic: false,
      deploymentAcceptanceAutomatic: false,
      productionAcceptanceAutomatic: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      platformCapabilityOwnedByCallerOrPlatform: true,
      nativeControlMappingOwnedByCallerOrPlatform: true,
      systemAppearanceOwnedByPlatform: true,
      platformColorCapabilityOwnedByPlatform: true,
      privacyTruthOwnedByProvider: true,
      securityTruthOwnedByProvider: true,
      permissionOwnedByPlatformOrProvider: true,
      consentOwnedByProvider: true,
      availabilityOwnedByCallerOrPlatform: true,
      executionOwnedByApplicationOrProvider: true,
      platformCapabilityCreatedByGlaze: false,
      nativeControlAvailabilityCreatedByGlaze: false,
      systemAppearanceTruthCreatedByGlaze: false,
      platformColorCapabilityCreatedByGlaze: false,
      privacyTruthCreatedByGlaze: false,
      securityTruthCreatedByGlaze: false,
      permissionGrantedByGlaze: false,
      consentGrantedByGlaze: false,
      availabilityTruthCreatedByGlaze: false,
      actionExecutionPerformedByGlaze: false,
      nativeCertificationImplied: false,
      downstreamAdoptionAutomatic: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export const glazeV17NativeGlazeKitsDevelopmentContract = Object.freeze({
  version: '1.7.0-dev.9',
  lifecycle: 'development',
  stableBaseline: '1.6.0',
  consumerEligible: false,
  planVersion: 'v1.1',
  v11SpecificationSections: Object.freeze([24]),
  v11Section24Complete: false,
  platforms: PLATFORMS,
  semanticVocabulary: SEMANTIC_ROLES,
  availabilityStates: AVAILABILITY_STATES,
  platformMappings: PLATFORM_MAPPINGS,
  formFactorProfiles: glazeV17FormFactorProfilesDevelopmentContract.profiles,
  themeSemanticColorVersion: glazeV17ThemeSemanticColorDevelopmentContract.version,
  semanticThemesPreserved: true,
  semanticColorRolesPreserved: true,
  taskContinuityRequired: true,
  adaptiveInputContinuityRequired: true,
  formFactorContinuityRequired: true,
  accessibilityPrecedence: true,
  platformNativeBehaviorPreferredWhenSemanticsPreserved: true,
  semanticConsistencyRequired: true,
  pixelIdenticalPresentationRequired: false,
  presentationOnly: true,
  sourceMappingOnly: true,
  nativeReferenceImplementationsComplete: false,
  nativeDeviceAcceptanceImplied: false,
  downstreamConsumerAcceptanceAutomatic: false,
  releasePromotionAutomatic: false,
  deploymentAcceptanceAutomatic: false,
  productionAcceptanceAutomatic: false,
  permissionGrantedByGlaze: false,
  consentGrantedByGlaze: false,
  privacyTruthCreatedByGlaze: false,
  securityTruthCreatedByGlaze: false,
  systemAppearanceTruthCreatedByGlaze: false,
  platformColorCapabilityCreatedByGlaze: false,
  actionExecutionPerformedByGlaze: false,
  consequentialExecutionAutomatic: false
});
