const SYSTEM_SURFACES = Object.freeze({
  workspace: Object.freeze({ opacity: 1, blurPx: 0, material: 'canvas', critical: false }),
  application: Object.freeze({ opacity: 1, blurPx: 0, material: 'surface', critical: false }),
  'system-overlay': Object.freeze({ opacity: 0.78, blurPx: 22, material: 'regular-glaze', critical: false }),
  'system-panel': Object.freeze({ opacity: 0.88, blurPx: 28, material: 'thick-glaze', critical: false }),
  'critical-system': Object.freeze({ opacity: 0.98, blurPx: 0, material: 'solid-glaze', critical: true }),
});

const PERFORMANCE = Object.freeze({
  full: Object.freeze({ maxBlurPx: 32 }),
  balanced: Object.freeze({ maxBlurPx: 28 }),
  constrained: Object.freeze({ maxBlurPx: 14 }),
  minimal: Object.freeze({ maxBlurPx: 0 }),
});

const MOTION_MS = Object.freeze({
  popover: 180,
  panel: 250,
  search: 280,
  workspace: 360,
  unlock: 340,
});

const REDUCED_MOTION_MS = Object.freeze({
  popover: 80,
  panel: 100,
  search: 100,
  workspace: 120,
  unlock: 120,
});

export const SYSTEM_GLAZE_BUDGET = Object.freeze({
  dominantPanelMax: 1,
  smallFloatingControlsMax: 3,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function resolveSystemPreferences(input = {}) {
  const appearance = ['light', 'dark', 'deep-dark'].includes(input.appearance)
    ? input.appearance
    : 'light';
  const performanceProfile = ['full', 'balanced', 'constrained', 'minimal'].includes(input.performanceProfile)
    ? input.performanceProfile
    : 'balanced';
  const textScalePercent = Number.isFinite(Number(input.textScalePercent))
    ? clamp(Number(input.textScalePercent), 100, 400)
    : 100;

  const forcedColors = Boolean(input.forcedColors);
  const reducedTransparency = Boolean(input.reducedTransparency);
  const reducedMotion = Boolean(input.reducedMotion);
  const increasedContrast = Boolean(input.increasedContrast);
  const touchAssistance = Boolean(input.touchAssistance);
  const largeText = Boolean(input.largeText) || textScalePercent >= 200;

  return Object.freeze({
    appearance,
    performanceProfile,
    forcedColors,
    reducedTransparency,
    reducedMotion,
    increasedContrast,
    touchAssistance,
    largeText,
    textScalePercent: largeText ? Math.max(200, textScalePercent) : textScalePercent,
    touchHitAreaMinPx: touchAssistance ? 56 : 48,
    systemTransparency: forcedColors || reducedTransparency ? 'solid' : 'glaze',
    boundaryStrength: forcedColors || increasedContrast ? 'strong' : 'standard',
    semanticColorMode: forcedColors ? 'platform' : 'glaze-semantic',
    wallpaperMayOverrideSemanticColor: false,
  });
}

export function resolveSystemSurface(surfaceClass, preferences = resolveSystemPreferences()) {
  const base = SYSTEM_SURFACES[surfaceClass];
  if (!base) throw new TypeError(`Unknown GLAZE UI V1.0 system surface: ${surfaceClass}`);
  const performance = PERFORMANCE[preferences.performanceProfile] || PERFORMANCE.balanced;
  const forceSolid = base.critical || preferences.forcedColors || preferences.reducedTransparency;
  const blurPx = forceSolid ? 0 : Math.min(base.blurPx, performance.maxBlurPx);
  const opacity = forceSolid ? 1 : base.opacity;

  return Object.freeze({
    surfaceClass,
    material: forceSolid && !base.critical ? 'opaque-raised' : base.material,
    opacity,
    blurPx,
    solid: forceSolid || blurPx === 0,
    critical: base.critical,
    nestedBackdropBlurAllowed: false,
  });
}

export function resolveSystemMotion(role, preferences = resolveSystemPreferences()) {
  if (!(role in MOTION_MS)) throw new TypeError(`Unknown GLAZE UI V1.0 motion role: ${role}`);
  const table = preferences.reducedMotion ? REDUCED_MOTION_MS : MOTION_MS;
  return Object.freeze({
    role,
    durationMs: table[role],
    reduced: preferences.reducedMotion,
    keyboardTraversalWaitsForAnimation: false,
    directManipulationTracksInput: true,
  });
}

export function evaluateSystemGlazeBudget({
  dominantPanels = 0,
  smallFloatingControls = 0,
  explicitException = false,
} = {}) {
  const panels = Math.max(0, Number(dominantPanels) || 0);
  const controls = Math.max(0, Number(smallFloatingControls) || 0);
  const reasons = [];

  if (!explicitException && panels > SYSTEM_GLAZE_BUDGET.dominantPanelMax) {
    reasons.push(`dominant Glaze panel count ${panels} exceeds ${SYSTEM_GLAZE_BUDGET.dominantPanelMax}`);
  }
  if (!explicitException && controls > SYSTEM_GLAZE_BUDGET.smallFloatingControlsMax) {
    reasons.push(`small floating Glaze control count ${controls} exceeds ${SYSTEM_GLAZE_BUDGET.smallFloatingControlsMax}`);
  }

  return Object.freeze({
    accepted: reasons.length === 0,
    dominantPanels: panels,
    dominantPanelMax: SYSTEM_GLAZE_BUDGET.dominantPanelMax,
    smallFloatingControls: controls,
    smallFloatingControlsMax: SYSTEM_GLAZE_BUDGET.smallFloatingControlsMax,
    explicitException: Boolean(explicitException),
    reasons,
  });
}

function visible(node) {
  const style = node.ownerDocument?.defaultView?.getComputedStyle(node);
  if (!style || style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function measureSystemGlazeBudget(root = document) {
  let dominantPanels = 0;
  let smallFloatingControls = 0;

  for (const node of root.querySelectorAll('[data-glz1-dominant-glaze="true"]')) {
    if (visible(node)) dominantPanels += 1;
  }
  for (const node of root.querySelectorAll('[data-glz1-floating-glaze="true"]')) {
    if (visible(node)) smallFloatingControls += 1;
  }

  const explicitException = root.documentElement?.dataset.glz1BudgetException === 'true';
  return evaluateSystemGlazeBudget({ dominantPanels, smallFloatingControls, explicitException });
}

export function modeToSystemPreferences(mode, defaults = {}) {
  const input = { ...defaults };
  if (mode === 'reduced-transparency') input.reducedTransparency = true;
  if (mode === 'reduced-motion') input.reducedMotion = true;
  if (mode === 'increased-contrast') input.increasedContrast = true;
  if (mode === 'large-text') {
    input.largeText = true;
    input.textScalePercent = 200;
  }
  if (mode === 'touch-assistance') input.touchAssistance = true;
  if (mode === 'forced-colors') input.forcedColors = true;
  return input;
}

export function applySystemShellRuntime({ root = document.documentElement, shell, input = {} } = {}) {
  if (!shell) throw new TypeError('GLAZE UI V1.0 system runtime requires a shell element');
  const prefs = resolveSystemPreferences(input);

  root.dataset.glzAppearance = prefs.appearance;
  root.dataset.glzMotion = prefs.reducedMotion ? 'reduced' : 'full';
  root.dataset.glzTransparency = prefs.reducedTransparency ? 'reduced' : 'standard';
  root.dataset.glzContrast = prefs.increasedContrast ? 'increased' : 'standard';
  root.dataset.glzTouchAssistance = prefs.touchAssistance ? 'true' : 'false';
  root.dataset.glzTextScale = String(prefs.textScalePercent);
  root.dataset.glzPerformance = prefs.performanceProfile;
  if (prefs.appearance === 'deep-dark') root.setAttribute('data-glz-appearance', 'deep-dark');
  if (prefs.reducedTransparency) root.classList.add('glz1-reduced-transparency');

  shell.dataset.effectiveTargetPx = String(prefs.touchHitAreaMinPx);
  shell.dataset.semanticColorMode = prefs.semanticColorMode;
  shell.dataset.boundaryStrength = prefs.boundaryStrength;

  for (const node of shell.querySelectorAll('[data-glz1-surface]')) {
    const resolved = resolveSystemSurface(node.dataset.glz1Surface, prefs);
    node.dataset.effectiveBlur = String(resolved.blurPx);
    node.dataset.effectiveSolid = resolved.solid ? 'true' : 'false';
    node.style.setProperty('--glz1-effective-blur', `${resolved.blurPx}px`);
  }

  return prefs;
}
