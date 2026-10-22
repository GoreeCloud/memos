#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT="${MEMOS_LINUX_OUTPUT:-$REPO/packaging/linux/out}"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
if [[ "$(go env GOOS)" != linux || "$(go env GOARCH)" != amd64 ]]; then
  echo "Current builder must be linux/amd64" >&2; exit 2
fi
if grep -q 'No embeddable frontend found' "$REPO/server/frontend/dist/index.html"; then
  echo 'Frontend placeholder detected; run cd web && pnpm release before packaging.' >&2
  exit 2
fi
if [[ ! -d "$REPO/server/frontend/dist/assets" ]]; then
  echo 'Frontend production assets are missing.' >&2; exit 2
fi
VERSION="${MEMOS_LINUX_VERSION:-0.1.0~dev20261019}"
PKG="goreecloud-memos-desktop_${VERSION}_amd64"
DEST="$STAGE/$PKG"
mkdir -p "$DEST/DEBIAN" "$DEST/usr/lib/goreecloud-memos" \
  "$DEST/usr/bin" "$DEST/usr/share/applications" \
  "$DEST/usr/share/doc/goreecloud-memos-desktop" "$OUT"
(cd "$REPO" && CGO_ENABLED=1 go build -trimpath \
  -ldflags "-s -w" -o "$DEST/usr/lib/goreecloud-memos/memos" ./cmd/memos)
install -m 0755 "$SCRIPT_DIR/goreecloud-memos-desktop" "$DEST/usr/bin/goreecloud-memos-desktop"
install -m 0644 "$SCRIPT_DIR/goreecloud-memos.desktop" "$DEST/usr/share/applications/goreecloud-memos.desktop"
install -m 0644 "$REPO/LICENSE" "$DEST/usr/share/doc/goreecloud-memos-desktop/copyright"
cat > "$DEST/DEBIAN/control" <<EOF
Package: goreecloud-memos-desktop
Version: $VERSION
Architecture: amd64
Maintainer: GoreeCloud <admin@goreecloud.com>
Section: utils
Priority: optional
Depends: libc6, bash, curl, xdg-utils, python3, util-linux
Description: GoreeCloud Memos local desktop preview
 Local-only Memos Go server with a browser-based desktop interface.
 Development package; does not replace an existing server installation.
EOF
dpkg-deb --build --root-owner-group "$DEST" "$OUT/$PKG.deb"
dpkg-deb --info "$OUT/$PKG.deb" | head -25
sha256sum "$OUT/$PKG.deb"
echo "DEB: $OUT/$PKG.deb"
