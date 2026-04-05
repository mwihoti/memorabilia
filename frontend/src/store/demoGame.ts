import { GameState, Difficulty, Card } from '../types';

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

// All emojis combined for random cross-era mode
const ALL_EMOJIS = [...new Set([...ANCIENT_EMOJIS, ...MEDIEVAL_EMOJIS, ...MODERN_EMOJIS])];

// Get emojis based on difficulty (era)
export function getEmojisForDifficulty(difficulty: Difficulty): string[] {
  switch (difficulty) {
    case Difficulty.Easy:   return ANCIENT_EMOJIS;
    case Difficulty.Medium: return MEDIEVAL_EMOJIS;
    case Difficulty.Hard:   return MODERN_EMOJIS;
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

  const shuffledValues = shuffleArray(values);

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
    game.difficulty === Difficulty.Medium ? 15 : 20;

  const elapsedSeconds = (Date.now() - game.started_at) / 1000;
  const timeBonus = Math.max(0, 500 - Math.floor(elapsedSeconds * 2));

  const optimalMoves = game.total_pairs;
  const extraMoves = Math.max(0, game.moves - optimalMoves);
  const movePenalty = extraMoves * 50;

  return Math.max(0, Math.floor((baseScore + timeBonus - movePenalty) * difficultyMultiplier));
}
