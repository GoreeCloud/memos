import {
  DEFAULT_GLAZE_ACCENT,
  deriveAccentPalette,
  normalizeAccentSeed
} from './glaze-v1.3-dynamic-color.candidate.mjs';
import {resolveAccessibilityProfile} from './glaze-v1.3-accessibility.candidate.mjs';

const APPEARANCE = new Set(['follow-system', 'light', 'dark', 'deep-dark']);
const EXPRESSION = new Set(['calm', 'balanced', 'expressive']);
const DENSITY = new Set(['comfortable', 'standard', 'productive', 'immersive']);
const MATERIAL_CLARITY = new Set(['clear', 'balanced', 'solid']);

const SHAPE_CEILING = Object.freeze({
  calm: 'soft',
  balanced: 'rounded',
  expressive: 'expressive'
});

const WALLPAPER_ALPHA = Object.freeze({
  calm: 0.04,
  balanced: 0.08,
  expressive: 0.12
});
const WALLPAPER_MAX_ALPHA = 0.12;
const WALLPAPER_MAX_CHROMA_RETENTION = 0.28;
const STORAGE_SCHEMA_VERSION = 1;

export const DEFAULT_PERSONALIZATION = Object.freeze({
  appearance: 'follow-system',
  accentSeed: DEFAULT_GLAZE_ACCENT,
  expressionProfile: 'balanced',
  density: 'standard',
  materialClarity: 'balanced',
  wallpaperAtmosphere: true
});

export const PERSONALIZATION_PRECEDENCE = Object.freeze([
  'accessibility',
  'platform-system',
  'goreecloud-user',
  'application-specific-when-allowed',
  'glaze-default'
]);

export const PERSONALIZATION_CONTINUITY = Object.freeze([
  'current-task',
  'current-destination',
  'selection',
  'draft-state',
  'typed-input',
  'unsaved-work',
  'focus',
  'logical-focus-order',
  'media-state',
  'product-identity'
]);

function bounded(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function numericChannel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return clamp(Math.round(number), 0, 255);
}

function normalizeRgbSummary(sample) {
  if (!sample || typeof sample !== 'object') return null;
  const values = Array.isArray(sample) ? sample : [sample.r, sample.g, sample.b];
  if (values.length < 3) return null;
  const [r, g, b] = values.map(numericChannel);
  if ([r, g, b].some(value => value === null)) return null;
  return {r, g, b};
}

function normalizedExpression(input) {
  const legacy = input?.atmosphere;
  return bounded(input?.expressionProfile, EXPRESSION, bounded(legacy, EXPRESSION, DEFAULT_PERSONALIZATION.expressionProfile));
}

export function normalizePersonalization(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  return Object.freeze({
    appearance: bounded(input.appearance, APPEARANCE, DEFAULT_PERSONALIZATION.appearance),
    accentSeed: normalizeAccentSeed(input.accentSeed ?? DEFAULT_PERSONALIZATION.accentSeed),
    expressionProfile: normalizedExpression(input),
    density: bounded(input.density, DENSITY, DEFAULT_PERSONALIZATION.density),
    materialClarity: bounded(input.materialClarity, MATERIAL_CLARITY, DEFAULT_PERSONALIZATION.materialClarity),
    wallpaperAtmosphere: input.wallpaperAtmosphere === undefined
      ? DEFAULT_PERSONALIZATION.wallpaperAtmosphere
      : Boolean(input.wallpaperAtmosphere)
  });
}

export function resolveAppearance(preference = 'follow-system', systemAdapter = null) {
  const requested = bounded(preference, APPEARANCE, 'follow-system');
  if (requested !== 'follow-system') return requested;
  const systemValue = systemAdapter?.resolve?.();
  return systemValue === 'dark' || systemValue === 'deep-dark' ? systemValue : 'light';
}

export function deriveWallpaperAtmosphere(sample, options = {}) {
  const normalized = normalizeRgbSummary(sample);
  if (!normalized) return null;
  if (options.enabled === false || options.forcedColors || options.reducedTransparency) return null;

  const expressionProfile = bounded(options.expressionProfile, EXPRESSION, 'balanced');
  const alpha = Math.min(WALLPAPER_ALPHA[expressionProfile], WALLPAPER_MAX_ALPHA);
  const retentionInput = Number(options.chromaRetention);
  const chromaRetention = Number.isFinite(retentionInput)
    ? clamp(retentionInput, 0, WALLPAPER_MAX_CHROMA_RETENTION)
    : 0.24;

  const luminance = Math.round(
    normalized.r * 0.2126 + normalized.g * 0.7152 + normalized.b * 0.0722
  );
  const desaturate = channel => clamp(
    Math.round(luminance + (channel - luminance) * chromaRetention),
    0,
    255
  );

  const derived = Object.freeze({
    r: desaturate(normalized.r),
    g: desaturate(normalized.g),
    b: desaturate(normalized.b),
    alpha,
    chromaRetention,
    source: 'producer-supplied-local-rgb-summary'
  });
  return Object.freeze({
    ...derived,
    css: `rgb(${derived.r} ${derived.g} ${derived.b} / ${derived.alpha})`,
    networkRequired: false,
    telemetryAuthorized: false,
    rawWallpaperPixelsRequired: false
  });
}

