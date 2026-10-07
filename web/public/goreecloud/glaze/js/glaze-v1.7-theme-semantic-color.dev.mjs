/* GLAZE UI V1.7 — Theme and Semantic Color Reconciliation Development foundation.
 *
 * Development-only presentation primitives for the v1.1 theme/color plan.
 * GLAZE UI V1.6 / 1.6.0 remains the current Official Stable consumer target.
 */

const THEME_LAYER_PRECEDENCE = Object.freeze([
  'accessibility',
  'protected-semantic-state',
  'product-identity',
  'user-theme',
  'contextual-accent',
  'glaze-default'
]);

const SEMANTIC_ROLES = Object.freeze([
  'information','success','warning','danger','error','critical','destructive','privacy','security',
  'protected','restricted','trusted','unverified','online','offline','connecting','synchronizing',
  'pending','unavailable','active','selected','focused','disabled','attention','recovery'
]);

const PROMINENCE_LEVELS = Object.freeze(['subtle','standard','prominent','critical']);

const PROTECTED_SEMANTIC_ROLES = Object.freeze([
  'success','warning','danger','error','critical','destructive','privacy','security','protected',
  'restricted','trusted','unverified','recovery'
]);

const CRITICAL_PROMINENCE_ROLES = Object.freeze([
  'critical','destructive','privacy','security','protected','recovery'
]);

const THEME_COLOR_ROLES = Object.freeze([
  'primary-accent','secondary-accent','tertiary-accent','canvas-atmosphere','interactive-highlight',
  'selection','decorative-tint','material-atmosphere','application-identity','wallpaper-influence'
]);

function plainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function semanticId(value, fallback = null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized || fallback;
}

function semanticMember(value, allowed, label, fallback = null) {
  const normalized = semanticId(value, fallback);
  if (!allowed.includes(normalized)) throw new RangeError(`Unsupported ${label}: ${normalized}`);
  return normalized;
}

function boundedText(value, max = 160) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized.slice(0, max) : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(normalized)) throw new RangeError(`Unsupported color: ${normalized}`);
  return normalized;
}

