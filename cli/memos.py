#!/usr/bin/env python3
"""Small CLI using the same authenticated API as the web client."""
import argparse
import ipaddress
import json
import os
import sys
import tempfile
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener


class RejectRedirects(HTTPRedirectHandler):
    """Never forward bearer credentials to a redirected origin."""

    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def checked_base(base):
    try:
        parts = urlsplit(base)
        host = parts.hostname
        _ = parts.port
    except ValueError:
        raise RuntimeError("Invalid Memos API URL") from None
    if (parts.scheme not in ("http", "https") or not host
            or parts.username is not None or parts.password is not None
            or parts.query or parts.fragment):
        raise RuntimeError("Invalid Memos API URL")
    if parts.scheme == "http":
        try:
            loopback = ipaddress.ip_address(host).is_loopback
        except ValueError:
            loopback = False
        if not loopback:
            raise RuntimeError("HTTPS is required for non-loopback Memos API URLs")
    return base.rstrip("/")


def request(base, token, path, method="GET", body=None):
    base = checked_base(base)
    headers = {"Authorization": "Bearer " + token}
    payload = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        payload = json.dumps(body).encode()
    req = Request(base + path, data=payload, headers=headers, method=method)
    try:
        # A proxy or automatic redirect could disclose Authorization to another
        # endpoint; access only the explicitly configured Memos host.
        opener = build_opener(ProxyHandler({}), RejectRedirects())
        with opener.open(req, timeout=15) as resp:
            return json.loads(resp.read())
    except HTTPError as exc:
        try: message = json.loads(exc.read()).get("error", "HTTP error")
        except (ValueError, KeyError): message = "HTTP error"
        raise RuntimeError(message + " (" + str(exc.code) + ")") from None
    except URLError as exc:
        raise RuntimeError("Cannot reach the Memos API") from None


def write_private_export(data, output_path):
    """Atomically save plaintext JSON with owner-only POSIX file permissions.

    Existing paths are never replaced. The caller must encrypt or otherwise
    protect exported data before sharing it or copying it to another host.
    """
    if os.name != "posix":
        raise RuntimeError("Private JSON file export requires POSIX permissions")
    destination = Path(output_path).expanduser().absolute()
    if not destination.parent.is_dir():
        raise ValueError("Export destination directory must already exist")
    if destination.exists() or destination.is_symlink():
        raise FileExistsError("Export destination already exists; refusing overwrite")
    fd, temp = tempfile.mkstemp(prefix=".memos-export-", suffix=".tmp",
                                dir=destination.parent)
    published = False
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump(data, file, indent=2, ensure_ascii=False)
            file.write("\n")
            file.flush()
            os.fsync(file.fileno())
        # Hardlink creation is exclusive and does not overwrite another path.
        os.link(temp, destination, follow_symlinks=False)
        published = True
        directory_fd = os.open(destination.parent,
                               os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
        return destination
    except Exception:
        if published:
            try:
                if os.path.samefile(temp, destination):
                    os.unlink(destination)
            except FileNotFoundError:
                pass
        raise
    finally:
        os.unlink(temp)


def main():
    parser = argparse.ArgumentParser(description="GoreeCloud Memos CLI development preview")
    parser.add_argument("--url", default=os.environ.get("GOREE_MEMOS_URL", "http://127.0.0.1:8765"))
    sub = parser.add_subparsers(dest="command", required=True)
    listing = sub.add_parser("list", help="List memos")
    listing.add_argument("--folder", choices=["active", "archive", "trash", "all"], default="active")
    listing.add_argument("--search", default="")
    create = sub.add_parser("create", help="Create a memo")
    create.add_argument("content", nargs="?", help="Text (or pipe through standard input)")
    create.add_argument("--title", default="")
    update = sub.add_parser("update", help="Update by version to prevent lost changes")
    update.add_argument("id")
    update.add_argument("--content")
    update.add_argument("--title")
    export = sub.add_parser("export", help="Export all memos and revisions")
    export.add_argument("--output", metavar="PATH",
                        help="Exclusively create owner-only JSON file on POSIX")
    args = parser.parse_args()
    token = os.environ.get("GOREE_MEMOS_TOKEN", "")
    if len(token) < 24:
        parser.error("Set GOREE_MEMOS_TOKEN (at least 24 characters)")
    try:
        if args.command == "list":
            result = request(args.url, token, "/api/v1/memos?" +
                             urlencode({"folder": args.folder, "q": args.search}))
        elif args.command == "create":
            content = args.content if args.content is not None else sys.stdin.read()
            result = request(args.url, token, "/api/v1/memos", "POST", {"content": content, "title": args.title})
        elif args.command == "update":
            old = request(args.url, token, "/api/v1/memos/" + args.id)
            change = {"version": old["version"]}
            if args.content is not None: change["content"] = args.content
            if args.title is not None: change["title"] = args.title
            result = request(args.url, token, "/api/v1/memos/" + args.id, "PATCH", change)
        else:
            result = request(args.url, token, "/api/v1/export")
        if args.command == "export" and args.output:
            written = write_private_export(result, args.output)
            print("Private JSON export saved: " + str(written))
        else:
            print(json.dumps(result, indent=2, ensure_ascii=False))
    except (RuntimeError, ValueError, OSError) as exc:
        print("Error: " + str(exc), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
