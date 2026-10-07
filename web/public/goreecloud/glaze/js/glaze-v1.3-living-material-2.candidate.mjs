const MATERIAL_ROLES = new Set(['soft-glaze', 'glaze', 'deep-glaze', 'live-glaze']);
const STATES = new Set(['rest', 'hover', 'focus', 'pressed', 'dragged', 'selected', 'expanded', 'loading', 'disabled']);
const APPEARANCES = new Set(['light', 'dark', 'deep-dark']);
const LUMINANCE = new Set(['dark', 'mid', 'bright', 'unknown']);
const COMPLEXITY = new Set(['simple', 'complex', 'unknown']);
const VELOCITY = new Set(['slow', 'normal', 'fast', 'unknown']);
const EDGE_ORIENTATION = new Set(['top', 'bottom', 'inline-start', 'inline-end', 'mixed', 'unknown']);

const SIGNALS = Object.freeze({
  frameTiming: new Set(['healthy', 'strained', 'critical', 'unknown']),
  renderingCapability: new Set(['high', 'standard', 'limited', 'unknown']),
  glazeRegionLoad: new Set(['low', 'medium', 'high', 'unknown']),
  windowLoad: new Set(['compact', 'standard', 'large', 'unknown']),
  powerSaving: new Set(['on', 'off', 'unknown']),
  animationPreference: new Set(['standard', 'reduced', 'unknown']),
  compositorCapability: new Set(['full', 'partial', 'none', 'unknown'])
});

const THICKNESS = Object.freeze({
  'soft-glaze': Object.freeze({opticalDensity: 0.28, separation: 0.22, specularBase: 0.34, maxTier: 2}),
  'glaze': Object.freeze({opticalDensity: 0.40, separation: 0.38, specularBase: 0.46, maxTier: 2}),
  'deep-glaze': Object.freeze({opticalDensity: 0.58, separation: 0.62, specularBase: 0.56, maxTier: 2}),
  'live-glaze': Object.freeze({opticalDensity: 0.48, separation: 0.50, specularBase: 0.52, maxTier: 3})
});

const STATE_RESPONSE = Object.freeze({
  rest: Object.freeze({scale: 1, elevationDelta: 0, densityDelta: 0, specularDelta: 0}),
  hover: Object.freeze({scale: 1, elevationDelta: 0.08, densityDelta: -0.01, specularDelta: 0.08}),
  focus: Object.freeze({scale: 1, elevationDelta: 0.06, densityDelta: 0, specularDelta: 0.03}),
  pressed: Object.freeze({scale: 0.988, elevationDelta: -0.18, densityDelta: 0.06, specularDelta: -0.04}),
  dragged: Object.freeze({scale: 1.006, elevationDelta: 0.22, densityDelta: 0, specularDelta: 0.06}),
  selected: Object.freeze({scale: 1, elevationDelta: 0.05, densityDelta: 0.02, specularDelta: 0.04}),
  expanded: Object.freeze({scale: 1, elevationDelta: 0.14, densityDelta: 0.04, specularDelta: 0.05}),
  loading: Object.freeze({scale: 1, elevationDelta: 0, densityDelta: 0.02, specularDelta: 0}),
  disabled: Object.freeze({scale: 1, elevationDelta: -0.04, densityDelta: 0.04, specularDelta: -0.12})
});

const TIER_NAME = Object.freeze({0: 'solid', 1: 'static-glaze', 2: 'responsive-glaze', 3: 'living-glaze'});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value)));
}

