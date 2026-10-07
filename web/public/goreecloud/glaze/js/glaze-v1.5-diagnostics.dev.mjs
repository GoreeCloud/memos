const SENSITIVE_SEMANTIC_FRAGMENT = /(?:password|passcode|credential|secret|token|cookie|session|clipboard|messagebody|emailbody|rawcontent|rawactivity|rawsensor|preciselocation|biometric|userid|accountid)/i;

function plainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function safeSemanticId(value, fallback = 'unknown') {
  const text = String(value ?? '').trim();
  if (!text || text.length > 160 || SENSITIVE_SEMANTIC_FRAGMENT.test(text)) return fallback;
  return text;
}

function safeReasonCodes(value) {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze([...new Set(value.map(item => safeSemanticId(item, 'redacted-reason')).filter(Boolean))].slice(0, 32));
}

function safeIdList(value) {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.map(item => safeSemanticId(item)).slice(0, 64));
}

function capabilityRecords(capabilities) {
  if (Array.isArray(capabilities)) return capabilities;
  if (plainObject(capabilities?.byId)) return Object.values(capabilities.byId);
  return [];
}

function explainCapabilities(capabilities) {
  return Object.freeze(capabilityRecords(capabilities).map(record => Object.freeze({
    id: safeSemanticId(record?.id),
    domain: safeSemanticId(record?.domain),
    state: safeSemanticId(record?.state),
    authority: safeSemanticId(record?.provenance?.authority),
    providerDeclared: Boolean(record?.provenance?.provider),
    providerIdentityIncluded: false,
    observedAtIncluded: false,
    scopeIncluded: false,
    reasonCodes: safeReasonCodes(record?.reasonCodes)
  })));
}

function explainComposition(composition) {
  if (!plainObject(composition)) return null;
  return Object.freeze({
    paneMode: safeSemanticId(composition.paneMode),
    controlDensity: safeSemanticId(composition.controlDensity),
    commandSurface: safeSemanticId(composition.commandSurface),
    navigationMode: safeSemanticId(composition.navigationMode),
    materialPreference: safeSemanticId(composition.materialPreference),
    motionPreference: safeSemanticId(composition.motionPreference),
    labelMode: safeSemanticId(composition.labelMode),
    runtimeCostProfile: safeSemanticId(composition.runtimeCostProfile),
    connectivityPresentation: safeSemanticId(composition.connectivityPresentation),
    windowPresentation: safeSemanticId(composition.windowPresentation),
    accessibilityPriorityApplied: Boolean(composition.accessibilityPriorityApplied),
    taskStateReset: Boolean(composition.taskStateReset),
    pageReloadRequired: Boolean(composition.pageReloadRequired),
    capabilityTruthModified: Boolean(composition.capabilityTruthModified),
    reasonCodes: safeReasonCodes(composition.reasonCodes)
  });
}

function explainNavigation(navigation) {
  if (!plainObject(navigation)) return null;
  const destinations = Array.isArray(navigation.destinations) ? navigation.destinations : [];
  const omitted = destinations.filter(item => item?.visible === false);
  const blockedVisible = destinations.filter(item => item?.visible !== false && item?.enabled === false);
  return Object.freeze({
    requestedCurrentId: safeSemanticId(navigation.requestedCurrentId ?? navigation.currentId),
    acceptedCurrentId: safeSemanticId(navigation.acceptedCurrentId),
    currentDestinationChanged: Boolean(navigation.currentDestinationChanged),
    visibleDestinationIds: safeIdList(navigation.visibleDestinationIds),
    omittedDestinations: Object.freeze(omitted.map(item => Object.freeze({
      id: safeSemanticId(item.id),
      state: safeSemanticId(item.state),
      reasonCodes: safeReasonCodes(item.reasonCodes)
    }))),
    blockedVisibleDestinations: Object.freeze(blockedVisible.map(item => Object.freeze({
      id: safeSemanticId(item.id),
      state: safeSemanticId(item.state),
      reasonCodes: safeReasonCodes(item.reasonCodes)
    }))),
    taskStateReset: Boolean(navigation.taskStateReset),
    automaticNavigationAllowed: Boolean(navigation.automaticNavigationAllowed)
  });
}

