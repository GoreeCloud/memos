#!/usr/bin/env bash
# Tests a Debian package without installation or touching existing user notes.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG="${1:-$(find "$ROOT/out" -maxdepth 1 -name '*.deb' -type f | sort | tail -n 1)}"
[[ -f "$PKG" ]] || { echo "No Debian artifact: $PKG" >&2; exit 2; }
TMP="$(mktemp -d)"
PID=""
cleanup() {
  if [[ -n "$PID" ]]; then kill "$PID" 2>/dev/null || :; wait "$PID" 2>/dev/null || :; fi
  rm -rf "$TMP"
}
trap cleanup EXIT
dpkg-deb --contents "$PKG" >"$TMP/contents.txt"
grep -q 'usr/lib/goreecloud-memos/memos' "$TMP/contents.txt"
dpkg-deb --extract "$PKG" "$TMP/root"
BINARY="$TMP/root/usr/lib/goreecloud-memos/memos"
mkdir -m 0700 "$TMP/data"
# Use an unused high port; never connect to an existing service.
PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"
"$BINARY" --addr 127.0.0.1 --port "$PORT" --data "$TMP/data" \
  --trusted-proxies none --instance-url "http://127.0.0.1:$PORT" >"$TMP/server.log" 2>&1 &
PID=$!
READY=0
for attempt in $(seq 1 30); do
  if ! kill -0 "$PID" 2>/dev/null; then break; fi
  if curl -fsS --max-time 1 "http://127.0.0.1:$PORT/readyz" >/dev/null 2>&1; then READY=1; break; fi
  sleep 1
done
if [[ "$READY" -ne 1 ]]; then
  cat "$TMP/server.log" >&2
  exit 1
fi
HTTP="$(curl -sS -o "$TMP/index.html" -w '%{http_code}' "http://127.0.0.1:$PORT/")"
[[ "$HTTP" = "200" ]] || { echo "Expected HTTP 200, got $HTTP" >&2; exit 1; }
grep -q '<div id="root"' "$TMP/index.html" || { echo 'Embedded frontend missing' >&2; exit 1; }
echo "PASS: Debian package serves readyz and embedded frontend on loopback"
# Exercise a cold backup and restore using a disposable fixture; never touch user data.
python3 "$ROOT/persistence-smoke.py" "$PKG"