function bounded(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function normalizeTier(value, fallback = 3) {
  const tier = Number(value);
  return Number.isInteger(tier) && tier >= 0 && tier <= 3 ? tier : fallback;
}

function normalizeSignals(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  const out = {};
  for (const [key, allowed] of Object.entries(SIGNALS)) {
    out[key] = bounded(input[key], allowed, 'unknown');
  }
  return Object.freeze(out);
}

function normalizeAccessibility(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  return Object.freeze({
    forcedColors: Boolean(input.forcedColors),
    reducedTransparency: Boolean(input.reducedTransparency),
    increasedContrast: Boolean(input.increasedContrast),
    reducedMotion: Boolean(input.reducedMotion)
  });
}

function capTier(current, cap) {
  return Math.min(current, cap);
}

export function resolveGlazePerformanceTier({requestedTier = 3, signals = {}, accessibility = {}} = {}) {
  const normalizedSignals = normalizeSignals(signals);
  const a11y = normalizeAccessibility(accessibility);
  let tier = normalizeTier(requestedTier);
  const reasons = [];

  if (a11y.forcedColors || a11y.reducedTransparency) {
    tier = 0;
    reasons.push(a11y.forcedColors ? 'forced-colors' : 'reduced-transparency');
  } else {
    if (normalizedSignals.frameTiming === 'critical') {
      tier = capTier(tier, 0);
      reasons.push('critical-frame-timing');
    }
    if (normalizedSignals.compositorCapability === 'none') {
      tier = capTier(tier, 0);
      reasons.push('no-compositor-effects');
    }
    if (normalizedSignals.renderingCapability === 'limited') {
      tier = capTier(tier, 1);
      reasons.push('limited-rendering-capability');
    }
    if (normalizedSignals.frameTiming === 'strained') {
      tier = capTier(tier, 1);
      reasons.push('strained-frame-timing');
    }
    if (normalizedSignals.powerSaving === 'on') {
      tier = capTier(tier, 1);
      reasons.push('power-saving');
    }
    if (normalizedSignals.compositorCapability === 'partial') {
      tier = capTier(tier, 2);
      reasons.push('partial-compositor-capability');
    }
    if (normalizedSignals.glazeRegionLoad === 'high') {
      tier = capTier(tier, 2);
      reasons.push('high-glaze-region-load');
    }
  }

  return Object.freeze({
    tier,
    name: TIER_NAME[tier],
    reasons: Object.freeze(reasons),
    signals: normalizedSignals,
    accessibility: a11y,
    connectedMaterialMotionAllowed: tier === 3 && !a11y.reducedMotion && normalizedSignals.animationPreference !== 'reduced'
  });
}

function luminanceDensityDelta(value) {
  if (value === 'bright') return 0.05;
  if (value === 'dark') return -0.02;
  return 0;
}

function complexityDensityDelta(value) {
  if (value === 'complex') return 0.08;
  if (value === 'simple') return -0.03;
  return 0;
}

function velocitySpecularDelta(value) {
  if (value === 'fast') return 0.04;
  if (value === 'slow') return -0.02;
  return 0;
}

function appearanceSpecularDelta(value) {
  if (value === 'deep-dark') return 0.08;
  if (value === 'dark') return 0.04;
  return 0;
}

function orientationSpecularDelta(value) {
  if (value === 'top') return 0.06;
  if (value === 'bottom') return -0.03;
  if (value === 'mixed') return 0.02;
  return 0;
}

function normalizeTransmission(value, allowed) {
  if (!allowed || !value || typeof value !== 'object') return null;
  if (value.authority !== 'dynamic-color') return null;
  if (typeof value.css !== 'string' || value.css.length === 0 || value.css.length > 160) return null;
  return Object.freeze({
    css: value.css,
    authority: 'dynamic-color',
    maxInfluence: 0.10,
    materialColorRemainsNeutral: true
  });
}

export function resolveLivingMaterial2(options = {}) {
  const role = bounded(options.role, MATERIAL_ROLES, 'glaze');
  const state = bounded(options.state, STATES, 'rest');
  const appearance = bounded(options.appearance, APPEARANCES, 'light');
  const underlyingLuminance = bounded(options.underlyingLuminance, LUMINANCE, 'unknown');
  const underlyingComplexity = bounded(options.underlyingComplexity, COMPLEXITY, 'unknown');
  const interactionVelocity = bounded(options.interactionVelocity, VELOCITY, 'unknown');
  const edgeOrientation = bounded(options.edgeOrientation, EDGE_ORIENTATION, 'unknown');
  const base = THICKNESS[role];
  const requestedTier = Math.min(normalizeTier(options.requestedTier, base.maxTier), base.maxTier);
  const governor = resolveGlazePerformanceTier({
    requestedTier,
    signals: options.performanceSignals,
    accessibility: options.accessibility
  });
  const a11y = governor.accessibility;
  const response = STATE_RESPONSE[state];

  if (governor.tier === 0) {
    return Object.freeze({
      role,
      state,
      tier: 0,
      tierName: 'solid',
      scale: 1,
      elevation: 0,
      opticalDensity: 1,
      separation: a11y.increasedContrast ? 1 : 0.86,
      specular: 0,
      transmission: null,
      connectedMaterialMotionAllowed: false,
      governor
    });
  }

  const adaptiveAllowed = governor.tier >= 2;
  const liveAdaptiveAllowed = governor.tier === 3 && role === 'live-glaze';
  let opticalDensity = base.opticalDensity;
  if (adaptiveAllowed) {
    opticalDensity += complexityDensityDelta(underlyingComplexity);
    opticalDensity += luminanceDensityDelta(underlyingLuminance);
    opticalDensity += response.densityDelta;
  }
  if (a11y.increasedContrast) opticalDensity += 0.10;

  let specular = base.specularBase;
  if (adaptiveAllowed) {
    specular += response.specularDelta;
    specular += appearanceSpecularDelta(appearance);
    specular += orientationSpecularDelta(edgeOrientation);
    if (liveAdaptiveAllowed) specular += velocitySpecularDelta(interactionVelocity);
  }
  if (state === 'focus') specular = Math.min(specular, 0.62);
  if (a11y.increasedContrast) specular = Math.min(specular, 0.52);

  const transmissionAllowed = liveAdaptiveAllowed && !a11y.reducedTransparency && !a11y.forcedColors;
  const transmission = normalizeTransmission(options.transmission, transmissionAllowed);

  return Object.freeze({
    role,
    state,
    appearance,
    underlyingLuminance,
    underlyingComplexity,
    interactionVelocity,
    edgeOrientation,
    tier: governor.tier,
    tierName: governor.name,
    scale: governor.tier >= 2 && !a11y.reducedMotion ? response.scale : 1,
    elevation: clamp(base.separation + (governor.tier >= 2 ? response.elevationDelta : 0), 0, 1),
    opticalDensity: clamp(opticalDensity, 0, 1),
    separation: clamp(base.separation + (a11y.increasedContrast ? 0.16 : 0), 0, 1),
    specular: clamp(governor.tier >= 2 ? specular : base.specularBase * 0.55, 0, 1),
    transmission,
    connectedMaterialMotionAllowed: governor.connectedMaterialMotionAllowed && role === 'live-glaze',
    governor
  });
}

function rootOf(target) {
  if (!target) throw new TypeError('A target is required');
  return target.documentElement || target;
}

export function applyLivingMaterial2(target, options = {}) {
  const element = rootOf(target);
  if (!element.dataset || !element.style || typeof element.style.setProperty !== 'function') {
    throw new TypeError('Living Material 2.0 target must expose dataset and style.setProperty');
  }
  const resolved = resolveLivingMaterial2(options);
  element.dataset.glazeMaterialV13 = resolved.role;
  element.dataset.glazeMaterialState = resolved.state;
  element.dataset.glazeTier = String(resolved.tier);
  element.style.setProperty('--glz13-material-scale', String(resolved.scale));
  element.style.setProperty('--glz13-material-elevation', String(resolved.elevation));
  element.style.setProperty('--glz13-material-density', String(resolved.opticalDensity));
  element.style.setProperty('--glz13-material-separation', String(resolved.separation));
  element.style.setProperty('--glz13-material-specular', String(resolved.specular));
  element.style.setProperty('--glz13-material-transmission', resolved.transmission?.css || 'transparent');
  element.style.setProperty('--glz13-connected-material-motion', resolved.connectedMaterialMotionAllowed ? '1' : '0');
  return resolved;
}

export function createGlazePerformanceGovernor({signalAdapter = null} = {}) {
  return Object.freeze({
    kind: 'glaze-performance-governor-v1.3',
    telemetryRequired: false,
    analyticsRequired: false,
    resolve({requestedTier = 3, accessibility = {}} = {}) {
      const signals = typeof signalAdapter?.resolve === 'function' ? signalAdapter.resolve() : {};
      return resolveGlazePerformanceTier({requestedTier, signals, accessibility});
    }
  });
}

export const livingMaterial2Candidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  materialRoles: Object.freeze([...MATERIAL_ROLES]),
  interactionStates: Object.freeze([...STATES]),
  performanceTiers: Object.freeze([0, 1, 2, 3]),
  performanceSignalMode: 'qualitative-local-adapter-supplied',
  productionPerformanceThresholdsEstablished: false,
  telemetryRequired: false,
  materialColorDistinctFromTransmittedColor: true
});
