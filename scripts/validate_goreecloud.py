#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []

def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)

required = [
    "LICENSE",
    "NOTICE.md",
    "goreecloud.platform.yaml",
    "docs/PROJECT-SPECIFICATIONS.md",
    "docs/PROJECT-RECORD.md",
    "docs/ARCHITECTURE.md",
    "docs/WEBHOOKS.md",
    "docs/SEARCH-AND-VIEWS.md",
    "docs/AUTHENTICATION.md",
    "docs/API.md",
    "docs/IMPLEMENTED-FEATURES.md",
    "docs/PLANNED-FEATURES.md",
    "docs/SECURITY.md",
    "docs/PRIVACY.md",
    "docs/BACKUP-AND-RECOVERY.md",
    "docs/PERFORMANCE.md",
    "docs/DATABASE-COMPATIBILITY.md",
    "docs/EVERKEEP-INTEGRATION.md",
    "docs/PRIVACY-SHIELD-INTEGRATION.md",
    "docs/WARDVEIL-INTEGRATION.md",
    "docs/MANAGER-INTEGRATION.md",
    "docs/OBSERVABILITY-INTEGRATION.md",
    "docs/GLAZE-ADOPTION.md",
    "docs/UPSTREAM.md",
    "docs/VALIDATION.md",
    "provenance/upstream.json",
    "provenance/glaze.json",
    "provenance/branding.json",
    "provenance/privacy-shield.json",
    "provenance/wardveil.json",
    "provenance/observability.json",
    "scripts/run_database_upgrade_acceptance.sh",
    "integrations/everkeep/adoption.json",
    "integrations/everkeep/acceptance.json",
    "integrations/privacy-shield/adapter.json",
    "integrations/privacy-shield/acceptance.json",
    "integrations/wardveil/adoption.json",
    "integrations/wardveil/acceptance.json",
    "integrations/observability/producer.json",
    "integrations/observability/acceptance.json",
    "internal/everkeep/status.go",
    "internal/everkeep/status_test.go",
    "internal/wardveil/status.go",
    "internal/wardveil/status_test.go",
    "internal/observability/signal.go",
    "internal/observability/signal_test.go",
    "web/public/goreecloud-memos.svg",
    "web/src/themes/goreecloud.css",
    "web/public/goreecloud/glaze/css/glaze-v1.4.1.css",
    "web/public/goreecloud/glaze/js/glaze-v1.7.0.mjs",
]
for rel in required:
    require((ROOT / rel).is_file(), f"missing required file: {rel}")

if errors:
    print("\n".join(f"ERROR: {e}" for e in errors))
    sys.exit(1)

upstream = json.loads((ROOT / "provenance/upstream.json").read_text())
glaze = json.loads((ROOT / "provenance/glaze.json").read_text())
branding = json.loads((ROOT / "provenance/branding.json").read_text())
privacy_shield_provenance = json.loads((ROOT / "provenance/privacy-shield.json").read_text())
observability_provenance = json.loads((ROOT / "provenance/observability.json").read_text())
privacy_shield_adapter = json.loads((ROOT / "integrations/privacy-shield/adapter.json").read_text())
privacy_shield_acceptance = json.loads((ROOT / "integrations/privacy-shield/acceptance.json").read_text())
observability_producer = json.loads((ROOT / "integrations/observability/producer.json").read_text())
observability_acceptance = json.loads((ROOT / "integrations/observability/acceptance.json").read_text())
wardveil_provenance = json.loads((ROOT / "provenance/wardveil.json").read_text())
wardveil_adoption = json.loads((ROOT / "integrations/wardveil/adoption.json").read_text())
wardveil_acceptance = json.loads((ROOT / "integrations/wardveil/acceptance.json").read_text())
everkeep_adoption = json.loads((ROOT / "integrations/everkeep/adoption.json").read_text())
everkeep_acceptance = json.loads((ROOT / "integrations/everkeep/acceptance.json").read_text())
platform = (ROOT / "goreecloud.platform.yaml").read_text()
migrator = (ROOT / "store/migrator.go").read_text()
app = (ROOT / "web/src/App.tsx").read_text()
shell = (ROOT / "web/src/layouts/RootLayout.tsx").read_text()
theme = (ROOT / "web/src/themes/goreecloud.css").read_text()
readme = (ROOT / "README.md").read_text()
license_text = (ROOT / "LICENSE").read_text()
icon = (ROOT / "web/public/goreecloud-memos.svg").read_bytes()

