#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [[ -z "$SDK" ]]; then echo 'Set ANDROID_SDK_ROOT' >&2; exit 2; fi
TOOLS="$SDK/build-tools/${ANDROID_BUILD_TOOLS_VERSION:-36.0.0}"
PLATFORM="$SDK/platforms/android-${ANDROID_COMPILE_API:-36}/android.jar"
for tool in aapt2 d8 zipalign apksigner; do
  if [[ ! -x "$TOOLS/$tool" ]]; then echo "Missing $TOOLS/$tool" >&2; exit 2; fi
done
if [[ ! -f "$PLATFORM" ]]; then echo "Missing $PLATFORM" >&2; exit 2; fi
: "${MEMOS_ANDROID_KEYSTORE:?Set MEMOS_ANDROID_KEYSTORE for a persistent development signing identity}"
: "${MEMOS_ANDROID_KEYSTORE_PASSWORD_FILE:?Set MEMOS_ANDROID_KEYSTORE_PASSWORD_FILE}"
: "${MEMOS_ANDROID_KEY_ALIAS:=memos-development}"
OUT="${MEMOS_ANDROID_OUTPUT:-$ROOT/out/GoreeCloud-Memos-Dev.apk}"
BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT
mkdir -p "$BUILD/classes" "$BUILD/dex" "$(dirname "$OUT")"
CODE="${MEMOS_ANDROID_VERSION_CODE:-$(date -u +%s)}"
"$TOOLS/aapt2" link -o "$BUILD/unsigned.apk" -I "$PLATFORM" \
    --manifest "$ROOT/AndroidManifest.xml" --min-sdk-version 26 --target-sdk-version 35 \
    --version-code "$CODE" --version-name "0.1.0-dev"
javac --release 11 -cp "$PLATFORM" -d "$BUILD/classes" \
    "$ROOT/src/com/goreecloud/memos/MainActivity.java"
mapfile -d '' CLASS_FILES < <(find "$BUILD/classes" -name '*.class' -print0)
"$TOOLS/d8" --min-api 26 --lib "$PLATFORM" --output "$BUILD/dex" "${CLASS_FILES[@]}"
(cd "$BUILD/dex" && zip -q -j "$BUILD/unsigned.apk" classes.dex)
"$TOOLS/zipalign" -f 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"
"$TOOLS/apksigner" sign --ks "$MEMOS_ANDROID_KEYSTORE" \
    --ks-key-alias "$MEMOS_ANDROID_KEY_ALIAS" \
    --ks-pass "file:$MEMOS_ANDROID_KEYSTORE_PASSWORD_FILE" \
    --out "$OUT" "$BUILD/aligned.apk"
"$TOOLS/apksigner" verify --verbose --print-certs "$OUT" | grep -E 'Verified|Number of signers|Signer #1 certificate SHA-256'
"$TOOLS/aapt2" dump badging "$OUT" | head -2
sha256sum "$OUT"
echo "APK: $OUT"
