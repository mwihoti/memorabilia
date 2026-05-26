"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSoundEnabled = exports.toggleSound = exports.playVictorySound = exports.playMismatchSound = exports.playMatchSound = exports.playFlipSound = exports.soundManager = void 0;
// Sound effects using Web Audio API
const settings_1 = require("../store/settings");
class SoundManager {
    audioContext = null;
    enabled = (0, settings_1.getPlayerSettings)().soundEnabled;
    constructor() {
        // Initialize on first user interaction
        if (typeof window !== 'undefined') {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    ensureContext() {
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    // Flip sound - short beep
    playFlip() {
        if (!this.enabled || !this.audioContext)
            return;
        this.ensureContext();
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
    // Match sound - success chime
    playMatch() {
        if (!this.enabled || !this.audioContext)
            return;
        this.ensureContext();
        const notes = [523.25, 659.25, 783.99]; // C, E, G
        const startTime = this.audioContext.currentTime;
        notes.forEach((freq, i) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            const time = startTime + (i * 0.1);
            gainNode.gain.setValueAtTime(0.2, time);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
            oscillator.start(time);
            oscillator.stop(time + 0.3);
        });
    }
    // Mismatch sound - error buzz
    playMismatch() {
        if (!this.enabled || !this.audioContext)
            return;
        this.ensureContext();
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.frequency.value = 200;
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    // Victory sound - celebration
    playVictory() {
        if (!this.enabled || !this.audioContext)
            return;
        this.ensureContext();
        const melody = [
            { freq: 523.25, duration: 0.15 }, // C
            { freq: 659.25, duration: 0.15 }, // E
            { freq: 783.99, duration: 0.15 }, // G
            { freq: 1046.50, duration: 0.4 }, // C (high)
        ];
        let time = this.audioContext.currentTime;
        melody.forEach((note) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.frequency.value = note.freq;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, time);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + note.duration);
            oscillator.start(time);
            oscillator.stop(time + note.duration);
            time += note.duration;
        });
    }
    setEnabled(enabled) {
        this.enabled = enabled;
        (0, settings_1.savePlayerSettings)({ soundEnabled: enabled });
    }
    toggle() {
        this.enabled = !this.enabled;
        (0, settings_1.savePlayerSettings)({ soundEnabled: this.enabled });
        return this.enabled;
    }
    isEnabled() {
        return this.enabled;
    }
}
// Singleton instance
exports.soundManager = new SoundManager();
// Convenience functions
const playFlipSound = () => exports.soundManager.playFlip();
exports.playFlipSound = playFlipSound;
const playMatchSound = () => exports.soundManager.playMatch();
exports.playMatchSound = playMatchSound;
const playMismatchSound = () => exports.soundManager.playMismatch();
exports.playMismatchSound = playMismatchSound;
const playVictorySound = () => exports.soundManager.playVictory();
exports.playVictorySound = playVictorySound;
const toggleSound = () => exports.soundManager.toggle();
exports.toggleSound = toggleSound;
const isSoundEnabled = () => exports.soundManager.isEnabled();
exports.isSoundEnabled = isSoundEnabled;
