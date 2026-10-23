/**
 * Procedural Solar System Planet & Star Texture Generator
 * Photorealistic Canvas 2D Procedural Textures matching the Solar System Illustration:
 * - Sun with convection granules & radiant coronal rays
 * - Mercury (cratered grey regolith)
 * - Venus (dense golden-cream sulfuric cloud deck)
 * - Earth (blue oceans, continents, polar ice caps, cloud sphere & Moon)
 * - Mars (rusty iron oxide terrain, dark volcanic plains, white ice caps)
 * - Jupiter (iconic striated belts, white ovals & Great Red Spot)
 * - Saturn (warm golden bands & photorealistic rings with Cassini Division)
 * - Uranus (pale aquamarine cyan ice giant)
 * - Neptune (deep cobalt azure with white methane storm clouds)
 * - Pluto / Comets (nitrogen glaciers & glowing ion/dust tails)
 *
 * 100% offline, zero external image assets required.
 */

const PlanetTextureGenerator = (function () {
    'use strict';

    // Fast Pseudo-Random / Simplex-like 2D Noise
    class Noise2D {
        constructor(seed = 1337) {
            this.seed = seed;
            this.perm = new Uint8Array(512);
            const p = new Uint8Array(256);
            for (let i = 0; i < 256; i++) p[i] = i;
            let s = seed;
            for (let i = 255; i > 0; i--) {
                s = (s * 16807 + 7) % 2147483647;
                const j = s % (i + 1);
                const tmp = p[i];
                p[i] = p[j];
                p[j] = tmp;
            }
            for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
        }

        noise(x, y) {
            const X = Math.floor(x) & 255;
            const Y = Math.floor(y) & 255;
            const xf = x - Math.floor(x);
            const yf = y - Math.floor(y);

            const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
            const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);

            const aa = this.perm[this.perm[X] + Y];
            const ab = this.perm[this.perm[X] + Y + 1];
            const ba = this.perm[this.perm[X + 1] + Y];
            const bb = this.perm[this.perm[X + 1] + Y + 1];

            const grad = (hash, x, y) => {
                const h = hash & 7;
                const u = h < 4 ? x : y;
                const v = h < 4 ? y : x;
                return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
            };

            const x1 = grad(aa, xf, yf) * (1 - u) + grad(ba, xf - 1, yf) * u;
            const x2 = grad(ab, xf, yf - 1) * (1 - u) + grad(bb, xf - 1, yf - 1) * u;
            return (x1 * (1 - v) + x2 * v) * 0.5 + 0.5;
        }

        fbm(x, y, octaves = 5, persistence = 0.5, lacunarity = 2.0) {
            let total = 0;
            let freq = 1;
            let amp = 1;
            let maxAmp = 0;
            for (let i = 0; i < octaves; i++) {
                total += this.noise(x * freq, y * freq) * amp;
                maxAmp += amp;
                amp *= persistence;
                freq *= lacunarity;
            }
            return total / maxAmp;
        }
    }

    const cache = new Map();

    function createOffscreenCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    /**
     * 1. THE CENTRAL SUN (Incandescent Star with Granules and Radiant Corona)
     */
    function createSunTexture(width = 512, height = 256) {
        const key = `sun_${width}_${height}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const noise = new Noise2D(42);

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const u = nx * 8.0;
                const v = ny * 4.0;

                const n1 = noise.fbm(u, v, 5, 0.55, 2.2);
                const n2 = noise.fbm(u * 2.5, v * 2.5, 4, 0.5, 2.0);
                const val = n1 * 0.7 + n2 * 0.3;

                let r, g, b;
                if (val > 0.65) {
                    const t = (val - 0.65) / 0.35;
                    r = 255;
                    g = Math.min(255, 235 + t * 20);
                    b = Math.min(255, 160 + t * 95);
                } else if (val > 0.42) {
                    const t = (val - 0.42) / 0.23;
                    r = 255;
                    g = Math.floor(160 + t * 75);
                    b = Math.floor(30 + t * 100);
                } else if (val > 0.25) {
                    const t = (val - 0.25) / 0.17;
                    r = Math.floor(225 + t * 30);
                    g = Math.floor(70 + t * 90);
                    b = 10;
                } else {
                    const t = val / 0.25;
                    r = Math.floor(140 + t * 85);
                    g = Math.floor(30 + t * 40);
                    b = 5;
                }

                const idx = (y * width + x) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        cache.set(key, texture);
        return texture;
    }

    /**
     * Radiant Sun Coronal Rays & Glow Flare Texture (Matching Getty Illustration)
     */
    function createSunCoronaRaysTexture(width = 512, height = 512) {
        const key = `sun_corona_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const cx = width / 2;
        const cy = height / 2;

        // Radial golden flare
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, width / 2);
        grad.addColorStop(0.0, 'rgba(255, 255, 240, 1.0)');
        grad.addColorStop(0.18, 'rgba(255, 220, 100, 0.95)');
        grad.addColorStop(0.35, 'rgba(255, 140, 20, 0.55)');
        grad.addColorStop(0.65, 'rgba(255, 80, 10, 0.18)');
        grad.addColorStop(1.0, 'rgba(255, 40, 0, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Radiant spike rays
        const numRays = 32;
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2;
            const length = (width * 0.46) * (0.6 + 0.4 * Math.sin(i * 3.7));
            const rayGrad = ctx.createLinearGradient(0, 0, Math.cos(angle) * length, Math.sin(angle) * length);
            rayGrad.addColorStop(0, 'rgba(255, 250, 210, 0.8)');
            rayGrad.addColorStop(0.5, 'rgba(255, 180, 50, 0.3)');
            rayGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');

            ctx.beginPath();
            ctx.moveTo(0, 0);
            const wAngle = 0.035;
            ctx.lineTo(Math.cos(angle - wAngle) * length * 0.3, Math.sin(angle - wAngle) * length * 0.3);
            ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
            ctx.lineTo(Math.cos(angle + wAngle) * length * 0.3, Math.sin(angle + wAngle) * length * 0.3);
            ctx.closePath();
            ctx.fillStyle = rayGrad;
            ctx.fill();
        }
        ctx.restore();

        const texture = new THREE.CanvasTexture(canvas);
        cache.set(key, texture);
        return texture;
    }

    /**
     * 2. MERCURY (Cratered Rocky Grey Regolith)
     */
    function createMercuryTexture(seed = 11, width = 512, height = 256) {
        const key = `mercury_${seed}_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const noise = new Noise2D(seed);

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const baseNoise = noise.fbm(nx * 8.0, ny * 4.0, 5, 0.55, 2.1);
                const craterNoise = noise.fbm(nx * 18.0, ny * 9.0, 4, 0.6, 2.3);

                // Rugged cratered grey surface with subtle warm basalt undertones
                let lum = Math.floor(100 + baseNoise * 90 + (craterNoise - 0.5) * 45);
                lum = Math.max(45, Math.min(235, lum));

                const idx = (y * width + x) * 4;
                data[idx] = Math.floor(lum * 1.02);     // Red
                data[idx + 1] = Math.floor(lum * 0.98); // Green
                data[idx + 2] = Math.floor(lum * 0.94); // Blue
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        cache.set(key, texture);
        return texture;
    }

    /**
     * 3. VENUS (Dense Golden-Yellow & Cream Sulfuric Cloud Deck)
     */
    function createVenusTexture(seed = 22, width = 512, height = 256) {
        const key = `venus_${seed}_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const noise = new Noise2D(seed);
        const cCream = new THREE.Color(0xfff3cf);
        const cGold = new THREE.Color(0xe6b85c);
        const cAmber = new THREE.Color(0xb87d2b);

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            // Smooth planetary chevron cloud flow
            const wave = Math.sin(ny * Math.PI * 6.0 + Math.sin(ny * Math.PI * 12.0) * 0.4) * 0.5 + 0.5;

            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const n = noise.fbm(nx * 6.0, ny * 3.0, 4, 0.5, 2.0);
                const t = wave * 0.55 + n * 0.45;

                const col = new THREE.Color();
                if (t > 0.6) {
                    col.copy(cGold).lerp(cCream, (t - 0.6) / 0.4);
                } else {
                    col.copy(cAmber).lerp(cGold, t / 0.6);
                }

                const idx = (y * width + x) * 4;
                data[idx] = Math.floor(col.r * 255);
                data[idx + 1] = Math.floor(col.g * 255);
                data[idx + 2] = Math.floor(col.b * 255);
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        cache.set(key, texture);
        return texture;
    }

    /**
     * 4. EARTH (Habitable Blue Marble: Vibrant Oceans, Continents, Ice Caps)
     */
    function createEarthTexture(seed = 33, width = 512, height = 256) {
        const key = `earth_${seed}_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const noise = new Noise2D(seed);

        const cDeepOcean = new THREE.Color(0x0a244d);
        const cShallowOcean = new THREE.Color(0x1976d2);
        const cCoast = new THREE.Color(0x4fc3f7);
        const cBeach = new THREE.Color(0xd7ccc8);
        const cLushGreen = new THREE.Color(0x2e7d32);
        const cSavannah = new THREE.Color(0x8d6e63);
        const cDesert = new THREE.Color(0xc7a76d);
        const cMountain = new THREE.Color(0x4e342e);
        const cIce = new THREE.Color(0xffffff);

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            const polarDist = Math.abs(ny - 0.5) * 2.0;

            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const elevation = noise.fbm(nx * 5.0, ny * 3.5, 6, 0.5, 2.1);
                const col = new THREE.Color();

                if (polarDist > 0.86 || (polarDist > 0.72 && elevation > 0.54)) {
                    // Polar ice sheets
                    col.copy(cIce);
                } else if (elevation < 0.44) {
                    // Deep ocean
                    const t = elevation / 0.44;
                    col.copy(cDeepOcean).lerp(cShallowOcean, t);
                } else if (elevation < 0.48) {
                    // Coastal shallows
                    const t = (elevation - 0.44) / 0.04;
                    col.copy(cShallowOcean).lerp(cCoast, t);
                } else if (elevation < 0.51) {
                    // Sand beaches
                    col.copy(cBeach);
                } else if (elevation < 0.65) {
                    // Vegetation & plains
                    const t = (elevation - 0.51) / 0.14;
                    col.copy(cLushGreen).lerp(cSavannah, t * 0.4);
                } else if (elevation < 0.76) {
                    // Highlands & deserts
                    const t = (elevation - 0.65) / 0.11;
                    col.copy(cSavannah).lerp(cDesert, t);
                } else if (elevation < 0.88) {
                    // Mountain chains
                    const t = (elevation - 0.76) / 0.12;
                    col.copy(cMountain).lerp(cIce, t * 0.5);
                } else {
                    // Snowcapped peaks
                    col.copy(cIce);
                }

                const idx = (y * width + x) * 4;
                data[idx] = Math.floor(col.r * 255);
                data[idx + 1] = Math.floor(col.g * 255);
                data[idx + 2] = Math.floor(col.b * 255);
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        cache.set(key, texture);
        return texture;
    }

    /**
     * Swirling Earth Cloud Layer Texture (Independent Atmosphere)
     */
    function createCloudTexture(seed = 44, width = 512, height = 256) {
        const key = `cloud_${seed}_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const noise = new Noise2D(seed);

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const cloudDensity = noise.fbm(nx * 7.0, ny * 4.0, 5, 0.55, 2.0);
                const alpha = Math.max(0, Math.min(255, Math.floor((cloudDensity - 0.46) * 520)));

                const idx = (y * width + x) * 4;
                data[idx] = 255;
                data[idx + 1] = 255;
                data[idx + 2] = 255;
                data[idx + 3] = alpha;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        cache.set(key, texture);
        return texture;
    }

    /**
     * Earth's Moon Texture (Lunar Maria & Cratered Highlands)
     */
    function createMoonTexture(seed = 55, width = 256, height = 128) {
        const key = `moon_${seed}_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const noise = new Noise2D(seed);

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const n = noise.fbm(nx * 6.0, ny * 3.0, 4, 0.55, 2.1);
                // Dark lunar basalt plains vs pale highlands
                const lum = n < 0.48 ? Math.floor(70 + n * 80) : Math.floor(130 + n * 110);

                const idx = (y * width + x) * 4;
                data[idx] = lum;
                data[idx + 1] = lum;
                data[idx + 2] = Math.floor(lum * 0.98);
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        cache.set(key, texture);
        return texture;
    }

    /**
     * 5. MARS (Red Planet: Iron Oxide Ochre, Dark Basaltic Plains, White Polar Caps)
     */
    function createMarsTexture(seed = 66, width = 512, height = 256) {
        const key = `mars_${seed}_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const noise = new Noise2D(seed);

        const cRust = new THREE.Color(0xc1440e);
        const cOchre = new THREE.Color(0xd86a34);
        const cDust = new THREE.Color(0xe58b4f);
        const cDarkBasalt = new THREE.Color(0x3e170c);
        const cPolarIce = new THREE.Color(0xffffff);

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            const polarDist = Math.abs(ny - 0.5) * 2.0;

            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const n = noise.fbm(nx * 6.0, ny * 4.0, 5, 0.52, 2.1);
                const col = new THREE.Color();

                if (polarDist > 0.88) {
                    // Polar ice caps
                    col.copy(cPolarIce);
                } else if (n < 0.38) {
                    // Dark volcanic lowlands (Syrtis Major)
                    const t = n / 0.38;
                    col.copy(cDarkBasalt).lerp(cRust, t);
                } else if (n < 0.68) {
                    // Classic Martian rusty ochre regolith
                    const t = (n - 0.38) / 0.30;
                    col.copy(cRust).lerp(cOchre, t);
                } else {
                    // Fine windblown sand dunes
                    const t = (n - 0.68) / 0.32;
                    col.copy(cOchre).lerp(cDust, t);
                }

                const idx = (y * width + x) * 4;
                data[idx] = Math.floor(col.r * 255);
                data[idx + 1] = Math.floor(col.g * 255);
                data[idx + 2] = Math.floor(col.b * 255);
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        cache.set(key, texture);
        return texture;
    }

    /**
     * 6. JUPITER (King of Planets: Striated Belts, Zones, White Ovals & Great Red Spot)
     */
    function createJupiterTexture(seed = 77, width = 512, height = 256) {
        const key = `jupiter_${seed}_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const noise = new Noise2D(seed);

        const cTerracotta = new THREE.Color(0xa2481e);
        const cMahogany = new THREE.Color(0x6e2814);
        const cCream = new THREE.Color(0xf6ebd2);
        const cAmberZone = new THREE.Color(0xdcb073);
        const cRedSpot = new THREE.Color(0xcc2914);

        // Great Red Spot Coordinates (Southern Hemisphere)
        const spotX = 0.65;
        const spotY = 0.62;
        const spotRadX = 0.075;
        const spotRadY = 0.040;

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            // Alternating zonal belts & jets
            const bandFreq = 18.0;
            const beltSine = Math.sin(ny * Math.PI * bandFreq);
            const beltVal = beltSine * 0.5 + 0.5;

            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const turbX = nx * 8.0 + noise.noise(nx * 5.0, ny * 10.0) * 0.9;
                const turbY = ny * 3.5;
                const n = noise.fbm(turbX, turbY, 4, 0.55, 2.2);

                const t = beltVal * 0.65 + n * 0.35;
                const col = new THREE.Color();

                if (t > 0.62) {
                    col.copy(cAmberZone).lerp(cCream, (t - 0.62) / 0.38);
                } else if (t > 0.35) {
                    col.copy(cTerracotta).lerp(cAmberZone, (t - 0.35) / 0.27);
                } else {
                    col.copy(cMahogany).lerp(cTerracotta, t / 0.35);
                }

                // Great Red Spot Oval Swirl
                const dx = (nx - spotX) / spotRadX;
                const dy = (ny - spotY) / spotRadY;
                const distSq = dx * dx + dy * dy;
                if (distSq < 1.0) {
                    const spotFactor = 1.0 - Math.sqrt(distSq);
                    col.lerp(cRedSpot, spotFactor * 0.95);
                }

                const idx = (y * width + x) * 4;
                data[idx] = Math.floor(col.r * 255);
                data[idx + 1] = Math.floor(col.g * 255);
                data[idx + 2] = Math.floor(col.b * 255);
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        cache.set(key, texture);
        return texture;
    }

    /**
     * 7. SATURN (Golden Banded Gas Giant)
     */
    function createSaturnTexture(seed = 88, width = 512, height = 256) {
        const key = `saturn_${seed}_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const noise = new Noise2D(seed);

        const cGold = new THREE.Color(0xe5be7e);
        const cButterscotch = new THREE.Color(0xd29d56);
        const cPaleHazel = new THREE.Color(0xf6e2b8);
        const cSoftTan = new THREE.Color(0x9a6b33);

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            const wave = Math.sin(ny * Math.PI * 14.0) * 0.5 + 0.5;

            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const n = noise.fbm(nx * 5.0, ny * 3.0, 4, 0.5, 2.0);
                const t = wave * 0.6 + n * 0.4;

                const col = new THREE.Color();
                if (t > 0.65) {
                    col.copy(cGold).lerp(cPaleHazel, (t - 0.65) / 0.35);
                } else if (t > 0.35) {
                    col.copy(cButterscotch).lerp(cGold, (t - 0.35) / 0.3);
                } else {
                    col.copy(cSoftTan).lerp(cButterscotch, t / 0.35);
                }

                const idx = (y * width + x) * 4;
                data[idx] = Math.floor(col.r * 255);
                data[idx + 1] = Math.floor(col.g * 255);
                data[idx + 2] = Math.floor(col.b * 255);
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        cache.set(key, texture);
        return texture;
    }

    /**
     * Photorealistic Concentric Saturn Rings with Cassini Division
     */
    function createSaturnRingTexture(width = 512, height = 32) {
        const key = `saturn_ring_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const cRingBase = new THREE.Color(0xe0b979);

        for (let x = 0; x < width; x++) {
            const rNorm = x / width; // 0 = inner, 1 = outer
            let alpha = 0;
            let intensity = 1.0;

            if (rNorm > 0.12 && rNorm < 0.94) {
                if (rNorm < 0.28) {
                    // C Ring (translucent Crepe Ring)
                    alpha = 0.22;
                    intensity = 0.6;
                } else if (rNorm < 0.64) {
                    // B Ring (brightest, densest ring)
                    const band = Math.sin(rNorm * Math.PI * 40) * 0.5 + 0.5;
                    alpha = 0.85 + band * 0.15;
                    intensity = 1.1;
                } else if (rNorm < 0.72) {
                    // Cassini Division (dark distinct gap)
                    alpha = 0.04;
                    intensity = 0.2;
                } else {
                    // A Ring (outer ring)
                    const band = Math.sin(rNorm * Math.PI * 30) * 0.5 + 0.5;
                    alpha = 0.60 + band * 0.20;
                    intensity = 0.85;
                }
            }

            for (let y = 0; y < height; y++) {
                const idx = (y * width + x) * 4;
                data[idx] = Math.min(255, Math.floor(cRingBase.r * 255 * intensity));
                data[idx + 1] = Math.min(255, Math.floor(cRingBase.g * 255 * intensity));
                data[idx + 2] = Math.min(255, Math.floor(cRingBase.b * 255 * intensity));
                data[idx + 3] = Math.floor(alpha * 255);
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        cache.set(key, texture);
        return texture;
    }

    /**
     * 8. URANUS (Pale Aquamarine / Cyan Ice Giant)
     */
    function createUranusTexture(seed = 99, width = 512, height = 256) {
        const key = `uranus_${seed}_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const noise = new Noise2D(seed);

        const cAquamarine = new THREE.Color(0x76e2d8);
        const cPaleCyan = new THREE.Color(0xa8f2ea);
        const cDeepCyan = new THREE.Color(0x40a89e);

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const n = noise.fbm(nx * 4.0, ny * 2.5, 3, 0.5, 2.0);
                const col = new THREE.Color();

                if (n > 0.6) {
                    col.copy(cAquamarine).lerp(cPaleCyan, (n - 0.6) / 0.4);
                } else {
                    col.copy(cDeepCyan).lerp(cAquamarine, n / 0.6);
                }

                const idx = (y * width + x) * 4;
                data[idx] = Math.floor(col.r * 255);
                data[idx + 1] = Math.floor(col.g * 255);
                data[idx + 2] = Math.floor(col.b * 255);
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        cache.set(key, texture);
        return texture;
    }

    /**
     * 9. NEPTUNE (Deep Azure Cobalt Blue with White Methane Storm Wisps)
     */
    function createNeptuneTexture(seed = 101, width = 512, height = 256) {
        const key = `neptune_${seed}_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const noise = new Noise2D(seed);

        const cCobalt = new THREE.Color(0x1a46b8);
        const cDeepAzure = new THREE.Color(0x0e287a);
        const cBrightMethane = new THREE.Color(0x76aeff);
        const cWhiteCirrus = new THREE.Color(0xffffff);

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            const wave = Math.sin(ny * Math.PI * 10.0) * 0.5 + 0.5;

            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const n = noise.fbm(nx * 6.0, ny * 3.5, 4, 0.55, 2.2);
                const col = new THREE.Color();

                const t = wave * 0.55 + n * 0.45;
                if (t > 0.72) {
                    // White methane cirrus storm clouds
                    col.copy(cBrightMethane).lerp(cWhiteCirrus, (t - 0.72) / 0.28);
                } else if (t > 0.4) {
                    col.copy(cCobalt).lerp(cBrightMethane, (t - 0.4) / 0.32);
                } else {
                    col.copy(cDeepAzure).lerp(cCobalt, t / 0.4);
                }

                const idx = (y * width + x) * 4;
                data[idx] = Math.floor(col.r * 255);
                data[idx + 1] = Math.floor(col.g * 255);
                data[idx + 2] = Math.floor(col.b * 255);
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        cache.set(key, texture);
        return texture;
    }

    /**
     * 10. PLUTO / KUIPER BODY (Nitrogen Ice & Tholin Glaciers)
     */
    function createPlutoTexture(seed = 111, width = 256, height = 128) {
        const key = `pluto_${seed}_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        const noise = new Noise2D(seed);
        const cTan = new THREE.Color(0xb5805e);
        const cDarkTholin = new THREE.Color(0x60321c);
        const cWhiteGlacier = new THREE.Color(0xf5eedd);

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const n = noise.fbm(nx * 5.0, ny * 3.0, 4, 0.5, 2.0);
                const col = new THREE.Color();

                if (n > 0.6) {
                    col.copy(cTan).lerp(cWhiteGlacier, (n - 0.6) / 0.4);
                } else {
                    col.copy(cDarkTholin).lerp(cTan, n / 0.6);
                }

                const idx = (y * width + x) * 4;
                data[idx] = Math.floor(col.r * 255);
                data[idx + 1] = Math.floor(col.g * 255);
                data[idx + 2] = Math.floor(col.b * 255);
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        cache.set(key, texture);
        return texture;
    }

    /**
     * Glowing Comet Sprite / Head Texture
     */
    function createCometTexture(width = 128, height = 128) {
        const key = `comet_${width}`;
        if (cache.has(key)) return cache.get(key);

        const canvas = createOffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const cx = width / 2;
        const cy = height / 2;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, width / 2);
        grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.2, 'rgba(128, 222, 255, 0.9)');
        grad.addColorStop(0.5, 'rgba(0, 180, 255, 0.35)');
        grad.addColorStop(1.0, 'rgba(0, 50, 150, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        const texture = new THREE.CanvasTexture(canvas);
        cache.set(key, texture);
        return texture;
    }

    // Backwards-compatible aliases
    const createGasGiantTexture = (hex, secHex, seed) => createJupiterTexture(seed);
    const createTerrestrialTexture = (seed) => createEarthTexture(seed);
    const createVolcanicTexture = (seed) => createMarsTexture(seed);
    const createDesertCraterTexture = (seed) => createMercuryTexture(seed);
    const createIceGiantTexture = (seed) => createNeptuneTexture(seed);
    const createPulsarTexture = (seed) => createPlutoTexture(seed);
    const createPlanetaryRingTexture = (hex) => createSaturnRingTexture();

    return {
        createSunTexture,
        createSunCoronaRaysTexture,
        createMercuryTexture,
        createVenusTexture,
        createEarthTexture,
        createMoonTexture,
        createCloudTexture,
        createMarsTexture,
        createJupiterTexture,
        createSaturnTexture,
        createSaturnRingTexture,
        createUranusTexture,
        createNeptuneTexture,
        createPlutoTexture,
        createCometTexture,
        // Aliases
        createGasGiantTexture,
        createTerrestrialTexture,
        createVolcanicTexture,
        createDesertCraterTexture,
        createIceGiantTexture,
        createPulsarTexture,
        createPlanetaryRingTexture
    };
})();

// Export globally
window.PlanetTextureGenerator = PlanetTextureGenerator;
