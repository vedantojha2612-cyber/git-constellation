#!/usr/bin/env python3
"""
Git Constellation CLI
Launches the 3D celestial repository visualizer with one command.
"""

import argparse
import os
import sys
import threading
import time
import webbrowser
import uvicorn

# Ensure repository root is in python path
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from engine.git_parser import GitRepositoryParser
from server import app, set_active_repo

BANNER = r"""
  🌌  GIT CONSTELLATION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  3D Celestial Solar System & Keplerian Orbital Mechanics for Git
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""


def is_git_repo(path: str) -> bool:
    """Checks if target path is a git repository."""
    git_dir = os.path.join(path, ".git")
    if os.path.exists(git_dir):
        return True
    try:
        import subprocess
        res = subprocess.run(
            ["git", "-C", path, "rev-parse", "--is-inside-work-tree"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
        return res.returncode == 0 and res.stdout.strip() == "true"
    except Exception:
        return False


def open_browser_delayed(url: str, delay: float = 0.8):
    """Opens browser after server has started."""
    time.sleep(delay)
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"⚠️  Could not automatically launch browser: {e}")
        print(f"👉 Please open {url} manually.")


def parse_args():
    parser = argparse.ArgumentParser(
        prog="git-constellation",
        description="Transform any Git repository into an interactive 3D solar system of commits.",
    )
    parser.add_argument(
        "repo",
        nargs="?",
        default=".",
        help="Path to local Git repository (defaults to current directory)",
    )
    parser.add_argument(
        "--port",
        "-p",
        type=int,
        default=8000,
        help="Port to run the visualizer server on (default: 8000)",
    )
    parser.add_argument(
        "--host",
        "-H",
        default="127.0.0.1",
        help="Host address to bind to (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--no-browser",
        "-n",
        action="store_true",
        help="Do not automatically open the default web browser",
    )
    parser.add_argument(
        "--version",
        "-v",
        action="version",
        version="git-constellation 1.0.0",
        help="Show program version",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    repo_path = os.path.abspath(os.path.expanduser(args.repo))

    print(BANNER)

    if not os.path.isdir(repo_path):
        print(f"❌ Error: Directory does not exist: {repo_path}")
        sys.exit(1)

    if not is_git_repo(repo_path):
        print(f"⚠️  Notice: '{repo_path}' is not a Git repository.")
        print("    Running visualizer in Celestial Demo Mode with bundled sample galaxies.")
    else:
        try:
            parser = GitRepositoryParser(repo_path)
            repo_name = parser.get_repo_name()
            primary_branch = parser.get_primary_branch()
            print(f"  ⭐ Repository : {repo_name} ({repo_path})")
            print(f"  🪐 Core Orbit : {primary_branch}")
        except Exception as e:
            print(f"  ⭐ Repository : {repo_path}")
            print(f"  ⚠️ Note       : Partial Git DAG scan: {e}")

    # Set active repo for the server
    set_active_repo(repo_path)

    url = f"http://{args.host}:{args.port}"
    print(f"  🚀 Visualizer : {url}")
    print(f"  🔭 API Cosmos : {url}/api/galaxy")
    print("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  Press Ctrl+C to exit the celestial simulation.\n")

    if not args.no_browser:
        threading.Thread(target=open_browser_delayed, args=(url,), daemon=True).start()

    config = uvicorn.Config(
        app=app,
        host=args.host,
        port=args.port,
        log_level="warning",
    )
    server = uvicorn.Server(config)

    try:
        server.run()
    except KeyboardInterrupt:
        print("\n✨ Shutting down Git Constellation. Safe travels across the cosmos!")
        sys.exit(0)


if __name__ == "__main__":
    main()
