/* GLAZE UI V1.7 — Expression System Core Development foundation.
 *
 * Bounded v1.3 Section 48 source layer for the coordinated expression model:
 * Semantic Geometry, Visual Scale and Emphasis, Expressive Typography,
 * Semantic Containment, Component Expression, and governed Expression Resolution.
 *
 * The resolver accepts semantic presentation intent only. It does not accept raw
 * radius, size, font, spacing, color, material-effect, animation, performance,
 * ranking, acceptance, or provider-truth controls.
 */

import {
  resolveGlazeVisualMotionDirectionV12,
  glazeV17VisualMotionDirectionDevelopmentContract
} from './glaze-v1.7-visual-motion-direction.dev.mjs';
import {
  glazeV17AccessibilityContinuityDevelopmentContract
} from './glaze-v1.7-accessibility-continuity.dev.mjs';
import {
  glazeV17AdvancedThemeSystemV12DevelopmentContract
} from './glaze-v1.7-advanced-theme-system-v1-2.dev.mjs';
import {
  glazeV17PerformanceEnergyAwarenessDevelopmentContract
} from './glaze-v1.7-performance-energy-awareness.dev.mjs';

export const EXPRESSION_SYSTEM_CAPABILITIES=Object.freeze([
  'semantic-geometry',
  'visual-scale-emphasis',
  'expressive-typography',
  'semantic-containment',
  'component-expression',
  'expression-resolution'
]);

export const SEMANTIC_GEOMETRY_ROLES=Object.freeze([
  'structural','grouped','interactive','connected','floating','identity','anchored'
]);

export const EMPHASIS_ROLES=Object.freeze([
  'supporting','standard','prominent','hero'
]);

export const TYPOGRAPHY_ROLES=Object.freeze([
  'supporting','body','label','title','display'
]);

export const CONTAINMENT_ROLES=Object.freeze([
  'none','related-content','interactive-group','task-region','transient-surface','critical-decision'
]);

export const COMPONENT_EXPRESSION_ROLES=Object.freeze([
  'content','navigation','control','status','creative','comparison','care','agent-activity'
]);

export const FORM_FACTOR_ROLES=Object.freeze([
  'mobile','tablet','desktop','foldable','tv','wearable','compact'
]);

export const INPUT_CONTEXTS=Object.freeze([
  'touch','pointer','keyboard','remote','voice','switch','mixed'
]);

export const DENSITY_ROLES=Object.freeze([
  'compact','standard','spacious'
]);

export const SEMANTIC_COLOR_INTENTS=Object.freeze([
  'none','identity','interaction','semantic-state','protected-state','data-category'
]);

export const COMPOSITION_ROLES=Object.freeze([
  'single-pane','supporting-pane','primary-secondary','multi-pane','overlay','compact'
]);

export const SEMANTIC_SEVERITY=Object.freeze([
  'ordinary','attention','critical'
]);

const EXPRESSION_PROFILES=Object.freeze(['calm','balanced','expressive']);
const PERFORMANCE_PRESSURE=Object.freeze(['neutral','constrained','severe']);
const MOTION_PURPOSES=Object.freeze([
  'none','connected-identity','adaptive-composition','microinteraction','focus-transfer',
  'theme-change','state-change','direct-manipulation'
]);

const PROHIBITED_KEYS=Object.freeze([
  'radius','borderRadius','cornerRadius','cornerRadiusPx','shapeValue',
  'size','sizePx','scale','scaleFactor','width','widthPx','height','heightPx',
  'fontSize','fontSizePx','fontWeight','fontFamily','lineHeight','letterSpacing','wordSpacing',
  'padding','paddingPx','margin','marginPx','gap','gapPx','elevation','elevationDp',
  'color','colorHex','backgroundColor','foregroundColor','hex','rgb','rgba','hsl','hsla',
  'blur','blurPx','backdropBlur','backdropBlurPx','opacity','materialOpacity','glassAmount',
  'duration','durationMs','delay','delayMs','easing','curve','spring','physics','damping',
  'stiffness','keyframes','path','travelPx','distancePx',
  'frameTimeMs','fps','targetFps','frameBudget','powerBudget','energyBudget',
  'measurements','performanceMeasurements','energyMeasurements',
  'rank','score','rating','winner','preferredWinner',
  'acceptance','accepted','productionEligible','providerTruth','forceSuccess','forceSeverity'
]);

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function member(value,allowed,label,fallback){
  const normalized=String(value??fallback??'').trim().toLowerCase();
  if(!allowed.includes(normalized))throw new RangeError('Unsupported '+label+': '+normalized);
  return normalized;
}

