"""GoreeCloud Memos development API: dependency-free, private-by-default SQLite service."""
from __future__ import annotations

import argparse
import hmac
import json
import os
import re
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
COLORS = {"paper", "rose", "sun", "mint", "sky", "lavender"}
HASHTAG = re.compile(r"(?<!\w)#([\w/-]{1,64})", re.UNICODE)
ID = re.compile(r"^/api/v1/memos/([a-f0-9-]{36})(?:/(duplicate))?$")
MAX_BODY = 128 * 1024


def timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def tags(content):
    return sorted(set(HASHTAG.findall(content)), key=str.casefold)


def validate_fields(body, creating=False):
    if not isinstance(body, dict):
        raise ValueError("Expected a JSON object")
    allowed = {"title", "content", "color", "pinned", "archived", "deleted"}
    if any(key not in allowed | {"version"} for key in body):
        raise ValueError("Unknown memo field")
    if creating and ("deleted" in body or "version" in body):
        raise ValueError("Cannot set deletion state or version on create")
    if "title" in body and (not isinstance(body["title"], str) or len(body["title"]) > 160):
        raise ValueError("Invalid title")
    if "content" in body and (not isinstance(body["content"], str) or len(body["content"]) > 65536):
        raise ValueError("Invalid content")
    if "color" in body and body["color"] not in COLORS:
        raise ValueError("Unsupported color")
    for key in ("pinned", "archived", "deleted"):
        if key in body and type(body[key]) is not bool:
            raise ValueError("Invalid " + key)
    if not creating and (type(body.get("version")) is not int or body["version"] < 1):
        raise ValueError("A numeric memo version is required")
    return body


