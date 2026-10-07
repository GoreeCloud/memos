const ROLES = new Set(['display', 'title', 'heading', 'body', 'label', 'caption', 'numeral']);
const ENVIRONMENTS = new Set(['compact', 'medium', 'expanded', 'workspace', 'farView', 'wearable']);
const EXPRESSIONS = new Set(['calm', 'balanced', 'expressive']);
const STATES = new Set(['default', 'current', 'selected', 'prominent', 'compressed']);

const BASE_STYLES = Object.freeze({
  display: Object.freeze({lineHeight: 1.04, weight: 600, letterSpacing: '-0.03em'}),
  title: Object.freeze({lineHeight: 1.14, weight: 600, letterSpacing: '-0.02em'}),
  heading: Object.freeze({lineHeight: 1.2, weight: 600, letterSpacing: '-0.01em'}),
  body: Object.freeze({lineHeight: 1.55, weight: 400, letterSpacing: '0'}),
  label: Object.freeze({lineHeight: 1.25, weight: 500, letterSpacing: '0.01em'}),
  caption: Object.freeze({lineHeight: 1.35, weight: 400, letterSpacing: '0.01em'}),
  numeral: Object.freeze({lineHeight: 1.05, weight: 600, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums lining-nums'})
});

const ENVIRONMENT_SIZE_REM = Object.freeze({
  compact: Object.freeze({display: 2.5, title: 1.5, heading: 1.25, body: 1, label: 0.875, caption: 0.8125, numeral: 1.75}),
  medium: Object.freeze({display: 3, title: 1.75, heading: 1.375, body: 1, label: 0.875, caption: 0.8125, numeral: 2}),
  expanded: Object.freeze({display: 3.5, title: 1.875, heading: 1.5, body: 1, label: 0.875, caption: 0.8125, numeral: 2.25}),
  workspace: Object.freeze({display: 3.25, title: 1.75, heading: 1.375, body: 1, label: 0.8125, caption: 0.75, numeral: 2}),
  farView: Object.freeze({display: 4.5, title: 2.5, heading: 2, body: 1.5, label: 1.25, caption: 1.125, numeral: 3.5}),
  wearable: Object.freeze({display: 2, title: 1.375, heading: 1.125, body: 1, label: 0.875, caption: 0.8125, numeral: 1.75})
});

const EXPRESSION = Object.freeze({
  calm: Object.freeze({weightDelta: 0, gradeDelta: 0, compressedWidthPercent: 98}),
  balanced: Object.freeze({weightDelta: 50, gradeDelta: 20, compressedWidthPercent: 96}),
  expressive: Object.freeze({weightDelta: 75, gradeDelta: 35, compressedWidthPercent: 94})
});

const AXIS_TAGS = Object.freeze({weight: 'wght', width: 'wdth', opticalSize: 'opsz', grade: 'GRAD'});

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function normalizeRole(role) {
  return ROLES.has(role) ? role : 'body';
}

function normalizeEnvironment(environment) {
  if (environment === 'far-view') return 'farView';
  return ENVIRONMENTS.has(environment) ? environment : 'medium';
}

function normalizeExpression(expression) {
  return EXPRESSIONS.has(expression) ? expression : 'balanced';
}

function normalizeState(state) {
  return STATES.has(state) ? state : 'default';
}

function normalizeCapability(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const min = finite(raw.min, NaN);
  const max = finite(raw.max, NaN);
  const defaultValue = finite(raw.default, NaN);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return null;
  return Object.freeze({
    min,
    max,
    default: Number.isFinite(defaultValue) ? clamp(defaultValue, min, max) : clamp((min + max) / 2, min, max)
  });
}

function capabilityFor(capabilities, tag) {
  if (!capabilities || typeof capabilities !== 'object') return null;
  return normalizeCapability(capabilities[tag]);
}

function resolvedAxis(capabilities, tag, requested) {
  const capability = capabilityFor(capabilities, tag);
  if (!capability) return null;
  return round(clamp(finite(requested, capability.default), capability.min, capability.max), 2);
}

function staticWeight(value) {
  return clamp(Math.round(value / 100) * 100, 100, 900);
}

function stateIsEmphasized(state) {
  return state === 'current' || state === 'selected' || state === 'prominent';
}

function variationSettings(settings) {
  const entries = Object.entries(settings).filter(([, value]) => value !== null);
  return entries.map(([tag, value]) => `"${tag}" ${value}`).join(', ');
}

export function resolveTypographyEnvironment(environment = 'medium') {
  const resolved = normalizeEnvironment(environment);
  return Object.freeze({
    environment: resolved,
    roleSizeRem: ENVIRONMENT_SIZE_REM[resolved],
    uniformScaleOnly: false
  });
}

export function resolveTypography(role = 'body', options = {}) {
  const semanticRole = normalizeRole(role);
  const environment = normalizeEnvironment(options.environment);
  const expression = normalizeExpression(options.expression);
  const state = normalizeState(options.state);
  const base = BASE_STYLES[semanticRole];
  const profile = EXPRESSION[expression];
  const rootFontSizePx = clamp(finite(options.rootFontSizePx, 16), 8, 32);
  const textScale = clamp(finite(options.textScale, 1), 0.5, 4);
  const largeText = textScale >= 2 || Boolean(options.largeText);
  const baseSizeRem = ENVIRONMENT_SIZE_REM[environment][semanticRole];
  const sizeRem = round(baseSizeRem * textScale);
  const fontSizePx = round(sizeRem * rootFontSizePx, 2);
  const emphasized = stateIsEmphasized(state);
  const requestedWeight = clamp(base.weight + (emphasized ? profile.weightDelta : 0), 100, 900);
  const fallbackWeight = staticWeight(requestedWeight);
  const requestedWidth = state === 'compressed' && !largeText ? profile.compressedWidthPercent : 100;
  const requestedGrade = emphasized ? profile.gradeDelta : 0;
  const capabilities = options.axisCapabilities;

  const axes = Object.freeze({
    wght: resolvedAxis(capabilities, AXIS_TAGS.weight, requestedWeight),
    wdth: state === 'compressed' && !largeText ? resolvedAxis(capabilities, AXIS_TAGS.width, requestedWidth) : null,
    opsz: resolvedAxis(capabilities, AXIS_TAGS.opticalSize, fontSizePx),
    GRAD: emphasized ? resolvedAxis(capabilities, AXIS_TAGS.grade, requestedGrade) : null
  });

  const settings = variationSettings(axes);
  return Object.freeze({
    role: semanticRole,
    environment,
    expression,
    state,
    textScale,
    largeText,
    sizeRem,
    fontSizePx,
    fontSize: `${sizeRem}rem`,
    lineHeight: base.lineHeight,
    fontWeight: fallbackWeight,
    letterSpacing: base.letterSpacing,
    fontVariantNumeric: base.fontVariantNumeric || 'normal',
    fontVariationSettings: settings || 'normal',
    variableAxesApplied: Object.freeze(Object.fromEntries(Object.entries(axes).filter(([, value]) => value !== null))),
    widthCompressionApplied: axes.wdth !== null,
    semanticRolePreserved: true,
    continuousAutonomousTypeMotion: false
  });
}

export function applyTypography(target, role = 'body', options = {}) {
  if (!target?.style || typeof target.style.setProperty !== 'function' || !target.dataset) {
    throw new TypeError('Typography target must expose dataset and style.setProperty');
  }
  const result = resolveTypography(role, options);
  target.dataset.glazeTypeV13 = result.role;
  target.dataset.glazeTypeEnvironment = result.environment;
  target.dataset.glazeExpression = result.expression;
  target.style.setProperty('--glz13-type-size', result.fontSize);
  target.style.setProperty('--glz13-type-line-height', String(result.lineHeight));
  target.style.setProperty('--glz13-type-weight', String(result.fontWeight));
  target.style.setProperty('--glz13-type-letter-spacing', result.letterSpacing);
  target.style.setProperty('font-size', result.fontSize);
  target.style.setProperty('line-height', String(result.lineHeight));
  target.style.setProperty('font-weight', String(result.fontWeight));
  target.style.setProperty('letter-spacing', result.letterSpacing);
  target.style.setProperty('font-variant-numeric', result.fontVariantNumeric);
  target.style.setProperty('font-variation-settings', result.fontVariationSettings);
  return result;
}

export const responsiveTypographyCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  semanticRoles: Object.freeze([...ROLES]),
  environments: Object.freeze([...ENVIRONMENTS]),
  expressionProfiles: Object.freeze([...EXPRESSIONS]),
  variableAxisTags: AXIS_TAGS,
  remoteRuntimeFontDependencyAllowed: false,
  continuousAutonomousAxisAnimationAllowed: false,
  accessibilityOutranksExpression: true,
  humanReadabilityAcceptanceEstablished: false
});
