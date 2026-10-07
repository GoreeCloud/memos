/* GLAZE UI V1.7 — Accessibility Continuity Development foundation.
 *
 * Bounded V1.7 v1.2 Section 41 source layer. Accessibility-mode changes
 * preserve current task state wherever technically possible and outrank
 * optional motion/visual richness. This layer coordinates existing governed
 * continuity, input, focus, accessibility, theme, and motion semantics.
 */

import {
  resolveGlazeTaskContinuity,
  resolveGlazeAdaptiveComposition,
  glazeV17TaskContinuityDevelopmentContract
} from './glaze-v1.7-task-continuity.dev.mjs';
import {
  resolveGlazeInputTransition,
  glazeV17AdaptiveInputDevelopmentContract
} from './glaze-v1.7-adaptive-input.dev.mjs';
import {
  resolveGlazeAccessibilityProfiles,
  glazeV16StateAccessibilityDevelopmentContract
} from './glaze-v1.6-state-accessibility.dev.mjs';
import {
  resolveGlazeFocusPresentation,
  glazeV16FocusMotionDevelopmentContract
} from './glaze-v1.6-focus-motion.dev.mjs';
import {
  resolveGlazeMotionExpressionProfile,
  glazeV17MotionExpressionProfilesDevelopmentContract
} from './glaze-v1.7-motion-expression-profiles.dev.mjs';
import {
  glazeV17ReducedMotionEquivalentsDevelopmentContract
} from './glaze-v1.7-reduced-motion-equivalents.dev.mjs';
import {
  glazeV17AdvancedThemeSystemV12DevelopmentContract
} from './glaze-v1.7-advanced-theme-system-v1-2.dev.mjs';
import {
  glazeV17StudioV12DevelopmentContract
} from './glaze-v1.7-studio-v1-2.dev.mjs';

export const ACCESSIBILITY_CONTINUITY_CHANGES=Object.freeze([
  'large-text',
  'reduced-motion',
  'reduced-transparency',
  'increased-contrast',
  'forced-colors',
  'screen-reader',
  'switch-access',
  'voice-access',
  'touch-assistance',
  'keyboard-navigation'
]);

const RAW_OR_ACCEPTANCE_KEYS=Object.freeze([
  'fontSize','fontSizePx','textScale','textScalePercent','zoomPercent',
  'contrastRatio','minimumContrastRatio','targetSizePx','targetSizeDp',
  'duration','durationMs','easing','curve','spring','physics','keyframes','path',
  'distance','distancePx','travelPx','scale','scaleFactor','rotation',
  'measurements','samples','performanceMeasurements','performanceEvidence',
  'assistiveTechnologyEvidence','screenReaderTranscript','accessibilityEvidence',
  'score','rating','accepted','conformant','section41Accepted'
]);

const INPUT_MODEL_BY_CHANGE=Object.freeze({
  'screen-reader':'assistive-input',
  'switch-access':'switch-access',
  'voice-access':'voice-access',
  'touch-assistance':'touch',
  'keyboard-navigation':'keyboard'
});

function plainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}

function boundedText(value,max=160){
  const normalized=String(value??'').trim();
  return normalized?normalized.slice(0,max):null;
}

function uniqueModes(values){
  if(!Array.isArray(values))return Object.freeze([]);
  const modes=[...new Set(values.map(v=>String(v??'').trim().toLowerCase()).filter(Boolean))];
  const unsupported=modes.find(mode=>!ACCESSIBILITY_CONTINUITY_CHANGES.includes(mode));
  if(unsupported)throw new RangeError('Unsupported accessibility continuity change: '+unsupported);
  return Object.freeze(modes.slice(0,ACCESSIBILITY_CONTINUITY_CHANGES.length));
}

function rejectRawOrAcceptanceControls(input){
  for(const key of RAW_OR_ACCEPTANCE_KEYS){
    if(Object.prototype.hasOwnProperty.call(input,key)){
      throw new RangeError('Accessibility Continuity accepts governed semantic state, not raw presentation/measurement or acceptance controls: '+key);
    }
  }
}

function legacyAccessibilityPreferences(modes){
  const set=new Set(modes);
  return Object.freeze({
    largeText:set.has('large-text'),
    reducedMotion:set.has('reduced-motion'),
    reducedTransparency:set.has('reduced-transparency'),
    increasedContrast:set.has('increased-contrast'),
    touchAssistance:set.has('touch-assistance'),
    keyboardFirst:set.has('keyboard-navigation'),
    screenReaderOptimized:set.has('screen-reader')
  });
}

