"""Bounded, thread-safe per-peer authentication failure guard.

This is defense-in-depth for the single-token development server, NOT a
replacement for HTTPS, a reverse proxy, identities, or production rate limits.
"""
from collections import OrderedDict
from threading import Lock
from time import monotonic


class AuthFailureGuard:
    def __init__(self, limit=8, window_seconds=60, max_peers=1024, clock=monotonic):
        if min(limit, max_peers) < 1 or window_seconds <= 0:
            raise ValueError("Invalid authentication guard configuration")
        self.limit = limit
        self.window_seconds = window_seconds
        self.max_peers = max_peers
        self.clock = clock
        self.lock = Lock()
        self.peers = OrderedDict()

    def denied(self, peer):
        """Return True after at least 'limit' failed attempts in the window."""
        now = self.clock()
        with self.lock:
            record = self.peers.get(peer)
            if record is None:
                return False
            start, count = record
            if now - start >= self.window_seconds:
                del self.peers[peer]
                return False
            self.peers.move_to_end(peer)
            return count >= self.limit

    def failure(self, peer):
        """Record a failed request; bounded memory prevents endless peer growth."""
        now = self.clock()
        with self.lock:
            start, count = self.peers.get(peer, (now, 0))
            if now - start >= self.window_seconds:
                start, count = now, 0
            self.peers[peer] = start, count + 1
            self.peers.move_to_end(peer)
            while len(self.peers) > self.max_peers:
                self.peers.popitem(last=False)

    def attempt(self, peer, is_valid):
        """Atomically decide whether to allow, reject or throttle an API login.

        Checking the threshold and recording a failure under the same lock
        prevents simultaneous request threads from each slipping through a
        stale pre-failure count. Returns: 'ok', 'invalid' or 'blocked'.
        """
        now = self.clock()
        with self.lock:
            record = self.peers.get(peer)
            if record is not None and now - record[0] >= self.window_seconds:
                del self.peers[peer]
                record = None
            if record is not None and record[1] >= self.limit:
                self.peers.move_to_end(peer)
                return "blocked"
            if is_valid:
                self.peers.pop(peer, None)
                return "ok"
            start, count = record if record is not None else (now, 0)
            self.peers[peer] = (start, count + 1)
            self.peers.move_to_end(peer)
            while len(self.peers) > self.max_peers:
                self.peers.popitem(last=False)
            return "invalid"

    def clear(self, peer):
        with self.lock:
            self.peers.pop(peer, None)
