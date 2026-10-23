import math
from typing import Dict, List, Optional, Tuple
from .models import (
    BranchOrbit,
    CelestialGalaxyPayload,
    CommitNode,
    ConstellationFilament,
    StarClassification,
    Vector3,
)

# Branch color palette for celestial orbit rings
BRANCH_COLOR_PALETTE = [
    "#00E5FF",  # Cyan (Main sequence / primary)
    "#FF9100",  # Amber orange
    "#76FF03",  # Neon green
    "#E040FB",  # Violet
    "#FF1744",  # Crimson
    "#00E676",  # Emerald
    "#FFD600",  # Canary gold
    "#2979FF",  # Deep sapphire
]


class OrbitalPhysicsEngine:
    """
    Calculates Keplerian orbital mechanics, 3D celestial coordinates,
    stellar classifications, and constellation filaments for a Git repository.
    """

    def __init__(
        self,
        base_radius: float = 35.0,
        radial_step: float = 25.0,
    ):
        self.base_radius = base_radius
        self.radial_step = radial_step

    def classify_star(self, commit: CommitNode) -> Tuple[StarClassification, str, float, float]:
        """
        Calculates stellar classification, color, size, and luminosity.
        Returns: (classification, hex_color, size, luminosity)
        """
        if commit.is_root:
            return (
                StarClassification.SUPERMASSIVE_SUN,
                "#FFB300",  # Solar gold
                4.2,
                3.5,
            )

        if commit.tags:
            return (
                StarClassification.MILESTONE_PULSAR,
                "#E040FB",  # Pulsar purple
                2.8,
                2.4,
            )

        churn = commit.total_churn
        if churn >= 500 or commit.is_merge:
            return (
                StarClassification.BLUE_SUPERGIANT,
                "#00E5FF",  # Hot blue / electric cyan
                2.2,
                2.0,
            )
        elif churn >= 200:
            return (
                StarClassification.WHITE_DWARF,
                "#FFFFFF",  # Radiant white
                1.6,
                1.5,
            )
        elif churn >= 50:
            return (
                StarClassification.YELLOW_STAR,
                "#FFD54F",  # Solar yellow
                1.2,
                1.2,
            )
        else:
            return (
                StarClassification.RED_DWARF,
                "#FF5252",  # Deep red dwarf
                0.85,
                0.8,
            )

    def compute_galaxy(
        self,
        repo_name: str,
        commits: List[CommitNode],
        root_hash: str,
        primary_branch: str,
        all_branches: Optional[List[str]] = None,
    ) -> CelestialGalaxyPayload:
        if not commits:
            return CelestialGalaxyPayload(
                repo_name=repo_name,
                root_hash="",
                main_branch=primary_branch,
                total_commits=0,
                total_branches=0,
                total_tags=0,
                time_range_start=0,
                time_range_end=0,
                branches=[],
                stars=[],
                filaments=[],
            )

        # 1. Timeline normalization
        timestamps = [c.timestamp for c in commits]
        t_min = min(timestamps)
        t_max = max(timestamps)
        t_span = max(1, t_max - t_min)

        for c in commits:
            c.normalized_time = (c.timestamp - t_min) / t_span

        # 2. Distinct branches and grouping
        branch_names: List[str] = [primary_branch]
        # Include branches passed or present in commits
        candidate_branches = (all_branches or []) + [c.branch for c in commits]
        for b in candidate_branches:
            if b and b not in branch_names:
                branch_names.append(b)

        commits_by_branch: Dict[str, List[CommitNode]] = {b: [] for b in branch_names}
        for c in commits:
            commits_by_branch.setdefault(c.branch, []).append(c)

        # 3. Compute Branch Orbits (Keplerian parameters)
        branch_orbits: List[BranchOrbit] = []
        branch_orbit_map: Dict[str, BranchOrbit] = {}

        for idx, b_name in enumerate(branch_names):
            # Primary branch has inner orbit, feature branches have outer orbits
            a = self.base_radius + idx * self.radial_step
            # Natural subtle eccentricity
            e = 0.08 + (0.04 * (idx % 5))
            b = a * math.sqrt(max(0.01, 1.0 - e * e))
            # Inclination angle in radians
            if idx == 0:
                inclination = 0.0
                node = 0.0
            else:
                sign = 1.0 if idx % 2 == 1 else -1.0
                inclination = sign * (0.15 + (0.05 * (idx % 4)))
                node = (2.0 * math.pi * idx) / max(1, len(branch_names))

            color = BRANCH_COLOR_PALETTE[idx % len(BRANCH_COLOR_PALETTE)]

            orbit = BranchOrbit(
                name=b_name,
                semi_major_axis=round(a, 2),
                semi_minor_axis=round(b, 2),
                eccentricity=round(e, 4),
                inclination_rad=round(inclination, 4),
                ascending_node_rad=round(node, 4),
                color=color,
                commit_count=len(commits_by_branch.get(b_name, [])),
            )
            branch_orbits.append(orbit)
            branch_orbit_map[b_name] = orbit

        # 4. Compute 3D Coordinates & Stellar Classifications for Commits
        hash_to_node: Dict[str, CommitNode] = {c.hash: c for c in commits}

        for b_name, b_commits in commits_by_branch.items():
            orbit = branch_orbit_map[b_name]
            a = orbit.semi_major_axis
            e = orbit.eccentricity
            inc = orbit.inclination_rad
            node = orbit.ascending_node_rad

            count = len(b_commits)
            for idx, c in enumerate(b_commits):
                # Classify star
                s_class, color, size, lum = self.classify_star(c)
                c.star_class = s_class
                c.star_color = color
                c.star_size = size
                c.star_luminosity = lum

                # Root commit sits directly at galactic supermassive core
                if c.is_root:
                    c.position_3d = Vector3(x=0.0, y=0.0, z=0.0)
                    c.orbit_radius = 0.0
                    c.orbit_angle_rad = 0.0
                    continue

                # Orbital true anomaly theta
                if count > 1:
                    theta = (2.0 * math.pi * idx / count) + (c.normalized_time * 0.5)
                else:
                    theta = c.normalized_time * 2.0 * math.pi

                # Keplerian radius r(theta) = a * (1 - e^2) / (1 + e * cos(theta))
                r = (a * (1.0 - e * e)) / (1.0 + e * math.cos(theta))
                c.orbit_radius = round(r, 2)
                c.orbit_angle_rad = round(theta, 4)

                # 2D coordinates in orbital plane
                x_prime = r * math.cos(theta)
                y_prime = r * math.sin(theta)

                # 3D Euler rotation by inclination (inc) and ascending node (node)
                x = x_prime * math.cos(node) - y_prime * math.cos(inc) * math.sin(node)
                y = x_prime * math.sin(node) + y_prime * math.cos(inc) * math.cos(node)
                z = y_prime * math.sin(inc)

                # Micro vertical drift based on commit churn to give realistic depth
                churn_z_wobble = min(6.0, math.log10(max(1, c.total_churn) + 1.0) * 1.5)
                z += (churn_z_wobble if idx % 2 == 0 else -churn_z_wobble)

                c.position_3d = Vector3(
                    x=round(x, 2),
                    y=round(y, 2),
                    z=round(z, 2),
                )

        # 5. Build Constellation Filaments (DAG parent-child links)
        filaments: List[ConstellationFilament] = []
        all_tags_count = sum(len(c.tags) for c in commits)

        for c in commits:
            for p_hash in c.parents:
                p_node = hash_to_node.get(p_hash)
                if p_node:
                    filaments.append(
                        ConstellationFilament(
                            source_hash=p_node.hash,
                            target_hash=c.hash,
                            source_pos=p_node.position_3d,
                            target_pos=c.position_3d,
                            is_merge_filament=c.is_merge,
                        )
                    )

        return CelestialGalaxyPayload(
            repo_name=repo_name,
            root_hash=root_hash,
            main_branch=primary_branch,
            total_commits=len(commits),
            total_branches=len(branch_names),
            total_tags=all_tags_count,
            time_range_start=t_min,
            time_range_end=t_max,
            branches=branch_orbits,
            stars=commits,
            filaments=filaments,
        )
