/**
 * Git Constellation - 3D Celestial Solar System Visualizer
 * Inspired by classic astronomical solar system artwork (Orbits of Planets in the Solar System)
 * Featuring procedural photorealistic planets, luminous concentric orbits, central sun with coronal rays,
 * asteroid belt, sweeping comet, and interactive telemetry HUD.
 */

(function () {
    'use strict';

    // State
    let scene, camera, renderer, controls;
    let planetMeshes = [];
    let orbitLines = [];
    let filamentLines = [];
    let asteroidBelt = null;
    let sweepingComet = null;
    let sunRaysMesh = null;
    let galaxyData = null;
    let hoveredPlanet = null;
    let selectedPlanet = null;
    let raycaster, mouse;
    
    // Playback state
    let isPlaying = false;
    let playbackSpeed = 1.0;
    let playbackIndex = 0;
    let playbackTimer = null;
    let autoRotate = true;
    let is2DView = false;
    let activeBranchFilter = null;
    let activeClassFilter = null;

    // Camera animation
    let cameraTarget = new THREE.Vector3(0, 0, 0);
    let cameraTargetPosition = null;

    // Default Illustration Camera Perspective (matching Getty image)
    const ILLUSTRATION_CAM_POS = new THREE.Vector3(-55, 92, 165);
    const ILLUSTRATION_TARGET = new THREE.Vector3(0, 0, 0);

    // DOM Elements
    const container = document.getElementById('canvas-container');
    const tooltip = document.getElementById('hover-tooltip');
    const inspector = document.getElementById('sidebar-right');
    const scrubber = document.getElementById('timeline-scrubber');
    const playBtn = document.getElementById('btn-play');
    const speedSelect = document.getElementById('playback-speed');
    const repoBadgeName = document.getElementById('repo-name');
    const starCountBadge = document.getElementById('total-stars-count');
    const currentStarCounter = document.getElementById('current-star-counter');
    const branchListEl = document.getElementById('branch-list');

    // Create a circular glowing canvas texture for star/planet halos
    function createGlowTexture(colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const center = 64;

        const threeColor = new THREE.Color(colorHex || '#FFD54F');
        const r = Math.round(threeColor.r * 255);
        const g = Math.round(threeColor.g * 255);
        const b = Math.round(threeColor.b * 255);

        const gradient = ctx.createRadialGradient(center, center, 0, center, center, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, 0.85)`);
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.22)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);

        return new THREE.CanvasTexture(canvas);
    }

    // Initialize Three.js scene
    function initScene() {
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x02050f, 0.0009);

        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
        camera.position.copy(ILLUSTRATION_CAM_POS);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.35;
        container.appendChild(renderer.domElement);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxDistance = 1800;
        controls.minDistance = 6;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 0.28;
        controls.target.copy(ILLUSTRATION_TARGET);

        raycaster = new THREE.Raycaster();
        raycaster.params.Points.threshold = 3.0;
        mouse = new THREE.Vector2(-999, -999);

        // Lighting: Soft deep space ambient + central blazing Sun PointLight
        const ambientLight = new THREE.AmbientLight(0x1a263d, 0.95);
        scene.add(ambientLight);

        // Sun Central PointLight: Illuminates planets with realistic day/night terminator lines
        const centralSunLight = new THREE.PointLight(0xfff6dd, 4.2, 2200, 1.05);
        centralSunLight.position.set(0, 0, 0);
        scene.add(centralSunLight);

        // Secondary directional fill light to enhance 3D planet curvature and ring translucency
        const fillLight = new THREE.DirectionalLight(0x38557a, 0.45);
        fillLight.position.set(120, 180, 90);
        scene.add(fillLight);

        // Space environments: Multi-layered background stars, asteroid belt & sweeping comet
        createCosmicDust();
        createAsteroidBelt();
        createSweepingComet();

        // Event listeners
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('click', onSceneClick);

        setupUIControls();
    }

    // Multi-layered deep space dust and background stars (matching illustration color mood)
    function createCosmicDust() {
        const starCount = 4500;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        const baseColors = [
            new THREE.Color(0x80d8ff),
            new THREE.Color(0xffffff),
            new THREE.Color(0xffe082),
            new THREE.Color(0x90caf9),
            new THREE.Color(0x80cbc4),
            new THREE.Color(0xce93d8)
        ];

        for (let i = 0; i < starCount; i++) {
            const r = 600 + Math.random() * 1600;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = (r * Math.sin(phi) * Math.sin(theta)) * 0.42;
            positions[i * 3 + 2] = r * Math.cos(phi);

            const c = baseColors[Math.floor(Math.random() * baseColors.length)];
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 1.8,
            vertexColors: true,
            transparent: true,
            opacity: 0.82,
            blending: THREE.AdditiveBlending
        });

        const backgroundDust = new THREE.Points(geom, mat);
        scene.add(backgroundDust);
    }

    // Shimmering Asteroid Belt between inner rocky planets and outer giants (radius ~70 to ~86)
    function createAsteroidBelt() {
        const count = 1100;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const radius = 72.0 + (Math.random() - 0.5) * 16.0;
            const angle = Math.random() * Math.PI * 2;
            const height = (Math.random() - 0.5) * 4.2;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            const shade = 0.45 + Math.random() * 0.45;
            colors[i * 3] = shade * 0.95;
            colors[i * 3 + 1] = shade * 0.88;
            colors[i * 3 + 2] = shade * 0.80;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 1.35,
            vertexColors: true,
            transparent: true,
            opacity: 0.72
        });

        asteroidBelt = new THREE.Points(geom, mat);
        scene.add(asteroidBelt);
    }

    // Sweeping Dynamic Comet cutting across the orbits (matching the comet in solar system illustrations)
    function createSweepingComet() {
        const cometGroup = new THREE.Group();

        // 1. Bright Icy Nucleus
        const nucleusGeom = new THREE.SphereGeometry(0.75, 16, 16);
        const nucleusMat = new THREE.MeshStandardMaterial({
            color: 0xe0f7fa,
            emissive: 0x80deea,
            emissiveIntensity: 1.5,
            roughness: 0.3
        });
        const nucleus = new THREE.Mesh(nucleusGeom, nucleusMat);
        cometGroup.add(nucleus);

        // 2. Coma Glowing Sprite
        const comaTex = PlanetTextureGenerator.createCometTexture(128, 128);
        const comaMat = new THREE.SpriteMaterial({
            map: comaTex,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending
        });
        const comaSprite = new THREE.Sprite(comaMat);
        comaSprite.scale.set(7.5, 7.5, 1);
        cometGroup.add(comaSprite);

        // 3. Arched Ion & Dust Tail (particles streaming backward)
        const tailCount = 180;
        const tailGeom = new THREE.BufferGeometry();
        const tailPos = new Float32Array(tailCount * 3);
        const tailColors = new Float32Array(tailCount * 3);

        for (let i = 0; i < tailCount; i++) {
            const frac = i / tailCount;
            const dist = frac * 38.0;
            const spread = frac * frac * 3.8;

            tailPos[i * 3] = -(dist + Math.random() * 2.0);
            tailPos[i * 3 + 1] = (Math.random() - 0.5) * spread;
            tailPos[i * 3 + 2] = (Math.random() - 0.5) * spread;

            // Tail color: Bright white/cyan at head -> deep cobalt/violet at tip
            tailColors[i * 3] = 0.4 + (1 - frac) * 0.6;
            tailColors[i * 3 + 1] = 0.8 + (1 - frac) * 0.2;
            tailColors[i * 3 + 2] = 1.0;
        }

        tailGeom.setAttribute('position', new THREE.BufferAttribute(tailPos, 3));
        tailGeom.setAttribute('color', new THREE.BufferAttribute(tailColors, 3));

        const tailMat = new THREE.PointsMaterial({
            size: 1.8,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending
        });

        const tail = new THREE.Points(tailGeom, tailMat);
        cometGroup.add(tail);

        scene.add(cometGroup);

        sweepingComet = {
            group: cometGroup,
            angle: 0.0,
            a: 110.0, // Semi-major axis
            b: 48.0,  // Semi-minor axis (high eccentricity)
            inclination: 0.32,
            speed: 0.0035
        };
    }

    // Build Luminous Concentric Keplerian & Planetary Orbit Tracks
    function buildOrbitRings(branches) {
        orbitLines.forEach(l => scene.remove(l));
        orbitLines = [];

        // 1. Render Canonical Reference Solar System Orbits (Mercury to Neptune)
        const solarReferenceOrbits = [
            { name: 'Mercury Orbit', a: 22.0, b: 21.6, inc: 0.05, color: '#90a4ae', opacity: 0.30 },
            { name: 'Venus Orbit', a: 34.0, b: 33.9, inc: 0.03, color: '#ffe082', opacity: 0.32 },
            { name: 'Earth Orbit', a: 48.0, b: 47.9, inc: 0.00, color: '#4fc3f7', opacity: 0.45 },
            { name: 'Mars Orbit', a: 62.0, b: 61.5, inc: 0.04, color: '#ff8a65', opacity: 0.32 },
            { name: 'Jupiter Orbit', a: 104.0, b: 103.5, inc: 0.02, color: '#ffb74d', opacity: 0.38 },
            { name: 'Saturn Orbit', a: 142.0, b: 141.2, inc: 0.04, color: '#ffd54f', opacity: 0.36 },
            { name: 'Uranus Orbit', a: 178.0, b: 177.5, inc: 0.01, color: '#80deea', opacity: 0.28 },
            { name: 'Neptune Orbit', a: 215.0, b: 214.8, inc: 0.03, color: '#448aff', opacity: 0.26 }
        ];

        solarReferenceOrbits.forEach(orb => {
            const curvePoints = [];
            const segments = 160;
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                const x = orb.a * Math.cos(theta);
                const y = orb.b * Math.sin(theta);
                const y1 = y * Math.cos(orb.inc);
                const z1 = y * Math.sin(orb.inc);
                curvePoints.push(new THREE.Vector3(x, z1, y1));
            }

            const geom = new THREE.BufferGeometry().setFromPoints(curvePoints);
            const mat = new THREE.LineBasicMaterial({
                color: new THREE.Color(orb.color),
                transparent: true,
                opacity: orb.opacity,
                blending: THREE.AdditiveBlending
            });

            const line = new THREE.Line(geom, mat);
            line.userData = { branchName: 'solar_reference', originalOpacity: orb.opacity };
            scene.add(line);
            orbitLines.push(line);
        });

        // 2. Render Branch Orbits from Git Constellation DAG
        branches.forEach(branch => {
            const a = branch.semi_major_axis;
            const b = branch.semi_minor_axis;
            const inc = branch.inclination_rad || 0.0;
            const asc = branch.ascending_node_rad || 0.0;
            const color = new THREE.Color(branch.color || '#00E5FF');

            const curvePoints = [];
            const segments = 160;
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                let x = a * Math.cos(theta);
                let y = b * Math.sin(theta);
                let z = 0;

                const y1 = y * Math.cos(inc) - z * Math.sin(inc);
                const z1 = y * Math.sin(inc) + z * Math.cos(inc);

                const x2 = x * Math.cos(asc) - y1 * Math.sin(asc);
                const y2 = x * Math.sin(asc) + y1 * Math.cos(asc);

                curvePoints.push(new THREE.Vector3(x2, z1, y2));
            }

            const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
            // Luminous glowing line matching the Getty illustration
            const material = new THREE.LineBasicMaterial({
                color: color,
                transparent: true,
                opacity: branch.name === 'main' ? 0.65 : 0.45,
                blending: THREE.AdditiveBlending
            });

            const line = new THREE.Line(geometry, material);
            line.userData = { branchName: branch.name, originalOpacity: material.opacity };
            scene.add(line);
            orbitLines.push(line);
        });
    }

    // Build Constellation Filaments (DAG edges linking commits)
    function buildFilaments(filaments) {
        filamentLines.forEach(f => scene.remove(f.line));
        filamentLines = [];

        filaments.forEach(fil => {
            const src = new THREE.Vector3(fil.source_pos.x, fil.source_pos.z, fil.source_pos.y);
            const dst = new THREE.Vector3(fil.target_pos.x, fil.target_pos.z, fil.target_pos.y);

            const geom = new THREE.BufferGeometry().setFromPoints([src, dst]);
            const mat = new THREE.LineBasicMaterial({
                color: fil.is_merge_filament ? 0x00e5ff : 0xffd54f,
                transparent: true,
                opacity: fil.is_merge_filament ? 0.65 : 0.35,
                blending: THREE.AdditiveBlending
            });

            const line = new THREE.Line(geom, mat);
            line.visible = true;
            scene.add(line);

            filamentLines.push({
                line: line,
                source_hash: fil.source_hash,
                target_hash: fil.target_hash,
                is_merge: fil.is_merge_filament
            });
        });
    }

    // Map Commit to an Authentic Solar System Planet Telemetry Archetype
    function getPlanetTelemetry(commit) {
        const starClass = commit.star_class;
        const churn = commit.total_churn || 0;
        const seed = Math.abs(parseInt(commit.hash.slice(0, 6), 16)) || 42;

        if (commit.is_root || starClass === 'SUPERMASSIVE_SUN') {
            return {
                title: 'Central Genesis Sun',
                archetype: 'G-Type Main Sequence Star',
                atmosphere: 'Hydrogen-Helium Convective Plasma',
                temperature: '5,778 K (Core 15M K)',
                tiltDeg: 7.25,
                rotationSpeed: 0.003,
                planetType: 'SUN'
            };
        } else if (starClass === 'BLUE_SUPERGIANT' || churn >= 500) {
            // High Churn / Major Merges = Jovian Gas Giant (Jupiter or Saturn with Rings)
            const isSaturn = (seed % 2 === 0);
            return {
                title: isSaturn ? 'Kronian Ringed Giant (Saturn-Class)' : 'Jovian Gas Giant (Jupiter-Class)',
                archetype: isSaturn ? 'Gas Giant with Resonant Dust Rings' : 'Gas Giant with Zonal Jetstreams & Storm Eye',
                atmosphere: 'Hydrogen-Helium & Methane Striated Belts',
                temperature: isSaturn ? '134 K' : '165 K',
                tiltDeg: isSaturn ? 26.7 : 3.13,
                rotationSpeed: 0.016,
                planetType: isSaturn ? 'SATURN' : 'JUPITER'
            };
        } else if (starClass === 'WHITE_DWARF' || (churn >= 200 && churn < 500)) {
            // 200 - 500 Lines = Outer Ice Giants (Neptune or Uranus)
            const isUranus = (seed % 2 === 0);
            return {
                title: isUranus ? 'Aquamarine Ice Giant (Uranus-Class)' : 'Cobalt Storm Giant (Neptune-Class)',
                archetype: isUranus ? 'Tilted Cryo-Atmospheric World' : 'Supersonic Methane Ice Giant',
                atmosphere: 'Methane-Hydrogen-Ammonia Cirrus Storms',
                temperature: isUranus ? '76 K' : '72 K',
                tiltDeg: isUranus ? 97.8 : 28.3,
                rotationSpeed: 0.012,
                planetType: isUranus ? 'URANUS' : 'NEPTUNE'
            };
        } else if (starClass === 'YELLOW_STAR' || (churn >= 50 && churn < 200)) {
            // Standard Commits = Habitable Continental World (Earth with Clouds & Moon) or Venus
            const isVenus = (seed % 3 === 0);
            return {
                title: isVenus ? 'Cytherean Shrouded World (Venus-Class)' : 'Habitable Continental World (Earth & Moon)',
                archetype: isVenus ? 'Supercritical Sulfuric Greenhouse Terrestrial' : 'Silicate Oceanic Habitable World with Lunar Satellite',
                atmosphere: isVenus ? 'Dense Carbon Dioxide & Sulfuric Acid Clouds' : 'Nitrogen-Oxygen with Swirling Cloud Systems',
                temperature: isVenus ? '737 K' : '288 K',
                tiltDeg: isVenus ? 177.3 : 23.44,
                rotationSpeed: isVenus ? 0.004 : 0.014,
                planetType: isVenus ? 'VENUS' : 'EARTH'
            };
        } else if (starClass === 'RED_DWARF' || churn < 50) {
            // Small Bugfixes / Tweaks = Mars or Mercury
            const isMercury = (seed % 2 === 0);
            return {
                title: isMercury ? 'Hermian Regolith World (Mercury-Class)' : 'Martian Ochre Barren (Mars-Class)',
                archetype: isMercury ? 'Cratered Metallic Core Terrestrial' : 'Iron Oxide Desert with Polar Ice Caps',
                atmosphere: isMercury ? 'Ultra-Thin Silicate Exosphere' : 'Thin Carbon Dioxide with Dust Devil Plumes',
                temperature: isMercury ? '440 K' : '210 K',
                tiltDeg: isMercury ? 0.03 : 25.19,
                rotationSpeed: isMercury ? 0.006 : 0.013,
                planetType: isMercury ? 'MERCURY' : 'MARS'
            };
        } else if (starClass === 'MILESTONE_PULSAR' || (commit.tags && commit.tags.length > 0)) {
            // Tagged Milestone Releases = Cosmic Comet / Relativistic Milestone
            return {
                title: 'Cosmic Milestone Comet (Relativistic Core)',
                archetype: 'Deep Space Oort Cloud Body with Ionized Tail',
                atmosphere: 'Sublimating Water-Ice, Methane & Cyanogen Coma',
                temperature: '45 K (Perihelion 220 K)',
                tiltDeg: 35.0,
                rotationSpeed: 0.024,
                planetType: 'COMET_MILESTONE'
            };
        }

        return {
            title: 'Terrestrial Exoplanet',
            archetype: 'Rocky Astronomical Body',
            atmosphere: 'Rarefied Silicate Dust',
            temperature: '260 K',
            tiltDeg: 21.0,
            rotationSpeed: 0.01,
            planetType: 'EARTH'
        };
    }

    // Build Realistic 3D Textured Planets for every commit
    function buildStars(stars) {
        planetMeshes.forEach(s => scene.remove(s.group));
        planetMeshes = [];

        stars.forEach((commit, idx) => {
            const group = new THREE.Group();
            const pos = new THREE.Vector3(commit.position_3d.x, commit.position_3d.z, commit.position_3d.y);
            group.position.copy(pos);

            const size = commit.star_size || 1.3;
            const tele = getPlanetTelemetry(commit);

            // Container for tilted planetary axis
            const axialGroup = new THREE.Group();
            axialGroup.rotation.z = THREE.MathUtils.degToRad(tele.tiltDeg);
            group.add(axialGroup);

            let planetMesh = null;
            let cloudMesh = null;
            let ringMesh = null;
            let moonMesh = null;
            let glowSprite = null;

            const seed = Math.abs(parseInt(commit.hash.slice(0, 6), 16)) || (idx * 37 + 13);

            if (tele.planetType === 'SUN') {
                // 1. THE CENTRAL SUN (Genesis Anchor)
                const sunGeom = new THREE.SphereGeometry(size * 1.05, 40, 40);
                const sunTex = PlanetTextureGenerator.createSunTexture(512, 256);
                const sunMat = new THREE.MeshStandardMaterial({
                    map: sunTex,
                    emissive: new THREE.Color(0xff9100),
                    emissiveMap: sunTex,
                    emissiveIntensity: 1.25,
                    roughness: 0.9,
                    metalness: 0.0
                });
                planetMesh = new THREE.Mesh(sunGeom, sunMat);
                axialGroup.add(planetMesh);

                // Radiant Solar Coronal Rays (matching Getty illustration)
                const raysGeom = new THREE.PlaneGeometry(size * 7.5, size * 7.5);
                const raysTex = PlanetTextureGenerator.createSunCoronaRaysTexture(512, 512);
                const raysMat = new THREE.MeshBasicMaterial({
                    map: raysTex,
                    transparent: true,
                    opacity: 0.85,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending
                });
                sunRaysMesh = new THREE.Mesh(raysGeom, raysMat);
                sunRaysMesh.rotation.x = Math.PI / 2; // Flat on the orbital plane
                group.add(sunRaysMesh);

                // Pulsing Solar Halo Sprite
                const spriteMat = new THREE.SpriteMaterial({
                    map: createGlowTexture('#FFB300'),
                    color: 0xfff0c2,
                    transparent: true,
                    opacity: 0.9,
                    blending: THREE.AdditiveBlending
                });
                glowSprite = new THREE.Sprite(spriteMat);
                glowSprite.scale.set(size * 6.0, size * 6.0, 1);
                group.add(glowSprite);

            } else if (tele.planetType === 'JUPITER') {
                // 2. JUPITER (Iconic Belts, Zones, Great Red Spot)
                const jupGeom = new THREE.SphereGeometry(size * 1.15, 36, 36);
                const jupTex = PlanetTextureGenerator.createJupiterTexture(seed, 512, 256);
                const jupMat = new THREE.MeshStandardMaterial({
                    map: jupTex,
                    roughness: 0.65,
                    metalness: 0.05
                });
                planetMesh = new THREE.Mesh(jupGeom, jupMat);
                axialGroup.add(planetMesh);

                const spriteMat = new THREE.SpriteMaterial({
                    map: createGlowTexture('#FFB74D'),
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.45,
                    blending: THREE.AdditiveBlending
                });
                glowSprite = new THREE.Sprite(spriteMat);
                glowSprite.scale.set(size * 3.6, size * 3.6, 1);
                group.add(glowSprite);

            } else if (tele.planetType === 'SATURN') {
                // 3. SATURN WITH REALISTIC CONCENTRIC RINGS (Cassini Division)
                const satGeom = new THREE.SphereGeometry(size * 1.0, 36, 36);
                const satTex = PlanetTextureGenerator.createSaturnTexture(seed, 512, 256);
                const satMat = new THREE.MeshStandardMaterial({
                    map: satTex,
                    roughness: 0.68,
                    metalness: 0.06
                });
                planetMesh = new THREE.Mesh(satGeom, satMat);
                axialGroup.add(planetMesh);

                // Photorealistic Rings with Cassini Gap
                const ringGeom = new THREE.RingGeometry(size * 1.35, size * 2.8, 64);
                const ringTex = PlanetTextureGenerator.createSaturnRingTexture(512, 32);
                const ringMat = new THREE.MeshStandardMaterial({
                    map: ringTex,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.92,
                    roughness: 0.75
                });
                ringMesh = new THREE.Mesh(ringGeom, ringMat);
                ringMesh.rotation.x = Math.PI / 2;
                axialGroup.add(ringMesh);

                const spriteMat = new THREE.SpriteMaterial({
                    map: createGlowTexture('#FFE082'),
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.48,
                    blending: THREE.AdditiveBlending
                });
                glowSprite = new THREE.Sprite(spriteMat);
                glowSprite.scale.set(size * 3.8, size * 3.8, 1);
                group.add(glowSprite);

            } else if (tele.planetType === 'EARTH') {
                // 4. EARTH (Blue Marble, Swirling Cloud Atmosphere & Moon)
                const earthGeom = new THREE.SphereGeometry(size * 0.88, 32, 32);
                const earthTex = PlanetTextureGenerator.createEarthTexture(seed, 512, 256);
                const earthMat = new THREE.MeshStandardMaterial({
                    map: earthTex,
                    roughness: 0.58,
                    metalness: 0.12
                });
                planetMesh = new THREE.Mesh(earthGeom, earthMat);
                axialGroup.add(planetMesh);

                // Atmospheric Clouds Sphere
                const cloudGeom = new THREE.SphereGeometry(size * 0.905, 32, 32);
                const cloudTex = PlanetTextureGenerator.createCloudTexture(seed + 15, 512, 256);
                const cloudMat = new THREE.MeshStandardMaterial({
                    map: cloudTex,
                    transparent: true,
                    opacity: 0.82,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending
                });
                cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
                axialGroup.add(cloudMesh);

                // Earth's Moon
                const moonOrbitGroup = new THREE.Group();
                const moonGeom = new THREE.SphereGeometry(size * 0.22, 16, 16);
                const moonTex = PlanetTextureGenerator.createMoonTexture(seed + 30, 256, 128);
                const moonMat = new THREE.MeshStandardMaterial({
                    map: moonTex,
                    roughness: 0.9,
                    metalness: 0.05
                });
                moonMesh = new THREE.Mesh(moonGeom, moonMat);
                moonMesh.position.set(size * 1.85, 0, 0);
                moonOrbitGroup.add(moonMesh);
                group.add(moonOrbitGroup);

                // Soft Earth-like blue halo
                const spriteMat = new THREE.SpriteMaterial({
                    map: createGlowTexture('#80d8ff'),
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.52,
                    blending: THREE.AdditiveBlending
                });
                glowSprite = new THREE.Sprite(spriteMat);
                glowSprite.scale.set(size * 3.2, size * 3.2, 1);
                group.add(glowSprite);

            } else if (tele.planetType === 'VENUS') {
                // 5. VENUS (Dense Golden Cloud Deck)
                const venGeom = new THREE.SphereGeometry(size * 0.86, 32, 32);
                const venTex = PlanetTextureGenerator.createVenusTexture(seed, 512, 256);
                const venMat = new THREE.MeshStandardMaterial({
                    map: venTex,
                    roughness: 0.60,
                    metalness: 0.08
                });
                planetMesh = new THREE.Mesh(venGeom, venMat);
                axialGroup.add(planetMesh);

                const spriteMat = new THREE.SpriteMaterial({
                    map: createGlowTexture('#FFE082'),
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.50,
                    blending: THREE.AdditiveBlending
                });
                glowSprite = new THREE.Sprite(spriteMat);
                glowSprite.scale.set(size * 3.0, size * 3.0, 1);
                group.add(glowSprite);

            } else if (tele.planetType === 'MARS') {
                // 6. MARS (Rust-Red Iron Oxide, Dark Plains & White Ice Caps)
                const marsGeom = new THREE.SphereGeometry(size * 0.80, 30, 30);
                const marsTex = PlanetTextureGenerator.createMarsTexture(seed, 512, 256);
                const marsMat = new THREE.MeshStandardMaterial({
                    map: marsTex,
                    roughness: 0.88,
                    metalness: 0.06
                });
                planetMesh = new THREE.Mesh(marsGeom, marsMat);
                axialGroup.add(planetMesh);

                const spriteMat = new THREE.SpriteMaterial({
                    map: createGlowTexture('#FF7043'),
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.50,
                    blending: THREE.AdditiveBlending
                });
                glowSprite = new THREE.Sprite(spriteMat);
                glowSprite.scale.set(size * 2.8, size * 2.8, 1);
                group.add(glowSprite);

            } else if (tele.planetType === 'MERCURY') {
                // 7. MERCURY (Grey Cratered Rocky Regolith)
                const mercGeom = new THREE.SphereGeometry(size * 0.74, 28, 28);
                const mercTex = PlanetTextureGenerator.createMercuryTexture(seed, 512, 256);
                const mercMat = new THREE.MeshStandardMaterial({
                    map: mercTex,
                    roughness: 0.94,
                    metalness: 0.12
                });
                planetMesh = new THREE.Mesh(mercGeom, mercMat);
                axialGroup.add(planetMesh);

                const spriteMat = new THREE.SpriteMaterial({
                    map: createGlowTexture('#B0BEC5'),
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.40,
                    blending: THREE.AdditiveBlending
                });
                glowSprite = new THREE.Sprite(spriteMat);
                glowSprite.scale.set(size * 2.6, size * 2.6, 1);
                group.add(glowSprite);

            } else if (tele.planetType === 'NEPTUNE') {
                // 8. NEPTUNE (Deep Azure Cobalt with Methane Cirrus Storms)
                const nepGeom = new THREE.SphereGeometry(size * 0.95, 32, 32);
                const nepTex = PlanetTextureGenerator.createNeptuneTexture(seed, 512, 256);
                const nepMat = new THREE.MeshStandardMaterial({
                    map: nepTex,
                    roughness: 0.62,
                    metalness: 0.10
                });
                planetMesh = new THREE.Mesh(nepGeom, nepMat);
                axialGroup.add(planetMesh);

                const spriteMat = new THREE.SpriteMaterial({
                    map: createGlowTexture('#448AFF'),
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.58,
                    blending: THREE.AdditiveBlending
                });
                glowSprite = new THREE.Sprite(spriteMat);
                glowSprite.scale.set(size * 3.4, size * 3.4, 1);
                group.add(glowSprite);

            } else if (tele.planetType === 'URANUS') {
                // 9. URANUS (Pale Aquamarine Ice Giant with Thin Rings)
                const uraGeom = new THREE.SphereGeometry(size * 0.92, 32, 32);
                const uraTex = PlanetTextureGenerator.createUranusTexture(seed, 512, 256);
                const uraMat = new THREE.MeshStandardMaterial({
                    map: uraTex,
                    roughness: 0.65,
                    metalness: 0.08
                });
                planetMesh = new THREE.Mesh(uraGeom, uraMat);
                axialGroup.add(planetMesh);

                // Uranus Thin Vertical Rings
                const uraRingGeom = new THREE.RingGeometry(size * 1.3, size * 1.6, 36);
                const uraRingMat = new THREE.MeshBasicMaterial({
                    color: 0x80deea,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.45
                });
                const uraRing = new THREE.Mesh(uraRingGeom, uraRingMat);
                uraRing.rotation.y = Math.PI / 2;
                axialGroup.add(uraRing);

                const spriteMat = new THREE.SpriteMaterial({
                    map: createGlowTexture('#80DEEA'),
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.52,
                    blending: THREE.AdditiveBlending
                });
                glowSprite = new THREE.Sprite(spriteMat);
                glowSprite.scale.set(size * 3.2, size * 3.2, 1);
                group.add(glowSprite);

            } else {
                // 10. COMET / MILESTONE (Icy Core with Streaming Tail)
                const comGeom = new THREE.SphereGeometry(size * 0.82, 28, 28);
                const comTex = PlanetTextureGenerator.createPlutoTexture(seed, 256, 128);
                const comMat = new THREE.MeshStandardMaterial({
                    map: comTex,
                    emissive: new THREE.Color(0x80deea),
                    emissiveIntensity: 0.6,
                    roughness: 0.45,
                    metalness: 0.2
                });
                planetMesh = new THREE.Mesh(comGeom, comMat);
                axialGroup.add(planetMesh);

                // Glowing Coma
                const spriteMat = new THREE.SpriteMaterial({
                    map: PlanetTextureGenerator.createCometTexture(128, 128),
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.9,
                    blending: THREE.AdditiveBlending
                });
                glowSprite = new THREE.Sprite(spriteMat);
                glowSprite.scale.set(size * 4.2, size * 4.2, 1);
                group.add(glowSprite);
            }

            planetMesh.userData = { commit: commit, group: group, index: idx, telemetry: tele };
            scene.add(group);

            planetMeshes.push({
                group: group,
                mesh: planetMesh,
                cloudMesh: cloudMesh,
                ringMesh: ringMesh,
                moonMesh: moonMesh,
                sprite: glowSprite,
                axialGroup: axialGroup,
                rotationSpeed: tele.rotationSpeed,
                telemetry: tele,
                commit: commit,
                index: idx
            });
        });
    }

    // Populate UI HUD from loaded Galaxy payload
    function populateGalaxyHUD(data) {
        galaxyData = data;
        repoBadgeName.textContent = data.repo_name || 'Git Solar System';
        starCountBadge.textContent = `${data.total_commits} Planetary Bodies`;

        // Scrubber range
        scrubber.max = data.total_commits;
        scrubber.value = data.total_commits;
        currentStarCounter.textContent = `${data.total_commits} / ${data.total_commits}`;

        // Build Branch list
        branchListEl.innerHTML = '';
        const allChip = document.createElement('div');
        allChip.className = 'branch-chip selected';
        allChip.innerHTML = `<span>All Orbits</span><span class="legend-count">${data.total_branches}</span>`;
        allChip.onclick = () => filterByBranch(null, allChip);
        branchListEl.appendChild(allChip);

        data.branches.forEach(branch => {
            const chip = document.createElement('div');
            chip.className = 'branch-chip';
            chip.innerHTML = `
                <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:8px;height:8px;border-radius:50%;background:${branch.color}"></div>
                    <span>${branch.name}</span>
                </div>
                <span class="legend-count">${branch.commit_count}</span>
            `;
            chip.onclick = () => filterByBranch(branch.name, chip);
            branchListEl.appendChild(chip);
        });

        // Legend Counts
        const classCounts = {};
        data.stars.forEach(s => {
            classCounts[s.star_class] = (classCounts[s.star_class] || 0) + 1;
        });

        const setCnt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || 0;
        };

        setCnt('count-sun', classCounts['SUPERMASSIVE_SUN']);
        setCnt('count-pulsar', classCounts['MILESTONE_PULSAR']);
        setCnt('count-supergiant', classCounts['BLUE_SUPERGIANT']);
        setCnt('count-whitedwarf', classCounts['WHITE_DWARF']);
        setCnt('count-yellow', classCounts['YELLOW_STAR']);
        setCnt('count-reddwarf', classCounts['RED_DWARF']);
    }

    // Load Data: Try local API endpoint, fallback to bundled sample data
    async function loadGalaxy(repoPath = '.') {
        const statusDot = document.getElementById('api-status-dot');
        const statusText = document.getElementById('api-status-text');
        statusText.textContent = 'Connecting...';

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/galaxy?repo_path=${encodeURIComponent(repoPath)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            statusDot.style.background = '#00E676';
            statusDot.style.boxShadow = '0 0 8px #00E676';
            statusText.textContent = 'Live Engine';
            renderGalaxy(data);
        } catch (err) {
            console.warn('Backend server unavailable, loading bundled Solar System Constellation:', err);
            statusDot.style.background = '#FFB300';
            statusDot.style.boxShadow = '0 0 8px #FFB300';
            statusText.textContent = 'Solar Demo';

            if (window.SAMPLE_GALAXY_DATA) {
                renderGalaxy(window.SAMPLE_GALAXY_DATA);
            }
        }
    }

    // Render Galaxy to 3D Space
    function renderGalaxy(data) {
        populateGalaxyHUD(data);
        buildOrbitRings(data.branches);
        buildStars(data.stars);
        buildFilaments(data.filaments);

        // Sort chronologically for scrubber playback
        planetMeshes.sort((a, b) => a.commit.timestamp - b.commit.timestamp);
        updateTimelineVisibility(data.total_commits);
    }

    // Filter by branch
    function filterByBranch(branchName, chipEl) {
        activeBranchFilter = branchName;
        document.querySelectorAll('.branch-chip').forEach(c => c.classList.remove('selected'));
        if (chipEl) chipEl.classList.add('selected');

        planetMeshes.forEach(s => {
            const match = !branchName || s.commit.branch === branchName;
            s.group.visible = match;
        });

        orbitLines.forEach(l => {
            const match = !branchName || l.userData.branchName === branchName || l.userData.branchName === 'solar_reference';
            l.material.opacity = match ? (l.userData.branchName === branchName ? 0.85 : l.userData.originalOpacity) : 0.05;
        });
    }

    // Filter by star classification
    window.toggleStarClass = function (starClass) {
        if (activeClassFilter === starClass) {
            activeClassFilter = null;
        } else {
            activeClassFilter = starClass;
        }

        planetMeshes.forEach(s => {
            const match = !activeClassFilter || s.commit.star_class === activeClassFilter;
            s.group.visible = match && (!activeBranchFilter || s.commit.branch === activeBranchFilter);
        });
    };

    // Scrubber / Playback updates
    function updateTimelineVisibility(count) {
        playbackIndex = count;
        scrubber.value = count;
        const total = galaxyData ? galaxyData.total_commits : count;
        const progressPct = total > 0 ? (count / total) * 100 : 100;
        scrubber.style.setProperty('--progress', `${progressPct}%`);
        currentStarCounter.textContent = `${count} / ${total}`;

        const visibleHashes = new Set();
        for (let i = 0; i < planetMeshes.length; i++) {
            const star = planetMeshes[i];
            if (i < count) {
                star.group.visible = !activeBranchFilter || star.commit.branch === activeBranchFilter;
                visibleHashes.add(star.commit.hash);
            } else {
                star.group.visible = false;
            }
        }

        filamentLines.forEach(f => {
            f.line.visible = visibleHashes.has(f.source_hash) && visibleHashes.has(f.target_hash);
        });
    }

    function togglePlay() {
        isPlaying = !isPlaying;
        playBtn.innerHTML = isPlaying ? '⏸' : '▶';

        if (isPlaying) {
            if (playbackIndex >= planetMeshes.length) {
                playbackIndex = 0;
            }
            runPlaybackLoop();
        } else {
            clearTimeout(playbackTimer);
        }
    }

    function runPlaybackLoop() {
        if (!isPlaying) return;

        if (playbackIndex < planetMeshes.length) {
            playbackIndex++;
            updateTimelineVisibility(playbackIndex);

            const current = planetMeshes[playbackIndex - 1];
            if (current && window.celestialAudio) {
                window.celestialAudio.playStarChime(current.commit.star_class, current.commit.star_size);
            }

            const delay = Math.max(120, 600 / playbackSpeed);
            playbackTimer = setTimeout(runPlaybackLoop, delay);
        } else {
            isPlaying = false;
            playBtn.innerHTML = '▶';
        }
    }

    // Raycast hover & selection
    function onMouseMove(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const hitMeshes = planetMeshes.map(s => s.mesh).filter(m => m && m.parent && m.parent.parent && m.parent.parent.visible);
        const intersects = raycaster.intersectObjects(hitMeshes);

        if (intersects.length > 0) {
            const hit = intersects[0].object.userData.commit;
            const tele = intersects[0].object.userData.telemetry;
            hoveredPlanet = hit;
            container.style.cursor = 'pointer';

            tooltip.classList.add('visible');
            tooltip.style.left = `${event.clientX}px`;
            tooltip.style.top = `${event.clientY - 20}px`;
            tooltip.innerHTML = `
                <div style="font-weight:700;color:${hit.star_color};display:flex;align-items:center;gap:6px;">
                    <span>🪐</span>
                    <span>${tele ? tele.title : hit.star_class.replace('_', ' ')} · ${hit.short_hash}</span>
                </div>
                <div style="margin:3px 0;color:#fff;">${hit.message.slice(0, 52)}${hit.message.length > 52 ? '...' : ''}</div>
                <div style="color:var(--text-secondary);font-size:0.7rem;">+${hit.lines_added} / -${hit.lines_deleted} · ${hit.author_name} · Tilt: ${tele ? tele.tiltDeg : 23}°</div>
            `;
        } else {
            hoveredPlanet = null;
            container.style.cursor = 'default';
            tooltip.classList.remove('visible');
        }
    }

    function onSceneClick(event) {
        if (event.target.closest('.interactive')) return;

        raycaster.setFromCamera(mouse, camera);
        const hitMeshes = planetMeshes.map(s => s.mesh).filter(m => m && m.parent && m.parent.parent && m.parent.parent.visible);
        const intersects = raycaster.intersectObjects(hitMeshes);

        if (intersects.length > 0) {
            const commit = intersects[0].object.userData.commit;
            selectStar(commit);
        }
    }

    // Focus camera on planet and show Telemetry Inspector
    function selectStar(commit) {
        selectedPlanet = commit;
        inspector.classList.add('active');

        if (window.celestialAudio) {
            window.celestialAudio.playStarChime(commit.star_class, commit.star_size);
        }

        const tele = getPlanetTelemetry(commit);

        // Fill HUD Telemetry Inspector
        const classEl = document.getElementById('inspector-class');
        classEl.textContent = tele.title;
        classEl.style.backgroundColor = `${commit.star_color}26`;
        classEl.style.color = commit.star_color;
        classEl.style.border = `1px solid ${commit.star_color}`;

        document.getElementById('inspector-title').textContent = commit.message;
        document.getElementById('inspector-hash').textContent = commit.hash;
        document.getElementById('inspector-author').textContent = `${commit.author_name} <${commit.author_email}>`;
        document.getElementById('inspector-date').textContent = new Date(commit.timestamp * 1000).toLocaleString();
        document.getElementById('inspector-branch').textContent = `${commit.branch} · Radius: ${commit.orbit_radius.toFixed(1)} AU`;

        // Planetary Telemetry Specs
        let teleWrap = document.getElementById('planet-telemetry-specs');
        if (!teleWrap) {
            teleWrap = document.createElement('div');
            teleWrap.id = 'planet-telemetry-specs';
            teleWrap.className = 'telemetry-card';
            const metaContainer = document.getElementById('inspector-meta');
            if (metaContainer) metaContainer.parentNode.insertBefore(teleWrap, metaContainer.nextSibling);
        }
        teleWrap.innerHTML = `
            <div style="font-size:0.72rem;font-family:var(--font-mono);color:var(--accent-cyan);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Planetary Specs</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.73rem;color:var(--text-secondary);font-family:var(--font-mono);">
                <div>Archetype: <span style="color:#fff;">${tele.archetype.split(' ')[0]}</span></div>
                <div>Surface Temp: <span style="color:#fff;">${tele.temperature}</span></div>
                <div>Axial Tilt: <span style="color:#fff;">${tele.tiltDeg}°</span></div>
                <div>Atmosphere: <span style="color:#fff;">${tele.atmosphere.split(' ')[0]}</span></div>
            </div>
        `;

        // Churn
        const total = (commit.lines_added + commit.lines_deleted) || 1;
        const addPct = (commit.lines_added / total) * 100;
        const delPct = (commit.lines_deleted / total) * 100;
        document.getElementById('churn-bar-add').style.width = `${addPct}%`;
        document.getElementById('churn-bar-del').style.width = `${delPct}%`;
        document.getElementById('churn-stats-add').textContent = `+${commit.lines_added} added`;
        document.getElementById('churn-stats-del').textContent = `-${commit.lines_deleted} deleted`;

        // Parent links
        const parentContainer = document.getElementById('inspector-parents');
        parentContainer.innerHTML = '';
        if (commit.parents && commit.parents.length > 0) {
            commit.parents.forEach(pHash => {
                const chip = document.createElement('span');
                chip.className = 'parent-chip';
                chip.textContent = pHash.slice(0, 7);
                chip.title = `Jump to parent commit ${pHash}`;
                chip.onclick = () => {
                    const parentPlanet = galaxyData.stars.find(s => s.hash === pHash);
                    if (parentPlanet) selectStar(parentPlanet);
                };
                parentContainer.appendChild(chip);
            });
        } else {
            parentContainer.innerHTML = '<span style="font-size:0.75rem;color:var(--text-muted);">Root / Solar Genesis Anchor</span>';
        }

        // Camera Fly-To: Smoothly navigate close to the planet
        const planetPos = new THREE.Vector3(commit.position_3d.x, commit.position_3d.z, commit.position_3d.y);
        cameraTarget.copy(planetPos);

        const zoomDist = Math.max(12, commit.star_size * 5.5);
        const offset = new THREE.Vector3(zoomDist * 0.7, zoomDist * 0.5, zoomDist);
        cameraTargetPosition = planetPos.clone().add(offset);
    }

    window.selectStar = selectStar;

    window.closeInspector = function () {
        inspector.classList.remove('active');
        selectedPlanet = null;
    };

    window.copySelectedHash = function () {
        if (!selectedPlanet) return;
        navigator.clipboard.writeText(selectedPlanet.hash).then(() => {
            const btn = document.getElementById('copy-hash-btn');
            const orig = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = orig; }, 1800);
        });
    };

    // UI button setups
    function setupUIControls() {
        playBtn.onclick = togglePlay;

        scrubber.oninput = (e) => {
            if (isPlaying) togglePlay();
            updateTimelineVisibility(parseInt(e.target.value, 10));
        };

        speedSelect.onchange = (e) => {
            playbackSpeed = parseFloat(e.target.value);
        };

        // Sound toggle
        const soundBtn = document.getElementById('btn-sound');
        soundBtn.onclick = () => {
            const unmuted = window.celestialAudio.toggleMute();
            soundBtn.classList.toggle('active', unmuted);
            soundBtn.querySelector('.btn-label').textContent = unmuted ? 'Audio ON' : 'Audio OFF';
        };

        // Snap to Illustration Perspective Button
        const illustrateBtn = document.getElementById('btn-illustrate');
        if (illustrateBtn) {
            illustrateBtn.onclick = () => {
                cameraTarget.copy(ILLUSTRATION_TARGET);
                cameraTargetPosition = ILLUSTRATION_CAM_POS.clone();
                controls.target.copy(ILLUSTRATION_TARGET);
                illustrateBtn.classList.add('active');
                setTimeout(() => illustrateBtn.classList.remove('active'), 1200);
            };
        }

        // Auto-orbit toggle
        const orbitBtn = document.getElementById('btn-autorotate');
        orbitBtn.onclick = () => {
            autoRotate = !autoRotate;
            controls.autoRotate = autoRotate;
            orbitBtn.classList.toggle('active', autoRotate);
        };

        // Reset camera
        const resetBtn = document.getElementById('btn-reset');
        resetBtn.onclick = () => {
            cameraTarget.set(0, 0, 0);
            cameraTargetPosition = ILLUSTRATION_CAM_POS.clone();
        };

        // 2D / 3D toggle
        const viewBtn = document.getElementById('btn-view-toggle');
        viewBtn.onclick = () => {
            is2DView = !is2DView;
            viewBtn.classList.toggle('active', is2DView);
            viewBtn.querySelector('.btn-label').textContent = is2DView ? 'Top-Down 2D' : 'Orbital 3D';

            if (is2DView) {
                cameraTarget.set(0, 0, 0);
                cameraTargetPosition = new THREE.Vector3(0, 240, 0.001);
            } else {
                cameraTarget.set(0, 0, 0);
                cameraTargetPosition = ILLUSTRATION_CAM_POS.clone();
            }
        };

        // Custom repo loader prompt
        const loadRepoBtn = document.getElementById('btn-load-repo');
        loadRepoBtn.onclick = () => {
            const inputPath = prompt('Enter path to local Git repository:', '.');
            if (inputPath !== null) {
                loadGalaxy(inputPath.trim() || '.');
            }
        };

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            } else if (e.code === 'Escape') {
                window.closeInspector();
            } else if (e.code === 'KeyR') {
                resetBtn.click();
            } else if (e.code === 'KeyI') {
                if (illustrateBtn) illustrateBtn.click();
            } else if (e.code === 'KeyH') {
                const overlay = document.querySelector('.ui-overlay');
                if (overlay) overlay.style.display = overlay.style.display === 'none' ? 'flex' : 'none';
            }
        });
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Animation Render Loop
    function animate() {
        requestAnimationFrame(animate);

        // Smooth camera lerp
        if (cameraTargetPosition) {
            camera.position.lerp(cameraTargetPosition, 0.05);
            controls.target.lerp(cameraTarget, 0.05);
            if (camera.position.distanceTo(cameraTargetPosition) < 0.25) {
                cameraTargetPosition = null;
            }
        }

        controls.update();

        // Rotate asteroid belt slowly around Sun
        if (asteroidBelt) {
            asteroidBelt.rotation.y += 0.0005;
        }

        // Slowly rotate Sun coronal rays
        if (sunRaysMesh) {
            sunRaysMesh.rotation.z += 0.0008;
        }

        // Advance dynamic sweeping comet along its inclined elliptical orbit
        if (sweepingComet) {
            sweepingComet.angle += sweepingComet.speed;
            const th = sweepingComet.angle;
            const cx = sweepingComet.a * Math.cos(th);
            const cy = sweepingComet.b * Math.sin(th);
            const cy1 = cy * Math.cos(sweepingComet.inclination);
            const cz1 = cy * Math.sin(sweepingComet.inclination);
            sweepingComet.group.position.set(cx, cz1, cy1);

            // Orient comet tail away from the Sun at (0,0,0)
            const sunDir = sweepingComet.group.position.clone().negate().normalize();
            sweepingComet.group.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), sunDir);
        }

        // Realistic Planetary Rotation & Atmospheric Dynamics
        const time = performance.now() * 0.0015;
        planetMeshes.forEach(s => {
            // Spin planet on tilted axis
            if (s.mesh) {
                s.mesh.rotation.y += s.rotationSpeed || 0.01;
            }
            // Terrestrial cloud layer spins slightly faster
            if (s.cloudMesh) {
                s.cloudMesh.rotation.y += (s.rotationSpeed || 0.01) * 1.35;
            }
            // Moon orbits Earth
            if (s.moonMesh && s.moonMesh.parent) {
                s.moonMesh.parent.rotation.y += 0.025;
            }

            // Pulsing solar coronal flare animation
            if (s.commit.star_class === 'SUPERMASSIVE_SUN' && s.sprite) {
                const pulse = Math.sin(time * 2.0) * 0.35;
                s.sprite.scale.set(
                    (s.commit.star_size * 6.0) + pulse,
                    (s.commit.star_size * 6.0) + pulse,
                    1
                );
            }
        });

        renderer.render(scene, camera);
    }

    // Boot
    window.addEventListener('DOMContentLoaded', () => {
        initScene();
        animate();
        loadGalaxy('.');
    });
})();
