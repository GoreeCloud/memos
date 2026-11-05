#!/usr/bin/env python3
"""Small CLI using the same authenticated API as the web client."""
import argparse
import ipaddress
import json
import os
import sys
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
    sub.add_parser("export", help="Print full portable JSON export")
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
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except RuntimeError as exc:
        print("Error: " + str(exc), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
