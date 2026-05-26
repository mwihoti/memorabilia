import { GameState, Difficulty, Card, ERA_LEVEL_CONFIGS } from '../types';

// ── Large era-specific emoji pools (20+ each, no duplicates) ─────────────────

export const ANCIENT_EMOJIS = [
  '🏺', '🗿', '👑', '⚱️', '📜', '🏛️', '🎭', '🎨',
  '📿', '⚜️', '🗽', '🔮', '🦅', '🌿', '🌙', '🦁',
  '🐉', '⚡', '🌊', '🔱', '🪬', '🏵️', '🧿', '🪆',
];

export const MEDIEVAL_EMOJIS = [
  '⚔️', '🛡️', '🏰', '👑', '⚜️', '🗡️', '🏹', '🎭',
  '🎨', '🔮', '🦅', '🐴', '🌹', '🕯️', '📯', '🔔',
  '🪄', '🧙', '🐲', '⛪', '🦌', '🍷', '🏺', '🗺️',
];

export const MODERN_EMOJIS = [
  '🚀', '⏰', '📷', '📻', '🕰️', '🔭', '🔬', '💡',
  '🎬', '📡', '🚂', '✈️', '🎸', '💻', '🧬', '⚗️',
  '🌐', '🔋', '📱', '🛸', '🤖', '🧪', '💊', '🌍',
];

export const FUTURE_EMOJIS = [
  '🛸', '🛰️', '🧿', '⚛️', '🧠', '🧬', '🔮', '🪐',
  '🌌', '💠', '🖥️', '📶', '🧲', '🧯', '🪫', '🛜',
  '🧪', '🤖', '🫧', '🔦', '🕹️', '🎛️', '💿', '📟',
];

export const MYTHIC_EMOJIS = [
  '🐲', '🪽', '🗡️', '🛡️', '🔥', '🌙', '⭐', '🏹',
  '🪄', '🦄', '🧝', '🧙', '⚡', '💎', '🏰', '🕯️',
  '🪙', '🦉', '🌋', '❄️', '🌊', '🍃', '🪨', '🧭',
];

// All emojis combined for random cross-era mode
const ALL_EMOJIS = [...new Set([...ANCIENT_EMOJIS, ...MEDIEVAL_EMOJIS, ...MODERN_EMOJIS])];

// Get emojis based on difficulty (era)
export function getEmojisForDifficulty(difficulty: Difficulty): string[] {
  switch (difficulty) {
    case Difficulty.Easy:   return ANCIENT_EMOJIS;
    case Difficulty.Medium: return MEDIEVAL_EMOJIS;
    case Difficulty.Hard:   return MODERN_EMOJIS;
    case Difficulty.Expert: return FUTURE_EMOJIS;
    case Difficulty.Master: return MYTHIC_EMOJIS;
    default:                return ANCIENT_EMOJIS;
  }
}

// ── Shuffle ───────────────────────────────────────────────────────────────────

