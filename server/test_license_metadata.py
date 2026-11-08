"""Repository-specific license and third-party provenance checks."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class LicenseMetadataTests(unittest.TestCase):
    def test_complete_recognized_license_is_present(self):
        text = (ROOT / "LICENSE").read_text(encoding="utf-8")
        self.assertIn("Apache License", text)
        self.assertIn("Version 2.0, January 2004", text)
        self.assertIn("END OF TERMS AND CONDITIONS", text)
        self.assertGreater(len(text), 11000)

    def test_provenance_notice_preserves_gc_ui_boundary(self):
        notice = (ROOT / "NOTICE").read_text(encoding="utf-8")
        self.assertIn("GoreeCloud Memos", notice)
        self.assertIn("Copyright 2026 GoreeCloud", notice)
        self.assertIn("https://github.com/GoreeCloud/gc-ui", notice)
        self.assertIn("Apache-2.0", notice)
        self.assertIn("@playwright/test", notice)

    def test_readme_and_private_dev_package_agree_on_license(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("[Apache License 2.0](LICENSE)", readme)
        self.assertIn("[NOTICE](NOTICE)", readme)
        data = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        self.assertTrue(data["private"])
        self.assertEqual(data["license"], "Apache-2.0")


if __name__ == "__main__":
    unittest.main()
