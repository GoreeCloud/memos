/* GLAZE UI V1.7 — Cross-Device Consistency Without Uniformity.
 *
 * Bounded v1.2 Section 42 Development foundation.
 * Shared semantic meaning is invariant; native implementation detail is not.
 */

import {
  resolveGlazeNativeKitMotionV12,
  glazeV17NativeGlazeKitsV12DevelopmentContract
} from './glaze-v1.7-native-glaze-kits-v1-2.dev.mjs';
import {glazeV17ExpandedComponentSystemV12DevelopmentContract}
  from './glaze-v1.7-expanded-component-system-v1-2.dev.mjs';
import {glazeV17AdvancedThemeSystemV12DevelopmentContract}
  from './glaze-v1.7-advanced-theme-system-v1-2.dev.mjs';
import {glazeV17InspectorV12DevelopmentContract}
  from './glaze-v1.7-inspector-v1-2.dev.mjs';
import {glazeV17StudioV12DevelopmentContract}
  from './glaze-v1.7-studio-v1-2.dev.mjs';
import {glazeV17AccessibilityContinuityDevelopmentContract}
  from './glaze-v1.7-accessibility-continuity.dev.mjs';

export const CROSS_DEVICE_PLATFORMS=Object.freeze([
  'android-compose','apple-swiftui','web','linux-native'
]);

export const CROSS_DEVICE_SHARED_DIMENSIONS=Object.freeze([
  'semantic-vocabulary','color-roles','state-vocabulary','motion-language',
  'material-hierarchy','interaction-principles','accessibility-expectations',
  'authority-boundaries'
]);

const SEMANTIC_ROLES=Object.freeze([
  'surface','action','navigation','focus','input','state','progress','recovery','privacy','security'
]);
const SEMANTIC_STATES=Object.freeze([
  'unknown','idle','active','selected','focused','disabled','pending','success','warning',
  'error','critical','recovery','restricted','protected','offline','connecting','synchronizing'
]);
const SEMANTIC_COLOR_ROLES=Object.freeze([
  'unknown','information','success','warning','danger','error','critical','destructive',
  'privacy','security','protected','restricted','trusted','unverified','online','offline',
  'connecting','synchronizing','pending','unavailable','active','selected','focused','disabled',
  'attention','recovery'
]);
const MATERIAL_HIERARCHY=Object.freeze([
  'canvas','surface','raised-surface','glaze','overlay','focus','system'
]);
const INTERACTION_PRINCIPLES=Object.freeze([
  'task-continuity','state-first','direct-manipulation','interruptible',
  'predictable-focus','semantic-action-equivalence','native-control-preference'
]);
const ACCESSIBILITY_EXPECTATIONS=Object.freeze([
  'large-text','reduced-motion','reduced-transparency','increased-contrast','forced-colors',
  'screen-reader','switch-access','voice-access','touch-assistance','keyboard-navigation'
]);
const MOTION_RELATIONSHIPS=Object.freeze([
  'same-object-expansion','workspace-recomposition','transient-elevation','context-overlay',
  'posture-partition','source-destination-continuity','direct-manipulation-settle',
  'focus-transfer','color-state-change','material-role-change'
]);
const LEGACY_ACCESSIBILITY_PROFILE_BY_EXPECTATION=Object.freeze({
  'large-text':'large-text',
  'reduced-motion':'reduced-motion',
  'reduced-transparency':'reduced-transparency',
  'increased-contrast':'increased-contrast',
  'screen-reader':'screen-reader-optimized',
  'touch-assistance':'touch-assistance',
  'keyboard-navigation':'keyboard-first'
});
const PROHIBITED_KEYS=Object.freeze([
  'pixelHash','screenshot','screenshotSimilarity','screenshotSimilarityScore','layoutTree',
  'fontSize','fontSizePx','spacingPx','colorHex','duration','durationMs','easing','curve',
  'spring','physics','keyframes','path','travelPx','distancePx','frameTimeMs','fps','targetFps',
  'rank','score','rating','winner','preferredWinner','uniformityScore'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function text(value,max=160){
  const normalized=String(value??'').trim();
  return normalized?normalized.slice(0,max):null;
}

function member(value,allowed,label,fallback=null){
  const normalized=String(value??fallback??'').trim().toLowerCase();
  if(!allowed.includes(normalized))throw new RangeError('Unsupported '+label+': '+normalized);
  return normalized;
}

function uniqueMembers(value,allowed,label){
  const source=Array.isArray(value)?value:[];
  const out=[];
  for(const item of source){
    const normalized=member(item,allowed,label);
    if(!out.includes(normalized))out.push(normalized);
  }
  return Object.freeze(out);
}

function rejectRawControls(input,scope='cross-device input'){
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(scope+' accepts semantic/native mapping context, not raw uniformity or acceptance controls: '+key);
    }
  }
}

