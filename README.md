<div align="center">

# 🌌 Git Constellation
### *Turn your Git repository into a living 3D solar system where branches are planetary orbits and commits are textured celestial worlds obeying Keplerian physics.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-brightgreen.svg)](https://www.python.org/)
[![Three.js](https://img.shields.io/badge/3D-Three.js%20WebGL-orange.svg)](https://threejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Zero AI Slop](https://img.shields.io/badge/Engineering-Zero%20AI%20Slop-blueviolet.svg)](#)

<p align="center">
  <b>Stop staring at boring 2D terminal logs. Watch your codebase evolve into a swirling, living cosmos.</b>
</p>

</div>

---

## ⚡ The 3-Second Hook

Ever wondered what Linux, Python, or your own repository looks like as an actual solar system?

**Git Constellation** parses your raw Git DAG history and streams it through a **Keplerian orbital physics engine** to render a fully textured, living 3D planetary system:
- ☀️ **Genesis Star**: The root commit forms a burning, supermassive sun at $(0, 0, 0)$ casting dynamic day-and-night light terminators across all worlds.
- 🪐 **Planetary Orbits**: Active branches tilt and orbit along calculated elliptical planes based on divergence and lifespan.
- 🌍 **Living Celestial Worlds**: Every commit is mapped to a high-definition procedurally textured planetary archetype based on code churn metrics (`+lines_added / -lines_deleted`).
- ☄️ **Asteroid Belt & Filaments**: Micro-asteroid belts separate planetary rings while constellation filaments link parent and child commits.
- 🎵 **Deep-Space Audio Synthesis**: Chronological playback scrubber with native Web Audio synthesizers emitting binaural drones and harmonic ignition chimes as repository history unfolds.

---

## 🪐 Planetary Archetypes & Churn Mechanics

| Celestial Archetype | Visual Classification | Trigger & Churn Mechanics |
| :--- | :--- | :--- |
| **☀️ Genesis Sun** | Convective plasma granulation & solar flares | Root / initial commit anchor at $(0, 0, 0)$ |
| **🪐 Jovian Gas Giant** | Atmospheric cloud bands, storm vortices & rings | Massive churn ($\ge 500$ lines) or merge commits |
| **🌋 Lava World** | Obsidian basalt crust with glowing magma fissures | Significant refactors (200 – 500 lines churn) |
| **🌍 Habitable World** | Azure oceans, green continents & cloud shell | Standard productive commits (50 – 200 lines) |
| **🔴 Desert / Crater World** | Barren ochre terrain with impact craters | Quick bugfixes, typo fixes ($< 50$ lines) |
| **🟣 Milestone Magnetar** | Violet relativistic core with dual polar jets | Tagged releases and version milestones (`v1.0.0`, etc.) |

---

## 🚀 Quickstart

Run it on any repository with zero configuration:

### 1. Install & Run via CLI
```bash
# Clone the repository
git clone https://github.com/vedantojha2612-cyber/git-constellation.git
cd git-constellation

# Install dependencies
pip install -e .

# Launch inside any Git repository (defaults to current working directory)
git-constellation
```

### 2. Run with Custom Repository Path or Port
```bash
# Analyze a specific project
git-constellation --repo /path/to/my-project --port 8080 --no-browser
```

### 3. Run directly with Python
```bash
python3 server.py --repo . --port 8765
```
Open [http://localhost:8765](http://localhost:8765) in your web browser.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Git Constellation                      │
└─────────────────────────────────────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    ┌──────────────────────┐        ┌──────────────────────┐
    │  Git Parser Engine   │        │   Orbital Physics    │
    │  - Branch detection  │───────►│  - Keplerian semi-a  │
    │  - Parent-child DAG  │        │  - Eccentricity      │
    │  - Churn metrics     │        │  - Inclination tilts │
    └──────────────────────┘        └──────────────────────┘
               │                               │
               └───────────────┬───────────────┘
                               ▼
                    ┌──────────────────────┐
                    │ FastAPI JSON Stream  │
                    │ /api/galaxy          │
                    │ /api/telemetry       │
                    └──────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │       Interactive Three.js Celestial WebGL    │
        │ - Procedural planet procedural shaders       │
        │ - Raycast telemetry HUD & commit inspector   │
        │ - Real-time orbital evolution scrubber       │
        │ - Web Audio synthesizer ambient cosmos drone │
        └──────────────────────────────────────────────┘
```

---

## 🧪 Testing

Git Constellation is covered by a 100% automated test suite validating DAG extraction, orbital math, and CLI routines:

```bash
python3 -m unittest discover tests
```

---

## 📜 License

Distributed under the [MIT License](LICENSE).
