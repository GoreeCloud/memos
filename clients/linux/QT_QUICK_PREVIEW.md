# GoreeCloud Memos — Qt Quick migration preview

**Status:** Independent development preview, not the Linux default, not a completed migration, not Stable.

The November 13, 2026 mandatory Linux framework standard requires all **existing** Linux graphical applications to use Qt Quick 6.12.0, Flutter Linux Desktop, or Slint, without grandfathering. This candidate is a controlled Qt Quick exploration while the current GTK4 client continues unchanged. It intentionally does **not** replace the default launcher, dependency installation, release packaging, or deployment.

## Source

- `qt_app.py`: Qt Quick/PySide6 6.12.0 application host; no token exposure to QML; async fetch and save with stale-search rejection; explicit per-draft create retry identity that survives uncertain failure and is reset after success or dismissal.
- `Memos.qml`: windowed-by-default original Qt Quick interface, independent masonry-like columns, keyboard-operable memo cards, search and edit/create dialog.
- `qt_api.py`: stdlib-only authenticated HTTP boundary, numeric loopback-only HTTP, HTTPS required elsewhere, disabled proxies and redirects, bounded responses and requests, restricted internal paths; validates and sends canonical UUIDv4 `Idempotency-Key` headers for memo creation only.
- `requirements-qt.txt`: exact Qt 6.12.0/PySide6 development dependency.
- `tests/test_qt_api.py` and `tests/test_qt_runtime.py`: disposable synthetic loopback transport, idempotency and real Qt event-loop/QML tests, no real credentials or external traffic.

UI semantic color candidates and 4/8/12/16/18/24 spacing/radius roles are derived from [GoreeCloud UI alpha tokens](https://github.com/GoreeCloud/gc-ui/blob/main/tokens/gc.tokens.json) at the inspected `5ea0b8f0b1d4c9f7c3593d58daeb1b75e6ec980e` blob. Those are provisional candidates, not a fully verified native UI SDK or accepted visual implementation.

## Development-only start

In an isolated environment with appropriate Linux display libraries, install the reviewed `requirements-qt.txt` and run:

```sh
GOREE_MEMOS_URL=http://127.0.0.1:8765 GOREE_MEMOS_TOKEN=your_existing_authorized_token python3 clients/linux/qt_app.py
```

Do not place real tokens in shell history; use an approved secret-injection method instead when testing real accounts. The command above is illustrative, not evidence of a running service. A valid token is at least 24 characters. Keep the server local or use verified HTTPS; the client never enables HTTP for a non-numeric-loopback address.

Run the isolated unit tests without installing Qt:

```sh
python3 -m unittest discover -s clients/linux/tests -p 'test_qt_api.py' -v
python3 -m compileall -q clients/linux/qt_api.py clients/linux/qt_app.py
```

## Verified headless Linux CI checkpoint — November 13, 2026

The [nonpublishing Qt Quick preview workflow](https://github.com/GoreeCloud/memos/actions/workflows/qt-quick-linux-preview.yml) now installs the official Qt/PySide6 6.12.0 wheel and required Linux EGL/OpenGL runtime libraries on a disposable Ubuntu runner. Its isolated QML smoke test loads `Memos.qml` into a real `QQmlApplicationEngine`, binds to the real `MemosBridge`, and verifies a visible **normal/windowed** startup without credentials or a service. The expanded ten synthetic API boundary tests run separately from three headless Qt runtime tests. At commit `f805764a72e117d2e8b08aaaaf528fe491f06dfc`, the Qt headless workflow, standard Memos CI and synthetic browser acceptance all passed. The additional synthetic runtime tests verify that unchanged create drafts reuse the same identity on uncertain failure, and success or explicit dismissal clears it. No private data or user-host package installation was involved.

## Create retry safety in the preview

A new memo uses the existing Memos API's server-validated UUIDv4 `Idempotency-Key` mechanism. After an uncertain transport failure, retrying the **unchanged** draft in the same open editor reuses its original key; successful save or explicit dismissal discards that identity. The server retains successful create-request associations for seven days, so this is **best-effort protection under the server's defined retention window**, not a guarantee against duplication after expiration, app termination or content changes. Keep an uncertain draft unchanged when retrying and verify server state if the outcome remains ambiguous. Existing notes still use version-checked PATCH requests.

The preview does not persist the retry key or memo body outside the editor session. Real-service retry/timeout acceptance has **not** yet been verified.

## Native desktop keyboard workflow (November 13 follow-on)

This draft adds **window-scoped** Qt Quick `StandardKey.New` and `StandardKey.Find` shortcuts using Qt 6.12's plural `sequences` property, so all OS-resolved standard bindings are registered. The New action opens the existing native editor; Find gives the search field keyboard focus and selects its contents. Both shortcuts are disabled while the modal editor is open or a save is pending, preventing a second editor/session from interrupting an in-flight write. Opening the editor gives its title field explicit popup focus. The QML runtime tests discover the real editable controls and exercise modal focus without tokens or a running server.

The shortcuts are functional enhancements to the **independent migration preview only**. They do not replace the GTK default, authorize access to private notes, or prove human keyboard/screen-reader acceptance or release readiness.

## Backend lifecycle and authorized laptop check — November 13, 2026

While extending the Qt preview on a personal Linux computer, the real Wayland QML event-loop tests initially emitted 22 null-backend binding warnings during QObject/engine teardown despite returning a passing test result. The preview now projects safe backend state through guarded QML properties and refuses further edit/search/save action when its injected Python backend becomes unavailable. An additional regression **explicitly removes the backend while bindings are active**, checks disabled controls, and rejects late QML warnings.

**Evidence:** an existing isolated virtual environment already containing reviewed PySide6/Qt **6.12.0** ran the five Qt runtime regressions under the **actual Zorin OS 18.1 GNOME Wayland session**, with empty/nonproduction credentials, no private memo service, no package installation, and **zero QML null-reference errors**. The GitHub Qt 6.12 headless QML, API boundary, standard Memos, and Chromium/Firefox synthetic browser checks passed **5/5** on code head `02effe29ff766e7f9aa889f881754366e737fd67`. This is automated runtime coverage on a real desktop session, **not** a human usability/visual review, screen-reader test, installed launcher check, production data or complete Wayland acceptance.

## Acceptance gaps

Headless QML startup and a focused automated Qt runtime smoke on GNOME Wayland are now verified. Actual GNOME/KDE multi-monitor, X11, manual keyboard/screen-reader, dark/high-contrast/reduced-motion native design, complete GTK/web feature parity, real service integration, desktop packaging and release/installation acceptance have **not** been verified. Existing Linux GTK app features/behavior must be compared before switching entrypoints. No release or installed product should be described as migrated merely because this experimental source exists. Track remaining work under [Linux migration issue #70](https://github.com/GoreeCloud/memos/issues/70).
