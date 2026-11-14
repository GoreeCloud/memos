"""Headless startup acceptance for the experimental Memos Qt Quick UI.

Runs on a disposable Linux CI runner with PySide6 6.12.0 installed.
No private credentials, no production calls, and no launcher changes.
"""

from __future__ import annotations

import os
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import patch

# Set the virtual display and software scene graph *before* importing Qt.
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
os.environ.setdefault("QT_QUICK_BACKEND", "software")
os.environ.setdefault("QT_QUICK_CONTROLS_STYLE", "Basic")

from PySide6.QtCore import QObject, QMetaObject, QUrl, qVersion
from PySide6.QtGui import QGuiApplication, QWindow
from PySide6.QtQml import QQmlApplicationEngine

LINUX_CLIENT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(LINUX_CLIENT))
from qt_app import MemosBridge


class QtQuickStartupTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if qVersion() != "6.12.0":
            raise AssertionError("Qt 6.12.0 is required; unexpected runtime " + qVersion())
        cls.app = QGuiApplication.instance() or QGuiApplication(["memos-qt-preview-test"])

    def _await_idle(self, bridge):
        """Pump only the synthetic Qt event loop; never contact a real server."""
        deadline = time.monotonic() + 3
        while bridge.saving and time.monotonic() < deadline:
            self.app.processEvents()
            time.sleep(0.01)
        self.app.processEvents()
        self.assertFalse(bridge.saving, "Synthetic save worker did not complete")

    def test_create_replays_same_key_after_uncertain_error(self):
        """A failed request retains its identity until success or abandonment."""
        bridge = MemosBridge("http://127.0.0.1:8765", "fictional-test-token-not-a-secret")
        keys = []

        def fake_request(_base, _token, path, method="GET", value=None,
                         *, idempotency_key=None):
            self.assertEqual((path, method), ("/api/v1/memos", "POST"))
            self.assertEqual(value, {"title": "Synthetic", "content": "demo"})
            self.assertIsInstance(idempotency_key, str)
            keys.append(idempotency_key)
            if len(keys) == 1:
                raise OSError("synthetic uncertain transport failure")
            return {"id": "synthetic-result"}

        with patch("qt_app.request_json", side_effect=fake_request):
            bridge.saveMemo("", 0, "Synthetic", "demo")
            self._await_idle(bridge)
            self.assertIn("Save failed", bridge.message)
            bridge.saveMemo("", 0, "Synthetic", "demo")
            self._await_idle(bridge)
            self.assertEqual(keys[:2], [keys[0], keys[0]])
            bridge.saveMemo("", 0, "Synthetic", "demo")
            self._await_idle(bridge)
        self.assertEqual(len(keys), 3)
        self.assertNotEqual(keys[2], keys[0],
                            "Successful save must clear stale retry identity")

    def test_cancel_after_uncertain_error_resets_replay_identity(self):
        bridge = MemosBridge("http://127.0.0.1:8765", "fictional-test-token-not-a-secret")
        keys = []

        def failed_request(_base, _token, _path, _method="GET",
                           _value=None, *, idempotency_key=None):
            keys.append(idempotency_key)
            raise OSError("synthetic uncertain transport failure")

        with patch("qt_app.request_json", side_effect=failed_request):
            bridge.saveMemo("", 0, "Synthetic", "demo")
            self._await_idle(bridge)
            bridge.discardDraft()
            bridge.saveMemo("", 0, "Synthetic", "demo")
            self._await_idle(bridge)
        self.assertEqual(len(keys), 2)
        self.assertNotEqual(keys[0], keys[1],
                            "Explicitly abandoned draft must discard retry identity")


    def test_desktop_shortcut_and_keyboard_focus_contract(self):
        """Resolve real controls in the Qt engine and open an editable modal."""
        qml = (LINUX_CLIENT / "Memos.qml").read_text(encoding="utf-8")
        self.assertIn("sequences: [StandardKey.New]", qml)
        self.assertIn("sequences: [StandardKey.Find]", qml)
        self.assertIn("enabled: !editor.visible && !memosBackend.saving", qml)
        self.assertIn("onOpened: titleInput.forceActiveFocus(Qt.PopupFocusReason)", qml)

        bridge = MemosBridge("http://127.0.0.1:8765", "")
        engine = QQmlApplicationEngine()
        warnings = []
        engine.warnings.connect(lambda errors: warnings.extend(e.toString() for e in errors))
        engine.rootContext().setContextProperty("memosBackend", bridge)
        engine.load(QUrl.fromLocalFile(str(LINUX_CLIENT / "Memos.qml")))
        self.assertFalse(warnings, "QML warnings: " + " | ".join(warnings))
        self.assertEqual(len(engine.rootObjects()), 1)
        window = engine.rootObjects()[0]
        search = window.findChild(QObject, "memos-search-field")
        editor = window.findChild(QObject, "memos-editor")
        title = window.findChild(QObject, "memos-title-field")
        self.assertIsNotNone(search, "Search control must be discoverable")
        self.assertIsNotNone(editor, "Modal editor must be discoverable")
        self.assertIsNotNone(title, "Title field must be discoverable")
        self.assertTrue(editor.property("focus"), "Modal must claim focus")
        self.assertTrue(QMetaObject.invokeMethod(editor, "open"), "Modal open invokable")
        end = time.monotonic() + 1.0
        while not bool(title.property("activeFocus")) and time.monotonic() < end:
            self.app.processEvents()
            time.sleep(0.01)
        self.assertTrue(editor.property("visible"), "Editor opened")
        self.assertTrue(title.property("activeFocus"), "Keyboard focus enters editor")
        self.assertTrue(QMetaObject.invokeMethod(editor, "close"))
        self.app.processEvents()
        window.close()

    def test_qml_engine_loads_and_starts_windowed(self):
        # An empty token makes network calls unnecessary; QML still binds to
        # the real QObject bridge, including properties, signals and slots.
        bridge = MemosBridge("http://127.0.0.1:8765", "")
        engine = QQmlApplicationEngine()
        errors = []
        engine.warnings.connect(lambda items: errors.extend(e.toString() for e in items))
        engine.rootContext().setContextProperty("memosBackend", bridge)
        qml = LINUX_CLIENT / "Memos.qml"
        self.assertTrue(qml.is_file(), "Memos.qml must exist")
        engine.load(QUrl.fromLocalFile(str(qml)))
        self.assertFalse(errors, "QML warnings or binding errors: " + " | ".join(errors))
        self.assertEqual(len(engine.rootObjects()), 1, "A single top-level QML window is required")
        window = engine.rootObjects()[0]
        self.assertTrue(window.isVisible(), "Main window must be visible on startup")
        self.assertEqual(window.visibility(), QWindow.Visibility.Windowed,
                         "Linux app must open as a normal window")
        self.assertGreaterEqual(window.width(), 480)
        self.assertGreaterEqual(window.height(), 360)

        # Verify the missing-token path cannot make a network request and that
        # the QML bindings update without exposing a credential.
        bridge.refresh("")
        self.assertFalse(bridge.loading)
        self.assertIn("GOREE_MEMOS_TOKEN", bridge.message)
        self.assertEqual(bridge.notes, [])
        window.close()


if __name__ == "__main__":
    unittest.main()