require(upstream["developmentPath"] == "maintained-fork", "development path must be maintained-fork")
require(upstream["upstream"]["repository"] == "usememos/memos", "upstream repository mismatch")
require(upstream["upstream"]["baselineTag"] == "v0.31.0", "upstream baseline tag mismatch")
require(upstream["upstream"]["baselineCommit"] == "2b2192d4e153bd04f1d325b60fd880cf00d68b01", "upstream baseline commit mismatch")
require(upstream["fork"]["repository"] == "GoreeCloud/memos", "fork repository mismatch")
require(upstream["fork"]["repositoryId"] == "1409419590", "fork repository ID mismatch")

require(glaze["requiredVersion"] == "1.7.0", "Glaze required version must be 1.7.0")
require(glaze["consumerStatus"] == "adoption-required", "Glaze status must remain adoption-required before acceptance")
require(glaze["productionEligible"] is False, "Glaze production eligibility must remain false before acceptance")
require(glaze["stableWebEntrypointSha256"] == "9c296d10ce5ef071e60c9da8ff8bb983f195534c138be5c1d6ab59a6be36c8fc", "Glaze CSS provenance hash mismatch")
require(glaze["stableRuntimeEntrypointSha256"] == "f922c5f854f17748922b8b99d9af21f62f3c46536fa2cee43ea3fe97c3318d61", "Glaze runtime provenance hash mismatch")
require(hashlib.sha256((ROOT / "web/public/goreecloud/glaze/css/glaze-v1.4.1.css").read_bytes()).hexdigest() == glaze["stableWebEntrypointSha256"], "vendored Glaze CSS bytes drifted")
require(hashlib.sha256((ROOT / "web/public/goreecloud/glaze/js/glaze-v1.7.0.mjs").read_bytes()).hexdigest() == glaze["stableRuntimeEntrypointSha256"], "vendored Glaze runtime bytes drifted")
require('"1.7.0"' in platform and "nonconformant" in platform, "platform manifest must preserve Glaze 1.7.0/nonconformant boundary")
require("data-glaze-version=\"1.7.0\"" in shell, "root shell must expose the Glaze consumer version")
index_html = (ROOT / "web/index.html").read_text()
require('src="/goreecloud/glaze/js/glaze-v1.7.0.mjs"' in index_html, "stable Glaze runtime must load locally")

require("INSTANCE_ACCESS_MODE_PRIVATE" in migrator, "private access initialization missing")
init_start = migrator.find("func (s *Store) initializeInstanceAccessSetting")
init_end = migrator.find("// applyMigrations", init_start)
init_block = migrator[init_start:init_end]
require("InstanceURL" not in init_block, "instance URL must not implicitly change initial access mode")
require("s.profile.Demo" in init_block, "explicit demo-mode public exception must remain visible")
require(init_block.count("INSTANCE_ACCESS_MODE_PUBLIC") == 1, "public startup access must be limited to the explicit demo exception")