function focusModality(modes,input){
  const explicit=boundedText(input.focusModality,80);
  if(explicit)return explicit.toLowerCase();
  const set=new Set(modes);
  if(set.has('voice-access'))return 'voice-focus';
  if(set.has('screen-reader')||set.has('switch-access'))return 'assistive-input';
  if(set.has('keyboard-navigation'))return 'keyboard';
  return 'mixed';
}

function expectedInputModels(modes){
  return Object.freeze(
    [...new Set(modes.map(mode=>INPUT_MODEL_BY_CHANGE[mode]).filter(Boolean))]
  );
}

function resolveInputTransition(input){
  const from=boundedText(input.fromInputModel,80);
  const to=boundedText(input.toInputModel,80);
  if((from===null)!==(to===null)){
    throw new RangeError('Accessibility input transition requires both fromInputModel and toInputModel');
  }
  if(from===null){
    return Object.freeze({
      requested:false,
      accepted:false,
      reason:'no-input-model-transition-supplied',
      transition:null
    });
  }
  if(input.inputModelChangeAuthoritative!==true){
    return Object.freeze({
      requested:true,
      accepted:false,
      reason:'authoritative-input-model-change-required',
      from,
      to,
      transition:null
    });
  }
  return Object.freeze({
    requested:true,
    accepted:true,
    reason:'authoritative-input-model-change-accepted',
    from,
    to,
    transition:resolveGlazeInputTransition({
      from,
      to,
      actions:input.semanticActions,
      previousTaskState:input.previousTaskState,
      incomingTaskState:input.incomingTaskState,
      stateClasses:input.stateClasses,
      clearFields:input.clearFields,
      clearAuthoritative:input.clearAuthoritative,
      temporaryDisposableFields:input.temporaryDisposableFields,
      lossDirectedFields:input.lossDirectedFields,
      providerAuthoritativeFields:input.providerAuthoritativeFields,
      recoveryStateFields:input.recoveryStateFields
    })
  });
}

function resolveComposition(input,modes){
  const profile=boundedText(input.profile,80);
  if(profile===null){
    return Object.freeze({
      requested:false,
      accepted:false,
      reason:'form-factor-profile-not-supplied',
      resolution:null
    });
  }
  if(input.profileAuthoritative!==true){
    return Object.freeze({
      requested:true,
      accepted:false,
      reason:'authoritative-form-factor-profile-required',
      profile,
      resolution:null
    });
  }
  const semanticSurfaceId=boundedText(input.semanticSurfaceId,160)??'accessibility-continuity-surface';
  return Object.freeze({
    requested:true,
    accepted:true,
    reason:'authoritative-form-factor-profile-accepted',
    profile,
    resolution:resolveGlazeAdaptiveComposition({
      profile,
      semanticSurfaceId,
      surfaceRole:boundedText(input.surfaceRole,80)??'task',
      posture:boundedText(input.posture,80)??'unknown',
      accessibilityProfiles:modes,
      constrained:input.constrained===true
    })
  });
}

function presentationPlan(modes){
  const set=new Set(modes);
  return Object.freeze({
    largeText:Object.freeze({
      active:set.has('large-text'),
      reflowRequired:set.has('large-text'),
      twoHundredPercentTextSupportRequired:set.has('large-text'),
      clippingOrTaskLossAllowed:false,
      fixedViewportDependenceAllowed:false
    }),
    reducedMotion:Object.freeze({
      active:set.has('reduced-motion'),
      stateFirstEquivalentRequired:set.has('reduced-motion'),
      nonessentialTravelAllowed:!set.has('reduced-motion'),
      directManipulationTrackingPreserved:true,
      motionRequiredToUnderstandState:false
    }),
    reducedTransparency:Object.freeze({
      active:set.has('reduced-transparency'),
      solidOrOpaqueEquivalentRequired:set.has('reduced-transparency'),
      hierarchyAndMeaningMustSurvive:true
    }),
    increasedContrast:Object.freeze({
      active:set.has('increased-contrast'),
      higherContrastVariantRequired:set.has('increased-contrast'),
      optionalVisualSubtletyMayYield:true
    }),
    forcedColors:Object.freeze({
      active:set.has('forced-colors'),
      platformPaletteAuthorityPreserved:true,
      colorOnlyMeaningAllowed:false,
      semanticMeaningMustSurvive:true
    }),
    screenReader:Object.freeze({
      active:set.has('screen-reader'),
      semanticStructurePreserved:true,
      accessibleNamesAndRolesPreserved:true,
      predictableReadingOrderRequired:true,
      focusContinuityRequired:true,
      announcementsInventedByGlaze:false
    }),
    switchAccess:Object.freeze({
      active:set.has('switch-access'),
      semanticActionMeaningPreserved:true,
      gestureOnlyMeaningAllowed:false,
      alternativeInteractionRequired:set.has('switch-access')
    }),
    voiceAccess:Object.freeze({
      active:set.has('voice-access'),
      semanticAddressabilityRequired:set.has('voice-access'),
      semanticActionMeaningPreserved:true,
      speechRecognitionTruthCreatedByGlaze:false
    }),
    touchAssistance:Object.freeze({
      active:set.has('touch-assistance'),
      targetProtectionRequired:set.has('touch-assistance'),
      semanticActionMeaningPreserved:true,
      rawTargetSizeSelectedByGlaze:false
    }),
    keyboardNavigation:Object.freeze({
      active:set.has('keyboard-navigation'),
      visibleFocusRequired:true,
      predictableFocusMovementRequired:true,
      focusDistinctFromSelectionRequired:true,
      semanticActionMeaningPreserved:true
    })
  });
}