function rejectRawControls(input,scope='expression input'){
  if(!plainObject(input))return;
  for(const key of PROHIBITED_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError(scope+' accepts governed semantic intent, not raw design, effect, measurement, ranking, acceptance, or provider-truth controls: '+key);
    }
  }
}

function resolveAccessibility(input){
  const source=plainObject(input.accessibility)?input.accessibility:{};
  rejectRawControls(source,'accessibility input');
  const requested=Object.freeze({
    largeText:source.largeText===true,
    reducedMotion:source.reducedMotion===true,
    reducedTransparency:source.reducedTransparency===true,
    increasedContrast:source.increasedContrast===true,
    forcedColors:source.forcedColors===true
  });
  const authoritative=input.accessibilityAuthoritative===true;
  const neutral=Object.freeze({
    largeText:false,
    reducedMotion:false,
    reducedTransparency:false,
    increasedContrast:false,
    forcedColors:false
  });
  const effective=authoritative?requested:neutral;
  return Object.freeze({
    requested,
    authoritative,
    effective,
    untrustedNonNeutralIgnored:!authoritative&&Object.values(requested).some(Boolean),
    userPreferenceCreatedByGlaze:false,
    userPreferencePersistedByGlaze:false
  });
}

function resolveSeverity(input){
  const requested=member(input.semanticSeverity,SEMANTIC_SEVERITY,'semantic severity','ordinary');
  const authoritative=input.semanticSeverityAuthoritative===true;
  return Object.freeze({
    requested,
    authoritative,
    accepted:requested==='ordinary'||authoritative?requested:'unknown',
    visualEmphasisCanCreateSeverity:false,
    truthCreatedByGlaze:false
  });
}

function geometryDirective(role,formFactor){
  if(role==='identity')return formFactor==='wearable'?'native-identity-silhouette':'recognizable-identity-geometry';
  if(role==='floating')return 'bounded-transient-geometry';
  if(role==='anchored')return 'directionally-anchored-geometry';
  if(role==='connected')return 'continuity-linked-geometry';
  if(role==='interactive')return 'interaction-affordance-geometry';
  if(role==='grouped')return 'related-group-geometry';
  return 'structural-native-geometry';
}

function typographyDirective(role,emphasis,accessibility){
  const a=accessibility.effective;
  if(a.largeText)return 'scalable-reflow-priority';
  if(a.forcedColors||a.increasedContrast)return 'clarity-priority-'+role;
  if(emphasis==='hero'&&role==='display')return 'distinctive-display-with-readable-fallback';
  if(emphasis==='prominent'&&(role==='title'||role==='display'))return 'prominent-hierarchy-type';
  return 'semantic-'+role+'-type';
}

function containmentDirective(role,accessibility){
  if(role==='none')return 'spacing-and-composition-only';
  if(role==='critical-decision')return 'solid-clearly-bounded-decision-region';
  if(accessibility.effective.reducedTransparency||accessibility.effective.increasedContrast||accessibility.effective.forcedColors){
    return 'solid-accessibility-compatible-boundary';
  }
  if(role==='transient-surface')return 'bounded-transient-separation';
  if(role==='task-region')return 'task-region-grouping';
  if(role==='interactive-group')return 'interactive-grouping';
  return 'related-content-grouping';
}

