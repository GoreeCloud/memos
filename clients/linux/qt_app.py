#!/usr/bin/env python3
"""Development-only GoreeCloud Memos Qt Quick desktop client.

Run with PySide6==6.12.0. Does not change the existing GTK launcher.
The Qt backend deliberately keeps authentication and HTTP requests outside QML.
"""

from __future__ import annotations

import os
import threading
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

from PySide6.QtCore import QObject, Property, QUrl, Signal, Slot, qVersion
from PySide6.QtGui import QGuiApplication
from PySide6.QtQml import QQmlApplicationEngine

from qt_api import request_json


class MemosBridge(QObject):
    notesChanged = Signal()
    messageChanged = Signal()
    loadingChanged = Signal()
    savingChanged = Signal()
    saveSucceeded = Signal()
    saveFailed = Signal()
    _loaded = Signal(int, object, str)
    _saved = Signal(bool)

    def __init__(self, base: str, token: str):
        super().__init__()
        self._base = base
        self._token = token
        self._notes: list[dict] = []
        self._message = ""
        self._loading = False
        self._saving = False
        self._seq = 0
        self._loaded.connect(self._apply_loaded)
        self._saved.connect(self._apply_saved)

    @Property("QVariantList", notify=notesChanged)
    def notes(self):
        return self._notes

    @Property(str, notify=messageChanged)
    def message(self):
        return self._message

    @Property(bool, notify=loadingChanged)
    def loading(self):
        return self._loading

    @Property(bool, notify=savingChanged)
    def saving(self):
        return self._saving

    def _set_message(self, value: str):
        if self._message != value:
            self._message = value
            self.messageChanged.emit()

    def _set_loading(self, value: bool):
        if self._loading != value:
            self._loading = value
            self.loadingChanged.emit()

    def _set_saving(self, value: bool):
        if self._saving != value:
            self._saving = value
            self.savingChanged.emit()

    @Slot(str)
    def refresh(self, search: str = ""):
        self._seq += 1
        seq = self._seq
        if len(self._token) < 24:
            self._notes = []
            self.notesChanged.emit()
            self._set_loading(False)
            self._set_message("Set GOREE_MEMOS_TOKEN (24+ characters) to access your memos.")
            return
        self._set_loading(True)
        self._set_message("")

        def work():
            try:
                path = "/api/v1/memos?" + urlencode({"folder": "active", "q": search})
                data = request_json(self._base, self._token, path)
                if not isinstance(data, list):
                    raise ValueError("Unexpected memo list")
                notes = []
                for row in data:
                    if not isinstance(row, dict):
                        raise ValueError("Unexpected memo row")
                    notes.append({
                        "id": str(row.get("id", "")),
                        "version": row.get("version", 0),
                        "title": str(row.get("title") or ""),
                        "content": str(row.get("content") or ""),
                        "updated_at": str(row.get("updated_at") or ""),
                        "pinned": bool(row.get("pinned", False)),
                    })
                self._loaded.emit(seq, notes, "")
            except (HTTPError, URLError, ValueError, OSError):
                self._loaded.emit(seq, [], "Unable to load memos. Check connection and token.")

        threading.Thread(target=work, daemon=True).start()

    @Slot(int, object, str)
    def _apply_loaded(self, seq: int, notes, message: str):
        if seq != self._seq:
            return  # Ignore stale search responses.
        self._notes = notes
        self.notesChanged.emit()
        self._set_loading(False)
        self._set_message(message)

    @Slot(str, int, str, str)
    def saveMemo(self, memo_id: str, version: int, title: str, content: str):
        if self._saving:
            return
        self._set_saving(True)
        self._set_message("")
        payload = {"title": title, "content": content}
        if memo_id:
            payload["version"] = version

        def work():
            try:
                if memo_id:
                    # Never interpolate uncontrolled identifiers into API paths.
                    import uuid
                    canonical = str(uuid.UUID(memo_id))
                    if memo_id != canonical:
                        raise ValueError("Invalid memo identifier")
                    request_json(self._base, self._token, "/api/v1/memos/" + canonical,
                                 "PATCH", payload)
                else:
                    request_json(self._base, self._token, "/api/v1/memos",
                                 "POST", payload)
                self._saved.emit(True)
            except (HTTPError, URLError, ValueError, OSError):
                self._saved.emit(False)

        threading.Thread(target=work, daemon=True).start()

    @Slot(bool)
    def _apply_saved(self, ok: bool):
        self._set_saving(False)
        if ok:
            self.saveSucceeded.emit()
        else:
            self._set_message("Save failed. Check your connection or memo version.")
            self.saveFailed.emit()


def main() -> int:
    if qVersion() != "6.12.0":
        print("GoreeCloud Memos Qt Quick requires Qt 6.12.0.", file=sys.stderr)
        return 2
    app = QGuiApplication(sys.argv)
    app.setOrganizationName("GoreeCloud")
    app.setApplicationName("GoreeCloud Memos")
    bridge = MemosBridge(
        os.environ.get("GOREE_MEMOS_URL", "http://127.0.0.1:8765"),
        os.environ.get("GOREE_MEMOS_TOKEN", ""),
    )
    engine = QQmlApplicationEngine()
    engine.rootContext().setContextProperty("memosBackend", bridge)
    engine.load(QUrl.fromLocalFile(str(Path(__file__).with_name("Memos.qml"))))
    if not engine.rootObjects():
        return 1
    bridge.refresh("")
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