function canonicalSemantics(input){
  const semanticRole=member(input.semanticRole,SEMANTIC_ROLES,'semantic role');
  const semanticState=member(input.semanticState,SEMANTIC_STATES,'semantic state','unknown');
  const semanticColorRole=member(
    input.semanticColorRole,
    SEMANTIC_COLOR_ROLES,
    'semantic color role',
    semanticState==='unknown'?'unknown':'information'
  );
  const materialHierarchy=uniqueMembers(input.materialHierarchy,MATERIAL_HIERARCHY,'material hierarchy role');
  if(materialHierarchy.length===0)throw new RangeError('materialHierarchy must contain at least one governed semantic layer');
  const interactionPrinciples=uniqueMembers(
    input.interactionPrinciples,
    INTERACTION_PRINCIPLES,
    'interaction principle'
  );
  if(interactionPrinciples.length===0)throw new RangeError('interactionPrinciples must contain at least one governed principle');
  const accessibilityExpectations=uniqueMembers(
    input.accessibilityExpectations,
    ACCESSIBILITY_EXPECTATIONS,
    'accessibility expectation'
  );
  const motionRelationship=member(
    input.motionRelationship,
    MOTION_RELATIONSHIPS,
    'motion relationship'
  );

  const stateAuthorityRequired=semanticState!=='unknown';
  const colorAuthorityRequired=semanticColorRole!=='unknown';
  const motionAuthorityRequired=true;

  return Object.freeze({
    semanticSurfaceId:text(input.semanticSurfaceId,160)??'cross-device-surface',
    semanticRole,
    semanticState:Object.freeze({
      requested:semanticState,
      authoritative:input.semanticStateAuthoritative===true,
      accepted:!stateAuthorityRequired||input.semanticStateAuthoritative===true?semanticState:'unknown',
      truthCreatedByGlaze:false
    }),
    semanticColor:Object.freeze({
      requestedRole:semanticColorRole,
      prominence:member(input.semanticProminence,['subtle','standard','prominent','critical'],'semantic prominence','standard'),
      authoritative:input.semanticColorAuthoritative===true||!colorAuthorityRequired,
      truthCreatedByGlaze:false
    }),
    motion:Object.freeze({
      relationship:motionRelationship,
      authoritative:input.motionRelationshipAuthoritative===true,
      connectedIdentity:text(input.connectedIdentity,160),
      connectedIdentityAuthoritative:input.connectedIdentityAuthoritative===true
    }),
    materialHierarchy,
    interactionPrinciples,
    accessibilityExpectations,
    authority:Object.freeze({
      presentationOnly:true,
      semanticTruthOwnedByCallerOrProvider:true,
      platformCapabilityOwnedByCallerOrPlatform:true,
      nativeImplementationOwnedByPlatformOrApplication:true,
      accessibilityStateOwnedByCallerOrPlatform:true,
      providerTruthCreatedByGlaze:false,
      platformCapabilityCreatedByGlaze:false,
      nativeImplementationCreatedByGlaze:false,
      accessibilityStateCreatedByGlaze:false,
      applicationStateChangedByGlaze:false,
      navigationExecutedByGlaze:false
    }),
    authoritySatisfied:Object.freeze({
      semanticState:!stateAuthorityRequired||input.semanticStateAuthoritative===true,
      semanticColor:!colorAuthorityRequired||input.semanticColorAuthoritative===true,
      motionRelationship:input.motionRelationshipAuthoritative===true
    })
  });
}

function legacyAccessibilityProfiles(expectations){
  return Object.freeze([...new Set(
    expectations.map(item=>LEGACY_ACCESSIBILITY_PROFILE_BY_EXPECTATION[item]).filter(Boolean)
  )]);
}

