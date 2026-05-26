import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await ensureDb();

    const [totals] = await sql`
      SELECT
        COUNT(*)::int                                        AS total_players,
        COALESCE(SUM(total_games), 0)::int                  AS total_games,
        COALESCE(SUM(total_wins), 0)::int                   AS total_wins,
        COALESCE(MAX(best_score), 0)::int                   AS all_time_high_score,
        COUNT(*) FILTER (
          WHERE last_active > NOW() - INTERVAL '7 days'
        )::int                                               AS active_players_7d,
        COUNT(*) FILTER (
          WHERE created_at > NOW() - INTERVAL '30 days'
        )::int                                               AS new_players_30d
      FROM users
    `;

    const [sessions] = await sql`
      SELECT
        COUNT(*)::int                                        AS total_sessions,
        COUNT(*) FILTER (
          WHERE played_at > NOW() - INTERVAL '24 hours'
        )::int                                               AS sessions_24h,
        COUNT(*) FILTER (
          WHERE played_at > NOW() - INTERVAL '7 days'
        )::int                                               AS sessions_7d,
        ROUND(AVG(score))::int                               AS avg_score,
        ROUND(AVG(time_seconds))::int                        AS avg_time_seconds
      FROM game_sessions
    `;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({
      players: {
        total: totals.total_players,
        active_7d: totals.active_players_7d,
        new_30d: totals.new_players_30d,
      },
      games: {
        total_sessions: sessions.total_sessions,
        total_wins: totals.total_wins,
        sessions_24h: sessions.sessions_24h,
        sessions_7d: sessions.sessions_7d,
        all_time_high_score: totals.all_time_high_score,
        avg_score: sessions.avg_score,
        avg_time_seconds: sessions.avg_time_seconds,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
