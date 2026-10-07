const MOTION_ROLES = new Set(['direct', 'micro', 'standard', 'connected', 'expressive', 'spatial', 'reduced', 'minimal']);
const PROFILES = new Set(['full', 'reduced', 'minimal']);
const CONNECTED_TRANSFORMATIONS = new Set([
  'search-capsule-to-search-panel',
  'navigation-item-to-destination-header',
  'quick-control-to-expanded-control',
  'mini-player-to-player',
  'notification-to-detail',
  'floating-toolbar-to-contextual-sheet',
  'thumbnail-to-detail'
]);

const FULL = Object.freeze({
  direct: Object.freeze({durationMs: 0, distancePx: 0, easing: 'linear'}),
  micro: Object.freeze({durationMs: 160, distancePx: 2, easing: 'cubic-bezier(0.2, 0, 0, 1)'}),
  standard: Object.freeze({durationMs: 240, distancePx: 8, easing: 'cubic-bezier(0.16, 1, 0.3, 1)'}),
  connected: Object.freeze({durationMs: 360, distancePx: 16, easing: 'cubic-bezier(0.16, 1, 0.3, 1)'}),
  expressive: Object.freeze({durationMs: 360, distancePx: 16, easing: 'cubic-bezier(0.16, 1, 0.3, 1)'}),
  spatial: Object.freeze({durationMs: 480, distancePx: 48, easing: 'cubic-bezier(0.16, 1, 0.3, 1)'})
});

const REDUCED = Object.freeze({
  direct: FULL.direct,
  micro: Object.freeze({durationMs: 120, distancePx: 0, easing: 'cubic-bezier(0.2, 0, 0, 1)'}),
  standard: Object.freeze({durationMs: 180, distancePx: 0, easing: 'cubic-bezier(0.16, 1, 0.3, 1)'}),
  connected: Object.freeze({durationMs: 270, distancePx: 0, easing: 'cubic-bezier(0.16, 1, 0.3, 1)'}),
  expressive: Object.freeze({durationMs: 270, distancePx: 0, easing: 'cubic-bezier(0.16, 1, 0.3, 1)'}),
  spatial: Object.freeze({durationMs: 360, distancePx: 0, easing: 'cubic-bezier(0.16, 1, 0.3, 1)'})
});

function normalizeRole(role) {
  return MOTION_ROLES.has(role) ? role : 'standard';
}

function normalizeProfile(profile) {
  return PROFILES.has(profile) ? profile : 'full';
}

function baseRole(role, options) {
  if (role === 'reduced') return 'standard';
  if (role === 'minimal') return 'standard';
  if (role === 'spatial' && !options.relationshipJustified) return 'connected';
  return role;
}

function resolvedProfile(role, options) {
  if (role === 'minimal' || options.reducedMotion === true) return 'minimal';
  if (role === 'reduced') return 'reduced';
  return normalizeProfile(options.profile);
}

export function resolveMotion(role = 'standard', options = {}) {
  const requestedRole = normalizeRole(role);
  const semanticRole = baseRole(requestedRole, options);
  const profile = resolvedProfile(requestedRole, options);
  let timing;
  if (profile === 'minimal') timing = {durationMs: 0, distancePx: 0, easing: 'linear'};
  else if (profile === 'reduced') timing = REDUCED[semanticRole] || REDUCED.standard;
  else timing = FULL[semanticRole] || FULL.standard;

  return Object.freeze({
    requestedRole,
    role: semanticRole,
    profile,
    durationMs: timing.durationMs,
    distancePx: timing.distancePx,
    easing: timing.easing,
    relationshipJustified: semanticRole !== 'spatial' || Boolean(options.relationshipJustified),
    spatialFallbackApplied: requestedRole === 'spatial' && semanticRole !== 'spatial',
    stateCommitWaitsForAnimation: false,
    focusWaitsForAnimation: false,
    directManipulationTracksImmediately: semanticRole === 'direct',
    userDrivenMotionInterruptible: true,
    taskCompletionMayBeDelayedByMotion: false,
    continuousAutonomousMotion: false,
    newSpringRuntimeUsed: false
  });
}

export function resolveConnectedTransformation(transformation, options = {}) {
  const id = String(transformation || '');
  const knownRelationship = CONNECTED_TRANSFORMATIONS.has(id);
  const largeSpatial = knownRelationship && Boolean(options.largeSpatialJustified);
  const role = knownRelationship ? (largeSpatial ? 'spatial' : 'connected') : 'standard';
  const motion = resolveMotion(role, {
    ...options,
    relationshipJustified: knownRelationship && (role !== 'spatial' || largeSpatial)
  });
  return Object.freeze({
    transformation: id,
    knownRelationship,
    connectedIdentityUsed: knownRelationship,
    semanticIdentityPreserved: true,
    currentTaskPreserved: true,
    currentDestinationPreserved: true,
    selectionPreserved: true,
    typedInputPreserved: true,
    unsavedWorkPreserved: true,
    pageReloadRequired: false,
    reverseOnCloseWherePractical: knownRelationship,
    motion
  });
}

export function resolveDirectManipulation(options = {}) {
  return Object.freeze({
    trackingDurationMs: 0,
    easing: 'linear',
    tracksInputImmediately: true,
    userMayInterrupt: true,
    optionalSettleOnlyAfterRelease: true,
    settleBlocksStateChange: false,
    reducedMotionStillTracksInput: true,
    settleMotion: options.settle === false ? null : resolveMotion('micro', options)
  });
}

export function applyMotionSemantics(target, role = 'standard', options = {}) {
  if (!target?.dataset || !target?.style || typeof target.style.setProperty !== 'function') {
    throw new TypeError('Motion target must expose dataset and style.setProperty');
  }
  const result = resolveMotion(role, options);
  target.dataset.glazeMotionV13 = result.role;
  target.dataset.glazeMotionProfile = result.profile;
  target.style.setProperty('--glz13-motion-duration', `${result.durationMs}ms`);
  target.style.setProperty('--glz13-motion-distance', `${result.distancePx}px`);
  target.style.setProperty('--glz13-motion-easing', result.easing);
  return result;
}

export const motionContinuityCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  semanticRoles: Object.freeze([...MOTION_ROLES]),
  connectedTransformations: Object.freeze([...CONNECTED_TRANSFORMATIONS]),
  stateIndependentOfAnimationCompletion: true,
  focusIndependentOfAnimationCompletion: true,
  spatialMotionRequiresRelationshipJustification: true,
  decorativeContinuousMotionAllowed: false,
  newSpringRuntimeIntroduced: false,
  physicalDeviceMotionAcceptanceEstablished: false,
  humanMotionAcceptanceEstablished: false
});
