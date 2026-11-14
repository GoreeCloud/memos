# GoreeCloud Memos — Qt Quick migration preview

**Status:** Independent development preview, not the Linux default, not a completed migration, not Stable.

The November 13, 2026 mandatory Linux framework standard requires all **existing** Linux graphical applications to use Qt Quick 6.12.0, Flutter Linux Desktop, or Slint, without grandfathering. This candidate is a controlled Qt Quick exploration while the current GTK4 client continues unchanged. It intentionally does **not** replace the default launcher, dependency installation, release packaging, or deployment.

## Source

- `qt_app.py`: Qt Quick/PySide6 6.12.0 application host; no token exposure to QML; async fetch and save with stale-search rejection.
- `Memos.qml`: windowed-by-default original Qt Quick interface, independent masonry-like columns, keyboard-operable memo cards, search and edit/create dialog.
- `qt_api.py`: stdlib-only authenticated HTTP boundary, numeric loopback-only HTTP, HTTPS required elsewhere, disabled proxies and redirects, bounded responses and requests, restricted internal paths.
- `requirements-qt.txt`: exact Qt 6.12.0/PySide6 development dependency.
- `tests/test_qt_api.py`: disposable synthetic loopback tests, no real credentials, no external traffic.

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

The [nonpublishing Qt Quick preview workflow](https://github.com/GoreeCloud/memos/actions/workflows/qt-quick-linux-preview.yml) now installs the official Qt/PySide6 6.12.0 wheel and required Linux EGL/OpenGL runtime libraries on a disposable Ubuntu runner. Its isolated QML smoke test loads `Memos.qml` into a real `QQmlApplicationEngine`, binds to the real `MemosBridge`, and verifies a visible **normal/windowed** startup without credentials or a service. The previously passing seven synthetic API boundary tests remain in a separate job. At commit `449c833ff9e334c7c8ccf47c7b0adef6fb9ce06d`, the Qt headless workflow, standard Memos CI and synthetic browser acceptance all passed. No private data or user-host package installation was involved.

## Acceptance gaps

Headless QML startup is **verified on an isolated Linux runner**, but actual GNOME/KDE physical-desktop X11/Wayland behavior, keyboard/screen-reader accessibility, dark/high-contrast/reduced-motion native design, functional parity with the existing GTK/web clients, real service integration, desktop packaging and release/installation acceptance have **not** been verified. Existing Linux GTK app features/behavior must be compared before switching entrypoints. No release or installed product should be described as migrated merely because this experimental source exists. Track remaining work under [Linux migration issue #70](https://github.com/GoreeCloud/memos/issues/70).
