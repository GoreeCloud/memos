"""GoreeCloud Memos development API: dependency-free, private-by-default SQLite service."""
from __future__ import annotations

import argparse
import hmac
import hashlib
import json
import os
import re
import sqlite3
import sys
import uuid
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from auth_guard import AuthFailureGuard

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
COLORS = {"paper", "rose", "sun", "mint", "sky", "lavender"}
HASHTAG = re.compile(r"(?<!\w)#([\w/-]{1,64})", re.UNICODE)
ID = re.compile(r"^/api/v1/memos/([a-f0-9-]{36})(?:/(duplicate))?$")
MAX_BODY = 128 * 1024
IDEMPOTENCY_RETENTION_DAYS = 7


def strict_json_object(pairs):
    """Reject ambiguous object members, including inside nested JSON objects."""
    result = {}
    for name, value in pairs:
        if name in result:
            raise ValueError("Duplicate JSON object field")
        result[name] = value
    return result


def reject_nonstandard_json_number(value):
    """JSON permits no NaN or infinity constants."""
    raise ValueError("Non-standard JSON numeric value")


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
                CREATE TABLE IF NOT EXISTS memo_create_requests (
                    key_digest TEXT PRIMARY KEY,
                    payload_digest TEXT NOT NULL,
                    memo_id TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_memo_create_requests_time
                ON memo_create_requests(created_at);
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
        sql += " ORDER BY pinned DESC, updated_at DESC"
        # Apply the tag filter before the feed cap, or older matching notes
        # could disappear when more than 2,000 unrelated notes exist.
        if not tag:
            sql += " LIMIT 2000"
            with self.connect() as db:
                return [self.serialize(row) for row in db.execute(sql, params)]
        # Hashtags are derived from memo content rather than indexed columns.
        # Iterate the cursor instead of materializing the entire database into
        # Python lists, and stop as soon as the feed cap is satisfied.
        matches = []
        with self.connect() as db:
            for row in db.execute(sql, params):
                memo = self.serialize(row)
                if tag in memo["tags"]:
                    matches.append(memo)
                    if len(matches) == 2000:
                        break
        return matches

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

    def create_once(self, body, request_key):
        """Atomically create or replay a memo by an optional UUIDv4 request key.

        Store only a hash of the key. Replay returns the current memo, not a
        historical snapshot. Records expire after seven days on the next
        keyed write. Clients without a key still use legacy create().
        """
        body = validate_fields(body, creating=True)
        try:
            parsed = uuid.UUID(request_key)
        except (ValueError, TypeError, AttributeError):
            raise ValueError("Idempotency-Key must be a canonical UUIDv4")
        if parsed.version != 4 or str(parsed) != request_key:
            raise ValueError("Idempotency-Key must be a canonical UUIDv4")
        key_digest = hashlib.sha256(request_key.encode("ascii")).hexdigest()
        canonical = json.dumps(body, sort_keys=True, ensure_ascii=False,
                               separators=(",", ":")).encode("utf-8")
        payload_digest = hashlib.sha256(canonical).hexdigest()
        cutoff = (datetime.now(timezone.utc) -
                  timedelta(days=IDEMPOTENCY_RETENTION_DAYS)).isoformat(
                      timespec="milliseconds")
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM memo_create_requests WHERE created_at < ?",
                       (cutoff,))
            previous = db.execute(
                "SELECT payload_digest, memo_id FROM memo_create_requests "
                "WHERE key_digest=?", (key_digest,)).fetchone()
            if previous:
                if previous["payload_digest"] != payload_digest:
                    return None, "conflict"
                row = db.execute("SELECT * FROM memos WHERE id=?",
                                 (previous["memo_id"],)).fetchone()
                if row is None:
                    return None, "missing"
                return self.serialize(row), "replayed"
            memo_id, now = str(uuid.uuid4()), timestamp()
            item = (memo_id, body.get("title", ""), body.get("content", ""),
                    body.get("color", "paper"), int(body.get("pinned", False)),
                    int(body.get("archived", False)), 0, now, now, 1)
            db.execute("INSERT INTO memos VALUES (?,?,?,?,?,?,?,?,?,?)", item)
            db.execute("INSERT INTO memo_create_requests VALUES (?,?,?,?)",
                       (key_digest, payload_digest, memo_id, now))
            db.commit()
            row = db.execute("SELECT * FROM memos WHERE id=?", (memo_id,)).fetchone()
            return self.serialize(row), "created"

    def duplicate_once(self, source_id, request_key):
        """Duplicate a memo at most once per keyed request and source ID.

        The source ID is part of the hashed scope; replays do not depend on
        the source's later edits or deletion. Both memo and retry record are
        committed in one SQLite transaction.
        """
        try:
            parsed = uuid.UUID(request_key)
        except (ValueError, TypeError, AttributeError):
            raise ValueError("Idempotency-Key must be a canonical UUIDv4")
        if parsed.version != 4 or str(parsed) != request_key:
            raise ValueError("Idempotency-Key must be a canonical UUIDv4")
        scope = "duplicate:" + source_id
        key_digest = hashlib.sha256((scope + ":" + request_key).encode("ascii")).hexdigest()
        payload_digest = hashlib.sha256(scope.encode("ascii")).hexdigest()
        cutoff = (datetime.now(timezone.utc) -
                  timedelta(days=IDEMPOTENCY_RETENTION_DAYS)).isoformat(
                      timespec="milliseconds")
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM memo_create_requests WHERE created_at < ?",
                       (cutoff,))
            previous = db.execute(
                "SELECT payload_digest, memo_id FROM memo_create_requests "
                "WHERE key_digest=?", (key_digest,)).fetchone()
            if previous:
                if previous["payload_digest"] != payload_digest:
                    return None, "conflict"
                current = db.execute("SELECT * FROM memos WHERE id=?",
                                     (previous["memo_id"],)).fetchone()
                return (self.serialize(current), "replayed") if current else (None, "missing")
            original = db.execute("SELECT * FROM memos WHERE id=?",
                                  (source_id,)).fetchone()
            if original is None or original["deleted"]:
                return None, "source_missing"
            memo_id, now = str(uuid.uuid4()), timestamp()
            item = (memo_id, original["title"], original["content"],
                    original["color"], 0, 0, 0, now, now, 1)
            db.execute("INSERT INTO memos VALUES (?,?,?,?,?,?,?,?,?,?)", item)
            db.execute("INSERT INTO memo_create_requests VALUES (?,?,?,?)",
                       (key_digest, payload_digest, memo_id, now))
            db.commit()
            row = db.execute("SELECT * FROM memos WHERE id=?", (memo_id,)).fetchone()
            return self.serialize(row), "created"

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

    def export_all(self):
        """Read one coherent snapshot; never apply the feed's 2,000-item limit."""
        with self.connect() as db:
            db.execute("BEGIN")
            memos = [self.serialize(row) for row in db.execute(
                "SELECT * FROM memos ORDER BY created_at, id").fetchall()]
            revisions = [dict(row) for row in db.execute(
                "SELECT * FROM revisions ORDER BY memo_id, version").fetchall()]
            db.rollback()
        return {"format": "goreecloud-memos-v2",
                "exported_at": timestamp(), "memos": memos, "revisions": revisions}


