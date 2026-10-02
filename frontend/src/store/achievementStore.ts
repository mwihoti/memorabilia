import { Achievement, Difficulty, DIFFICULTY_ORDER, ERA_LEVEL_CONFIGS, LevelProgress, TimeMedal, DailyStreak } from '../types';

const ACHIEVEMENTS_KEY = 'memorabilia_achievements';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_steps',        name: 'First Steps',        description: 'Complete your first game',                        icon: '🎯' },
  { id: 'speed_demon',        name: 'Speed Demon',         description: 'Finish a level in under 30 seconds',              icon: '⚡' },
  { id: 'perfect_memory',     name: 'Perfect Memory',      description: 'Complete a level with zero mismatches',           icon: '🧠', reward: 'theme_golden' },
  { id: 'archivist',          name: 'Archivist',           description: '3 consecutive matches without a mistake',         icon: '📚' },
  { id: 'hot_streak',         name: 'Hot Streak',          description: '5 consecutive matches without a mistake',         icon: '🔥', reward: 'theme_inferno' },
  { id: 'time_traveler',      name: 'Time Traveler',       description: 'Complete every era',                             icon: '⏳' },
  { id: 'streak_scholar',     name: 'Streak Scholar',      description: 'Maintain a 7-day streak',                        icon: '📅', reward: 'theme_starfield' },
  { id: 'ancient_master',     name: 'Ancient Master',      description: 'Complete Ancient Era Level 7',                   icon: '🏺', reward: 'theme_antiquity' },
  { id: 'medieval_champion',  name: 'Medieval Champion',   description: 'Complete Medieval Times Level 7',                icon: '⚔️', reward: 'theme_chivalry' },
  { id: 'modern_legend',      name: 'Modern Legend',       description: 'Complete Modern Era Level 7',                    icon: '🚀', reward: 'theme_neon' },
  { id: 'combo_king',         name: 'Combo King',          description: 'Reach x3 combo multiplier',                      icon: '👑' },
  { id: 'daily_devotee',      name: 'Daily Devotee',       description: 'Complete a Daily Challenge',                     icon: '📆' },
  { id: 'gold_rush',          name: 'Gold Rush',           description: 'Earn Gold medal on any level',                   icon: '🥇' },
  { id: 'perfectionist',      name: 'Perfectionist',       description: 'Earn Gold with zero mismatches',                 icon: '💎', reward: 'theme_crystal' },
  { id: 'streak_30',          name: 'Devoted Curator',     description: 'Maintain a 30-day streak',                      icon: '🌟', reward: 'theme_celestial' },
];

