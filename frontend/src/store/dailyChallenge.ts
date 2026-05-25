import { DailyChallenge, Difficulty, DIFFICULTY_ORDER, ERA_LEVEL_CONFIGS, TimeMedal, WeeklyChallenge } from '../types';
import { getToday } from './streakStore';

const DAILY_CHALLENGE_KEY = 'memorabilia_daily_challenge';
const WEEKLY_CHALLENGE_KEY = 'memorabilia_weekly_challenge';

// ── Config derivation ─────────────────────────────────────────────────────────

/**
 * Derive the difficulty for today based on the day of week.
 * Mon/Thu = Ancient (Easy), Tue/Fri = Medieval (Medium), Wed/Sat/Sun = Modern (Hard)
 */
function difficultyFromDayOfWeek(dayOfWeek: number): Difficulty {
  return DIFFICULTY_ORDER[dayOfWeek % DIFFICULTY_ORDER.length];
}

export function getDailyChallengeConfig(): { difficulty: Difficulty; level: number; seed: number } {
  const today = getToday(); // 'YYYY-MM-DD'
  const date  = new Date(today);

  const dayOfWeek  = date.getDay();
  const dayOfMonth = date.getDate();

  const difficulty = difficultyFromDayOfWeek(dayOfWeek);
  const levelCount = ERA_LEVEL_CONFIGS[difficulty].length;
  const level      = (dayOfMonth % levelCount) + 1;
  const seed       = parseInt(today.replace(/-/g, ''), 10); // YYYYMMDD as number

  return { difficulty, level, seed };
}

// ── Storage helpers ───────────────────────────────────────────────────────────

export function loadDailyChallenge(): DailyChallenge {
  try {
    const data = localStorage.getItem(DAILY_CHALLENGE_KEY);
    if (data) {
      const stored = JSON.parse(data) as DailyChallenge;
      // If the stored challenge is from today, return it as-is
      if (stored.date === getToday()) return stored;
    }
  } catch {
    // fall through
  }

  // Build a fresh challenge for today
  const { difficulty, level, seed } = getDailyChallengeConfig();
  return {
    date: getToday(),
    seed,
    difficulty,
    level,
    completed: false,
  };
}

export function saveDailyChallenge(score: number, medal: TimeMedal): void {
  const current = loadDailyChallenge();
  const updated: DailyChallenge = {
    ...current,
    completed: true,
    score,
    medal,
  };

  try {
    localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save daily challenge:', error);
  }
}

export function isDailyChallengeCompleted(): boolean {
  const challenge = loadDailyChallenge();
  return challenge.completed;
}

function getWeekStart(date: Date): Date {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getWeekKey(date: Date): string {
  const start = getWeekStart(date);
  const year = start.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const diffDays = Math.floor((start.getTime() - startOfYear.getTime()) / 86_400_000);
  const week = Math.floor(diffDays / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function getWeeklyChallengeConfig(): { difficulty: Difficulty; level: number; seed: number; weekKey: string } {
  const today = new Date(getToday());
  const weekStart = getWeekStart(today);
  const weekKey = getWeekKey(today);
  const seed = parseInt(
    `${weekStart.getFullYear()}${String(weekStart.getMonth() + 1).padStart(2, '0')}${String(weekStart.getDate()).padStart(2, '0')}`,
    10,
  );

  const difficulty = DIFFICULTY_ORDER[seed % DIFFICULTY_ORDER.length];
  const level = (seed % ERA_LEVEL_CONFIGS[difficulty].length) + 1;

  return { difficulty, level, seed, weekKey };
}

export function loadWeeklyChallenge(): WeeklyChallenge {
  try {
    const data = localStorage.getItem(WEEKLY_CHALLENGE_KEY);
    if (data) {
      const stored = JSON.parse(data) as WeeklyChallenge;
      if (stored.weekKey === getWeeklyChallengeConfig().weekKey) return stored;
    }
  } catch {
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

export function saveWeeklyChallenge(score: number, medal: TimeMedal): void {
  const current = loadWeeklyChallenge();
  const updated: WeeklyChallenge = {
    ...current,
    completed: true,
    score,
    medal,
  };

  try {
    localStorage.setItem(WEEKLY_CHALLENGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save weekly challenge:', error);
  }
}

export function isWeeklyChallengeCompleted(): boolean {
  return loadWeeklyChallenge().completed;
}
