import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from './_db';
import { requireTelegramUser, AuthError } from './_auth';
import { getClientKey, rateLimit } from './_rateLimit';
import { logApiError } from './_telemetry';
import { checkRunTiming, getLevelRule, getTimeMedal, verifyReplaySubmission } from '../shared/gameRules';
import { applyRunRewards } from './_rewards';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const limit = await rateLimit(`scores:${getClientKey(req)}`, 40, 60_000);
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

    const verifiedUser = await requireTelegramUser({ telegramUser, initData });

    const tid = BigInt(verifiedUser.id);
    const runRows = runId
      ? await sql`
          SELECT id, seed, difficulty, level, challenge_mode, completed_at,
                 (EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000)::bigint AS elapsed_ms
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

    // The run row, not the request body, says which board was played.
    const era = Number(run.difficulty) as 1 | 2 | 3 | 4 | 5;
    const runLevel = Number(run.level);

    const verification = verifyReplaySubmission({
      difficulty: era,
      level: runLevel,
      seed: Number(run.seed),
      replayMoves,
    });

    const timing = verification.verified
      ? checkRunTiming({
          serverElapsedMs: Number(run.elapsed_ms),
          replayDurationMs: Number(replayMoves[replayMoves.length - 1]?.timestamp ?? 0),
        })
      : null;

    if (!verification.verified || (timing && !timing.ok)) {
      const reason = !verification.verified
        ? verification.reason || 'Replay verification failed'
        : (timing as { ok: false; reason: string }).reason;
      await sql`
        UPDATE run_sessions
        SET verification_status = 'rejected', completed_at = NOW()
        WHERE id = ${run.id} AND completed_at IS NULL
      `;
      return res.status(400).json({ message: reason });
    }

    // Claim the run before writing anything. The completed_at check above is
    // only a fast path; two submits racing for the same run both pass it, and
    // only one of them may win this update and go on to mint rewards.
    const claimed = await sql`
      UPDATE run_sessions
      SET verification_status = 'verifying', completed_at = NOW()
      WHERE id = ${run.id} AND completed_at IS NULL
      RETURNING id
    `;
    if (!claimed.length) {
      return res.status(409).json({ message: 'This run has already been submitted' });
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
      VALUES (${tid}, ${run.id}, ${verifiedScore}, ${era}, ${runLevel}, ${verifiedMoves}, ${verifiedTimeSeconds}, ${verifiedStars}, TRUE)
    `;

    // Computed here from the verified time; the client's medal is never read.
    const medal = getTimeMedal(verifiedTimeSeconds, getLevelRule(era, runLevel));

    // Level progress is written from the verified result. This is what the
    // level gate in run-session reads, so it must not come from the client.
    if (String(run.challenge_mode) === 'standard') {
      await sql`
        INSERT INTO player_progress (telegram_id, era, level, completed, best_score, best_time, best_medal, stars, completed_at, updated_at)
        VALUES (${tid}, ${era}, ${runLevel}, TRUE, ${verifiedScore}, ${verifiedTimeSeconds}, ${medal}, ${verifiedStars}, NOW(), NOW())
        ON CONFLICT (telegram_id, era, level) DO UPDATE SET
          completed = TRUE,
          best_score = GREATEST(player_progress.best_score, EXCLUDED.best_score),
          best_time = CASE
            WHEN player_progress.best_time = 0 THEN EXCLUDED.best_time
            ELSE LEAST(player_progress.best_time, EXCLUDED.best_time)
          END,
          best_medal = CASE
            WHEN array_position(ARRAY['none','bronze','silver','gold'], EXCLUDED.best_medal)
               > COALESCE(array_position(ARRAY['none','bronze','silver','gold'], player_progress.best_medal), 0)
            THEN EXCLUDED.best_medal
            ELSE player_progress.best_medal
          END,
          stars = GREATEST(player_progress.stars, EXCLUDED.stars),
          completed_at = COALESCE(player_progress.completed_at, EXCLUDED.completed_at),
          updated_at = NOW()
      `;
    }

    await sql`
      UPDATE run_sessions
      SET verification_status = 'verified'
      WHERE id = ${run.id}
    `;

    const rewards = await applyRunRewards({
      telegramId: tid,
      era,
      level: runLevel,
      score: verifiedScore,
      stars: verifiedStars,
      timeSeconds: verifiedTimeSeconds,
      mismatches: verification.mismatches,
      maxCombo: verification.maxCombo,
      medal,
      isDailyChallenge: String(run.challenge_mode) === 'daily',
      isBossRun: String(run.challenge_mode) === 'boss',
    });

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
      verifiedStars,
      medal,
      adjusted: verifiedScore !== score || verifiedMoves !== moves || verifiedTimeSeconds !== timeSeconds || verifiedStars !== stars,
      rewards,
    });
  } catch (error: any) {
    if (error instanceof AuthError) return res.status(401).json({ message: error.message });
    await logApiError('scores', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
