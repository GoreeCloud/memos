"""Unit tests for the opt-in authentication failure guard."""
import unittest
from auth_guard import AuthFailureGuard


class GuardTests(unittest.TestCase):
    def test_failed_attempt_threshold_and_window_reset(self):
        time = [10.0]
        guard = AuthFailureGuard(limit=3, window_seconds=30, clock=lambda: time[0])
        for _ in range(3):
            self.assertFalse(guard.denied("127.0.0.1"))
            guard.failure("127.0.0.1")
        self.assertTrue(guard.denied("127.0.0.1"))
        self.assertFalse(guard.denied("other"))
        time[0] = 41
        self.assertFalse(guard.denied("127.0.0.1"))

    def test_clear_and_bounded_peer_storage(self):
        guard = AuthFailureGuard(limit=1, max_peers=2, clock=lambda: 10)
        guard.failure("peer-a")
        guard.failure("peer-b")
        guard.failure("peer-c")
        self.assertEqual(len(guard.peers), 2)
        self.assertNotIn("peer-a", guard.peers)
        self.assertTrue(guard.denied("peer-c"))
        guard.clear("peer-c")
        self.assertFalse(guard.denied("peer-c"))

    def test_invalid_configuration(self):
        for values in ({"limit": 0}, {"window_seconds": 0}, {"max_peers": 0}):
            with self.assertRaises(ValueError):
                AuthFailureGuard(**values)


if __name__ == "__main__":
    unittest.main()
