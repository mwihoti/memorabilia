"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyChallengeConfig = getDailyChallengeConfig;
exports.loadDailyChallenge = loadDailyChallenge;
exports.saveDailyChallenge = saveDailyChallenge;
exports.isDailyChallengeCompleted = isDailyChallengeCompleted;
exports.getWeeklyChallengeConfig = getWeeklyChallengeConfig;
exports.loadWeeklyChallenge = loadWeeklyChallenge;
exports.saveWeeklyChallenge = saveWeeklyChallenge;
exports.isWeeklyChallengeCompleted = isWeeklyChallengeCompleted;
const streakStore_1 = require("./streakStore");
const gameRules_1 = require("../../../shared/gameRules");
const DAILY_CHALLENGE_KEY = 'memorabilia_daily_challenge';
const WEEKLY_CHALLENGE_KEY = 'memorabilia_weekly_challenge';
function getDailyChallengeConfig() {
    return (0, gameRules_1.getDailyChallengeConfigFromDate)((0, streakStore_1.getToday)());
}
// ── Storage helpers ───────────────────────────────────────────────────────────
function loadDailyChallenge() {
    try {
        const data = localStorage.getItem(DAILY_CHALLENGE_KEY);
        if (data) {
            const stored = JSON.parse(data);
            // If the stored challenge is from today, return it as-is
            if (stored.date === (0, streakStore_1.getToday)())
                return stored;
        }
    }
    catch {
        // fall through
    }
    // Build a fresh challenge for today
    const { difficulty, level, seed } = getDailyChallengeConfig();
    return {
        date: (0, streakStore_1.getToday)(),
        seed,
        difficulty,
        level,
        completed: false,
    };
}
function saveDailyChallenge(score, medal) {
    const current = loadDailyChallenge();
    const updated = {
        ...current,
        completed: true,
        score,
        medal,
    };
    try {
        localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(updated));
    }
    catch (error) {
        console.error('Failed to save daily challenge:', error);
    }
}
function isDailyChallengeCompleted() {
    const challenge = loadDailyChallenge();
    return challenge.completed;
}
function getWeeklyChallengeConfig() {
    return (0, gameRules_1.getWeeklyChallengeConfigFromDate)((0, streakStore_1.getToday)());
}
function loadWeeklyChallenge() {
    try {
        const data = localStorage.getItem(WEEKLY_CHALLENGE_KEY);
        if (data) {
            const stored = JSON.parse(data);
            if (stored.weekKey === getWeeklyChallengeConfig().weekKey)
                return stored;
        }
    }
    catch {
        // fall through
    }
    const { difficulty, level, seed, weekKey } = getWeeklyChallengeConfig();
    return {
        weekKey,
        seed,
        difficulty,
        level,
        completed: false,
    };
}
function saveWeeklyChallenge(score, medal) {
    const current = loadWeeklyChallenge();
    const updated = {
        ...current,
        completed: true,
        score,
        medal,
    };
    try {
        localStorage.setItem(WEEKLY_CHALLENGE_KEY, JSON.stringify(updated));
    }
    catch (error) {
        console.error('Failed to save weekly challenge:', error);
    }
}
function isWeeklyChallengeCompleted() {
    return loadWeeklyChallenge().completed;
}
