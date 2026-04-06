import { DailyChallenge, Difficulty, TimeMedal } from '../types';
import { getToday } from './streakStore';

const DAILY_CHALLENGE_KEY = 'memorabilia_daily_challenge';

// ── Config derivation ─────────────────────────────────────────────────────────

/**
 * Derive the difficulty for today based on the day of week.
 * Mon/Thu = Ancient (Easy), Tue/Fri = Medieval (Medium), Wed/Sat/Sun = Modern (Hard)
 */
function difficultyFromDayOfWeek(dayOfWeek: number): Difficulty {
  // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  if (dayOfWeek === 1 || dayOfWeek === 4) return Difficulty.Easy;
  if (dayOfWeek === 2 || dayOfWeek === 5) return Difficulty.Medium;
  return Difficulty.Hard; // 0=Sun, 3=Wed, 6=Sat
}

export function getDailyChallengeConfig(): { difficulty: Difficulty; level: number; seed: number } {
  const today = getToday(); // 'YYYY-MM-DD'
  const date  = new Date(today);

  const dayOfWeek  = date.getDay();
  const dayOfMonth = date.getDate();

  const difficulty = difficultyFromDayOfWeek(dayOfWeek);
  const level      = (dayOfMonth % 5) + 1; // 1-5
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