function resolveDensity(requested, accessibility) {
  if (accessibility.touchAssistance) return 'comfortable';
  if (accessibility.reflowRequired && (requested === 'productive' || requested === 'immersive')) return 'standard';
  return requested;
}

export function resolvePersonalization(preferences = {}, context = {}) {
  const requested = normalizePersonalization(preferences);
  const appearance = resolveAppearance(requested.appearance, context.systemAdapter);
  const accessibility = resolveAccessibilityProfile({
    forcedColors: context.forcedColors,
    reducedMotion: context.reducedMotion,
    reducedTransparency: context.reducedTransparency,
    increasedContrast: context.increasedContrast,
    showBoundaries: context.showBoundaries,
    touchAssistance: context.touchAssistance,
    largeText: context.largeText,
    textScalePercent: context.textScalePercent,
    materialClarity: requested.materialClarity,
    density: requested.density
  }, {
    farView: context.farView,
    direction: context.direction,
    motionRole: context.motionRole
  });

  const accentPalette = deriveAccentPalette(requested.accentSeed, {appearance});
  const wallpaperAtmosphere = deriveWallpaperAtmosphere(context.wallpaperRgbSummary, {
    enabled: requested.wallpaperAtmosphere,
    expressionProfile: requested.expressionProfile,
    forcedColors: accessibility.forcedColors,
    reducedTransparency: accessibility.reducedTransparency
  });

  return Object.freeze({
    requested,
    appearance,
    accentPalette,
    expressionProfile: requested.expressionProfile,
    typographyExpressionProfile: requested.expressionProfile,
    shapeExpressionCeiling: SHAPE_CEILING[requested.expressionProfile],
    density: resolveDensity(requested.density, accessibility),
    materialClarity: accessibility.effectiveMaterialClarity,
    wallpaperAtmosphere,
    accessibility,
    semanticColorRemappingAllowed: false,
    productIdentityReplacementAllowed: false,
    securityOrPrivacyMeaningOverrideAllowed: false,
    arbitraryComponentGeometryAllowed: false,
    arbitraryTypographyAxisValuesAllowed: false,
    crossDeviceSyncImplemented: false,
    persistenceOwnedByGlaze: false,
    continuity: PERSONALIZATION_CONTINUITY
  });
}

export function serializePersonalization(preferences = {}) {
  return JSON.stringify({
    schemaVersion: STORAGE_SCHEMA_VERSION,
    preferences: normalizePersonalization(preferences)
  });
}

export function deserializePersonalization(serialized) {
  try {
    const envelope = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    if (!envelope || envelope.schemaVersion !== STORAGE_SCHEMA_VERSION || !envelope.preferences) return null;
    return normalizePersonalization(envelope.preferences);
  } catch {
    return null;
  }
}

export function createPersonalizationController({
  systemAdapter = null,
  persistenceAdapter = null,
  initialPreferences = DEFAULT_PERSONALIZATION,
  contextProvider = () => ({})
} = {}) {
  let current = normalizePersonalization(initialPreferences);
  let stopSystemSubscription = () => {};

  const resolve = () => resolvePersonalization(current, {...contextProvider(), systemAdapter});
  const load = () => {
    const stored = persistenceAdapter?.load?.();
    const decoded = typeof stored === 'string' ? deserializePersonalization(stored) : normalizePersonalization(stored || current);
    if (decoded) current = decoded;
    return resolve();
  };
  const set = (patch = {}, {persist = false} = {}) => {
    current = normalizePersonalization({...current, ...patch});
    if (persist && persistenceAdapter?.save) persistenceAdapter.save(serializePersonalization(current));
    return resolve();
  };
  const start = () => {
    stopSystemSubscription();
    stopSystemSubscription = systemAdapter?.subscribe?.(() => {
      if (current.appearance === 'follow-system') resolve();
    }) || (() => {});
    return load();
  };
  const stop = () => {
    stopSystemSubscription();
    stopSystemSubscription = () => {};
  };
  const clearPersisted = () => persistenceAdapter?.clear?.();

  return Object.freeze({
    start,
    stop,
    load,
    set,
    resolve,
    clearPersisted,
    get preferences() { return current; },
    get persistenceEnabled() { return Boolean(persistenceAdapter?.load && persistenceAdapter?.save); }
  });
}

export const personalizationCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  principle: 'Personalize expression, not truth or control semantics.',
  persistenceAuthority: 'consumer-platform-adapter',
  wallpaperSourceAuthority: 'consumer-platform-adapter',
  crossDeviceSyncAuthority: 'separate-governed-goreecloud-sync-integration',
  directCrossDeviceSyncImplemented: false,
  directWallpaperPixelAcquisitionImplemented: false,
  nativeAdapterAcceptanceEstablished: false,
  maximumWallpaperAlpha: WALLPAPER_MAX_ALPHA,
  maximumWallpaperChromaRetention: WALLPAPER_MAX_CHROMA_RETENTION
});
