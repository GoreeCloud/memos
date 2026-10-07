/* GLAZE UI V1.7 — Expanded Component System Development foundation. */
import {resolveGlazeTaskContinuity,resolveGlazeAdaptiveComposition} from './glaze-v1.7-task-continuity.dev.mjs';
import {resolveGlazeSemanticColor,resolveGlazeThemeLayer} from './glaze-v1.7-theme-semantic-color.dev.mjs';

const COMPONENTS=Object.freeze(["GlzAdaptivePane","GlzCommandSurface","GlzActivitySurface","GlzNotificationSurface","GlzAdaptiveToolbar","GlzActionCluster","GlzRecoverySurface","GlzProgressSurface","GlzPreferenceGroup","GlzAppearancePicker","GlzThemePreview","GlzColorRolePicker","GlzPalettePreview","GlzAdaptiveSplitView"]);
const NEW_COMPONENTS=Object.freeze(["GlzActivitySurface","GlzAdaptiveToolbar","GlzActionCluster","GlzRecoverySurface","GlzPreferenceGroup","GlzAppearancePicker","GlzThemePreview","GlzColorRolePicker","GlzPalettePreview","GlzAdaptiveSplitView"]);
const FAMILY_BY_COMPONENT=Object.freeze({
  GlzAdaptivePane:'adaptive',GlzAdaptiveToolbar:'adaptive',GlzAdaptiveSplitView:'adaptive',
  GlzCommandSurface:'command-and-action',GlzActionCluster:'command-and-action',
  GlzActivitySurface:'activity-and-recovery',GlzNotificationSurface:'activity-and-recovery',
  GlzRecoverySurface:'activity-and-recovery',GlzProgressSurface:'activity-and-recovery',
  GlzPreferenceGroup:'personalization',GlzAppearancePicker:'personalization',GlzThemePreview:'personalization',
  GlzColorRolePicker:'personalization',GlzPalettePreview:'personalization'
});
const INHERITED_SOURCES=Object.freeze({
  GlzAdaptivePane:'js/glaze-v1.7-task-continuity.dev.mjs',
  GlzCommandSurface:'js/glaze-v1.7-command-surface.dev.mjs',
  GlzNotificationSurface:'js/glaze-v1.7-notification-activity-surfaces.dev.mjs',
  GlzProgressSurface:'js/glaze-v1.7-notification-activity-surfaces.dev.mjs'
});
const PROVIDER_STATE_COMPONENTS=Object.freeze(['GlzActivitySurface','GlzRecoverySurface']);

