// Game Types
export interface Card {
  id: number;
  value: number;
  is_flipped: boolean;
  is_matched: boolean;
  position: number;
}

export enum GameStatus {
  Active = 0,
  Won = 1,
  Abandoned = 2,
}

export enum Difficulty {
  Easy = 1,
  Medium = 2,
  Hard = 3,
}

export interface GameState {
  game_id: number;
  player: string;
  difficulty: Difficulty;
  cards: Card[];
  emojis?: string[]; // Emojis for this game (demo mode)
  flipped_indices: number[];
  matched_count: number;
  total_pairs: number;
  moves: number;
  score: number;
  started_at: number;
  completed_at: number;
  status: GameStatus;
  elapsed_time: number;
}

// Account Types
export interface UserAccount {
  telegram_id: string;
  owner_public_key: string;
  session_public_key: string;
  account_address: string;
  created_at: number;
  last_active: number;
  nonce: number;
  total_games: number;
  is_active: boolean;
}

export interface SessionPolicy {
  account_address: string;
  allowed_contracts: string[];
  allowed_methods: string[];
  max_fee: string;
  expires_at: number;
  is_active: boolean;
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  player: string;
  telegram_id: string;
  score: number;
  difficulty: Difficulty;
  moves: number;
  time: number;
  game_id: number;
  achieved_at: number;
}

export interface PlayerStats {
  player: string;
  total_games: number;
  total_wins: number;
  best_score: number;
  best_time: number;
  total_moves: number;
  average_score: number;
  games_by_difficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
}

// Telegram Types
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  sendData: (data: string) => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{ id?: string; type?: string; text?: string }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

// UI Types
export interface GameConfig {
  difficulty: Difficulty;
  cardCount: number;
  pairCount: number;
  optimalMoves: number;
}

export const GAME_CONFIGS: Record<Difficulty, GameConfig> = {
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
};

// Star rating calculation
export function calculateStars(moves: number, optimalMoves: number): number {
  const moveRatio = (moves * 100) / optimalMoves;
  
  if (moveRatio <= 110) return 3;
  if (moveRatio <= 150) return 2;
  return 1;
}

// Grade calculation
export function calculateGrade(score: number): string {
  if (score >= 12000) return 'S';
  if (score >= 11000) return 'A';
  if (score >= 10000) return 'B';
  if (score >= 9000) return 'C';
  if (score >= 8000) return 'D';
  return 'F';
}

// Card emoji mapping
export const CARD_EMOJIS = [
  '🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🎬', '🎤',
  '🎧', '🎼', '🎹', '🎺', '🎸', '🎻', '🥁', '🎷',
  '🏀', '⚽', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱',
];

export function getCardEmoji(value: number): string {
  return CARD_EMOJIS[value % CARD_EMOJIS.length];
}

// ── Level System ───────────────────────────────────────────────────────────────

export interface EraLevel {
  era: Difficulty;
  level: number; // 1-5
  cardCount: number;
  pairCount: number;
  optimalMoves: number;
  previewDuration: number; // ms: level 1=3000, 2=2500, 3=2000, 4=1500, 5=0
  timeLimitGold: number;   // seconds
  timeLimitSilver: number;
  timeLimitBronze: number;
  label: string;
}

export type TimeMedal = 'gold' | 'silver' | 'bronze' | 'none';

export interface LevelProgress {
  era: Difficulty;
  level: number;
  completed: boolean;
  bestScore: number;
  bestTime: number;     // seconds
  bestMedal: TimeMedal;
  stars: number;
  completedAt?: number;
}

// Combo multiplier
export interface ComboState {
  count: number;        // consecutive matches
  multiplier: number;   // 1 | 1.5 | 2 | 3
}

// Daily streak
export interface DailyStreak {
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string; // 'YYYY-MM-DD'
  shieldsAvailable: number; // max 2, earned at streak 3 and 7
  multiplierBonus: number; // 0 at <7 days, 0.25 at 7+, 0.5 at 14+, 1.0 at 30+
}

// Achievements
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number; // timestamp, undefined = locked
  reward?: string;     // e.g. 'theme_golden'
}

// Daily challenge
export interface DailyChallenge {
  date: string;       // 'YYYY-MM-DD'
  seed: number;       // derived from date
  difficulty: Difficulty;
  level: number;
  completed: boolean;
  score?: number;
  medal?: TimeMedal;
}

