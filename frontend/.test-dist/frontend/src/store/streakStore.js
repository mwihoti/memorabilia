"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToday = getToday;
exports.loadStreak = loadStreak;
exports.recordGamePlayed = recordGamePlayed;
exports.getStreakDisplay = getStreakDisplay;
const STREAK_KEY = 'memorabilia_streak';
// ── Date helpers ──────────────────────────────────────────────────────────────
function getToday() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
function daysBetween(dateA, dateB) {
    const a = new Date(dateA).getTime();
    const b = new Date(dateB).getTime();
    return Math.round(Math.abs(b - a) / 86_400_000);
}
function computeMultiplierBonus(streak) {
    if (streak >= 30)
        return 1.0;
    if (streak >= 14)
        return 0.5;
    if (streak >= 7)
        return 0.25;
    return 0;
}
function computeShields(streak, current) {
    // Earn a shield at day 3 and day 7; max 2 shields total
    let earned = 0;
    if (streak >= 3)
        earned++;
    if (streak >= 7)
        earned++;
    // Don't decrease existing shield count (shields are consumed, not lost)
    return Math.min(2, Math.max(current, earned));
}
// ── Public API ────────────────────────────────────────────────────────────────
function loadStreak() {
    try {
        const data = localStorage.getItem(STREAK_KEY);
        if (data)
            return JSON.parse(data);
    }
    catch {
        // fall through to default
    }
    return {
        currentStreak: 0,
        longestStreak: 0,
        lastPlayedDate: '',
        shieldsAvailable: 0,
        multiplierBonus: 0,
    };
}
function saveStreak(streak) {
    try {
        localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
    }
    catch (error) {
        console.error('Failed to save streak:', error);
    }
}
function recordGamePlayed() {
    const today = getToday();
    const streak = loadStreak();
    const lastPlayed = streak.lastPlayedDate;
    let newStreak = streak.currentStreak;
    let shields = streak.shieldsAvailable;
    if (lastPlayed === today) {
        // Already played today — no change
        return streak;
    }
    if (lastPlayed === '') {
        // First ever game
        newStreak = 1;
    }
    else {
        const gap = daysBetween(lastPlayed, today);
        if (gap === 1) {
            // Consecutive day
            newStreak = streak.currentStreak + 1;
        }
        else if (gap > 1 && shields > 0) {
            // Missed a day but has a shield — consume shield, keep streak
            shields = shields - 1;
            newStreak = streak.currentStreak + 1;
        }
        else {
            // Gap > 1 and no shields — reset
            newStreak = 1;
        }
    }
    const longestStreak = Math.max(streak.longestStreak, newStreak);
    const shieldsAvailable = computeShields(newStreak, shields);
    const multiplierBonus = computeMultiplierBonus(newStreak);
    const updated = {
        currentStreak: newStreak,
        longestStreak,
        lastPlayedDate: today,
        shieldsAvailable,
        multiplierBonus,
    };
    saveStreak(updated);
    return updated;
}
function getStreakDisplay(streak) {
    if (streak.currentStreak <= 0)
        return 'Start your streak today!';
    return `🔥 ${streak.currentStreak}-day streak!`;
}
