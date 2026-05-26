"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGhostReplay = loadGhostReplay;
exports.saveGhostReplayIfBest = saveGhostReplayIfBest;
exports.buildReplay = buildReplay;
const GHOST_REPLAYS_KEY = 'memorabilia_ghost_replays';
// ── Storage helpers ───────────────────────────────────────────────────────────
function replayKey(era, level) {
    return `${era}-${level}`;
}
function loadAllReplays() {
    try {
        const data = localStorage.getItem(GHOST_REPLAYS_KEY);
        return data ? JSON.parse(data) : {};
    }
    catch {
        return {};
    }
}
function saveAllReplays(replays) {
    try {
        localStorage.setItem(GHOST_REPLAYS_KEY, JSON.stringify(replays));
    }
    catch (error) {
        console.error('Failed to save ghost replays:', error);
    }
}
// ── Public API ────────────────────────────────────────────────────────────────
function loadGhostReplay(era, level) {
    const all = loadAllReplays();
    return all[replayKey(era, level)] ?? null;
}
/**
 * Save replay if it has a better score than the stored one.
 * Returns true if the replay was saved (new best).
 */
function saveGhostReplayIfBest(replay) {
    const all = loadAllReplays();
    const key = replayKey(replay.era, replay.level);
    const existing = all[key];
    if (!existing || replay.score > existing.score) {
        all[key] = replay;
        saveAllReplays(all);
        return true;
    }
    return false;
}
function buildReplay(gameId, era, level, moves, totalTimeMs, score, emojis) {
    return { gameId, era, level, moves, totalTime: totalTimeMs, score, emojis };
}
