/* GLAZE UI V1.6 — Development consistency, conformance metadata,
 * adoption-profile, and V1.5.1 migration-continuity foundation.
 *
 * Development-only and non-consumer-eligible. The shared design system does
 * not grant downstream acceptance, lifecycle promotion, or production state.
 */

const INSPECTOR_DOMAINS=Object.freeze([
  'tokens','colors','typography','spacing','materials','focus','motion',
  'skeleton','component-states','accessibility','loading'
]);
const ADOPTION_STATUSES=Object.freeze([
  'implemented','partially-implemented','unsupported','not-applicable','awaiting-acceptance'
]);
const ACCESSIBILITY_MODES=Object.freeze([
  'default','high-contrast','forced-colors','reduced-motion','reduced-transparency',
  'large-text','screen-reader','keyboard','touch-assistance'
]);
const FORM_FACTORS=Object.freeze([
  'compact','medium','expanded','workspace','far-view','wearable','foldable','spatial'
]);
const MIGRATION_INVARIANTS=Object.freeze([
  'semantic-colors','accessibility-precedence','contextual-awareness',
  'capability-awareness','authority-boundaries','graceful-fallback',
  'continuity-behavior','privacy-safe-diagnostics'
]);

function plainObject(v){return Boolean(v)&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;}
function str(v){return String(v??'').trim();}
function ids(v,max=200){if(!Array.isArray(v))return Object.freeze([]);return Object.freeze([...new Set(v.map(str).filter(Boolean))].slice(0,max));}
function semantic(v,f='unknown'){return str(v).toLowerCase()||f;}
function statusFromChecks(checks){if(checks.some(x=>x.status==='fail'))return 'fail';if(checks.length>0&&checks.every(x=>x.status==='pass'))return 'pass';return 'unverified';}

export function runGlazeConsistencyInspector(input={}){
  if(!plainObject(input))throw new TypeError('Consistency-inspector input must be a plain object');
  const evidence=plainObject(input.evidence)?input.evidence:{};
  const findings=plainObject(input.findings)?input.findings:{};
  const checks=INSPECTOR_DOMAINS.map(domain=>{
    const domainEvidence=evidence[domain]===true;
    const violations=ids(findings[domain],100);
    return Object.freeze({
      domain,
      status:violations.length>0?'fail':domainEvidence?'pass':'unverified',
      violations,
      evidenceProvided:domainEvidence,
      sourceModified:false
    });
  });
  return Object.freeze({
    version:'1.6.0-dev.10',lifecycle:'development',stableBaseline:'1.5.1',
    consumerEligible:false,checks:Object.freeze(checks),status:statusFromChecks(checks),
    failedDomains:Object.freeze(checks.filter(x=>x.status==='fail').map(x=>x.domain)),
    unverifiedDomains:Object.freeze(checks.filter(x=>x.status==='unverified').map(x=>x.domain)),
    authority:Object.freeze({
      advisoryOnly:true,sourceModifiedAutomatically:false,visualAcceptanceManufactured:false,
      providerTruthInferred:false,consumerAcceptanceGranted:false
    })
  });
}

export function buildGlazeComponentConformanceMetadata(input={}){
  if(!plainObject(input))throw new TypeError('Component-conformance metadata input must be a plain object');
  const componentId=str(input.componentId);
  if(!componentId)throw new RangeError('componentId is required');
  const supportedStates=ids(input.supportedStates,100);
  const accessibilityModes=ids(input.accessibilityModes,50).filter(x=>ACCESSIBILITY_MODES.includes(x));
  const formFactors=ids(input.formFactors,50).filter(x=>FORM_FACTORS.includes(x));
  const motionBehavior=str(input.motionBehavior);
  const fallbackBehavior=str(input.fallbackBehavior);
  const performanceExpectations=plainObject(input.performanceExpectations)?Object.freeze({...input.performanceExpectations}):null;
  const requiredPresent=supportedStates.length>0&&accessibilityModes.length>0&&formFactors.length>0&&motionBehavior&&fallbackBehavior&&performanceExpectations;
  return Object.freeze({
    version:'1.6.0-dev.10',lifecycle:'development',componentId,
    supportedStates,accessibilityModes:Object.freeze(accessibilityModes),formFactors:Object.freeze(formFactors),
    motionBehavior:motionBehavior||null,fallbackBehavior:fallbackBehavior||null,performanceExpectations,
    status:requiredPresent?'complete':'incomplete',
    boundaries:Object.freeze({
      metadataDoesNotProveRuntimeConformance:true,performanceEvidenceManufactured:false,
      accessibilityEvidenceManufactured:false,formFactorAcceptanceManufactured:false
    })
  });
}

