/**
 * Glaze Motion 0.3 Experimental runtime primitives.
 * Dependency-free Motion Core only. Motion Studio and Motion Spatial remain planned.
 */

export const GLAZE_MOTION_VERSION = "0.3.0";
export const GLAZE_MOTION_STATUS = "experimental";

export const durations = Object.freeze({ instant: 0, micro: 90, short: 160, medium: 240, long: 360, ambient: 700 });
export const easings = Object.freeze({ standard: "cubic-bezier(0.2, 0, 0, 1)", enter: "cubic-bezier(0, 0, 0, 1)", exit: "cubic-bezier(0.3, 0, 1, 1)", emphasized: "cubic-bezier(0.2, 0, 0, 1)", linear: "linear" });
export const springs = Object.freeze({
  restrained: Object.freeze({ mass: 1, stiffness: 520, damping: 44, initialVelocity: 0, settleMs: 260, maxOvershoot: 0.015 }),
  standard: Object.freeze({ mass: 1, stiffness: 420, damping: 32, initialVelocity: 0, settleMs: 340, maxOvershoot: 0.04 }),
  expressive: Object.freeze({ mass: 1, stiffness: 360, damping: 24, initialVelocity: 0, settleMs: 460, maxOvershoot: 0.08 }),
  spatial: Object.freeze({ mass: 1, stiffness: 300, damping: 28, initialVelocity: 0, settleMs: 520, maxOvershoot: 0.06 }),
});
export const gestureDefaults = Object.freeze({ slopPx: 4, velocityWindowMs: 120, flingVelocityPxPerMs: 0.55, snapProjectionMs: 120, swipeThresholdRatio: 0.33 });
export const adapterDefaults = Object.freeze({
  button: Object.freeze({ durationRole: "micro", easingRole: "standard", springPreset: "restrained" }),
  disclosure: Object.freeze({ durationRole: "short", easingRole: "standard", springPreset: "restrained" }),
  dialog: Object.freeze({ durationRole: "medium", easingRole: "enter", springPreset: "standard" }),
  navigation: Object.freeze({ durationRole: "medium", easingRole: "emphasized", springPreset: "standard" }),
  reorder: Object.freeze({ durationRole: "short", easingRole: "standard", springPreset: "standard" }),
  shared: Object.freeze({ durationRole: "medium", easingRole: "emphasized", springPreset: "standard" }),
});