require('document.createElement("script")' not in app, "browser client must not execute instance-provided arbitrary scripts")
require('document.createElement("style")' not in app, "browser client must not execute instance-provided arbitrary CSS")
require("GoreeCloud Memos" in readme, "README must identify GoreeCloud Memos")
manager_integration = (ROOT / "docs/MANAGER-INTEGRATION.md").read_text()
require("GoreeCloud/manager#111" in manager_integration, "Manager integration boundary must pin the canonical contract issue")
require("applicable-blocked" in manager_integration, "Manager integration boundary must remain fail-closed before contract acceptance")
manager_start = platform.find("  manager:")
manager_end = platform.find("  privacy_shield:", manager_start)
manager_block = platform[manager_start:manager_end]
require(manager_start >= 0 and manager_end > manager_start, "Manager platform block missing")
require("GoreeCloud/manager#111" in manager_block, "Manager platform block must pin the canonical contract dependency")
require("result: applicable-blocked" in manager_block, "Manager platform state must remain blocked before contract acceptance")
require("docs/MANAGER-INTEGRATION.md" in manager_block, "Manager platform evidence must include the integration boundary")
require("      - docs/GLAZE-ADOPTION.md\n      - provenance/glaze.json" in platform, "Glaze evidence indentation drifted or contains cross-system evidence")
require("    - docs/OBSERVABILITY-INTEGRATION.md\n  blockers:" in platform, "Observability integration evidence must remain in the conformance evidence list")
mesh_start = platform.find("  mesh:")
mesh_end = platform.find("  identity:", mesh_start)
mesh_block = platform[mesh_start:mesh_end]
require(mesh_start >= 0 and mesh_end > mesh_start, "Mesh platform block missing")
require("GoreeCloud/mesh#51" in mesh_block, "Mesh platform block must pin the canonical Observability producer dependency")
require("result: applicable-blocked" in mesh_block, "Mesh platform state must remain blocked before the producer contract exists")
identity_start = platform.find("  identity:")
identity_end = platform.find("  policy:", identity_start)
identity_block = platform[identity_start:identity_end]
require(identity_start >= 0 and identity_end > identity_start, "Identity platform block missing")
require("GoreeCloud/identity#3" in identity_block, "Identity platform block must pin the first-party session/user-context dependency")
require("result: applicable-blocked" in identity_block, "Identity platform state must remain blocked before authoritative application identity/session acceptance")
policy_start = platform.find("  policy:")
policy_end = platform.find("  observability:", policy_start)
policy_block = platform[policy_start:policy_end]
require(policy_start >= 0 and policy_end > policy_start, "Policy platform block missing")
require("GoreeCloud/policy#3" in policy_block, "Policy platform block must pin the authenticated consumer-contract dependency")
require("result: applicable-blocked" in policy_block, "Policy platform state must remain blocked before authenticated evaluation/enforcement acceptance")


# Privacy Shield source-contract boundary. This validates a repository-local
# application adapter declaration against the reviewed canonical contract
# identity. Central source registration is separately pinned below; this still
# does not establish target-runtime acceptance, policy/status transport,
# production approval, or lifecycle promotion.
require(privacy_shield_provenance["source"] == "GoreeCloud/privacy-shield", "Privacy Shield provenance source mismatch")
require(privacy_shield_provenance["revision"] == "0da3d1bea33272990375553891044f54b02fcfd4", "Privacy Shield provenance revision mismatch")
require(privacy_shield_provenance["version"] == "2.0.0", "Privacy Shield provenance version mismatch")
require(privacy_shield_provenance["adapterSchema"]["path"] == "contracts/privacy-shield.adapter.schema.json", "Privacy Shield adapter schema path mismatch")
require(privacy_shield_provenance["adapterSchema"]["blobSha"] == "cc0a50a3d0d5151d06ed34be2df30266a91c3bf9", "Privacy Shield adapter schema blob mismatch")
require(privacy_shield_provenance["capabilityRegistry"]["path"] == "contracts/privacy-shield.capabilities.json", "Privacy Shield capability registry path mismatch")
require(privacy_shield_provenance["capabilityRegistry"]["blobSha"] == "d9bb4e26cf7eb3b90034f763e885d47023df3664", "Privacy Shield capability registry blob mismatch")
require(privacy_shield_provenance["centralRegistration"] == {
    "repository": "GoreeCloud/privacy-shield",
    "pullRequest": 180,
    "revision": "96213c9b415ba132ded7c65778be04b38da79ff4",
    "validationRun": 37757637020,
    "adapterPath": "adapters/memos-application-privacy.json",
    "productionApproved": False,
}, "Privacy Shield central-registration provenance mismatch")

