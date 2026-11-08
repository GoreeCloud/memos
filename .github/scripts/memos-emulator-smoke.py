#!/usr/bin/env python3
"""Isolated GoreeCloud Memos Android emulator acceptance using synthetic content.

This script may install and interact with a package ONLY in a single verified
GitHub Actions QEMU emulator. It refuses physical, wireless or ambiguous ADB
targets before any state-changing ADB operation.
"""
import os
from pathlib import Path
import re
import shutil
import struct
import subprocess
import time
import xml.etree.ElementTree as ET

SERIAL = "emulator-5554"
PACKAGE = "com.goreecloud.memos"
FAKE_MEMO = "GoreeCloudSyntheticSmokeMemo42"
OUT = Path("android-emulator-qa")
APK = Path("clients/android/app/build/outputs/apk/debug/app-debug.apk")
TEST_APK = Path("clients/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk")

if (os.environ.get("GITHUB_ACTIONS") != "true" or
        os.environ.get("CI") != "true" or
        os.environ.get("GOREEMEMOS_EMULATOR_QA") != "1"):
    raise SystemExit("Refusing emulator mutation outside explicit GitHub Actions QA")
if not APK.is_file():
    raise SystemExit("Compiled disposable APK is absent")
OUT.mkdir(exist_ok=True)
ADB = shutil.which("adb") or str(Path(os.environ["ANDROID_HOME"]) / "platform-tools/adb")
if not Path(ADB).is_file():
    raise SystemExit("ADB binary not found")

def command(*args, timeout=45, binary=False):
    result = subprocess.run([ADB, "-s", SERIAL, *args],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout,
        check=False)
    if result.returncode:
        raise RuntimeError(f"ADB {args[:3]} failed ({result.returncode}): " +
                           result.stderr.decode(errors="replace")[-420:])
    return result.stdout if binary else result.stdout.decode(errors="replace").strip()

def ensure_only_emulator():
    devices = subprocess.check_output([ADB, "devices", "-l"], text=True, timeout=15)
    online = [row.split()[0] for row in devices.splitlines()[1:]
              if len(row.split()) > 1 and row.split()[1] == "device"]
    if online != [SERIAL]:
        raise SystemExit("BLOCK: Online ADB targets not exactly one emulator: " + str(online))
    qemu = command("shell", "getprop", "ro.kernel.qemu").strip()
    if qemu != "1":
        raise SystemExit("BLOCK: ADB target is not attested as Android emulator")

# Never mutate a USB phone or any other connected ADB target.
preconnected = subprocess.check_output([ADB, "devices", "-l"], text=True, timeout=15)
previous = [r.split()[0] for r in preconnected.splitlines()[1:]
            if len(r.split()) > 1 and r.split()[1] == "device"]
if any(d != SERIAL for d in previous):
    raise SystemExit("BLOCK: Detected non-emulator ADB device before test")
subprocess.run([ADB, "-s", SERIAL, "wait-for-device"],
               check=True, timeout=360, stdout=subprocess.PIPE)
ensure_only_emulator()
booted = False
for _ in range(180):
    if command("shell", "getprop", "sys.boot_completed") == "1":
        booted = True
        break
    time.sleep(2)
if not booted:
    raise SystemExit("Emulator boot did not complete in time")

def screenshot(name, expected):
    data = command("exec-out", "screencap", "-p", binary=True, timeout=35)
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise AssertionError("Screenshot is not PNG")
    size = struct.unpack(">II", data[16:24])
    if size != expected:
        raise AssertionError(f"Unexpected screenshot size {size}, wanted {expected}")
    (OUT / name).write_bytes(data)
    print(f"PASS screenshot {name} {size}")

def ui_nodes(name):
    # UIAutomator can be temporarily busy during a Compose recomposition.
    for attempt in range(5):
        try:
            command("shell", "uiautomator", "dump", "/sdcard/window-goreecloud.xml",
                    timeout=45)
            xml = command("exec-out", "cat", "/sdcard/window-goreecloud.xml",
                          binary=True, timeout=25)
            root = ET.fromstring(xml)
            (OUT / name).write_bytes(xml)
            return root.findall(".//node")
        except (RuntimeError, ET.ParseError):
            if attempt == 4:
                raise
            time.sleep(2)
    raise AssertionError("UI hierarchy never became available")

