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
  Expert = 4,
  Master = 5,
}

export interface DifficultyMeta {
  id: Difficulty;
  label: string;
  shortLabel: string;
  icon: string;
  legacyDescription: string;
}

export const DIFFICULTY_ORDER: Difficulty[] = [
  Difficulty.Easy,
  Difficulty.Medium,
  Difficulty.Hard,
  Difficulty.Expert,
  Difficulty.Master,
];

export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  [Difficulty.Easy]: {
    id: Difficulty.Easy,
    label: 'Ancient Era',
    shortLabel: 'Ancient',
    icon: '🏺',
    legacyDescription: '6 artifacts · 12 cards',
  },
  [Difficulty.Medium]: {
    id: Difficulty.Medium,
    label: 'Medieval Times',
    shortLabel: 'Medieval',
    icon: '⚔️',
    legacyDescription: '10 artifacts · 20 cards',
  },
  [Difficulty.Hard]: {
    id: Difficulty.Hard,
    label: 'Modern Era',
    shortLabel: 'Modern',
    icon: '🚀',
    legacyDescription: '15 artifacts · 30 cards',
  },
  [Difficulty.Expert]: {
    id: Difficulty.Expert,
    label: 'Future Nexus',
    shortLabel: 'Future',
    icon: '🛸',
    legacyDescription: '16 artifacts · 32 cards',
  },
  [Difficulty.Master]: {
    id: Difficulty.Master,
    label: 'Mythic Vault',
    shortLabel: 'Mythic',
    icon: '🐲',
    legacyDescription: '16 artifacts · 32 cards',
  },
};

export function getDifficultyMeta(difficulty: Difficulty): DifficultyMeta {
  return DIFFICULTY_META[difficulty];
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
  stageCount: number;
  cardCount: number;
  pairCount: number;
  optimalMoves: number;
  previewDuration: number; // ms: level 1=3000, 2=2500, 3=2000, 4=1500, 5=0
  timeLimitGold: number;   // seconds
  timeLimitSilver: number;
  timeLimitBronze: number;
  label: string;
  mechanics?: string[];
  boss?: boolean;
  relic?: string;
  minimumPairDistance?: number;
  pattern?: 'zigzag' | 'columns' | 'spiral';
}

export type TimeMedal = 'gold' | 'silver' | 'bronze' | 'none';

export interface LevelProgress {
  era: Difficulty;
  level: number;
  completed: boolean;
  highestStageCompleted: number;
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
  stage: number;
  moves: ReplayMove[];
  totalTime: number; // ms
  score: number;
  emojis?: string[]; // actual emoji arrangement from the best run
}

export interface WeeklyChallenge {
  weekKey: string; // YYYY-Www
  seed: number;
  difficulty: Difficulty;
  level: number;
  completed: boolean;
  score?: number;
  medal?: TimeMedal;
}

export interface RelicReward {
  id: string;
  era: Difficulty;
  name: string;
  icon: string;
  unlockedAt: number;
  condition: string;
}

export interface RunAnalytics {
  longestCombo: number;
  mistakes: number;
  starGap: number;
  goldTimeDelta: number;
  silverTimeDelta: number;
  bronzeTimeDelta: number;
  moveGapToThreeStars: number;
  freezeBurstsUsed: number;
  shieldBlocksUsed: number;
  trapReshufflesUsed: number;
  hintUses: number;
  multiplierMatches: number;
  bossLevel: boolean;
}

// ── Era Level Configs ─────────────────────────────────────────────────────────

const ERA_LEVEL_TITLES: Record<Difficulty, string[]> = {
  [Difficulty.Easy]:   ['Apprentice', 'Scholar', 'Sage', 'Elder', 'Oracle'],
  [Difficulty.Medium]: ['Squire', 'Knight', 'Baron', 'Count', 'Lord'],
  [Difficulty.Hard]:   ['Intern', 'Engineer', 'Senior', 'Principal', 'Legend'],
  [Difficulty.Expert]: ['Scout', 'Navigator', 'Cipher', 'Operator', 'Admiral'],
  [Difficulty.Master]: ['Seeker', 'Warden', 'Invoker', 'Titan', 'Dragonheart'],
};

const LEVEL_COUNT_BY_ERA: Record<Difficulty, number> = {
  [Difficulty.Easy]: 50,
  [Difficulty.Medium]: 50,
  [Difficulty.Hard]: 100,
  [Difficulty.Expert]: 100,
  [Difficulty.Master]: 100,
};

