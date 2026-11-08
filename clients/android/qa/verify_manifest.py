"""Static Android source privacy gate for the local-only native Memos preview."""
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
manifest = ET.parse(ROOT / "app/src/main/AndroidManifest.xml").getroot()
ns = "{http://schemas.android.com/apk/res/android}"
application = manifest.find("application")
assert application is not None
assert application.get(ns + "allowBackup") == "false", "Backup must be opt-out"
assert application.get(ns + "usesCleartextTraffic") == "false", "Cleartext traffic disabled"
assert application.get(ns + "fullBackupContent") == "false", "Full backup must be disabled"
assert application.get(ns + "dataExtractionRules") == "@xml/local_data_extraction_rules"
rules = ET.parse(ROOT / "app/src/main/res/xml/local_data_extraction_rules.xml").getroot()
for mode in ("cloud-backup", "device-transfer"):
    entry = rules.find(mode)
    assert entry is not None, "Missing privacy rules for " + mode
    assert any(v.get("domain") == "root" and v.get("path") == "."
               for v in entry.findall("exclude")), "Root data exclusion missing"
assert rules.find("cross-platform-transfer") is None, "No iOS transfer opt-in permitted"
assert len(manifest.findall("uses-permission")) == 0, "No permissions allowed for local-only app"
components = [
    node for kind in ("activity", "service", "receiver", "provider")
    for node in application.findall(kind)
]
tools = "{http://schemas.android.com/tools}"
enabled = [node for node in components if node.get(tools + "node") != "remove"]
removed = [node for node in components if node.get(tools + "node") == "remove"]
assert len(enabled) == 1, "Only the native main activity may be enabled"
assert enabled[0].tag == "activity" and enabled[0].get(ns + "name") == ".MainActivity"
assert enabled[0].get(ns + "exported") == "true"
assert len(enabled[0].findall("intent-filter")) == 1
assert len(removed) == 1, "Require explicit removal of AndroidX profile broadcast receiver"
assert removed[0].tag == "receiver"
assert removed[0].get(ns + "name") == "androidx.profileinstaller.ProfileInstallReceiver"
app_gradle = (ROOT / "app/build.gradle.kts").read_text()
assert "com.goreecloud.memos" in app_gradle
source = (ROOT / "app/src/main/java/com/goreecloud/memos/MainActivity.kt").read_text()
assert "ComponentActivity" in source and "setContent" in source
assert "WebView(" not in source, "This preview must use native UI"
assert "LOCAL ONLY · NO BACKUP" in source, "Local no-backup disclosure must be persistent"
assert "Local notes have no backup" in source, "Local data-loss dialog missing"
assert 'if (it == "Local data & backups") showLocalDataInfo = true' in source, (
    "About-local-data menu action must open the disclosure dialog"
)

print("PASS: local Android Memos manifest and Compose source privacy contract")
