"""Fail closed on sensitive permissions or unexpected exported components in APK.

This checks the MERGED/PACKAGED AndroidManifest.xml, not just source XML.
Run only against the locally built, unreleased GoreeCloud Memos debug APK.
"""
from pathlib import Path
import os
import re
import shutil
import subprocess
import sys

apk = Path(sys.argv[1]) if len(sys.argv) > 1 else (
    Path(__file__).resolve().parents[1] /
    "app/build/outputs/apk/debug/app-debug.apk"
)
if not apk.is_file() or not apk.stat().st_size:
    raise SystemExit("Debug APK is missing or empty")
sdk = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT") or ""
aapt = shutil.which("aapt") or str(Path(sdk) / "build-tools/36.0.0/aapt")
if not Path(aapt).is_file():
    raise SystemExit("Android build-tools 36.0.0 aapt is required")

def dump(*args):
    return subprocess.check_output([aapt, "dump", *args, str(apk)],
                                   text=True, stderr=subprocess.STDOUT)

xml = dump("xmltree", "AndroidManifest.xml")
badging = dump("badging")
if "package: name='com.goreecloud.memos'" not in badging:
    raise SystemExit("Unexpected package name")
if "sdkVersion:'26'" not in badging or "targetSdkVersion:'36'" not in badging:
    raise SystemExit("Unexpected Android API range")

lines = xml.splitlines()
def children(index):
    indent = len(lines[index]) - len(lines[index].lstrip())
    output = []
    for line in lines[index + 1:]:
        depth = len(line) - len(line.lstrip())
        if depth <= indent:
            break
        output.append(line)
    return "\n".join(output)

def attrs_for(name):
    return [children(i) for i, line in enumerate(lines)
            if re.search(r"^\s*E: " + re.escape(name) + r" \(line=", line)]

components = []
for kind in ("activity", "activity-alias", "service", "receiver", "provider"):
    for attributes in attrs_for(kind):
        match = re.search(r'android:name.*?="([^"]+)"', attributes)
        if match:
            exported = re.search(r'android:exported.*?0x([0-9a-f]+)', attributes)
            components.append((kind, match.group(1),
                               bool(int(exported.group(1), 16)) if exported else False))

allowed_component = ("activity", "com.goreecloud.memos.MainActivity", True)
if allowed_component not in components:
    raise SystemExit("Native MAIN/LAUNCHER activity missing")
other_exported = [x for x in components if x[2] and x != allowed_component]
if other_exported:
    raise SystemExit("Unexpected exported Android components: " + str(other_exported))
if sum(x == allowed_component for x in components) != 1:
    raise SystemExit("Native launcher activity duplicated")

source_package = "com.goreecloud.memos"
allowed_permission = source_package + ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"
requested = []
for entry in attrs_for("uses-permission"):
    found = re.search(r'android:name.*?="([^"]+)"', entry)
    if found:
        requested.append(found.group(1))
if any(x != allowed_permission for x in requested):
    raise SystemExit("Unexpected merged APK permission(s): " + repr(requested))
if allowed_permission in requested:
    declaration = [x for x in attrs_for("permission") if allowed_permission in x]
    if len(declaration) != 1 or not re.search(
            r"android:protectionLevel.*0x2\b", declaration[0]):
        raise SystemExit("AndroidX internal receiver permission is not signature-level")

app = attrs_for("application")
if len(app) != 1:
    raise SystemExit("Expected exactly one application element")
for attribute in ("allowBackup", "fullBackupContent", "usesCleartextTraffic"):
    if not re.search(r"android:" + attribute + r".*0x0\b", app[0]):
        raise SystemExit("Unsafe merged application flag: " + attribute)
if "android:dataExtractionRules" not in app[0]:
    raise SystemExit("Missing Android 12+ extraction rules")

print("PASS: APK package/API, signed-internal permission, zero unexpected "
      "exported components, backup/transfer and cleartext safeguards")
