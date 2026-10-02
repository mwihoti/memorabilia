import { sql } from './_db';
import {
  advanceStreak,
  toDateKey,
  streakGrant,
  addGrants,
  REFERRAL_GRANT,
  getWeekKey,
  getSeason,
  seasonPointsFor,
  NO_GRANT,
  type PowerGrant,
  type StreakState,
} from '../shared/activities';
import { getLevelRule, type DifficultyId } from '../shared/gameRules';

export interface RunFacts {
  telegramId: bigint;
  era: DifficultyId;
  level: number;
  score: number;
  stars: number;
  timeSeconds: number;
  mismatches: number;
  maxCombo: number;
  medal: string;
  isDailyChallenge: boolean;
}

export interface RewardOutcome {
  streak: StreakState;
  streakAdvanced: boolean;
  granted: PowerGrant;
  relicsEarned: string[];
  achievementsUnlocked: string[];
  seasonPoints: number;
  weekKey: string;
  seasonKey: string;
  bossCleared: boolean;
  referralSettled: boolean;
}

/**
 * Everything that happens after a run is verified.
 *
 * Called once from `scores.ts`, after `verifyReplaySubmission` passes and never
 * before — every reward here is minted from numbers the server computed, not
 * numbers the client claimed.
 */
export async function applyRunRewards(facts: RunFacts): Promise<RewardOutcome> {
  const { telegramId: tid } = facts;
  const today = toDateKey();
  const weekKey = getWeekKey();
  const season = getSeason();

  const out: RewardOutcome = {
    streak: { current: 0, longest: 0, lastDate: null },
    streakAdvanced: false,
    granted: NO_GRANT,
    relicsEarned: [],
    achievementsUnlocked: [],
    seasonPoints: 0,
    weekKey,
    seasonKey: season.key,
    bossCleared: false,
    referralSettled: false,
  };

  /* ── Streak ────────────────────────────────────────────────────────────── */

  const userRows = (await sql`
    SELECT streak_current, streak_longest, streak_last_date, referred_by
    FROM users WHERE telegram_id = ${tid}
  `) as any[];
  const u = userRows[0] ?? {};

  const before: StreakState = {
    current: Number(u.streak_current ?? 0),
    longest: Number(u.streak_longest ?? 0),
    lastDate: u.streak_last_date ? toDateKey(new Date(u.streak_last_date)) : null,
  };

  const after = advanceStreak(before, today);
  out.streak = after;
  out.streakAdvanced = after.lastDate !== before.lastDate;

  let grant = out.streakAdvanced ? streakGrant(after.current) : NO_GRANT;

  // Finishing a level always clears the quit count, whether or not the streak
  // advanced — the penalty is for walking out, not for playing twice in a day.
  await sql`UPDATE users SET consecutive_quits = 0 WHERE telegram_id = ${tid}`;

  if (out.streakAdvanced) {
    await sql`
      UPDATE users
      SET streak_current = ${after.current},
          streak_longest = ${after.longest},
          streak_last_date = ${after.lastDate}
      WHERE telegram_id = ${tid}
    `;

    // Streak relics — the two you cannot grind for.
    if (after.current >= 7) out.relicsEarned.push('streak-7');
    if (after.current >= 30) out.relicsEarned.push('streak-30');
  }

  /* ── Weekly ladder ─────────────────────────────────────────────────────── */

  await sql`
    INSERT INTO weekly_scores (week_key, telegram_id, best_score, games)
    VALUES (${weekKey}, ${tid}, ${facts.score}, 1)
    ON CONFLICT (week_key, telegram_id) DO UPDATE SET
      best_score = GREATEST(weekly_scores.best_score, EXCLUDED.best_score),
      games = weekly_scores.games + 1,
      updated_at = NOW()
  `;

  /* ── Season ────────────────────────────────────────────────────────────── */

  const points = seasonPointsFor(facts.score, facts.era, facts.stars);
  out.seasonPoints = points;

  await sql`
    INSERT INTO seasons (season_key, name, starts_at, ends_at)
    VALUES (${season.key}, ${season.name}, ${season.startsAt.toISOString()}, ${season.endsAt.toISOString()})
    ON CONFLICT (season_key) DO NOTHING
  `;
  await sql`
    INSERT INTO season_scores (season_key, telegram_id, points, games)
    VALUES (${season.key}, ${tid}, ${points}, 1)
    ON CONFLICT (season_key, telegram_id) DO UPDATE SET
      points = season_scores.points + EXCLUDED.points,
      games = season_scores.games + 1,
      updated_at = NOW()
  `;

  /* ── Relics ────────────────────────────────────────────────────────────── */

  const rule = getLevelRule(facts.era, facts.level);
  if (rule.relic) out.relicsEarned.push(`${facts.era}-${facts.level}`);

  /* ── Boss event ────────────────────────────────────────────────────────── */

  const bossRows = (await sql`
    SELECT id, relic_id FROM boss_events
    WHERE era = ${facts.era} AND level = ${facts.level}
      AND opens_at <= NOW() AND closes_at > NOW()
    LIMIT 1
  `) as any[];

  if (bossRows.length) {
    await sql`
      INSERT INTO boss_clears (event_id, telegram_id, score, time_seconds)
      VALUES (${bossRows[0].id}, ${tid}, ${facts.score}, ${facts.timeSeconds})
      ON CONFLICT (event_id, telegram_id) DO UPDATE SET
        score = GREATEST(boss_clears.score, EXCLUDED.score)
    `;
    out.bossCleared = true;
    out.relicsEarned.push(bossRows[0].relic_id);
  }

  /* ── Referral settlement ───────────────────────────────────────────────── */

  if (u.referred_by) {
    const pending = (await sql`
      SELECT inviter_telegram_id FROM referrals
      WHERE invitee_telegram_id = ${tid} AND rewarded = FALSE
    `) as any[];

    if (pending.length) {
      const inviter = pending[0].inviter_telegram_id;
      await sql`
        UPDATE referrals SET rewarded = TRUE WHERE invitee_telegram_id = ${tid}
      `;
      await grantPowers(inviter, REFERRAL_GRANT);
      grant = addGrants(grant, REFERRAL_GRANT);
      out.referralSettled = true;

      // Inviter relics scale with how many people they have actually brought in.
      const counted = (await sql`
        SELECT COUNT(*)::int AS n FROM referrals
        WHERE inviter_telegram_id = ${inviter} AND rewarded = TRUE
      `) as any[];
      const n = Number(counted[0]?.n ?? 0);
      if (n >= 1) await awardRelic(inviter, 'referral-1', 1, 0);
      if (n >= 5) await awardRelic(inviter, 'referral-5', 2, 0);
    }
  }

  /* ── Persist relics and powers ─────────────────────────────────────────── */

  out.relicsEarned = [...new Set(out.relicsEarned)];
  for (const relicId of out.relicsEarned) {
    await awardRelic(tid, relicId, facts.era, facts.level);
  }

  if (grant.hint || grant.freeze || grant.boost) {
    await grantPowers(tid, grant);
  }
  out.granted = grant;

  /* ── Achievements ──────────────────────────────────────────────────────── */

  out.achievementsUnlocked = await unlockAchievements(tid, facts, after.current);

  return out;
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

async function grantPowers(telegramId: bigint | number, grant: PowerGrant) {
  await sql`
    UPDATE users
    SET power_hint = power_hint + ${grant.hint},
        power_freeze = power_freeze + ${grant.freeze},
        power_boost = power_boost + ${grant.boost}
    WHERE telegram_id = ${telegramId}
  `;
}

async function awardRelic(
  telegramId: bigint | number,
  relicId: string,
  era: number,
  level: number,
) {
  await sql`
    INSERT INTO player_relics (telegram_id, relic_id, era, level)
    VALUES (${telegramId}, ${relicId}, ${era}, ${level})
    ON CONFLICT (telegram_id, relic_id) DO NOTHING
  `;
}

/**
 * Server-side achievement evaluation.
 *
 * The client keeps its own copy for instant feedback, but this is the one that
 * counts — it is the only version computed from verified numbers.
 */
async function unlockAchievements(
  tid: bigint,
  facts: RunFacts,
  streakDays: number,
): Promise<string[]> {
  const earned: string[] = [];
  const add = (id: string, when: boolean) => {
    if (when) earned.push(id);
  };

  const counts = (await sql`
    SELECT
      (SELECT COUNT(*)::int FROM game_sessions WHERE telegram_id = ${tid} AND verified) AS games,
      (SELECT COUNT(DISTINCT era)::int FROM player_progress WHERE telegram_id = ${tid} AND completed) AS eras
  `) as any[];

  add('first_steps', Number(counts[0]?.games ?? 0) >= 1);
  add('speed_demon', facts.timeSeconds > 0 && facts.timeSeconds < 30);
  add('perfect_memory', facts.mismatches === 0);
  add('archivist', facts.maxCombo >= 3);
  add('hot_streak', facts.maxCombo >= 5);
  add('combo_king', facts.maxCombo >= 3);
  add('time_traveler', Number(counts[0]?.eras ?? 0) >= 5);
  add('streak_scholar', streakDays >= 7);
  add('streak_30', streakDays >= 30);
  add('daily_devotee', facts.isDailyChallenge);
  add('gold_rush', facts.medal === 'gold');
  add('perfectionist', facts.medal === 'gold' && facts.mismatches === 0);
  add('ancient_master', facts.era === 1 && facts.level >= 7);
  add('medieval_champion', facts.era === 2 && facts.level >= 7);
  add('modern_legend', facts.era === 3 && facts.level >= 7);

  if (!earned.length) return [];

  // Only report the ones that were not already held, so the client can toast
  // exactly the new ones.
  const fresh: string[] = [];
  for (const id of earned) {
    const rows = (await sql`
      INSERT INTO player_achievements (telegram_id, achievement_id)
      VALUES (${tid}, ${id})
      ON CONFLICT (telegram_id, achievement_id) DO NOTHING
      RETURNING achievement_id
    `) as any[];
    if (rows.length) fresh.push(id);
  }

  return fresh;
}