expected_privacy_capabilities = [
    "telemetry-minimization",
    "data-minimization",
    "deletion-controls",
    "portable-export",
]
require(set(privacy_shield_adapter) == {"schema_version", "adapter", "capabilities", "privacy", "acceptance"}, "Privacy Shield adapter has unexpected top-level fields")
require(privacy_shield_adapter["schema_version"] == 1, "Privacy Shield adapter schema version mismatch")
require(privacy_shield_adapter["adapter"] == {
    "id": "memos-application-privacy",
    "product": "GoreeCloud Memos",
    "runtime_authority": "GoreeCloud/memos",
    "contract_version": 1,
}, "Privacy Shield adapter identity mismatch")
require(privacy_shield_adapter["capabilities"] == expected_privacy_capabilities, "Privacy Shield declared capability set/order mismatch")
require(privacy_shield_adapter["privacy"] == {
    "local_first": True,
    "raw_private_activity_exported_for_status": False,
    "remote_tracker_learning": False,
    "remote_tracker_telemetry": False,
}, "Privacy Shield privacy assertions drifted")
require(privacy_shield_adapter["acceptance"] == {
    "runtime_acceptance_required": True,
    "production_approved": False,
}, "Privacy Shield adapter acceptance boundary drifted")

require(privacy_shield_acceptance["application"] == "GoreeCloud Memos", "Privacy Shield acceptance application mismatch")
require(privacy_shield_acceptance["repository"] == "GoreeCloud/memos", "Privacy Shield acceptance repository mismatch")
require(privacy_shield_acceptance["privacy_shield"]["revision"] == privacy_shield_provenance["revision"], "Privacy Shield acceptance/provenance revision mismatch")
require(list(privacy_shield_acceptance["declared_capabilities"]) == expected_privacy_capabilities, "Privacy Shield acceptance capability set/order mismatch")
require(privacy_shield_acceptance["acceptance"] == {
    "central_adapter_registered": True,
    "runtime_acceptance_complete": False,
    "privacy_status_producer_active": False,
    "production_approved": False,
}, "Privacy Shield acceptance boundary drifted after central registration")
for capability in expected_privacy_capabilities:
    for evidence_path in privacy_shield_acceptance["declared_capabilities"][capability]["evidence"]:
        require((ROOT / evidence_path).is_file(), f"Privacy Shield evidence path missing for {capability}: {evidence_path}")
require('privacy_shield:\n    result: applicable-migration-required\n    version: "2.0.0"' in platform, "platform manifest must retain the bounded Privacy Shield migration-required state")

