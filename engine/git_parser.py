import os
import subprocess
from typing import Dict, List, Optional, Set, Tuple
from .models import CommitNode


class GitRepositoryParser:
    """
    Parses a local Git repository DAG, branches, tags, and commit churn metrics.
    """

    def __init__(self, repo_path: str):
        self.repo_path = os.path.abspath(repo_path)
        if not self._is_git_repo():
            raise ValueError(f"Target directory is not a valid Git repository: {self.repo_path}")

    def _is_git_repo(self) -> bool:
        try:
            res = subprocess.run(
                ["git", "rev-parse", "--is-inside-work-tree"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                check=False,
            )
            return res.returncode == 0 and res.stdout.strip() == "true"
        except Exception:
            return False

    def get_repo_name(self) -> str:
        try:
            res = subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                check=True,
            )
            return os.path.basename(res.stdout.strip())
        except Exception:
            return os.path.basename(self.repo_path)

    def get_primary_branch(self) -> str:
        """Determines the primary branch (main, master, or current HEAD)."""
        try:
            res = subprocess.run(
                ["git", "symbolic-ref", "--short", "HEAD"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                check=False,
            )
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout.strip()
        except Exception:
            pass

        try:
            res = subprocess.run(
                ["git", "branch", "--list", "main", "master"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                check=False,
            )
            branches = [b.strip().lstrip("* ") for b in res.stdout.splitlines() if b.strip()]
            if "main" in branches:
                return "main"
            if "master" in branches:
                return "master"
        except Exception:
            pass

        return "main"

    def get_branches(self) -> List[str]:
        """Returns list of local branch names."""
        try:
            res = subprocess.run(
                ["git", "branch", "--format=%(refname:short)"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                check=True,
            )
            branches = [b.strip() for b in res.stdout.splitlines() if b.strip()]
            return branches if branches else ["main"]
        except Exception:
            return ["main"]

    def get_tags(self) -> Dict[str, List[str]]:
        """Returns map of commit_hash -> list of tag names."""
        tag_map: Dict[str, List[str]] = {}
        try:
            res = subprocess.run(
                ["git", "show-ref", "--tags"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                check=False,
            )
            if res.returncode == 0 and res.stdout:
                for line in res.stdout.splitlines():
                    parts = line.strip().split()
                    if len(parts) == 2:
                        commit_hash = parts[0]
                        tag_ref = parts[1].replace("refs/tags/", "")
                        tag_map.setdefault(commit_hash, []).append(tag_ref)
        except Exception:
            pass
        return tag_map

    def parse_commits(self) -> Tuple[List[CommitNode], str]:
        """
        Extracts all commits, churn stats, parent-child links, and ref decorators.
        Returns: (commits_list, root_hash)
        """
        delimiter = "---GIT_CONSTELLATION_RECORD---"
        format_str = f"{delimiter}%n%H%n%h%n%an%n%ae%n%at%n%aI%n%P%n%D%n%s"

        cmd = [
            "git",
            "log",
            "--all",
            "--topo-order",
            f"--format=format:{format_str}",
            "--numstat",
        ]

        res = subprocess.run(
            cmd,
            cwd=self.repo_path,
            capture_output=True,
            text=True,
            check=True,
        )

        output = res.stdout
        records = output.split(delimiter)
        commits: List[CommitNode] = []
        tags_map = self.get_tags()

        # Build branch head mapping
        branch_heads: Dict[str, str] = {}
        for b in self.get_branches():
            try:
                b_res = subprocess.run(
                    ["git", "rev-parse", b],
                    cwd=self.repo_path,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                if b_res.returncode == 0 and b_res.stdout.strip():
                    branch_heads[b] = b_res.stdout.strip()
            except Exception:
                pass

        primary_branch = self.get_primary_branch()

        for rec in records:
            rec = rec.strip()
            if not rec:
                continue

            lines = rec.split("\n")
            if len(lines) < 9:
                continue

            c_hash = lines[0].strip()
            short_hash = lines[1].strip()
            author_name = lines[2].strip()
            author_email = lines[3].strip()
            timestamp = int(lines[4].strip()) if lines[4].strip().isdigit() else 0
            date_iso = lines[5].strip()
            parents_str = lines[6].strip()
            parents = parents_str.split() if parents_str else []
            ref_names = lines[7].strip()
            subject = lines[8].strip()

            # Parse numstat churn
            added = 0
            deleted = 0
            for stat_line in lines[9:]:
                stat_line = stat_line.strip()
                if not stat_line:
                    continue
                parts = stat_line.split("\t")
                if len(parts) >= 2:
                    add_str, del_str = parts[0], parts[1]
                    if add_str.isdigit():
                        added += int(add_str)
                    if del_str.isdigit():
                        deleted += int(del_str)

            commit_tags = list(tags_map.get(c_hash, []))
            if ref_names:
                for ref_token in ref_names.split(","):
                    ref_token = ref_token.strip()
                    if ref_token.startswith("tag: "):
                        t_name = ref_token.replace("tag: ", "").strip()
                        if t_name not in commit_tags:
                            commit_tags.append(t_name)

            assigned_branch = primary_branch
            if ref_names:
                for ref_token in ref_names.split(","):
                    clean_ref = ref_token.strip().replace("HEAD -> ", "").replace("origin/", "")
                    if clean_ref in branch_heads:
                        assigned_branch = clean_ref
                        break

            is_root = len(parents) == 0
            is_merge = len(parents) > 1

            node = CommitNode(
                hash=c_hash,
                short_hash=short_hash,
                author_name=author_name,
                author_email=author_email,
                timestamp=timestamp,
                date_iso=date_iso,
                message=subject,
                parents=parents,
                branch=assigned_branch,
                tags=commit_tags,
                lines_added=added,
                lines_deleted=deleted,
                total_churn=added + deleted,
                is_merge=is_merge,
                is_root=is_root,
            )
            commits.append(node)

        commits.sort(key=lambda c: c.timestamp)

        # First-parent lineage for primary_branch
        commit_by_hash = {c.hash: c for c in commits}
        primary_head = branch_heads.get(primary_branch)
        main_spine: Set[str] = set()

        curr = primary_head
        while curr and curr in commit_by_hash:
            main_spine.add(curr)
            node = commit_by_hash[curr]
            if node.parents:
                curr = node.parents[0]  # First parent strictly
            else:
                break

        for h in main_spine:
            if h in commit_by_hash:
                commit_by_hash[h].branch = primary_branch

        # Attribute side branches
        for b_name, b_hash in branch_heads.items():
            if b_name == primary_branch:
                continue
            stack = [b_hash]
            visited = set()
            while stack:
                h = stack.pop()
                if h in visited or h in main_spine:
                    continue
                visited.add(h)
                node = commit_by_hash.get(h)
                if node:
                    node.branch = b_name
                    stack.extend(node.parents)

        root_hash = commits[0].hash if commits else ""
        for c in commits:
            if c.is_root:
                root_hash = c.hash
                c.branch = primary_branch
                break

        return commits, root_hash
