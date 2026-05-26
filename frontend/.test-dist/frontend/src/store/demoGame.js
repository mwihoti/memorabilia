"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAIR_COUNTS = exports.MYTHIC_EMOJIS = exports.FUTURE_EMOJIS = exports.MODERN_EMOJIS = exports.MEDIEVAL_EMOJIS = exports.ANCIENT_EMOJIS = void 0;
exports.getEmojisForDifficulty = getEmojisForDifficulty;
exports.generateDemoCards = generateDemoCards;
exports.createDemoGame = createDemoGame;
exports.checkCardsMatch = checkCardsMatch;
exports.calculateScore = calculateScore;
exports.seededShuffle = seededShuffle;
exports.createLevelGame = createLevelGame;
exports.calculateLevelScore = calculateLevelScore;
const types_1 = require("../types");
const gameRules_1 = require("../../../shared/gameRules");
// ── Large era-specific emoji pools (20+ each, no duplicates) ─────────────────
exports.ANCIENT_EMOJIS = [
    '🏺', '🗿', '👑', '⚱️', '📜', '🏛️', '🎭', '🎨',
    '📿', '⚜️', '🗽', '🔮', '🦅', '🌿', '🌙', '🦁',
    '🐉', '⚡', '🌊', '🔱', '🪬', '🏵️', '🧿', '🪆',
];
exports.MEDIEVAL_EMOJIS = [
    '⚔️', '🛡️', '🏰', '👑', '⚜️', '🗡️', '🏹', '🎭',
    '🎨', '🔮', '🦅', '🐴', '🌹', '🕯️', '📯', '🔔',
    '🪄', '🧙', '🐲', '⛪', '🦌', '🍷', '🏺', '🗺️',
];
exports.MODERN_EMOJIS = [
    '🚀', '⏰', '📷', '📻', '🕰️', '🔭', '🔬', '💡',
    '🎬', '📡', '🚂', '✈️', '🎸', '💻', '🧬', '⚗️',
    '🌐', '🔋', '📱', '🛸', '🤖', '🧪', '💊', '🌍',
];
exports.FUTURE_EMOJIS = [
    '🛸', '🛰️', '🧿', '⚛️', '🧠', '🧬', '🔮', '🪐',
    '🌌', '💠', '🖥️', '📶', '🧲', '🧯', '🪫', '🛜',
    '🧪', '🤖', '🫧', '🔦', '🕹️', '🎛️', '💿', '📟',
];
exports.MYTHIC_EMOJIS = [
    '🐲', '🪽', '🗡️', '🛡️', '🔥', '🌙', '⭐', '🏹',
    '🪄', '🦄', '🧝', '🧙', '⚡', '💎', '🏰', '🕯️',
    '🪙', '🦉', '🌋', '❄️', '🌊', '🍃', '🪨', '🧭',
];
// All emojis combined for random cross-era mode
const ALL_EMOJIS = [...new Set([...exports.ANCIENT_EMOJIS, ...exports.MEDIEVAL_EMOJIS, ...exports.MODERN_EMOJIS])];
// Get emojis based on difficulty (era)
function getEmojisForDifficulty(difficulty) {
    switch (difficulty) {
        case types_1.Difficulty.Easy: return exports.ANCIENT_EMOJIS;
        case types_1.Difficulty.Medium: return exports.MEDIEVAL_EMOJIS;
        case types_1.Difficulty.Hard: return exports.MODERN_EMOJIS;
        case types_1.Difficulty.Expert: return exports.FUTURE_EMOJIS;
        case types_1.Difficulty.Master: return exports.MYTHIC_EMOJIS;
        default: return exports.ANCIENT_EMOJIS;
    }
}
// ── Shuffle ───────────────────────────────────────────────────────────────────
// Fisher-Yates with crypto random for stronger randomness
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        // Mix Math.random with a time-seeded offset for extra variance
        const j = Math.floor((Math.random() + Math.random()) / 2 * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Second pass — double-shuffle to ensure distribution
    for (let i = 0; i < shuffled.length; i++) {
        const j = Math.floor(Math.random() * shuffled.length);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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
function getGridDimensions(cardCount, columns) {
    return { columns, rows: Math.ceil(cardCount / columns) };
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
        if (right < values.length && Math.floor(right / columns) === row && values[i] === values[right]) {
            return true;
        }
        if (down < values.length && values[i] === values[down]) {
            return true;
        }
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
            if (getManhattanDistance(first, i, columns) < minimumPairDistance) {
                return true;
            }
        }
        return false;
    });
}
function shuffleValuesAvoidingAdjacency(values, candidateColumns, minimumPairDistance, rng) {
    const shuffle = rng ? (input) => shuffleWithRng(input, rng) : shuffleArray;
    for (let attempt = 0; attempt < 400; attempt++) {
        const shuffled = shuffle(values);
        if (!violatesSpacing(shuffled, candidateColumns, minimumPairDistance)) {
            return shuffled;
        }
    }
    return shuffle(values);
}
function buildPatternOrder(length, columns, pattern = 'zigzag') {
    const { rows } = getGridDimensions(length, columns);
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
function arrangeValuesByPattern(values, columns, pattern = 'zigzag') {
    const order = buildPatternOrder(values.length, columns, pattern);
    const arranged = new Array(values.length);
    order.forEach((targetIndex, sourceIndex) => {
        arranged[targetIndex] = values[sourceIndex];
    });
    return arranged;
}
// Pick N unique random emojis from a pool, guaranteed no repeats
function pickRandom(pool, count) {
    const shuffled = shuffleArray([...pool]);
    // If pool too small, supplement with ALL_EMOJIS
    if (shuffled.length < count) {
        const extras = shuffleArray(ALL_EMOJIS.filter(e => !pool.includes(e)));
        shuffled.push(...extras);
    }
    return shuffled.slice(0, count);
}
// ── Card generation ───────────────────────────────────────────────────────────
function generateDemoCards(difficulty) {
    const { pairCount } = exports.PAIR_COUNTS[difficulty];
    const pool = getEmojisForDifficulty(difficulty);
    const selectedEmojis = pickRandom(pool, pairCount);
    // Create pairs
    const values = [];
    for (let i = 0; i < pairCount; i++) {
        values.push(i, i);
    }
    const shuffledValues = shuffleValuesAvoidingAdjacency(values, getCandidateColumns(pairCount * 2), 2);
    return shuffledValues.map((value, index) => ({
        id: index,
        value,
        is_flipped: false,
        is_matched: false,
        position: index,
    }));
}
exports.PAIR_COUNTS = {
    [types_1.Difficulty.Easy]: { pairCount: 6 },
    [types_1.Difficulty.Medium]: { pairCount: 10 },
    [types_1.Difficulty.Hard]: { pairCount: 15 },
    [types_1.Difficulty.Expert]: { pairCount: 16 },
    [types_1.Difficulty.Master]: { pairCount: 16 },
};
// ── Create game ───────────────────────────────────────────────────────────────
function createDemoGame(difficulty) {
    const { pairCount } = exports.PAIR_COUNTS[difficulty];
    const cards = generateDemoCards(difficulty);
    const pool = getEmojisForDifficulty(difficulty);
    const selectedEmojis = pickRandom(pool, pairCount);
    return {
        game_id: Math.floor(Math.random() * 10_000_000),
        player: 'demo_player',
        difficulty,
        cards,
        emojis: selectedEmojis,
        flipped_indices: [],
        matched_count: 0,
        total_pairs: pairCount,
        moves: 0,
        score: 0,
        started_at: Date.now(),
        completed_at: 0,
        status: 0,
        elapsed_time: 0,
    };
}
// ── Match check ───────────────────────────────────────────────────────────────
function checkCardsMatch(game, index1, index2) {
    const card1 = game.cards[index1];
    const card2 = game.cards[index2];
    if (!card1 || !card2)
        return false;
    return card1.value === card2.value;
}
// ── Score calculation ─────────────────────────────────────────────────────────
function calculateScore(game) {
    const baseScore = 1000;
    const difficultyMultiplier = game.difficulty === types_1.Difficulty.Easy ? 10 :
        game.difficulty === types_1.Difficulty.Medium ? 15 :
            game.difficulty === types_1.Difficulty.Hard ? 20 :
                game.difficulty === types_1.Difficulty.Expert ? 24 : 28;
    const elapsedSeconds = (Date.now() - game.started_at) / 1000;
    const timeBonus = Math.max(0, 500 - Math.floor(elapsedSeconds * 2));
    const optimalMoves = game.total_pairs;
    const extraMoves = Math.max(0, game.moves - optimalMoves);
    const movePenalty = extraMoves * 50;
    return Math.max(0, Math.floor((baseScore + timeBonus - movePenalty) * difficultyMultiplier));
}
// ── Seeded shuffle (mulberry32 PRNG) ──────────────────────────────────────────
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
function seededShuffle(array, seed) {
    const rng = mulberry32(seed);
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
// ── Level-aware game creation ─────────────────────────────────────────────────
function createLevelGame(era, level, seed) {
    const config = types_1.ERA_LEVEL_CONFIGS[era][level - 1];
    const { pairCount } = config;
    // Pick emojis for this era
    const pool = getEmojisForDifficulty(era);
    const emojiPick = seed !== undefined
        ? seededShuffle([...pool], seed).slice(0, pairCount)
        : pickRandom(pool, pairCount);
    const shuffledValues = seed !== undefined
        ? (0, gameRules_1.buildLevelCardValues)(era, level, seed)
        : (() => {
            const values = [];
            for (let i = 0; i < pairCount; i++)
                values.push(i, i);
            const candidateColumns = getCandidateColumns(pairCount * 2);
            const baseValues = shuffleValuesAvoidingAdjacency(values, candidateColumns, config.minimumPairDistance ?? 2);
            const arrangedValues = arrangeValuesByPattern(baseValues, candidateColumns[candidateColumns.length - 1], config.pattern);
            return violatesSpacing(arrangedValues, candidateColumns, config.minimumPairDistance ?? 2)
                ? baseValues
                : arrangedValues;
        })();
    const cards = shuffledValues.map((value, index) => ({
        id: index,
        value,
        is_flipped: false,
        is_matched: false,
        position: index,
    }));
    return {
        game_id: Math.floor(Math.random() * 10_000_000),
        player: 'demo_player',
        difficulty: era,
        cards,
        emojis: emojiPick,
        flipped_indices: [],
        matched_count: 0,
        total_pairs: pairCount,
        moves: 0,
        score: 0,
        started_at: Date.now(),
        completed_at: 0,
        status: 0,
        elapsed_time: 0,
    };
}
// ── Level-aware score calculation ─────────────────────────────────────────────
function calculateLevelScore(game, maxCombo, timeBonusScore) {
    const baseScore = 100 * game.total_pairs; // 100 pts per pair
    const difficultyMultiplier = game.difficulty === types_1.Difficulty.Easy ? 10 :
        game.difficulty === types_1.Difficulty.Medium ? 15 :
            game.difficulty === types_1.Difficulty.Hard ? 20 :
                game.difficulty === types_1.Difficulty.Expert ? 24 : 28;
    const optimalMoves = game.total_pairs;
    const extraMoves = Math.max(0, game.moves - optimalMoves);
    const movePenalty = extraMoves * 50;
    // Combo bonus: 50 pts per combo level achieved
    const comboBonus = maxCombo * 50;
    const raw = (baseScore + timeBonusScore + comboBonus - movePenalty) * difficultyMultiplier;
    return Math.max(0, Math.floor(raw));
}
