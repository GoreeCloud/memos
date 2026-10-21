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