class Store:
    def __init__(self, path):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS memos (
                    id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL,
                    color TEXT NOT NULL, pinned INTEGER NOT NULL, archived INTEGER NOT NULL,
                    deleted INTEGER NOT NULL, created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL, version INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS revisions (
                    memo_id TEXT NOT NULL, version INTEGER NOT NULL,
                    title TEXT NOT NULL, content TEXT NOT NULL,
                    saved_at TEXT NOT NULL, PRIMARY KEY(memo_id, version)
                );
                CREATE INDEX IF NOT EXISTS idx_memos_folder
                ON memos(deleted, archived, pinned, updated_at);
            """)

    def connect(self):
        db = sqlite3.connect(self.path, timeout=8)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA busy_timeout=8000")
        db.execute("PRAGMA journal_mode=WAL")
        return db

    @staticmethod
    def serialize(row):
        value = dict(row)
        for field in ("pinned", "archived", "deleted"):
            value[field] = bool(value[field])
        value["tags"] = tags(value["content"])
        return value

    def list(self, folder="active", query="", tag=""):
        if folder not in ("active", "archive", "trash", "all"):
            raise ValueError("Invalid folder")
        sql, params = "SELECT * FROM memos WHERE 1=1", []
        sql += {"active": " AND deleted=0 AND archived=0",
                "archive": " AND deleted=0 AND archived=1",
                "trash": " AND deleted=1", "all": ""}[folder]
        if query:
            escaped = query.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            sql += " AND (lower(title) LIKE ? ESCAPE '\\' OR lower(content) LIKE ? ESCAPE '\\')"
            params.extend([f"%{escaped}%", f"%{escaped}%"])
        sql += " ORDER BY pinned DESC, updated_at DESC LIMIT 2000"
        with self.connect() as db:
            result = [self.serialize(r) for r in db.execute(sql, params).fetchall()]
        return [m for m in result if tag in m["tags"]] if tag else result

    def get(self, memo_id):
        with self.connect() as db:
            row = db.execute("SELECT * FROM memos WHERE id=?", (memo_id,)).fetchone()
        return self.serialize(row) if row else None

    def create(self, body):
        body = validate_fields(body, creating=True)
        memo_id, now = str(uuid.uuid4()), timestamp()
        item = (memo_id, body.get("title", ""), body.get("content", ""),
                body.get("color", "paper"), int(body.get("pinned", False)),
                int(body.get("archived", False)), 0, now, now, 1)
        with self.connect() as db:
            db.execute("INSERT INTO memos VALUES (?,?,?,?,?,?,?,?,?,?)", item)
            db.commit()
        return self.get(memo_id)

    def update(self, memo_id, body):
        body = validate_fields(body)
        fields = ["title", "content", "color", "pinned", "archived", "deleted"]
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            old = db.execute("SELECT * FROM memos WHERE id=?", (memo_id,)).fetchone()
            if old is None:
                return None, "missing"
            if old["version"] != body["version"]:
                return self.serialize(old), "conflict"
            now = timestamp()
            new = {f: body.get(f, old[f]) for f in fields}
            db.execute("INSERT INTO revisions VALUES (?,?,?,?,?)",
                       (memo_id, old["version"], old["title"], old["content"], now))
            db.execute("""
                UPDATE memos SET title=?, content=?, color=?, pinned=?,
                archived=?, deleted=?, updated_at=?, version=? WHERE id=?
            """, (new["title"], new["content"], new["color"], int(new["pinned"]),
                  int(new["archived"]), int(new["deleted"]), now,
                  old["version"] + 1, memo_id))
            db.commit()
        return self.get(memo_id), None

    def revisions(self, memo_id):
        with self.connect() as db:
            rows = db.execute("SELECT * FROM revisions WHERE memo_id=? ORDER BY version DESC",
                              (memo_id,)).fetchall()
        return [dict(row) for row in rows]


def make_handler(store, token):
    class Handler(BaseHTTPRequestHandler):
        server_version = "GoreeCloud-Memos/0.1"
        def log_message(self, fmt, *args):
            # Request logs deliberately exclude authorization and query parameters.
            sys.stderr.write(f"[memos] {self.address_string()} {self.command}\n")

        def respond(self, status, data, mime="application/json; charset=utf-8"):
            raw = (json.dumps(data, ensure_ascii=False).encode("utf-8")
                   if isinstance(data, (dict, list)) else data)
            self.send_response(status)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Content-Security-Policy",
                             "default-src 'self'; script-src 'self'; style-src 'self'; "
                             "connect-src 'self'; img-src 'self' data:; "
                             "object-src 'none'; frame-ancestors 'none'; base-uri 'none'")
            self.end_headers()
            self.wfile.write(raw)

        def authorized(self):
            candidate = self.headers.get("Authorization", "")
            expected = "Bearer " + token
            return hmac.compare_digest(candidate.encode("utf-8"), expected.encode("utf-8"))

        def parse_body(self):
            try:
                length = int(self.headers.get("Content-Length", "-1"))
            except ValueError:
                raise ValueError("Invalid Content-Length")
            if length < 0 or length > MAX_BODY:
                raise ValueError("Request body out of range")
            if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
                raise ValueError("Content-Type must be application/json")
            try:
                return json.loads(self.rfile.read(length))
            except (UnicodeDecodeError, json.JSONDecodeError):
                raise ValueError("Invalid JSON")

        def route(self):
            url = urlsplit(self.path)
            path = url.path
            if not path.startswith("/api/"):
                if self.command != "GET":
                    return self.respond(405, {"error": "Method not allowed"})
                assets = {"/": ("index.html", "text/html; charset=utf-8"),
                          "/index.html": ("index.html", "text/html; charset=utf-8"),
                          "/style.css": ("style.css", "text/css; charset=utf-8"),
                          "/app.js": ("app.js", "text/javascript; charset=utf-8")}
                if path not in assets:
                    return self.respond(404, {"error": "Not found"})
                filename, mime = assets[path]
                return self.respond(200, (WEB / filename).read_bytes(), mime)
            if path == "/api/v1/health" and self.command == "GET":
                return self.respond(200, {"status": "ok", "service": "goreecloud-memos"})
            if not self.authorized():
                return self.respond(401, {"error": "Authentication required"})
            if path == "/api/v1/export" and self.command == "GET":
                return self.respond(200, {"format": "goreecloud-memos-v1",
                                          "exported_at": timestamp(), "memos": store.list("all")})
            if path == "/api/v1/memos":
                if self.command == "GET":
                    args = parse_qs(url.query)
                    return self.respond(200, store.list(
                        args.get("folder", ["active"])[0],
                        args.get("q", [""])[0][:200],
                        args.get("tag", [""])[0][:64]))
                if self.command == "POST":
                    return self.respond(201, store.create(self.parse_body()))
            match = ID.fullmatch(path)
            if match:
                memo_id, action = match.groups()
                if action == "duplicate" and self.command == "POST":
                    memo = store.get(memo_id)
                    if not memo or memo["deleted"]:
                        return self.respond(404, {"error": "Not found"})
                    return self.respond(201, store.create({
                        "title": memo["title"], "content": memo["content"],
                        "color": memo["color"]}))
                if action is not None:
                    return self.respond(405, {"error": "Method not allowed"})
                if self.command == "GET":
                    memo = store.get(memo_id)
                    return self.respond(200, memo) if memo else self.respond(404, {"error": "Not found"})
                if self.command == "PATCH":
                    memo, err = store.update(memo_id, self.parse_body())
                    if err == "conflict":
                        return self.respond(409, {"error": "Version conflict", "current": memo})
                    return self.respond(200, memo) if memo else self.respond(404, {"error": "Not found"})
                if self.command == "DELETE":
                    body = self.parse_body()
                    memo, err = store.update(memo_id, {"version": body.get("version"), "deleted": True})
                    if err == "conflict":
                        return self.respond(409, {"error": "Version conflict", "current": memo})
                    return self.respond(200, memo) if memo else self.respond(404, {"error": "Not found"})
            if path.endswith("/revisions") and self.command == "GET":
                memo_id = path.removeprefix("/api/v1/memos/").removesuffix("/revisions")
                if ID.fullmatch("/api/v1/memos/" + memo_id) and store.get(memo_id):
                    return self.respond(200, store.revisions(memo_id))
            return self.respond(404, {"error": "Not found"})

        def do_GET(self):
            self.safely_route()

        def do_POST(self):
            self.safely_route()

        def do_PATCH(self):
            self.safely_route()

        def do_DELETE(self):
            self.safely_route()

        def safely_route(self):
            try:
                self.route()
            except (ValueError, TypeError) as exc:
                self.respond(400, {"error": str(exc)})
            except Exception:
                self.respond(500, {"error": "Internal server error"})
                raise
    return Handler


def create_server(host, port, db_path, token):
    if len(token) < 24:
        raise ValueError("GOREE_MEMOS_TOKEN must be at least 24 characters")
    return ThreadingHTTPServer((host, port), make_handler(Store(db_path), token))


def main():
    parser = argparse.ArgumentParser(description="GoreeCloud Memos development server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--db", default=os.environ.get("GOREE_MEMOS_DB", "./data/memos.sqlite3"))
    args = parser.parse_args()
    token = os.environ.get("GOREE_MEMOS_TOKEN", "")
    server = create_server(args.host, args.port, args.db, token)
    print(f"GoreeCloud Memos listening at http://{args.host}:{server.server_port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
