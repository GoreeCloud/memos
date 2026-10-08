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
    "docs/IMPLEMENTED-FEATURES.md",
    "docs/PLANNED-FEATURES.md",
    "docs/SECURITY.md",
    "docs/PRIVACY.md",
    "docs/BACKUP-AND-RECOVERY.md",
    "docs/GLAZE-ADOPTION.md",
    "docs/UPSTREAM.md",
    "docs/VALIDATION.md",
    "provenance/upstream.json",
    "provenance/glaze.json",
    "provenance/branding.json",
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
for line in workflow_text.splitlines():
    stripped = line.strip()
    if stripped.startswith("uses:"):
        ref = stripped.split("@", 1)[1].split()[0] if "@" in stripped else ""
        require(len(ref) == 40 and all(c in "0123456789abcdef" for c in ref.lower()), f"GitHub Action must be pinned to a full commit SHA: {stripped}")

for forbidden in ("google-analytics.com", "googletagmanager.com", "facebook.com/tr", "fonts.googleapis.com"):
    require(forbidden not in theme, f"forbidden remote/analytics dependency in GoreeCloud theme: {forbidden}")

if errors:
    print("\n".join(f"ERROR: {e}" for e in errors))
    sys.exit(1)

print("GoreeCloud Memos repository boundary validation passed.")