function getLevelLabel(era: Difficulty, level: number): string {
  const titles = ERA_LEVEL_TITLES[era];
  const tier = Math.ceil(level / 10);
  const title = titles[Math.min(tier - 1, titles.length - 1)];
  return `${title} ${level}`;
}

function getLevelMechanics(era: Difficulty, level: number): string[] {
  const progressBand = Math.ceil(level / 10);
  const common = [
    'Pattern-based board',
    progressBand >= 2 ? 'Hint charge unlocked' : 'Memory warmup',
    progressBand >= 3 ? 'Freeze burst unlocked' : 'Clean reveal pacing',
  ];

  if (era === Difficulty.Easy) return progressBand >= 4 ? ['Sandstorm veils', ...common] : common;
  if (era === Difficulty.Medium) return progressBand >= 4 ? ['Shielded mismatch buffer', ...common] : common;
  if (era === Difficulty.Hard) return progressBand >= 4 ? ['Pulse scan preview', ...common] : common;
  if (era === Difficulty.Expert) return progressBand >= 4 ? ['Decoy pressure rises', ...common] : common;
  return progressBand >= 4 ? ['Mythic pressure spikes', ...common] : common;
}

function buildEraLevels(era: Difficulty): EraLevel[] {
  const totalLevels = LEVEL_COUNT_BY_ERA[era];

  return Array.from({ length: totalLevels }, (_, index) => {
    const level = index + 1;
    const progress = index / Math.max(totalLevels - 1, 1);
    const difficultyBias =
      era === Difficulty.Easy ? 0 :
      era === Difficulty.Medium ? 1 :
      era === Difficulty.Hard ? 2 :
      era === Difficulty.Expert ? 3 : 4;
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
      stageCount: 1,
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
  });
}

export const ERA_LEVEL_CONFIGS: Record<Difficulty, EraLevel[]> = {
  [Difficulty.Easy]:   buildEraLevels(Difficulty.Easy),
  [Difficulty.Medium]: buildEraLevels(Difficulty.Medium),
  [Difficulty.Hard]:   buildEraLevels(Difficulty.Hard),
  [Difficulty.Expert]: buildEraLevels(Difficulty.Expert),
  [Difficulty.Master]: buildEraLevels(Difficulty.Master),
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

export function getMovesNeededForThreeStars(optimalMoves: number): number {
  return Math.floor((optimalMoves * 110) / 100);
}

export function getStreakMultiplier(streak: DailyStreak): number {
  if (streak.currentStreak >= 30) return 2.0;
  if (streak.currentStreak >= 14) return 1.5;
  if (streak.currentStreak >= 7)  return 1.25;
  return 1.0;
}

export function isLevelUnlocked(era: Difficulty, level: number, levelProgress: LevelProgress[]): boolean {
  if (level <= 1) return true;
  return levelProgress.some((lp) => lp.era === era && lp.level === level - 1 && lp.completed);
}

export function isEraUnlocked(era: Difficulty, levelProgress: LevelProgress[]): boolean {
  const index = DIFFICULTY_ORDER.indexOf(era);
  if (index <= 0) return true;

  const previousEra = DIFFICULTY_ORDER[index - 1];
  const requiredLevel = Math.min(4, ERA_LEVEL_CONFIGS[previousEra].length);
  return levelProgress.some(
    (lp) => lp.era === previousEra && lp.level >= requiredLevel && lp.completed
  );
}

export function getMaxLevelForEra(era: Difficulty): number {
  return ERA_LEVEL_CONFIGS[era]?.length ?? 0;
}

export function getStageCountForLevel(era: Difficulty, level: number): number {
  return ERA_LEVEL_CONFIGS[era]?.[level - 1]?.stageCount ?? 1;
}

export function getNextStageForLevel(
  era: Difficulty,
  level: number,
  levelProgress: LevelProgress[]
): number {
  const progress = levelProgress.find((lp) => lp.era === era && lp.level === level);
  const stageCount = getStageCountForLevel(era, level);
  return Math.min((progress?.highestStageCompleted ?? 0) + 1, stageCount);
}

export function getTotalLevelCount(): number {
  return DIFFICULTY_ORDER.reduce((sum, era) => sum + getMaxLevelForEra(era), 0);
}
