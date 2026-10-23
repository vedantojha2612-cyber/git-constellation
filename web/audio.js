/**
 * Git Constellation - Celestial Space Audio Synthesizer
 * Built with Web Audio API for hypnotic ambient drones and star sonification.
 */

class CelestialAudioEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = true;
        this.masterGain = null;
        this.droneGain = null;
        this.filter = null;
        this.oscillators = [];
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Master Gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            // Ambient Drone Filter (warm, deep space resonance)
            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.setValueAtTime(240, this.ctx.currentTime);
            this.filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

            // Drone Gain
            this.droneGain = this.ctx.createGain();
            this.droneGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            this.droneGain.connect(this.filter);
            this.filter.connect(this.masterGain);

            // Binaural Drone Oscillators: 55Hz (A1) & 55.6Hz for gentle cosmic beating
            const freqs = [55.0, 55.6, 110.2, 164.8];
            freqs.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                osc.type = idx === 0 ? 'sine' : (idx === 1 ? 'triangle' : 'sine');
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

                const oscGain = this.ctx.createGain();
                const gainVal = idx < 2 ? 0.35 : 0.08;
                oscGain.gain.setValueAtTime(gainVal, this.ctx.currentTime);

                osc.connect(oscGain);
                oscGain.connect(this.droneGain);
                osc.start();
                this.oscillators.push(osc);
            });

            // Gentle LFO modulating the filter frequency for living cosmic respiration
            const lfo = this.ctx.createOscillator();
            lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime); // 12.5s period
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.setValueAtTime(100, this.ctx.currentTime);
            lfo.connect(lfoGain);
            lfoGain.connect(this.filter.frequency);
            lfo.start();

            this.initialized = true;
        } catch (e) {\n            console.warn('AudioContext failed to initialize:', e);
        }
    }

    toggleMute() {
        if (!this.initialized) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            const target = this.isMuted ? 0.0001 : 0.6;
            this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.masterGain.gain.exponentialRampToValueAtTime(target, this.ctx.currentTime + 1.2);
        }
        return !this.isMuted;
    }

    /**
     * Trigger delicate celestial chime when a star appears or is clicked
     */
    playStarChime(starClass, size = 1.0) {
        if (!this.initialized || this.isMuted || !this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            let baseFreq = 523.25; // C5
            switch (starClass) {
                case 'SUPERMASSIVE_SUN':
                    baseFreq = 130.81; // C3 deep resonance
                    break;
                case 'MILESTONE_PULSAR':
                    baseFreq = 880.0;  // A5 bright crystal
                    break;
                case 'BLUE_SUPERGIANT':
                    baseFreq = 659.25; // E5
                    break;
                case 'WHITE_DWARF':
                    baseFreq = 783.99; // G5
                    break;
                case 'YELLOW_STAR':
                    baseFreq = 587.33; // D5
                    break;
                case 'RED_DWARF':
                default:
                    baseFreq = 440.0;  // A4
                    break;
            }

            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, now);

            // Shimmer envelope
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.12 * Math.min(size, 2.5), now + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 1.5);
        } catch (e) {
            // Audio glitch fallback
        }
    }
}

window.celestialAudio = new CelestialAudioEngine();
