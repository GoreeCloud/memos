#!/usr/bin/env bash
# Exercises launcher mode boundaries without installing packages or reading notes.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
LAUNCHER="$ROOT/goreecloud-memos-desktop"
TMP="$(mktemp -d)"
HOLDER=""
cleanup() {
  if [[ -n "$HOLDER" ]]; then kill "$HOLDER" 2>/dev/null || :; wait "$HOLDER" 2>/dev/null || :; fi
  rm -rf "$TMP"
}
trap cleanup EXIT
mkdir -p "$TMP/bin"
cat >"$TMP/bin/xdg-open" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$1" >> "$GC_TEST_OPEN_LOG"
EOF
cat >"$TMP/bin/curl" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$TMP/bin/"*
export PATH="$TMP/bin:$PATH"
export XDG_DATA_HOME="$TMP/data"
export GC_TEST_OPEN_LOG="$TMP/opened"
touch "$GC_TEST_OPEN_LOG"

"$LAUNCHER" --help >"$TMP/help"
grep -q -- '--connect URL' "$TMP/help"
test ! -e "$XDG_DATA_HOME"

"$LAUNCHER" --connect https://notes.example.com/ >"$TMP/connect"
grep -Fxq 'https://notes.example.com/' "$GC_TEST_OPEN_LOG"
"$LAUNCHER" --connect http://127.0.0.1:18423/ >/dev/null
grep -Fxq 'http://127.0.0.1:18423/' "$GC_TEST_OPEN_LOG"
test ! -e "$XDG_DATA_HOME"

for address in \
  'http://notes.example.com/' \
  'https://user:password@notes.example.com/' \
  'https://notes.example.com/auth/signup' \
  'https://notes.example.com/?token=oops' \
  'https://notes.example.com/#fragment' \
  'https://notes.example.com:99999/' \
  'https://notes.example.com\@evil.test/' \
  'file:///etc/passwd'; do
  if "$LAUNCHER" --connect "$address" >"$TMP/invalid.out" 2>"$TMP/invalid.err"; then
    echo "Unexpectedly accepted invalid URL: $address" >&2
    exit 1
  fi
  grep -q "Invalid server URL" "$TMP/invalid.err"
done
test "$(wc -l <"$GC_TEST_OPEN_LOG")" -eq 2
test ! -e "$XDG_DATA_HOME"

if "$LAUNCHER" </dev/null >"$TMP/no-mode.out" 2>"$TMP/no-mode.err"; then
  echo "Non-interactive mode unexpectedly started a local instance" >&2
  exit 1
fi
grep -q 'Choose --connect URL or --local' "$TMP/no-mode.err"
test ! -e "$XDG_DATA_HOME"

if GOREECLOUD_MEMOS_DESKTOP_PORT=80 "$LAUNCHER" --local >"$TMP/port.out" 2>"$TMP/port.err"; then
  echo "Privileged port unexpectedly accepted" >&2
  exit 1
fi
grep -q 'Invalid local-only port' "$TMP/port.err"
test ! -e "$XDG_DATA_HOME"

# Test the second-server guard on synthetic launcher data only; no real
# database and no installed Memos process are involved.
mkdir -p "$XDG_DATA_HOME/goreecloud-memos-desktop"
export GC_TEST_LOCK_READY="$TMP/lock-ready"
flock "$XDG_DATA_HOME/goreecloud-memos-desktop/.launcher.lock" -c 'touch "$GC_TEST_LOCK_READY"; sleep 8' &
HOLDER=$!
for attempt in $(seq 1 40); do
  [[ -e "$GC_TEST_LOCK_READY" ]] && break
  sleep 0.05
done
[[ -e "$GC_TEST_LOCK_READY" ]] || { echo "Could not acquire synthetic profile lock" >&2; exit 1; }
PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
if GOREECLOUD_MEMOS_DESKTOP_PORT="$PORT" "$LAUNCHER" --local >"$TMP/locked.out" 2>"$TMP/locked.err"; then
  echo "Second launcher unexpectedly started on locked profile" >&2
  exit 1
fi
grep -q 'already running' "$TMP/locked.err"
kill "$HOLDER" 2>/dev/null || :
wait "$HOLDER" 2>/dev/null || :
HOLDER=""
# A preexisting lock symlink must neither be followed nor truncate its target.
LOCK="$XDG_DATA_HOME/goreecloud-memos-desktop/.launcher.lock"
rm -f "$LOCK"
printf 'keep this synthetic data intact\n' >"$TMP/lock-sentinel"
ln -s "$TMP/lock-sentinel" "$LOCK"
if GOREECLOUD_MEMOS_DESKTOP_PORT="$PORT" "$LAUNCHER" --local >"$TMP/symlink.out" 2>"$TMP/symlink.err"; then
  echo "Symlinked profile lock unexpectedly accepted" >&2
  exit 1
fi
grep -q 'Unsafe local profile lock file' "$TMP/symlink.err"
grep -Fxq 'keep this synthetic data intact' "$TMP/lock-sentinel"
rm -f "$LOCK"
echo "PASS: launcher sign-in/local isolation, URL validation and profile lock"
