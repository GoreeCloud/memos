const INPUT_MODALITIES = new Set(['keyboard', 'pointer', 'touch', 'remote', 'assistive', 'unknown']);

export const HARDENING_STATE_PRIORITY = Object.freeze([
  'disabled',
  'focus-visible',
  'pressed',
  'hover',
  'current-or-selected',
  'rest'
]);

export const HARDENING_TARGET_FLOORS = Object.freeze({
  default: 48,
  coarsePointer: 56,
  touchAssistance: 56,
  farView: 56
});

function bool(value) {
  return Boolean(value);
}

function oneOf(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function resolveHardeningTargetFloor(profile = {}, context = {}) {
  const inherited = Math.max(
    HARDENING_TARGET_FLOORS.default,
    finite(profile.targetFloorPx, HARDENING_TARGET_FLOORS.default)
  );

  if (bool(profile.touchAssistance) || bool(profile.farView) || bool(context.farView)) {
    return Math.max(inherited, HARDENING_TARGET_FLOORS.touchAssistance);
  }
  if (bool(context.coarsePointer)) {
    return Math.max(inherited, HARDENING_TARGET_FLOORS.coarsePointer);
  }
  return inherited;
}

export function resolveInteractionPresentation(state = {}, profile = {}, context = {}) {
  const inputModality = oneOf(context.inputModality, INPUT_MODALITIES, 'unknown');
  const disabled = bool(state.disabled) || bool(state.ariaDisabled);
  const focused = bool(state.focused);
  const keyboardLikeFocus = focused && ['keyboard', 'remote', 'assistive'].includes(inputModality);
  const focusVisible = !disabled && (bool(state.focusVisible) || keyboardLikeFocus);
  const pressed = !disabled && bool(state.pressed);
  const hovered = !disabled && bool(state.hovered);
  const current = bool(state.current);
  const selected = bool(state.selected);
  const reducedMotion = bool(profile.reducedMotion);
  const forcedColors = bool(profile.forcedColors);
  const increasedContrast = bool(profile.increasedContrast) || bool(profile.showBoundaries);
  const finePointer = inputModality === 'pointer' && !bool(context.coarsePointer);

  let primaryState = 'rest';
  if (disabled) primaryState = 'disabled';
  else if (focusVisible) primaryState = 'focus-visible';
  else if (pressed) primaryState = 'pressed';
  else if (hovered && finePointer) primaryState = 'hover';
  else if (current || selected) primaryState = 'current-or-selected';

  let focusIndicator = 'none';
  if (focusVisible) {
    if (forcedColors) focusIndicator = 'platform-highlight-outline';
    else if (increasedContrast) focusIndicator = 'strong-focus-ring';
    else focusIndicator = 'standard-focus-ring';
  }

  let transformTreatment = 'none';
  if (!reducedMotion && !disabled) {
    if (pressed) transformTreatment = 'pressed';
    else if (hovered && finePointer) transformTreatment = 'hover-lift';
  }

  return Object.freeze({
    primaryState,
    disabled,
    focused,
    focusVisible,
    pressed,
    hovered,
    current,
    selected,
    inputModality,
    interactionAllowed: !disabled,
    activationAllowed: !disabled,
    focusIndicator,
    focusIndicatorDistinctFromSemanticState: true,
    semanticStateIndicator: current ? 'current' : (selected ? 'selected' : 'none'),
    hoverVisualTreatmentAllowed: !disabled && finePointer,
    hoverMotionAllowed: !disabled && finePointer && !reducedMotion,
    pressMotionAllowed: !disabled && !reducedMotion,
    transformTreatment,
    transitionTreatment: reducedMotion ? 'immediate' : 'bounded',
    semanticActivationWaitsForAnimation: false,
    targetFloorPx: resolveHardeningTargetFloor(profile, context)
  });
}

function issue(code, detail) {
  return Object.freeze({code, detail});
}

export function auditInteractionPresentation(node = {}, profile = {}, context = {}) {
  const issues = [];
  const interactive = bool(node.interactive);
  const presentation = resolveInteractionPresentation(node, profile, context);
  const widthPx = Math.max(0, finite(node.widthPx, 0));
  const heightPx = Math.max(0, finite(node.heightPx, 0));

  if (interactive && widthPx < presentation.targetFloorPx) {
    issues.push(issue('undersized-target-width', `Interactive width is below the ${presentation.targetFloorPx}px resolved floor.`));
  }
  if (interactive && heightPx < presentation.targetFloorPx) {
    issues.push(issue('undersized-target-height', `Interactive height is below the ${presentation.targetFloorPx}px resolved floor.`));
  }
  if (interactive && presentation.disabled && node.activatable !== false) {
    issues.push(issue('disabled-control-activatable', 'Disabled controls must not remain activatable.'));
  }
  if (interactive && node.hoverRequiredToDiscoverAction === true) {
    issues.push(issue('hover-only-affordance', 'Critical actions must remain discoverable without hover.'));
  }
  if (interactive && node.focusable !== false && node.focused === true && presentation.focusVisible && node.focusIndicatorVisible === false) {
    issues.push(issue('focus-not-visible', 'Resolved focus-visible state requires a visible focus indicator.'));
  }
  if (interactive && node.focusIndicatorDistinctFromSemanticState === false) {
    issues.push(issue('focus-semantic-state-collision', 'Focus must remain visually distinct from current or selected state.'));
  }
  if (profile.reducedMotion === true && node.nonessentialTransformEnabled === true) {
    issues.push(issue('reduced-motion-transform-leak', 'Reduced Motion must remove nonessential hover and press transforms.'));
  }
  if (profile.forcedColors === true && node.usesPlatformFocusColor === false && presentation.focusVisible) {
    issues.push(issue('forced-colors-focus-authority', 'Forced Colors focus indicators must use platform color authority.'));
  }

  return Object.freeze({
    pass: issues.length === 0,
    issues: Object.freeze(issues),
    presentation,
    automatedOnly: true,
    establishesHumanAcceptance: false,
    establishesAssistiveTechnologyAcceptance: false,
    establishesPhysicalDeviceAcceptance: false
  });
}

export function createInteractionHardeningResolver(defaultProfile = {}, defaultContext = {}) {
  return Object.freeze({
    kind: 'glaze-v1.3.1-accessibility-interaction-hardening-resolver',
    resolve(state = {}, profile = {}, context = {}) {
      return resolveInteractionPresentation(
        state,
        {...defaultProfile, ...profile},
        {...defaultContext, ...context}
      );
    },
    audit(node = {}, profile = {}, context = {}) {
      return auditInteractionPresentation(
        node,
        {...defaultProfile, ...profile},
        {...defaultContext, ...context}
      );
    }
  });
}

export const accessibilityInteractionHardeningCandidate = Object.freeze({
  hardeningTrack: 'V1.3.1',
  releaseLifecycle: 'development-only',
  lifecycleAuthority: false,
  consumerEligible: false,
  stableBaseline: '1.2.0',
  modifiesStableEntrypoint: false,
  statePriority: HARDENING_STATE_PRIORITY,
  targetFloors: HARDENING_TARGET_FLOORS,
  manualAcceptanceEstablished: false
});
