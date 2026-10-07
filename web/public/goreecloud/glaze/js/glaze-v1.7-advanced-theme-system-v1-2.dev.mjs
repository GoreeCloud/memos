/* GLAZE UI V1.7 — Advanced Theme System v1.2 Development reconciliation.
 *
 * Bounded source reconciliation for current-plan Sections 6-21. This layer extends
 * historical Personalization 2.0 dev.5 and Theme/Semantic Color dev.8 without
 * relabeling them. Glaze remains presentation-only and never persists a preference,
 * grants authority, creates provider truth, or executes imported theme code.
 */

import {
  generateGlazeThemePalette,
  evaluateGlazeThemeAccessibility,
  resolveGlazeThemeSafety,
  resolveGlazeThemeColorOverrides
} from './glaze-v1.7-theme-semantic-color.dev.mjs';

const APPEARANCE_MODES=Object.freeze(['follow-system','light','dark','deep-dark']);
const CONCRETE_APPEARANCE_MODES=Object.freeze(['light','dark','deep-dark']);
const EXPRESSION_PROFILES=Object.freeze(['calm','balanced','expressive']);
const ACTIONS=Object.freeze(['preview','apply-proposal','reset-proposal','undo-proposal','duplicate-proposal']);
const SCOPE_KINDS=Object.freeze(['session-preview','global','application','device']);
const PACKAGE_FORMAT='goreecloud.glaze-theme';
const PACKAGE_VERSION=1;
const THEME_COLOR_ROLES=Object.freeze([
  'primary-accent','secondary-accent','tertiary-accent','canvas-atmosphere',
  'interactive-highlight','selection','decorative-tint','material-atmosphere',
  'application-identity','wallpaper-influence'
]);
const PROTECTED_SEMANTIC_ROLES=Object.freeze([
  'success','warning','danger','error','critical','destructive','privacy','security',
  'protected','restricted','trusted','unverified','recovery'
]);
const NAVIGATION_STATES=Object.freeze([
  'current-destination','current-workspace','selected','focused','editing','dragging',
  'active-filter','search-scope','current-profile','related-information'
]);
const SYSTEM_STATES=Object.freeze(['security','privacy','backup','recovery','identity','authentication']);
const CONNECTIVITY_STATES=Object.freeze(['online','offline','connecting','limited-connectivity','unavailable','failed']);
const SYNC_STATES=Object.freeze(['synchronized','synchronizing','pending','paused','conflict','unavailable','failed']);
const DIAGNOSTIC_KEYS=Object.freeze([
  'textContrast','focusVisibility','selectionVisibility','semanticStateSeparation',
  'categoricalColorSeparation','glazeReadability','disabledStateClarity',
  'colorVisionAccessibility','grayscaleUsability','forcedColorsCompatibility'
]);
const SAFE_ADJUSTMENTS=Object.freeze(['tone','chroma','foreground','material-opacity']);
const PROHIBITED_PACKAGE_KEYS=Object.freeze(new Set([
  'code','script','scripts','module','modules','function','functions','eval',
  'tracker','trackers','analytics','analyticsEndpoint','telemetryEndpoint',
  'remoteUrl','remoteUrls','remoteResource','remoteResources','runtimeDependency',
  'runtimeDependencies','fontUrl','fontUrls','animationCode','animationScript',
  'keyframes','cssUrl','javascriptUrl'
]));

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function semantic(value,fallback=null){
  const normalized=String(value??'').trim().toLowerCase();
  return normalized||fallback;
}
function member(value,allowed,label,fallback=null){
  const normalized=semantic(value,fallback);
  if(!allowed.includes(normalized))throw new RangeError('Unsupported '+label+': '+normalized);
  return normalized;
}
function boundedText(value,max=160){
  if(typeof value!=='string')return null;
  const normalized=value.trim();
  return normalized&&normalized.length<=max?normalized:null;
}
function stringList(value,max=64){
  if(!Array.isArray(value))return Object.freeze([]);
  return Object.freeze([...new Set(value.map(v=>boundedText(String(v??''),120)).filter(Boolean))].slice(0,max));
}
function hasProhibitedPackageContent(value,path='package'){
  if(Array.isArray(value)){
    for(let index=0;index<value.length;index++){
      const nested=hasProhibitedPackageContent(value[index],path+'['+index+']');
      if(nested)return nested;
    }
    return null;
  }
  if(!plainObject(value))return null;
  for(const [key,item] of Object.entries(value)){
    if(PROHIBITED_PACKAGE_KEYS.has(key))return path+'.'+key;
    const nested=hasProhibitedPackageContent(item,path+'.'+key);
    if(nested)return nested;
  }
  return null;
}
function scopeDescriptor(input){
  const requested=member(input.scopeKind,SCOPE_KINDS,'theme preference scope','session-preview');
  const id=boundedText(input.scopeId);
  const authoritative=input.scopeAuthoritative===true;
  const requiresIdentity=requested==='application'||requested==='device';
  const accepted=requested==='session-preview'||requested==='global'
    ? authoritative||requested==='session-preview'
    : authoritative&&id!==null;
  return Object.freeze({
    requested,
    effective:accepted?requested:'session-preview',
    identity:accepted&&requiresIdentity?id:null,
    authoritative,
    accepted,
    fallbackApplied:!accepted,
    applicationPreferenceAuthorityCreatedByGlaze:false,
    devicePreferenceAuthorityCreatedByGlaze:false
  });
}
function appearanceDescriptor(input){
  const requested=member(input.appearanceMode,APPEARANCE_MODES,'appearance mode','follow-system');
  if(requested!=='follow-system'){
    return Object.freeze({
      requested,effective:requested,systemAppearance:null,
      systemAppearanceAuthoritative:false,followSystemResolved:true,fallbackApplied:false
    });
  }
  const supplied=semantic(input.systemAppearance,null);
  const authoritative=input.systemAppearanceAuthoritative===true;
  const valid=supplied!==null&&CONCRETE_APPEARANCE_MODES.includes(supplied);
  return Object.freeze({
    requested,
    effective:authoritative&&valid?supplied:'light',
    systemAppearance:authoritative&&valid?supplied:null,
    systemAppearanceAuthoritative:authoritative&&valid,
    followSystemResolved:authoritative&&valid,
    fallbackApplied:!(authoritative&&valid),
    fallbackReason:authoritative&&valid?null:'untrusted-system-appearance'
  });
}
function authorityBlock(){
  return Object.freeze({
    presentationOnly:true,
    providerTruthCreatedByGlaze:false,
    securityTruthCreatedByGlaze:false,
    privacyTruthCreatedByGlaze:false,
    connectivityTruthCreatedByGlaze:false,
    synchronizationTruthCreatedByGlaze:false,
    recoveryTruthCreatedByGlaze:false,
    identityTruthCreatedByGlaze:false,
    themePreferencePersistedByGlaze:false,
    applicationPreferenceAuthorityCreatedByGlaze:false,
    devicePreferenceAuthorityCreatedByGlaze:false,
    remoteResourceAuthorityCreatedByGlaze:false,
    executableThemeContentAccepted:false
  });
}
function acceptanceBlock(){
  return Object.freeze({
    sourceReconciliationOnly:true,
    v12Sections6Through21SourceRequirementsMapped:true,
    v12Sections6Through21Complete:false,
    renderedAcceptanceEstablished:false,
    nativePlatformAcceptanceEstablished:false,
    assistiveTechnologyAcceptanceEstablished:false,
    representativeDeviceAcceptanceEstablished:false,
    performanceAcceptanceEstablished:false,
    energyAcceptanceEstablished:false,
    humanVisualReviewEstablished:false,
    downstreamConsumerAcceptanceAutomatic:false,
    releasePromotionAutomatic:false,
    deploymentAcceptanceAutomatic:false,
    productionAcceptanceAutomatic:false
  });
}

