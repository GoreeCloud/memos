export const DEFAULT_GLAZE_ACCENT = '#68AEE0';

export const COLOR_AUTHORITY_PRECEDENCE = Object.freeze([
  'accessibility',
  'semantic',
  'product-identity',
  'user-accent',
  'context-accent',
  'default-glaze-accent'
]);

const APPEARANCE = new Set(['light', 'dark', 'deep-dark']);
const PROTECTED_SEMANTIC_ROLES = new Set([
  'success',
  'information',
  'warning',
  'danger',
  'protected',
  'restricted',
  'online',
  'offline',
  'syncing',
  'unavailable',
  'security-status',
  'privacy-status',
  'recovery-status'
]);
const CONTEXT_ALLOWED_ROLES = new Set([
  'accent',
  'progress',
  'control',
  'live-glaze',
  'local-highlight'
]);

const APPEARANCE_CONFIG = Object.freeze({
  light: Object.freeze({
    canvas: '#F4F8FA',
    primaryL: 0.52,
    secondaryL: 0.62,
    tertiaryL: 0.58,
    subtleL: 0.94,
    emphasisL: 0.76,
    focusL: 0.48
  }),
  dark: Object.freeze({
    canvas: '#151C22',
    primaryL: 0.72,
    secondaryL: 0.66,
    tertiaryL: 0.76,
    subtleL: 0.28,
    emphasisL: 0.44,
    focusL: 0.74
  }),
  'deep-dark': Object.freeze({
    canvas: '#070C11',
    primaryL: 0.78,
    secondaryL: 0.71,
    tertiaryL: 0.82,
    subtleL: 0.20,
    emphasisL: 0.38,
    focusL: 0.80
  })
});

const ON_ACCENT_LIGHT = '#FBFDFE';
const ON_ACCENT_DARK = '#0E1419';
const MAX_CONTEXT_CHROMA = 0.10;
const MIN_ON_ACCENT_CONTRAST = 4.5;
const MIN_FOCUS_CONTRAST = 3.0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHue(value) {
  const hue = Number(value);
  if (!Number.isFinite(hue)) return 0;
  return ((hue % 360) + 360) % 360;
}

function normalizeChannel(value) {
  const channel = Number(value);
  if (!Number.isFinite(channel)) return null;
  return clamp(Math.round(channel), 0, 255);
}

function parseHex(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) hex = [...hex].map(char => char + char).join('');
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  };
}

function parseRgbObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const r = normalizeChannel(value.r);
  const g = normalizeChannel(value.g);
  const b = normalizeChannel(value.b);
  if ([r, g, b].some(channel => channel === null)) return null;
  return {r, g, b};
}

function toHexChannel(value) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0').toUpperCase();
}

function rgbToHex({r, g, b}) {
  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
}

export function normalizeAccentSeed(value = DEFAULT_GLAZE_ACCENT) {
  const parsed = parseHex(value) || parseRgbObject(value) || parseHex(DEFAULT_GLAZE_ACCENT);
  return rgbToHex(parsed);
}

function srgbChannelToLinear(channel) {
  const value = clamp(channel / 255, 0, 1);
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function linearChannelToSrgb(channel) {
  return channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * (channel ** (1 / 2.4)) - 0.055;
}

function rgbToOklch(rgb) {
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  const L = 0.2104542553 * lRoot + 0.7936177850 * mRoot - 0.0040720468 * sRoot;
  const a = 1.9779984951 * lRoot - 2.4285922050 * mRoot + 0.4505937099 * sRoot;
  const bLab = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.8086757660 * sRoot;
  const C = Math.hypot(a, bLab);
  const h = C < 1e-7 ? 0 : normalizeHue(Math.atan2(bLab, a) * 180 / Math.PI);
  return {L, C, h};
}

function oklchToLinearRgb(L, C, h) {
  const radians = normalizeHue(h) * Math.PI / 180;
  const a = C * Math.cos(radians);
  const b = C * Math.sin(radians);

  const lRoot = L + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  };
}

