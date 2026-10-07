import {
  normalizeGlazeContext,
  normalizeGlazeCapability,
  normalizeGlazeCapabilities
} from './glaze-v1.5-context-capability.dev.mjs';

const PROVIDER_AUTHORITIES = new Set([
  'platform',
  'application',
  'service',
  'policy',
  'security',
  'privacy',
  'identity',
  'runtime',
  'accessibility',
  'unknown'
]);

const CONTEXT_AUTHORITY_RULES = Object.freeze({
  layout: Object.freeze(['application', 'platform', 'runtime']),
  'device-posture': Object.freeze(['platform', 'runtime']),
  input: Object.freeze(['platform', 'runtime', 'accessibility']),
  interaction: Object.freeze(['application', 'runtime', 'accessibility']),
  task: Object.freeze(['application']),
  content: Object.freeze(['application']),
  environment: Object.freeze(['platform', 'runtime', 'accessibility']),
  accessibility: Object.freeze(['accessibility', 'platform', 'application']),
  runtime: Object.freeze(['runtime', 'platform']),
  connectivity: Object.freeze(['platform', 'runtime']),
  'window-state': Object.freeze(['platform', 'runtime', 'application'])
});

const CAPABILITY_AUTHORITY_RULES = Object.freeze({
  rendering: Object.freeze(['runtime', 'platform', 'accessibility']),
  platform: Object.freeze(['platform', 'runtime']),
  device: Object.freeze(['platform', 'runtime']),
  application: Object.freeze(['application']),
  service: Object.freeze(['service']),
  authorization: Object.freeze(['policy', 'identity', 'platform', 'application', 'security', 'privacy']),
  connectivity: Object.freeze(['platform', 'runtime', 'service']),
  intelligence: Object.freeze(['application', 'service', 'runtime'])
});

function plainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function requiredString(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new TypeError(`${label} must be a non-empty string`);
  return result;
}

function assertContextAuthority(authority, domain, providerId) {
  const allowed = CONTEXT_AUTHORITY_RULES[domain] || [];
  if (!allowed.includes(authority)) {
    throw new RangeError(`Provider ${providerId} with authority ${authority} cannot own context domain ${domain}`);
  }
}

function assertCapabilityAuthority(authority, domain, providerId) {
  const allowed = CAPABILITY_AUTHORITY_RULES[domain] || [];
  if (!allowed.includes(authority)) {
    throw new RangeError(`Provider ${providerId} with authority ${authority} cannot own capability domain ${domain}`);
  }
}

function normalizeProvider(provider, index) {
  if (!plainObject(provider)) throw new TypeError(`Provider at index ${index} must be a plain object`);
  const id = requiredString(provider.id, `Provider id at index ${index}`);
  const authority = String(provider.authority ?? 'unknown').trim();
  if (!PROVIDER_AUTHORITIES.has(authority)) throw new RangeError(`Unsupported provider authority: ${authority || '(empty)'}`);
  const scope = String(provider.scope ?? 'current-runtime').trim() || 'current-runtime';
  const context = normalizeGlazeContext(provider.context || {});
  const capabilities = [];

  for (const domain of context.availableDomains) assertContextAuthority(authority, domain, id);

  if (provider.capabilities != null && !Array.isArray(provider.capabilities)) {
    throw new TypeError(`Capabilities for provider ${id} must be an array`);
  }

  for (const candidate of provider.capabilities || []) {
    if (!plainObject(candidate)) throw new TypeError(`Capability from provider ${id} must be a plain object`);
    const declaredProvenance = plainObject(candidate.provenance) ? candidate.provenance : {};
    const declaredProvider = declaredProvenance.provider == null ? id : String(declaredProvenance.provider).trim();
    const declaredAuthority = declaredProvenance.authority == null ? authority : String(declaredProvenance.authority).trim();
    if (declaredProvider !== id || declaredAuthority !== authority) {
      throw new RangeError(`Capability provenance cannot impersonate another provider or authority: ${candidate.id ?? '(unknown id)'}`);
    }
    const normalizedCapability = normalizeGlazeCapability({
      ...candidate,
      provenance: {
        provider: id,
        authority,
        scope: declaredProvenance.scope ?? scope,
        observedAt: declaredProvenance.observedAt ?? null
      }
    });
    assertCapabilityAuthority(authority, normalizedCapability.domain, id);
    capabilities.push(normalizedCapability);
  }

  return Object.freeze({
    id,
    authority,
    scope,
    context,
    capabilities: Object.freeze(capabilities),
    remoteAnalysisRequired: false,
    telemetryRequired: false
  });
}