function colorDirective(intent,severity){
  if(intent==='none')return 'inherit-governed-semantic-color';
  if(intent==='identity')return 'theme-or-product-identity-role';
  if(intent==='interaction')return 'interaction-semantic-role';
  if(intent==='data-category')return 'categorical-non-semantic-role';
  if(intent==='protected-state')return 'protected-provider-semantic-role-only';
  if(intent==='semantic-state'){
    return severity.accepted==='unknown'?'unknown-state-neutral-presentation':'authoritative-semantic-state-role';
  }
  return 'inherit-governed-semantic-color';
}

function compositionDirective(role,formFactor){
  if(formFactor==='compact'||formFactor==='wearable')return 'compact-continuity-preserving-composition';
  if(formFactor==='tv')return 'far-view-continuity-preserving-composition';
  if(role==='multi-pane')return 'multi-pane-continuity-preserving-composition';
  if(role==='primary-secondary')return 'primary-secondary-continuity-preserving-composition';
  if(role==='supporting-pane')return 'supporting-pane-continuity-preserving-composition';
  if(role==='overlay')return 'transient-overlay-with-task-context';
  return 'single-pane-continuity-preserving-composition';
}

function inputDirective(context){
  const directives={
    touch:'touch-reachable-semantic-actions',
    pointer:'pointer-precise-semantic-actions',
    keyboard:'keyboard-continuity-and-visible-focus',
    remote:'far-view-focus-and-directional-navigation',
    voice:'semantic-action-labels-and-non-gesture-equivalents',
    switch:'sequential-semantic-focus-and-action-equivalents',
    mixed:'multi-input-semantic-consistency'
  };
  return directives[context];
}

function expressionRichness({profile,accessibility,performancePressure,severity}){
  const a=accessibility.effective;
  if(a.reducedMotion||a.reducedTransparency||a.increasedContrast||a.forcedColors||a.largeText)return 'accessibility-restrained';
  if(performancePressure==='severe')return 'minimal';
  if(performancePressure==='constrained'||severity.accepted==='critical'||profile==='calm')return 'restrained';
  return profile==='expressive'?'expressive':'balanced';
}

function materialPurposeFor(containmentRole,geometryRole){
  if(containmentRole==='critical-decision')return 'readability';
  if(containmentRole==='transient-surface')return 'transient-separation';
  if(geometryRole==='connected')return 'connected-continuity';
  if(containmentRole==='none')return 'none';
  return 'hierarchy';
}

function prominenceFor(emphasisRole,severity){
  if(severity.accepted==='critical')return 'critical';
  return emphasisRole==='prominent'||emphasisRole==='hero'?'prominent':'routine';
}

function acceptanceBoundary(){
  return Object.freeze({
    sourceFoundationOnly:true,
    expressionSystemCoreImplemented:true,
    adaptiveExperienceSurfacesImplemented:false,
    section48Complete:false,
    renderedAcceptanceEstablished:false,
    nativePlatformAcceptanceEstablished:false,
    assistiveTechnologyAcceptanceEstablished:false,
    representativeDeviceAcceptanceEstablished:false,
    largeTextReflowAcceptanceEstablished:false,
    forcedColorsAcceptanceEstablished:false,
    measuredPerformanceAcceptanceEstablished:false,
    energyAcceptanceEstablished:false,
    humanVisualReviewEstablished:false,
    crossPlatformExpressionAcceptanceEstablished:false,
    downstreamConsumerAcceptanceAutomatic:false,
    releasePromotionAutomatic:false,
    deploymentAcceptanceAutomatic:false,
    productionAcceptanceAutomatic:false
  });
}

