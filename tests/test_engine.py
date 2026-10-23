import os
import shutil
import subprocess
import tempfile
import unittest

from engine.git_parser import GitRepositoryParser
from engine.orbital_physics import OrbitalPhysicsEngine
from engine.models import StarClassification
from fastapi.testclient import TestClient
from server import app


class TestGitConstellationEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.mkdtemp(prefix="test_git_constellation_")

        def run_git(*args):
            subprocess.run(
                ["git"] + list(args),
                cwd=cls.temp_dir,
                capture_output=True,
                text=True,
                check=True,
            )

        # 1. Initialize repo
        run_git("init", "-b", "main")
        run_git("config", "user.name", "Test Stellar Architect")
        run_git("config", "user.email", "architect@constellation.space")

        # 2. Root commit (Genesis / Sun)
        readme_path = os.path.join(cls.temp_dir, "README.md")
        with open(readme_path, "w") as f:
            f.write("# Git Constellation Test\nInitial universe genesis.\n")
        run_git("add", "README.md")
        run_git("commit", "-m", "Initial commit: Genesis of Constellation")

        # 3. Small fix commit (Red Dwarf)
        with open(readme_path, "a") as f:
            f.write("A small cosmic dust note.\n")
        run_git("add", "README.md")
        run_git("commit", "-m", "docs: small note")

        # 4. Feature branch & high churn commit (Blue Supergiant)
        run_git("checkout", "-b", "feature/quantum-drive")
        engine_path = os.path.join(cls.temp_dir, "quantum.py")
        with open(engine_path, "w") as f:
            for i in range(600):
                f.write(f"def quantum_node_{i}(): return {i} ** 2\n")
        run_git("add", "quantum.py")
        run_git("commit", "-m", "feat: implement massive quantum drive engine")

        # 5. Dedicated milestone commit on main (Milestone Pulsar)
        run_git("checkout", "main")
        with open(readme_path, "a") as f:
            f.write("v0.1.0 release notes.\n")
        run_git("add", "README.md")
        run_git("commit", "-m", "chore: release v0.1.0 milestone")
        run_git("tag", "-a", "v0.1.0", "-m", "First release milestone")

        # 6. Merge feature branch into main
        run_git("merge", "--no-ff", "feature/quantum-drive", "-m", "Merge branch 'feature/quantum-drive'")

        cls.parser = GitRepositoryParser(cls.temp_dir)
        cls.physics = OrbitalPhysicsEngine(base_radius=40.0, radial_step=30.0)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.temp_dir, ignore_errors=True)

    def test_repo_detection_and_branches(self):
        self.assertEqual(self.parser.get_primary_branch(), "main")
        branches = self.parser.get_branches()
        self.assertIn("main", branches)
        self.assertIn("feature/quantum-drive", branches)

    def test_commit_parsing_and_churn(self):
        commits, root_hash = self.parser.parse_commits()
        self.assertGreaterEqual(len(commits), 5)

        # Check root commit
        root_commit = next(c for c in commits if c.hash == root_hash)
        self.assertTrue(root_commit.is_root)
        self.assertEqual(len(root_commit.parents), 0)

        # Check merge commit
        merge_commit = next(c for c in commits if c.is_merge)
        self.assertGreater(len(merge_commit.parents), 1)

        # Check tagged commit
        tagged_commits = [c for c in commits if "v0.1.0" in c.tags]
        self.assertEqual(len(tagged_commits), 1)

        # Check churn
        high_churn_commit = next(c for c in commits if "massive quantum drive" in c.message)
        self.assertGreaterEqual(high_churn_commit.total_churn, 500)

    def test_orbital_physics_and_galaxy_payload(self):
        commits, root_hash = self.parser.parse_commits()
        primary_branch = self.parser.get_primary_branch()
        branches = self.parser.get_branches()
        galaxy = self.physics.compute_galaxy(
            repo_name="test-repo",
            commits=commits,
            root_hash=root_hash,
            primary_branch=primary_branch,
            all_branches=branches,
        )

        self.assertEqual(galaxy.repo_name, "test-repo")
        self.assertGreaterEqual(galaxy.total_commits, 5)
        self.assertGreaterEqual(len(galaxy.branches), 2)
        self.assertGreaterEqual(len(galaxy.filaments), 4)

        # Find classifications
        root_star = next(s for s in galaxy.stars if s.hash == root_hash)
        self.assertEqual(root_star.star_class, StarClassification.SUPERMASSIVE_SUN)
        self.assertEqual(root_star.position_3d.x, 0.0)
        self.assertEqual(root_star.position_3d.y, 0.0)
        self.assertEqual(root_star.position_3d.z, 0.0)

        pulsar_star = next(s for s in galaxy.stars if "v0.1.0" in s.tags)
        self.assertEqual(pulsar_star.star_class, StarClassification.MILESTONE_PULSAR)

        supergiant_star = next(s for s in galaxy.stars if "massive quantum drive" in s.message)
        self.assertEqual(supergiant_star.star_class, StarClassification.BLUE_SUPERGIANT)

        # Check filaments (DAG linkages)
        filament_targets = {f.target_hash for f in galaxy.filaments}
        merge_commit = next(c for c in commits if c.is_merge)
        self.assertIn(merge_commit.hash, filament_targets)

    def test_api_endpoint(self):
        client = TestClient(app)

        # Health endpoint
        res = client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

        # Galaxy endpoint with repo_path parameter
        res = client.get(f"/api/galaxy?repo_path={self.temp_dir}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("stars", data)
        self.assertIn("branches", data)
        self.assertIn("filaments", data)
        self.assertEqual(data["main_branch"], "main")

    def test_invalid_repo_error_handling(self):
        invalid_dir = tempfile.mkdtemp(prefix="not_a_git_repo_")
        try:
            with self.assertRaises(ValueError):
                GitRepositoryParser(invalid_dir)

            client = TestClient(app)
            res = client.get(f"/api/galaxy?repo_path={invalid_dir}")
            self.assertEqual(res.status_code, 400)
        finally:
            shutil.rmtree(invalid_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
