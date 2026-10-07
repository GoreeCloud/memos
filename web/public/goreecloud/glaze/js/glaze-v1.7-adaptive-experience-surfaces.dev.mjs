/* Glaze V1.7 — Adaptive Experience Surfaces Development foundation.
 *
 * Bounded V1.7 v1.3 Section 48 source layer for Glaze Workspace,
 * Glaze Compact Surface, and Glaze Accessibility Presentation.
 */

import {
  resolveGlazeTaskContinuity,
  resolveGlazeAdaptiveComposition,
  glazeV17TaskContinuityDevelopmentContract
} from './glaze-v1.7-task-continuity.dev.mjs';
import {
  resolveGlazeExpressionV13,
  glazeV17ExpressionSystemDevelopmentContract
} from './glaze-v1.7-expression-system.dev.mjs';

export const ADAPTIVE_EXPERIENCE_SURFACES=Object.freeze([
  'glaze-workspace',
  'glaze-compact-surface',
  'glaze-accessibility-presentation'
]);

const WORKSPACE_PANE_ROLES=Object.freeze(['primary','secondary','supporting','inspector']);
const COMPACT_CONTEXTS=Object.freeze(['cover-display','wearable','widget','secondary-display','tv-overlay','compact-display']);
const COMPACT_INTERACTION_DEPTHS=Object.freeze(['glance','quick-action','full-experience']);
const ACCESSIBILITY_PRESENTATIONS=Object.freeze([
  'text-spotlight','enlarged-presentation','pointer-assistance','focus-continuity',
  'voice-access','switch-access','reduced-motion','increased-contrast',
  'reduced-transparency','forced-colors'
]);
const ACCESSIBILITY_MODES=Object.freeze([
  'large-text','reduced-motion','reduced-transparency','increased-contrast','forced-colors',
  'screen-reader','switch-access','voice-access','touch-assistance','keyboard-navigation'
]);
const RAW_KEYS=Object.freeze([
  'width','widthPx','height','heightPx','fontSize','fontSizePx','radius','radiusPx',
  'padding','paddingPx','gap','gapPx','color','colorHex','blur','blurPx','opacity',
  'duration','durationMs','easing','spring','physics','keyframes','path',
  'rank','score','rating','winner','acceptance','accepted','productionEligible'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function text(value,label,max=160){
  const normalized=String(value??'').trim();
  if(!normalized)throw new TypeError(label+' is required');
  return normalized.slice(0,max);
}
function optionalText(value,max=160){
  const normalized=String(value??'').trim();
  return normalized?normalized.slice(0,max):null;
}
function member(value,allowed,label,fallback){
  const normalized=String(value??fallback??'').trim().toLowerCase();
  if(!allowed.includes(normalized))throw new RangeError('Unsupported '+label+': '+normalized);
  return normalized;
}
function rejectRaw(input,scope){
  if(!plainObject(input))return;
  for(const key of RAW_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(scope+' accepts governed semantic intent, not raw design, ranking, measurement, or acceptance controls: '+key);
    }
  }
}
function unique(values,max=40){
  if(!Array.isArray(values))return Object.freeze([]);
  return Object.freeze([...new Set(values.map(v=>String(v??'').trim().toLowerCase()).filter(Boolean))].slice(0,max));
}
function expression(input,overrides={}){
  return resolveGlazeExpressionV13({
    geometryRole:overrides.geometryRole??'structural',
    emphasisRole:overrides.emphasisRole??'standard',
    typographyRole:overrides.typographyRole??'body',
    containmentRole:overrides.containmentRole??'task-region',
    componentRole:overrides.componentRole??'content',
    formFactor:overrides.formFactor??member(input.formFactor,['mobile','tablet','desktop','foldable','tv','wearable','compact'],'form factor','desktop'),
    inputContext:member(input.inputContext,['touch','pointer','keyboard','remote','voice','switch','mixed'],'input context','mixed'),
    densityRole:member(input.densityRole,['compact','standard','spacious'],'density role','standard'),
    colorIntent:overrides.colorIntent??'none',
    compositionRole:overrides.compositionRole??'single-pane',
    expressionProfile:member(input.expressionProfile,['calm','balanced','expressive'],'expression profile','balanced'),
    expressionProfileAuthoritative:input.expressionProfileAuthoritative===true,
    performancePressure:member(input.performancePressure,['neutral','constrained','severe'],'performance pressure','neutral'),
    performancePressureAuthoritative:input.performancePressureAuthoritative===true,
    accessibility:plainObject(input.accessibility)?input.accessibility:{},
    accessibilityAuthoritative:input.accessibilityAuthoritative===true,
    semanticSeverity:overrides.semanticSeverity??'ordinary',
    semanticSeverityAuthoritative:overrides.semanticSeverityAuthoritative===true,
    motionPurpose:overrides.motionPurpose??'adaptive-composition',
    transitionOccurrenceAuthoritative:input.transitionOccurrenceAuthoritative===true
  });
}

export function resolveGlazeWorkspace(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Workspace input must be a plain object');
  rejectRaw(input,'Glaze Workspace');
  const workspaceId=text(input.workspaceId,'workspaceId');
  const rawPanes=Array.isArray(input.panes)?input.panes:[];
  if(rawPanes.length<1||rawPanes.length>8)throw new RangeError('Glaze Workspace requires between one and eight panes');

  const panes=Object.freeze(rawPanes.map((pane,index)=>{
    if(!plainObject(pane))throw new TypeError('Workspace pane at index '+index+' must be a plain object');
    rejectRaw(pane,'Workspace pane');
    return Object.freeze({
      paneId:text(pane.paneId,'paneId'),
      role:member(pane.role,WORKSPACE_PANE_ROLES,'workspace pane role',index===0?'primary':'supporting'),
      semanticSurfaceId:optionalText(pane.semanticSurfaceId)??text(pane.paneId,'paneId'),
      providerOwned:pane.providerOwned===true
    });
  }));
  if(new Set(panes.map(p=>p.paneId)).size!==panes.length)throw new RangeError('Workspace pane identities must be unique');

  const profile=member(input.formFactor,['mobile','tablet','desktop','foldable','tv','wearable'],'form factor','desktop');
  const continuity=resolveGlazeTaskContinuity({
    environmentChange:'multi-pane-recomposition',
    previous:input.previousTaskState,
    incoming:input.incomingTaskState,
    stateClasses:input.stateClasses,
    clearFields:input.clearFields,
    clearAuthoritative:input.clearAuthoritative,
    temporaryDisposableFields:input.temporaryDisposableFields,
    lossDirectedFields:input.lossDirectedFields,
    providerAuthoritativeFields:input.providerAuthoritativeFields,
    recoveryStateFields:input.recoveryStateFields
  });
  const composition=resolveGlazeAdaptiveComposition({
    profile,
    semanticSurfaceId:workspaceId,
    surfaceRole:'task',
    posture:input.posture??'unknown',
    accessibilityProfiles:unique(input.accessibilityProfiles),
    constrained:input.constrained===true
  });
  const compositionRole=panes.length===1?'single-pane':panes.length===2?'primary-secondary':'multi-pane';

  return Object.freeze({
    version:'1.7.0-dev.42',
    lifecycle:'Development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    v13SpecificationSections:Object.freeze([48]),
    requirementGroup:'adaptive-experience-surfaces',
    component:'Glaze Workspace',
    workspaceId,
    panes,
    layout:Object.freeze({
      requestedPaneCount:panes.length,
      presentation:composition.presentation,
      paneCountIsPresentationDecision:true,
      paneIdentityPreserved:true,
      paneRemovalRequiresApplicationDirection:true,
      automaticTaskResetAllowed:false
    }),
    continuity,
    expression:expression(input,{
      geometryRole:'structural',
      containmentRole:'task-region',
      componentRole:'content',
      compositionRole,
      motionPurpose:'adaptive-composition',
      formFactor:profile
    }),
    preservation:Object.freeze({
      navigation:true,focus:true,selection:true,scrollPosition:true,drafts:true,
      filters:true,paneIdentity:true,mediaContext:true,safePendingInteractions:true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      taskTruthOwnedByApplication:true,
      providerTruthOwnedByProvider:true,
      navigationExecutedByGlaze:false,
      pendingInteractionExecutedByGlaze:false,
      providerTruthCreatedByGlaze:false
    })
  });
}

export function resolveGlazeCompactSurface(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Compact Surface input must be a plain object');
  rejectRaw(input,'Glaze Compact Surface');
  const surfaceId=text(input.surfaceId,'surfaceId');
  const context=member(input.context,COMPACT_CONTEXTS,'compact context','compact-display');
  const interactionDepth=member(input.interactionDepth,COMPACT_INTERACTION_DEPTHS,'interaction depth','glance');
  const providerIdentityAuthoritative=input.providerIdentityAuthoritative===true;
  const providerId=optionalText(input.providerId);
  const stateAuthoritative=input.stateAuthoritative===true;
  const stateId=optionalText(input.stateId)??'unknown';
  const acceptedState=stateAuthoritative?stateId:'unknown';
  const escalationTarget=optionalText(input.escalationTarget);
  if(interactionDepth==='full-experience'&&escalationTarget===null){
    throw new RangeError('Full-experience compact presentation requires an explicit escalationTarget');
  }
  const formFactor=context==='wearable'?'wearable':context==='tv-overlay'?'tv':'compact';
  const accessibleInteractionRequired=interactionDepth!=='glance';

  return Object.freeze({
    version:'1.7.0-dev.42',
    lifecycle:'Development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    component:'Glaze Compact Surface',
    surfaceId,
    context,
    interactionDepth,
    provider:Object.freeze({
      requestedProviderId:providerId,
      authoritative:providerIdentityAuthoritative,
      acceptedProviderId:providerIdentityAuthoritative?providerId:null,
      providerTruthCreatedByGlaze:false
    }),
    state:Object.freeze({
      requested:stateId,
      authoritative:stateAuthoritative,
      accepted:acceptedState,
      unknownWithoutAuthority:!stateAuthoritative
    }),
    presentation:Object.freeze({
      glanceable:true,
      essentialMeaningRequired:true,
      accessibleInteractionRequired,
      escalationTarget,
      escalationRequired:interactionDepth==='full-experience',
      escalationExecutedByGlaze:false,
      colorOrMotionOnlyMeaningAllowed:false,
      expression:expression(input,{
        geometryRole:'interactive',
        emphasisRole:'prominent',
        typographyRole:'label',
        containmentRole:'interactive-group',
        componentRole:'content',
        compositionRole:'compact',
        motionPurpose:'state-change',
        formFactor
      })
    }),
    authority:Object.freeze({
      presentationOnly:true,
      providerTruthCreatedByGlaze:false,
      stateCreatedByGlaze:false,
      actionExecutedByGlaze:false,
      navigationExecutedByGlaze:false,
      escalationExecutedByGlaze:false
    })
  });
}

export function resolveGlazeAccessibilityPresentation(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Accessibility Presentation input must be a plain object');
  rejectRaw(input,'Glaze Accessibility Presentation');
  const presentation=member(input.presentation,ACCESSIBILITY_PRESENTATIONS,'accessibility presentation','text-spotlight');
  const requestedModes=unique(input.modes);
  const unsupported=requestedModes.find(mode=>!ACCESSIBILITY_MODES.includes(mode));
  if(unsupported)throw new RangeError('Unsupported accessibility mode: '+unsupported);
  const authoritative=input.accessibilityAuthoritative===true;
  const effectiveModes=authoritative?requestedModes:Object.freeze([]);
  const effectiveSet=new Set(effectiveModes);

  const accessibility=Object.freeze({
    largeText:effectiveSet.has('large-text')||presentation==='enlarged-presentation',
    reducedMotion:effectiveSet.has('reduced-motion')||presentation==='reduced-motion',
    reducedTransparency:effectiveSet.has('reduced-transparency')||presentation==='reduced-transparency',
    increasedContrast:effectiveSet.has('increased-contrast')||presentation==='increased-contrast',
    forcedColors:effectiveSet.has('forced-colors')||presentation==='forced-colors'
  });

  return Object.freeze({
    version:'1.7.0-dev.42',
    lifecycle:'Development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    component:'Glaze Accessibility Presentation',
    presentation,
    requestedModes,
    authoritative,
    effectiveModes,
    behavior:Object.freeze({
      optionalExpressionMayYield:true,
      motionRichnessMayYield:true,
      translucencyMayYield:true,
      densityMayYield:true,
      decorativePresentationMayYield:true,
      taskContinuityMustYield:false,
      semanticMeaningMustYield:false,
      authoritativeStateMustYield:false,
      focusContinuityRequired:true,
      keyboardContinuityRequired:true,
      voiceEquivalentRequired:presentation==='voice-access'||effectiveSet.has('voice-access'),
      switchEquivalentRequired:presentation==='switch-access'||effectiveSet.has('switch-access'),
      colorOnlyMeaningAllowed:false
    }),
    expression:resolveGlazeExpressionV13({
      geometryRole:'interactive',
      emphasisRole:'prominent',
      typographyRole:presentation==='enlarged-presentation'||presentation==='text-spotlight'?'title':'label',
      containmentRole:'task-region',
      componentRole:'content',
      formFactor:member(input.formFactor,['mobile','tablet','desktop','foldable','tv','wearable','compact'],'form factor','desktop'),
      inputContext:member(input.inputContext,['touch','pointer','keyboard','remote','voice','switch','mixed'],'input context','mixed'),
      densityRole:member(input.densityRole,['compact','standard','spacious'],'density role','standard'),
      colorIntent:'none',
      compositionRole:'single-pane',
      expressionProfile:member(input.expressionProfile,['calm','balanced','expressive'],'expression profile','balanced'),
      expressionProfileAuthoritative:input.expressionProfileAuthoritative===true,
      performancePressure:member(input.performancePressure,['neutral','constrained','severe'],'performance pressure','neutral'),
      performancePressureAuthoritative:input.performancePressureAuthoritative===true,
      accessibility,
      accessibilityAuthoritative:true,
      semanticSeverity:'ordinary',
      semanticSeverityAuthoritative:false,
      motionPurpose:'focus-transfer',
      transitionOccurrenceAuthoritative:input.transitionOccurrenceAuthoritative===true
    }),
    authority:Object.freeze({
      presentationOnly:true,
      accessibilityStateCreatedByGlaze:false,
      accessibilityPreferencePersistedByGlaze:false,
      focusExecutedByGlaze:false,
      navigationExecutedByGlaze:false,
      applicationStateChangedByGlaze:false
    })
  });
}

function acceptanceBoundary(){
  return Object.freeze({
    sourceFoundationOnly:true,
    workspaceImplemented:true,
    compactSurfaceImplemented:true,
    accessibilityPresentationImplemented:true,
    renderedAcceptanceEstablished:false,
    nativePlatformAcceptanceEstablished:false,
    assistiveTechnologyAcceptanceEstablished:false,
    representativeDeviceAcceptanceEstablished:false,
    section48Accepted:false
  });
}

export const glazeV17AdaptiveExperienceSurfacesDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.42',
  lifecycle:'Development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.3',
  v13SpecificationSections:Object.freeze([48]),
  requirementGroup:'adaptive-experience-surfaces',
  surfaces:ADAPTIVE_EXPERIENCE_SURFACES,
  workspacePaneRoles:WORKSPACE_PANE_ROLES,
  compactContexts:COMPACT_CONTEXTS,
  compactInteractionDepths:COMPACT_INTERACTION_DEPTHS,
  accessibilityPresentations:ACCESSIBILITY_PRESENTATIONS,
  taskContinuityFoundationVersion:glazeV17TaskContinuityDevelopmentContract.version,
  expressionSystemFoundationVersion:glazeV17ExpressionSystemDevelopmentContract.version,
  taskResetOnRecompositionAllowed:false,
  providerTruthCreatedByGlaze:false,
  accessibilityStateCreatedByGlaze:false,
  section48SourceComplete:false,
  acceptance:acceptanceBoundary()
});