export function resolveGlazeAdvancedThemeManager(input={}){
  if(!plainObject(input))throw new TypeError('Advanced Theme Manager input must be a plain object');
  const action=member(input.action,ACTIONS,'theme action','preview');
  const appearance=appearanceDescriptor(input);
  const scope=scopeDescriptor(input);
  const explicitUserIntent=input.explicitUserIntent===true;
  const requestedThemeId=boundedText(input.themeId)??'glaze-default';
  const themeIdentityAuthoritative=input.themeIdentityAuthoritative===true||requestedThemeId==='glaze-default';
  const actionRequiresIntent=action!=='preview';
  const actionAccepted=(!actionRequiresIntent||explicitUserIntent)
    &&themeIdentityAuthoritative&&(action==='preview'||scope.accepted);

  const primarySeed=boundedText(input.primarySeed);
  const secondarySeed=boundedText(input.secondarySeed);
  const tertiarySeed=boundedText(input.tertiarySeed);
  const paletteAuthority=input.paletteSeedAuthoritative===true;
  const generatedPrimary=paletteAuthority&&primarySeed
    ?generateGlazeThemePalette({seed:primarySeed,mode:appearance.effective}):null;
  const generatedSecondary=paletteAuthority&&secondarySeed
    ?generateGlazeThemePalette({seed:secondarySeed,mode:appearance.effective}):null;
  const generatedTertiary=paletteAuthority&&tertiarySeed
    ?generateGlazeThemePalette({seed:tertiarySeed,mode:appearance.effective}):null;
  const overrides=resolveGlazeThemeColorOverrides(
    plainObject(input.themeColorOverrides)?input.themeColorOverrides:{}
  );

  return Object.freeze({
    version:'1.7.0-dev.31',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze(Array.from({length:16},(_,i)=>i+6)),
    theme:Object.freeze({
      requestedThemeId,
      themeIdentityAuthoritative,
      appearance,
      expressionProfile:member(input.expressionProfile,EXPRESSION_PROFILES,'expression profile','balanced'),
      goreeCloudPreset:boundedText(input.goreeCloudPreset),
      userCreatedTheme:input.userCreatedTheme===true,
      applicationAware:input.applicationAware===true,
      materialIntensity:boundedText(input.materialIntensity),
      glazeClarity:boundedText(input.glazeClarity),
      densityProfile:boundedText(input.densityProfile),
      geometryProfile:boundedText(input.geometryProfile),
      motionExpressionProfile:boundedText(input.motionExpressionProfile)
    }),
    scope,
    palette:Object.freeze({
      sourceAuthoritative:paletteAuthority,
      primary:generatedPrimary,
      secondary:generatedSecondary,
      tertiary:generatedTertiary,
      multiColorSupported:true,
      wallpaperSummaryAcceptedOnlyFromAuthoritativeCaller:true,
      applicationIdentityAcceptedOnlyFromAuthoritativeCaller:true,
      generatedLocally:true,
      networkRequired:false,
      protectedSemanticPalettesReplaced:false
    }),
    overrides,
    action:Object.freeze({
      requested:action,
      accepted:actionAccepted,
      explicitUserIntent,
      intentRequired:actionRequiresIntent,
      previewOnly:action==='preview',
      callerMustPersist:actionAccepted&&action!=='preview',
      persistencePerformedByGlaze:false,
      reason:actionAccepted?'proposal-accepted':
        !themeIdentityAuthoritative?'authoritative-theme-identity-required':
        actionRequiresIntent&&!explicitUserIntent?'explicit-user-intent-required':
        !scope.accepted?'authoritative-scope-required':'proposal-rejected'
    }),
    preview:Object.freeze({
      livePreviewSupported:true,
      previewBeforeApplyRequired:true,
      accessibilityPreviewSupported:true,
      colorVisionPreviewSupported:true,
      contrastDiagnosticsSupported:true,
      previewIsNotPersistence:true
    }),
    history:Object.freeze({
      historySupported:true,
      callerOwnsHistory:true,
      undoProposalSupported:true,
      duplicationProposalSupported:true,
      historyWrittenByGlaze:false
    }),
    authority:authorityBlock(),
    acceptanceBoundary:acceptanceBlock()
  });
}

