import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDb, sql } from './_db';
import { requireTelegramUser, AuthError } from './_auth';
import { getClientKey, rateLimit } from './_rateLimit';
import { logApiError } from './_telemetry';

function randomSeed() {
  return Math.floor(Math.random() * 2_000_000_000);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const limit = rateLimit(`run-session:${getClientKey(req)}`, 30, 60_000);
  if (!limit.allowed) {
    return res.status(429).json({ message: 'Too many run starts', retryAfter: limit.retryAfter });
  }

  try {
    await ensureDb();

    const { telegramUser, difficulty, level, challengeMode, requestedSeed, initData } = req.body as {
      telegramUser: { id: number; username?: string; first_name: string; last_name?: string };
      difficulty: number;
      level: number;
      challengeMode: 'standard' | 'daily' | 'weekly';
      requestedSeed?: number;
      initData?: string;
    };

    if (!telegramUser?.id || !difficulty || !level || !challengeMode) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

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

    const seed = challengeMode === 'standard' ? randomSeed() : Number(requestedSeed || 0);
    const inserted = await sql`
      INSERT INTO run_sessions (telegram_id, difficulty, level, challenge_mode, seed)
      VALUES (${tid}, ${difficulty}, ${level}, ${challengeMode}, ${seed})
      RETURNING id
    `;

    return res.status(200).json({ success: true, runId: inserted[0].id, seed });
  } catch (error: any) {
    if (error instanceof AuthError) return res.status(401).json({ message: error.message });
    await logApiError('run-session', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