function plainObject(v){if(v===null||typeof v!=='object'||Array.isArray(v))return false;const p=Object.getPrototypeOf(v);return p===Object.prototype||p===null;}
function member(v,allowed,label){const n=String(v??'').trim();if(!allowed.includes(n))throw new RangeError(`Unsupported ${label}: ${n}`);return n;}
function text(v,max=180){const n=String(v??'').trim();return n?n.slice(0,max):null;}
function rejectLiteralColor(v){if(v==null)return;const s=String(v).trim();if(/^#(?:[0-9a-f]{3,8})$/i.test(s)||/^(?:rgb|rgba|hsl|hsla|oklch|lab|lch)\(/i.test(s))throw new RangeError('Expanded components require semantic color roles, not literal colors');}
function providerState(component,input){if(!PROVIDER_STATE_COMPONENTS.includes(component))return Object.freeze({requestedState:null,acceptedState:null,authoritative:false,withheldWithoutAuthority:false});const requestedState=text(input.providerState,100);const authoritative=input.providerStateAuthoritative===true;return Object.freeze({requestedState,acceptedState:authoritative?requestedState:null,authoritative,withheldWithoutAuthority:requestedState!==null&&!authoritative});}

export function resolveGlazeExpandedComponent(input={}){
  if(!plainObject(input))throw new TypeError('Expanded component input must be a plain object');
  const component=member(input.component,COMPONENTS,'expanded component');
  rejectLiteralColor(input.color);rejectLiteralColor(input.semanticColorRole);
  const semanticColor=resolveGlazeSemanticColor({role:input.semanticColorRole??'information',prominence:input.semanticProminence??'standard',authoritative:input.semanticColorAuthoritative===true});
  const theme=resolveGlazeThemeLayer({
    accessibilityToken:input.accessibilityThemeToken,accessibilityAuthoritative:input.accessibilityThemeAuthoritative,
    protectedSemanticToken:input.protectedSemanticThemeToken,protectedSemanticAuthoritative:input.protectedSemanticThemeAuthoritative,
    productIdentityToken:input.productIdentityThemeToken,productIdentityAuthoritative:input.productIdentityThemeAuthoritative,
    userThemeToken:input.userThemeToken,userThemeAuthoritative:input.userThemeAuthoritative,
    contextualAccentToken:input.contextualAccentToken,contextualAccentAuthoritative:input.contextualAccentAuthoritative,
    glazeDefaultToken:input.glazeDefaultThemeToken
  });
  const continuity=resolveGlazeTaskContinuity({
    environmentChange:input.environmentChange??'multi-pane-recomposition',previous:input.previousTaskState,incoming:input.incomingTaskState,
    stateClasses:input.stateClasses,clearFields:input.clearFields,clearAuthoritative:input.clearAuthoritative,
    temporaryDisposableFields:input.temporaryDisposableFields,lossDirectedFields:input.lossDirectedFields,
    providerAuthoritativeFields:input.providerAuthoritativeFields,recoveryStateFields:input.recoveryStateFields
  });
  const semanticSurfaceId=text(input.semanticSurfaceId,120)??component;
  const composition=resolveGlazeAdaptiveComposition({
    profile:input.profile??'mobile',semanticSurfaceId,
    surfaceRole:input.surfaceRole??(component==='GlzAdaptiveToolbar'?'navigation':'detail'),
    posture:input.posture,accessibilityProfiles:input.accessibilityProfiles,constrained:input.constrained
  });
  const state=providerState(component,input);
  return Object.freeze({
    version:'1.7.0-dev.10',lifecycle:'development',stableBaseline:'1.6.0',planVersion:'v1.1',
    v11SpecificationSections:Object.freeze([25]),component,family:FAMILY_BY_COMPONENT[component],
    inheritedFrom:INHERITED_SOURCES[component]??null,
    sourceFoundation:NEW_COMPONENTS.includes(component)?'js/glaze-v1.7-expanded-component-system.dev.mjs':INHERITED_SOURCES[component],
    semanticSurfaceId,semanticColor,theme,providerState:state,
    presentation:Object.freeze({adaptive:composition,semanticColorRoleRequired:true,literalColorValueAccepted:false,colorOnlyMeaningAllowed:false,accessibilityPrecedence:true}),
    taskState:continuity.state,stateClasses:continuity.stateClasses,decisions:continuity.decisions,
    continuity:Object.freeze({...continuity.continuity,componentIdentityPreserved:true,taskContinuityRequired:true,presentationChangeMayResetTask:false}),
    authority:Object.freeze({
      presentationOnly:true,providerStateOwnedByProvider:true,semanticStateOwnedByCallerOrProvider:true,
      themePersistenceOwnedByApplication:true,providerTruthCreatedByGlaze:false,progressTruthCreatedByGlaze:false,
      recoveryTruthCreatedByGlaze:false,themePersistencePerformedByGlaze:false,actionExecutionPerformedByGlaze:false,
      navigationExecutionPerformedByGlaze:false,consequentialExecutionAutomatic:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,section25Complete:false,nativeDeviceAcceptanceRequired:true,renderedAcceptanceRequired:true,
      assistiveTechnologyAcceptanceRequired:true,performanceAcceptanceRequired:true,downstreamConsumerAcceptanceAutomatic:false
    })
  });
}
function resolver(component){return input=>resolveGlazeExpandedComponent({...input,component});}
export const resolveGlzActivitySurface=resolver('GlzActivitySurface');
export const resolveGlzAdaptiveToolbar=resolver('GlzAdaptiveToolbar');
export const resolveGlzActionCluster=resolver('GlzActionCluster');
export const resolveGlzRecoverySurface=resolver('GlzRecoverySurface');
export const resolveGlzPreferenceGroup=resolver('GlzPreferenceGroup');
export const resolveGlzAppearancePicker=resolver('GlzAppearancePicker');
export const resolveGlzThemePreview=resolver('GlzThemePreview');
export const resolveGlzColorRolePicker=resolver('GlzColorRolePicker');
export const resolveGlzPalettePreview=resolver('GlzPalettePreview');
export const resolveGlzAdaptiveSplitView=resolver('GlzAdaptiveSplitView');

export const glazeV17ExpandedComponentSystemDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.10',lifecycle:'development',stableBaseline:'1.6.0',consumerEligible:false,
  planVersion:'v1.1',v11SpecificationSections:Object.freeze([25]),componentCatalog:COMPONENTS,
  newComponentFoundations:NEW_COMPONENTS,inheritedSources:INHERITED_SOURCES,section25Complete:false,
  literalColorInputsAllowed:false,semanticColorRolesRequired:true,protectedSemanticOverrideAllowed:false,
  colorOnlyMeaningAllowed:false,accessibilityPrecedence:true,taskContinuityRequired:true,presentationOnly:true,
  providerTruthCreatedByGlaze:false,nativeDeviceAcceptanceImplied:false,renderedAcceptanceImplied:false,
  assistiveTechnologyAcceptanceImplied:false,performanceAcceptanceImplied:false,
  downstreamConsumerAcceptanceAutomatic:false,releasePromotionAutomatic:false,
  deploymentAcceptanceAutomatic:false,productionAcceptanceAutomatic:false
});
