import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  // Cache for 30 seconds on CDN
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  try {
    await ensureDb();

    const limit = Math.min(Number(req.query.limit) || 100, 200);

    const rows = await sql`
      SELECT
        ROW_NUMBER() OVER (ORDER BY best_score DESC, last_active ASC) AS rank,
        telegram_id,
        username,
        first_name,
        last_name,
        best_score,
        total_games,
        total_wins,
        last_active
      FROM users
      WHERE best_score > 0
      ORDER BY best_score DESC, last_active ASC
      LIMIT ${limit}
    `;

    const entries = rows.map((r: any) => ({
      rank: Number(r.rank),
      telegram_id: Number(r.telegram_id),
      username: r.username ?? null,
      first_name: r.first_name ?? null,
      display_name:
        r.username ? `@${r.username}` :
        r.first_name ? r.first_name :
        `Player ${String(r.telegram_id).slice(-4)}`,
      best_score: r.best_score,
      total_games: r.total_games,
      total_wins: r.total_wins,
      last_active: r.last_active,
    }));

    const totalResult = await sql`SELECT COUNT(*)::int AS total FROM users WHERE best_score > 0`;

    return res.status(200).json({
      entries,
      total: totalResult[0]?.total ?? 0,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[leaderboard] Error:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
