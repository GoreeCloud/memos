const LUMINANCE = new Set(['dark', 'mid', 'bright', 'unknown']);
const COMPLEXITY = new Set(['simple', 'moderate', 'complex', 'unknown']);
const DEPTH = new Set(['base', 'raised', 'overlay', 'modal']);
const DAYPART = new Set(['dawn', 'day', 'dusk', 'night', 'unknown']);
const APPEARANCE = new Set(['light', 'dark', 'deep-dark']);

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function clamp(value, min = 0, max = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function bounded(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function normalizeAccessibility(value = {}) {
  const input = asObject(value);
  return Object.freeze({
    forcedColors: Boolean(input.forcedColors),
    reducedTransparency: Boolean(input.reducedTransparency),
    increasedContrast: Boolean(input.increasedContrast),
    reducedMotion: Boolean(input.reducedMotion)
  });
}

function complexityVariance(value) {
  if (value === 'complex') return 0.90;
  if (value === 'moderate') return 0.55;
  if (value === 'simple') return 0.18;
  return 0.45;
}

function luminanceVariance(value) {
  if (value === 'bright') return 0.12;
  if (value === 'dark') return 0.06;
  if (value === 'mid') return 0.02;
  return 0.04;
}

function depthHueShift(value) {
  if (value === 'raised') return 0.012;
  if (value === 'overlay') return 0.022;
  if (value === 'modal') return 0.030;
  return 0;
}

function warmthForDaypart(value) {
  if (value === 'dawn') return 0.035;
  if (value === 'dusk') return 0.045;
  if (value === 'night') return -0.018;
  return 0;
}

function normalizeMemoryTint(value) {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.css !== 'string' || value.css.length < 1 || value.css.length > 160) return null;
  const influence = clamp(value.influence ?? 0.04, 0, 0.08);
  if (influence === 0) return null;
  return Object.freeze({css: value.css, influence});
}

/**
 * Resolve bounded Glaze UI v1.4 optical state.
 *
 * The engine is deliberately local and deterministic. It accepts already-derived
 * environment signals rather than collecting telemetry, camera data, or remote
 * context. Consumers remain responsible for obtaining signals through their own
 * privacy/security-approved adapters.
 */
export function resolveGlazeOptics(options = {}) {
  const input = asObject(options);
  const complexity = bounded(input.backgroundComplexity, COMPLEXITY, 'unknown');
  const luminance = bounded(input.backgroundLuminance, LUMINANCE, 'unknown');
  const depth = bounded(input.depth, DEPTH, 'base');
  const daypart = bounded(input.daypart, DAYPART, 'unknown');
  const appearance = bounded(input.appearance, APPEARANCE, 'light');
  const accessibility = normalizeAccessibility(input.accessibility);

  if (accessibility.forcedColors || accessibility.reducedTransparency) {
    return Object.freeze({
      mode: 'solid-accessible',
      frostStrength: 1,
      blurScale: 0,
      semanticProtection: 1,
      depthHueShift: 0,
      warmth: 0,
      memoryTint: null,
      decorativeTintAllowed: false,
      accessibility
    });
  }

  const baseFrost = clamp(input.baseFrost ?? 0.34, 0.20, 0.72);
  const sensitivity = clamp(input.sensitivityFactor ?? 0.38, 0, 0.55);
  const variance = clamp(complexityVariance(complexity) + luminanceVariance(luminance), 0, 1);
  let frostStrength = clamp(baseFrost + variance * sensitivity, 0.20, 0.88);
  if (accessibility.increasedContrast) frostStrength = clamp(frostStrength + 0.10, 0.20, 0.92);

  const semanticImportance = clamp(input.semanticImportance ?? 0.65, 0, 1);
  const semanticProtection = clamp(0.50 + semanticImportance * 0.46 + (accessibility.increasedContrast ? 0.04 : 0), 0.50, 1);
  const blurScale = clamp(1 - semanticProtection * 0.42, 0.50, 0.80);
  const memoryTint = accessibility.increasedContrast ? null : normalizeMemoryTint(input.memoryTint);
  const warmth = accessibility.increasedContrast ? 0 : warmthForDaypart(daypart);

  return Object.freeze({
    mode: 'adaptive-optical',
    appearance,
    backgroundComplexity: complexity,
    backgroundLuminance: luminance,
    depth,
    daypart,
    frostStrength,
    blurScale,
    semanticProtection,
    depthHueShift: depthHueShift(depth),
    warmth,
    memoryTint,
    decorativeTintAllowed: !accessibility.increasedContrast,
    accessibility
  });
}

function rootOf(target) {
  if (!target) throw new TypeError('A target is required');
  return target.documentElement || target;
}

export function applyGlazeOptics(target, options = {}) {
  const element = rootOf(target);
  if (!element.dataset || !element.style || typeof element.style.setProperty !== 'function') {
    throw new TypeError('Glaze Optical Engine target must expose dataset and style.setProperty');
  }

  const resolved = resolveGlazeOptics(options);
  element.dataset.glazeOpticalV14 = resolved.mode;
  element.style.setProperty('--glz14-frost-strength', String(resolved.frostStrength));
  element.style.setProperty('--glz14-blur-scale', String(resolved.blurScale));
  element.style.setProperty('--glz14-semantic-protection', String(resolved.semanticProtection));
  element.style.setProperty('--glz14-depth-hue-shift', String(resolved.depthHueShift));
  element.style.setProperty('--glz14-light-warmth', String(resolved.warmth));
  element.style.setProperty('--glz14-memory-tint', resolved.memoryTint?.css || 'transparent');
  element.style.setProperty('--glz14-memory-tint-influence', String(resolved.memoryTint?.influence || 0));
  return resolved;
}

export function createGlazeOpticalEngine(options = {}) {
  const {signalAdapter = null} = asObject(options);

  function adapterSignals() {
    if (typeof signalAdapter?.resolve !== 'function') return {};
    return asObject(signalAdapter.resolve());
  }

  return Object.freeze({
    kind: 'glaze-optical-engine-v1.4',
    telemetryRequired: false,
    remoteContextRequired: false,
    resolve(overrides = {}) {
      return resolveGlazeOptics({...adapterSignals(), ...asObject(overrides)});
    },
    apply(target, overrides = {}) {
      return applyGlazeOptics(target, {...adapterSignals(), ...asObject(overrides)});
    }
  });
}

export const glazeOpticalEngineV14 = Object.freeze({
  version: '1.4.0',
  lifecycle: 'stable',
  telemetryRequired: false,
  remoteContextRequired: false,
  preservesTokenSystem: true,
  additiveComponentApi: true,
  maxMemoryTintInfluence: 0.08,
  accessibilityPrecedence: Object.freeze(['forced-colors', 'reduced-transparency', 'increased-contrast'])
});
