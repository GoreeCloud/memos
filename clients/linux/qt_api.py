"""GoreeCloud Memos Qt Quick preview: bounded authenticated API access.

Original GoreeCloud code. See repository LICENSE (Apache-2.0).
This module intentionally has no Qt or GTK dependency so its privacy/security
preflight can be regression-tested without a graphical environment.
"""

from __future__ import annotations

import ipaddress
import json
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

MAX_API_RESPONSE_BYTES = 8 * 1024 * 1024


class RefuseRedirects(HTTPRedirectHandler):
    """Never forward the private bearer token to a redirected destination."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def checked_base(base: str) -> str:
    if not isinstance(base, str):
        raise ValueError("Invalid Memos API URL")
    try:
        parts = urlsplit(base)
        host = parts.hostname
        _ = parts.port
    except ValueError:
        raise ValueError("Invalid Memos API URL") from None
    if (
        parts.scheme not in ("http", "https")
        or not host
        or parts.username is not None
        or parts.password is not None
        or parts.query
        or parts.fragment
    ):
        raise ValueError("Invalid Memos API URL")
    if parts.scheme == "http":
        try:
            is_loopback = ipaddress.ip_address(host).is_loopback
        except ValueError:
            is_loopback = False
        if not is_loopback:
            raise ValueError("HTTPS is required for non-loopback Memos API URLs")
    return base.rstrip("/")


def request_json(base: str, token: str, path: str, method: str = "GET", value=None):
    """Perform a bounded Memos API request without proxies or redirects.

    Only known internal API paths are allowed. Never return or log credentials,
    endpoint internals, raw remote exception text, or response bodies in errors.
    """
    url = checked_base(base)
    if not isinstance(token, str) or len(token) < 24:
        raise ValueError("Memos bearer token is not configured")
    if not isinstance(path, str) or not path.startswith("/api/v1/memos"):
        raise ValueError("Unsupported Memos API path")
    if not (path == "/api/v1/memos" or path.startswith("/api/v1/memos?")
            or path.startswith("/api/v1/memos/")):
        raise ValueError("Unsupported Memos API path")
    route = path.split("?", 1)[0]
    if any(part in route for part in ("..", "\\", "%", "#")) or (
        route.startswith("/api/v1/memos/") and
        "/" in route.removeprefix("/api/v1/memos/")
    ):
        raise ValueError("Unsupported Memos API path")
    if method not in ("GET", "POST", "PATCH"):
        raise ValueError("Unsupported Memos API method")
    headers = {"Authorization": "Bearer " + token}
    data = None
    if value is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(value, ensure_ascii=False).encode("utf-8")
        if len(data) > MAX_API_RESPONSE_BYTES:
            raise ValueError("Memos request exceeds size limit")
    req = Request(url + path, data=data, headers=headers, method=method)
    opener = build_opener(ProxyHandler({}), RefuseRedirects())
    with opener.open(req, timeout=12) as response:
        raw = response.read(MAX_API_RESPONSE_BYTES + 1)
    if len(raw) > MAX_API_RESPONSE_BYTES:
        raise ValueError("Memos response exceeds size limit")
    return json.loads(raw)
