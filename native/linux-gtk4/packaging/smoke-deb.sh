#!/usr/bin/env bash
# Test the actual Debian archive without installing it system-wide.
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
NATIVE="$(cd -- "$HERE/.." && pwd)"
scratch="$(mktemp -d)"
trap 'rm -rf -- "$scratch"' EXIT
bash "$HERE/build-deb.sh" "$scratch/a" >/dev/null
bash "$HERE/build-deb.sh" "$scratch/b" >/dev/null
arch="$(dpkg --print-architecture)"
filename="goreecloud-memos-native-preview_0.1.0~dev20261021-1_${arch}.deb"
a="$scratch/a/$filename"
b="$scratch/b/$filename"
cmp -s "$a" "$b" || { echo 'Non-reproducible native Debian archives' >&2; exit 1; }
test "$(dpkg-deb -f "$a" Package)" = goreecloud-memos-native-preview
test "$(dpkg-deb -f "$a" Architecture)" = "$arch"
dpkg-deb --contents "$a" > "$scratch/contents.txt"
head -1 "$scratch/contents.txt" | grep -q '^drwxr-xr-x'
if grep -Eq '(postinst|preinst|prerm|postrm)' "$scratch/contents.txt"; then
  echo "Unexpected installation lifecycle script" >&2
  exit 1
fi
mkdir "$scratch/root" "$scratch/control"
dpkg-deb --extract "$a" "$scratch/root"
dpkg-deb --control "$a" "$scratch/control"
test -f "$scratch/control/control"
test "$(find "$scratch/control" -type f | wc -l)" -eq 1
exe="$scratch/root/usr/bin/goreecloud-memos-native-linux"
test -x "$exe"
desktop="$scratch/root/usr/share/applications/com.goreecloud.memos.NativeLinuxPreview.desktop"
desktop-file-validate "$desktop"
grep -Fxq 'Terminal=false' "$desktop"
grep -Fxq 'Exec=goreecloud-memos-native-linux' "$desktop"
grep -Fq 'synthetic' "$scratch/root/usr/share/doc/goreecloud-memos-native-preview/README.md"
grep -Fq 'MIT License' "$scratch/root/usr/share/doc/goreecloud-memos-native-preview/copyright"
if ldd "$exe" | grep -q 'not found'; then
  echo 'Missing native runtime dependency' >&2
  exit 1
fi
# Application remains alive without browser or user data; timeout 124 is expected.
set +e
GDK_BACKEND=x11 GSK_RENDERER=cairo timeout 6 xvfb-run -a "$exe" >"$scratch/stdout" 2>"$scratch/stderr"
code=$?
set -e
if test "$code" -ne 124; then
  echo "Extracted native GTK4 launch failed with exit $code" >&2
  cat "$scratch/stderr" >&2
  exit 1
fi
echo "Native .deb reproducible; metadata, file modes and extracted GTK4 runtime passed"
sha256sum "$a"