memo_delete_policy = (ROOT / "store/memo_delete_policy.go").read_text()
user_delete_tests = (ROOT / "server/api/v1/test/user_service_delete_test.go").read_text()
memo_export_doc = (ROOT / "core/memoexport/doc.go").read_text()
memo_export_service = (ROOT / "server/api/v1/user_service_memo_export.go").read_text()
memo_export_tests = (ROOT / "server/api/v1/test/memo_export_test.go").read_text()
require("DeleteMemoWithPolicy" in memo_delete_policy and "ActorUserID" in memo_delete_policy, "Privacy Shield deletion-control source evidence missing")
require("TestDeleteUserSelfDeleteCleansAccountDataAndAuthCookies" in user_delete_tests, "Privacy Shield account-deletion regression evidence missing")
require("carries one user's memos and attachments between Memos instances" in memo_export_doc, "Privacy Shield portable-export source evidence missing")
require("WriteMemoExport" in memo_export_service and "Nothing another user created is included" in memo_export_service, "Privacy Shield export scope evidence missing")
require("TestImportMemoExportIntoAnotherAccount" in memo_export_tests, "Privacy Shield portable-export round-trip evidence missing")
require(everkeep_adoption["schema_version"] == 1, "Everkeep adoption schema version mismatch")
require(everkeep_adoption["project"] == "GoreeCloud Memos", "Everkeep adoption project mismatch")
require(everkeep_adoption["repository"] == "GoreeCloud/memos", "Everkeep adoption repository mismatch")
require(everkeep_adoption["role"] == "consumer", "Everkeep adoption role must remain consumer before a producer path is implemented")
require(everkeep_adoption["read_only"] is True and everkeep_adoption["fail_closed"] is True, "Everkeep adoption must remain read-only/fail-closed")
require(everkeep_acceptance["producer"] == "Everkeep", "Everkeep acceptance producer mismatch")
require(everkeep_acceptance["freshness"]["required_for_ready"] is True, "Everkeep readiness must require fresh evidence")
require(everkeep_acceptance["acceptance"]["everkeep_integrated"] is False, "Everkeep integration must remain false before live acceptance")
require(everkeep_acceptance["acceptance"]["everkeep_ready"] is False, "Everkeep readiness must remain false before live acceptance")
require("result: applicable-migration-required" in platform and 'version: "0.5.0"' in platform, "platform manifest must retain the bounded Everkeep migration-required state")
everkeep_source = (ROOT / "internal/everkeep/status.go").read_text()
for marker in ("DisallowUnknownFields", "fresh_until", "sensitive evidence marker rejected", "StateUnknown"):
    require(marker in everkeep_source, f"Everkeep fail-closed source marker missing: {marker}")
# GoreeCloud Observability source-level producer boundary. This pins reviewed
# Development contracts and prevents source-level telemetry declarations from
# becoming live/runtime or production acceptance claims without new evidence.
require(observability_provenance["source"] == "GoreeCloud/observability", "Observability provenance source mismatch")
require(observability_provenance["revision"] == "a7f6a65f442d3e517baddbe7b6ce7c250d142c8c", "Observability provenance revision mismatch")
require(observability_provenance["foundationVersion"] == "0.1.0-dev", "Observability foundation version mismatch")
require(observability_provenance["signalSchema"] == {
    "path": "contracts/operational-signal.schema.json",
    "id": "https://goreecloud.com/contracts/observability/operational-signal/v1",
    "blobSha": "db5f70c4c2466143b0024ad1e1e9723c3ea0bfec",
}, "Observability signal-schema provenance mismatch")
require(observability_provenance["componentHealthSchema"] == {
    "path": "contracts/component-health.schema.json",
    "id": "https://goreecloud.com/contracts/observability/component-health/v1",
    "blobSha": "ee35e3549c786822560d7c24cbd2c22cbbbbafab",
}, "Observability component-health provenance mismatch")
require(observability_producer["schema_version"] == 1, "Observability producer schema version mismatch")
require(observability_producer["producer"] == {
    "id": "goreecloud-memos-operational-health",
    "component_id": "goreecloud-memos",
    "source": "goreecloud-memos",
    "runtime_authority": "GoreeCloud/memos",
    "signal_contract": "https://goreecloud.com/contracts/observability/operational-signal/v1",
}, "Observability producer identity mismatch")
require(observability_producer["signals"] == [
    {"signal_type": "process.liveness", "state_source": "/healthz", "ttl_seconds": 60},
    {"signal_type": "database.readiness", "state_source": "/readyz", "ttl_seconds": 60},
], "Observability declared signal set drifted")
require(observability_producer["privacy"] == {
    "memo_content_emitted": False,
    "user_identity_emitted": False,
    "attachment_metadata_emitted": False,
    "database_error_text_emitted": False,
}, "Observability privacy-minimization boundary drifted")
require(observability_producer["transport"] == {
    "collector_submission_implemented": False,
    "producer_authentication_implemented": False,
    "durable_telemetry_storage_implemented": False,
}, "Observability transport boundary drifted")
require(observability_acceptance["application"] == "GoreeCloud Memos", "Observability acceptance application mismatch")
require(observability_acceptance["repository"] == "GoreeCloud/memos", "Observability acceptance repository mismatch")
require(observability_acceptance["observability"]["revision"] == observability_provenance["revision"], "Observability acceptance/provenance revision mismatch")
require(observability_acceptance["acceptance"] == {
    "source_producer_implemented": True,
    "collector_transport_active": False,
    "producer_authentication_complete": False,
    "runtime_acceptance_complete": False,
    "production_approved": False,
}, "Observability acceptance boundary drifted")
require('observability:\n    result: applicable-migration-required\n    version: "0.1.0-dev"' in platform, "platform manifest must retain the bounded Observability migration-required state")
observability_source = (ROOT / "internal/observability/signal.go").read_text()
for marker in ("database_ping_failed", "database_handle_missing", "sensitive telemetry attribute key rejected", "StateUnavailable", "StateUnknown"):
    require(marker in observability_source, f"Observability fail-closed source marker missing: {marker}")

