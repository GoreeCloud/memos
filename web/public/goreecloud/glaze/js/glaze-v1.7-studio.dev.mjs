/* GLAZE UI V1.7 — Glaze Studio Development foundation. */
import {inspectGlazeElement} from './glaze-v1.7-inspector.dev.mjs';
import {resolveGlazePersonalizationAction} from './glaze-v1.7-personalization.dev.mjs';
import {resolveGlazeNativeKit} from './glaze-v1.7-native-glaze-kits.dev.mjs';

const EXPLORATION_AXES=Object.freeze([
  'components','semantic-states','theme-presets','user-created-themes','color-families',
  'appearance-modes','expression-modes','form-factors','adaptive-layouts','motion',
  'loading-behavior','error-states','accessibility-configurations','platform-mappings'
]);
const SESSION_ROLES=Object.freeze(['designer','developer','reviewer']);
const APPEARANCE_MODES=Object.freeze(['light','dark','deep-dark','follow-system']);
const EXPRESSION_MODES=Object.freeze(['calm','balanced','expressive']);
const SCENE_STATES=Object.freeze(['default','loading','error','warning','success','disabled','selected','focused']);
const CONCRETE_APPEARANCE=Object.freeze(['light','dark','deep-dark']);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function member(value,allowed,label,fallback=null){
  const normalized=String(value??fallback??'').trim();
  if(!allowed.includes(normalized))throw new RangeError(`Unsupported ${label}: ${normalized}`);
  return normalized;
}
function text(value,max=180){
  const normalized=String(value??'').trim();
  return normalized?normalized.slice(0,max):null;
}
function unique(values,allowed,max=100){
  if(!Array.isArray(values))return Object.freeze([]);
  const out=[];
  for(const value of values){
    const normalized=String(value??'').trim();
    if(!normalized)continue;
    if(allowed&&!allowed.includes(normalized))throw new RangeError(`Unsupported Studio value: ${normalized}`);
    if(!out.includes(normalized))out.push(normalized);
    if(out.length>=max)break;
  }
  return Object.freeze(out);
}
function sceneSemanticRole(sceneState){
  if(sceneState==='error')return 'error';
  if(sceneState==='warning')return 'warning';
  if(sceneState==='success')return 'success';
  return 'information';
}

export function createGlazeStudioSession(input={}){
  if(!plainObject(input))throw new TypeError('Studio session input must be a plain object');
  const role=member(input.role,SESSION_ROLES,'Studio session role','developer');
  const explorationAxes=input.explorationAxes==null
    ? EXPLORATION_AXES
    : unique(input.explorationAxes,EXPLORATION_AXES,EXPLORATION_AXES.length);
  return Object.freeze({
    version:'1.7.0-dev.12',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.1',
    v11SpecificationSections:Object.freeze([27]),
    sessionId:text(input.sessionId,120)??'local-studio-session',
    role,
    explorationAxes,
    localOnly:true,
    networkRequired:false,
    telemetryRequired:false,
    repositoryContractsReplaced:false,
    themeManagerReplaced:false,
    sourceMutationAutomatic:false,
    acceptanceGrantedByStudio:false
  });
}

export function proposeGlazeStudioThemeDraft(input={}){
  if(!plainObject(input))throw new TypeError('Studio theme draft input must be a plain object');
  const appearanceMode=member(input.appearanceMode,APPEARANCE_MODES,'Studio appearance mode','light');
  const expressionMode=member(input.expressionMode,EXPRESSION_MODES,'Studio expression mode','balanced');

  let resolvedAppearance=appearanceMode;
  let systemAppearanceVerified=true;
  if(appearanceMode==='follow-system'){
    const systemAppearance=text(input.resolvedSystemAppearance,40);
    const authoritative=input.systemAppearanceAuthoritative===true;
    systemAppearanceVerified=authoritative&&CONCRETE_APPEARANCE.includes(systemAppearance);
    resolvedAppearance=systemAppearanceVerified?systemAppearance:'light';
  }

  const preview=resolveGlazePersonalizationAction({
    action:'preview',
    currentPreferences:plainObject(input.currentPreferences)?input.currentPreferences:{appearance:resolvedAppearance},
    requestedPreferences:{
      ...(plainObject(input.requestedPreferences)?input.requestedPreferences:{}),
      appearance:resolvedAppearance,
      scope:'session-preview',
      accessibilityProfiles:Array.isArray(input.accessibilityProfiles)?input.accessibilityProfiles:undefined
    }
  });

  return Object.freeze({
    draftId:text(input.draftId,120)??'studio-theme-draft',
    appearanceMode,
    expressionMode,
    resolvedSystemAppearance:appearanceMode==='follow-system'
      ? Object.freeze({requested:true,verified:systemAppearanceVerified,effective:resolvedAppearance})
      : Object.freeze({requested:false,verified:true,effective:resolvedAppearance}),
    preview,
    localOnly:true,
    executableCodeAllowed:false,
    remoteTrackersAllowed:false,
    protectedSemanticOverrideAllowed:false,
    persistenceAutomatic:false,
    applyAutomatic:false,
    themeManagerReplaced:false,
    callerMustPersistOutsideStudio:false,
    authority:Object.freeze({
      previewOnly:true,
      userThemeAuthorityOwnedByUserAndCaller:true,
      providerTruthCreatedByStudio:false,
      consentGrantedByStudio:false,
      permissionGrantedByStudio:false
    })
  });
}