function hexToRgb(hex) {
  const value = normalizeHex(hex).slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHsl({r,g,b}) {
  const rn=r/255, gn=g/255, bn=b/255;
  const max=Math.max(rn,gn,bn), min=Math.min(rn,gn,bn);
  let h=0, s=0;
  const l=(max+min)/2;
  const d=max-min;
  if (d !== 0) {
    s=d/(1-Math.abs(2*l-1));
    switch(max) {
      case rn: h=60*(((gn-bn)/d)%6); break;
      case gn: h=60*(((bn-rn)/d)+2); break;
      default: h=60*(((rn-gn)/d)+4);
    }
  }
  if (h<0) h+=360;
  return {h,s:s*100,l:l*100};
}

function hslToHex(h,s,l) {
  const sat=clamp(s,0,100)/100, light=clamp(l,0,100)/100;
  const c=(1-Math.abs(2*light-1))*sat;
  const x=c*(1-Math.abs(((h/60)%2)-1));
  const m=light-c/2;
  let rp=0,gp=0,bp=0;
  if(h<60){rp=c;gp=x;} else if(h<120){rp=x;gp=c;} else if(h<180){gp=c;bp=x;}
  else if(h<240){gp=x;bp=c;} else if(h<300){rp=x;bp=c;} else {rp=c;bp=x;}
  const toHex=v=>Math.round((v+m)*255).toString(16).padStart(2,'0');
  return `#${toHex(rp)}${toHex(gp)}${toHex(bp)}`;
}

function relativeLuminance(hex) {
  const {r,g,b}=hexToRgb(hex);
  const linear = [r,g,b].map(channel => {
    const c=channel/255;
    return c<=0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4;
  });
  return 0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
}

export function contrastRatio(foreground, background) {
  const a=relativeLuminance(foreground);
  const b=relativeLuminance(background);
  const lighter=Math.max(a,b), darker=Math.min(a,b);
  return (lighter+0.05)/(darker+0.05);
}

export function resolveGlazeThemeLayer(input = {}) {
  if (!plainObject(input)) throw new TypeError('Theme layer input must be a plain object');

  const layers = {
    accessibility: {
      token: boundedText(input.accessibilityToken),
      authoritative: input.accessibilityAuthoritative === true
    },
    'protected-semantic-state': {
      token: boundedText(input.protectedSemanticToken),
      authoritative: input.protectedSemanticAuthoritative === true
    },
    'product-identity': {
      token: boundedText(input.productIdentityToken),
      authoritative: input.productIdentityAuthoritative === true
    },
    'user-theme': {
      token: boundedText(input.userThemeToken),
      authoritative: input.userThemeAuthoritative !== false
    },
    'contextual-accent': {
      token: boundedText(input.contextualAccentToken),
      authoritative: input.contextualAccentAuthoritative !== false
    },
    'glaze-default': {
      token: boundedText(input.glazeDefaultToken) ?? 'glaze.default',
      authoritative: true
    }
  };

  for (const layer of THEME_LAYER_PRECEDENCE) {
    const candidate=layers[layer];
    if (candidate.token && candidate.authoritative) {
      return Object.freeze({
        layer,
        token:candidate.token,
        precedence:THEME_LAYER_PRECEDENCE.indexOf(layer),
        accessibilityWins:layer==='accessibility',
        protectedSemanticWins:layer==='protected-semantic-state',
        providerTruthManufactured:false
      });
    }
  }
  throw new Error('Glaze default layer must always resolve');
}

export function resolveGlazeSemanticColor(input = {}) {
  if (!plainObject(input)) throw new TypeError('Semantic color input must be a plain object');
  const requestedRole=semanticMember(input.role,[...SEMANTIC_ROLES,'unknown'],'semantic role','unknown');
  const requestedProminence=semanticMember(input.prominence,PROMINENCE_LEVELS,'semantic prominence','standard');
  const authoritative=input.authoritative===true || requestedRole==='unknown';
  const acceptedRole=authoritative ? requestedRole : 'unknown';

  let effectiveProminence=requestedProminence;
  let criticalEscalationRejected=false;
  if (requestedProminence==='critical' && !CRITICAL_PROMINENCE_ROLES.includes(acceptedRole)) {
    effectiveProminence='prominent';
    criticalEscalationRejected=true;
  }

  return Object.freeze({
    requestedRole,
    acceptedRole,
    requestedProminence,
    effectiveProminence,
    authoritative,
    semanticTruthWithheldWithoutAuthority:!authoritative && requestedRole!=='unknown',
    criticalEscalationRejected,
    token:acceptedRole==='unknown' ? null : `semantic.${acceptedRole}.${effectiveProminence}`,
    protected:PROTECTED_SEMANTIC_ROLES.includes(acceptedRole),
    colorOnlyMeaningAllowed:false,
    authority:Object.freeze({
      truthOwnedByProviderOrCaller:true,
      truthCreatedByGlaze:false
    })
  });
}

export function resolveGlazeThemeColorOverrides(overrides = {}) {
  if (!plainObject(overrides)) throw new TypeError('Theme color overrides must be a plain object');
  const accepted={};
  const rejectedProtected=[];
  const rejectedUnsupported=[];

  for (const [rawRole,rawToken] of Object.entries(overrides)) {
    const role=semanticId(rawRole);
    const token=boundedText(rawToken);
    if (PROTECTED_SEMANTIC_ROLES.includes(role)) {
      rejectedProtected.push(role);
      continue;
    }
    if (!THEME_COLOR_ROLES.includes(role)) {
      rejectedUnsupported.push(role);
      continue;
    }
    if (token) accepted[role]=token;
  }

  return Object.freeze({
    accepted:Object.freeze(accepted),
    rejectedProtected:Object.freeze(rejectedProtected),
    rejectedUnsupported:Object.freeze(rejectedUnsupported),
    protectedSemanticOverrideAllowed:false
  });
}

export function generateGlazeThemePalette(input = {}) {
  if (!plainObject(input)) throw new TypeError('Palette input must be a plain object');
  const seed=normalizeHex(input.seed);
  const mode=semanticMember(input.mode,['light','dark','deep-dark'],'palette appearance','light');
  const {h,s,l}=rgbToHsl(hexToRgb(seed));
  const darkMode=mode!=='light';
  const canvas=mode==='light' ? '#ffffff' : mode==='dark' ? '#16191d' : '#08090a';
  const targetLight=darkMode ? 68 : 42;
  const primary=hslToHex(h,Math.max(42,s),targetLight);
  const secondary=hslToHex((h+38)%360,clamp(s*0.72,32,72),darkMode?64:46);
  const tertiary=hslToHex((h+320)%360,clamp(s*0.68,28,68),darkMode?70:44);
  const subtle=hslToHex(h,clamp(s*0.26,10,28),darkMode?28:92);
  const container=hslToHex(h,clamp(s*0.36,14,38),darkMode?22:94);
  const focus=hslToHex((h+12)%360,clamp(s*0.92,58,92),darkMode?76:38);
  const selection=hslToHex((h+350)%360,clamp(s*0.76,42,80),darkMode?58:52);
  const material=hslToHex(h,clamp(s*0.20,8,24),darkMode?18:96);
  const black='#000000', white='#ffffff';
  const foreground=contrastRatio(black,primary)>=contrastRatio(white,primary)?black:white;

  return Object.freeze({
    seed,
    mode,
    primary,
    secondary,
    tertiary,
    subtle,
    container,
    foreground,
    focus,
    selection,
    material,
    canvas,
    generatedLocally:true,
    networkRequired:false,
    telemetryRequired:false,
    protectedSemanticPalettesReplaced:false,
    sourceLightness:l
  });
}

export function evaluateGlazeThemeAccessibility(input = {}) {
  if (!plainObject(input)) throw new TypeError('Theme accessibility input must be a plain object');
  const foreground=normalizeHex(input.foreground);
  const background=normalizeHex(input.background);
  const focus=normalizeHex(input.focus);
  const focusBackground=normalizeHex(input.focusBackground ?? background);

  const textContrast=contrastRatio(foreground,background);
  const focusContrast=contrastRatio(focus,focusBackground);
  const normalTextPass=textContrast>=4.5;
  const largeTextPass=textContrast>=3;
  const focusPass=focusContrast>=3;

  return Object.freeze({
    textContrast,
    focusContrast,
    normalTextPass,
    largeTextPass,
    focusPass,
    conformant:normalTextPass && focusPass,
    colorOnlyMeaningAllowed:false,
    automaticRepairMayChangeSemanticMeaning:false
  });
}

export function resolveGlazeThemeSafety(input = {}) {
  if (!plainObject(input)) throw new TypeError('Theme safety input must be a plain object');
  if (!plainObject(input.diagnostics)) throw new TypeError('Theme safety diagnostics must be a plain object');
  const requestedThemeId=boundedText(input.requestedThemeId) ?? 'custom-theme';
  const conformant=input.diagnostics.conformant===true;
  return Object.freeze({
    requestedThemeId,
    acceptedThemeId:conformant ? requestedThemeId : 'glaze-default',
    fallbackApplied:!conformant,
    reason:conformant ? 'diagnostics-conformant' : 'unsafe-theme-fallback',
    essentialControlsMustRemainReachable:true,
    protectedSemanticMeaningPreserved:true
  });
}

export const glazeV17ThemeSemanticColorDevelopmentContract = Object.freeze({
  version:'1.7.0-dev.8',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.1',
  v11SpecificationSections:Object.freeze([7,8,9,10,11,12,13,18,19,21]),
  v11SectionsComplete:false,
  themeLayerPrecedence:THEME_LAYER_PRECEDENCE,
  semanticRoles:SEMANTIC_ROLES,
  prominenceLevels:PROMINENCE_LEVELS,
  protectedSemanticRoles:PROTECTED_SEMANTIC_ROLES,
  criticalProminenceRoles:CRITICAL_PROMINENCE_ROLES,
  themeColorRoles:THEME_COLOR_ROLES,
  presentationOnly:true,
  accessibilityPrecedence:true,
  networkRequired:false,
  telemetryRequired:false,
  wallpaperUploadRequired:false,
  providerTruthManufactured:false,
  protectedSemanticOverrideAllowed:false,
  colorOnlyMeaningAllowed:false,
  nativeRenderedAcceptance:false,
  consumerAdoptionAutomatic:false,
  releasePromotionAutomatic:false,
  deploymentAcceptanceAutomatic:false,
  productionAcceptanceAutomatic:false
});
