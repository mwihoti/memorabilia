import { DailyChallenge, TimeMedal, WeeklyChallenge } from '../types';
import { getToday } from './streakStore';
import { getDailyChallengeConfigFromDate, getWeeklyChallengeConfigFromDate } from '../../../shared/gameRules.js';

const DAILY_CHALLENGE_KEY = 'memorabilia_daily_challenge';
const WEEKLY_CHALLENGE_KEY = 'memorabilia_weekly_challenge';

export function getDailyChallengeConfig() {
  return getDailyChallengeConfigFromDate(getToday());
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

export function getWeeklyChallengeConfig() {
  return getWeeklyChallengeConfigFromDate(getToday());
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
