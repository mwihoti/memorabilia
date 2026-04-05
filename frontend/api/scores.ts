import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from './_db';
import { verifyTelegramAuth } from './_auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    await ensureDb();

    const {
      telegramUser,
      score,
      difficulty,
      moves,
      timeSeconds,
      stars,
      initData,
    } = req.body as {
      telegramUser: { id: number; username?: string; first_name: string; last_name?: string };
      score: number;
      difficulty: number;
      moves: number;
      timeSeconds: number;
      stars: number;
      initData?: string;
    };

    // Validate required fields
    if (!telegramUser?.id || score == null || !difficulty || moves == null || timeSeconds == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify Telegram auth when initData is present
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    let verifiedUser = telegramUser;

    if (initData && botToken) {
      const auth = verifyTelegramAuth(initData, botToken);
      if (!auth.valid) {
        return res.status(401).json({ message: `Unauthorized: ${auth.reason}` });
      }
      // Use server-verified user data
      if (auth.user) {
        verifiedUser = {
          id: auth.user.id,
          username: auth.user.username,
          first_name: auth.user.first_name || telegramUser.first_name,
          last_name: auth.user.last_name,
        };
      }
    }

    const tid = BigInt(verifiedUser.id);

    // 1. Upsert user (create or update last_active / username)
    await sql`
      INSERT INTO users (telegram_id, username, first_name, last_name, total_games, total_wins, best_score, average_score)
      VALUES (
        ${tid},
        ${verifiedUser.username ?? null},
        ${verifiedUser.first_name ?? null},
        ${verifiedUser.last_name ?? null},
        1,
        1,
        ${score},
        ${score}
      )
      ON CONFLICT (telegram_id) DO UPDATE SET
        username     = COALESCE(EXCLUDED.username, users.username),
        first_name   = COALESCE(EXCLUDED.first_name, users.first_name),
        last_name    = COALESCE(EXCLUDED.last_name, users.last_name),
        last_active  = NOW(),
        total_games  = users.total_games + 1,
        total_wins   = users.total_wins + 1,
        best_score   = GREATEST(users.best_score, EXCLUDED.best_score),
        average_score = (
          (users.average_score * users.total_games + EXCLUDED.average_score) / (users.total_games + 1)
        )
    `;

    // 2. Insert game session
    await sql`
      INSERT INTO game_sessions (telegram_id, score, difficulty, moves, time_seconds, stars)
      VALUES (${tid}, ${score}, ${difficulty}, ${moves}, ${timeSeconds}, ${stars ?? 1})
    `;

    // 3. Get current rank
    const rankResult = await sql`
      SELECT COUNT(*)::int AS rank
      FROM users
      WHERE best_score > (SELECT best_score FROM users WHERE telegram_id = ${tid})
    `;
    const rank = (rankResult[0]?.rank ?? 0) + 1;

    const totalResult = await sql`SELECT COUNT(*)::int AS total FROM users`;
    const totalPlayers = totalResult[0]?.total ?? 0;

    const bestRow = await sql`SELECT best_score FROM users WHERE telegram_id = ${tid}`;
    const isNewBest = score >= (bestRow[0]?.best_score ?? 0);

    return res.status(200).json({ success: true, rank, totalPlayers, isNewBest });
  } catch (err: any) {
    console.error('[scores] Error:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
