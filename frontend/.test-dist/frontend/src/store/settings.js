"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerSettings = getPlayerSettings;
exports.savePlayerSettings = savePlayerSettings;
exports.getPreviewMultiplier = getPreviewMultiplier;
const SETTINGS_KEY = 'memorabilia_settings';
const DEFAULT_SETTINGS = {
    soundEnabled: true,
    reducedMotion: false,
    previewLength: 'long',
};
function getPlayerSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw)
            return DEFAULT_SETTINGS;
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
    catch {
        return DEFAULT_SETTINGS;
    }
}
function savePlayerSettings(settings) {
    const next = { ...getPlayerSettings(), ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
}
function getPreviewMultiplier(setting) {
    if (setting === 'very_long')
        return 1.75;
    if (setting === 'long')
        return 1.35;
    return 1;
}
