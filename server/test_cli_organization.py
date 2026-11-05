"""CLI flag updates preserve memo text, unrelated state and optimistic concurrency."""
import contextlib
import importlib.util
import io
import json
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

from app import Store, create_server


ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("memos_cli_states", ROOT / "cli" / "memos.py")
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)

TOKEN = "test-cli-states-token-with-sufficient-length"
MEMO_ID = "123e4567-e89b-12d3-a456-426614174000"
PATH = "/api/v1/memos/" + MEMO_ID


class OrganizationCommandTests(unittest.TestCase):
    def test_all_actions_patch_only_requested_flag_and_version(self):
        for action, (field, wanted) in cli.STATE_OPERATIONS.items():
            with self.subTest(command=action):
                current = {"version": 4, field: not wanted,
                           "content": "Retain this", "pinned": False}
                current[field] = not wanted
                after = {**current, field: wanted, "version": 5}
                with patch.object(cli, "request", side_effect=[current, after]) as req:
                    changed = cli.change_memo_state("http://127.0.0.1:8765",
                                                    TOKEN, MEMO_ID, action)
                self.assertEqual(changed, after)
                self.assertEqual(req.call_count, 2)
                self.assertEqual(req.call_args_list[0].args[2], PATH)
                self.assertEqual(req.call_args_list[1].args[2:], (
                    PATH, "PATCH", {"version": 4, field: wanted}
                ))

    def test_noop_does_not_write_or_create_revision(self):
        for action, (field, wanted) in cli.STATE_OPERATIONS.items():
            current = {"version": 8, field: wanted}
            with self.subTest(command=action):
                with patch.object(cli, "request", return_value=current) as req:
                    self.assertEqual(cli.change_memo_state(
                        "http://127.0.0.1:8765", TOKEN, MEMO_ID, action
                    ), current)
                    self.assertEqual(req.call_count, 1)

    def test_invalid_uuid_and_unknown_command_fail_before_network(self):
        with patch.object(cli, "request") as req:
            with self.assertRaisesRegex(ValueError, "canonical lowercase memo UUID"):
                cli.change_memo_state("http://127.0.0.1", TOKEN,
                                      MEMO_ID + "/revisions", "trash")
            with self.assertRaisesRegex(ValueError, "Unknown memo state action"):
                cli.change_memo_state("http://127.0.0.1", TOKEN,
                                      MEMO_ID, "permanently-delete")
            req.assert_not_called()

    def test_invalid_existing_state_refuses_write(self):
        with patch.object(cli, "request", return_value={
            "version": 3, "archived": "false"
        }) as req:
            with self.assertRaisesRegex(ValueError, "missing or invalid"):
                cli.change_memo_state("http://127.0.0.1", TOKEN, MEMO_ID, "archive")
            self.assertEqual(req.call_count, 1)

    def test_conflict_is_exposed_without_automatic_retry(self):
        with patch.object(cli, "request", side_effect=[
            {"version": 2, "pinned": False},
            RuntimeError("Version conflict (409)")
        ]) as req:
            with self.assertRaisesRegex(RuntimeError, "409"):
                cli.change_memo_state("http://127.0.0.1", TOKEN, MEMO_ID, "pin")
            self.assertEqual(req.call_count, 2)

    def test_cli_parser_routes_one_action_and_outputs_json(self):
        with patch.dict(os.environ, {"GOREE_MEMOS_TOKEN": TOKEN}):
            with patch.object(sys, "argv", ["memos.py", "trash", MEMO_ID]):
                with patch.object(cli, "change_memo_state", return_value={
                    "deleted": True, "id": MEMO_ID
                }) as change:
                    output = io.StringIO()
                    with contextlib.redirect_stdout(output):
                        cli.main()
        self.assertEqual(json.loads(output.getvalue())["deleted"], True)
        self.assertEqual(change.call_args.args[3], "trash")

    def test_live_api_round_trip_preserves_text_and_prior_revisions(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "notes.sqlite"
            store = Store(path)
            memo = store.create({"title": "Protected", "content": "Keep this note"})
            server = create_server("127.0.0.1", 0, path, TOKEN)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                base = "http://127.0.0.1:{}".format(server.server_port)
                for expected_version, action in enumerate(
                    ("pin", "archive", "trash", "restore", "unarchive", "unpin"), 2
                ):
                    changed = cli.change_memo_state(base, TOKEN, memo["id"], action)
                    self.assertEqual(changed["version"], expected_version)
                    self.assertEqual(changed["content"], memo["content"])
                    self.assertEqual(changed["title"], memo["title"])
                # No-op does not create a revision or change the current version.
                repeat = cli.change_memo_state(base, TOKEN, memo["id"], "unpin")
                self.assertEqual(repeat["version"], 7)
                saved = cli.request(base, TOKEN, cli.memo_path(memo["id"]))
                self.assertFalse(saved["deleted"])
                self.assertFalse(saved["archived"])
                self.assertFalse(saved["pinned"])
                revisions = cli.request(
                    base, TOKEN, cli.memo_path(memo["id"]) + "/revisions"
                )
                self.assertEqual(len(revisions), 6)
                self.assertEqual([r["version"] for r in revisions],
                                 [6, 5, 4, 3, 2, 1])
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
