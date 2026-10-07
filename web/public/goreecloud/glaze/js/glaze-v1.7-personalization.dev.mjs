/* GLAZE UI V1.7 — Personalization 2.0 Development foundation.
 *
 * Development-only personalization resolver. GLAZE UI V1.6 / 1.6.0
 * remains the current Official Stable consumer target.
 */

const APPEARANCE_MODES = Object.freeze(['light','dark','deep-dark']);
const ACCENT_FAMILIES = Object.freeze([
  'glaze-default',
  'user-accent',
  'wallpaper-derived',
  'application-identity'
]);
const MATERIAL_INTENSITY = Object.freeze(['subdued','standard','expressive']);
const DENSITY_LEVELS = Object.freeze(['compact','standard','comfortable']);
const GEOMETRY_PREFERENCES = Object.freeze(['compact','balanced','rounded']);
const MOTION_INTENSITY = Object.freeze(['minimal','standard','expressive']);
const ACTIONS = Object.freeze(['preview','apply','reset','undo']);
const SCOPES = Object.freeze(['session-preview','local-device','application-default']);
const PROTECTED_SEMANTIC_ROLES = Object.freeze([
  'security',
  'privacy',
  'warning',
  'critical',
  'destructive',
  'restricted',
  'protected',
  'success'
]);
const PRESENTATION_OVERRIDE_ROLES = Object.freeze([
  'accent',
  'surface',
  'selected',
  'focus'
]);
const AUTHORITY_PRECEDENCE = Object.freeze([
  'accessibility',
  'semantic',
  'application-identity',
  'user-accent',
  'wallpaper-derived',
  'glaze-default'
]);
const MAX_WALLPAPER_INFLUENCE = 0.08;

const DEFAULT_PREFERENCES = Object.freeze({
  appearance: 'light',
  accentFamily: 'glaze-default',
  materialIntensity: 'standard',
  density: 'standard',
  geometry: 'balanced',
  motionIntensity: 'standard',
  scope: 'local-device'
});

function plainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function semanticId(value, fallback = null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized || fallback;
}

function validateMember(value, allowed, label, fallback = null) {
  const normalized = semanticId(value, fallback);
  if (!allowed.includes(normalized)) throw new RangeError(`Unsupported ${label}: ${normalized}`);
  return normalized;
}

function uniqueStrings(values, max = 100) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze([...new Set(
    values.map(value => semanticId(value)).filter(Boolean)
  )].slice(0, max));
}