function linearRgbInGamut(rgb) {
  const epsilon = 1e-7;
  return Object.values(rgb).every(value => value >= -epsilon && value <= 1 + epsilon);
}

function linearRgbToRgb(rgb) {
  return {
    r: clamp(linearChannelToSrgb(clamp(rgb.r, 0, 1)), 0, 1) * 255,
    g: clamp(linearChannelToSrgb(clamp(rgb.g, 0, 1)), 0, 1) * 255,
    b: clamp(linearChannelToSrgb(clamp(rgb.b, 0, 1)), 0, 1) * 255
  };
}

function oklchToHexGamutMapped(L, C, h) {
  const lightness = clamp(Number(L), 0, 1);
  let chroma = Math.max(0, Number(C) || 0);
  const hue = normalizeHue(h);
  let linear = oklchToLinearRgb(lightness, chroma, hue);

  for (let index = 0; index < 48 && !linearRgbInGamut(linear); index += 1) {
    chroma *= 0.94;
    linear = oklchToLinearRgb(lightness, chroma, hue);
  }

  return rgbToHex(linearRgbToRgb(linear));
}

function relativeLuminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) throw new TypeError(`Invalid color: ${hex}`);
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground, background) {
  const a = relativeLuminance(normalizeAccentSeed(foreground));
  const b = relativeLuminance(normalizeAccentSeed(background));
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function bestOnAccent(background) {
  const lightRatio = contrastRatio(ON_ACCENT_LIGHT, background);
  const darkRatio = contrastRatio(ON_ACCENT_DARK, background);
  return lightRatio >= darkRatio ? ON_ACCENT_LIGHT : ON_ACCENT_DARK;
}

function ensureToneContrast({L, C, h}, background, minimumRatio) {
  const initial = oklchToHexGamutMapped(L, C, h);
  if (contrastRatio(initial, background) >= minimumRatio) return initial;

  for (let offset = 0.02; offset <= 0.96; offset += 0.02) {
    const darkerL = clamp(L - offset, 0.02, 0.98);
    const lighterL = clamp(L + offset, 0.02, 0.98);
    const darker = oklchToHexGamutMapped(darkerL, C, h);
    if (contrastRatio(darker, background) >= minimumRatio) return darker;
    const lighter = oklchToHexGamutMapped(lighterL, C, h);
    if (contrastRatio(lighter, background) >= minimumRatio) return lighter;
  }

  const black = '#000000';
  const white = '#FFFFFF';
  return contrastRatio(black, background) >= contrastRatio(white, background) ? black : white;
}

function appearanceOf(value) {
  return APPEARANCE.has(value) ? value : 'light';
}

function baseAccentChroma(seed) {
  if (seed.C < 0.01) return 0;
  return clamp(seed.C, 0.04, 0.18);
}

export function deriveAccentPalette(seedValue = DEFAULT_GLAZE_ACCENT, options = {}) {
  const appearance = appearanceOf(options.appearance);
  const config = APPEARANCE_CONFIG[appearance];
  const seedHex = normalizeAccentSeed(seedValue);
  const seed = rgbToOklch(parseHex(seedHex));
  const chroma = baseAccentChroma(seed);

  const primary = oklchToHexGamutMapped(config.primaryL, chroma, seed.h);
  const secondary = oklchToHexGamutMapped(config.secondaryL, chroma * 0.72, seed.h);
  const tertiary = oklchToHexGamutMapped(config.tertiaryL, chroma * 0.68, seed.h + 55);
  const subtleContainer = oklchToHexGamutMapped(config.subtleL, chroma * 0.25, seed.h);
  const highEmphasisContainer = oklchToHexGamutMapped(config.emphasisL, chroma * 0.58, seed.h);
  const onAccent = bestOnAccent(primary);
  const focus = ensureToneContrast(
    {L: config.focusL, C: Math.max(chroma * 0.90, chroma === 0 ? 0 : 0.035), h: seed.h},
    config.canvas,
    MIN_FOCUS_CONTRAST
  );

  const roles = Object.freeze({
    primary,
    secondary,
    tertiary,
    subtleContainer,
    highEmphasisContainer,
    onAccent,
    focus,
    selection: subtleContainer
  });

  return Object.freeze({
    source: seedValue == null ? 'default-glaze-accent' : 'local-user-accent',
    seed: seedHex,
    appearance,
    canvas: config.canvas,
    perceptualModel: 'OKLCH',
    roles,
    validation: Object.freeze({
      onAccentContrast: contrastRatio(onAccent, primary),
      onAccentMinimum: MIN_ON_ACCENT_CONTRAST,
      focusContrast: contrastRatio(focus, config.canvas),
      focusMinimum: MIN_FOCUS_CONTRAST,
      colorOnlyStateAllowed: false
    })
  });
}

export function deriveContextAccent(summary, options = {}) {
  const parsed = parseHex(summary) || parseRgbObject(summary);
  if (!parsed) return null;
  const appearance = appearanceOf(options.appearance);
  const config = APPEARANCE_CONFIG[appearance];
  const seed = rgbToOklch(parsed);
  const chroma = Math.min(seed.C, MAX_CONTEXT_CHROMA);
  return Object.freeze({
    color: oklchToHexGamutMapped(config.primaryL, chroma, seed.h),
    appearance,
    source: 'producer-supplied-local-color-summary',
    perceptualModel: 'OKLCH',
    maximumChroma: MAX_CONTEXT_CHROMA,
    allowedRoles: Object.freeze([...CONTEXT_ALLOWED_ROLES]),
    networkRequired: false,
    telemetryAuthorized: false
  });
}

function valueForRole(authority, role) {
  if (authority == null) return undefined;
  if (typeof authority === 'string') return authority;
  if (typeof authority !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(authority, role)) return authority[role];
  if (Object.prototype.hasOwnProperty.call(authority, '*')) return authority['*'];
  return undefined;
}

export function resolveColorValue(role, authorities = {}) {
  if (typeof role !== 'string' || !role) throw new TypeError('A semantic or presentation color role is required');
  const sources = authorities && typeof authorities === 'object' ? authorities : {};
  const protectedRole = PROTECTED_SEMANTIC_ROLES.has(role);

  const precedence = protectedRole
    ? ['accessibility', 'semantic']
    : COLOR_AUTHORITY_PRECEDENCE;

  for (const authorityName of precedence) {
    const key = authorityName === 'product-identity'
      ? 'productIdentity'
      : authorityName === 'user-accent'
        ? 'userAccent'
        : authorityName === 'context-accent'
          ? 'contextAccent'
          : authorityName === 'default-glaze-accent'
            ? 'defaultAccent'
            : authorityName;
    const value = valueForRole(sources[key], role);
    if (value !== undefined && value !== null) {
      return Object.freeze({value, authority: authorityName, protectedRole});
    }
  }

  if (!protectedRole) {
    return Object.freeze({
      value: DEFAULT_GLAZE_ACCENT,
      authority: 'default-glaze-accent',
      protectedRole: false
    });
  }

  return Object.freeze({value: null, authority: null, protectedRole: true});
}

export function contextRoleAllowed(role) {
  return CONTEXT_ALLOWED_ROLES.has(role) && !PROTECTED_SEMANTIC_ROLES.has(role);
}

export const dynamicColorCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  lifecycleAuthority: false,
  perceptualModel: 'OKLCH',
  dependencyFree: true,
  networkRequired: false,
  telemetryAuthorized: false,
  protectedSemanticRoles: Object.freeze([...PROTECTED_SEMANTIC_ROLES]),
  contextAllowedRoles: Object.freeze([...CONTEXT_ALLOWED_ROLES]),
  minimumContrast: Object.freeze({
    onAccent: MIN_ON_ACCENT_CONTRAST,
    focusAgainstCanvas: MIN_FOCUS_CONTRAST
  })
});