function explainActions(actionResolution) {
  if (!plainObject(actionResolution)) return null;
  const actions = Array.isArray(actionResolution.actions) ? actionResolution.actions : [];
  return Object.freeze({
    orderedActionIds: safeIdList(actionResolution.orderedActionIds),
    primaryActionIds: safeIdList(actionResolution.primaryActionIds),
    primaryActionOrderStable: Boolean(actionResolution.primaryActionOrderStable),
    automaticExecutionAllowed: Boolean(actionResolution.automaticExecutionAllowed),
    permissionRequestedAutomatically: Boolean(actionResolution.permissionRequestedAutomatically),
    fallbackExecutionAutomatic: Boolean(actionResolution.fallbackExecutionAutomatic),
    states: Object.freeze(actions.map(action => Object.freeze({
      id: safeSemanticId(action.id),
      state: safeSemanticId(action.state),
      enabled: Boolean(action.enabled),
      visible: action.visible !== false,
      degraded: Boolean(action.degraded),
      contextuallyRelevant: Boolean(action.contextuallyRelevant),
      reasonCodes: safeReasonCodes(action.reasonCodes),
      explanationPresent: Boolean(action.explanation),
      explanationTextIncluded: false,
      recoveryKind: safeSemanticId(action.recoveryAction?.kind, 'none'),
      suggestedFallbackActionId: action.suggestedFallbackActionId ? safeSemanticId(action.suggestedFallbackActionId) : null
    })))
  });
}

function explainOptical(adaptation) {
  if (!plainObject(adaptation)) return null;
  const optical = plainObject(adaptation.optical) ? adaptation.optical : {};
  return Object.freeze({
    mode: safeSemanticId(optical.mode),
    motionAllowed: Boolean(optical.motionAllowed),
    reasonCodes: safeReasonCodes(optical.reasonCodes),
    authorizationInferred: Boolean(adaptation.authorizationInferred),
    semanticTruthRedefined: Boolean(adaptation.semanticTruthRedefined),
    automaticConsequentialExecutionAllowed: Boolean(adaptation.automaticConsequentialExecutionAllowed)
  });
}

export function createGlazeDiagnosticReport(options = {}) {
  if (!plainObject(options)) throw new TypeError('Diagnostic options must be a plain object');
  const contextDomains = Array.isArray(options.context?.availableDomains)
    ? options.context.availableDomains
    : Object.keys(plainObject(options.context?.domains) ? options.context.domains : (plainObject(options.context) ? options.context : {}));

  return Object.freeze({
    version: '1.5.0-dev.1',
    lifecycle: 'development',
    contextDomains: safeIdList(contextDomains),
    composition: explainComposition(options.composition),
    navigation: explainNavigation(options.navigation),
    actions: explainActions(options.actions),
    optical: explainOptical(options.adaptation),
    capabilities: explainCapabilities(options.capabilities),
    authority: Object.freeze({
      glazeAuthority: 'presentation-only',
      operationalAuthorityGranted: false,
      permissionGrantedByDiagnostics: false,
      securityStateManufactured: false,
      privacyStateManufactured: false
    }),
    privacy: Object.freeze({
      rawContextIncluded: false,
      rawContentIncluded: false,
      explanationTextIncluded: false,
      providerIdentityIncluded: false,
      exactObservedAtIncluded: false,
      credentialsIncluded: false,
      telemetryRequired: false,
      remoteAnalysisRequired: false
    })
  });
}

export function summarizeGlazeDiagnosticReport(report) {
  if (!plainObject(report)) throw new TypeError('Diagnostic report must be a plain object');
  return Object.freeze({
    version: '1.5.0-dev.1',
    contextDomains: safeIdList(report.contextDomains),
    compositionReasonCodes: safeReasonCodes(report.composition?.reasonCodes),
    navigationChanged: Boolean(report.navigation?.currentDestinationChanged),
    omittedNavigationCount: Array.isArray(report.navigation?.omittedDestinations) ? report.navigation.omittedDestinations.length : 0,
    actionStateCount: Array.isArray(report.actions?.states) ? report.actions.states.length : 0,
    opticalReasonCodes: safeReasonCodes(report.optical?.reasonCodes),
    capabilityStateCount: Array.isArray(report.capabilities) ? report.capabilities.length : 0,
    operationalAuthorityGranted: false,
    rawContextIncluded: false,
    providerIdentityIncluded: false,
    remoteAnalysisRequired: false
  });
}

export const glazeDiagnosticsDevelopmentContract = Object.freeze({
  version: '1.5.0-dev.1',
  lifecycle: 'development',
  explainsCompositionDecisions: true,
  explainsNavigationContinuity: true,
  explainsActionStates: true,
  explainsOpticalDowngrades: true,
  exposesCapabilityAuthorityClass: true,
  providerIdentityIncludedByDefault: false,
  rawContextIncluded: false,
  applicationExplanationTextIncluded: false,
  exactObservationTimeIncluded: false,
  telemetryRequired: false,
  remoteAnalysisRequired: false,
  operationalAuthorityGranted: false
});