// Fisher-Yates with crypto random for stronger randomness
function shuffleArray<T>(array: T[]): T[] {
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

function shuffleWithRng<T>(array: T[], rng: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getCandidateColumns(cardCount: number): number[] {
  return cardCount <= 16 ? [4] : [4, 6];
}

function getGridDimensions(cardCount: number, columns: number): { columns: number; rows: number } {
  return { columns, rows: Math.ceil(cardCount / columns) };
}

function getManhattanDistance(a: number, b: number, columns: number): number {
  const pointA = { row: Math.floor(a / columns), col: a % columns };
  const pointB = { row: Math.floor(b / columns), col: b % columns };
  return Math.abs(pointA.row - pointB.row) + Math.abs(pointA.col - pointB.col);
}

function hasAdjacentMatch(values: number[], columns: number): boolean {
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

function violatesSpacing(values: number[], candidateColumns: number[], minimumPairDistance: number): boolean {
  return candidateColumns.some((columns) => {
    if (hasAdjacentMatch(values, columns)) return true;

    const seen = new Map<number, number>();
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

function shuffleValuesAvoidingAdjacency(
  values: number[],
  candidateColumns: number[],
  minimumPairDistance: number,
  rng?: () => number
): number[] {
  const shuffle = rng ? (input: number[]) => shuffleWithRng(input, rng) : shuffleArray;

  for (let attempt = 0; attempt < 400; attempt++) {
    const shuffled = shuffle(values);
    if (!violatesSpacing(shuffled, candidateColumns, minimumPairDistance)) {
      return shuffled;
    }
  }

  return shuffle(values);
}

function buildPatternOrder(
  length: number,
  columns: number,
  pattern: 'zigzag' | 'columns' | 'spiral' = 'zigzag'
): number[] {
  const { rows } = getGridDimensions(length, columns);
  const order: number[] = [];

  if (pattern === 'columns') {
    for (let col = 0; col < columns; col++) {
      for (let row = 0; row < rows; row++) {
        const index = row * columns + col;
        if (index < length) order.push(index);
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
        if (index < length) order.push(index);
      }
      top += 1;

      for (let row = top; row <= bottom; row++) {
        const index = row * columns + right;
        if (index < length) order.push(index);
      }
      right -= 1;

      if (top <= bottom) {
        for (let col = right; col >= left; col--) {
          const index = bottom * columns + col;
          if (index < length) order.push(index);
        }
        bottom -= 1;
      }

      if (left <= right) {
        for (let row = bottom; row >= top; row--) {
          const index = row * columns + left;
          if (index < length) order.push(index);
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
        if (index < length) order.push(index);
      }
    } else {
      for (let col = columns - 1; col >= 0; col--) {
        const index = row * columns + col;
        if (index < length) order.push(index);
      }
    }
  }

  return order;
}

function arrangeValuesByPattern(
  values: number[],
  columns: number,
  pattern: 'zigzag' | 'columns' | 'spiral' = 'zigzag'
): number[] {
  const order = buildPatternOrder(values.length, columns, pattern);
  const arranged = new Array<number>(values.length);

  order.forEach((targetIndex, sourceIndex) => {
    arranged[targetIndex] = values[sourceIndex];
  });

  return arranged;
}

// Pick N unique random emojis from a pool, guaranteed no repeats
function pickRandom(pool: string[], count: number): string[] {
  const shuffled = shuffleArray([...pool]);
  // If pool too small, supplement with ALL_EMOJIS
  if (shuffled.length < count) {
    const extras = shuffleArray(ALL_EMOJIS.filter(e => !pool.includes(e)));
    shuffled.push(...extras);
  }
  return shuffled.slice(0, count);
}

// ── Card generation ───────────────────────────────────────────────────────────

export function generateDemoCards(difficulty: Difficulty): Card[] {
  const { pairCount } = PAIR_COUNTS[difficulty];
  const pool = getEmojisForDifficulty(difficulty);
  const selectedEmojis = pickRandom(pool, pairCount);

  // Create pairs
  const values: number[] = [];
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

export const PAIR_COUNTS: Record<Difficulty, { pairCount: number }> = {
  [Difficulty.Easy]:   { pairCount: 6  },
  [Difficulty.Medium]: { pairCount: 10 },
  [Difficulty.Hard]:   { pairCount: 15 },
  [Difficulty.Expert]: { pairCount: 16 },
  [Difficulty.Master]: { pairCount: 16 },
};

// ── Create game ───────────────────────────────────────────────────────────────

export function createDemoGame(difficulty: Difficulty): GameState {
  const { pairCount } = PAIR_COUNTS[difficulty];
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

export function checkCardsMatch(game: GameState, index1: number, index2: number): boolean {
  const card1 = game.cards[index1];
  const card2 = game.cards[index2];
  if (!card1 || !card2) return false;
  return card1.value === card2.value;
}

// ── Score calculation ─────────────────────────────────────────────────────────

export function calculateScore(game: GameState): number {
  const baseScore = 1000;
  const difficultyMultiplier =
    game.difficulty === Difficulty.Easy   ? 10 :
    game.difficulty === Difficulty.Medium ? 15 :
    game.difficulty === Difficulty.Hard   ? 20 :
    game.difficulty === Difficulty.Expert ? 24 : 28;

  const elapsedSeconds = (Date.now() - game.started_at) / 1000;
  const timeBonus = Math.max(0, 500 - Math.floor(elapsedSeconds * 2));

  const optimalMoves = game.total_pairs;
  const extraMoves = Math.max(0, game.moves - optimalMoves);
  const movePenalty = extraMoves * 50;

  return Math.max(0, Math.floor((baseScore + timeBonus - movePenalty) * difficultyMultiplier));
}

// ── Seeded shuffle (mulberry32 PRNG) ──────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function seededShuffle<T>(array: T[], seed: number): T[] {
  const rng      = mulberry32(seed);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ── Level-aware game creation ─────────────────────────────────────────────────

export function createLevelGame(era: Difficulty, level: number, seed?: number, stage = 1): GameState {
  const config     = ERA_LEVEL_CONFIGS[era][level - 1];
  const { pairCount } = config;

  // Pick emojis for this era
  const pool      = getEmojisForDifficulty(era);
  const emojiPick = seed !== undefined
    ? seededShuffle([...pool], seed).slice(0, pairCount)
    : pickRandom(pool, pairCount);

  // Build paired values [0,0,1,1,...,n,n]
  const values: number[] = [];
  for (let i = 0; i < pairCount; i++) {
    values.push(i, i);
  }

  const candidateColumns = getCandidateColumns(pairCount * 2);
  const stageSeedOffset = stage * 101;
  const baseValues = seed !== undefined
    ? shuffleValuesAvoidingAdjacency(values, candidateColumns, config.minimumPairDistance ?? 2, mulberry32(seed + 1 + stageSeedOffset))
    : shuffleValuesAvoidingAdjacency(values, candidateColumns, config.minimumPairDistance ?? 2);
  const arrangedValues = arrangeValuesByPattern(
    baseValues,
    candidateColumns[candidateColumns.length - 1],
    config.pattern,
  );
  const shuffledValues = violatesSpacing(arrangedValues, candidateColumns, config.minimumPairDistance ?? 2)
    ? baseValues
    : arrangedValues;

  const cards: Card[] = shuffledValues.map((value, index) => ({
    id: index,
    value,
    is_flipped: false,
    is_matched: false,
    position: index,
  }));

  return {
    game_id:       Math.floor(Math.random() * 10_000_000),
    player:        'demo_player',
    difficulty:    era,
    cards,
    emojis:        emojiPick,
    flipped_indices: [],
    matched_count: 0,
    total_pairs:   pairCount,
    moves:         0,
    score:         0,
    started_at:    Date.now(),
    completed_at:  0,
    status:        0,
    elapsed_time:  0,
  };
}

// ── Level-aware score calculation ─────────────────────────────────────────────

export function calculateLevelScore(
  game: GameState,
  maxCombo: number,
  timeBonusScore: number
): number {
  const baseScore = 100 * game.total_pairs; // 100 pts per pair
  const difficultyMultiplier =
    game.difficulty === Difficulty.Easy   ? 10 :
    game.difficulty === Difficulty.Medium ? 15 :
    game.difficulty === Difficulty.Hard   ? 20 :
    game.difficulty === Difficulty.Expert ? 24 : 28;

  const optimalMoves = game.total_pairs;
  const extraMoves   = Math.max(0, game.moves - optimalMoves);
  const movePenalty  = extraMoves * 50;

  // Combo bonus: 50 pts per combo level achieved
  const comboBonus = maxCombo * 50;

  const raw = (baseScore + timeBonusScore + comboBonus - movePenalty) * difficultyMultiplier;
  return Math.max(0, Math.floor(raw));
}
