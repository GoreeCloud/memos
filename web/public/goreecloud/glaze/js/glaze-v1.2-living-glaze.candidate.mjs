const CLARITY = new Set(['clear', 'balanced', 'dense']);
const STATES = new Set(['rest', 'hover', 'focus', 'pressed', 'dragged', 'selected', 'expanded', 'loading', 'disabled']);
const COMPLEXITY = new Set(['simple', 'complex', 'unknown']);
const TIERS = new Set(['0', '1', '2', '3']);

function rootOf(target) {
  if (!target) throw new TypeError('A target is required');
  return target.documentElement || target;
}

export function setGlazeClarity(target = document, profile = 'balanced') {
  if (!CLARITY.has(profile)) throw new RangeError(`Unsupported Glaze clarity profile: ${profile}`);
  rootOf(target).dataset.glazeClarity = profile;
  return profile;
}

export function setLivingGlazeState(element, state = 'rest') {
  if (!element?.dataset) throw new TypeError('A data-capable element is required');
  if (!STATES.has(state)) throw new RangeError(`Unsupported Living Glaze state: ${state}`);
  element.dataset.glazeLiving = '';
  element.dataset.materialState = state;
  return state;
}

export function setBackdropComplexity(element, complexity = 'unknown') {
  if (!element?.dataset) throw new TypeError('A data-capable element is required');
  const bounded = COMPLEXITY.has(complexity) ? complexity : 'unknown';
  element.dataset.backdropComplexity = bounded;
  return bounded;
}

export function setGlazeComplexityTier(target = document, tier = 3) {
  const value = String(tier);
  if (!TIERS.has(value)) throw new RangeError(`Unsupported Glaze complexity tier: ${tier}`);
  rootOf(target).dataset.glazeTier = value;
  return Number(value);
}

export function connectMaterialTransformation(source, destination, expanded) {
  if (!source?.dataset || !destination?.dataset) throw new TypeError('Source and destination elements are required');
  source.dataset.materialState = expanded ? 'expanded' : 'rest';
  destination.hidden = !expanded;
  destination.dataset.materialState = expanded ? 'expanded' : 'rest';
  return Boolean(expanded);
}

export const livingGlazeCandidate = Object.freeze({
  version: '1.2.0-candidate',
  consumerEligible: false,
  clarityProfiles: Object.freeze([...CLARITY]),
  interactionStates: Object.freeze([...STATES]),
  backdropComplexity: Object.freeze([...COMPLEXITY]),
  performanceTiers: Object.freeze([0, 1, 2, 3]),
  privacyBoundary: 'producer-or-renderer-supplied-complexity-only'
});