export function resolveGlazeApplicationAdoptionProfile(input={}){
  if(!plainObject(input))throw new TypeError('Application-adoption profile input must be a plain object');
  const application=str(input.application), repository=str(input.repository);
  if(!application||!/^GoreeCloud\/.+/.test(repository))throw new RangeError('application and GoreeCloud repository are required');
  const capabilities=Array.isArray(input.capabilities)?input.capabilities.slice(0,300):[];
  const entries=capabilities.map((item,i)=>{
    const row=plainObject(item)?item:{};
    const id=str(row.id)||`capability-${i+1}`;
    const state=semantic(row.status,'awaiting-acceptance');
    if(!ADOPTION_STATUSES.includes(state))throw new RangeError(`Unsupported adoption status: ${state}`);
    return Object.freeze({id,status:state,evidence:str(row.evidence)||null});
  });
  const implementationComplete=entries.length>0&&entries.every(x=>['implemented','not-applicable'].includes(x.status));
  const exactRevision=/^[0-9a-f]{40}$/.test(str(input.referenceRevision))?str(input.referenceRevision):null;
  const applicationAcceptanceProvided=input.applicationAcceptanceProvided===true;
  return Object.freeze({
    version:'1.6.0-dev.10',lifecycle:'development',consumerEligible:false,
    application,repository,targetVersion:'1.6.0-development',referenceRevision:exactRevision,
    capabilities:Object.freeze(entries),implementationComplete,applicationAcceptanceProvided,
    adoptionState:implementationComplete&&exactRevision&&applicationAcceptanceProvided?'profile-complete-awaiting-shared-lifecycle':'incomplete',
    authority:Object.freeze({
      sharedStableStatusImpliesApplicationAdoption:false,sharedDevelopmentStatusImpliesApplicationAdoption:false,
      applicationAcceptanceAutomatic:false,productionEligibilityAutomatic:false,
      consumerRegistryMutatedByResolver:false
    })
  });
}

export function evaluateGlazeV151MigrationContinuity(input={}){
  if(!plainObject(input))throw new TypeError('Migration-continuity input must be a plain object');
  const preserved=plainObject(input.preserved)?input.preserved:{};
  const checks=MIGRATION_INVARIANTS.map(id=>Object.freeze({
    id,status:preserved[id]===true?'pass':preserved[id]===false?'fail':'unverified'
  }));
  const sourceRevision=/^[0-9a-f]{40}$/.test(str(input.sourceRevision))?str(input.sourceRevision):null;
  const targetRevision=/^[0-9a-f]{40}$/.test(str(input.targetRevision))?str(input.targetRevision):null;
  const checkStatus=statusFromChecks(checks);
  const status=!sourceRevision||!targetRevision?(checkStatus==='fail'?'fail':'unverified'):checkStatus;
  return Object.freeze({
    version:'1.6.0-dev.10',lifecycle:'development',sourceBaseline:'1.5.1',
    sourceRevision,targetRevision,checks:Object.freeze(checks),status,
    addedCapabilities:ids(input.addedCapabilities,100),
    evolution:Object.freeze({
      destructiveMigrationPreferred:false,preserveStableSemanticsRequired:true,
      exactRevisionEvidenceRequired:true,priorAcceptanceReboundAutomatically:false
    }),
    authority:Object.freeze({
      lifecyclePromotionAutomatic:false,consumerAcceptanceAutomatic:false,
      deploymentAcceptanceAutomatic:false,productionAcceptanceAutomatic:false
    })
  });
}

export const glazeV16ConformanceAdoptionDevelopmentContract=Object.freeze({
  version:'1.6.0-dev.10',lifecycle:'development',stableBaseline:'1.5.1',consumerEligible:false,
  inspectorDomains:INSPECTOR_DOMAINS,adoptionStatuses:ADOPTION_STATUSES,
  accessibilityModes:ACCESSIBILITY_MODES,formFactors:FORM_FACTORS,migrationInvariants:MIGRATION_INVARIANTS,
  inspectorMayModifySource:false,componentMetadataProvesRuntimeConformance:false,
  sharedStatusImpliesApplicationAdoption:false,migrationMayRebindPriorAcceptance:false,
  authorityBoundary:'development-conformance-support-only'
});