# Wardveil source-level status-consumer boundary. This pins the reviewed
# contract identity while keeping live/runtime/production acceptance false.
require(wardveil_provenance["source"] == "GoreeCloud/wardveil", "Wardveil provenance source mismatch")
require(wardveil_provenance["revision"] == "d3c54f47dcbd3b691ab2c98946b1e556985d8391", "Wardveil provenance revision mismatch")
require(wardveil_provenance["productVersion"] == "2.0.0", "Wardveil product version mismatch")
require(wardveil_provenance["foundationVersion"] == "0.9.0", "Wardveil foundation version mismatch")
require(wardveil_provenance["statusContractVersion"] == "0.1.0", "Wardveil status contract version mismatch")
require(wardveil_provenance["statusSchema"] == {
    "path": "contracts/wardveil.status.schema.json",
    "blobSha": "d0f31bbbd2d7f7c059736433b25883e76301581e",
}, "Wardveil status-schema provenance mismatch")
require(wardveil_provenance["capabilitiesContract"] == {
    "path": "contracts/wardveil.capabilities.json",
    "blobSha": "a32f81feb912f4e4929c2c06036995c73346b0e7",
}, "Wardveil capabilities provenance mismatch")
require(wardveil_provenance["identityContract"] == {
    "path": "contracts/wardveil.identity.json",
    "blobSha": "1a26fd67a61215fa2428256714791973e4fc29b4",
}, "Wardveil identity provenance mismatch")
require(wardveil_provenance["adoptionRequirements"] == {
    "path": "docs/ADOPTION.md",
    "blobSha": "a7e4a2cae402e6c88f0e63698e100d4d0fb9e417",
}, "Wardveil adoption provenance mismatch")
require(wardveil_provenance["centralRegistration"] == {
    "repository": "GoreeCloud/wardveil",
    "pullRequest": 210,
    "revision": "96969fe80acec564ea509c0ae722e9b97e22f6b3",
    "sourceEvidencePath": "contracts/wardveil.memos.consumer-source-evidence.json",
    "sourceEvidenceBlobSha": "66d4dac9d0e5f6ad1df3522ddbbba6dc6deee2d1",
    "validatorPath": "scripts/validate_memos_consumer_source_evidence.py",
    "validatorBlobSha": "5f9e18caa3bd8ebbb59a7ef651a5857b1f030ee4",
    "exactMainValidation": [
        {"workflow": "Validate Wardveil foundation", "runNumber": 813, "runId": 37769379314, "conclusion": "success"},
        {"workflow": "Validate authenticated Wardveil Scan transport", "runNumber": 534, "runId": 37769379284, "conclusion": "success"},
        {"workflow": "Validate pinned Wardveil Mesh evidence contract source", "runNumber": 425, "runId": 37769379290, "conclusion": "success"},
    ],
    "productionApproved": False,
}, "Wardveil central-registration provenance mismatch")
require(wardveil_adoption["schema_version"] == 1, "Wardveil adoption schema version mismatch")
require(wardveil_adoption["application"] == "GoreeCloud Memos", "Wardveil adoption application mismatch")
require(wardveil_adoption["repository"] == "GoreeCloud/memos", "Wardveil adoption repository mismatch")
require(wardveil_adoption["role"] == "status-consumer", "Wardveil adoption role mismatch")
require(wardveil_adoption["status_contract_version"] == "0.1.0", "Wardveil adoption contract mismatch")
require(wardveil_adoption["read_only"] is True and wardveil_adoption["fail_closed"] is True, "Wardveil consumer must remain read-only and fail-closed")
require(wardveil_adoption["accessible_text_state_required"] is True, "Wardveil consumer must preserve textual state")
require(wardveil_adoption["high_impact_executor"] is False, "Wardveil consumer must not become a high-impact executor")
require(wardveil_acceptance["application"] == "GoreeCloud Memos", "Wardveil acceptance application mismatch")
require(wardveil_acceptance["repository"] == "GoreeCloud/memos", "Wardveil acceptance repository mismatch")
require(wardveil_acceptance["wardveil"]["revision"] == wardveil_provenance["revision"], "Wardveil acceptance/provenance revision mismatch")
require(wardveil_acceptance["wardveil"]["central_source_evidence"] == {
    "path": "contracts/wardveil.memos.consumer-source-evidence.json",
    "blob_sha": "66d4dac9d0e5f6ad1df3522ddbbba6dc6deee2d1",
    "revision": "96969fe80acec564ea509c0ae722e9b97e22f6b3",
}, "Wardveil central source-evidence binding mismatch")
require(wardveil_acceptance["acceptance"] == {
    "source_consumer_implemented": True,
    "live_status_transport_active": False,
    "producer_authentication_complete": False,
    "runtime_acceptance_complete": False,
    "production_approved": False,
    "protected_by_wardveil_authorized": False,
    "central_source_evidence_registered": True,
}, "Wardveil acceptance boundary drifted")
require('wardveil_security:\n    result: applicable-migration-required\n    version: "2.0.0"' in platform, "platform manifest must retain the bounded Wardveil migration-required state")
wardveil_source = (ROOT / "internal/wardveil/status.go").read_text()
for marker in ("DisallowUnknownFields", "Protected by Wardveil claim requires protected state", "sensitive Wardveil evidence marker rejected", "Wardveil evidence is stale", "Attention required"):
    require(marker in wardveil_source, f"Wardveil fail-closed source marker missing: {marker}")

