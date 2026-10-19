#!/usr/bin/env bash
# Tests a Debian package without installation or touching existing user notes.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG="${1:-$(find "$ROOT/out" -maxdepth 1 -name '*.deb' -type f | sort | tail -n 1)}"
[[ -f "$PKG" ]] || { echo "No Debian artifact: $PKG" >&2; exit 2; }
# Exercise launcher intent/isolation before starting a throwaway package.
bash "$ROOT/launcher-test.sh"
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
LAUNCHER="$TMP/root/usr/bin/goreecloud-memos-desktop"
# Validate the actual packaged launcher, not only the source script, with an
# isolated browser stub. No installed binary, network, or user profile is read.
test -x "$LAUNCHER"
mkdir -p "$TMP/launcher-bin" "$TMP/launcher-data"
cat >"$TMP/launcher-bin/xdg-open" <<'EOF'
#!/bin/sh
printf '%s\n' "$1" >>"$GC_MEMOS_TEST_OPEN_LOG"
EOF
cat >"$TMP/launcher-bin/curl" <<'EOF'
#!/bin/sh
exit 1
EOF
chmod 700 "$TMP/launcher-bin/xdg-open" "$TMP/launcher-bin/curl"
(
  export PATH="$TMP/launcher-bin:$PATH"
  export GC_MEMOS_TEST_OPEN_LOG="$TMP/launcher-opened"
  export XDG_DATA_HOME="$TMP/launcher-data"
  "$LAUNCHER" --connect https://memos.example.invalid >"$TMP/launcher-connect.log" 2>&1
  grep -Fxq 'https://memos.example.invalid/' "$GC_MEMOS_TEST_OPEN_LOG"
  grep -q 'could not be reached' "$TMP/launcher-connect.log"
  # The desktop entry runs a terminal. Exercise its actual interactive chooser
  # through a temporary PTY, including the loopback-existing-instance choice.
  printf '1\nhttp://127.0.0.1:18423\n' | script -qec "$LAUNCHER" /dev/null >"$TMP/launcher-interactive.log"
  grep -q 'Connect to an existing Memos server' "$TMP/launcher-interactive.log"
  grep -Fxq 'http://127.0.0.1:18423/' "$GC_MEMOS_TEST_OPEN_LOG"
  test ! -e "$XDG_DATA_HOME/goreecloud-memos-desktop"
)
echo "PASS: extracted Debian launcher, interactive existing-server choice and offline feedback"
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