function targetMapping(target,semantic,input){
  if(!plainObject(target))throw new TypeError('Each cross-device target must be a plain object');
  rejectRawControls(target,'cross-device target');

  const targetId=text(target.targetId,120);
  if(!targetId)throw new RangeError('Each cross-device target requires targetId');
  const platform=member(target.platform,CROSS_DEVICE_PLATFORMS,'cross-device platform');
  const profile=member(target.profile,['mobile','tablet','desktop','foldable','tv','wearable'],'form-factor profile');

  const native=resolveGlazeNativeKitMotionV12({
    platform,
    profile,
    semanticRole:semantic.semanticRole,
    capabilityState:target.capabilityState??'unknown',
    capabilityAuthoritative:target.capabilityAuthoritative,
    systemAppearanceApiState:target.systemAppearanceApiState??'unknown',
    systemAppearanceApiAuthoritative:target.systemAppearanceApiAuthoritative,
    platformColorApiState:target.platformColorApiState??'unknown',
    platformColorApiAuthoritative:target.platformColorApiAuthoritative,
    semanticColorRole:semantic.semanticColor.requestedRole,
    semanticProminence:semantic.semanticColor.prominence,
    semanticColorAuthoritative:semantic.semanticColor.authoritative,
    semanticSurfaceId:semantic.semanticSurfaceId,
    relationship:semantic.motion.relationship,
    relationshipAuthoritative:semantic.motion.authoritative,
    connectedIdentity:semantic.motion.connectedIdentity,
    connectedIdentityAuthoritative:semantic.motion.connectedIdentityAuthoritative,
    nativeMotionCapabilityState:target.nativeMotionCapabilityState??'unknown',
    nativeMotionCapabilityAuthoritative:target.nativeMotionCapabilityAuthoritative,
    accessibilityProfiles:legacyAccessibilityProfiles(semantic.accessibilityExpectations),
    availableInputs:target.availableInputs,
    inputCapabilityAuthoritative:target.inputCapabilityAuthoritative,
    posture:target.posture,
    constrained:target.constrained===true,
    previousTaskState:input.previousTaskState,
    incomingTaskState:input.incomingTaskState,
    stateClasses:input.stateClasses
  });

  return Object.freeze({
    targetId,
    platform,
    profile,
    framework:native.nativeKit.framework,
    sharedSemantics:Object.freeze({
      semanticRole:semantic.semanticRole,
      semanticState:semantic.semanticState.accepted,
      semanticColorRole:native.nativeKit.theme.semanticColor.acceptedRole,
      motionRelationship:semantic.motion.relationship,
      motionFamily:native.semanticMotion.family,
      materialHierarchy:semantic.materialHierarchy,
      interactionPrinciples:semantic.interactionPrinciples,
      accessibilityExpectations:semantic.accessibilityExpectations,
      authorityBoundary:'presentation-only'
    }),
    nativeMapping:Object.freeze({
      controlPolicy:native.nativeKit.mapping.controlPolicy,
      accessibilityBridge:native.nativeKit.bridges.accessibility,
      inputBridge:native.nativeKit.bridges.input,
      renderingBridge:native.nativeKit.bridges.rendering,
      appearanceBridge:native.nativeKit.bridges.systemAppearance,
      colorBridge:native.nativeKit.bridges.color,
      performanceBridge:native.nativeKit.bridges.performance,
      motionDirective:native.platformMotion.directive,
      nativePrimitiveSelectionOwnedByPlatformOrApplication:true,
      pixelIdenticalPresentationRequired:false,
      identicalAnimationImplementationRequired:false
    }),
    nativeKit:native
  });
}

function acceptanceBoundary(){
  return Object.freeze({
    sourceFoundationOnly:true,
    section42Complete:false,
    crossPlatformRenderedAcceptanceEstablished:false,
    nativePlatformAcceptanceEstablished:false,
    assistiveTechnologyAcceptanceEstablished:false,
    representativeDeviceAcceptanceEstablished:false,
    measuredPerformanceAcceptanceEstablished:false,
    energyAcceptanceEstablished:false,
    humanCrossDeviceReviewEstablished:false,
    downstreamConsumerAcceptanceAutomatic:false,
    releasePromotionAutomatic:false,
    deploymentAcceptanceAutomatic:false,
    productionAcceptanceAutomatic:false
  });
}

