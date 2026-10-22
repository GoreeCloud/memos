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
depends="$(dpkg-deb -f "$a" Depends)"
for spec in 'libgtk-4-1:4.10' 'libglib2.0-0:2.72' 'libjson-glib-1.0-0:1.6'; do
  family="${spec%%:*}"
  floor="${spec#*:}"
  clause="$(printf '%s\n' "$depends" | tr ',' '\n' | grep -E "^ *${family}(t64)? \(>= [^)]+\) *$" || true)"
  test -n "$clause" || { echo "Missing dependency: $family" >&2; exit 1; }
  version="${clause#*>= }"
  version="${version%%\)*}"
  dpkg --compare-versions "$version" ge "$floor" || {
    echo "Native package under-declares $family $floor baseline" >&2
    exit 1
  }
done
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
# This symbol first became available in GTK 4.12, but this package
# supports the older GTK 4.10 ABI. Fail closed on accidental regression.
if nm -D "$exe" | grep -Fq 'gtk_css_provider_load_from_string'; then
  echo 'GTK4 preview requires an unsupported GTK >=4.12-only symbol' >&2
  exit 1
fi
desktop="$scratch/root/usr/share/applications/com.goreecloud.memos.NativeLinuxPreview.desktop"
desktop-file-validate "$desktop"
grep -Fxq 'Terminal=false' "$desktop"
grep -Fxq 'Exec=goreecloud-memos-native-linux' "$desktop"
grep -Fq 'synthetic' "$scratch/root/usr/share/doc/goreecloud-memos-native-preview/README.md"
grep -Fq 'MIT License' "$scratch/root/usr/share/doc/goreecloud-memos-native-preview/copyright"
# Enforce the current Ubuntu 22.04 / GTK 4.10 baseline for *CI-built* ELF,
# even when CI compiles it with newer GTK headers.
depends="$(dpkg-deb -f "$a" Depends)"
for spec in "libc6 2.35.999" "libglib2.0-0 2.72.999" \
            "libgtk-4-1 4.10.999" "libjson-glib-1.0-0 1.6.999"; do
  package="${spec%% *}"
  ceiling="${spec#* }"
  required="$(printf '%s\n' "$depends" |
     awk -v pkg="$package" -F ', ' '{
       for (i=1;i<=NF;i++) {
         split($i,v," ");
         if (v[1]==pkg) {
           gsub(/[()]/,"",v[3]); print v[3]
         }
       }
     }')"
  if test -z "$required" || ! dpkg --compare-versions "$required" le "$ceiling"; then
    echo "Compiled native ABI exceeds $package baseline ($required > $ceiling)" >&2
    exit 1
  fi
done
if objdump -T "$exe" | grep -q 'gtk_css_provider_load_from_string'; then
  echo "GTK newer-only CSS API must not be linked into GTK4 4.10 preview" >&2
  exit 1
fi
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
