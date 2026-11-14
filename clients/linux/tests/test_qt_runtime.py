"""Headless startup acceptance for the experimental Memos Qt Quick UI.

Runs on a disposable Linux CI runner with PySide6 6.12.0 installed.
No private credentials, no production calls, and no launcher changes.
"""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

# Set the virtual display and software scene graph *before* importing Qt.
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
os.environ.setdefault("QT_QUICK_BACKEND", "software")
os.environ.setdefault("QT_QUICK_CONTROLS_STYLE", "Basic")

from PySide6.QtCore import QUrl, qVersion
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
