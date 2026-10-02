import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDb, sql } from './_db';
import { requireTelegramUser, AuthError } from './_auth';
import { getClientKey, rateLimit } from './_rateLimit';
import { logApiError } from './_telemetry';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const limit = await rateLimit(`progress:${getClientKey(req)}`, 120, 60_000);
  if (!limit.allowed) {
    return res.status(429).json({ message: 'Too many progress requests', retryAfter: limit.retryAfter });
  }

  try {
    await ensureDb();

    const { action, telegramUser, progress, power, initData } = req.body as {
      action: 'load' | 'save' | 'state' | 'power.use';
      power?: 'hint' | 'freeze' | 'boost';
      telegramUser: { id: number; username?: string; first_name: string; last_name?: string };
      progress?: {
        era: number;
        level: number;
        completed: boolean;
        bestScore: number;
        bestTime: number;
        bestMedal: string;
        stars: number;
        completedAt?: number;
      };
      initData?: string;
    };

    if (!telegramUser?.id || !action) return res.status(400).json({ message: 'Missing required fields' });

    const verifiedUser = await requireTelegramUser({ telegramUser, initData });

    const tid = BigInt(verifiedUser.id);
    await sql`
      INSERT INTO users (telegram_id, username, first_name, last_name)
      VALUES (${tid}, ${telegramUser.username ?? null}, ${telegramUser.first_name ?? null}, ${telegramUser.last_name ?? null})
      ON CONFLICT (telegram_id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, users.username),
        first_name = COALESCE(EXCLUDED.first_name, users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, users.last_name),
        last_active = NOW()
    `;

    if (action === 'load') {
      const rows = await sql`
        SELECT era, level, completed, best_score, best_time, best_medal, stars, completed_at
        FROM player_progress
        WHERE telegram_id = ${tid}
        ORDER BY era ASC, level ASC
      `;
      return res.status(200).json({
        progress: rows.map((row: any) => ({
          era: row.era,
          level: row.level,
          completed: row.completed,
          bestScore: row.best_score,
          bestTime: row.best_time,
          bestMedal: row.best_medal,
          stars: row.stars,
          completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
        })),
      });
    }

    if (action === 'state') {
      return res.status(200).json(await loadPlayerState(tid));
    }

    if (action === 'power.use') {
      const column = POWER_COLUMNS[power ?? ('' as never)];
      if (!column) return res.status(400).json({ message: 'Unknown power-up' });

      // Decrement only while there is a charge to spend, so a replayed or
      // concurrent request can never take a balance below zero.
      const rows = (await sql(
        `UPDATE users SET ${column} = ${column} - 1
         WHERE telegram_id = $1 AND ${column} > 0
         RETURNING ${column} AS remaining`,
        [tid],
      )) as Array<{ remaining: number }>;
      if (!rows.length) return res.status(409).json({ message: 'No charges left', remaining: 0 });
      return res.status(200).json({ success: true, remaining: Number(rows[0].remaining) });
    }

    if (action !== 'save') return res.status(400).json({ message: 'Unknown action' });

    // Progress is written by scores.ts from verified runs, and run-session
    // gates levels on it, so a client-supplied row is never stored. Older
    // clients still call this after every clear; answer them without error.
    void progress;
    return res.status(200).json({ success: true, ignored: true });
  } catch (error: any) {
    if (error instanceof AuthError) return res.status(401).json({ message: error.message });
    await logApiError('progress', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

/** Columns are interpolated into SQL, so only these exact names are allowed. */
const POWER_COLUMNS: Record<string, string> = {
  hint: 'power_hint',
  freeze: 'power_freeze',
  boost: 'power_boost',
};

/**
 * Everything the server keeps about a player's progression, in one read, so a
 * fresh device starts from the same place as the last one.
 */
async function loadPlayerState(tid: bigint) {
  const [userRows, achievementRows, relicRows] = await Promise.all([
    sql`
      SELECT streak_current, streak_longest, streak_last_date,
             power_hint, power_freeze, power_boost
      FROM users WHERE telegram_id = ${tid}
    `,
    sql`
      SELECT achievement_id, unlocked_at FROM player_achievements
      WHERE telegram_id = ${tid} ORDER BY unlocked_at ASC
    `,
    sql`
      SELECT relic_id FROM player_relics
      WHERE telegram_id = ${tid} ORDER BY earned_at ASC
    `,
  ]);

  const u = (userRows as any[])[0] ?? {};
  return {
    streak: {
      current: Number(u.streak_current ?? 0),
      longest: Number(u.streak_longest ?? 0),
      lastDate: u.streak_last_date ? new Date(u.streak_last_date).toISOString().slice(0, 10) : null,
    },
    powers: {
      hint: Number(u.power_hint ?? 0),
      freeze: Number(u.power_freeze ?? 0),
      boost: Number(u.power_boost ?? 0),
    },
    achievements: (achievementRows as any[]).map((row) => ({
      id: String(row.achievement_id),
      unlockedAt: new Date(row.unlocked_at).getTime(),
    })),
    relics: (relicRows as any[]).map((row) => String(row.relic_id)),
  };
}