require("usememos/memos" in readme, "README must retain upstream provenance")
require("MIT License" in license_text and "Copyright (c) 2025 Memos" in license_text, "upstream MIT license/attribution missing")

require(branding["canonicalAsset"] == "products/memos/app-icon.svg", "canonical branding path mismatch")
require(branding["canonicalBlob"] == "eb9396c3a1891f6afb96849a29110c6f35e65f19", "canonical branding blob mismatch")
require(hashlib.sha256(icon).hexdigest() == "03ec74ede0f14f39f7c3171bf23046eda7304f506491e7677ad6bb919c4863ff", "packaged Memos icon bytes do not match canonical source")

# Source-level Glaze consumer contract. These checks prevent accidental removal
# of already-implemented accessibility and presentation fallbacks. They do not
# constitute rendered, assistive-technology, representative-device, performance,
# rollback, human visual, release, or product acceptance.
for required_selector in (
    ".goreecloud-shell",
    ".goreecloud-sidebar",
    ".goreecloud-composer",
    ".goreecloud-memo-card",
):
    require(required_selector in theme, f"missing GoreeCloud presentation surface: {required_selector}")

require(":focus-visible" in theme, "visible focus contract missing")
require("outline: 2px solid var(--ring);" in theme, "visible focus outline missing")
require("@media (prefers-reduced-motion: reduce)" in theme, "reduced-motion fallback missing")
require("animation-duration: 0.001ms !important;" in theme, "reduced-motion animation suppression missing")
require("transition-duration: 0.001ms !important;" in theme, "reduced-motion transition suppression missing")
require("@media (prefers-reduced-transparency: reduce)" in theme, "reduced-transparency fallback missing")
require("@media (forced-colors: active)" in theme, "forced-colors fallback missing")
require("background: Canvas;" in theme and "color: CanvasText;" in theme, "forced-colors semantic colors missing")
require("backdrop-filter: none;" in theme, "transparency fallback must disable backdrop filtering")


