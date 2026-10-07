import {
  resolveGlazeAdaptation
} from './glaze-v1.5-context-capability.dev.mjs';
import {
  createGlazeProviderSnapshot,
  providerSnapshotSummary
} from './glaze-v1.5-provider-registry.dev.mjs';
import {
  resolveGlazeComposition,
  resolveGlazeNavigation,
  resolveGlazeControlPresentation
} from './glaze-v1.5-composition.dev.mjs';
import {resolveGlazeActionPrioritization} from './glaze-v1.5-actions.dev.mjs';
import {createGlazeDiagnosticReport} from './glaze-v1.5-diagnostics.dev.mjs';

function plainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function arrayOrEmpty(value, label) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return value;
}

function capabilityRecords(snapshot) {
  return Object.values(snapshot?.capabilities?.byId || {});
}

export function resolveGlazeInterface(options = {}) {
  if (!plainObject(options)) throw new TypeError('Glaze interface resolution options must be a plain object');

  const providers = arrayOrEmpty(options.providers, 'Providers');
  const actionsInput = arrayOrEmpty(options.actions, 'Actions');
  const destinations = arrayOrEmpty(options.destinations, 'Destinations');
  const intent = plainObject(options.intent) ? options.intent : {};
  const currentDestinationId = options.currentDestinationId == null ? null : String(options.currentDestinationId).trim();

  const snapshot = createGlazeProviderSnapshot(providers);
  const records = capabilityRecords(snapshot);
  const composition = resolveGlazeComposition({context: snapshot.context, intent});
  const navigation = resolveGlazeNavigation({
    currentId: currentDestinationId,
    destinations,
    capabilities: snapshot.capabilities
  });
  const actions = resolveGlazeActionPrioritization({
    context: snapshot.context.domains,
    capabilities: snapshot.capabilities,
    actions: actionsInput
  });
  const controls = resolveGlazeControlPresentation(actionsInput, snapshot.capabilities);
  const adaptation = resolveGlazeAdaptation({
    context: snapshot.context.domains,
    accessibility: snapshot.context.domains.accessibility || {},
    capabilities: records,
    actions: actionsInput
  });
  const diagnostics = createGlazeDiagnosticReport({
    context: snapshot.context,
    composition,
    navigation,
    actions,
    adaptation,
    capabilities: snapshot.capabilities
  });

  return Object.freeze({
    version: '1.5.0-dev.1',
    lifecycle: 'development',
    stableBaseline: '1.4.1',
    providerSummary: providerSnapshotSummary(snapshot),
    context: snapshot.context,
    capabilities: snapshot.capabilities,
    conflicts: snapshot.conflicts,
    composition,
    navigation,
    actions,
    controls,
    adaptation,
    diagnostics,
    acceptedPresentation: Object.freeze({
      paneMode: composition.paneMode,
      controlDensity: composition.controlDensity,
      commandSurface: composition.commandSurface,
      navigationMode: composition.navigationMode,
      materialPreference: composition.materialPreference,
      motionPreference: composition.motionPreference,
      labelMode: composition.labelMode,
      acceptedDestinationId: navigation.acceptedCurrentId,
      orderedActionIds: actions.orderedActionIds,
      opticalMode: adaptation.optical.mode
    }),
    authority: Object.freeze({
      glazeAuthority: 'presentation-only',
      authorizationInferred: false,
      permissionGranted: false,
      providerPrecedenceInferred: false,
      operationalAuthorityGranted: false,
      automaticNavigationAllowed: false,
      automaticPermissionRequestAllowed: false,
      automaticConsequentialExecutionAllowed: false,
      automaticFallbackExecutionAllowed: false
    }),
    continuity: Object.freeze({
      taskStateReset: false,
      pageReloadRequired: false,
      navigationContinuityRequired: true,
      stablePrimaryActionOrderingRequired: true
    }),
    privacy: Object.freeze({
      localFirst: true,
      telemetryRequired: false,
      remoteAnalysisRequired: false,
      diagnosticRawContextIncluded: false,
      diagnosticProviderIdentityIncluded: false
    })
  });
}

export function summarizeGlazeInterfaceResolution(result) {
  if (!plainObject(result)) throw new TypeError('Glaze interface resolution result must be an object');
  return Object.freeze({
    version: '1.5.0-dev.1',
    lifecycle: 'development',
    contextDomains: Object.freeze([...(result.context?.availableDomains || [])]),
    capabilityStateCounts: Object.freeze({...result.providerSummary?.capabilityStateCounts}),
    conflictCounts: Object.freeze({...result.providerSummary?.conflictCounts}),
    acceptedPresentation: result.acceptedPresentation,
    navigationChanged: Boolean(result.navigation?.currentDestinationChanged),
    primaryActionOrderStable: Boolean(result.actions?.primaryActionOrderStable),
    operationalAuthorityGranted: false,
    providerIdsIncluded: false,
    diagnosticRawContextIncluded: false,
    telemetryRequired: false,
    remoteAnalysisRequired: false
  });
}

export const glazeResolutionDevelopmentContract = Object.freeze({
  version: '1.5.0-dev.1',
  lifecycle: 'development',
  developerFacingUnifiedResolver: true,
  authoritativeProviderSnapshotRequired: true,
  providerConflictsFailClosed: true,
  applicationIntentCombinedWithContextAndCapabilities: true,
  compositionResolved: true,
  navigationResolved: true,
  actionPrioritizationResolved: true,
  controlPresentationResolved: true,
  opticalPresentationResolved: true,
  privacySafeDiagnosticsResolved: true,
  providerPrecedenceInferred: false,
  authorizationInferred: false,
  automaticPermissionRequestAllowed: false,
  automaticConsequentialExecutionAllowed: false,
  automaticFallbackExecutionAllowed: false,
  taskStateResetOnCapabilityChange: false,
  telemetryRequired: false,
  remoteAnalysisRequired: false
});