export function evaluateGlazeThemeAccessibilityV12(input={}){
  if(!plainObject(input))throw new TypeError('Theme accessibility input must be a plain object');
  const base=plainObject(input.baseContrast)?evaluateGlazeThemeAccessibility(input.baseContrast):null;
  const authoritative=input.diagnosticsAuthoritative===true;
  const diagnostics={};
  for(const key of DIAGNOSTIC_KEYS)diagnostics[key]=authoritative&&input[key]===true;
  if(base){
    diagnostics.textContrast=authoritative&&base.normalTextPass===true;
    diagnostics.focusVisibility=authoritative&&base.focusPass===true;
  }
  const failures=DIAGNOSTIC_KEYS.filter(key=>diagnostics[key]!==true);
  const requestedAdjustments=stringList(input.requestedAutomaticAdjustments,16);
  const safeAdjustments=requestedAdjustments.filter(item=>SAFE_ADJUSTMENTS.includes(item));
  const rejectedAdjustments=requestedAdjustments.filter(item=>!SAFE_ADJUSTMENTS.includes(item));
  return Object.freeze({
    version:'1.7.0-dev.31',
    diagnosticsAuthoritative:authoritative,
    diagnostics:Object.freeze(diagnostics),
    failures:Object.freeze(failures),
    conformant:authoritative&&failures.length===0,
    automaticCorrection:Object.freeze({
      mayAdjust:Object.freeze(safeAdjustments),
      rejected:Object.freeze(rejectedAdjustments),
      semanticMeaningMayChange:false,
      protectedSemanticRolesMayBeReassigned:false
    }),
    forcedColorsAuthorityPreserved:true,
    colorOnlyMeaningAllowed:false,
    grayscaleUsabilityRequired:true,
    colorVisionAccessibilityRequired:true,
    authority:authorityBlock()
  });
}

