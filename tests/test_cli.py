import os
import shutil
import subprocess
import tempfile
import unittest
from fastapi.testclient import TestClient
from cli import is_git_repo
from server import app, set_active_repo, get_active_repo


class TestGitConstellationCLI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_git_dir = tempfile.mkdtemp(prefix="test_cli_git_")
        subprocess.run(["git", "init", "-b", "main"], cwd=cls.temp_git_dir, capture_output=True, check=True)
        cls.temp_non_git_dir = tempfile.mkdtemp(prefix="test_cli_nongit_")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.temp_git_dir, ignore_errors=True)
        shutil.rmtree(cls.temp_non_git_dir, ignore_errors=True)

    def test_is_git_repo(self):
        self.assertTrue(is_git_repo(self.temp_git_dir))
        self.assertFalse(is_git_repo(self.temp_non_git_dir))

    def test_active_repo_setting(self):
        set_active_repo("/tmp")
        self.assertEqual(get_active_repo(), "/tmp")

    def test_static_web_serving(self):
        client = TestClient(app)
        res = client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Git Constellation", res.text)
        self.assertIn("canvas-container", res.text)

    def test_static_asset_serving(self):
        client = TestClient(app)
        res = client.get("/style.css")
        self.assertEqual(res.status_code, 200)
        self.assertIn("glass-panel", res.text)

        res = client.get("/app.js")
        self.assertEqual(res.status_code, 200)
        self.assertIn("loadGalaxy", res.text)


if __name__ == "__main__":
    unittest.main()