export function createGlazeProviderSnapshot(providers = []) {
  if (!Array.isArray(providers)) throw new TypeError('Providers must be an array');
  const normalized = providers.map(normalizeProvider);
  const providerIds = normalized.map(provider => provider.id);
  if (new Set(providerIds).size !== providerIds.length) throw new RangeError('Provider ids must be unique');

  const contextOwners = new Map();
  const contextConflicts = new Set();
  const contextInput = {};
  for (const provider of normalized) {
    for (const [domain, value] of Object.entries(provider.context.domains)) {
      if (contextOwners.has(domain)) {
        contextConflicts.add(domain);
        delete contextInput[domain];
        continue;
      }
      if (contextConflicts.has(domain)) continue;
      contextOwners.set(domain, provider.id);
      contextInput[domain] = value;
    }
  }

  const capabilityOwners = new Map();
  const capabilityConflicts = new Set();
  const capabilityRecords = new Map();
  for (const provider of normalized) {
    for (const capability of provider.capabilities) {
      if (capabilityOwners.has(capability.id)) {
        capabilityConflicts.add(capability.id);
        capabilityRecords.delete(capability.id);
        continue;
      }
      if (capabilityConflicts.has(capability.id)) continue;
      capabilityOwners.set(capability.id, provider.id);
      capabilityRecords.set(capability.id, capability);
    }
  }

  const mergedContext = normalizeGlazeContext(contextInput);
  const mergedCapabilities = normalizeGlazeCapabilities([...capabilityRecords.values()]);

  return Object.freeze({
    version: '1.5.0-dev.1',
    lifecycle: 'development',
    providers: Object.freeze(normalized),
    providerIds: Object.freeze(providerIds),
    context: mergedContext,
    capabilities: mergedCapabilities,
    conflicts: Object.freeze({
      contextDomains: Object.freeze([...contextConflicts].sort()),
      capabilityIds: Object.freeze([...capabilityConflicts].sort())
    }),
    conflictPolicy: 'fail-closed-by-omission',
    authorityOwnershipEnforced: true,
    authorizationInferred: false,
    providerPrecedenceInferred: false,
    remoteAnalysisRequired: false,
    telemetryRequired: false
  });
}

export function providerSnapshotSummary(snapshot) {
  if (!plainObject(snapshot)) throw new TypeError('Provider snapshot must be an object');
  const states = {};
  for (const capability of Object.values(snapshot.capabilities?.byId || {})) {
    states[capability.state] = (states[capability.state] || 0) + 1;
  }
  return Object.freeze({
    version: '1.5.0-dev.1',
    providerCount: Array.isArray(snapshot.providerIds) ? snapshot.providerIds.length : 0,
    contextDomains: Object.freeze([...(snapshot.context?.availableDomains || [])]),
    capabilityStateCounts: Object.freeze(states),
    conflictCounts: Object.freeze({
      contextDomains: snapshot.conflicts?.contextDomains?.length || 0,
      capabilityIds: snapshot.conflicts?.capabilityIds?.length || 0
    }),
    authorityOwnershipEnforced: Boolean(snapshot.authorityOwnershipEnforced),
    providerIdsIncluded: false,
    rawContextIncluded: false,
    telemetryRequired: false
  });
}

export const glazeProviderDevelopmentContract = Object.freeze({
  version: '1.5.0-dev.1',
  lifecycle: 'development',
  duplicateContextPolicy: 'fail-closed-by-omission',
  duplicateCapabilityPolicy: 'fail-closed-by-omission',
  provenanceImpersonationAllowed: false,
  authorityOwnershipEnforced: true,
  privacyAuthorityMayOwnAuthorizationTruth: true,
  unknownAuthorityMayOwnSemanticTruth: false,
  providerPrecedenceInferred: false,
  authorizationInferred: false,
  remoteAnalysisRequired: false,
  telemetryRequired: false
});
