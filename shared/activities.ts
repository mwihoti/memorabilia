/**
 * Shared rules for the activity layer — weekly ladders, seasons, duels, relics
 * and boss events.
 *
 * Imported by both the Vercel functions and the client so a week key or a relic
 * id means the same thing on both sides. Pure functions only: no I/O, no
 * `Date.now()` without an injectable override, so every rule is testable.
 */

import { DIFFICULTY_ORDER, type DifficultyId, getMaxLevelForEra, getLevelRule } from './gameRules.js';

/* ── Time keys ───────────────────────────────────────────────────────────── */

/**
 * ISO-8601 week key, e.g. `2026-W40`.
 *
 * Weeks start Monday and the week containing the year's first Thursday is week
 * 1, which is what makes this agree with every other ISO week implementation
 * and keeps the ladder from resetting twice around New Year.
 */
export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Thursday of the current week determines the year the week belongs to.
  const dayNumber = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Start of the ISO week (Monday 00:00 UTC) that `date` falls in. */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dayNumber - 1));
  return d;
}

/** Milliseconds until the weekly ladder resets. */
export function msUntilWeekReset(now: Date = new Date()): number {
  const nextMonday = getWeekStart(now);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  return Math.max(0, nextMonday.getTime() - now.getTime());
}

/* ── Seasons ─────────────────────────────────────────────────────────────── */

export const SEASON_LENGTH_WEEKS = 6;

/** Anchor: seasons are counted in 6-week blocks from this Monday. */
const SEASON_EPOCH = Date.UTC(2026, 0, 5); // 2026-01-05, a Monday

export interface SeasonWindow {
  key: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  /** 1-based week within the season. */
  week: number;
}

const SEASON_NAMES = [
  'Dust and Gold',
  'The Iron Crown',
  'Signal Fire',
  'Quiet Machines',
  'The Long Vault',
  'Dragonlight',
];

/** The season `date` falls in, derived — no table lookup needed to know it. */
export function getSeason(date: Date = new Date()): SeasonWindow {
  const weeksSinceEpoch = Math.floor((date.getTime() - SEASON_EPOCH) / (7 * 86400000));
  const index = Math.max(0, Math.floor(weeksSinceEpoch / SEASON_LENGTH_WEEKS));

  const startsAt = new Date(SEASON_EPOCH + index * SEASON_LENGTH_WEEKS * 7 * 86400000);
  const endsAt = new Date(startsAt.getTime() + SEASON_LENGTH_WEEKS * 7 * 86400000);

  return {
    key: `S${String(index + 1).padStart(3, '0')}`,
    name: SEASON_NAMES[index % SEASON_NAMES.length],
    startsAt,
    endsAt,
    week: Math.min(
      SEASON_LENGTH_WEEKS,
      Math.max(1, Math.floor((date.getTime() - startsAt.getTime()) / (7 * 86400000)) + 1),
    ),
  };
}

/**
 * Season points for a finished run.
 *
 * Deliberately flatter than raw score: a late-era player should lead a beginner
 * but not by fifty times, or the ladder is decided in week one and everyone
 * else stops playing.
 */
export function seasonPointsFor(score: number, era: DifficultyId, stars: number): number {
  const base = Math.round(Math.sqrt(Math.max(0, score)) * 2);
  const eraBonus = (DIFFICULTY_ORDER.indexOf(era) + 1) * 10;
  const starBonus = Math.max(0, stars) * 15;
  return base + eraBonus + starBonus;
}

/* ── Duels ───────────────────────────────────────────────────────────────── */

export const DUEL_WINDOW_HOURS = 24;

export function duelExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + DUEL_WINDOW_HOURS * 3600000);
}

export type DuelOutcome = 'pending' | 'won' | 'lost' | 'drawn' | 'expired';

export interface DuelSide {
  telegramId: number;
  score: number | null;
  timeSeconds: number | null;
}

/**
 * Resolve a duel from both sides.
 *
 * Higher score wins; a tie on score is broken by the faster clear. A side that
 * never played loses once the window closes, and forfeits immediately if the
 * other side has already played and the window has passed.
 */