def readable(node):
    return " ".join([node.get("text", ""), node.get("content-desc", "")])

def find(nodes, fragment):
    matches = [n for n in nodes if fragment in readable(n)]
    return matches[0] if matches else None

def wait_visible(fragment, seconds=35):
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        nodes = ui_nodes("latest-window.xml")
        matched = find(nodes, fragment)
        if matched is not None:
            print("PASS visible UI element:", fragment)
            return matched
        time.sleep(2)
    raise AssertionError(f"Missing visible UI element: {fragment}")

def tap(fragment):
    found = wait_visible(fragment)
    bound = found.get("bounds", "")
    point = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bound)
    if not point:
        raise AssertionError(f"UI target has no usable bounds: {fragment}")
    x1, y1, x2, y2 = map(int, point.groups())
    if x2 <= x1 or y2 <= y1:
        raise AssertionError(f"Invalid bounds for {fragment}: {bound}")
    command("shell", "input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))
    time.sleep(1)

def start_and_check():
    started = command("shell", "am", "start", "-n", PACKAGE + "/.MainActivity")
    if "Error" in started or "Exception" in started:
        raise AssertionError("Activity launch rejected: " + started)
    wait_visible("GoreeCloud Memos")
    wait_visible("LOCAL ONLY")
    wait_visible("NO BACKUP")
    if not command("shell", "pidof", PACKAGE):
        raise AssertionError("Memos app process exited unexpectedly")

# A fresh disposable AVD and one debug package only.
command("shell", "wm", "size", "390x844")
command("shell", "wm", "density", "160")
if "package:" + PACKAGE in command("shell", "pm", "list", "packages", "-3"):
    raise SystemExit("BLOCK: Memos already installed in supposedly fresh AVD")
command("install", "-r", str(APK), timeout=120)
if not TEST_APK.is_file():
    raise SystemExit("Compiled Android instrumented test APK is missing")
command("install", "-r", str(TEST_APK), timeout=120)
# Only a freshly attested disposable QEMU target reaches this destructive
# synthetic-DB test. Never run this against a real phone or existing notes.
ensure_only_emulator()
test_result = command(
    "shell", "am", "instrument", "-w", "-r",
    PACKAGE + ".test/androidx.test.runner.AndroidJUnitRunner",
    timeout=260
)
(OUT / "sqlite-instrumentation.txt").write_text(test_result + "\n", encoding="utf-8")
if "OK (6 tests)" not in test_result or "FAILURES!!!" in test_result:
    raise AssertionError("Native SQLite instrumented tests did not all pass: " +
                         test_result[-1200:])
print("PASS: six on-device SQLite history, stale-edit, duplicate and trash tests")
start_and_check()
screenshot("phone-empty-390.png", (390, 844))
tap("More")
tap("Local data & backups")
wait_visible("Local notes have no backup")
screenshot("phone-local-data-warning-390.png", (390, 844))
tap("Got it")

# Functional local persistence smoke with a deliberately fictional memo.
tap("Take a memo")
command("shell", "input", "text", FAKE_MEMO)
command("shell", "input", "keyevent", "KEYCODE_BACK")
tap("Save")
wait_visible(FAKE_MEMO, seconds=50)
screenshot("phone-saved-390.png", (390, 844))
command("shell", "am", "force-stop", PACKAGE)
start_and_check()
wait_visible(FAKE_MEMO)
print("PASS local memo survived a force-stop and relaunch")

# Validate an expanded/tablet-width Compose layout on the same disposable AVD.
command("shell", "wm", "size", "900x1280")
command("shell", "wm", "density", "160")
command("shell", "am", "force-stop", PACKAGE)
start_and_check()
wait_visible("All Notes")
wait_visible(FAKE_MEMO)
screenshot("tablet-saved-900.png", (900, 1280))
command("shell", "wm", "size", "reset")
command("shell", "wm", "density", "reset")
print("PASS: native UI, disclosure, quick memo persistence and tablet layout on isolated emulator")
