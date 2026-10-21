# GoreeCloud Memos — native Linux GTK4 foundation

**Development prototype only; NOT native-complete, production-ready, or a replacement for the current web client.**

This code creates a genuinely native GTK4 window with native text editing, sidebar navigation, responsive card flow, search, pin/private/archive and native memo creation. It does **not** contain WebView, Electron, an embedded browser, an HTTP server or a browser-opening launcher.

## Critical data and security boundary

All memo content is **synthetic demo data or temporary in-memory edits only**. No content, credentials, tokens, cookies, or private user files are written to disk or sent over the network. The label "Private" in this prototype is a local visual filter, **not an authenticated server visibility change**. Closing the app discards edits.

Do not use for real private notes or describe it as a working authenticated Memos client. No offline persistence, login, API integration, attachment picker, OS installer, update service or signing is implemented. These are tracked in [Native client issue #157](https://github.com/GoreeCloud/memos/issues/157).

## Build and test

Requires Linux, GTK4 development headers, GLib, GCC, Make, Xvfb for headless smoke. On Debian, dependencies normally include `libgtk-4-dev`, `build-essential`, `pkg-config`, `xvfb`.

```bash
cd native/linux-gtk4
make
make test
make smoke
./build/goreecloud-memos-native-linux
```

The native GTK4 UI must later be connected to the existing Memos API through an authenticated, tested client layer with secure local token storage and network failure handling; only then add real-data acceptance. The legacy browser-opening Debian preview remains at `packaging/linux/` and is unchanged.

## Next acceptance steps

1. API/client model contracts and safe authentication in a separate change.
2. Secure native persistent drafts and attachment/system picker.
3. Keyboard, screen reader, HiDPI, RTL, dark mode, and real desktop session acceptance.
4. Debian/Flatpak packaging, startup/stop, update and rollback and security review.
5. Connection to a synthetic Development instance before any real-user data access.


## API contract milestone (transport-independent)

The `api.c` / `api.h` module defines a **non-networked request-plan and
response-validation boundary** for a future authenticated native client:

- Only `https://` origins are accepted. Embedded credentials, non-root paths,
  query strings, fragments, whitespace, and unrecognized schemes are rejected.
- Access-token input is checked for header control characters, remains in process
  memory and is zeroed before replacement or removal. **This is not secure
  persistent credential storage**, and the module intentionally never writes a
  token to disk or constructs outbound authorization headers yet.
- Private memo listing requires a token and bounds page size to 100. Returned
  relative paths use percent-encoded opaque page tokens, fixed supported CEL
  filter expressions and `update_time desc`; no arbitrary CEL from untrusted
  input is executed.
- Response classification explicitly separates sign-in-required, forbidden,
  rate-limited, retryable, redirects/invalid response, and permanent errors.
  The response body limit is 4 MiB. JSON decoding is not implemented.

`make test` now runs the original three model tests **and six API-contract
tests**. The same tests run inside the approved GoreeCloud CI workflow.

**No actual HTTPS connection, cookies, token refresh, login, JSON decoding,
network retries, or durable draft storage has been implemented.** The GTK
prototype continues to use synthetic in-memory notes only, and server controls
have not been attached to its widgets. The next phase must use a tested native
TLS transport with certificate and redirect protections, bounded JSON parsing,
cancel/timeouts and isolated synthetic-server acceptance before connecting
real data.


## Native read-only memo response decoding (October 2026)

`response.c` and `response.h` implement a **transport-independent**
decoder for the protobuf-JSON `ListMemosResponse` returned by the
GoreeCloud Memos API. The decoder uses JSON-GLib and validates UTF-8, an
overall 4 MiB response limit, a maximum of 100 memo entries, bounded
per-memo content and resource identifiers, visibility values, pinned
boolean types, and opaque continuation tokens. The resulting objects are
owned by the caller and must be freed after use.

`make test` now includes five additional schema/limit tests alongside
the original native memo-model and request-plan tests. The existing
single GoreeCloud CI workflow installs `libjson-glib-dev` to run the
same suite.

**Important boundary:** This decoder neither connects to a server nor
authenticates, saves or renders remote memos. JSON text remains untrusted
input and is never interpreted as HTML. The native GTK4 app continues
to display temporary synthetic notes only. The HTTPS transport,
secure session handling and real-data integration remain separate
unimplemented requirements under GitHub issue #157.


## Synthetic protobuf-JSON demo adapter

The native GTK4 window now exercises the same bounded response decoder as the
future Memos transport. A **compiled, explicitly synthetic** six-memo page is
decoded via `gc_remote_memo_page_parse()` and atomically adapted to temporary
in-memory `GcMemoStore` models before GTK renders them as native labels.

- Invalid JSON, unsafe tokens, invalid resource names or malformed entries
  fail closed: the previous in-memory board is preserved without partial
  replacement.
- Pinned state, private-demo selection, tags and task text remain usable with
  existing native sidebar filtering and editing controls. An empty synthetic
  entry becomes a clearly labeled placeholder rather than disappearing.
- No filesystem reads/writes, HTTPS connections, cookies, access tokens,
  remote notes, or persisted metadata are involved.
- Untrusted content is rendered with native `gtk_label_set_text()`, not parsed
  as markup or HTML.
- `make test` now runs **18** unit tests: 3 model, 6 API contract,
  5 response schema and 4 atomic synthetic-adapter tests.

This is a **synthetic-only native integration checkpoint**, not an authenticated
server integration or native-complete release. Closing the native window still
discards all changes. The existing web and Android previews are unaffected.
