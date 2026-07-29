class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Settings
        this.masterVolume = 0.7;
        this.musicVolume = 0.45;
        this.sfxVolume = 0.75;
        this.musicEnabled = true;
        this.sfxEnabled = true;

        // Nodes
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        // Routing
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this.updateVolumes();

        // Music State
        this.currentTrack = null;
        this.activeOscillators = [];
        this.nextNoteTime = 0;
        this.isPlaying = false;
        this.isPaused = false;

        // Timer
        this.timerID = null;

        // Tempo and patterns
        this.tempo = 120;
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // s
        this.currentNote = 0;

        this.tracks = {
            'menu': { tempo: 100, notes: [261.63, 329.63, 392.00, 329.63] },
            'gameplay': { tempo: 140, notes: [220.00, 261.63, 329.63, 293.66, 220.00, 196.00, 220.00, 261.63] },
            'boss': { tempo: 180, notes: [164.81, 174.61, 164.81, 196.00, 164.81, 174.61, 164.81, 220.00] },
            'shop': { tempo: 90, notes: [392.00, 440.00, 493.88, 523.25, 493.88, 440.00] },
            'gameover': { tempo: 80, notes: [329.63, 311.13, 293.66, 277.18, 261.63] }
        };

        // Sound Pool for limiting max instances
        this.soundPools = {};
    }

    initializeAudio() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    updateVolumes() {
        this.masterGain.gain.value = this.masterVolume;
        this.musicGain.gain.value = this.musicEnabled ? this.musicVolume : 0;
        this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
    }

    setMasterVolume(val) {
        this.masterVolume = val;
        this.updateVolumes();
    }

    setMusicVolume(val) {
        this.musicVolume = val;
        this.updateVolumes();
    }

    setEffectsVolume(val) {
        this.sfxVolume = val;
        this.updateVolumes();
    }

    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
        this.updateVolumes();
    }

    setEffectsEnabled(enabled) {
        this.sfxEnabled = enabled;
        this.updateVolumes();
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat;
        this.currentNote++;

        if (this.currentTrack && this.tracks[this.currentTrack]) {
            if (this.currentNote >= this.tracks[this.currentTrack].notes.length) {
                if (this.currentTrack === 'gameover') {
                    this.stopMusic();
                    return;
                }
                this.currentNote = 0;
            }
        }
    }

    scheduleNote(beatNumber, time) {
        if (!this.currentTrack || !this.tracks[this.currentTrack]) return;

        const track = this.tracks[this.currentTrack];
        if (beatNumber >= track.notes.length) return;

        const freq = track.notes[beatNumber];

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.musicGain);

        if (this.currentTrack === 'boss') {
            osc.type = 'sawtooth';
        } else if (this.currentTrack === 'menu' || this.currentTrack === 'shop') {
            osc.type = 'sine';
        } else {
            osc.type = 'triangle';
        }

        osc.frequency.value = freq;

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.3, time + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.2);

        this.activeOscillators.push(osc);

        while (this.activeOscillators.length > 20) {
            this.activeOscillators.shift();
        }
    }

    scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentNote, this.nextNoteTime);
            this.nextNote();
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    playMusic(trackId) {
        if (this.currentTrack === trackId && this.isPlaying) return;

        this.initializeAudio();
        this.stopMusic();

        if (!this.tracks[trackId]) return;

        this.currentTrack = trackId;
        this.tempo = this.tracks[trackId].tempo;
        this.isPlaying = true;
        this.isPaused = false;

        this.currentNote = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.05;
        this.scheduler();

        this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.musicGain.gain.linearRampToValueAtTime(this.musicEnabled ? this.musicVolume : 0, this.ctx.currentTime + 1.0);
    }

    fadeToMusic(trackId) {
        if (this.currentTrack === trackId) return;

        const now = this.ctx.currentTime;
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
        this.musicGain.gain.linearRampToValueAtTime(0, now + 1.0);

        setTimeout(() => {
            this.playMusic(trackId);
        }, 1000);
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
        this.activeOscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch (e) {}
        });
        this.activeOscillators = [];
        this.currentTrack = null;
    }

    pauseMusic() {
        if (!this.isPlaying || this.isPaused) return;
        this.isPaused = true;
        const now = this.ctx.currentTime;
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
        this.musicGain.gain.linearRampToValueAtTime(this.musicEnabled ? this.musicVolume * 0.3 : 0, now + 0.5);
    }

    resumeMusic() {
        if (!this.isPlaying || !this.isPaused) return;
        this.isPaused = false;
        const now = this.ctx.currentTime;
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
        this.musicGain.gain.linearRampToValueAtTime(this.musicEnabled ? this.musicVolume : 0, now + 0.5);
    }

    // --- SOUND EFFECTS ---

    playSound(type, weaponId = null) {
        this.initializeAudio();
        if (!this.sfxEnabled) return;

        // Rate limit duplicate sounds to prevent overpowering audio
        const now = this.ctx.currentTime;
        if (!this.soundPools[type]) {
            this.soundPools[type] = [];
        }

        // Remove old sounds from pool
        this.soundPools[type] = this.soundPools[type].filter(t => now - t < 0.1);

        // Max 3 of same sound in last 0.1 seconds
        if (this.soundPools[type].length >= 3) return;
        this.soundPools[type].push(now);

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.sfxGain);

        // Slightly vary pitch
        const detune = (Math.random() - 0.5) * 100;
        osc.detune.value = detune;

        let duration = 0.1;

        switch(type) {
            case 'throw':
                if (weaponId === 'steel_star') {
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(1000, now);
                    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
                } else if (weaponId === 'fire_star') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
                    duration = 0.2;
                } else if (weaponId === 'lightning_star') {
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(1200, now);
                    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
                    osc.frequency.linearRampToValueAtTime(2000, now + 0.2);
                    duration = 0.2;
                } else if (weaponId === 'shadow_blade') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
                    duration = 0.3;
                } else {
                    // Basic Shuriken
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
                }

                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
                break;

            case 'hit':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
                gainNode.gain.setValueAtTime(0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                duration = 0.05;
                break;

            case 'critical_hit':
                osc.type = 'square';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gainNode.gain.setValueAtTime(0.25, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                duration = 0.1;
                break;

            case 'break_wood':
            case 'break_stone':
            case 'break':
                osc.type = 'square';
                osc.frequency.setValueAtTime(type === 'break_wood' ? 100 : 80, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                duration = 0.2;
                break;

            case 'break_crystal':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                duration = 0.1;
                break;

            case 'metal_impact':
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                duration = 0.05;
                break;

            case 'coin':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.setValueAtTime(1500, now + 0.05);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
                duration = 0.3;
                break;

            case 'powerup':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(800, now + 0.3);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
                duration = 0.4;
                break;

            case 'buy':
            case 'unlock':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.setValueAtTime(600, now + 0.1);
                osc.frequency.setValueAtTime(800, now + 0.2);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
                duration = 0.4;
                break;

            case 'button':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                duration = 0.05;
                break;

            case 'wave_start':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(600, now + 0.5);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.6);
                duration = 0.6;
                break;

            case 'boss_entrance':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.linearRampToValueAtTime(50, now + 1.0);
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.4, now + 0.2);
                gainNode.gain.linearRampToValueAtTime(0, now + 1.2);
                duration = 1.2;
                break;

            case 'boss_defeat':
                osc.type = 'square';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 1.5);
                gainNode.gain.setValueAtTime(0.4, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 1.5);
                duration = 1.5;
                break;

            case 'pause':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                duration = 0.1;
                break;

            case 'gameover':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 1.0);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 1.0);
                duration = 1.0;
                break;
        }

        osc.start(now);
        osc.stop(now + duration);
    }
}

export const audioManager = new AudioManager();

// Wrapper for backwards compatibility in other files
export function playSound(type, weaponId = null) {
    audioManager.playSound(type, weaponId);
}
