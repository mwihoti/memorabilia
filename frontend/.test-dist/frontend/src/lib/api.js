"use strict";
// API client — calls Vercel serverless functions backed by Neon DB
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitScore = submitScore;
exports.fetchLeaderboard = fetchLeaderboard;
exports.fetchPlayerStats = fetchPlayerStats;
exports.fetchPlayerProgress = fetchPlayerProgress;
exports.savePlayerProgress = savePlayerProgress;
exports.startVerifiedRun = startVerifiedRun;
exports.sendTelemetry = sendTelemetry;
const BASE = import.meta.env.VITE_API_URL || '';
function getInitData() {
    try {
        return window.Telegram?.WebApp?.initData || '';
    }
    catch {
        return '';
    }
}
async function submitScore(params) {
    const res = await fetch(`${BASE}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, initData: getInitData() }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
}
async function fetchLeaderboard(limit = 100) {
    const res = await fetch(`${BASE}/api/leaderboard?limit=${limit}`);
    if (!res.ok)
        throw new Error('Failed to fetch leaderboard');
    return res.json();
}
async function fetchPlayerStats(telegramId) {
    const res = await fetch(`${BASE}/api/player/${telegramId}`);
    if (res.status === 404)
        return null;
    if (!res.ok)
        throw new Error('Failed to fetch player stats');
    return res.json();
}
async function fetchPlayerProgress(telegramUser) {
    const res = await fetch(`${BASE}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load', telegramUser, initData: getInitData() }),
    });
    if (!res.ok)
        throw new Error('Failed to fetch player progression');
    const payload = await res.json();
    return payload.progress ?? [];
}
async function savePlayerProgress(telegramUser, progress) {
    const res = await fetch(`${BASE}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', telegramUser, progress, initData: getInitData() }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(err.message || 'Failed to save player progression');
    }
}
async function startVerifiedRun(params) {
    const res = await fetch(`${BASE}/api/run-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, initData: getInitData() }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(err.message || 'Failed to create verified run');
    }
    return res.json();
}
async function sendTelemetry(payload) {
    try {
        await fetch(`${BASE}/api/telemetry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
        });
    }
    catch {
        // Best-effort only
    }
}
