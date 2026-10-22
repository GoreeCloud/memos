#!/usr/bin/env bash
# Build a separate native GTK4 synthetic-only Development-preview package.
# It never touches the legacy browser-based GoreeCloud Memos Debian packaging.
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
NATIVE="$(cd -- "$HERE/.." && pwd)"
REPO="$(cd -- "$NATIVE/../.." && pwd)"
VERSION="0.1.0~dev20261021-3"
ARCH="$(dpkg --print-architecture)"
NAME="goreecloud-memos-native-preview"
OUT="${1:-$NATIVE/dist}"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
make -C "$NATIVE" all
desktop-file-validate "$HERE/goreecloud-memos-native-preview.desktop"
stage="$(mktemp -d)"
depscan="$(mktemp -d)"
trap 'rm -rf -- "$stage" "$depscan"' EXIT
# dpkg must never propagate mktemp's restrictive 0700 root-directory mode.
chmod 0755 "$stage"
install -d -m 0755 "$stage/DEBIAN" "$stage/usr/bin"   "$stage/usr/share/applications" "$stage/usr/share/doc/$NAME"
install -m 0755 "$NATIVE/build/goreecloud-memos-native-linux"   "$stage/usr/bin/goreecloud-memos-native-linux"
install -m 0644 "$HERE/goreecloud-memos-native-preview.desktop"   "$stage/usr/share/applications/com.goreecloud.memos.NativeLinuxPreview.desktop"
install -m 0644 "$NATIVE/README.md" "$stage/usr/share/doc/$NAME/README.md"
install -m 0644 "$REPO/LICENSE" "$stage/usr/share/doc/$NAME/copyright"
# Derive dependencies from the ELF's actual ABI symbol requirements.
# A CI-built newer GTK executable may require newer GTK than a local build.
mkdir -p "$depscan/debian"
cat > "$depscan/debian/control" <<EOF
Source: $NAME
Section: office
Priority: optional
Maintainer: GoreeCloud <goreecloud@gmail.com>
Standards-Version: 4.6.0

Package: $NAME
Architecture: any
Description: Native preview dependency scan
EOF
dependency_field="$(cd "$depscan" && dpkg-shlibdeps -O "$stage/usr/bin/goreecloud-memos-native-linux")"
case "$dependency_field" in
  'shlibs:Depends='?*) dependencies="${dependency_field#shlibs:Depends=}" ;;
  *) echo 'Missing native ABI dependency information' >&2; exit 1 ;;
esac
# Do not under-declare the documented tested baseline even when shlibs
# provides a lower symbol-version floor (e.g. GTK >= 4.9.4).
for floor_spec in 'libgtk-4-1:4.10' 'libglib2.0-0:2.72' 'libjson-glib-1.0-0:1.6'; do
  family="${floor_spec%%:*}"
  floor="${floor_spec#*:}"
  # Ubuntu 24.04 uses t64-suffixed package names for some libraries.
  clause="$(printf '%s\n' "$dependencies" | tr ',' '\n' | grep -E "^ *${family}(t64)? \(>= [^)]+\) *$" || true)"
  if test -z "$clause"; then
    echo "Missing required native runtime library dependency: $family" >&2
    exit 1
  fi
  library="${clause%% (*}"
  library="${library## }"
  current="${clause#*>= }"
  current="${current%%\)*}"
  if dpkg --compare-versions "$current" lt "$floor"; then
    dependencies="${dependencies/$library (>= $current)/$library (>= $floor)}"
  fi
done
# No maintainer scripts, HOME writes, persistent data, or secrets.
cat > "$stage/DEBIAN/control" <<EOF
Package: $NAME
Version: $VERSION
Section: office
Priority: optional
Architecture: $ARCH
Maintainer: GoreeCloud <goreecloud@gmail.com>
Depends: $dependencies
Description: GoreeCloud Memos native GTK4 synthetic Development preview
 Genuine native Linux GTK4 application, not a WebView or browser wrapper.
 All notes are temporary synthetic examples. No authentication, disk
 persistence, remote synchronization, or production readiness is provided.
EOF
# Fixed timestamp and root ownership make repeat archives comparable.
epoch="${SOURCE_DATE_EPOCH:-1792540800}"
case "$epoch" in ''|*[!0-9]*) echo 'Invalid SOURCE_DATE_EPOCH' >&2; exit 2;; esac
# dpkg-deb must see it too, or ar-member headers retain wall-clock timestamps.
export SOURCE_DATE_EPOCH="$epoch"
find "$stage" -print0 | xargs -0 -r touch -h -d "@$epoch"
package="$OUT/${NAME}_${VERSION}_${ARCH}.deb"
dpkg-deb --root-owner-group --build -Zgzip -z9 "$stage" "$package"
dpkg-deb -f "$package" Package Version Architecture Depends
echo "PREVIEW_DEB=$package"
sha256sum "$package"
