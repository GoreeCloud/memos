const ROLES = new Set(['quiet', 'soft', 'rounded', 'capsule', 'expressive', 'hero']);
const EXPRESSIVE_PROFILES = Object.freeze({
  resonant: Object.freeze([1.0, 0.72, 1.0, 0.72]),
  sweep: Object.freeze([1.0, 1.0, 0.68, 0.88]),
  lift: Object.freeze([0.78, 1.0, 1.0, 0.78])
});
const HERO_PROFILES = Object.freeze({
  orbit: Object.freeze([1.0, 0.62, 0.82, 1.0]),
  crest: Object.freeze([0.66, 1.0, 1.0, 0.82])
});
const BASE_RADIUS = Object.freeze({quiet: 10, soft: 20, rounded: 24, expressive: 26, hero: 28});
const MORPH = Object.freeze({
  quiet: new Set(['soft']),
  soft: new Set(['quiet', 'rounded', 'capsule']),
  rounded: new Set(['soft', 'capsule', 'expressive']),
  capsule: new Set(['soft', 'rounded', 'expressive']),
  expressive: new Set(['rounded', 'capsule', 'hero']),
  hero: new Set(['expressive'])
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value)));
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roleOf(value) {
  return ROLES.has(value) ? value : 'soft';
}

function capsuleRadius(width, height) {
  const w = Math.max(0, finite(width));
  const h = Math.max(0, finite(height));
  if (w <= 0 || h <= 0) return 999;
  return Math.min(w, h) / 2;
}

function profileFor(role, profile) {
  if (role === 'expressive') return EXPRESSIVE_PROFILES[profile] || EXPRESSIVE_PROFILES.resonant;
  if (role === 'hero') return HERO_PROFILES[profile] || HERO_PROFILES.orbit;
  return Object.freeze([1, 1, 1, 1]);
}

function baseRadiusFor(role, options = {}) {
  if (role === 'capsule') return capsuleRadius(options.widthPx, options.heightPx);
  const override = Number(options.baseRadiusPx);
  return Number.isFinite(override) && override >= 0 ? override : BASE_RADIUS[role];
}

function cornersFrom(role, options = {}) {
  const base = baseRadiusFor(role, options);
  return profileFor(role, options.profile).map(weight => Math.round(base * weight * 100) / 100);
}

export function resolveConcentricRadius(parentRadiusPx, childInsetPx, opticalCorrectionPx = 0) {
  const parent = Math.max(0, finite(parentRadiusPx));
  const inset = Math.max(0, finite(childInsetPx));
  const correction = finite(opticalCorrectionPx);
  return Math.round(Math.max(0, parent - inset + correction) * 100) / 100;
}

export function resolveConcentricCorners(parentCornersPx, childInsetPx, opticalCorrectionPx = 0) {
  if (!Array.isArray(parentCornersPx) || parentCornersPx.length !== 4) {
    throw new TypeError('Parent corners must contain four radius values');
  }
  return Object.freeze(parentCornersPx.map(radius => resolveConcentricRadius(radius, childInsetPx, opticalCorrectionPx)));
}

export function resolveShape(role = 'soft', options = {}) {
  const semanticRole = roleOf(role);
  const cornersPx = Object.freeze(cornersFrom(semanticRole, options));
  return Object.freeze({
    role: semanticRole,
    profile: semanticRole === 'expressive'
      ? (EXPRESSIVE_PROFILES[options.profile] ? options.profile : 'resonant')
      : semanticRole === 'hero'
        ? (HERO_PROFILES[options.profile] ? options.profile : 'orbit')
        : null,
    cornersPx,
    cssBorderRadius: cornersPx.map(value => `${value}px`).join(' '),
    expressive: semanticRole === 'expressive' || semanticRole === 'hero',
    hero: semanticRole === 'hero'
  });
}

export function canMorphShape(fromRole, toRole) {
  const from = roleOf(fromRole);
  const to = roleOf(toRole);
  if (from === to) return true;
  return Boolean(MORPH[from]?.has(to));
}

function interpolate(a, b, progress) {
  return Math.round((a + (b - a) * progress) * 100) / 100;
}

export function resolveShapeMorph(fromRole, toRole, options = {}) {
  const from = roleOf(fromRole);
  const to = roleOf(toRole);
  if (!canMorphShape(from, to)) {
    throw new RangeError(`Incompatible semantic shape morph: ${from} -> ${to}`);
  }
  const reducedMotion = Boolean(options.reducedMotion);
  const progress = reducedMotion ? (Number(options.progress) >= 1 ? 1 : 0) : clamp(options.progress ?? 1);
  const fromShape = resolveShape(from, options.from || options);
  const toShape = resolveShape(to, options.to || options);
  const cornersPx = Object.freeze(fromShape.cornersPx.map((corner, index) => interpolate(corner, toShape.cornersPx[index], progress)));
  return Object.freeze({
    from,
    to,
    progress,
    reducedMotion,
    cornersPx,
    cssBorderRadius: cornersPx.map(value => `${value}px`).join(' '),
    semanticContinuityRequired: true,
    autonomousDecorativeMorph: false
  });
}

export function applyShape(target, role = 'soft', options = {}) {
  if (!target?.style || typeof target.style.setProperty !== 'function' || !target.dataset) {
    throw new TypeError('Shape target must expose dataset and style.setProperty');
  }
  const shape = resolveShape(role, options);
  target.dataset.glazeShapeV13 = shape.role;
  if (shape.profile) target.dataset.glazeShapeProfile = shape.profile;
  else delete target.dataset.glazeShapeProfile;
  target.style.setProperty('--glz13-shape-radius', shape.cssBorderRadius);
  return shape;
}

export function applyConcentricChild(target, parentCornersPx, insetPx, opticalCorrectionPx = 0) {
  if (!target?.style || typeof target.style.setProperty !== 'function') {
    throw new TypeError('Concentric child target must expose style.setProperty');
  }
  const cornersPx = resolveConcentricCorners(parentCornersPx, insetPx, opticalCorrectionPx);
  const css = cornersPx.map(value => `${value}px`).join(' ');
  target.style.setProperty('--glz13-concentric-radius', css);
  return Object.freeze({cornersPx, cssBorderRadius: css});
}

export const expressiveShapeCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  semanticRoles: Object.freeze(['quiet', 'soft', 'rounded', 'capsule', 'expressive', 'hero', 'morphable']),
  expressiveProfiles: Object.freeze(Object.keys(EXPRESSIVE_PROFILES)),
  heroProfiles: Object.freeze(Object.keys(HERO_PROFILES)),
  concentricFormula: 'max(0, parentRadius - childInset + opticalCorrection)',
  continuousDecorativeMorphingAllowed: false,
  humanOpticalAcceptanceEstablished: false
});
