/* GLAZE UI V1.7 — Glaze Inspector Development foundation. */
import {runGlazeConsistencyInspector} from './glaze-v1.6-conformance-adoption.dev.mjs';
import {runGlazeDeveloperDiagnostics} from './glaze-v1.6-performance-diagnostics.dev.mjs';
import {resolveGlazeExpandedComponent} from './glaze-v1.7-expanded-component-system.dev.mjs';

const INSPECTION_DOMAINS=Object.freeze(["component-state","token-provenance","semantic-color-resolution","theme-resolution","material-hierarchy","accessibility-overrides","focus-behavior","input-mapping","adaptive-layout-resolution","form-factor-previews","target-sizes","authority-boundaries","migration-state"]);
const PROVENANCE_SOURCES=Object.freeze(["semantic-state","product-identity","user-theme","context","accessibility","glaze-fallback"]);
const MIGRATION_STATES=Object.freeze(['current','migration-required','partial','blocked','unknown']);
const THEME_SOURCE=Object.freeze({
  accessibility:'accessibility',
  'protected-semantic-state':'semantic-state',
  'product-identity':'product-identity',
  'user-theme':'user-theme',
  'contextual-accent':'context',
  'glaze-default':'glaze-fallback'
});

function plainObject(v){if(v===null||typeof v!=='object'||Array.isArray(v))return false;const p=Object.getPrototypeOf(v);return p===Object.prototype||p===null;}
function bounded(v,max=180){const s=String(v??'').trim();return s?s.slice(0,max):null;}
function unique(values,max=100){if(!Array.isArray(values))return Object.freeze([]);return Object.freeze([...new Set(values.map(x=>bounded(x,100)).filter(Boolean))].slice(0,max));}
function number(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:null;}
function authorityValue(value,authoritative){return Object.freeze({requested:value??null,accepted:authoritative===true?(value??null):null,authoritative:authoritative===true,withheldWithoutAuthority:value!=null&&authoritative!==true});}

export function normalizeGlazeInspectorProvenance(entries=[]){
  if(!Array.isArray(entries))throw new TypeError('Inspector provenance must be an array');
  return Object.freeze(entries.slice(0,200).map((entry,index)=>{
    if(!plainObject(entry))throw new TypeError(`Inspector provenance entry ${index+1} must be a plain object`);
    const token=bounded(entry.token,180);
    const source=bounded(entry.source,80);
    if(!token)throw new RangeError(`Inspector provenance entry ${index+1} requires token`);
    if(!PROVENANCE_SOURCES.includes(source))throw new RangeError(`Unsupported Inspector provenance source: ${source}`);
    return Object.freeze({
      token,
      source,
      authoritative:entry.authoritative===true,
      detail:bounded(entry.detail,240),
      status:entry.authoritative===true?'verified':'unverified'
    });
  }));
}

