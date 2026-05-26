import { calculateStars as calculateSharedStars, DIFFICULTY_META as SHARED_DIFFICULTY_META, DIFFICULTY_ORDER as SHARED_DIFFICULTY_ORDER, getDifficultyMeta as getSharedDifficultyMeta, getEraLevelRules, getEraUnlockCheckpoint, getMaxLevelForEra as getSharedMaxLevelForEra, getTimeBonusScore as getSharedTimeBonusScore, getTimeMedal as getSharedTimeMedal, getTotalLevelCount as getSharedTotalLevelCount, } from '../../../shared/gameRules.js';
export var GameStatus;
(function (GameStatus) {
    GameStatus[GameStatus["Active"] = 0] = "Active";
    GameStatus[GameStatus["Won"] = 1] = "Won";
    GameStatus[GameStatus["Abandoned"] = 2] = "Abandoned";
})(GameStatus || (GameStatus = {}));
export var Difficulty;
(function (Difficulty) {
    Difficulty[Difficulty["Easy"] = 1] = "Easy";
    Difficulty[Difficulty["Medium"] = 2] = "Medium";
    Difficulty[Difficulty["Hard"] = 3] = "Hard";
    Difficulty[Difficulty["Expert"] = 4] = "Expert";
    Difficulty[Difficulty["Master"] = 5] = "Master";
})(Difficulty || (Difficulty = {}));
export const DIFFICULTY_ORDER = [
    ...Array.from(SHARED_DIFFICULTY_ORDER),
];
export const DIFFICULTY_META = {
    [Difficulty.Easy]: { ...SHARED_DIFFICULTY_META[Difficulty.Easy], legacyDescription: '50 main levels' },
    [Difficulty.Medium]: { ...SHARED_DIFFICULTY_META[Difficulty.Medium], legacyDescription: '50 main levels' },
    [Difficulty.Hard]: { ...SHARED_DIFFICULTY_META[Difficulty.Hard], legacyDescription: '100 main levels' },
    [Difficulty.Expert]: { ...SHARED_DIFFICULTY_META[Difficulty.Expert], legacyDescription: '100 main levels' },
    [Difficulty.Master]: { ...SHARED_DIFFICULTY_META[Difficulty.Master], legacyDescription: '100 main levels' },
};
export function getDifficultyMeta(difficulty) {
    return {
        ...getSharedDifficultyMeta(difficulty),
        legacyDescription: DIFFICULTY_META[difficulty].legacyDescription,
    };
}
export const GAME_CONFIGS = {
    [Difficulty.Easy]: {
        difficulty: Difficulty.Easy,
        cardCount: 12,
        pairCount: 6,
        optimalMoves: 12,
    },
    [Difficulty.Medium]: {
        difficulty: Difficulty.Medium,
        cardCount: 20,
        pairCount: 10,
        optimalMoves: 20,
    },
    [Difficulty.Hard]: {
        difficulty: Difficulty.Hard,
        cardCount: 30,
        pairCount: 15,
        optimalMoves: 30,
    },
    [Difficulty.Expert]: {
        difficulty: Difficulty.Expert,
        cardCount: 32,
        pairCount: 16,
        optimalMoves: 32,
    },
    [Difficulty.Master]: {
        difficulty: Difficulty.Master,
        cardCount: 32,
        pairCount: 16,
        optimalMoves: 32,
    },
};
// Star rating calculation
export function calculateStars(moves, optimalMoves) {
    return calculateSharedStars(moves, optimalMoves);
}
// Grade calculation
export function calculateGrade(score) {
    if (score >= 12000)
        return 'S';
    if (score >= 11000)
        return 'A';
    if (score >= 10000)
        return 'B';
    if (score >= 9000)
        return 'C';
    if (score >= 8000)
        return 'D';
    return 'F';
}
// Card emoji mapping
export const CARD_EMOJIS = [
    '🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🎬', '🎤',
    '🎧', '🎼', '🎹', '🎺', '🎸', '🎻', '🥁', '🎷',
    '🏀', '⚽', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱',
];
export function getCardEmoji(value) {
    return CARD_EMOJIS[value % CARD_EMOJIS.length];
}
// ── Era Level Configs ─────────────────────────────────────────────────────────
export const ERA_LEVEL_CONFIGS = {
    [Difficulty.Easy]: getEraLevelRules(Difficulty.Easy),
    [Difficulty.Medium]: getEraLevelRules(Difficulty.Medium),
    [Difficulty.Hard]: getEraLevelRules(Difficulty.Hard),
    [Difficulty.Expert]: getEraLevelRules(Difficulty.Expert),
    [Difficulty.Master]: getEraLevelRules(Difficulty.Master),
};
// ── Helper functions ──────────────────────────────────────────────────────────
export function getComboMultiplier(consecutiveMatches) {
    if (consecutiveMatches >= 4)
        return 3.0;
    if (consecutiveMatches === 3)
        return 2.0;
    if (consecutiveMatches === 2)
        return 1.5;
    return 1.0;
}
export function getTimeMedal(elapsed, level) {
    return getSharedTimeMedal(elapsed, level);
}
export function getTimeBonusScore(elapsed, level) {
    return getSharedTimeBonusScore(elapsed, level);
}
export function getMovesNeededForThreeStars(optimalMoves) {
    return Math.floor((optimalMoves * 110) / 100);
}
export function getStreakMultiplier(streak) {
    if (streak.currentStreak >= 30)
        return 2.0;
    if (streak.currentStreak >= 14)
        return 1.5;
    if (streak.currentStreak >= 7)
        return 1.25;
    return 1.0;
}
export function isLevelUnlocked(era, level, levelProgress) {
    if (level <= 1)
        return true;
    return levelProgress.some((lp) => lp.era === era && lp.level === level - 1 && lp.completed);
}
export function isEraUnlocked(era, levelProgress) {
    const index = DIFFICULTY_ORDER.indexOf(era);
    if (index <= 0)
        return true;
    const previousEra = DIFFICULTY_ORDER[index - 1];
    const requiredLevel = getEraUnlockCheckpoint(era);
    return levelProgress.some((lp) => lp.era === previousEra && lp.level >= requiredLevel && lp.completed);
}
export function getMaxLevelForEra(era) {
    return getSharedMaxLevelForEra(era);
}
export function getTotalLevelCount() {
    return getSharedTotalLevelCount();
}