export function resolveGlazeStudioScene(input={}){
  if(!plainObject(input))throw new TypeError('Studio scene input must be a plain object');
  const sceneState=member(input.sceneState,SCENE_STATES,'Studio scene state','default');
  const appearanceMode=member(input.appearanceMode,APPEARANCE_MODES,'Studio appearance mode','light');
  const expressionMode=member(input.expressionMode,EXPRESSION_MODES,'Studio expression mode','balanced');
  const semanticRole=input.semanticColorRole??sceneSemanticRole(sceneState);
  const semanticAuthoritative=input.semanticColorAuthoritative===true;

  const inspector=inspectGlazeElement({
    ...input,
    semanticColorRole:semanticRole,
    semanticColorAuthoritative:semanticAuthoritative,
    semanticProminence:input.semanticProminence??(sceneState==='error'||sceneState==='warning'?'prominent':'standard')
  });

  let nativeMapping=null;
  if(input.platform!=null){
    nativeMapping=resolveGlazeNativeKit({
      platform:input.platform,
      profile:input.profile,
      semanticRole:input.nativeSemanticRole??'surface',
      nativeControl:input.nativeControl,
      nativeControlMappingAuthoritative:input.nativeControlMappingAuthoritative,
      capabilityState:input.capabilityState??'unknown',
      capabilityAuthoritative:input.capabilityAuthoritative,
      systemAppearanceApiState:input.systemAppearanceApiState??'unknown',
      systemAppearanceApiAuthoritative:input.systemAppearanceApiAuthoritative,
      platformColorApiState:input.platformColorApiState??'unknown',
      platformColorApiAuthoritative:input.platformColorApiAuthoritative,
      semanticColorRole:semanticRole,
      semanticProminence:input.semanticProminence??'standard',
      semanticColorAuthoritative:semanticAuthoritative,
      accessibilityThemeToken:input.accessibilityThemeToken,
      accessibilityThemeAuthoritative:input.accessibilityThemeAuthoritative,
      protectedSemanticThemeToken:input.protectedSemanticThemeToken,
      protectedSemanticThemeAuthoritative:input.protectedSemanticThemeAuthoritative,
      productIdentityThemeToken:input.productIdentityThemeToken,
      productIdentityThemeAuthoritative:input.productIdentityThemeAuthoritative,
      userThemeToken:input.userThemeToken,
      userThemeAuthoritative:input.userThemeAuthoritative,
      contextualAccentToken:input.contextualAccentToken,
      contextualAccentAuthoritative:input.contextualAccentAuthoritative,
      glazeDefaultThemeToken:input.glazeDefaultThemeToken,
      accessibilityProfiles:input.accessibilityProfiles,
      previousTaskState:input.previousTaskState
    });
  }

  return Object.freeze({
    version:'1.7.0-dev.12',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    planVersion:'v1.1',
    v11SpecificationSections:Object.freeze([27]),
    sceneId:text(input.sceneId,120)??'studio-scene',
    sceneState:Object.freeze({
      requested:sceneState,
      providerAuthoritative:input.sceneStateAuthoritative===true,
      simulation:input.sceneStateAuthoritative!==true,
      providerTruthCreatedByStudio:false
    }),
    appearanceMode,
    expressionMode,
    component:inspector.component,
    inspector,
    nativeMapping,
    previews:Object.freeze({
      component:true,
      semanticState:true,
      theme:true,
      colorFamily:true,
      formFactor:true,
      adaptiveLayout:true,
      motion:true,
      loadingBehavior:true,
      errorState:true,
      accessibilityConfiguration:true,
      platformMapping:nativeMapping!==null,
      renderedEvidenceClaimed:false,
      nativeAcceptanceClaimed:false,
      assistiveTechnologyAcceptanceClaimed:false,
      performanceAcceptanceClaimed:false,
      humanReviewClaimed:false
    }),
    authority:Object.freeze({
      developmentDesignReviewToolOnly:true,
      advisoryOnly:true,
      sourceModifiedAutomatically:false,
      providerTruthCreatedByStudio:false,
      semanticTruthCreatedByStudio:false,
      accessibilityStateCreatedByStudio:false,
      platformCapabilityCreatedByStudio:false,
      applicationActionsExecutedByStudio:false,
      acceptanceGrantedByStudio:false,
      repositoryContractsReplaced:false
    })
  });
}

export function compareGlazeStudioScenes(input={}){
  if(!plainObject(input))throw new TypeError('Studio comparison input must be a plain object');
  if(!Array.isArray(input.scenes)||input.scenes.length<2||input.scenes.length>8){
    throw new RangeError('Studio comparison requires 2 to 8 scenes');
  }
  const scenes=Object.freeze(input.scenes.map((scene,index)=>resolveGlazeStudioScene({
    ...scene,
    sceneId:scene.sceneId??`studio-scene-${index+1}`
  })));
  return Object.freeze({
    version:'1.7.0-dev.12',
    scenes,
    comparisonDimensions:Object.freeze([
      'component','semantic-state','appearance-mode','expression-mode','form-factor',
      'adaptive-layout','accessibility','platform-mapping','authority-boundary'
    ]),
    advisoryOnly:true,
    acceptedWinner:null,
    acceptanceGrantedByStudio:false,
    lifecyclePromotionAutomatic:false
  });
}

export const glazeV17StudioDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.12',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.1',
  v11SpecificationSections:Object.freeze([27]),
  explorationAxes:EXPLORATION_AXES,
  sessionRoles:SESSION_ROLES,
  appearanceModes:APPEARANCE_MODES,
  expressionModes:EXPRESSION_MODES,
  sceneStates:SCENE_STATES,
  localFirst:true,
  networkRequired:false,
  telemetryRequired:false,
  themeDraftPersistence:false,
  themeManagerReplaced:false,
  repositoryContractsReplaced:false,
  section27Complete:false,
  acceptanceGrantedByStudio:false,
  releasePromotionAutomatic:false,
  deploymentAcceptanceAutomatic:false,
  productionAcceptanceAutomatic:false
});