export function inspectGlazeElement(input={}){
  if(!plainObject(input))throw new TypeError('Glaze Inspector input must be a plain object');

  const component=resolveGlazeExpandedComponent(input);
  const provenance=normalizeGlazeInspectorProvenance(input.tokenProvenance??[]);
  const resolvedThemeLayer=component.theme.layer;
  const resolutionSource=THEME_SOURCE[resolvedThemeLayer]??'glaze-fallback';
  const matchedTokens=Object.freeze(provenance.filter(entry=>
    entry.token===component.theme.token || entry.token===component.semanticColor.token
  ));

  const materialHierarchy=unique(input.materialHierarchy,20);
  const accessibilityOverrides=unique(input.accessibilityOverrides,30);
  const focusId=bounded(input.focusId,160);
  const inputMapping=bounded(input.inputMapping,160);
  const requestedMigration=bounded(input.migrationState,80)??'unknown';
  if(!MIGRATION_STATES.includes(requestedMigration))throw new RangeError(`Unsupported migration state: ${requestedMigration}`);

  const targetSize=number(input.targetSizePx);
  const minimumTargetSize=number(input.minimumTargetSizePx);
  const targetAuthority=input.targetSizeAuthoritative===true;
  const targetStatus=!targetAuthority||targetSize===null||minimumTargetSize===null
    ? 'unverified'
    : targetSize>=minimumTargetSize?'pass':'fail';

  const consistency=plainObject(input.consistency)
    ? runGlazeConsistencyInspector({
        evidence:plainObject(input.consistency.evidence)?input.consistency.evidence:{},
        findings:plainObject(input.consistency.findings)?input.consistency.findings:{}
      })
    : null;

  const developerDiagnostics=plainObject(input.developerDiagnostics)
    ? runGlazeDeveloperDiagnostics(input.developerDiagnostics)
    : null;

  return Object.freeze({
    version:'1.7.0-dev.11',
    lifecycle:'development',
    stableBaseline:'1.6.0',
    planVersion:'v1.1',
    v11SpecificationSections:Object.freeze([26]),
    component:Object.freeze({
      id:component.component,
      family:component.family,
      semanticSurfaceId:component.semanticSurfaceId,
      providerState:component.providerState,
      taskState:component.taskState
    }),
    tokenProvenance:provenance,
    colorResolution:Object.freeze({
      semanticRole:component.semanticColor.acceptedRole,
      semanticToken:component.semanticColor.token,
      semanticAuthoritative:component.semanticColor.authoritative,
      themeLayer:resolvedThemeLayer,
      themeToken:component.theme.token,
      provenanceSource:resolutionSource,
      matchedProvenance:matchedTokens,
      explanation:`Resolved from ${resolutionSource} through theme layer ${resolvedThemeLayer}.`,
      colorOnlyMeaningAllowed:false,
      providerTruthCreatedByInspector:false
    }),
    themeResolution:component.theme,
    materialHierarchy:authorityValue(materialHierarchy,input.materialHierarchyAuthoritative),
    accessibilityOverrides:authorityValue(accessibilityOverrides,input.accessibilityOverridesAuthoritative),
    focusBehavior:authorityValue(focusId,input.focusAuthoritative),
    inputMapping:authorityValue(inputMapping,input.inputMappingAuthoritative),
    adaptiveLayoutResolution:component.presentation.adaptive,
    formFactorPreview:Object.freeze({
      profile:component.presentation.adaptive.profile,
      posture:component.presentation.adaptive.posture,
      presentation:component.presentation.adaptive.presentation,
      previewOnly:true,
      platformAcceptanceImplied:false
    }),
    targetSizes:Object.freeze({
      targetSizePx:targetAuthority?targetSize:null,
      minimumTargetSizePx:targetAuthority?minimumTargetSize:null,
      authoritative:targetAuthority,
      status:targetStatus,
      minimumInventedByInspector:false
    }),
    authorityBoundaries:component.authority,
    migrationState:Object.freeze({
      requested:requestedMigration,
      accepted:input.migrationStateAuthoritative===true?requestedMigration:'unknown',
      authoritative:input.migrationStateAuthoritative===true,
      acceptanceReboundAutomatically:false
    }),
    consistency,
    developerDiagnostics,
    inspectionDomains:INSPECTION_DOMAINS,
    privacy:Object.freeze({
      privateContentRequired:false,
      rawUserContentCapturedByDefault:false,
      telemetryRequired:false,
      networkRequired:false
    }),
    authority:Object.freeze({
      advisoryOnly:true,
      sourceModifiedAutomatically:false,
      providerTruthCreatedByInspector:false,
      semanticTruthCreatedByInspector:false,
      accessibilityStateCreatedByInspector:false,
      focusStateCreatedByInspector:false,
      inputMappingCreatedByInspector:false,
      migrationStateCreatedByInspector:false,
      acceptanceGrantedByInspector:false,
      lifecyclePromotionAutomatic:false,
      consequentialExecutionAutomatic:false
    }),
    acceptanceBoundary:Object.freeze({
      sourceFoundationOnly:true,
      section26Complete:false,
      renderedAcceptanceRequired:true,
      assistiveTechnologyAcceptanceRequired:true,
      representativePlatformAcceptanceRequired:true,
      performanceAcceptanceRequired:true,
      downstreamConsumerAcceptanceAutomatic:false
    })
  });
}

export const glazeV17InspectorDevelopmentContract=Object.freeze({
  version:'1.7.0-dev.11',
  lifecycle:'development',
  stableBaseline:'1.6.0',
  consumerEligible:false,
  planVersion:'v1.1',
  v11SpecificationSections:Object.freeze([26]),
  inspectionDomains:INSPECTION_DOMAINS,
  provenanceSources:PROVENANCE_SOURCES,
  migrationStates:MIGRATION_STATES,
  colorResolutionExplainable:true,
  sourceMutationAllowed:false,
  missingEvidenceMayInferPass:false,
  privateContentRequired:false,
  telemetryRequired:false,
  section26Complete:false,
  acceptanceGrantedByInspector:false,
  releasePromotionAutomatic:false,
  deploymentAcceptanceAutomatic:false,
  productionAcceptanceAutomatic:false
});