workflow_dir = ROOT / ".github/workflows"
workflow_files = sorted(path.name for path in workflow_dir.glob("*.yml"))
require(workflow_files == ["goreecloud-validate.yml"], f"unexpected active workflow set: {workflow_files}")
workflow_text = (workflow_dir / "goreecloud-validate.yml").read_text()
require("database-upgrade-matrix:" in workflow_text, "dedicated database upgrade matrix job missing")
for driver in ("sqlite", "mysql", "postgres"):
    require(f"          - {driver}" in workflow_text, f"database upgrade matrix missing driver: {driver}")
require("./scripts/run_database_upgrade_acceptance.sh" in workflow_text, "database upgrade matrix must use the repository-local acceptance runner")

database_acceptance = (ROOT / "scripts/run_database_upgrade_acceptance.sh").read_text()
for driver in ("sqlite", "mysql", "postgres"):
    require(driver in database_acceptance, f"database acceptance runner missing driver: {driver}")
for test_name in (
    "TestUpgradeFromPreviousStableRenamesShortcutsToMemoViews",
    "TestMigrationFromV0262PreservesLegacyData",
    "TestMigrationUniqueEmail",
):
    require(test_name in database_acceptance, f"database acceptance runner missing critical test: {test_name}")

for line in workflow_text.splitlines():
    stripped = line.strip()
    if stripped.startswith("uses:"):
        ref = stripped.split("@", 1)[1].split()[0] if "@" in stripped else ""
        require(len(ref) == 40 and all(c in "0123456789abcdef" for c in ref.lower()), f"GitHub Action must be pinned to a full commit SHA: {stripped}")


# GoreeCloud product help must not regress to upstream product documentation or intake.
forbidden_product_help = (
    "https://usememos.com/docs",
    "https://www.usememos.com/docs",
    "https://github.com/usememos/memos/issues/new",
)
for source_path in (ROOT / "web/src").rglob("*"):
    if not source_path.is_file() or source_path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
        continue
    source_text = source_path.read_text(encoding="utf-8")
    for forbidden in forbidden_product_help:
        require(forbidden not in source_text, f"product help must use GoreeCloud-owned destination: {source_path.relative_to(ROOT)} -> {forbidden}")

for forbidden in ("google-analytics.com", "googletagmanager.com", "facebook.com/tr", "fonts.googleapis.com"):
    require(forbidden not in theme, f"forbidden remote/analytics dependency in GoreeCloud theme: {forbidden}")

# The declared Privacy Shield telemetry-minimization capability covers the
# application source boundary, not third-party package metadata. Core runtime
# source must not introduce mandatory hosted analytics collectors.
for source_root in (ROOT / "web/src", ROOT / "server"):
    for source_path in source_root.rglob("*"):
        if not source_path.is_file() or source_path.suffix not in {".go", ".ts", ".tsx", ".js", ".jsx", ".html", ".css"}:
            continue
        source_text = source_path.read_text(encoding="utf-8")
        for forbidden in ("google-analytics.com", "googletagmanager.com", "segment.com", "plausible.io"):
            require(forbidden not in source_text, f"mandatory hosted analytics collector found in application source: {source_path.relative_to(ROOT)} -> {forbidden}")

if errors:
    print("\n".join(f"ERROR: {e}" for e in errors))
    sys.exit(1)

print("GoreeCloud Memos repository boundary validation passed.")