function acceptanceBlock(){
  return Object.freeze({
    sourceFoundationOnly:true,
    section41Complete:false,
    renderedAcceptanceEstablished:false,
    nativePlatformAcceptanceEstablished:false,
    assistiveTechnologyAcceptanceEstablished:false,
    largeTextAcceptanceEstablished:false,
    forcedColorsAcceptanceEstablished:false,
    switchAccessAcceptanceEstablished:false,
    voiceAccessAcceptanceEstablished:false,
    touchAssistanceAcceptanceEstablished:false,
    keyboardNavigationAcceptanceEstablished:false,
    representativeDeviceAcceptanceEstablished:false,
    measuredPerformanceAcceptanceEstablished:false,
    energyAcceptanceEstablished:false,
    humanAccessibilityReviewEstablished:false,
    downstreamConsumerAcceptanceAutomatic:false,
    releasePromotionAutomatic:false,
    deploymentAcceptanceAutomatic:false,
    productionAcceptanceAutomatic:false
  });
}

export function resolveGlazeAccessibilityContinuity(input={}){
  if(!plainObject(input))throw new TypeError('Accessibility Continuity input must be a plain object');
  rejectRawOrAcceptanceControls(input);

  const requestedModes=uniqueModes(input.accessibilityChanges);
  const accessibilityStateAuthoritative=input.accessibilityStateAuthoritative===true;
  const acceptedModes=accessibilityStateAuthoritative?requestedModes:Object.freeze([]);

  const continuity=resolveGlazeTaskContinuity({
    environmentChange:'accessibility-mode',
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

  const legacyProfiles=resolveGlazeAccessibilityProfiles({
    preferences:legacyAccessibilityPreferences(acceptedModes)
  });

  const composition=resolveComposition(input,acceptedModes);
  const inputTransition=resolveInputTransition(input);
  const motion=resolveGlazeMotionExpressionProfile({
    motionIntensity:input.motionIntensity,
    motionIntensityAuthoritative:input.motionIntensityAuthoritative,
    accessibilityProfiles:acceptedModes,
    performanceConstraint:input.performanceConstraint,
    performanceConstraintAuthoritative:input.performanceConstraintAuthoritative
  });

  const currentFocusUnavailable=input.currentFocusUnavailable===true
    &&input.currentFocusAvailabilityAuthoritative===true;
  const fallbackFocusId=boundedText(input.fallbackFocusId,160);
  const fallbackFocusAuthoritative=input.fallbackFocusAuthoritative===true;
  const validFallback=currentFocusUnavailable&&fallbackFocusId!==null&&fallbackFocusAuthoritative;

  const focus=resolveGlazeFocusPresentation({
    modality:focusModality(acceptedModes,input),
    focused:input.focusStateAuthoritative===true&&input.focused===true,
    focusVisible:input.focusVisible,
    alwaysShowFocus:acceptedModes.includes('keyboard-navigation')
      ||acceptedModes.includes('screen-reader')
      ||acceptedModes.includes('switch-access'),
    selected:input.selected===true,
    material:boundedText(input.material,80)??'solid',
    requestedRestoreTarget:currentFocusUnavailable?fallbackFocusId:null,
    restoreTargetValid:validFallback
  });

  const expectedModels=expectedInputModels(acceptedModes);
  const plan=presentationPlan(acceptedModes);

  return Object.freeze({
    version:'1.7.0-dev.34',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    consumerEligible:false,
    planVersion:'v1.2',
    v12SpecificationSections:Object.freeze([41]),
    accessibility:Object.freeze({
      requestedModes,
      acceptedModes,
      stateAuthoritative:accessibilityStateAuthoritative,
      requestedStateWithheldWithoutAuthority:!accessibilityStateAuthoritative&&requestedModes.length>0,
      accessibilityOutranksMotionRichness:true,
      userPreferenceCreatedByGlaze:false,
      userPreferencePersistedByGlaze:false
    }),
    task:Object.freeze({
      state:continuity.state,
      stateClasses:continuity.stateClasses,
      decisions:continuity.decisions,
      continuity:Object.freeze({
        ...continuity.continuity,
        currentTaskPreservationRequired:true,
        taskResetAllowed:false,
        navigationResetAllowed:false,
        focusResetAllowed:false,
        selectionResetAllowed:false,
        draftResetAllowed:false,
        semanticActionMeaningPreserved:true
      })
    }),
    composition,
    input:Object.freeze({
      expectedModels,
      expectationCreatesInputModelTruth:false,
      transition:inputTransition
    }),
    focus:Object.freeze({
      presentation:focus,
      currentFocusUnavailable,
      fallbackFocusId:validFallback?fallbackFocusId:null,
      fallbackProposalAuthoritative:validFallback,
      focusExecutionPerformedByGlaze:false,
      logicalFallbackRequiredWhenCurrentFocusDisappears:currentFocusUnavailable,
      focusMustRemainVisible:acceptedModes.includes('keyboard-navigation')
        ||acceptedModes.includes('screen-reader')
        ||acceptedModes.includes('switch-access')
    }),
    presentation:Object.freeze({
      ...plan,
      historicalProfileResolution:legacyProfiles,
      accessibilityOverridesDecorativeRichness:true,
      colorOnlyMeaningAllowed:false,
      semanticStateMayDependOnAnimationCompletion:false
    }),
    motion:Object.freeze({
      resolution:motion,
      accessibilityPrecedence:true,
      selectedPreferenceRewritten:false,
      reducedMotionCapsOptionalRichness:true,
      finalStateDependsOnAnimationCompletion:false
    }),
    authority:Object.freeze({
      boundary:'development-accessibility-continuity-only',
      presentationOnly:true,
      accessibilityStateOwnedByCallerOrPlatform:true,
      accessibilityStateCreatedByGlaze:false,
      taskTruthCreatedByGlaze:false,
      focusTruthCreatedByGlaze:false,
      inputModelCreatedByGlaze:false,
      semanticActionAvailabilityCreatedByGlaze:false,
      providerTruthCreatedByGlaze:false,
      permissionGrantedByGlaze:false,
      authorizationGrantedByGlaze:false,
      navigationExecutedByGlaze:false,
      focusExecutedByGlaze:false,
      applicationActionExecutedByGlaze:false,
      preferencePersistedByGlaze:false,
      acceptanceGrantedByGlaze:false,
      lifecyclePromotionAutomatic:false,
      deploymentAcceptanceAutomatic:false,
      productionAcceptanceAutomatic:false
    }),
    acceptanceBoundary:acceptanceBlock()
  });
}

export const glazeV17AccessibilityContinuityDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.34',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.2',
  v12SpecificationSections:Object.freeze([41]),
  accessibilityChanges:ACCESSIBILITY_CONTINUITY_CHANGES,
  taskContinuityFoundationVersion:glazeV17TaskContinuityDevelopmentContract.version,
  adaptiveInputFoundationVersion:glazeV17AdaptiveInputDevelopmentContract.version,
  historicalStateAccessibilityFoundationVersion:glazeV16StateAccessibilityDevelopmentContract.version,
  historicalFocusMotionFoundationVersion:glazeV16FocusMotionDevelopmentContract.version,
  motionExpressionProfilesFoundationVersion:glazeV17MotionExpressionProfilesDevelopmentContract.version,
  reducedMotionEquivalentsFoundationVersion:glazeV17ReducedMotionEquivalentsDevelopmentContract.version,
  advancedThemeSystemFoundationVersion:glazeV17AdvancedThemeSystemV12DevelopmentContract.version,
  glazeStudioFoundationVersion:glazeV17StudioV12DevelopmentContract.version,
  accessibilityOutranksMotionRichness:true,
  preserveCurrentTaskWhereTechnicallyPossible:true,
  taskResetAllowed:false,
  navigationResetAllowed:false,
  focusResetAllowed:false,
  selectionResetAllowed:false,
  draftResetAllowed:false,
  colorOnlyMeaningAllowed:false,
  rawPresentationValuesAccepted:false,
  rawAcceptanceEvidenceAccepted:false,
  accessibilityStateCreatedByGlaze:false,
  inputModelCreatedByGlaze:false,
  focusExecutedByGlaze:false,
  preferencePersistedByGlaze:false,
  section41Complete:false,
  renderedAcceptanceEstablished:false,
  nativePlatformAcceptanceEstablished:false,
  assistiveTechnologyAcceptanceEstablished:false,
  humanAccessibilityReviewEstablished:false
});
