/* GLAZE UI V1.2 Candidate — deterministic feedback policy only.
 * No audio playback, vibration execution, platform capability probing, persistence,
 * telemetry, or producer-truth computation occurs in this module.
 */

export const HAPTIC_TOKENS = Object.freeze([
  'haptic-tick',
  'haptic-selection',
  'haptic-snap',
  'haptic-commit',
  'haptic-warning',
  'haptic-error',
]);

export const SOUND_TOKENS = Object.freeze([
  'sound-confirm',
  'sound-complete',
  'sound-notify',
  'sound-warning',
  'sound-error',
  'sound-connect',
  'sound-disconnect',
]);

const ROUTINE_SILENT = new Set([
  'hover',
  'ordinary-navigation',
  'routine-button',
  'routine-scroll',
  'card-expansion',
  'metric-update',
  'passive-ai-generation',
  'routine-autosave',
]);

const ROUTES = Object.freeze({
  tick: { haptic: 'haptic-tick' },
  selection: { haptic: 'haptic-selection' },
  snap: { haptic: 'haptic-snap' },
  commit: { haptic: 'haptic-commit', sound: 'sound-confirm', soundRequiresRequest: true },
  warning: { haptic: 'haptic-warning', sound: 'sound-warning', soundRequiresRequest: true },
  error: { haptic: 'haptic-error', sound: 'sound-error', soundRequiresRequest: true },
  complete: { haptic: 'haptic-commit', sound: 'sound-complete', completion: true },
  notify: { sound: 'sound-notify', soundRequiresRequest: true },
  connect: { sound: 'sound-connect', foregroundOnly: true, soundRequiresRequest: true },
  disconnect: { sound: 'sound-disconnect', foregroundOnly: true, soundRequiresRequest: true },
  'recovery-complete': { haptic: 'haptic-commit', sound: 'sound-complete', completion: true, requiresVerification: true },
});

function bool(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeContext(context = {}) {
  return {
    semanticState: context.semanticState ?? null,
    hapticsEnabled: bool(context.hapticsEnabled, true),
    soundEnabled: bool(context.soundEnabled, true),
    systemHapticsAllowed: bool(context.systemHapticsAllowed, true),
    systemSoundAllowed: bool(context.systemSoundAllowed, true),
    hapticCapability: bool(context.hapticCapability, false),
    silentMode: bool(context.silentMode, false),
    doNotDisturb: bool(context.doNotDisturb, false),
    screenReaderActive: bool(context.screenReaderActive, false),
    sensoryReduction: bool(context.sensoryReduction, false),
    requestedNotification: bool(context.requestedNotification, false),
    requestSound: bool(context.requestSound, false),
    foregroundSignificant: bool(context.foregroundSignificant, false),
    authoritativeVerified: bool(context.authoritativeVerified, false),
    repeatCount: Number.isInteger(context.repeatCount) && context.repeatCount > 0 ? context.repeatCount : 1,
    allowWithScreenReader: bool(context.allowWithScreenReader, false),
  };
}

function mayUseHaptic(token, event, context) {
  if (!token) return false;
  if (!context.hapticsEnabled || !context.systemHapticsAllowed || !context.hapticCapability) return false;
  if (context.sensoryReduction && ['tick', 'selection', 'snap'].includes(event)) return false;
  return true;
}

function mayUseSound(route, event, context) {
  if (!route.sound) return false;
  if (!context.soundEnabled || !context.systemSoundAllowed || context.silentMode || context.doNotDisturb) return false;
  if (context.screenReaderActive && !context.allowWithScreenReader) return false;
  if (context.sensoryReduction && !['warning', 'error'].includes(event)) return false;
  if (route.foregroundOnly && !context.foregroundSignificant) return false;
  if (route.completion && !context.requestedNotification) return false;
  if (route.soundRequiresRequest && !context.requestSound) return false;
  return true;
}

export function planFeedback(event, rawContext = {}) {
  if (typeof event !== 'string' || !event.trim()) throw new TypeError('event is required');
  const normalizedEvent = event.trim();
  const context = normalizeContext(rawContext);
  const base = {
    event: normalizedEvent,
    semanticState: context.semanticState,
    haptic: null,
    sound: null,
    coalesced: context.repeatCount > 1,
    repeatCount: context.repeatCount,
    blockedByVerification: false,
    policyOnly: true,
  };

  if (ROUTINE_SILENT.has(normalizedEvent)) return Object.freeze(base);
  const route = ROUTES[normalizedEvent];
  if (!route) return Object.freeze(base);

  if (route.requiresVerification && !context.authoritativeVerified) {
    return Object.freeze({ ...base, blockedByVerification: true });
  }

  const haptic = mayUseHaptic(route.haptic, normalizedEvent, context) ? route.haptic : null;
  const sound = mayUseSound(route, normalizedEvent, context) ? route.sound : null;
  return Object.freeze({ ...base, haptic, sound });
}

export function describeFeedbackPlan(plan) {
  if (!plan || typeof plan !== 'object') throw new TypeError('plan is required');
  const parts = [];
  parts.push(`Semantic state: ${plan.semanticState ?? 'unchanged/unspecified'}.`);
  parts.push(`Haptic: ${plan.haptic ?? 'none'}.`);
  parts.push(`Sound: ${plan.sound ?? 'none'}.`);
  if (plan.blockedByVerification) parts.push('Success feedback blocked pending authoritative verification.');
  if (plan.coalesced) parts.push(`Repeated events represented as one aggregate cue (${plan.repeatCount} events).`);
  return parts.join(' ');
}

export function initializeSoundHapticsReference(scope = document) {
  for (const button of scope.querySelectorAll('[data-feedback-event]')) {
    button.addEventListener('click', () => {
      const root = button.closest('[data-feedback-root]');
      if (!root) return;
      const context = {
        semanticState: root.querySelector('[data-semantic-state]')?.textContent?.trim() || null,
        hapticsEnabled: root.dataset.hapticsEnabled !== 'false',
        soundEnabled: root.dataset.soundEnabled !== 'false',
        systemHapticsAllowed: root.dataset.systemHapticsAllowed !== 'false',
        systemSoundAllowed: root.dataset.systemSoundAllowed !== 'false',
        hapticCapability: root.dataset.hapticCapability === 'true',
        silentMode: root.dataset.silentMode === 'true',
        doNotDisturb: root.dataset.doNotDisturb === 'true',
        screenReaderActive: root.dataset.screenReaderActive === 'true',
        sensoryReduction: root.dataset.sensoryReduction === 'true',
        requestedNotification: button.dataset.requestedNotification === 'true',
        requestSound: button.dataset.requestSound === 'true',
        foregroundSignificant: button.dataset.foregroundSignificant === 'true',
        authoritativeVerified: button.dataset.authoritativeVerified === 'true',
        repeatCount: Number(button.dataset.repeatCount || '1'),
      };
      const plan = planFeedback(button.dataset.feedbackEvent, context);
      const output = root.querySelector('[data-feedback-plan]');
      if (output) output.textContent = describeFeedbackPlan(plan);
      root.dispatchEvent(new CustomEvent('glz:feedback-plan', { bubbles: true, detail: plan }));
    });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeSoundHapticsReference(), { once: true });
  } else {
    initializeSoundHapticsReference();
  }
}

if (typeof window !== 'undefined') {
  window.GlazeV12FeedbackPolicy = Object.freeze({
    HAPTIC_TOKENS,
    SOUND_TOKENS,
    planFeedback,
    describeFeedbackPlan,
    initializeSoundHapticsReference,
  });
}
