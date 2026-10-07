const APPEARANCE = new Set(['follow-system', 'light', 'dark', 'deep-dark']);
const ACCENT = new Set(['ice', 'slate', 'indigo', 'aqua', 'rose', 'amber']);
const ATMOSPHERE = new Set(['calm', 'balanced', 'expressive']);
const DENSITY = new Set(['comfortable', 'standard', 'productive', 'immersive']);
const CLARITY = new Set(['clear', 'balanced', 'dense']);

const WALLPAPER_DEFAULT_ALPHA = 0.08;
const WALLPAPER_MAX_ALPHA = 0.12;
const WALLPAPER_DEFAULT_CHROMA_RETENTION = 0.24;
const WALLPAPER_MAX_CHROMA_RETENTION = 0.28;

export const DEFAULT_PERSONALIZATION = Object.freeze({
  appearance: 'follow-system',
  accent: 'ice',
  atmosphere: 'balanced',
  density: 'standard',
  clarity: 'balanced'
});

function rootOf(target) {
  if (!target) throw new TypeError('A personalization target is required');
  return target.documentElement || target;
}

function bounded(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function numericChannel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return clamp(Math.round(number), 0, 255);
}

function normalizeWallpaperSample(sample) {
  if (!sample || typeof sample !== 'object') return null;
  const values = Array.isArray(sample) ? sample : [sample.r, sample.g, sample.b];
  if (values.length < 3) return null;
  const [r, g, b] = values.map(numericChannel);
  if ([r, g, b].some(value => value === null)) return null;
  return {r, g, b};
}

export function normalizePersonalization(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  return Object.freeze({
    appearance: bounded(input.appearance, APPEARANCE, DEFAULT_PERSONALIZATION.appearance),
    accent: bounded(input.accent, ACCENT, DEFAULT_PERSONALIZATION.accent),
    atmosphere: bounded(input.atmosphere, ATMOSPHERE, DEFAULT_PERSONALIZATION.atmosphere),
    density: bounded(input.density, DENSITY, DEFAULT_PERSONALIZATION.density),
    clarity: bounded(input.clarity, CLARITY, DEFAULT_PERSONALIZATION.clarity)
  });
}

export function createBrowserSystemAppearanceAdapter(matchMedia = globalThis.matchMedia?.bind(globalThis)) {
  const query = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  return Object.freeze({
    kind: 'browser-system-appearance',
    resolve() {
      return query?.matches ? 'dark' : 'light';
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('A listener function is required');
      if (!query) return () => {};
      const callback = () => listener(query.matches ? 'dark' : 'light');
      if (typeof query.addEventListener === 'function') query.addEventListener('change', callback);
      else if (typeof query.addListener === 'function') query.addListener(callback);
      return () => {
        if (typeof query.removeEventListener === 'function') query.removeEventListener('change', callback);
        else if (typeof query.removeListener === 'function') query.removeListener(callback);
      };
    }
  });
}

export function createWebStoragePreferenceAdapter(storage, key = 'goreecloud.glaze.v1.2.personalization') {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('A Storage-compatible adapter is required');
  }
  return Object.freeze({
    kind: 'consumer-web-storage',
    key,
    load() {
      try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        const envelope = JSON.parse(raw);
        if (envelope?.schemaVersion !== 1 || !envelope.preferences) return null;
        return normalizePersonalization(envelope.preferences);
      } catch {
        return null;
      }
    },
    save(preferences) {
      const normalized = normalizePersonalization(preferences);
      storage.setItem(key, JSON.stringify({schemaVersion: 1, preferences: normalized}));
      return normalized;
    },
    clear() {
      if (typeof storage.removeItem === 'function') storage.removeItem(key);
    }
  });
}

export function deriveWallpaperAtmosphere(sample, options = {}) {
  const normalized = normalizeWallpaperSample(sample);
  if (!normalized) return null;

  const requestedAlpha = Number(options.alpha);
  const alpha = Number.isFinite(requestedAlpha)
    ? clamp(requestedAlpha, 0, WALLPAPER_MAX_ALPHA)
    : WALLPAPER_DEFAULT_ALPHA;

  const requestedRetention = Number(options.chromaRetention);
  const chromaRetention = Number.isFinite(requestedRetention)
    ? clamp(requestedRetention, 0, WALLPAPER_MAX_CHROMA_RETENTION)
    : WALLPAPER_DEFAULT_CHROMA_RETENTION;

  const luminance = Math.round(
    normalized.r * 0.2126 + normalized.g * 0.7152 + normalized.b * 0.0722
  );
  const desaturate = channel => clamp(
    Math.round(luminance + (channel - luminance) * chromaRetention),
    0,
    255
  );

  const derived = {
    r: desaturate(normalized.r),
    g: desaturate(normalized.g),
    b: desaturate(normalized.b),
    alpha,
    chromaRetention,
    source: 'producer-supplied-local-rgb-summary'
  };
  return Object.freeze({
    ...derived,
    css: `rgb(${derived.r} ${derived.g} ${derived.b} / ${derived.alpha})`
  });
}