function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
function finiteNumber(value, name) { if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`); return value; }
function integerIndex(value, name) { if (!Number.isInteger(value)) throw new TypeError(`${name} must be an integer`); return value; }
function resolveReducedMotion(explicit, matchMediaFn) {
  if (typeof explicit === "boolean") return explicit;
  const matcher = matchMediaFn ?? globalThis.matchMedia;
  if (typeof matcher !== "function") return false;
  return Boolean(matcher("(prefers-reduced-motion: reduce)")?.matches);
}

export function prefersReducedMotion(matchMediaFn) { return resolveReducedMotion(undefined, matchMediaFn); }
export function resolveDuration(role = "medium", options = {}) {
  if (!(role in durations)) throw new RangeError(`Unknown Glaze Motion duration role: ${role}`);
  return resolveReducedMotion(options.reducedMotion, options.matchMedia) ? 0 : durations[role];
}

export function createSpringKeyframes(options = {}) {
  const { from = 0, to = 1, preset = "standard", samples = 36 } = options;
  finiteNumber(from, "from"); finiteNumber(to, "to");
  const spring = springs[preset];
  if (!spring) throw new RangeError(`Unknown Glaze Motion spring preset: ${preset}`);
  if (!Number.isInteger(samples) || samples < 2 || samples > 240) throw new RangeError("samples must be an integer between 2 and 240");
  const { mass, stiffness, damping, initialVelocity, settleMs, maxOvershoot } = spring;
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const durationSeconds = settleMs / 1000;
  const frames = [];
  for (let index = 0; index < samples; index += 1) {
    const progress = index / (samples - 1); const t = progress * durationSeconds; let normalized;
    if (zeta < 1) {
      const omegaD = omega0 * Math.sqrt(1 - zeta * zeta); const envelope = Math.exp(-zeta * omega0 * t);
      const coefficient = (zeta * omega0 - initialVelocity) / omegaD;
      normalized = 1 - envelope * (Math.cos(omegaD * t) + coefficient * Math.sin(omegaD * t));
    } else {
      const envelope = Math.exp(-omega0 * t); normalized = 1 - envelope * (1 + (omega0 - initialVelocity) * t);
    }
    normalized = clamp(normalized, -maxOvershoot, 1 + maxOvershoot);
    frames.push({ offset: progress, value: from + (to - from) * normalized });
  }
  frames[0] = { offset: 0, value: from }; frames[frames.length - 1] = { offset: 1, value: to }; return frames;
}

export function animate(element, keyframes, options = {}) {
  if (!element || typeof element.animate !== "function") throw new TypeError("Glaze Motion animate() requires an element with Web Animations API support");
  if (!Array.isArray(keyframes) || keyframes.length === 0) throw new TypeError("keyframes must be a non-empty array");
  const reducedMotion = resolveReducedMotion(options.reducedMotion, options.matchMedia);
  const duration = resolveDuration(options.durationRole ?? "medium", { reducedMotion });
  const easingRole = options.easingRole ?? "standard"; const easing = easings[easingRole];
  if (!easing) throw new RangeError(`Unknown Glaze Motion easing role: ${easingRole}`);
  return element.animate(reducedMotion ? [keyframes[keyframes.length - 1]] : keyframes, { duration, easing, fill: options.fill ?? "both", iterations: options.iterations ?? 1, direction: options.direction ?? "normal" });
}

function pointFrom(input, fallbackTime) {
  if (!input || typeof input !== "object") throw new TypeError("drag point must be an object");
  return Object.freeze({ x: finiteNumber(input.x, "point.x"), y: finiteNumber(input.y, "point.y"), time: finiteNumber(input.time ?? fallbackTime, "point.time") });
}

export function createDragSession(options = {}) {
  const axis = options.axis ?? "both"; if (!["both", "x", "y"].includes(axis)) throw new RangeError("axis must be 'both', 'x', or 'y'");
  const slopPx = finiteNumber(options.slopPx ?? gestureDefaults.slopPx, "slopPx");
  const velocityWindowMs = finiteNumber(options.velocityWindowMs ?? gestureDefaults.velocityWindowMs, "velocityWindowMs");
  if (slopPx < 0 || velocityWindowMs <= 0) throw new RangeError("gesture thresholds must be positive");
  const now = typeof options.now === "function" ? options.now : () => globalThis.performance?.now?.() ?? Date.now();
  const start = pointFrom({ x: options.startX ?? 0, y: options.startY ?? 0, time: options.startTime ?? now() }, now());
  let history = [start], current = start, active = false, ended = false;
  function snapshot() {
    let deltaX = current.x - start.x, deltaY = current.y - start.y;
    if (axis === "x") deltaY = 0; if (axis === "y") deltaX = 0;
    active = active || Math.hypot(deltaX, deltaY) >= slopPx;
    const cutoff = current.time - velocityWindowMs; const anchor = history.find((entry) => entry.time >= cutoff) ?? history[0];
    const elapsed = Math.max(1, current.time - anchor.time); let velocityX = (current.x - anchor.x) / elapsed, velocityY = (current.y - anchor.y) / elapsed;
    if (axis === "x") velocityY = 0; if (axis === "y") velocityX = 0;
    return Object.freeze({ active, ended, deltaX, deltaY, velocityX, velocityY, elapsedMs: Math.max(0, current.time - start.time) });
  }
  function update(input) {
    if (ended) throw new Error("cannot update an ended drag session");
    const next = pointFrom(input, now()); if (next.time < current.time) throw new RangeError("drag point time must be monotonic");
    current = next; history.push(next); history = history.filter((entry, index) => index === 0 || entry.time >= next.time - velocityWindowMs); return snapshot();
  }
  function end(input) { if (ended) return snapshot(); if (input) update(input); ended = true; return snapshot(); }
  function cancel() { ended = true; active = false; current = start; history = [start]; return snapshot(); }
  return Object.freeze({ update, end, cancel, snapshot });
}

export function resolveSnapPoint(position, snapPoints, options = {}) {
  finiteNumber(position, "position"); if (!Array.isArray(snapPoints) || snapPoints.length === 0) throw new TypeError("snapPoints must be a non-empty array");
  const points = [...new Set(snapPoints.map((point) => finiteNumber(point, "snap point")))].sort((a, b) => a - b);
  const velocity = finiteNumber(options.velocity ?? 0, "velocity"); const velocityThreshold = finiteNumber(options.velocityThreshold ?? gestureDefaults.flingVelocityPxPerMs, "velocityThreshold");
  const projectionMs = finiteNumber(options.projectionMs ?? gestureDefaults.snapProjectionMs, "projectionMs");
  if (velocityThreshold < 0 || projectionMs < 0) throw new RangeError("snap thresholds cannot be negative");
  const projected = Math.abs(velocity) >= velocityThreshold ? position + velocity * projectionMs : position;
  return points.reduce((best, point) => Math.abs(point - projected) < Math.abs(best - projected) ? point : best, points[0]);
}

export function resolveSwipeAction(distancePx, extentPx, options = {}) {
  finiteNumber(distancePx, "distancePx"); finiteNumber(extentPx, "extentPx");
  if (extentPx <= 0) throw new RangeError("extentPx must be positive");
  const velocity = finiteNumber(options.velocity ?? 0, "velocity");
  const thresholdRatio = finiteNumber(options.thresholdRatio ?? gestureDefaults.swipeThresholdRatio, "thresholdRatio");
  const velocityThreshold = finiteNumber(options.velocityThreshold ?? gestureDefaults.flingVelocityPxPerMs, "velocityThreshold");
  if (thresholdRatio <= 0 || thresholdRatio > 1 || velocityThreshold < 0) throw new RangeError("invalid swipe thresholds");
  const crossesDistance = Math.abs(distancePx) >= extentPx * thresholdRatio;
  const crossesVelocity = Math.abs(velocity) >= velocityThreshold;
  if (!crossesDistance && !crossesVelocity) return "none";
  const direction = Math.abs(velocity) >= velocityThreshold ? velocity : distancePx;
  return direction < 0 ? "start" : "end";
}

export function resolveDirectionalMove(key, options = {}) {
  const orientation = options.orientation ?? "vertical";
  if (!["vertical", "horizontal"].includes(orientation)) throw new RangeError("orientation must be 'vertical' or 'horizontal'");
  if (orientation === "vertical") {
    if (key === "ArrowUp") return -1;
    if (key === "ArrowDown") return 1;
  } else {
    if (key === "ArrowLeft") return -1;
    if (key === "ArrowRight") return 1;
  }
  return 0;
}

export function createReorderModel(items, options = {}) {
  if (!Array.isArray(items)) throw new TypeError("items must be an array");
  const keyOf = typeof options.getKey === "function" ? options.getKey : (item) => item?.id ?? item;
  let current = [...items];
  function assertUnique(list) {
    const keys = list.map(keyOf); if (keys.some((key) => key === undefined || key === null)) throw new TypeError("reorder items require stable keys");
    if (new Set(keys).size !== keys.length) throw new TypeError("reorder item keys must be unique");
  }
  assertUnique(current);
  function snapshot() { return Object.freeze([...current]); }
  function move(fromIndex, toIndex) {
    integerIndex(fromIndex, "fromIndex"); integerIndex(toIndex, "toIndex");
    if (fromIndex < 0 || fromIndex >= current.length || toIndex < 0 || toIndex >= current.length) throw new RangeError("reorder indexes out of range");
    if (fromIndex === toIndex) return snapshot();
    const next = [...current]; const [item] = next.splice(fromIndex, 1); next.splice(toIndex, 0, item); current = next; return snapshot();
  }
  function moveBy(index, delta) {
    integerIndex(index, "index"); integerIndex(delta, "delta");
    if (index < 0 || index >= current.length) throw new RangeError("reorder index out of range");
    return move(index, clamp(index + delta, 0, current.length - 1));
  }
  function moveByKey(itemKey, key, mappingOptions = {}) {
    const index = current.findIndex((item) => Object.is(keyOf(item), itemKey));
    if (index < 0) throw new RangeError("unknown reorder item key");
    const delta = resolveDirectionalMove(key, mappingOptions);
    return delta === 0 ? snapshot() : moveBy(index, delta);
  }
  return Object.freeze({ snapshot, move, moveBy, moveByKey });
}

export function createPanZoomState(options = {}) {
  const minScale = finiteNumber(options.minScale ?? 1, "minScale"), maxScale = finiteNumber(options.maxScale ?? 4, "maxScale");
  if (minScale <= 0 || maxScale < minScale) throw new RangeError("invalid pan/zoom scale bounds");
  const initial = Object.freeze({ x: finiteNumber(options.x ?? 0, "x"), y: finiteNumber(options.y ?? 0, "y"), scale: clamp(finiteNumber(options.scale ?? 1, "scale"), minScale, maxScale) });
  let state = initial;
  function snapshot() { return Object.freeze({ ...state }); }
  function panBy(deltaX, deltaY) { state = { ...state, x: state.x + finiteNumber(deltaX, "deltaX"), y: state.y + finiteNumber(deltaY, "deltaY") }; return snapshot(); }
  function zoomTo(nextScale, zoomOptions = {}) {
    const targetScale = clamp(finiteNumber(nextScale, "scale"), minScale, maxScale);
    const anchorX = finiteNumber(zoomOptions.anchorX ?? 0, "anchorX"), anchorY = finiteNumber(zoomOptions.anchorY ?? 0, "anchorY");
    const ratio = targetScale / state.scale;
    state = { x: anchorX - (anchorX - state.x) * ratio, y: anchorY - (anchorY - state.y) * ratio, scale: targetScale };
    return snapshot();
  }
  function reset() { state = initial; return snapshot(); }
  return Object.freeze({ snapshot, panBy, zoomTo, reset });
}

export function createFrameBudgetProbe(options = {}) {
  const targetFps = finiteNumber(options.targetFps ?? 60, "targetFps"), maxLongTaskMs = finiteNumber(options.maxLongTaskMs ?? 50, "maxLongTaskMs");
  if (targetFps <= 0 || maxLongTaskMs <= 0) throw new RangeError("performance budgets must be positive");
  const frameBudgetMs = 1000 / targetFps;
  let previousFrame = null, frameCount = 0, overBudgetFrames = 0, worstFrameMs = 0, longTaskCount = 0, worstLongTaskMs = 0;
  function recordFrame(timestamp) {
    const value = finiteNumber(timestamp, "timestamp");
    if (previousFrame !== null && value < previousFrame) throw new RangeError("frame timestamps must be monotonic");
    if (previousFrame !== null) { const delta = value - previousFrame; frameCount += 1; worstFrameMs = Math.max(worstFrameMs, delta); if (delta > frameBudgetMs) overBudgetFrames += 1; }
    previousFrame = value; return snapshot();
  }
  function recordLongTask(durationMs) { const duration = finiteNumber(durationMs, "durationMs"); if (duration < 0) throw new RangeError("long-task duration cannot be negative"); if (duration >= maxLongTaskMs) { longTaskCount += 1; worstLongTaskMs = Math.max(worstLongTaskMs, duration); } return snapshot(); }
  function snapshot() { return Object.freeze({ targetFps, frameBudgetMs, maxLongTaskMs, frameCount, overBudgetFrames, overBudgetRatio: frameCount ? overBudgetFrames / frameCount : 0, worstFrameMs, longTaskCount, worstLongTaskMs }); }
  return Object.freeze({ recordFrame, recordLongTask, snapshot });
}

export function createMotionAdapter(role, options = {}) {
  const base = adapterDefaults[role]; if (!base) throw new RangeError(`Unknown Glaze Motion adapter role: ${role}`);
  const durationRole = options.durationRole ?? base.durationRole, easingRole = options.easingRole ?? base.easingRole, springPreset = options.springPreset ?? base.springPreset;
  if (!(easingRole in easings)) throw new RangeError(`Unknown Glaze Motion easing role: ${easingRole}`);
  if (!(springPreset in springs)) throw new RangeError(`Unknown Glaze Motion spring preset: ${springPreset}`);
  return Object.freeze({ role, durationRole, durationMs: resolveDuration(durationRole, options), easingRole, easing: easings[easingRole], springPreset, spring: springs[springPreset] });
}

export function createSharedElementName(key) {
  if (typeof key !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(key)) throw new TypeError("shared-element key must start with a letter and contain at most 64 letters, numbers, dashes, or underscores");
  return `glaze-${key}`;
}
export function setSharedElementName(element, key) {
  if (!element || !element.style) throw new TypeError("setSharedElementName() requires an element with a style object");
  const name = createSharedElementName(key), previous = element.style.viewTransitionName ?? ""; element.style.viewTransitionName = name;
  return () => { element.style.viewTransitionName = previous; };
}
export function startSharedTransition(update, options = {}) {
  if (typeof update !== "function") throw new TypeError("startSharedTransition() requires an update function");
  const documentObject = options.document ?? globalThis.document, reducedMotion = resolveReducedMotion(options.reducedMotion, options.matchMedia);
  if (reducedMotion || !documentObject || typeof documentObject.startViewTransition !== "function") return Object.freeze({ usedViewTransition: false, transition: null, updateResult: update() });
  return Object.freeze({ usedViewTransition: true, transition: documentObject.startViewTransition(update), updateResult: undefined });
}
export function applyDragPosition(element, snapshot) {
  if (!element || !element.style || typeof element.setAttribute !== "function") throw new TypeError("applyDragPosition() requires an element-like target");
  if (!snapshot || !Number.isFinite(snapshot.deltaX) || !Number.isFinite(snapshot.deltaY)) throw new TypeError("applyDragPosition() requires a drag snapshot");
  element.style.setProperty("--glaze-motion-drag-x", `${snapshot.deltaX}px`); element.style.setProperty("--glaze-motion-drag-y", `${snapshot.deltaY}px`);
  element.setAttribute("data-glaze-dragging", snapshot.ended ? "false" : "true"); return snapshot;
}
export function detectCapabilities(environment = globalThis) {
  const navigatorObject = environment.navigator ?? {}, documentObject = environment.document ?? {};
  return Object.freeze({ webAnimations: typeof environment.Element !== "undefined" && typeof environment.Element?.prototype?.animate === "function", viewTransitions: typeof documentObject.startViewTransition === "function", webgpu: Boolean(navigatorObject.gpu), webgl2: typeof environment.WebGL2RenderingContext !== "undefined", canvas2d: typeof environment.CanvasRenderingContext2D !== "undefined" });
}
export function selectSpatialBackend(capabilities = detectCapabilities()) {
  if (capabilities.webgpu) return "webgpu"; if (capabilities.webgl2) return "webgl2"; if (capabilities.canvas2d) return "canvas-svg-css"; return "static-accessible";
}
