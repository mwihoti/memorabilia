export const DIFFICULTY_ORDER = [1, 2, 3, 4, 5];
export const DIFFICULTY_META = {
    1: { id: 1, label: 'Ancient Era', shortLabel: 'Ancient', icon: '🏺' },
    2: { id: 2, label: 'Medieval Times', shortLabel: 'Medieval', icon: '⚔️' },
    3: { id: 3, label: 'Modern Era', shortLabel: 'Modern', icon: '🚀' },
    4: { id: 4, label: 'Future Nexus', shortLabel: 'Future', icon: '🛸' },
    5: { id: 5, label: 'Mythic Vault', shortLabel: 'Mythic', icon: '🐲' },
};
const ERA_LEVEL_TITLES = {
    1: ['Apprentice', 'Scholar', 'Sage', 'Elder', 'Oracle'],
    2: ['Squire', 'Knight', 'Baron', 'Count', 'Lord'],
    3: ['Intern', 'Engineer', 'Senior', 'Principal', 'Legend'],
    4: ['Scout', 'Navigator', 'Cipher', 'Operator', 'Admiral'],
    5: ['Seeker', 'Warden', 'Invoker', 'Titan', 'Dragonheart'],
};
const LEVEL_COUNT_BY_ERA = {
    1: 50,
    2: 50,
    3: 100,
    4: 100,
    5: 100,
};
export function getDifficultyMeta(difficulty) {
    return DIFFICULTY_META[difficulty];
}
export function getMaxLevelForEra(era) {
    return LEVEL_COUNT_BY_ERA[era];
}
export function getTotalLevelCount() {
    return DIFFICULTY_ORDER.reduce((sum, era) => sum + LEVEL_COUNT_BY_ERA[era], 0);
}
export function getNextLevelTarget(era, level) {
    const max = LEVEL_COUNT_BY_ERA[era];
    if (level < max)
        return { era, level: level + 1 };
    const index = DIFFICULTY_ORDER.indexOf(era);
    const nextEra = DIFFICULTY_ORDER[index + 1];
    return nextEra ? { era: nextEra, level: 1 } : null;
}
export function getEraUnlockCheckpoint(era) {
    const index = DIFFICULTY_ORDER.indexOf(era);
    if (index <= 0)
        return 0;
    return LEVEL_COUNT_BY_ERA[DIFFICULTY_ORDER[index - 1]];
}
export function getLevelLabel(era, level) {
    const tier = Math.ceil(level / 10);
    const titles = ERA_LEVEL_TITLES[era];
    return `${titles[Math.min(tier - 1, titles.length - 1)]} ${level}`;
}
export function getLevelMechanics(era, level) {
    const progressBand = Math.ceil(level / 10);
    const common = [
        'Pattern-based board',
        progressBand >= 2 ? 'Hint charge unlocked' : 'Memory warmup',
        progressBand >= 3 ? 'Freeze burst unlocked' : 'Clean reveal pacing',
    ];
    if (era === 1)
        return progressBand >= 4 ? ['Sandstorm veils', ...common] : common;
    if (era === 2)
        return progressBand >= 4 ? ['Shielded mismatch buffer', ...common] : common;
    if (era === 3)
        return progressBand >= 4 ? ['Pulse scan preview', ...common] : common;
    if (era === 4)
        return progressBand >= 4 ? ['Decoy pressure rises', ...common] : common;
    return progressBand >= 4 ? ['Mythic pressure spikes', ...common] : common;
}
export function getLevelRule(era, level) {
    const totalLevels = LEVEL_COUNT_BY_ERA[era];
    const index = Math.max(0, Math.min(level - 1, totalLevels - 1));
    const progress = index / Math.max(totalLevels - 1, 1);
    const difficultyBias = era - 1;
    const pairCount = Math.min(16, 4 + Math.floor(index / 8) + difficultyBias);
    const cardCount = pairCount * 2;
    const previewDuration = Math.max(1000, Math.round(5000 - progress * 3800 - difficultyBias * 250));
    const goldBase = 55 + pairCount * 7 + difficultyBias * 8;
    const boss = level % 10 === 0;
    const minimumPairDistance = Math.min(5, 2 + Math.floor(index / 20) + Math.floor(difficultyBias / 2));
    const pattern = boss ? 'spiral' : level % 3 === 0 ? 'columns' : 'zigzag';
    return {
        era,
        level,
        cardCount,
        pairCount,
        optimalMoves: cardCount,
        previewDuration,
        timeLimitGold: goldBase,
        timeLimitSilver: Math.round(goldBase * 1.5),
        timeLimitBronze: Math.round(goldBase * 2),
        label: getLevelLabel(era, level),
        mechanics: getLevelMechanics(era, level),
        boss,
        relic: boss ? `${getDifficultyMeta(era).shortLabel} Relic ${level / 10}` : undefined,
        minimumPairDistance,
        pattern,
    };
}
export function getEraLevelRules(era) {
    return Array.from({ length: LEVEL_COUNT_BY_ERA[era] }, (_, index) => getLevelRule(era, index + 1));
}
export function calculateStars(moves, optimalMoves) {
    const moveRatio = (moves * 100) / optimalMoves;
    if (moveRatio <= 110)
        return 3;
    if (moveRatio <= 150)
        return 2;
    return 1;
}
export function getTimeMedal(elapsedSeconds, level) {
    if (elapsedSeconds <= level.timeLimitGold)
        return 'gold';
    if (elapsedSeconds <= level.timeLimitSilver)
        return 'silver';
    if (elapsedSeconds <= level.timeLimitBronze)
        return 'bronze';
    return 'none';
}
export function getTimeBonusScore(elapsedSeconds, level) {
    const medal = getTimeMedal(elapsedSeconds, level);
    if (medal === 'none')
        return 0;
    if (medal === 'gold') {
        const remainingGold = level.timeLimitGold - elapsedSeconds;
        return remainingGold <= 10 ? 1000 : 500;
    }
    return medal === 'silver' ? 250 : 100;
}
export function getDifficultyMultiplier(difficulty) {
    return difficulty === 1 ? 10 : difficulty === 2 ? 15 : difficulty === 3 ? 20 : difficulty === 4 ? 24 : 28;
}
export function calculateVerifiedScore(difficulty, pairCount, moves, elapsedSeconds, maxCombo, timeBonusScore) {
    const baseScore = 100 * pairCount;
    const movePenalty = Math.max(0, moves - pairCount) * 50;
    const comboBonus = maxCombo * 50;
    const raw = (baseScore + timeBonusScore + comboBonus - movePenalty) * getDifficultyMultiplier(difficulty);
    return Math.max(0, Math.floor(raw));
}
export function getDailyChallengeConfigFromDate(dateKey) {
    const date = new Date(dateKey);
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    const difficulty = DIFFICULTY_ORDER[dayOfWeek % DIFFICULTY_ORDER.length];
    const level = (dayOfMonth % LEVEL_COUNT_BY_ERA[difficulty]) + 1;
    const seed = parseInt(dateKey.replace(/-/g, ''), 10);
    return { difficulty, level, seed };
}
function getWeekStart(date) {
    const copy = new Date(date);
    const day = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - day);
    copy.setHours(0, 0, 0, 0);
    return copy;
}
function getWeekKey(date) {
    const start = getWeekStart(date);
    const year = start.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const diffDays = Math.floor((start.getTime() - startOfYear.getTime()) / 86_400_000);
    const week = Math.floor(diffDays / 7) + 1;
    return `${year}-W${String(week).padStart(2, '0')}`;
}
export function getWeeklyChallengeConfigFromDate(dateKey) {
    const today = new Date(dateKey);
    const weekStart = getWeekStart(today);
    const weekKey = getWeekKey(today);
    const seed = parseInt(`${weekStart.getFullYear()}${String(weekStart.getMonth() + 1).padStart(2, '0')}${String(weekStart.getDate()).padStart(2, '0')}`, 10);
    const difficulty = DIFFICULTY_ORDER[seed % DIFFICULTY_ORDER.length];
    const level = (seed % LEVEL_COUNT_BY_ERA[difficulty]) + 1;
    return { difficulty, level, seed, weekKey };
}
function shuffleWithRng(array, rng) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
function getCandidateColumns(cardCount) {
    return cardCount <= 16 ? [4] : [4, 6];
}
function getManhattanDistance(a, b, columns) {
    const pointA = { row: Math.floor(a / columns), col: a % columns };
    const pointB = { row: Math.floor(b / columns), col: b % columns };
    return Math.abs(pointA.row - pointB.row) + Math.abs(pointA.col - pointB.col);
}
function hasAdjacentMatch(values, columns) {
    for (let i = 0; i < values.length; i++) {
        const row = Math.floor(i / columns);
        const right = i + 1;
        const down = i + columns;
        if (right < values.length && Math.floor(right / columns) === row && values[i] === values[right])
            return true;
        if (down < values.length && values[i] === values[down])
            return true;
    }
    return false;
}
function violatesSpacing(values, candidateColumns, minimumPairDistance) {
    return candidateColumns.some((columns) => {
        if (hasAdjacentMatch(values, columns))
            return true;
        const seen = new Map();
        for (let i = 0; i < values.length; i++) {
            const first = seen.get(values[i]);
            if (first === undefined) {
                seen.set(values[i], i);
                continue;
            }
            if (getManhattanDistance(first, i, columns) < minimumPairDistance)
                return true;
        }
        return false;
    });
}
function mulberry32(seed) {
    let s = seed >>> 0;
    return function () {
        s += 0x6d2b79f5;
        let z = s;
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0) / 4_294_967_296;
    };
}
function shuffleValuesAvoidingAdjacency(values, candidateColumns, minimumPairDistance, rng) {
    for (let attempt = 0; attempt < 400; attempt++) {
        const shuffled = shuffleWithRng(values, rng);
        if (!violatesSpacing(shuffled, candidateColumns, minimumPairDistance))
            return shuffled;
    }
    return shuffleWithRng(values, rng);
}
function buildPatternOrder(length, columns, pattern) {
    const rows = Math.ceil(length / columns);
    const order = [];
    if (pattern === 'columns') {
        for (let col = 0; col < columns; col++) {
            for (let row = 0; row < rows; row++) {
                const index = row * columns + col;
                if (index < length)
                    order.push(index);
            }
        }
        return order;
    }
    if (pattern === 'spiral') {
        let top = 0;
        let bottom = rows - 1;
        let left = 0;
        let right = columns - 1;
        while (left <= right && top <= bottom) {
            for (let col = left; col <= right; col++) {
                const index = top * columns + col;
                if (index < length)
                    order.push(index);
            }
            top += 1;
            for (let row = top; row <= bottom; row++) {
                const index = row * columns + right;
                if (index < length)
                    order.push(index);
            }
            right -= 1;
            if (top <= bottom) {
                for (let col = right; col >= left; col--) {
                    const index = bottom * columns + col;
                    if (index < length)
                        order.push(index);
                }
                bottom -= 1;
            }
            if (left <= right) {
                for (let row = bottom; row >= top; row--) {
                    const index = row * columns + left;
                    if (index < length)
                        order.push(index);
                }
                left += 1;
            }
        }
        return order;
    }
    for (let row = 0; row < rows; row++) {
        if (row % 2 === 0) {
            for (let col = 0; col < columns; col++) {
                const index = row * columns + col;
                if (index < length)
                    order.push(index);
            }
        }
        else {
            for (let col = columns - 1; col >= 0; col--) {
                const index = row * columns + col;
                if (index < length)
                    order.push(index);
            }
        }
    }
    return order;
}
function arrangeValuesByPattern(values, columns, pattern) {
    const order = buildPatternOrder(values.length, columns, pattern);
    const arranged = new Array(values.length);
    order.forEach((targetIndex, sourceIndex) => {
        arranged[targetIndex] = values[sourceIndex];
    });
    return arranged;
}
export function buildLevelCardValues(era, level, seed) {
    const config = getLevelRule(era, level);
    const values = [];
    for (let i = 0; i < config.pairCount; i++)
        values.push(i, i);
    const candidateColumns = getCandidateColumns(config.cardCount);
    const rng = mulberry32(seed + 1);
    const baseValues = shuffleValuesAvoidingAdjacency(values, candidateColumns, config.minimumPairDistance, rng);
    const arrangedValues = arrangeValuesByPattern(baseValues, candidateColumns[candidateColumns.length - 1], config.pattern);
    return violatesSpacing(arrangedValues, candidateColumns, config.minimumPairDistance) ? baseValues : arrangedValues;
}
export function verifyReplaySubmission(params) {
    const { difficulty, level, seed, replayMoves } = params;
    const levelRule = getLevelRule(difficulty, level);
    const values = buildLevelCardValues(difficulty, level, seed);
    if (!replayMoves.length || replayMoves.length % 2 !== 0) {
        return { verified: false, reason: 'Replay must contain complete flip pairs', score: 0, stars: 0, timeSeconds: 0, moves: 0, maxCombo: 0, mismatches: 0 };
    }
    const matched = new Set();
    let combo = 0;
    let maxCombo = 0;
    let mismatches = 0;
    for (let i = 0; i < replayMoves.length; i += 2) {
        const first = replayMoves[i];
        const second = replayMoves[i + 1];
        if (first.cardIndex === second.cardIndex) {
            return { verified: false, reason: 'A turn cannot use the same card twice', score: 0, stars: 0, timeSeconds: 0, moves: 0, maxCombo: 0, mismatches: 0 };
        }
        if (first.cardIndex < 0 || second.cardIndex < 0 || first.cardIndex >= values.length || second.cardIndex >= values.length) {
            return { verified: false, reason: 'Replay referenced an invalid card index', score: 0, stars: 0, timeSeconds: 0, moves: 0, maxCombo: 0, mismatches: 0 };
        }
        if (matched.has(first.cardIndex) || matched.has(second.cardIndex)) {
            return { verified: false, reason: 'Replay reused an already matched card', score: 0, stars: 0, timeSeconds: 0, moves: 0, maxCombo: 0, mismatches: 0 };
        }
        if (i > 0 && first.timestamp < replayMoves[i - 1].timestamp) {
            return { verified: false, reason: 'Replay timestamps must be increasing', score: 0, stars: 0, timeSeconds: 0, moves: 0, maxCombo: 0, mismatches: 0 };
        }
        if (values[first.cardIndex] === values[second.cardIndex]) {
            matched.add(first.cardIndex);
            matched.add(second.cardIndex);
            combo += 1;
            maxCombo = Math.max(maxCombo, combo);
        }
        else {
            mismatches += 1;
            combo = 0;
        }
    }
    if (matched.size !== values.length) {
        return { verified: false, reason: 'Replay did not complete the full board', score: 0, stars: 0, timeSeconds: 0, moves: 0, maxCombo: 0, mismatches: mismatches };
    }
    const timeSeconds = Math.max(1, Math.floor(replayMoves[replayMoves.length - 1].timestamp / 1000));
    const moves = replayMoves.length / 2;
    const stars = calculateStars(moves, levelRule.optimalMoves);
    const timeBonus = getTimeBonusScore(timeSeconds, levelRule);
    const score = calculateVerifiedScore(difficulty, levelRule.pairCount, moves, timeSeconds, maxCombo, timeBonus);
    return {
        verified: true,
        score,
        stars,
        timeSeconds,
        moves,
        maxCombo,
        mismatches,
    };
}