function boundedNumber(value, fallback = 0, min = 0, max = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function optionalToken(value, maxLength = 160) {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (!token || token.length > maxLength) return null;
  return token;
}

function accessibilitySet(values) {
  return new Set(uniqueStrings(values));
}

function normalizeOverrides(value) {
  if (!plainObject(value)) return Object.freeze({
    accepted: Object.freeze({}),
    rejectedProtected: Object.freeze([]),
    rejectedUnsupported: Object.freeze([])
  });

  const accepted = {};
  const rejectedProtected = [];
  const rejectedUnsupported = [];

  for (const [rawRole, rawValue] of Object.entries(value)) {
    const role = semanticId(rawRole);
    const token = optionalToken(rawValue);
    if (!role || !token) continue;
    if (PROTECTED_SEMANTIC_ROLES.includes(role)) {
      rejectedProtected.push(role);
      continue;
    }
    if (!PRESENTATION_OVERRIDE_ROLES.includes(role)) {
      rejectedUnsupported.push(role);
      continue;
    }
    accepted[role] = token;
  }

  return Object.freeze({
    accepted: Object.freeze(accepted),
    rejectedProtected: Object.freeze([...new Set(rejectedProtected)]),
    rejectedUnsupported: Object.freeze([...new Set(rejectedUnsupported)])
  });
}

function resolveAccent(input, accessibility) {
  const requestedFamily = validateMember(
    input.accentFamily,
    ACCENT_FAMILIES,
    'accent family',
    DEFAULT_PREFERENCES.accentFamily
  );

  const userAccentToken = optionalToken(input.userAccentToken);
  const wallpaperPaletteSummary = optionalToken(input.wallpaperPaletteSummary);
  const applicationIdentityToken = optionalToken(input.applicationIdentityToken);

  const userAccentAuthoritative = input.userAccentAuthoritative === true;
  const wallpaperSummaryAuthoritative = input.wallpaperSummaryAuthoritative === true;
  const applicationIdentityAuthoritative = input.applicationIdentityAuthoritative === true;

  let acceptedFamily = requestedFamily;
  let acceptedToken = null;
  let authority = 'glaze-default';
  let requestedSourceWithheldWithoutAuthority = false;

  if (requestedFamily === 'user-accent') {
    if (userAccentAuthoritative && userAccentToken) {
      acceptedToken = userAccentToken;
      authority = 'user-accent';
    } else {
      acceptedFamily = 'glaze-default';
      requestedSourceWithheldWithoutAuthority = true;
    }
  } else if (requestedFamily === 'wallpaper-derived') {
    if (wallpaperSummaryAuthoritative && wallpaperPaletteSummary) {
      acceptedToken = wallpaperPaletteSummary;
      authority = 'wallpaper-derived';
    } else {
      acceptedFamily = 'glaze-default';
      requestedSourceWithheldWithoutAuthority = true;
    }
  } else if (requestedFamily === 'application-identity') {
    if (applicationIdentityAuthoritative && applicationIdentityToken) {
      acceptedToken = applicationIdentityToken;
      authority = 'application-identity';
    } else {
      acceptedFamily = 'glaze-default';
      requestedSourceWithheldWithoutAuthority = true;
    }
  }

  const forcedColors = accessibility.has('forced-colors');
  const increasedContrast = accessibility.has('increased-contrast');
  const pigmentAuthority = forcedColors || increasedContrast ? 'accessibility' : authority;

  const requestedInfluence = boundedNumber(
    input.wallpaperInfluence,
    0,
    0,
    MAX_WALLPAPER_INFLUENCE
  );
  const wallpaperInfluence = acceptedFamily === 'wallpaper-derived'
    && wallpaperSummaryAuthoritative
    ? requestedInfluence
    : 0;

  return Object.freeze({
    requestedFamily,
    acceptedFamily,
    acceptedToken,
    sourceAuthority: authority,
    pigmentAuthority,
    userAccentAuthoritative,
    wallpaperSummaryAuthoritative,
    applicationIdentityAuthoritative,
    requestedSourceWithheldWithoutAuthority,
    decorativeWallpaperInfluence: wallpaperInfluence,
    maximumWallpaperInfluence: MAX_WALLPAPER_INFLUENCE,
    wallpaperInfluenceDecorativeOnly: true,
    accessibilityResolverRequired: forcedColors || increasedContrast,
    protectedSemanticRolesMayBeRedefined: false
  });
}

function resolveAestheticPreferences(input, accessibility) {
  const requestedAppearance = validateMember(
    input.appearance,
    APPEARANCE_MODES,
    'appearance mode',
    DEFAULT_PREFERENCES.appearance
  );
  const requestedMaterialIntensity = validateMember(
    input.materialIntensity,
    MATERIAL_INTENSITY,
    'material intensity',
    DEFAULT_PREFERENCES.materialIntensity
  );
  const requestedDensity = validateMember(
    input.density,
    DENSITY_LEVELS,
    'density level',
    DEFAULT_PREFERENCES.density
  );
  const requestedGeometry = validateMember(
    input.geometry,
    GEOMETRY_PREFERENCES,
    'geometry preference',
    DEFAULT_PREFERENCES.geometry
  );
  const requestedMotionIntensity = validateMember(
    input.motionIntensity,
    MOTION_INTENSITY,
    'motion intensity',
    DEFAULT_PREFERENCES.motionIntensity
  );
  const scope = validateMember(input.scope, SCOPES, 'personalization scope', DEFAULT_PREFERENCES.scope);

  const forcedColors = accessibility.has('forced-colors');
  const increasedContrast = accessibility.has('increased-contrast');
  const reducedTransparency = accessibility.has('reduced-transparency')
    || accessibility.has('solid-surfaces');
  const reducedMotion = accessibility.has('reduced-motion')
    || accessibility.has('minimal-motion');
  const simplifiedVisualEffects = accessibility.has('simplified-visual-effects');
  const largeText = accessibility.has('large-text')
    || accessibility.has('extra-large-text');
  const touchAssistance = accessibility.has('touch-assistance');

  const effectiveMaterialIntensity =
    reducedTransparency || simplifiedVisualEffects || increasedContrast
      ? 'subdued'
      : requestedMaterialIntensity;
  const effectiveMotionIntensity =
    reducedMotion || simplifiedVisualEffects
      ? 'minimal'
      : requestedMotionIntensity;
  const effectiveDensity =
    largeText || touchAssistance
      ? 'comfortable'
      : requestedDensity;
  const effectiveGeometry =
    largeText
      ? 'balanced'
      : requestedGeometry;

  return Object.freeze({
    scope,
    appearance: Object.freeze({
      requested: requestedAppearance,
      effective: requestedAppearance,
      pigmentAuthority: forcedColors ? 'accessibility-forced-colors' : 'personalization',
      forcedColorsActive: forcedColors
    }),
    materialIntensity: Object.freeze({
      requested: requestedMaterialIntensity,
      effective: effectiveMaterialIntensity,
      overriddenByAccessibility: effectiveMaterialIntensity !== requestedMaterialIntensity
    }),
    density: Object.freeze({
      requested: requestedDensity,
      effective: effectiveDensity,
      overriddenByAccessibility: effectiveDensity !== requestedDensity
    }),
    geometry: Object.freeze({
      requested: requestedGeometry,
      effective: effectiveGeometry,
      overriddenByAccessibility: effectiveGeometry !== requestedGeometry
    }),
    motionIntensity: Object.freeze({
      requested: requestedMotionIntensity,
      effective: effectiveMotionIntensity,
      overriddenByAccessibility: effectiveMotionIntensity !== requestedMotionIntensity
    })
  });
}

function compactPreferenceState(resolved) {
  return Object.freeze({
    appearance: resolved.appearance.effective,
    accentFamily: resolved.accent.acceptedFamily,
    accentToken: resolved.accent.acceptedToken,
    materialIntensity: resolved.materialIntensity.effective,
    density: resolved.density.effective,
    geometry: resolved.geometry.effective,
    motionIntensity: resolved.motionIntensity.effective,
    scope: resolved.scope
  });
}

export function resolveGlazePersonalization(input = {}) {
  if (!plainObject(input)) throw new TypeError('Personalization input must be a plain object');

  const accessibilityProfiles = uniqueStrings(input.accessibilityProfiles);
  const accessibility = accessibilitySet(accessibilityProfiles);
  const aesthetics = resolveAestheticPreferences(input, accessibility);
  const accent = resolveAccent(input, accessibility);
  const overrides = normalizeOverrides(input.semanticRoleOverrides);
  const applicationIdentityToken = optionalToken(input.applicationIdentityToken);

  return Object.freeze({
    version: '1.7.0-dev.5',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    consumerEligible: false,
    scope: aesthetics.scope,
    appearance: aesthetics.appearance,
    accent,
    materialIntensity: aesthetics.materialIntensity,
    density: aesthetics.density,
    geometry: aesthetics.geometry,
    motionIntensity: aesthetics.motionIntensity,
    semanticOverrides: overrides,
    protectedSemanticRoles: PROTECTED_SEMANTIC_ROLES,
    accessibility: Object.freeze({
      profiles: accessibilityProfiles,
      precedence: true,
      forcedColorsMayOverrideAppearancePigments: true,
      increasedContrastMayOverrideAccentAndMaterialIntensity: true,
      reducedTransparencyMayForceSubduedMaterial: true,
      reducedMotionMayForceMinimalMotion: true,
      largeTextMayOverrideDensityAndGeometry: true,
      touchAssistanceMayOverrideDensityAndTargetSpacing: true
    }),
    applicationIdentity: Object.freeze({
      token: input.applicationIdentityAuthoritative === true ? applicationIdentityToken : null,
      authoritative: input.applicationIdentityAuthoritative === true,
      preservedThroughPersonalization: true,
      mayRedefineProtectedSemanticRoles: false,
      userAccentMayEraseApplicationIdentity: false
    }),
    localFirst: Object.freeze({
      networkRequired: false,
      telemetryRequired: false,
      advertisingDependencyAllowed: false,
      remoteFontsRequired: false,
      remoteVisualDependenciesRequired: false,
      sensitiveContentAnalysisRequired: false,
      directWallpaperPixelAcquisitionAuthority: false,
      contextInputsCallerOrPlatformSupplied: true
    }),
    session: Object.freeze({
      previewBeforeApplySupported: true,
      resetSupported: true,
      undoSupported: true,
      perDeviceAdaptationSupported: true,
      crossDeviceSyncEstablished: false,
      persistenceAutomatic: false,
      callerOwnsPersistence: true
    }),
    resolvedPreferences: compactPreferenceState({
      ...aesthetics,
      accent
    }),
    authority: Object.freeze({
      presentationOnly: true,
      personalizationStateOwnedByUserAndCaller: true,
      sourceAuthorityInferredByGlaze: false,
      privateContentInspectedByGlaze: false,
      permissionGrantedByGlaze: false,
      consentGrantedByGlaze: false,
      capabilityCreatedByGlaze: false,
      telemetryAuthorizedByGlaze: false,
      persistencePerformedByGlaze: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export function resolveGlazePersonalizationAction(input = {}) {
  if (!plainObject(input)) throw new TypeError('Personalization action input must be a plain object');

  const action = validateMember(input.action, ACTIONS, 'personalization action');
  const currentInput = plainObject(input.currentPreferences) ? input.currentPreferences : {};
  const requestedInput = plainObject(input.requestedPreferences) ? input.requestedPreferences : {};
  const previousInput = plainObject(input.previousPreferences) ? input.previousPreferences : null;
  const explicitUserIntent = input.explicitUserIntent === true;

  const current = resolveGlazePersonalization(currentInput);
  const requested = resolveGlazePersonalization({...currentInput, ...requestedInput});
  const defaults = resolveGlazePersonalization({
    ...DEFAULT_PREFERENCES,
    accessibilityProfiles: currentInput.accessibilityProfiles
  });
  const previous = previousInput ? resolveGlazePersonalization(previousInput) : null;

  const intentRequired = action !== 'preview';
  const accepted = !intentRequired || explicitUserIntent;
  let proposed = current;
  let reason = 'preview-only';

  if (action === 'preview') {
    proposed = requested;
    reason = 'preview';
  } else if (!accepted) {
    proposed = current;
    reason = 'explicit-user-intent-required';
  } else if (action === 'apply') {
    proposed = requested;
    reason = 'apply-proposal';
  } else if (action === 'reset') {
    proposed = defaults;
    reason = 'reset-proposal';
  } else if (action === 'undo') {
    if (previous) {
      proposed = previous;
      reason = 'undo-proposal';
    } else {
      proposed = current;
      reason = 'previous-state-required';
    }
  }

  const actionReady =
    accepted
      && (action !== 'undo' || previous !== null);

  return Object.freeze({
    version: '1.7.0-dev.5',
    lifecycle: 'development',
    stableBaseline: '1.6.0',
    action,
    explicitUserIntent,
    intentRequired,
    accepted: actionReady,
    reason,
    current: current.resolvedPreferences,
    requested: requested.resolvedPreferences,
    proposed: proposed.resolvedPreferences,
    transition: Object.freeze({
      previewOnly: action === 'preview',
      callerMustPersist: actionReady && action !== 'preview',
      persistencePerformedByGlaze: false,
      undoRequiresCallerSuppliedPreviousState: true,
      resetUsesGovernedDefaults: true,
      crossDeviceSyncEstablished: false
    }),
    authority: Object.freeze({
      presentationOnly: true,
      userIntentOwnedByCaller: true,
      persistenceOwnedByCaller: true,
      permissionGrantedByGlaze: false,
      consentGrantedByGlaze: false,
      capabilityCreatedByGlaze: false,
      consequentialExecutionAutomatic: false
    })
  });
}

export const glazeV17PersonalizationDevelopmentContract = Object.freeze({
  version: '1.7.0-dev.5',
  lifecycle: 'development',
  stableBaseline: '1.6.0',
  consumerEligible: false,
  implementedSpecificationSections: Object.freeze([6]),
  appearanceModes: APPEARANCE_MODES,
  accentFamilies: ACCENT_FAMILIES,
  materialIntensityLevels: MATERIAL_INTENSITY,
  densityLevels: DENSITY_LEVELS,
  geometryPreferences: GEOMETRY_PREFERENCES,
  motionIntensityLevels: MOTION_INTENSITY,
  actions: ACTIONS,
  scopes: SCOPES,
  protectedSemanticRoles: PROTECTED_SEMANTIC_ROLES,
  authorityPrecedence: AUTHORITY_PRECEDENCE,
  maximumWallpaperInfluence: MAX_WALLPAPER_INFLUENCE,
  accessibilityPrecedence: true,
  personalizationMayRedefineProtectedSemanticRoles: false,
  localFirst: true,
  networkRequired: false,
  telemetryRequired: false,
  crossDeviceSyncEstablished: false,
  persistenceAutomatic: false,
  presentationOnly: true
});
