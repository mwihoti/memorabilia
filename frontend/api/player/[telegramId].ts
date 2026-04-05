import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from '../_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const rawId = req.query.telegramId as string;
  const telegramId = BigInt(rawId || '0');

  if (!telegramId) return res.status(400).json({ message: 'Invalid telegram_id' });

  try {
    await ensureDb();

    const userRows = await sql`
      SELECT
        telegram_id,
        username,
        first_name,
        last_name,
        total_games,
        total_wins,
        best_score,
        average_score,
        last_active,
        created_at
      FROM users
      WHERE telegram_id = ${telegramId}
    `;

    if (!userRows.length) return res.status(404).json({ message: 'Player not found' });

    const u = userRows[0];

    // Rank: how many players have a higher best_score
    const rankResult = await sql`
      SELECT COUNT(*)::int AS above
      FROM users
      WHERE best_score > ${u.best_score}
    `;
    const rank = (rankResult[0]?.above ?? 0) + 1;

    // Recent 10 games
    const sessions = await sql`
      SELECT id, score, difficulty, moves, time_seconds, stars, played_at
      FROM game_sessions
      WHERE telegram_id = ${telegramId}
      ORDER BY played_at DESC
      LIMIT 10
    `;

    return res.status(200).json({
      telegram_id: Number(u.telegram_id),
      username: u.username ?? null,
      first_name: u.first_name ?? null,
      display_name:
        u.username ? `@${u.username}` :
        u.first_name ? u.first_name :
        `Player ${rawId.slice(-4)}`,
      total_games: u.total_games,
      total_wins: u.total_wins,
      best_score: u.best_score,
      average_score: u.average_score,
      last_active: u.last_active,
      created_at: u.created_at,
      rank,
      recentGames: sessions.map((s: any) => ({
        id: s.id,
        score: s.score,
        difficulty: s.difficulty,
        moves: s.moves,
        time_seconds: s.time_seconds,
        stars: s.stars,
        played_at: s.played_at,
      })),
    });
  } catch (err: any) {
    console.error('[player] Error:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
