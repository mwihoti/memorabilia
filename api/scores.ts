import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from './_db';
import { verifyTelegramAuth } from './_auth';
import { getClientKey, rateLimit } from './_rateLimit';
import { logApiError } from './_telemetry';
import { verifyReplaySubmission } from '../shared/gameRules';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const limit = rateLimit(`scores:${getClientKey(req)}`, 40, 60_000);
  if (!limit.allowed) {
    return res.status(429).json({ message: 'Too many score submissions', retryAfter: limit.retryAfter });
  }

  try {
    await ensureDb();

    const {
      telegramUser,
      score,
      difficulty,
      level,
      moves,
      timeSeconds,
      stars,
      replayMoves,
      runId,
      initData,
    } = req.body as {
      telegramUser: { id: number; username?: string; first_name: string; last_name?: string };
      score: number;
      difficulty: number;
      level: number;
      moves: number;
      timeSeconds: number;
      stars: number;
      replayMoves: Array<{ cardIndex: number; timestamp: number }>;
      runId?: number;
      initData?: string;
    };

    if (!telegramUser?.id || score == null || !difficulty || !level || !Array.isArray(replayMoves)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    let verifiedUser = telegramUser;

    if (botToken) {
      if (!initData) return res.status(401).json({ message: 'Missing Telegram verification data' });
      const auth = verifyTelegramAuth(initData, botToken);
      if (!auth.valid || !auth.user || auth.user.id !== telegramUser.id) {
        return res.status(401).json({ message: `Unauthorized: ${auth.reason ?? 'verification failed'}` });
      }
      verifiedUser = {
        id: auth.user.id,
        username: auth.user.username,
        first_name: auth.user.first_name || telegramUser.first_name,
        last_name: auth.user.last_name,
      };
    }

    const tid = BigInt(verifiedUser.id);
    const runRows = runId
      ? await sql`
          SELECT id, seed, difficulty, level, completed_at
          FROM run_sessions
          WHERE id = ${runId} AND telegram_id = ${tid}
          LIMIT 1
        `
      : [];

    if (!runRows.length) {
      return res.status(400).json({ message: 'Missing or invalid verified run session' });
    }

    const run = runRows[0];
    if (run.completed_at) {
      return res.status(409).json({ message: 'This run has already been submitted' });
    }

    const verification = verifyReplaySubmission({
      difficulty: Number(run.difficulty) as 1 | 2 | 3 | 4 | 5,
      level: Number(run.level),
      seed: Number(run.seed),
      replayMoves,
    });

    if (!verification.verified) {
      await sql`
        UPDATE run_sessions
        SET verification_status = 'rejected', completed_at = NOW()
        WHERE id = ${run.id}
      `;
      return res.status(400).json({ message: verification.reason || 'Replay verification failed' });
    }

    const verifiedScore = verification.score;
    const verifiedMoves = verification.moves;
    const verifiedTimeSeconds = verification.timeSeconds;
    const verifiedStars = verification.stars;

    await sql`
      INSERT INTO users (telegram_id, username, first_name, last_name, total_games, total_wins, best_score, average_score)
      VALUES (
        ${tid},
        ${verifiedUser.username ?? null},
        ${verifiedUser.first_name ?? null},
        ${verifiedUser.last_name ?? null},
        1,
        1,
        ${verifiedScore},
        ${verifiedScore}
      )
      ON CONFLICT (telegram_id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, users.username),
        first_name = COALESCE(EXCLUDED.first_name, users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, users.last_name),
        last_active = NOW(),
        total_games = users.total_games + 1,
        total_wins = users.total_wins + 1,
        best_score = GREATEST(users.best_score, EXCLUDED.best_score),
        average_score = (
          (users.average_score * users.total_games + EXCLUDED.average_score) / (users.total_games + 1)
        )
    `;

    await sql`
      INSERT INTO game_sessions (telegram_id, run_id, score, difficulty, level, moves, time_seconds, stars, verified)
      VALUES (${tid}, ${run.id}, ${verifiedScore}, ${difficulty}, ${level}, ${verifiedMoves}, ${verifiedTimeSeconds}, ${verifiedStars}, TRUE)
    `;

    await sql`
      UPDATE run_sessions
      SET verification_status = 'verified', completed_at = NOW()
      WHERE id = ${run.id}
    `;

    const rankResult = await sql`
      SELECT COUNT(*)::int AS rank
      FROM users
      WHERE best_score > (SELECT best_score FROM users WHERE telegram_id = ${tid})
    `;
    const rank = (rankResult[0]?.rank ?? 0) + 1;

    const totalResult = await sql`SELECT COUNT(*)::int AS total FROM users`;
    const totalPlayers = totalResult[0]?.total ?? 0;
    const bestRow = await sql`SELECT best_score FROM users WHERE telegram_id = ${tid}`;
    const isNewBest = verifiedScore >= (bestRow[0]?.best_score ?? 0);

    return res.status(200).json({
      success: true,
      rank,
      totalPlayers,
      isNewBest,
      verifiedScore,
      verifiedMoves,
      verifiedTimeSeconds,
      adjusted: verifiedScore !== score || verifiedMoves !== moves || verifiedTimeSeconds !== timeSeconds || verifiedStars !== stars,
    });
  } catch (error: any) {
    await logApiError('scores', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