export function resolveGlazeCrossDeviceConsistencyV12(input={}){
  if(!plainObject(input))throw new TypeError('Cross-Device Consistency input must be a plain object');
  rejectRawControls(input);

  const semantic=canonicalSemantics(input);
  if(!Array.isArray(input.targets)||input.targets.length<2||input.targets.length>8){
    throw new RangeError('Cross-Device Consistency requires between 2 and 8 target mappings');
  }

  const targets=input.targets.map(target=>targetMapping(target,semantic,input));
  const ids=targets.map(target=>target.targetId);
  if(new Set(ids).size!==ids.length)throw new RangeError('Cross-device targetId values must be unique');

  const authoritySatisfied=Object.values(semantic.authoritySatisfied).every(Boolean);
  const semanticColorRoles=[...new Set(targets.map(target=>target.sharedSemantics.semanticColorRole))];
  const motionFamilies=[...new Set(targets.map(target=>target.sharedSemantics.motionFamily))];
  const semanticContractConsistent=
    semanticColorRoles.length===1
    &&motionFamilies.length===1
    &&targets.every(target=>
      target.sharedSemantics.semanticRole===semantic.semanticRole
      &&target.sharedSemantics.semanticState===semantic.semanticState.accepted
      &&target.sharedSemantics.motionRelationship===semantic.motion.relationship
      &&JSON.stringify(target.sharedSemantics.materialHierarchy)===JSON.stringify(semantic.materialHierarchy)
      &&JSON.stringify(target.sharedSemantics.interactionPrinciples)===JSON.stringify(semantic.interactionPrinciples)
      &&JSON.stringify(target.sharedSemantics.accessibilityExpectations)===JSON.stringify(semantic.accessibilityExpectations)
      &&target.sharedSemantics.authorityBoundary==='presentation-only'
    );

  return Object.freeze({
    version:'1.7.0-dev.35',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([42]),
    sharedSemanticDimensions:CROSS_DEVICE_SHARED_DIMENSIONS,
    canonicalSemantics:semantic,
    targets:Object.freeze(targets),
    consistency:Object.freeze({
      authoritySatisfied,
      semanticContractConsistent,
      sourceConsistencyEstablished:authoritySatisfied&&semanticContractConsistent,
      semanticRoleConsistencyRequired:true,
      semanticColorRoleConsistencyRequired:true,
      semanticStateConsistencyRequired:true,
      motionRelationshipConsistencyRequired:true,
      materialHierarchyConsistencyRequired:true,
      interactionPrincipleConsistencyRequired:true,
      accessibilityExpectationConsistencyRequired:true,
      authorityBoundaryConsistencyRequired:true,
      platformDifferencesAllowed:true,
      winnerSelected:false,
      rankingPerformed:false
    }),
    nonUniformity:Object.freeze({
      pixelIdenticalPresentationRequired:false,
      identicalNativeControlsRequired:false,
      identicalLayoutCompositionRequired:false,
      identicalAnimationTimingRequired:false,
      identicalAnimationCurvesRequired:false,
      identicalAnimationPathsRequired:false,
      identicalRenderingPrimitivesRequired:false,
      identicalInputBindingsRequired:false,
      identicalWindowingMechanicsRequired:false
    }),
    authority:Object.freeze({
      ...semantic.authority,
      permissionGrantedByGlaze:false,
      authorizationGrantedByGlaze:false,
      acceptanceGrantedByGlaze:false,
      lifecyclePromotionAutomatic:false
    }),
    dependencies:Object.freeze({
      nativeGlazeKits:glazeV17NativeGlazeKitsV12DevelopmentContract.version,
      expandedComponentSystem:glazeV17ExpandedComponentSystemV12DevelopmentContract.version,
      advancedThemeSystem:glazeV17AdvancedThemeSystemV12DevelopmentContract.version,
      glazeInspector:glazeV17InspectorV12DevelopmentContract.version,
      glazeStudio:glazeV17StudioV12DevelopmentContract.version,
      accessibilityContinuity:glazeV17AccessibilityContinuityDevelopmentContract.version
    }),
    researchBoundary:Object.freeze({
      record:'research/v1.7-cross-device-consistency.md',
      independentReimplementation:true,
      upstreamSourceCopied:false,
      upstreamNumericValuesCopied:false,
      upstreamAssetsCopied:false,
      upstreamVisualIdentityCopied:false
    }),
    acceptanceBoundary:acceptanceBoundary()
  });
}

export const glazeV17CrossDeviceConsistencyDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.35',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([42]),
  platforms:CROSS_DEVICE_PLATFORMS,
  sharedSemanticDimensions:CROSS_DEVICE_SHARED_DIMENSIONS,
  semanticRoleConsistencyRequired:true,
  semanticColorRoleConsistencyRequired:true,
  semanticStateConsistencyRequired:true,
  motionRelationshipConsistencyRequired:true,
  materialHierarchyConsistencyRequired:true,
  interactionPrincipleConsistencyRequired:true,
  accessibilityExpectationConsistencyRequired:true,
  authorityBoundaryConsistencyRequired:true,
  pixelIdenticalPresentationRequired:false,
  identicalNativeControlsRequired:false,
  identicalLayoutCompositionRequired:false,
  identicalAnimationTimingRequired:false,
  identicalRenderingPrimitivesRequired:false,
  rawUniformityControlsAccepted:false,
  rankingAllowed:false,
  winnerSelectionAllowed:false,
  section42Complete:false,
  nativePlatformAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,
  representativeDeviceAcceptanceEstablished:false,
  measuredPerformanceAcceptanceEstablished:false,
  energyAcceptanceEstablished:false,
  humanCrossDeviceReviewEstablished:false,
  glazeMotionExperimentalLifecyclePromoted:false
});