// Ghost replay
export interface ReplayMove {
  cardIndex: number;
  timestamp: number; // ms from game start
}

export interface GhostReplay {
  gameId: number;
  era: Difficulty;
  level: number;
  moves: ReplayMove[];
  totalTime: number; // ms
  score: number;
}

// ── Era Level Configs ─────────────────────────────────────────────────────────

const ERA_LEVEL_LABELS: Record<Difficulty, string[]> = {
  [Difficulty.Easy]:   ['Apprentice', 'Scholar', 'Sage', 'Elder', 'Oracle'],
  [Difficulty.Medium]: ['Squire', 'Knight', 'Baron', 'Count', 'Lord'],
  [Difficulty.Hard]:   ['Intern', 'Engineer', 'Senior', 'Principal', 'Legend'],
};

function buildEraLevels(era: Difficulty): EraLevel[] {
  const labels = ERA_LEVEL_LABELS[era];
  return [
    { era, level: 1, cardCount: 8,  pairCount: 4,  optimalMoves: 8,  previewDuration: 3000, timeLimitGold: 60,  timeLimitSilver: 90,  timeLimitBronze: 120, label: labels[0] },
    { era, level: 2, cardCount: 12, pairCount: 6,  optimalMoves: 12, previewDuration: 2500, timeLimitGold: 80,  timeLimitSilver: 120, timeLimitBronze: 160, label: labels[1] },
    { era, level: 3, cardCount: 16, pairCount: 8,  optimalMoves: 16, previewDuration: 2000, timeLimitGold: 100, timeLimitSilver: 150, timeLimitBronze: 200, label: labels[2] },
    { era, level: 4, cardCount: 20, pairCount: 10, optimalMoves: 20, previewDuration: 1500, timeLimitGold: 120, timeLimitSilver: 180, timeLimitBronze: 240, label: labels[3] },
    { era, level: 5, cardCount: 24, pairCount: 12, optimalMoves: 24, previewDuration: 0,    timeLimitGold: 150, timeLimitSilver: 225, timeLimitBronze: 300, label: labels[4] },
  ];
}

export const ERA_LEVEL_CONFIGS: Record<Difficulty, EraLevel[]> = {
  [Difficulty.Easy]:   buildEraLevels(Difficulty.Easy),
  [Difficulty.Medium]: buildEraLevels(Difficulty.Medium),
  [Difficulty.Hard]:   buildEraLevels(Difficulty.Hard),
};

// ── Helper functions ──────────────────────────────────────────────────────────

export function getComboMultiplier(consecutiveMatches: number): number {
  if (consecutiveMatches >= 4) return 3.0;
  if (consecutiveMatches === 3) return 2.0;
  if (consecutiveMatches === 2) return 1.5;
  return 1.0;
}

export function getTimeMedal(elapsed: number, level: EraLevel): TimeMedal {
  if (elapsed <= level.timeLimitGold)   return 'gold';
  if (elapsed <= level.timeLimitSilver) return 'silver';
  if (elapsed <= level.timeLimitBronze) return 'bronze';
  return 'none';
}

export function getTimeBonusScore(elapsed: number, level: EraLevel): number {
  const medal = getTimeMedal(elapsed, level);
  if (medal === 'none') return 0;

  let base: number;
  if (medal === 'gold') {
    base = 500;
    // Last 10 seconds of gold window: 2x multiplier
    const remainingGoldTime = level.timeLimitGold - elapsed;
    if (remainingGoldTime <= 10) {
      base *= 2;
    }
  } else if (medal === 'silver') {
    base = 250;
  } else {
    base = 100;
  }

  return base;
}

export function getStreakMultiplier(streak: DailyStreak): number {
  if (streak.currentStreak >= 30) return 2.0;
  if (streak.currentStreak >= 14) return 1.5;
  if (streak.currentStreak >= 7)  return 1.25;
  return 1.0;
}

export function isEraUnlocked(era: Difficulty, levelProgress: LevelProgress[]): boolean {
  if (era === Difficulty.Easy) return true;

  if (era === Difficulty.Medium) {
    return levelProgress.some(
      (lp) => lp.era === Difficulty.Easy && lp.level >= 3 && lp.completed
    );
  }

  if (era === Difficulty.Hard) {
    return levelProgress.some(
      (lp) => lp.era === Difficulty.Medium && lp.level >= 3 && lp.completed
    );
  }

  return false;
}

