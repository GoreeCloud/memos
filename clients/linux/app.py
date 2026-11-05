#!/usr/bin/env python3
"""Native Linux GTK4 development client (requires python3-gi and GTK4)."""
import json
import os
import threading
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

import gi
gi.require_version("Gtk", "4.0")
from gi.repository import Gtk, GLib, Gdk

BASE = os.environ.get("GOREE_MEMOS_URL", "http://127.0.0.1:8765").rstrip("/")
TOKEN = os.environ.get("GOREE_MEMOS_TOKEN", "")


def api(path, method="GET", value=None):
    headers = {"Authorization": "Bearer " + TOKEN}
    data = None
    if value is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(value).encode()
    request = Request(BASE + path, data=data, headers=headers, method=method)
    with urlopen(request, timeout=12) as response:
        return json.loads(response.read())


class Memos(Gtk.Application):
    def __init__(self):
        super().__init__(application_id="com.goreecloud.memos")
        self.notes = []
        self.current_search = ""
        self.seq = 0

    def do_activate(self):
        self.window = Gtk.ApplicationWindow(application=self, title="GoreeCloud Memos")
        self.window.set_default_size(1030, 730)
        top = Gtk.HeaderBar()
        title = Gtk.Label(label="✦  GoreeCloud Memos")
        title.add_css_class("brand")
        top.set_title_widget(title)
        self.search = Gtk.SearchEntry(placeholder_text="Search memos…")
        self.search.set_size_request(240, -1)
        self.search.connect("search-changed", self.search_changed)
        top.pack_start(self.search)
        add = Gtk.Button(label="＋ New memo")
        add.add_css_class("suggested-action")
        add.connect("clicked", lambda *_: self.open_editor(None))
        top.pack_end(add)
        self.window.set_titlebar(top)
        self.scroller = Gtk.ScrolledWindow()
        self.scroller.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.columns = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=16)
        self.columns.set_margin_start(28)
        self.columns.set_margin_end(28)
        self.columns.set_margin_top(28)
        self.columns.set_margin_bottom(28)
        self.scroller.set_child(self.columns)
        self.window.set_child(self.scroller)
        provider = Gtk.CssProvider()
        provider.load_from_data(b"""
            window { background: #ecf0f8; }
            .brand { font-weight: 800; color: #5145d9; }
            .memo-card { background: #ffffff; border-radius: 18px; padding: 18px; }
            .memo-title { font-size: 16px; font-weight: 800; color: #20243a; }
            .memo-content { color: #4f566c; }
            .memo-muted { color: #797f91; font-size: 11px; }
            .memo-card:hover { background: #f1efff; }
        """)
        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )
        self.window.present()
        if len(TOKEN) < 24:
            self.show_message("Set GOREE_MEMOS_TOKEN (24+ characters) to access your private memos.")
        else:
            self.refresh()

    def show_message(self, text):
        while self.columns.get_first_child():
            self.columns.remove(self.columns.get_first_child())
        message = Gtk.Label(label=text, wrap=True)
        self.columns.append(message)
        return False

    def search_changed(self, entry):
        self.current_search = entry.get_text()
        self.refresh()

    def refresh(self):
        self.seq += 1
        seq = self.seq
        query = self.current_search
        def work():
            try:
                notes = api("/api/v1/memos?" + urlencode({"folder": "active", "q": query}))
                GLib.idle_add(self.render, notes, seq)
            except (HTTPError, URLError, ValueError) as exc:
                GLib.idle_add(self.show_message, "Unable to load memos. Check connection and token.")
        threading.Thread(target=work, daemon=True).start()

    def render(self, notes, seq):
        if seq != self.seq:
            return False
        self.notes = notes
        while self.columns.get_first_child():
            self.columns.remove(self.columns.get_first_child())
        # Native masonry: independent vertical columns with approximate height balancing.
        count = 3 if self.window.get_width() >= 950 else 2 if self.window.get_width() >= 580 else 1
        boxes, heights = [], [0] * count
        for _ in range(count):
            column = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=15)
            column.set_hexpand(True)
            self.columns.append(column)
            boxes.append(column)
        if not notes:
            boxes[0].append(Gtk.Label(label="No memos yet. Create your first thought."))
        for memo in notes:
            card = Gtk.Button()
            card.add_css_class("memo-card")
            card.connect("clicked", lambda _, item=memo: self.open_editor(item))
            stack = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
            if memo["title"]:
                name = Gtk.Label(label=memo["title"], wrap=True, xalign=0)
                name.add_css_class("memo-title")
                stack.append(name)
            preview = Gtk.Label(label=memo["content"][:500] or "Empty memo", wrap=True, xalign=0)
            preview.add_css_class("memo-content")
            stack.append(preview)
            date = Gtk.Label(label=("✦ Pinned · " if memo["pinned"] else "") +
                             memo["updated_at"][:10], xalign=0)
            date.add_css_class("memo-muted")
            stack.append(date)
            card.set_child(stack)
            index = min(range(count), key=lambda i: heights[i])
            boxes[index].append(card)
            heights[index] += 80 + min(len(memo["content"]), 500) // 32 * 17
        return False

    def open_editor(self, memo):
        dialog = Gtk.Window(title="Edit memo" if memo else "New memo", transient_for=self.window, modal=True)
        dialog.set_default_size(530, 500)
        body = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        body.set_margin_top(20); body.set_margin_bottom(20)
        body.set_margin_start(22); body.set_margin_end(22)
        title = Gtk.Entry(placeholder_text="Title (optional)")
        title.set_text(memo["title"] if memo else "")
        body.append(title)
        editor = Gtk.TextView(wrap_mode=Gtk.WrapMode.WORD_CHAR)
        editor.get_buffer().set_text(memo["content"] if memo else "")
        scroll = Gtk.ScrolledWindow()
        scroll.set_vexpand(True)
        scroll.set_child(editor)
        body.append(scroll)
        controls = Gtk.Box(spacing=10)
        cancel = Gtk.Button(label="Cancel")
        cancel.connect("clicked", lambda *_: dialog.close())
        controls.append(cancel)
        save = Gtk.Button(label="Save memo")
        save.add_css_class("suggested-action")
        controls.append(save)
        def save_click(*_):
            buf = editor.get_buffer()
            content = buf.get_text(buf.get_start_iter(), buf.get_end_iter(), True)
            payload = {"title": title.get_text(), "content": content}
            if memo: payload["version"] = memo["version"]
            save.set_sensitive(False)
            def worker():
                try:
                    if memo: api("/api/v1/memos/" + memo["id"], "PATCH", payload)
                    else: api("/api/v1/memos", "POST", payload)
                    GLib.idle_add(lambda: (dialog.close(), self.refresh(), False)[-1])
                except (HTTPError, URLError, ValueError):
                    GLib.idle_add(lambda: (save.set_sensitive(True), self.show_message("Save failed; check connection or version."), False)[-1])
            threading.Thread(target=worker, daemon=True).start()
        save.connect("clicked", save_click)
        body.append(controls)
        dialog.set_child(body)
        dialog.present()


if __name__ == "__main__":
    Memos().run(None)
