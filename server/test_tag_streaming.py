"""Tag-filtered feed scans cursor rows lazily while preserving full result semantics."""
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from app import Store


class TaggedFeedStreamingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "notes.sqlite"
        self.store = Store(self.path)

    def insert(self, count, content, first=0):
        origin = datetime(2026, 11, 1, tzinfo=timezone.utc)
        rows = []
        for i in range(first, first + count):
            timestamp = (origin + timedelta(seconds=i)).isoformat()
            rows.append((f"test-{i:05d}", "", content, "paper",
                         0, 0, 0, timestamp, timestamp, 1))
        with sqlite3.connect(self.path) as db:
            db.executemany("INSERT INTO memos VALUES (?,?,?,?,?,?,?,?,?,?)", rows)

    def test_all_matching_notes_stop_serializing_at_feed_cap(self):
        self.insert(2103, "Private memo #team")
        with patch.object(Store, "serialize", wraps=Store.serialize) as serialized:
            notes = self.store.list("active", tag="team")
        self.assertEqual(len(notes), 2000)
        self.assertEqual(serialized.call_count, 2000)
        self.assertEqual(notes[0]["id"], "test-02102")
        self.assertEqual(notes[-1]["id"], "test-00103")

    def test_matching_note_beyond_two_thousand_unrelated_is_not_lost(self):
        self.insert(1, "Important #priority", first=0)
        self.insert(2100, "Unrelated #other", first=1)
        notes = self.store.list("active", tag="priority")
        self.assertEqual([note["id"] for note in notes], ["test-00000"])
        self.assertEqual(len(self.store.list("active")), 2000)

    def test_tag_and_text_filters_remain_combined(self):
        self.insert(1, "alpha #work", first=0)
        self.insert(1, "beta #work", first=1)
        self.insert(1, "alpha #home", first=2)
        found = self.store.list("active", query="alpha", tag="work")
        self.assertEqual([m["id"] for m in found], ["test-00000"])


if __name__ == "__main__":
    unittest.main()
