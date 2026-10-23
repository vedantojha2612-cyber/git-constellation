import argparse
import os
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from engine.git_parser import GitRepositoryParser
from engine.orbital_physics import OrbitalPhysicsEngine
from engine.models import CelestialGalaxyPayload

app = FastAPI(
    title="Git Constellation Engine",
    description="3D Celestial Git DAG and Keplerian Orbital Mechanics API",
    version="1.0.0",
)

# Enable CORS for frontend visualizer
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

physics_engine = OrbitalPhysicsEngine()
_ACTIVE_REPO_PATH: str = os.path.abspath(".")


def set_active_repo(path: str):
    global _ACTIVE_REPO_PATH
    _ACTIVE_REPO_PATH = os.path.abspath(os.path.expanduser(path))


def get_active_repo() -> str:
    return _ACTIVE_REPO_PATH


class GalaxyRequest(BaseModel):
    repo_path: Optional[str] = None


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Git Constellation Engine", "active_repo": get_active_repo()}


@app.get("/api/galaxy", response_model=CelestialGalaxyPayload)
def get_galaxy(repo_path: Optional[str] = Query(default=None, description="Path to local Git repository")):
    """
    Parses Git repository DAG and calculates 3D Keplerian celestial physics.
    """
    target_path = repo_path if (repo_path is not None and repo_path != "") else get_active_repo()
    resolved_path = os.path.abspath(os.path.expanduser(target_path))
    if not os.path.exists(resolved_path):
        raise HTTPException(status_code=404, detail=f"Repository path does not exist: {resolved_path}")

    try:
        parser = GitRepositoryParser(resolved_path)
        repo_name = parser.get_repo_name()
        primary_branch = parser.get_primary_branch()
        branches = parser.get_branches()
        commits, root_hash = parser.parse_commits()

        galaxy = physics_engine.compute_galaxy(
            repo_name=repo_name,
            commits=commits,
            root_hash=root_hash,
            primary_branch=primary_branch,
            all_branches=branches,
        )
        return galaxy
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate constellation: {str(e)}")


@app.post("/api/galaxy", response_model=CelestialGalaxyPayload)
def post_galaxy(req: GalaxyRequest):
    return get_galaxy(repo_path=req.repo_path)


# Mount static web visualizer at root if directory exists
WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
if os.path.isdir(WEB_DIR):
    app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")


if __name__ == "__main__":
    import uvicorn

    cli_parser = argparse.ArgumentParser(description="Git Constellation Engine Server")
    cli_parser.add_argument("--repo", default=".", help="Path to Git repository")
    cli_parser.add_argument("--host", default="127.0.0.1", help="Host interface")
    cli_parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    cli_parser.add_argument("--reload", action="store_true", help="Auto-reload for development")

    args = cli_parser.parse_args()
    set_active_repo(args.repo)
    print(f"🌌 Starting Git Constellation Engine on http://{args.host}:{args.port}")
    print(f"🔭 Monitoring repo: {get_active_repo()}")

    uvicorn.run("server:app", host=args.host, port=args.port, reload=args.reload)