export function resolveGlazeThemeSafetyV12(input={}){
  if(!plainObject(input))throw new TypeError('Theme safety input must be a plain object');
  const evaluation=plainObject(input.evaluation)?input.evaluation:null;
  const base=resolveGlazeThemeSafety({
    requestedThemeId:boundedText(input.requestedThemeId)??'custom-theme',
    diagnostics:{conformant:evaluation?.conformant===true}
  });
  return Object.freeze({
    ...base,
    version:'1.7.0-dev.31',
    invalidPropertiesDisabled:evaluation?.conformant===true?Object.freeze([]):stringList(input.invalidProperties,64),
    repairSurfaceMustRemainReachable:true,
    resetSurfaceMustRemainReachable:true,
    unsafeThemeMayBlockThemeManager:false,
    authority:authorityBlock()
  });
}

export function resolveGlazeThemePackage(input={}){
  if(!plainObject(input))throw new TypeError('Theme package input must be a plain object');
  const packageObject=plainObject(input.package)?input.package:null;
  if(!packageObject)return Object.freeze({accepted:false,reason:'package-required',version:'1.7.0-dev.31'});
  const prohibitedPath=hasProhibitedPackageContent(packageObject);
  const format=boundedText(packageObject.format);
  const version=Number(packageObject.version);
  const id=boundedText(packageObject.id);
  const sourceAuthoritative=input.sourceAuthoritative===true;
  const declarative=format===PACKAGE_FORMAT&&version===PACKAGE_VERSION&&id!==null;
  const requestedOverrides=plainObject(packageObject.themeColorOverrides)?packageObject.themeColorOverrides:{};
  const overrides=resolveGlazeThemeColorOverrides(requestedOverrides);
  const accepted=sourceAuthoritative&&declarative&&prohibitedPath===null;
  return Object.freeze({
    version:'1.7.0-dev.31',
    accepted,
    reason:accepted?'declarative-package-accepted':
      !sourceAuthoritative?'authoritative-source-required':
      !declarative?'unsupported-package-format':'prohibited-package-content:'+prohibitedPath,
    package:Object.freeze({
      format,
      packageVersion:Number.isFinite(version)?version:null,
      id,
      inspectible:true,
      nonExecutable:true,
      bounded:true,
      portable:true,
      remoteRuntimeResourcesAllowed:false,
      trackersAllowed:false,
      analyticsDependenciesAllowed:false,
      protectedSemanticOverrideAllowed:false,
      overrides
    }),
    import:Object.freeze({
      previewOnly:true,
      autoApply:false,
      persistenceAutomatic:false,
      explicitUserIntentRequiredForApply:true
    }),
    export:Object.freeze({
      declarativeOnly:true,
      remoteRuntimeResourcesIncluded:false,
      executableContentIncluded:false
    }),
    authority:authorityBlock()
  });
}

