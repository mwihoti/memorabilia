import { DailyStreak } from '../types';

const STREAK_KEY = 'memorabilia_streak';

// ── Date helpers ──────────────────────────────────────────────────────────────

export function getToday(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.round(Math.abs(b - a) / 86_400_000);
}

function computeMultiplierBonus(streak: number): number {
  if (streak >= 30) return 1.0;
  if (streak >= 14) return 0.5;
  if (streak >= 7)  return 0.25;
  return 0;
}

function computeShields(streak: number, current: number): number {
  // Earn a shield at day 3 and day 7; max 2 shields total
  let earned = 0;
  if (streak >= 3) earned++;
  if (streak >= 7) earned++;
  // Don't decrease existing shield count (shields are consumed, not lost)
  return Math.min(2, Math.max(current, earned));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function loadStreak(): DailyStreak {
  try {
    const data = localStorage.getItem(STREAK_KEY);
    if (data) return JSON.parse(data) as DailyStreak;
  } catch {
    // fall through to default
  }

  return {
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedDate: '',
    shieldsAvailable: 0,
    multiplierBonus: 0,
  };
}

function saveStreak(streak: DailyStreak): void {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  } catch (error) {
    console.error('Failed to save streak:', error);
  }
}

export function recordGamePlayed(): DailyStreak {
  const today     = getToday();
  const streak    = loadStreak();
  const lastPlayed = streak.lastPlayedDate;

  let newStreak = streak.currentStreak;
  let shields   = streak.shieldsAvailable;

  if (lastPlayed === today) {
    // Already played today — no change
    return streak;
  }

  if (lastPlayed === '') {
    // First ever game
    newStreak = 1;
  } else {
    const gap = daysBetween(lastPlayed, today);

    if (gap === 1) {
      // Consecutive day
      newStreak = streak.currentStreak + 1;
    } else if (gap > 1 && shields > 0) {
      // Missed a day but has a shield — consume shield, keep streak
      shields   = shields - 1;
      newStreak = streak.currentStreak + 1;
    } else {
      // Gap > 1 and no shields — reset
      newStreak = 1;
    }
  }

  const longestStreak    = Math.max(streak.longestStreak, newStreak);
  const shieldsAvailable = computeShields(newStreak, shields);
  const multiplierBonus  = computeMultiplierBonus(newStreak);

  const updated: DailyStreak = {
    currentStreak: newStreak,
    longestStreak,
    lastPlayedDate: today,
    shieldsAvailable,
    multiplierBonus,
  };

  saveStreak(updated);
  return updated;
}

export function getStreakDisplay(streak: DailyStreak): string {
  if (streak.currentStreak <= 0) return 'Start your streak today!';
  return `🔥 ${streak.currentStreak}-day streak!`;
}
