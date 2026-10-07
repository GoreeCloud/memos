import { createReorderModel, resolveDirectionalMove } from "./glaze.motion.js";

export const GLAZE_MOTION_ACCESSIBILITY_VERSION = "0.4.0";

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
  return value;
}

export function resolveReorderCommand(key, options = {}) {
  const delta = resolveDirectionalMove(key, options);
  if (delta !== 0) return Object.freeze({ type: "move", delta });
  if (key === "Home") return Object.freeze({ type: "edge", edge: "start" });
  if (key === "End") return Object.freeze({ type: "edge", edge: "end" });
  return Object.freeze({ type: "none" });
}

export function createAccessibleReorderController(items, options = {}) {
  const keyOf = typeof options.getKey === "function" ? options.getKey : (item) => item?.id ?? item;
  const model = createReorderModel(items, { getKey: keyOf });

  function snapshot() {
    return model.snapshot();
  }

  function moveByCommand(itemKey, key, mappingOptions = {}) {
    const before = model.snapshot();
    const fromIndex = before.findIndex((item) => Object.is(keyOf(item), itemKey));
    if (fromIndex < 0) throw new RangeError("unknown reorder item key");

    const command = resolveReorderCommand(key, mappingOptions);
    let toIndex = fromIndex;
    if (command.type === "move") toIndex = clamp(fromIndex + command.delta, 0, before.length - 1);
    if (command.type === "edge") toIndex = command.edge === "start" ? 0 : before.length - 1;

    const after = toIndex === fromIndex ? before : model.move(fromIndex, toIndex);
    return Object.freeze({
      moved: toIndex !== fromIndex,
      command: command.type,
      itemKey,
      fromIndex,
      toIndex,
      position: toIndex + 1,
      total: after.length,
      items: after,
    });
  }

  return Object.freeze({ snapshot, moveByCommand });
}

export function createSettlingBudget(options = {}) {
  const maxConcurrent = positiveInteger(options.maxConcurrent ?? 12, "maxConcurrent");
  const reducedMotion = Boolean(options.reducedMotion);
  let activeCount = 0;

  function snapshot() {
    return Object.freeze({ maxConcurrent, activeCount, available: Math.max(0, maxConcurrent - activeCount), reducedMotion });
  }

  function acquire() {
    if (reducedMotion) {
      return Object.freeze({ accepted: false, reason: "reduced-motion", release() {}, snapshot });
    }
    if (activeCount >= maxConcurrent) {
      return Object.freeze({ accepted: false, reason: "budget-exhausted", release() {}, snapshot });
    }
    activeCount += 1;
    let released = false;
    return Object.freeze({
      accepted: true,
      reason: null,
      release() {
        if (!released) {
          released = true;
          activeCount -= 1;
        }
        return snapshot();
      },
      snapshot,
    });
  }

  return Object.freeze({ acquire, snapshot });
}