export function resolveGlazeThemeHistory(input={}){
  if(!plainObject(input))throw new TypeError('Theme history input must be a plain object');
  const entries=Array.isArray(input.entries)?input.entries.filter(plainObject).slice(0,100):[];
  const historyAuthoritative=input.historyAuthoritative===true;
  const explicitUserIntent=input.explicitUserIntent===true;
  const current=entries.length?entries[entries.length-1]:null;
  const previous=entries.length>1?entries[entries.length-2]:null;
  const undoAccepted=historyAuthoritative&&explicitUserIntent&&previous!==null;
  return Object.freeze({
    version:'1.7.0-dev.31',
    historyAuthoritative,
    entryCount:historyAuthoritative?entries.length:0,
    current:historyAuthoritative?current:null,
    previous:undoAccepted?previous:null,
    undo:Object.freeze({
      accepted:undoAccepted,
      proposedTheme:undoAccepted?previous:null,
      explicitUserIntentRequired:true,
      callerMustPersist:undoAccepted,
      persistencePerformedByGlaze:false
    }),
    authority:authorityBlock()
  });
}

export function resolveGlazeColorCodedContext(input={}){
  if(!plainObject(input))throw new TypeError('Color-coded context input must be a plain object');
  const domain=member(input.domain,['navigation','system','connectivity','synchronization','data-visualization'],'color context domain');
  const state=semantic(input.state,null);
  if(state===null)throw new RangeError('Color context state is required');
  let allowed=[];
  let provider='caller';
  let truthBearing=false;
  if(domain==='navigation')allowed=NAVIGATION_STATES;
  if(domain==='system'){
    allowed=SYSTEM_STATES;
    truthBearing=true;
    provider=state==='security'?'Wardveil Security':
      state==='privacy'?'Privacy Shield':
      state==='backup'||state==='recovery'?'Everkeep':
      state==='identity'||state==='authentication'?'GoreeCloud Identity':'responsible provider';
  }
  if(domain==='connectivity'){allowed=CONNECTIVITY_STATES;truthBearing=true;provider='connectivity provider';}
  if(domain==='synchronization'){allowed=SYNC_STATES;truthBearing=true;provider='synchronization provider';}
  if(domain==='data-visualization')allowed=['category','series','range','selection','comparison'];
  if(!allowed.includes(state))throw new RangeError('Unsupported '+domain+' state: '+state);
  const authoritative=!truthBearing||input.stateAuthoritative===true;
  return Object.freeze({
    version:'1.7.0-dev.31',
    domain,
    requestedState:state,
    acceptedState:authoritative?state:'unknown',
    authoritative,
    providerAuthority:provider,
    connectivityAndSynchronizationConflated:false,
    colorOnlyMeaningAllowed:false,
    supplementaryCueRequired:true,
    protectedSemanticPaletteCollisionAllowed:false,
    categoricalPaletteMustAvoidProtectedSemanticConfusion:domain==='data-visualization',
    authority:authorityBlock()
  });
}

export const glazeV17AdvancedThemeSystemV12DevelopmentContract=Object.freeze({
  version:'1.7.0-dev.31',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze(Array.from({length:16},(_,i)=>i+6)),
  historicalPersonalizationFoundation:'1.7.0-dev.5',
  historicalThemeSemanticColorFoundation:'1.7.0-dev.8',
  themeTransitionFoundation:'1.7.0-dev.20',
  motionExpressionProfilesFoundation:'1.7.0-dev.21',
  motionPersonalizationFoundation:'1.7.0-dev.22',
  historicalFoundationsReinterpreted:false,
  appearanceModes:APPEARANCE_MODES,
  expressionProfiles:EXPRESSION_PROFILES,
  packageFormat:PACKAGE_FORMAT,
  packageVersion:PACKAGE_VERSION,
  themeColorRoles:THEME_COLOR_ROLES,
  protectedSemanticRoles:PROTECTED_SEMANTIC_ROLES,
  sourceRequirementsMapped:true,
  sections6Through21Complete:false,
  presentationOnly:true,
  localFirst:true,
  offlineCompleteThemeExperienceRequired:true,
  protectedSemanticOverrideAllowed:false,
  executableThemePackageContentAllowed:false,
  remoteRuntimeResourcesAllowed:false,
  colorOnlyMeaningAllowed:false,
  consumerAdoptionAutomatic:false,
  releasePromotionAutomatic:false
});