export function resolveDuel(
  challenger: DuelSide,
  opponent: DuelSide,
  expiresAt: Date,
  now: Date = new Date(),
): { outcome: DuelOutcome; winnerTelegramId: number | null } {
  const expired = now >= expiresAt;
  const bothPlayed = challenger.score !== null && opponent.score !== null;

  if (!bothPlayed && !expired) return { outcome: 'pending', winnerTelegramId: null };

  if (!bothPlayed) {
    // Window closed with one side missing.
    if (challenger.score === null && opponent.score === null) {
      return { outcome: 'expired', winnerTelegramId: null };
    }
    const winner = challenger.score !== null ? challenger : opponent;
    return { outcome: 'won', winnerTelegramId: winner.telegramId };
  }

  if (challenger.score! !== opponent.score!) {
    const winner = challenger.score! > opponent.score! ? challenger : opponent;
    return { outcome: 'won', winnerTelegramId: winner.telegramId };
  }

  const ct = challenger.timeSeconds ?? Number.MAX_SAFE_INTEGER;
  const ot = opponent.timeSeconds ?? Number.MAX_SAFE_INTEGER;
  if (ct === ot) return { outcome: 'drawn', winnerTelegramId: null };

  return { outcome: 'won', winnerTelegramId: ct < ot ? challenger.telegramId : opponent.telegramId };
}

/* ── Relics ──────────────────────────────────────────────────────────────── */

export interface RelicDef {
  id: string;
  name: string;
  icon: string;
  era: DifficultyId;
  level: number;
  /** How it is obtained — drives the empty-slot hint in the collection. */
  source: 'level' | 'boss' | 'referral' | 'streak';
}

const RELIC_ICONS: Record<DifficultyId, string[]> = {
  1: ['🏺', '🗿', '📜', '⚱️', '👑'],
  2: ['⚔️', '🛡️', '🏰', '📯', '🗝️'],
  3: ['🚀', '📻', '🔭', '🧬', '💿'],
  4: ['🛸', '🪐', '⚛️', '🧿', '💠'],
  5: ['🐲', '🦄', '💎', '🪽', '🔥'],
};

// Ten per era — eras 3 to 5 run to 100 levels and so award ten relics each.
// A collection showing the same name twice reads as a bug, so no cycling.
const RELIC_NAMES: Record<DifficultyId, string[]> = {
  1: [
    'Cracked Amphora', 'Weathered Colossus', 'The Lost Scroll', 'Burial Urn', 'Circlet of Dusk',
    'Oracle Bone', 'Salt-Worn Mask', 'Tablet of Debts', 'Bronze Augur', 'The First Coin',
  ],
  2: [
    'Notched Blade', 'Siege Shield', 'Keep of Thorns', 'The Herald’s Horn', 'Vault Key',
    'Plague Bell', 'Reliquary Nail', 'Tourney Spur', 'Chainmail Scrap', 'The Pardon Seal',
  ],
  3: [
    'Booster Core', 'Shortwave Set', 'Glass Eye', 'Helix Sample', 'Silver Disc',
    'Punch Card', 'Filament Bulb', 'Cathode Tube', 'Reel of Nitrate', 'The Last Dial Tone',
  ],
  4: [
    'Drift Hull', 'Ring Fragment', 'Cold Atom', 'Ward Lens', 'Prism Node',
    'Lattice Seed', 'Null Anchor', 'Echo Buoy', 'Halo Coupling', 'The Quiet Engine',
  ],
  5: [
    'Scale of the First', 'Horn of the Pale', 'Heartstone', 'Severed Wing', 'Everflame',
    'Wyrm Tooth', 'The Bound Name', 'Ashen Crown', 'Gravebloom', 'Last Ember',
  ],
};

/**
 * Every relic in the game, derived from the level rules that award them.
 *
 * Built once at module load: the collection screen needs the full set including
 * the ones a player has not earned, because the gaps are the point.
 */
export const ALL_RELICS: RelicDef[] = buildRelicCatalogue();