export function resolveGlazeExpressionV13(input={}){
  if(!plainObject(input))throw new TypeError('Expression System input must be a plain object');
  rejectRawControls(input);

  const geometryRole=member(input.geometryRole,SEMANTIC_GEOMETRY_ROLES,'geometry role','structural');
  const emphasisRole=member(input.emphasisRole,EMPHASIS_ROLES,'emphasis role','standard');
  const typographyRole=member(input.typographyRole,TYPOGRAPHY_ROLES,'typography role','body');
  const containmentRole=member(input.containmentRole,CONTAINMENT_ROLES,'containment role','related-content');
  const componentRole=member(input.componentRole,COMPONENT_EXPRESSION_ROLES,'component role','content');
  const formFactor=member(input.formFactor,FORM_FACTOR_ROLES,'form factor','desktop');
  const inputContext=member(input.inputContext,INPUT_CONTEXTS,'input context','mixed');
  const densityRole=member(input.densityRole,DENSITY_ROLES,'density role','standard');
  const colorIntent=member(input.colorIntent,SEMANTIC_COLOR_INTENTS,'semantic color intent','none');
  const compositionRole=member(input.compositionRole,COMPOSITION_ROLES,'composition role','single-pane');
  const expressionProfile=member(input.expressionProfile,EXPRESSION_PROFILES,'expression profile','balanced');
  const performancePressure=member(input.performancePressure,PERFORMANCE_PRESSURE,'performance pressure','neutral');
  const motionPurpose=member(input.motionPurpose,MOTION_PURPOSES,'motion purpose','none');

  const accessibility=resolveAccessibility(input);
  const severity=resolveSeverity(input);
  const performancePressureAuthoritative=input.performancePressureAuthoritative===true;
  const effectivePerformancePressure=performancePressure==='neutral'||performancePressureAuthoritative
    ?performancePressure:'neutral';

  const materialPurpose=materialPurposeFor(containmentRole,geometryRole);
  const prominence=prominenceFor(emphasisRole,severity);
  const visualMotion=resolveGlazeVisualMotionDirectionV12({
    advancementAreas:['adaptive-composition','theme-architecture','semantic-color','spatial-continuity','native-platform-adaptation'],
    surfaceRole:componentRole==='navigation'?'navigation':componentRole==='control'?'control':componentRole==='status'?'system':'content',
    materialPurpose,
    motionPurpose,
    prominence,
    transitionOccurrenceAuthoritative:input.transitionOccurrenceAuthoritative===true,
    expressionProfile,
    expressionProfileAuthoritative:input.expressionProfileAuthoritative===true,
    performancePressure:effectivePerformancePressure,
    performancePressureAuthoritative:true,
    accessibility:{
      reducedMotion:accessibility.effective.reducedMotion,
      reducedTransparency:accessibility.effective.reducedTransparency,
      increasedContrast:accessibility.effective.increasedContrast,
      forcedColors:accessibility.effective.forcedColors
    },
    accessibilityAuthoritative:true
  });

  const richness=expressionRichness({
    profile:input.expressionProfileAuthoritative===true?expressionProfile:'balanced',
    accessibility,
    performancePressure:effectivePerformancePressure,
    severity
  });

  return Object.freeze({
    version:'1.7.0-dev.40',
    lifecycle:'Development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.3',
    v13SpecificationSections:Object.freeze([48]),
    requirementGroup:'expression-system-core',
    capabilities:EXPRESSION_SYSTEM_CAPABILITIES,
    intent:Object.freeze({
      geometryRole,
      emphasisRole,
      typographyRole,
      containmentRole,
      componentRole,
      formFactor,
      inputContext,
      densityRole,
      colorIntent,
      compositionRole,
      motionPurpose
    }),
    accessibility,
    severity,
    performance:Object.freeze({
      requestedPressure:performancePressure,
      pressureAuthoritative:performancePressureAuthoritative,
      effectivePressure:effectivePerformancePressure,
      untrustedNonNeutralIgnored:performancePressure!=='neutral'&&!performancePressureAuthoritative,
      performanceTruthCreatedByGlaze:false
    }),
    expression:Object.freeze({
      requestedProfile:expressionProfile,
      profileAuthoritative:input.expressionProfileAuthoritative===true,
      effectiveProfile:input.expressionProfileAuthoritative===true?expressionProfile:'balanced',
      richness,
      geometryDirective:geometryDirective(geometryRole,formFactor),
      emphasisDirective:emphasisRole,
      typographyDirective:typographyDirective(typographyRole,emphasisRole,accessibility),
      containmentDirective:containmentDirective(containmentRole,accessibility),
      componentDirective:'semantic-'+componentRole+'-expression',
      colorDirective:colorDirective(colorIntent,severity),
      compositionDirective:compositionDirective(compositionRole,formFactor),
      inputDirective:inputDirective(inputContext),
      densityDirective:accessibility.effective.largeText&&densityRole==='compact'
        ?'preserve-requested-density-but-reflow-for-large-text'
        :'semantic-'+densityRole+'-density',
      materialDirective:visualMotion.direction.materialDirective,
      motionDirective:visualMotion.direction.motionDirective,
      motionRichness:visualMotion.direction.motionRichness,
      rawDesignValuesAccepted:false
    }),
    continuity:Object.freeze({
      taskContinuityPreserved:true,
      focusMeaningPreserved:true,
      semanticMeaningPreserved:true,
      directManipulationPreserved:true,
      authoritativeStatePreserved:true,
      compositionMayChangeWithoutTaskReset:true
    }),
    personalization:Object.freeze({
      expressionMayChange:true,
      truthMayChange:false,
      durablePreferenceChangedByResolver:false,
      durablePreferencePersistedByResolver:false
    }),
    authority:Object.freeze({
      presentationOnly:true,
      geometryCreatesSemanticSeverity:false,
      emphasisCreatesSemanticSeverity:false,
      typographyCreatesSemanticSeverity:false,
      colorCreatesProviderTruth:false,
      motionCreatesProviderTruth:false,
      providerTruthCreatedByGlaze:false,
      accessibilityStateCreatedByGlaze:false,
      performanceStateCreatedByGlaze:false,
      applicationStateChangedByGlaze:false,
      inputExecutionPerformedByGlaze:false,
      navigationExecutedByGlaze:false,
      permissionGrantedByGlaze:false,
      authorizationGrantedByGlaze:false,
      consentGrantedByGlaze:false,
      acceptanceGrantedByGlaze:false,
      lifecyclePromotionAutomatic:false
    }),
    dependencies:Object.freeze({
      visualMotionDirection:glazeV17VisualMotionDirectionDevelopmentContract.version,
      accessibilityContinuity:glazeV17AccessibilityContinuityDevelopmentContract.version,
      advancedThemeSystem:glazeV17AdvancedThemeSystemV12DevelopmentContract.version,
      performanceEnergyAwareness:glazeV17PerformanceEnergyAwarenessDevelopmentContract.version
    }),
    acceptanceBoundary:acceptanceBoundary()
  });
}

