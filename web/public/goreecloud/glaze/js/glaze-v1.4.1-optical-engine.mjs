import {
  applyGlazeOptics,
  resolveGlazeOptics,
  glazeOpticalEngineV14
} from './glaze-v1.4-optical-engine.mjs';

const APPEARANCES = new Set(['light', 'dark', 'deep-dark']);
export const GLAZE_OPTICAL_PERFORMANCE_LEVELS = Object.freeze([
  'full-optical',
  'balanced-optical',
  'efficient-optical',
  'durable-optical'
]);
const PERFORMANCE_LEVEL_SET = new Set(GLAZE_OPTICAL_PERFORMANCE_LEVELS);
const PERFORMANCE_RANK = Object.freeze(Object.fromEntries(
  GLAZE_OPTICAL_PERFORMANCE_LEVELS.map((level, index) => [level, index])
));

const PERFORMANCE_PROFILES = Object.freeze({
  'full-optical': Object.freeze({
    blurMultiplier: 1,
    frostBoost: 0,
    tintMultiplier: 1,
    depthMultiplier: 1,
    motionScale: 1,
    samplingScale: 1,
    reflectionScale: 1,
    auraScale: 1
  }),
  'balanced-optical': Object.freeze({
    blurMultiplier: 0.78,
    frostBoost: 0.04,
    tintMultiplier: 0.75,
    depthMultiplier: 0.82,
    motionScale: 0.75,
    samplingScale: 0.50,
    reflectionScale: 0.55,
    auraScale: 0.55
  }),
  'efficient-optical': Object.freeze({
    blurMultiplier: 0.42,
    frostBoost: 0.11,
    tintMultiplier: 0.35,
    depthMultiplier: 0.55,
    motionScale: 0.45,
    samplingScale: 0.15,
    reflectionScale: 0.15,
    auraScale: 0.20
  }),
  'durable-optical': Object.freeze({
    blurMultiplier: 0,
    frostBoost: 0.22,
    tintMultiplier: 0,
    depthMultiplier: 0.25,
    motionScale: 0,
    samplingScale: 0,
    reflectionScale: 0,
    auraScale: 0
  })
});

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function clamp(value, min = 0, max = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function performanceLevel(value, fallback = 'full-optical') {
  return PERFORMANCE_LEVEL_SET.has(value) ? value : fallback;
}

function slowFrameShare(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return clamp(number > 1 ? number / 100 : number, 0, 1);
}

function notifyAdapterError(observer, error) {
  if (typeof observer !== 'function') return;
  try {
    observer(error);
  } catch {
    // Observation is non-authoritative. A failing observer must never defeat
    // the fail-safe optical fallback or escape into the consumer runtime.
  }
}

function readAdapter(signalAdapter, onAdapterError) {
  if (typeof signalAdapter?.resolve !== 'function') {
    return Object.freeze({status: 'not-configured', signals: Object.freeze({})});
  }

  try {
    return Object.freeze({
      status: 'resolved',
      signals: Object.freeze({...asObject(signalAdapter.resolve())})
    });
  } catch (error) {
    notifyAdapterError(onAdapterError, error);
    return Object.freeze({status: 'failed-safe', signals: Object.freeze({})});
  }
}

function readPerformanceAdapter(performanceAdapter, onPerformanceAdapterError) {
  if (typeof performanceAdapter?.resolve !== 'function') {
    return Object.freeze({status: 'not-configured', signals: Object.freeze({})});
  }

  try {
    return Object.freeze({
      status: 'resolved',
      signals: Object.freeze({...asObject(performanceAdapter.resolve())})
    });
  } catch (error) {
    notifyAdapterError(onPerformanceAdapterError, error);
    // A configured performance authority that fails cannot truthfully accept
    // Full Optical. Fall back conservatively to Balanced Optical without
    // escalating to an accessibility/solid state.
    return Object.freeze({
      status: 'failed-safe',
      signals: Object.freeze({capabilityLevel: 'balanced-optical'})
    });
  }
}

function composeInputs(adapterState, performanceState, overrides) {
  const merged = {...adapterState.signals, ...asObject(overrides)};

  if (performanceState.status !== 'not-configured') {
    merged.performance = {
      ...asObject(merged.performance),
      ...performanceState.signals
    };
  }

  if (adapterState.status !== 'failed-safe') return merged;

  // An adapter exception means contextual/accessibility signal authority could
  // not be established. Fail closed into the existing V1.4 solid-accessible
  // mode. These forced flags are applied after consumer overrides so a caller
  // cannot restore decorative optics after the adapter fault.
  merged.accessibility = {
    ...asObject(merged.accessibility),
    forcedColors: true,
    reducedTransparency: true
  };
  merged.memoryTint = null;
  return merged;
}

function effectiveAppearance(resolved, inputs) {
  if (APPEARANCES.has(resolved.appearance)) return resolved.appearance;
  if (APPEARANCES.has(inputs.appearance)) return inputs.appearance;
  return 'light';
}

function normalizePerformance(value = {}) {
  const input = asObject(value);
  const capabilities = asObject(input.capabilities);
  return Object.freeze({
    requestedLevel: performanceLevel(input.requestedLevel),
    capabilityLevel: performanceLevel(input.capabilityLevel),
    pressure: clamp(input.pressure ?? input.performancePressure ?? 0, 0, 1),
    powerConstrained: Boolean(input.powerConstrained),
    thermalConstrained: Boolean(input.thermalConstrained),
    capabilities: Object.freeze({
      backdropBlur: capabilities.backdropBlur !== false,
      dynamicSampling: capabilities.dynamicSampling !== false,
      dynamicReflection: capabilities.dynamicReflection !== false,
      aura: capabilities.aura !== false,
      motion: capabilities.motion !== false
    })
  });
}

function lowerRichness(current, minimumLevel) {
  return PERFORMANCE_RANK[minimumLevel] > PERFORMANCE_RANK[current] ? minimumLevel : current;
}

function resolvePerformanceState(stableResolved, inputs, performanceAdapterStatus) {
  const normalized = normalizePerformance(inputs.performance);
  let acceptedLevel = normalized.requestedLevel;
  const reasons = [];

  if (stableResolved.mode === 'solid-accessible') {
    acceptedLevel = 'durable-optical';
    reasons.push('accessibility-solid-authority');
  } else {
    const capabilityLevel = normalized.capabilityLevel;
    if (PERFORMANCE_RANK[capabilityLevel] > PERFORMANCE_RANK[acceptedLevel]) {
      acceptedLevel = capabilityLevel;
      reasons.push('runtime-capability-ceiling');
    }

    if (!normalized.capabilities.backdropBlur) {
      acceptedLevel = lowerRichness(acceptedLevel, 'durable-optical');
      reasons.push('backdrop-blur-unavailable');
    }

    if (!normalized.capabilities.dynamicSampling ||
        !normalized.capabilities.dynamicReflection ||
        !normalized.capabilities.aura) {
      acceptedLevel = lowerRichness(acceptedLevel, 'balanced-optical');
      reasons.push('advanced-optics-partially-unavailable');
    }

    if (!normalized.capabilities.motion) {
      acceptedLevel = lowerRichness(acceptedLevel, 'balanced-optical');
      reasons.push('dynamic-motion-unavailable');
    }

    if (normalized.powerConstrained || normalized.thermalConstrained) {
      acceptedLevel = lowerRichness(acceptedLevel, 'efficient-optical');
      reasons.push(normalized.thermalConstrained ? 'thermal-budget' : 'power-budget');
    }

    if (normalized.pressure >= 0.78) {
      acceptedLevel = lowerRichness(acceptedLevel, 'efficient-optical');
      reasons.push('high-runtime-pressure');
    } else if (normalized.pressure >= 0.48) {
      acceptedLevel = lowerRichness(acceptedLevel, 'balanced-optical');
      reasons.push('moderate-runtime-pressure');
    }

    if (performanceAdapterStatus === 'failed-safe') {
      acceptedLevel = lowerRichness(acceptedLevel, 'balanced-optical');
      reasons.push('performance-adapter-failed-safe');
    }
  }

  const profile = PERFORMANCE_PROFILES[acceptedLevel];
  return Object.freeze({
    requestedLevel: normalized.requestedLevel,
    acceptedLevel,
    downgraded: PERFORMANCE_RANK[acceptedLevel] > PERFORMANCE_RANK[normalized.requestedLevel],
    downgradeReasons: Object.freeze([...new Set(reasons)]),
    pressure: normalized.pressure,
    capabilities: normalized.capabilities,
    profile
  });
}

function scaledMemoryTint(memoryTint, multiplier) {
  if (!memoryTint || multiplier <= 0) return null;
  const influence = clamp(memoryTint.influence * multiplier, 0, 0.08);
  return influence > 0 ? Object.freeze({...memoryTint, influence}) : null;
}

function applyPerformanceProfile(stableResolved, performance) {
  if (stableResolved.mode === 'solid-accessible') {
    return Object.freeze({
      ...stableResolved,
      blurScale: 0,
      memoryTint: null,
      decorativeTintAllowed: false,
      performance
    });
  }

  const profile = performance.profile;
  const reducedMotion = Boolean(stableResolved.accessibility?.reducedMotion);
  return Object.freeze({
    ...stableResolved,
    frostStrength: clamp(stableResolved.frostStrength + profile.frostBoost, 0.20, 0.96),
    blurScale: clamp(stableResolved.blurScale * profile.blurMultiplier, 0, 0.80),
    depthHueShift: stableResolved.depthHueShift * profile.depthMultiplier,
    memoryTint: scaledMemoryTint(stableResolved.memoryTint, profile.tintMultiplier),
    decorativeTintAllowed: stableResolved.decorativeTintAllowed && performance.acceptedLevel !== 'durable-optical',
    performance: Object.freeze({
      ...performance,
      motionScale: reducedMotion ? 0 : profile.motionScale,
      samplingScale: profile.samplingScale,
      reflectionScale: profile.reflectionScale,
      auraScale: profile.auraScale
    })
  });
}

function semanticSurfaceStrength(resolved, appearance) {
  if (resolved.mode === 'solid-accessible') return 1;

  const protection = clamp(resolved.semanticProtection, 0.5, 1);
  let strength;
  if (appearance === 'light') strength = clamp(0.58 + protection * 0.34, 0.75, 0.94);
  else if (appearance === 'deep-dark') strength = clamp(0.44 + protection * 0.30, 0.62, 0.82);
  else strength = clamp(0.40 + protection * 0.30, 0.60, 0.80);

  const tierBoost = Object.freeze({
    'full-optical': 0,
    'balanced-optical': 0.02,
    'efficient-optical': 0.06,
    'durable-optical': 0.12
  })[resolved.performance?.acceptedLevel] ?? 0;
  return clamp(strength + tierBoost, 0.60, 0.98);
}

function decorateResult(stableResolved, adapterStatus, performanceAdapterStatus, inputs) {
  const performance = resolvePerformanceState(stableResolved, inputs, performanceAdapterStatus);
  const resolved = applyPerformanceProfile(stableResolved, performance);
  const appearance = effectiveAppearance(resolved, inputs);
  return Object.freeze({
    ...resolved,
    appearance,
    semanticSurfaceStrength: semanticSurfaceStrength(resolved, appearance),
    adapterStatus,
    performanceAdapterStatus,
    adapterFailureMode: adapterStatus === 'failed-safe' ? 'solid-accessible' : null
  });
}

function targetRoot(target) {
  return target?.documentElement || target;
}

function applyCandidatePresentation(element, resolved) {
  element.dataset.glazeOpticalV141Appearance = resolved.appearance;
  element.dataset.glazeOpticalV141Performance = resolved.performance.acceptedLevel;
  element.style.setProperty('--glz141-semantic-surface-strength', `${(resolved.semanticSurfaceStrength * 100).toFixed(2)}%`);
  // Re-apply the bounded V1.4 optical variables after the Stable resolver so
  // the accepted performance profile actually controls rendering cost.
  element.style.setProperty('--glz14-frost-strength', String(resolved.frostStrength));
  element.style.setProperty('--glz14-blur-scale', String(resolved.blurScale));
  element.style.setProperty('--glz14-depth-hue-shift', String(resolved.depthHueShift));
  element.style.setProperty('--glz14-memory-tint', resolved.memoryTint?.css || 'transparent');
  element.style.setProperty('--glz14-memory-tint-influence', String(resolved.memoryTint?.influence || 0));
  element.style.setProperty('--glz141-motion-scale', String(resolved.performance.motionScale));
  element.style.setProperty('--glz141-sampling-scale', String(resolved.performance.samplingScale));
  element.style.setProperty('--glz141-reflection-scale', String(resolved.performance.reflectionScale));
  element.style.setProperty('--glz141-aura-scale', String(resolved.performance.auraScale));
}

/**
 * Convert an already-local frame-budget sample into a bounded performance
 * ceiling. No device identifiers, price/model heuristics, persistence, or
 * remote telemetry are used.
 */
export function deriveGlazeOpticalPerformanceLevel(sample = {}) {
  const input = asObject(sample);
  const targetFrameMs = clamp(input.targetFrameMs ?? input.baselineMedianMs ?? 16.67, 4, 50);
  const p95FrameMs = clamp(input.p95FrameMs ?? input.stressP95Ms ?? targetFrameMs, targetFrameMs, 250);
  const slowShare = slowFrameShare(input.slowFrameShare ?? input.slowFramesShare ?? 0);
  const degradation = clamp(input.degradation ?? input.degradationShare ?? 0, 0, 1);
  const longTasks = Math.max(0, Math.min(20, Math.floor(Number(input.longTasks) || 0)));
  const frameRatio = p95FrameMs / targetFrameMs;

  let level = 'full-optical';
  const reasons = [];
  if (frameRatio >= 3.4 || slowShare >= 0.50 || longTasks >= 3 || degradation >= 0.25) {
    level = 'durable-optical';
    reasons.push('severe-frame-pressure');
  } else if (frameRatio >= 2.4 || slowShare >= 0.20 || longTasks >= 1 || degradation >= 0.12) {
    level = 'efficient-optical';
    reasons.push('sustained-frame-pressure');
  } else if (frameRatio >= 1.55 || slowShare >= 0.10 || degradation >= 0.05) {
    level = 'balanced-optical';
    reasons.push('moderate-frame-pressure');
  }

  const pressure = clamp(Math.max(
    (frameRatio - 1) / 2.4,
    slowShare * 2,
    degradation * 3,
    longTasks / 4
  ), 0, 1);

  return Object.freeze({
    capabilityLevel: level,
    pressure,
    reasons: Object.freeze(reasons),
    sample: Object.freeze({targetFrameMs, p95FrameMs, slowFrameShare: slowShare, degradation, longTasks})
  });
}

/**
 * Local, downgrade-only performance governor for one runtime session. Consumers
 * may feed bounded frame-budget observations and pass this object as the
 * candidate engine's performanceAdapter. State is in-memory only and resettable.
 */
export function createGlazeOpticalPerformanceGovernor(options = {}) {
  const input = asObject(options);
  const requestedLevel = performanceLevel(input.requestedLevel);
  let capabilityLevel = performanceLevel(input.initialCapabilityLevel);
  let pressure = 0;
  let reasons = Object.freeze([]);

  return Object.freeze({
    kind: 'glaze-optical-performance-governor-v1.4.1-candidate',
    localOnly: true,
    persistent: false,
    telemetryRequired: false,
    observe(sample = {}) {
      const derived = deriveGlazeOpticalPerformanceLevel(sample);
      if (PERFORMANCE_RANK[derived.capabilityLevel] > PERFORMANCE_RANK[capabilityLevel]) {
        capabilityLevel = derived.capabilityLevel;
      }
      pressure = Math.max(pressure, derived.pressure);
      reasons = Object.freeze([...new Set([...reasons, ...derived.reasons])]);
      return this.resolve();
    },
    resolve() {
      return Object.freeze({
        requestedLevel,
        capabilityLevel,
        pressure,
        governorReasons: reasons
      });
    },
    reset() {
      capabilityLevel = performanceLevel(input.initialCapabilityLevel);
      pressure = 0;
      reasons = Object.freeze([]);
      return this.resolve();
    }
  });
}

/**
 * GLAZE UI V1.4.1 Candidate optical-engine hardening.
 *
 * This wrapper preserves the V1.4.0 resolver as the optical authority and adds
 * explicit fail-safe adapter handling, bounded semantic readability, and a
 * truthful performance-capability acceptance layer. It does not collect
 * context, telemetry, analytics, camera data, device identifiers, or remote
 * state. Optional performance evidence must be supplied locally by a consumer
 * or by the in-memory governor exported above.
 */
export function createGlazeOpticalEngineV141Candidate(options = {}) {
  const input = asObject(options);
  const signalAdapter = input.signalAdapter ?? null;
  const performanceAdapter = input.performanceAdapter ?? null;
  const onAdapterError = typeof input.onAdapterError === 'function' ? input.onAdapterError : null;
  const onPerformanceAdapterError = typeof input.onPerformanceAdapterError === 'function'
    ? input.onPerformanceAdapterError
    : null;

  function stateAndInputs(overrides = {}) {
    const adapterState = readAdapter(signalAdapter, onAdapterError);
    const performanceState = readPerformanceAdapter(performanceAdapter, onPerformanceAdapterError);
    return Object.freeze({
      adapterState,
      performanceState,
      inputs: composeInputs(adapterState, performanceState, overrides)
    });
  }

  return Object.freeze({
    kind: 'glaze-optical-engine-v1.4.1-candidate',
    stableBaseline: '1.4.0',
    telemetryRequired: false,
    remoteContextRequired: false,
    deviceIdentityRequired: false,
    adapterFailurePolicy: 'solid-accessible',
    performanceAdapterFailurePolicy: 'balanced-optical',
    semanticSurfaceProtection: true,
    capabilityAwarePerformance: true,
    performanceLevels: GLAZE_OPTICAL_PERFORMANCE_LEVELS,
    resolve(overrides = {}) {
      const {adapterState, performanceState, inputs} = stateAndInputs(overrides);
      return decorateResult(resolveGlazeOptics(inputs), adapterState.status, performanceState.status, inputs);
    },
    apply(target, overrides = {}) {
      const {adapterState, performanceState, inputs} = stateAndInputs(overrides);
      const stableResolved = applyGlazeOptics(target, inputs);
      const resolved = decorateResult(stableResolved, adapterState.status, performanceState.status, inputs);
      const element = targetRoot(target);
      // Expose only bounded status/presentation state, never raw adapter error
      // details, device identifiers, model/price heuristics, or untrusted context.
      element.dataset.glazeOpticalV141Adapter = adapterState.status;
      element.dataset.glazeOpticalV141PerformanceAdapter = performanceState.status;
      applyCandidatePresentation(element, resolved);
      return resolved;
    }
  });
}

export const glazeOpticalEngineV141Candidate = Object.freeze({
  version: '1.4.1-candidate',
  lifecycle: 'candidate-hardening',
  stableBaseline: glazeOpticalEngineV14.version,
  preservesStableEngineSource: true,
  telemetryRequired: false,
  remoteContextRequired: false,
  deviceIdentityRequired: false,
  adapterFailurePolicy: 'solid-accessible',
  performanceAdapterFailurePolicy: 'balanced-optical',
  adapterFailureAllowsBlur: false,
  adapterFailureAllowsDecorativeTint: false,
  semanticSurfaceProtection: true,
  capabilityAwarePerformance: true,
  performanceLevels: GLAZE_OPTICAL_PERFORMANCE_LEVELS,
  maxMemoryTintInfluence: glazeOpticalEngineV14.maxMemoryTintInfluence,
  humanAcceptanceAutomatic: false,
  patchPromotionAutomatic: false
});