function buildRelicCatalogue(): RelicDef[] {
  const out: RelicDef[] = [];

  for (const era of DIFFICULTY_ORDER) {
    const max = getMaxLevelForEra(era);
    let slot = 0;

    for (let level = 1; level <= max; level++) {
      const rule = getLevelRule(era, level);
      if (!rule.relic) continue;

      const icons = RELIC_ICONS[era];
      const names = RELIC_NAMES[era];
      out.push({
        id: `${era}-${level}`,
        name: names[slot % names.length],
        icon: icons[slot % icons.length],
        era,
        level,
        source: rule.boss ? 'boss' : 'level',
      });
      slot++;
    }
  }

  // Relics you cannot grind for — these make the collection feel social.
  out.push(
    { id: 'referral-1', name: 'Guest Register', icon: '📖', era: 1, level: 0, source: 'referral' },
    { id: 'referral-5', name: 'Patron’s Plaque', icon: '🪧', era: 2, level: 0, source: 'referral' },
    { id: 'streak-7', name: 'Week Without Rest', icon: '🕯️', era: 3, level: 0, source: 'streak' },
    { id: 'streak-30', name: 'The Long Vigil', icon: '🌒', era: 5, level: 0, source: 'streak' },
  );

  return out;
}

export function getRelic(id: string): RelicDef | undefined {
  return ALL_RELICS.find((r) => r.id === id);
}

/* ── Boss events ─────────────────────────────────────────────────────────── */

export const BOSS_WINDOW_HOURS = 48;

export interface BossPlan {
  era: DifficultyId;
  level: number;
  seed: number;
  relicId: string;
  title: string;
}

/**
 * Pick the boss for a given week, deterministically.
 *
 * Deriving it from the week key rather than storing a calendar means the
 * schedule never runs out, and a missed cron does not leave a hole.
 */
export function planBossForWeek(weekKey: string): BossPlan {
  const hash = hashString(weekKey);
  const bossLevels: Array<{ era: DifficultyId; level: number }> = [];

  for (const era of DIFFICULTY_ORDER) {
    const max = getMaxLevelForEra(era);
    for (let level = 1; level <= max; level++) {
      if (getLevelRule(era, level).boss) bossLevels.push({ era, level });
    }
  }

  // Every era defines boss levels, so this list is never empty in practice —
  // but a rules change should degrade to a sane board, not a crash.
  if (bossLevels.length === 0) {
    return { era: 1, level: 10, seed: hash, relicId: '1-10', title: 'Boss Hunt' };
  }

  const pick = bossLevels[hash % bossLevels.length];
  return {
    era: pick.era,
    level: pick.level,
    seed: hash,
    relicId: `${pick.era}-${pick.level}`,
    title: `Boss Hunt · ${weekKey}`,
  };
}

/* ── Rewards ─────────────────────────────────────────────────────────────── */

export interface PowerGrant {
  hint: number;
  freeze: number;
  boost: number;
}

export const NO_GRANT: PowerGrant = { hint: 0, freeze: 0, boost: 0 };

/** Both sides of a referral get this, once, when the invitee first finishes a level. */
export const REFERRAL_GRANT: PowerGrant = { hint: 1, freeze: 1, boost: 1 };

/** Daily streak rewards — the 7th and 30th day also drop a relic. */
export function streakGrant(streakDay: number): PowerGrant {
  if (streakDay >= 30) return { hint: 3, freeze: 3, boost: 3 };
  if (streakDay >= 14) return { hint: 2, freeze: 2, boost: 1 };
  if (streakDay >= 7) return { hint: 2, freeze: 1, boost: 1 };
  if (streakDay >= 3) return { hint: 1, freeze: 1, boost: 0 };
  return { hint: 1, freeze: 0, boost: 0 };
}

export function addGrants(a: PowerGrant, b: PowerGrant): PowerGrant {
  return { hint: a.hint + b.hint, freeze: a.freeze + b.freeze, boost: a.boost + b.boost };
}

/* ── Streaks ─────────────────────────────────────────────────────────────── */

export interface StreakState {
  current: number;
  longest: number;
  lastDate: string | null; // 'YYYY-MM-DD'
}

export function toDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Advance a streak for a play on `today`.
 *
 * Same day is a no-op, the next day extends, anything later resets to 1. The
 * caller persists the result; this function has no opinion about storage.
 */
export function advanceStreak(state: StreakState, today: string): StreakState {
  if (state.lastDate === today) return state;

  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const continued = state.lastDate === toDateKey(yesterday);

  const current = continued ? state.current + 1 : 1;
  return {
    current,
    longest: Math.max(state.longest, current),
    lastDate: today,
  };
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** FNV-1a — small, stable across platforms, good enough to pick a boss. */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