export const glazeV17ExpressionSystemDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.40',
  lifecycle:'Development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.3',
  v13SpecificationSections:Object.freeze([48]),
  requirementGroup:'expression-system-core',
  capabilities:EXPRESSION_SYSTEM_CAPABILITIES,
  semanticGeometryRoles:SEMANTIC_GEOMETRY_ROLES,
  emphasisRoles:EMPHASIS_ROLES,
  typographyRoles:TYPOGRAPHY_ROLES,
  containmentRoles:CONTAINMENT_ROLES,
  componentRoles:COMPONENT_EXPRESSION_ROLES,
  formFactors:FORM_FACTOR_ROLES,
  inputContexts:INPUT_CONTEXTS,
  densityRoles:DENSITY_ROLES,
  semanticColorIntents:SEMANTIC_COLOR_INTENTS,
  compositionRoles:COMPOSITION_ROLES,
  semanticSeverity:SEMANTIC_SEVERITY,
  rawDesignValuesAccepted:false,
  visualProminenceEstablishesSemanticSeverity:false,
  personalizationMayChangeExpression:true,
  personalizationMayChangeTruth:false,
  accessibilityPrecedence:true,
  performanceMayReduceOptionalRichness:true,
  taskContinuityMayDegrade:false,
  semanticMeaningMayDegrade:false,
  authoritativeStateMayDegrade:false,
  expressionSystemCoreImplemented:true,
  adaptiveExperienceSurfacesImplemented:false,
  section48Complete:false,
  acceptance:acceptanceBoundary()
});