class BoundedHTTPServer(ThreadingHTTPServer):
    """Bound the idle time spent reading any one accepted client socket."""

    request_read_timeout_seconds = 15

    def get_request(self):
        sock, peer = super().get_request()
        try:
            sock.settimeout(self.request_read_timeout_seconds)
        except Exception:
            sock.close()
            raise
        return sock, peer


def make_handler(store, token, auth_guard=None):
    # This guard is shared across request threads, not recreated per request.
    guard = auth_guard if auth_guard is not None else AuthFailureGuard()

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
            if status == 429:
                self.send_header("Retry-After", str(int(guard.window_seconds)))
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
            # A proxy and this application must not interpret two credentials
            # differently. One unambiguous bearer field is required.
            supplied = self.headers.get_all("Authorization", [])
            if len(supplied) != 1:
                return False
            expected = "Bearer " + token
            try:
                return hmac.compare_digest(supplied[0].encode("utf-8"),
                                           expected.encode("utf-8"))
            except (TypeError, UnicodeError):
                return False

        def idempotency_key(self):
            values = self.headers.get_all("Idempotency-Key", [])
            if not values:
                return None
            if len(values) != 1:
                raise ValueError("Exactly one Idempotency-Key is permitted")
            key = values[0]
            try:
                parsed = uuid.UUID(key)
            except (ValueError, AttributeError, TypeError):
                raise ValueError("Idempotency-Key must be a canonical UUIDv4")
            if parsed.version != 4 or str(parsed) != key:
                raise ValueError("Idempotency-Key must be a canonical UUIDv4")
            return key

        def parse_body(self):
            # Fail closed on conflicting HTTP framing; never choose the first
            # of two lengths or accept chunked bodies in this local-only API.
            if self.headers.get_all("Transfer-Encoding", []):
                raise ValueError("Transfer-Encoding is unsupported")
            lengths = self.headers.get_all("Content-Length", [])
            if len(lengths) != 1:
                raise ValueError("Exactly one Content-Length is required")
            raw_length = lengths[0]
            if (not raw_length.isascii() or not raw_length.isdecimal()
                    or len(raw_length) > 6 or int(raw_length) > MAX_BODY):
                raise ValueError("Request body out of range")
            length = int(raw_length)
            types = self.headers.get_all("Content-Type", [])
            if len(types) != 1 or types[0].split(";")[0].strip().lower() != "application/json":
                raise ValueError("Exactly one application/json Content-Type is required")
            try:
                return json.loads(
                    self.rfile.read(length),
                    object_pairs_hook=strict_json_object,
                    parse_constant=reject_nonstandard_json_number,
                )
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
                          "/app.js": ("app.js", "text/javascript; charset=utf-8"),
                          "/markdown.js": ("markdown.js", "text/javascript; charset=utf-8")}
                if path not in assets:
                    return self.respond(404, {"error": "Not found"})
                filename, mime = assets[path]
                return self.respond(200, (WEB / filename).read_bytes(), mime)
            if path == "/api/v1/health" and self.command == "GET":
                return self.respond(200, {"status": "ok", "service": "goreecloud-memos"})
            peer = self.client_address[0]
            # Only the socket peer is trusted. Proxy-supplied forwarded headers
            # cannot choose another rate-limit bucket. Threshold check and
            # failure accounting must be atomic across request threads.
            decision = guard.attempt(peer, self.authorized())
            if decision == "blocked":
                return self.respond(429, {"error": "Too many authentication failures"})
            if decision == "invalid":
                return self.respond(401, {"error": "Authentication required"})
            if path == "/api/v1/export" and self.command == "GET":
                return self.respond(200, store.export_all())
            if path == "/api/v1/memos":
                if self.command == "GET":
                    args = parse_qs(url.query)
                    return self.respond(200, store.list(
                        args.get("folder", ["active"])[0],
                        args.get("q", [""])[0][:200],
                        args.get("tag", [""])[0][:64]))
                if self.command == "POST":
                    key = self.idempotency_key()
                    body = self.parse_body()
                    if key is None:
                        return self.respond(201, store.create(body))
                    memo, outcome = store.create_once(body, key)
                    if outcome == "conflict":
                        return self.respond(409, {"error": "Idempotency-Key reused with different memo content"})
                    if outcome == "missing":
                        return self.respond(410, {"error": "Original memo no longer exists"})
                    return self.respond(200 if outcome == "replayed" else 201, memo)
            match = ID.fullmatch(path)
            if match:
                memo_id, action = match.groups()
                if action == "duplicate" and self.command == "POST":
                    key = self.idempotency_key()
                    if key is not None:
                        if self.parse_body() != {}:
                            raise ValueError("Duplicate request body must be empty")
                        duplicate, outcome = store.duplicate_once(memo_id, key)
                        if outcome == "source_missing":
                            return self.respond(404, {"error": "Not found"})
                        if outcome == "missing":
                            return self.respond(410, {"error": "Original duplicate no longer exists"})
                        if outcome == "conflict":
                            return self.respond(409, {"error": "Idempotency-Key conflict"})
                        return self.respond(200 if outcome == "replayed" else 201, duplicate)
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
            except TimeoutError:
                # A stalled or incomplete JSON request must not monopolize
                # its handler thread indefinitely or partially modify a memo.
                self.close_connection = True
                try:
                    self.respond(408, {"error": "Request body timed out"})
                except OSError:
                    pass
            except (ValueError, TypeError) as exc:
                self.respond(400, {"error": str(exc)})
            except Exception:
                self.respond(500, {"error": "Internal server error"})
                raise
    return Handler


def create_server(host, port, db_path, token, auth_guard=None):
    if len(token) < 24:
        raise ValueError("GOREE_MEMOS_TOKEN must be at least 24 characters")
    return BoundedHTTPServer((host, port), make_handler(Store(db_path), token, auth_guard))


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