export interface AchievementContext {
  gameCompleted: boolean;
  elapsedSeconds: number;
  mismatches: number;       // total mismatches in game
  maxCombo: number;         // highest combo reached
  medal: TimeMedal;
  era: Difficulty;
  level: number;
  levelProgress: LevelProgress[];
  streak: DailyStreak;
  isDailyChallenge: boolean;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function loadStoredAchievements(): Achievement[] {
  try {
    const data = localStorage.getItem(ACHIEVEMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveStoredAchievements(achievements: Achievement[]): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
  } catch (error) {
    console.error('Failed to save achievements:', error);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Bring the server's achievements into the local store.
 *
 * With `merge`, the server's unlocks are added to what is already stored —
 * the normal case, so achievements earned before the server tracked them are
 * not wiped and do not toast a second time. Without it, the server's list
 * replaces the store outright.
 */
export function adoptServerAchievements(
  server: Array<string | { id: string; unlockedAt?: number }>,
  options: { merge?: boolean } = {},
): void {
  const now = Date.now();
  const incoming = server
    .map((entry) => (typeof entry === 'string' ? { id: entry, unlockedAt: now } : entry))
    .filter((entry) => ACHIEVEMENTS.some((a) => a.id === entry.id));

  const base = options.merge ? loadStoredAchievements() : [];
  const byId = new Map(base.map((a) => [a.id, a]));
  for (const entry of incoming) {
    const known = ACHIEVEMENTS.find((a) => a.id === entry.id)!;
    if (!byId.get(entry.id)?.unlockedAt) {
      byId.set(entry.id, { ...known, unlockedAt: entry.unlockedAt ?? now });
    }
  }
  saveStoredAchievements([...byId.values()]);
}

/**
 * Returns all achievements with their unlock status merged in.
 */
export function getUnlockedAchievements(): Achievement[] {
  const stored = loadStoredAchievements();
  const storedMap = new Map(stored.map((a) => [a.id, a]));

  return ACHIEVEMENTS.map((achievement) => {
    const storedEntry = storedMap.get(achievement.id);
    if (storedEntry?.unlockedAt) {
      return { ...achievement, unlockedAt: storedEntry.unlockedAt };
    }
    return achievement;
  });
}

export function isAchievementUnlocked(id: string): boolean {
  const stored = loadStoredAchievements();
  return stored.some((a) => a.id === id && a.unlockedAt !== undefined);
}

/**
 * Check context against all achievement rules.
 * Unlocks any newly earned achievements and returns the newly unlocked ones.
 */
export function checkAndUnlockAchievements(ctx: AchievementContext): Achievement[] {
  const stored = loadStoredAchievements();
  const storedMap = new Map(stored.map((a) => [a.id, a]));

  const newlyUnlocked: Achievement[] = [];

  function tryUnlock(id: string): void {
    if (storedMap.has(id) && storedMap.get(id)!.unlockedAt !== undefined) return;
    const definition = ACHIEVEMENTS.find((a) => a.id === id);
    if (!definition) return;

    const unlocked: Achievement = { ...definition, unlockedAt: Date.now() };
    storedMap.set(id, unlocked);
    newlyUnlocked.push(unlocked);
  }

  if (!ctx.gameCompleted) {
    // Only save if anything changed (shouldn't happen, but guard anyway)
    return [];
  }

  // first_steps — complete any game
  tryUnlock('first_steps');

  // speed_demon — finish a level in under 30 seconds
  if (ctx.elapsedSeconds < 30) {
    tryUnlock('speed_demon');
  }

  // perfect_memory — zero mismatches
  if (ctx.mismatches === 0) {
    tryUnlock('perfect_memory');
  }

  // archivist — 3 consecutive matches (maxCombo >= 3)
  if (ctx.maxCombo >= 3) {
    tryUnlock('archivist');
  }

  // hot_streak — 5 consecutive matches (maxCombo >= 5)
  if (ctx.maxCombo >= 5) {
    tryUnlock('hot_streak');
  }

  // combo_king — reached x3 multiplier (needs 4+ consecutive matches)
  if (ctx.maxCombo >= 4) {
    tryUnlock('combo_king');
  }

  // gold_rush — earned gold medal
  if (ctx.medal === 'gold') {
    tryUnlock('gold_rush');
  }

  // perfectionist — gold with zero mismatches
  if (ctx.medal === 'gold' && ctx.mismatches === 0) {
    tryUnlock('perfectionist');
  }

  const ancientFinalLevel = ERA_LEVEL_CONFIGS[Difficulty.Easy].length;
  const ancientL5Done = ctx.levelProgress.some(
    (lp) => lp.era === Difficulty.Easy && lp.level === ancientFinalLevel && lp.completed
  );
  if (ancientL5Done) tryUnlock('ancient_master');

  const medievalFinalLevel = ERA_LEVEL_CONFIGS[Difficulty.Medium].length;
  const medievalL5Done = ctx.levelProgress.some(
    (lp) => lp.era === Difficulty.Medium && lp.level === medievalFinalLevel && lp.completed
  );
  if (medievalL5Done) tryUnlock('medieval_champion');

  const modernFinalLevel = ERA_LEVEL_CONFIGS[Difficulty.Hard].length;
  const modernL5Done = ctx.levelProgress.some(
    (lp) => lp.era === Difficulty.Hard && lp.level === modernFinalLevel && lp.completed
  );
  if (modernL5Done) tryUnlock('modern_legend');

  const completedAllEras = DIFFICULTY_ORDER.every((era) =>
    ctx.levelProgress.some((lp) => lp.era === era && lp.completed)
  );
  if (completedAllEras) tryUnlock('time_traveler');

  // streak_scholar — 7-day streak
  if (ctx.streak.currentStreak >= 7) tryUnlock('streak_scholar');

  // streak_30 — 30-day streak
  if (ctx.streak.currentStreak >= 30) tryUnlock('streak_30');

  // daily_devotee — completed a daily challenge
  if (ctx.isDailyChallenge) tryUnlock('daily_devotee');

  if (newlyUnlocked.length > 0) {
    const merged = Array.from(storedMap.values());
    saveStoredAchievements(merged);
  }

  return newlyUnlocked;
}
