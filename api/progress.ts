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

  const limit = rateLimit(`progress:${getClientKey(req)}`, 120, 60_000);
  if (!limit.allowed) {
    return res.status(429).json({ message: 'Too many progress requests', retryAfter: limit.retryAfter });
  }

  try {
    await ensureDb();

    const { action, telegramUser, progress, initData } = req.body as {
      action: 'load' | 'save';
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

    await requireTelegramUser({ telegramUser, initData });

    const tid = BigInt(telegramUser.id);
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

    if (!progress) return res.status(400).json({ message: 'Missing progress payload' });

    await sql`
      INSERT INTO player_progress (telegram_id, era, level, completed, best_score, best_time, best_medal, stars, completed_at, updated_at)
      VALUES (
        ${tid},
        ${progress.era},
        ${progress.level},
        ${progress.completed},
        ${progress.bestScore},
        ${progress.bestTime},
        ${progress.bestMedal},
        ${progress.stars},
        ${progress.completedAt ? new Date(progress.completedAt) : null},
        NOW()
      )
      ON CONFLICT (telegram_id, era, level) DO UPDATE SET
        completed = player_progress.completed OR EXCLUDED.completed,
        best_score = GREATEST(player_progress.best_score, EXCLUDED.best_score),
        best_time = CASE
          WHEN player_progress.best_time = 0 THEN EXCLUDED.best_time
          ELSE LEAST(player_progress.best_time, EXCLUDED.best_time)
        END,
        best_medal = CASE
          WHEN player_progress.best_medal = 'gold' THEN player_progress.best_medal
          WHEN player_progress.best_medal = 'silver' AND EXCLUDED.best_medal IN ('gold') THEN EXCLUDED.best_medal
          WHEN player_progress.best_medal = 'bronze' AND EXCLUDED.best_medal IN ('gold', 'silver') THEN EXCLUDED.best_medal
          WHEN player_progress.best_medal = 'none' THEN EXCLUDED.best_medal
          ELSE player_progress.best_medal
        END,
        stars = GREATEST(player_progress.stars, EXCLUDED.stars),
        completed_at = COALESCE(player_progress.completed_at, EXCLUDED.completed_at),
        updated_at = NOW()
    `;

    return res.status(200).json({ success: true });
  } catch (error: any) {
    if (error instanceof AuthError) return res.status(401).json({ message: error.message });
    await logApiError('progress', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
