const FREQUENCY = new Set(['frequent', 'occasional', 'rare']);
const MODALITY = new Set(['touch', 'pointer', 'keyboard', 'directional', 'assistive-switch', 'unknown']);
const HIGH_PRIORITY_ROLES = new Set(['primary-action', 'navigation', 'search-initiation']);

export const DEFAULT_COMPACT_REVIEW_BANDS = Object.freeze({
  viewing: Object.freeze({start: 0.00, end: 0.42}),
  transition: Object.freeze({start: 0.30, end: 0.74}),
  interaction: Object.freeze({start: 0.62, end: 1.00})
});

export const REACHABILITY_TARGET_FLOORS = Object.freeze({
  touch: 48,
  touchAssistance: 56
});

const DEFAULT_PENALTIES = Object.freeze({
  safeAreaObstruction: 35,
  undersizedTarget: 25,
  primaryActionOutsideInteraction: 20,
  frequentActionOutsideInteraction: 14,
  navigationOutsideInteraction: 14,
  searchInitiationOutsideInteraction: 12,
  nearPhysicalEdge: 6,
  maxVerticalTravel: 15
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value)));
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function bounded(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function validateBand(name, band) {
  const start = Number(band?.start);
  const end = Number(band?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 1 || start > end) {
    throw new RangeError(`Invalid ${name} reachability band`);
  }
  return Object.freeze({start, end});
}

export function normalizeReachabilityBands(value = DEFAULT_COMPACT_REVIEW_BANDS) {
  return Object.freeze({
    viewing: validateBand('viewing', value.viewing),
    transition: validateBand('transition', value.transition),
    interaction: validateBand('interaction', value.interaction)
  });
}

export function classifyReachabilityZone(yNormalized, bands = DEFAULT_COMPACT_REVIEW_BANDS) {
  const y = clamp(yNormalized);
  const normalizedBands = normalizeReachabilityBands(bands);
  const zones = [];
  for (const name of ['viewing', 'transition', 'interaction']) {
    const band = normalizedBands[name];
    if (y >= band.start && y <= band.end) zones.push(name);
  }
  return Object.freeze({
    yNormalized: y,
    zones: Object.freeze(zones),
    preferredZone: zones.includes('interaction')
      ? 'interaction'
      : zones.includes('transition')
        ? 'transition'
        : 'viewing'
  });
}

export function deriveNormalizedActionPosition(rect, viewport, safeArea = {}) {
  const viewportHeight = finite(viewport?.height, 0);
  if (viewportHeight <= 0) throw new RangeError('Viewport height must be positive');
  const topInset = Math.max(0, finite(safeArea.top, 0));
  const bottomInset = Math.max(0, finite(safeArea.bottom, 0));
  const usableHeight = viewportHeight - topInset - bottomInset;
  if (usableHeight <= 0) throw new RangeError('Safe-area insets consume the entire viewport');
  const top = finite(rect?.top, topInset);
  const height = Math.max(0, finite(rect?.height, 0));
  const center = top + height / 2;
  return clamp((center - topInset) / usableHeight);
}

function normalizeAction(action = {}, options = {}) {
  const modality = bounded(action.inputModality, MODALITY, 'touch');
  const yNormalized = Number.isFinite(Number(action.yNormalized))
    ? clamp(action.yNormalized)
    : deriveNormalizedActionPosition(action.rect, options.viewport, options.safeArea);
  return Object.freeze({
    id: String(action.id || 'unnamed-action'),
    role: String(action.role || 'contextual-action'),
    frequency: bounded(action.frequency, FREQUENCY, 'occasional'),
    inputModality: modality,
    yNormalized,
    widthPx: Math.max(0, finite(action.widthPx ?? action.rect?.width, 0)),
    heightPx: Math.max(0, finite(action.heightPx ?? action.rect?.height, 0)),
    edgeInsetPx: Math.max(0, finite(action.edgeInsetPx, Number.POSITIVE_INFINITY)),
    safeAreaObscured: Boolean(action.safeAreaObscured),
    touchAssistance: Boolean(action.touchAssistance)
  });
}

function targetFloor(action) {
  if (action.inputModality !== 'touch' && action.inputModality !== 'assistive-switch') return 0;
  return action.touchAssistance ? REACHABILITY_TARGET_FLOORS.touchAssistance : REACHABILITY_TARGET_FLOORS.touch;
}

function issue(code, penalty, detail) {
  return Object.freeze({code, penalty, detail});
}

export function reviewReachabilityAction(action, options = {}) {
  const normalized = normalizeAction(action, options);
  const bands = normalizeReachabilityBands(options.bands || DEFAULT_COMPACT_REVIEW_BANDS);
  const zone = classifyReachabilityZone(normalized.yNormalized, bands);
  const penalties = {...DEFAULT_PENALTIES, ...(options.penalties || {})};
  const edgeReviewInsetPx = Math.max(0, finite(options.edgeReviewInsetPx, 8));
  const issues = [];

  if (normalized.safeAreaObscured) {
    issues.push(issue('safe-area-obstruction', penalties.safeAreaObstruction, 'Action intersects or is obscured by a platform safe-area region.'));
  }

  const floor = targetFloor(normalized);
  if (floor > 0 && (normalized.widthPx < floor || normalized.heightPx < floor)) {
    issues.push(issue('undersized-target', penalties.undersizedTarget, `Target is below the inherited ${floor}px interaction floor.`));
  }

  const inInteraction = zone.zones.includes('interaction');
  if (normalized.role === 'primary-action' && !inInteraction) {
    issues.push(issue('primary-action-outside-interaction', penalties.primaryActionOutsideInteraction, 'Primary action is outside the compact Interaction Zone.'));
  } else if (normalized.frequency === 'frequent' && !inInteraction) {
    issues.push(issue('frequent-action-outside-interaction', penalties.frequentActionOutsideInteraction, 'Frequently used action is outside the compact Interaction Zone.'));
  }

  if (normalized.role === 'navigation' && !inInteraction) {
    issues.push(issue('navigation-outside-interaction', penalties.navigationOutsideInteraction, 'Primary navigation is outside the compact Interaction Zone.'));
  }

  if (normalized.role === 'search-initiation' && !inInteraction) {
    issues.push(issue('search-initiation-outside-interaction', penalties.searchInitiationOutsideInteraction, 'Search initiation is outside the compact Interaction Zone.'));
  }

  if (Number.isFinite(normalized.edgeInsetPx) && normalized.edgeInsetPx < edgeReviewInsetPx) {
    issues.push(issue('near-physical-edge', penalties.nearPhysicalEdge, `Action is within the provisional ${edgeReviewInsetPx}px edge-review inset.`));
  }

  if ((normalized.frequency === 'frequent' || HIGH_PRIORITY_ROLES.has(normalized.role)) && normalized.yNormalized < bands.interaction.start) {
    const travelFraction = clamp((bands.interaction.start - normalized.yNormalized) / Math.max(bands.interaction.start, 0.001));
    const travelPenalty = Math.round(clamp(travelFraction) * penalties.maxVerticalTravel * 100) / 100;
    if (travelPenalty > 0) {
      issues.push(issue('vertical-hand-travel', travelPenalty, 'High-priority or frequent action requires additional vertical travel toward the upper compact layout.'));
    }
  }

  const totalPenalty = issues.reduce((sum, item) => sum + finite(item.penalty, 0), 0);
  return Object.freeze({
    action: normalized,
    zone,
    targetFloorPx: floor,
    issues: Object.freeze(issues),
    penalty: Math.round(totalPenalty * 100) / 100
  });
}

function classification(score) {
  if (score >= 85) return 'strong-review-signal';
  if (score >= 70) return 'review-recommended';
  return 'reachability-attention-needed';
}

export function scoreCompactReachability(actions = [], options = {}) {
  if (!Array.isArray(actions)) throw new TypeError('Reachability actions must be an array');
  const reviews = actions.map(action => reviewReachabilityAction(action, options));
  const totalPenalty = reviews.reduce((sum, review) => sum + review.penalty, 0);
  const score = Math.round(clamp(100 - totalPenalty, 0, 100) * 100) / 100;
  const issueCounts = {};
  for (const review of reviews) {
    for (const item of review.issues) issueCounts[item.code] = (issueCounts[item.code] || 0) + 1;
  }
  return Object.freeze({
    score,
    classification: classification(score),
    actionCount: reviews.length,
    issueCounts: Object.freeze(issueCounts),
    reviews: Object.freeze(reviews),
    authority: 'development-review-signal-only',
    autonomousProductAuthority: false,
    physicalDeviceAcceptance: false
  });
}

export function createReachabilityReviewer(defaultOptions = {}) {
  return Object.freeze({
    kind: 'glaze-v1.3-compact-reachability-reviewer',
    autonomousProductAuthority: false,
    review(actions, options = {}) {
      return scoreCompactReachability(actions, {...defaultOptions, ...options});
    }
  });
}

export const reachabilityCandidate = Object.freeze({
  targetVersion: '1.3.0-candidate',
  releaseLifecycle: 'proposed',
  consumerEligible: false,
  zones: Object.freeze(['viewing', 'transition', 'interaction']),
  defaultBands: DEFAULT_COMPACT_REVIEW_BANDS,
  targetFloors: REACHABILITY_TARGET_FLOORS,
  defaultBandsStatus: 'provisional-implementation-default-not-anthropometric-authority',
  scoringAuthority: 'development-review-signal-only',
  physicalDeviceAcceptanceEstablished: false
});