export function applyWallpaperAtmosphere(target = document, sample = null, options = {}) {
  const root = rootOf(target);
  const derived = deriveWallpaperAtmosphere(sample, options);
  if (!root.style || typeof root.style.setProperty !== 'function') {
    throw new TypeError('Wallpaper atmosphere target must expose a style declaration');
  }
  if (!derived) {
    root.style.setProperty('--glz12-wallpaper-atmosphere', 'transparent');
    delete root.dataset.glzWallpaperAtmosphere;
    return null;
  }
  root.style.setProperty('--glz12-wallpaper-atmosphere', derived.css);
  root.dataset.glzWallpaperAtmosphere = 'local-bounded';
  return derived;
}

export function resolveAppearance(preference = 'follow-system', systemAdapter = createBrowserSystemAppearanceAdapter()) {
  const requested = bounded(preference, APPEARANCE, 'follow-system');
  if (requested !== 'follow-system') return requested;
  const systemValue = systemAdapter?.resolve?.();
  return systemValue === 'dark' || systemValue === 'deep-dark' ? systemValue : 'light';
}

export function applyPersonalization(target = document, preferences = DEFAULT_PERSONALIZATION, options = {}) {
  const root = rootOf(target);
  const normalized = normalizePersonalization(preferences);
  const resolvedAppearance = resolveAppearance(normalized.appearance, options.systemAdapter);
  root.dataset.glzAppearancePreference = normalized.appearance;
  root.dataset.glzAppearance = resolvedAppearance;
  root.dataset.glzAccent = normalized.accent;
  root.dataset.glzAtmosphere = normalized.atmosphere;
  root.dataset.glzDensity = normalized.density;
  root.dataset.glazeClarity = normalized.clarity;
  return Object.freeze({...normalized, resolvedAppearance});
}

export function createPersonalizationController({
  target = document,
  systemAdapter = createBrowserSystemAppearanceAdapter(),
  persistenceAdapter = null,
  initialPreferences = DEFAULT_PERSONALIZATION
} = {}) {
  let current = normalizePersonalization(initialPreferences);
  let stopSystemSubscription = () => {};

  const apply = (next = current, {persist = false} = {}) => {
    current = normalizePersonalization(next);
    const applied = applyPersonalization(target, current, {systemAdapter});
    if (persist && persistenceAdapter?.save) persistenceAdapter.save(current);
    return applied;
  };

  const load = () => {
    const stored = persistenceAdapter?.load?.();
    if (stored) current = normalizePersonalization(stored);
    return apply(current);
  };

  const set = (patch = {}, options = {}) => apply({...current, ...patch}, options);

  const clearPersisted = () => persistenceAdapter?.clear?.();

  const start = () => {
    stopSystemSubscription();
    stopSystemSubscription = systemAdapter?.subscribe?.(() => {
      if (current.appearance === 'follow-system') apply(current);
    }) || (() => {});
    return load();
  };

  const stop = () => {
    stopSystemSubscription();
    stopSystemSubscription = () => {};
  };

  return Object.freeze({
    start,
    stop,
    load,
    set,
    apply: () => apply(current),
    clearPersisted,
    get preferences() { return current; },
    get persistenceEnabled() { return Boolean(persistenceAdapter?.load && persistenceAdapter?.save); }
  });
}

export const personalizationCandidate = Object.freeze({
  version: '1.2.0-candidate',
  consumerEligible: false,
  persistenceAuthority: 'consumer-platform-adapter',
  crossDeviceSyncAuthority: 'separate-governed-goreecloud-sync-integration',
  directCrossDeviceSyncImplemented: false,
  wallpaperSourceAuthority: 'consumer-platform-adapter',
  directWallpaperPixelAcquisitionImplemented: false,
  boundedWallpaperAtmosphereDerivationImplemented: true,
  wallpaperAtmosphereMaximumAlpha: WALLPAPER_MAX_ALPHA,
  wallpaperAtmosphereMaximumChromaRetention: WALLPAPER_MAX_CHROMA_RETENTION,
  profiles: Object.freeze({
    appearance: Object.freeze([...APPEARANCE]),
    accent: Object.freeze([...ACCENT]),
    atmosphere: Object.freeze([...ATMOSPHERE]),
    density: Object.freeze([...DENSITY]),
    clarity: Object.freeze([...CLARITY])
  })
});
