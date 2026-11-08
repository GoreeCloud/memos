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
assert len(manifest.findall("uses-permission")) == 0, "No permissions allowed for local-only app"
components = [
    node for kind in ("activity", "service", "receiver", "provider")
    for node in application.findall(kind)
]
assert len(components) == 1, "Only the native main activity is permitted"
assert components[0].get(ns + "name") == ".MainActivity"
assert components[0].get(ns + "exported") == "true"
assert len(components[0].findall("intent-filter")) == 1
app_gradle = (ROOT / "app/build.gradle.kts").read_text()
assert "com.goreecloud.memos" in app_gradle
source = (ROOT / "app/src/main/java/com/goreecloud/memos/MainActivity.kt").read_text()
assert "ComponentActivity" in source and "setContent" in source
assert "WebView(" not in source, "This preview must use native UI"
print("PASS: local Android Memos manifest and Compose source privacy contract")
