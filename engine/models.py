from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class StarClassification(str, Enum):
    SUPERMASSIVE_SUN = "SUPERMASSIVE_SUN"       # Central anchor (root / main tip)
    BLUE_SUPERGIANT = "BLUE_SUPERGIANT"         # Massive churn > 500 lines or major merges
    WHITE_DWARF = "WHITE_DWARF"                 # High churn 200 - 500 lines
    YELLOW_STAR = "YELLOW_STAR"                 # Standard commits 50 - 200 lines
    RED_DWARF = "RED_DWARF"                     # Small fixes / tweaks < 50 lines
    MILESTONE_PULSAR = "MILESTONE_PULSAR"       # Tagged release milestone


class Vector3(BaseModel):
    x: float
    y: float
    z: float


class CommitNode(BaseModel):
    hash: str
    short_hash: str
    author_name: str
    author_email: str
    timestamp: int
    date_iso: str
    message: str
    parents: List[str] = Field(default_factory=list)
    branch: str = "main"
    tags: List[str] = Field(default_factory=list)
    lines_added: int = 0
    lines_deleted: int = 0
    total_churn: int = 0
    is_merge: bool = False
    is_root: bool = False
    star_class: StarClassification = StarClassification.YELLOW_STAR
    star_color: str = "#FFD54F"
    star_size: float = 1.0
    star_luminosity: float = 1.0
    orbit_radius: float = 0.0
    orbit_angle_rad: float = 0.0
    position_3d: Vector3 = Field(default_factory=lambda: Vector3(x=0.0, y=0.0, z=0.0))
    normalized_time: float = 0.0


class BranchOrbit(BaseModel):
    name: str
    semi_major_axis: float
    semi_minor_axis: float
    eccentricity: float
    inclination_rad: float
    ascending_node_rad: float
    color: str
    commit_count: int


class ConstellationFilament(BaseModel):
    source_hash: str
    target_hash: str
    source_pos: Vector3
    target_pos: Vector3
    is_merge_filament: bool = False


class CelestialGalaxyPayload(BaseModel):
    repo_name: str
    root_hash: str
    main_branch: str
    total_commits: int
    total_branches: int
    total_tags: int
    time_range_start: int
    time_range_end: int
    branches: List[BranchOrbit] = Field(default_factory=list)
    stars: List[CommitNode] = Field(default_factory=list)
    filaments: List[ConstellationFilament] = Field(default_factory=list)
