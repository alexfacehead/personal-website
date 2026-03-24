// audio.js — Web Audio API procedural sound effects

export class Audio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.muted = false;
        this._initialized = false;
        this._lastPlayTime = {};
        this._minInterval = 50; // ms between same sound category
    }

    init() {
        if (this._initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this._initialized = true;
        } catch (e) {
            console.warn('Web Audio API not available');
        }
    }

    _canPlay(category) {
        if (!this._initialized || this.muted) return false;
        const now = performance.now();
        const last = this._lastPlayTime[category] || 0;
        if (now - last < this._minInterval) return false;
        this._lastPlayTime[category] = now;
        return true;
    }

    _osc(type, freq, freqEnd, duration, volume = 0.3) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (freqEnd !== freq) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), now + duration);
        }

        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + duration);
    }

    _noise(duration, volume = 0.1) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        source.connect(gain);
        gain.connect(this.masterGain);
        source.start(now);
    }

    hit() {
        if (!this._canPlay('hit')) return;
        const pitch = 200 + Math.random() * 100;
        this._osc('square', pitch, 80, 0.08, 0.15);
    }

    kill() {
        if (!this._canPlay('kill')) return;
        this._osc('sawtooth', 300, 50, 0.15, 0.12);
        this._noise(0.08, 0.05);
    }

    laser() {
        if (!this._canPlay('laser')) return;
        this._osc('sawtooth', 880, 220, 0.12, 0.1);
    }

    explosion() {
        if (!this._canPlay('explosion')) return;
        this._noise(0.3, 0.15);
        this._osc('sine', 80, 20, 0.3, 0.2);
    }

    pickup() {
        if (!this._canPlay('pickup')) return;
        this._osc('sine', 600, 900, 0.1, 0.15);
    }

    levelUp() {
        if (!this._canPlay('levelUp')) return;
        const now = this.ctx.currentTime;
        // Ascending arpeggio
        [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.3);
        });
    }

    dodge() {
        if (!this._canPlay('dodge')) return;
        this._osc('sine', 400, 800, 0.1, 0.1);
    }

    lightning() {
        if (!this._canPlay('lightning')) return;
        this._noise(0.05, 0.08);
        this._osc('sawtooth', 2000, 400, 0.08, 0.1);
    }

    freeze() {
        if (!this._canPlay('freeze')) return;
        this._osc('sine', 1200, 600, 0.2, 0.08);
    }

    bossAlert() {
        if (!this._canPlay('bossAlert')) return;
        const now = this.ctx.currentTime;
        [150, 120, 150, 120].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, now + i * 0.25);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.25 + 0.2);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * 0.25);
            osc.stop(now + i * 0.25 + 0.2);
        });
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.3;
        }
        return this.muted;
    }
}
