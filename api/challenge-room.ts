import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDb, sql } from './_db';
import { requireTelegramUser, AuthError } from './_auth';
import { newBoardSeed, newRoomCode } from './_roomCode';
import { isValidLevel } from '../shared/gameRules';
import { normalizeRoomCode } from '../shared/deepLinks';
import { getClientKey, rateLimit } from './_rateLimit';
import { logApiError } from './_telemetry';

async function verifyUser(body: any) {
  return requireTelegramUser(body);
}

async function upsertUser(user: { id: number; username?: string; first_name?: string; last_name?: string }) {
  const tid = BigInt(user.id);
  await sql`
    INSERT INTO users (telegram_id, username, first_name, last_name)
    VALUES (${tid}, ${user.username ?? null}, ${user.first_name ?? null}, ${user.last_name ?? null})
    ON CONFLICT (telegram_id) DO UPDATE SET
      username = COALESCE(EXCLUDED.username, users.username),
      first_name = COALESCE(EXCLUDED.first_name, users.first_name),
      last_name = COALESCE(EXCLUDED.last_name, users.last_name),
      last_active = NOW()
  `;
  return tid;
}

async function fetchRoomPayload(roomId: string, currentTelegramId?: bigint) {
  await sql`
    UPDATE challenge_rooms
    SET status = 'live'
    WHERE id = ${roomId}
      AND status = 'countdown'
      AND started_at IS NOT NULL
      AND started_at <= NOW()
  `;

  await sql`
    UPDATE challenge_room_participants
    SET status = 'playing'
    WHERE room_id = ${roomId}
      AND status = 'joined'
      AND EXISTS (
        SELECT 1
        FROM challenge_rooms
        WHERE id = ${roomId} AND status = 'live'
      )
  `;

  const rooms = await sql`
    SELECT id, host_telegram_id, difficulty, level, seed, status, created_at, started_at, completed_at
    FROM challenge_rooms
    WHERE id = ${roomId}
    LIMIT 1
  `;
  if (!rooms.length) return null;

  const room = rooms[0];
  const participants = await sql`
    SELECT telegram_id, display_name, status, joined_at, finished_at, best_time_seconds, best_moves, best_score, verified
    FROM challenge_room_participants
    WHERE room_id = ${roomId}
    ORDER BY
      CASE WHEN finished_at IS NULL THEN 1 ELSE 0 END,
      best_time_seconds ASC NULLS LAST,
      best_moves ASC NULLS LAST,
      best_score DESC NULLS LAST,
      joined_at ASC
  `;

  return {
    id: room.id,
    hostTelegramId: Number(room.host_telegram_id),
    difficulty: room.difficulty,
    level: room.level,
    seed: room.seed,
    status: room.status,
    createdAt: room.created_at,
    startedAt: room.started_at,
    completedAt: room.completed_at,
    countdownEndsAt: room.status === 'countdown' ? room.started_at : null,
    isHost: currentTelegramId ? BigInt(room.host_telegram_id) === currentTelegramId : false,
    participants: participants.map((entry: any, index: number) => ({
      rank: entry.finished_at ? index + 1 : null,
      telegramId: Number(entry.telegram_id),
      displayName: entry.display_name,
      status: entry.status,
      joinedAt: entry.joined_at,
      finishedAt: entry.finished_at,
      bestTimeSeconds: entry.best_time_seconds,
      bestMoves: entry.best_moves,
      bestScore: entry.best_score,
      verified: entry.verified,
    })),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const limit = await rateLimit(`challenge-room:${getClientKey(req)}`, 80, 60_000);
  if (!limit.allowed) {
    return res.status(429).json({ message: 'Too many room requests', retryAfter: limit.retryAfter });
  }

  try {
    await ensureDb();

    if (req.method === 'GET') {
      const roomId = String(req.query.roomId || '').toUpperCase();
      if (!roomId) return res.status(400).json({ message: 'Missing roomId' });
      const room = await fetchRoomPayload(roomId);
      if (!room) return res.status(404).json({ message: 'Room not found' });
      return res.status(200).json(room);
    }

    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const action = String(req.body?.action || '');
    const user = await verifyUser(req.body);
    const tid = await upsertUser(user);
    const displayName = String(
      req.body?.displayName || user.first_name || user.username || `Player ${String(user.id).slice(-4)}`,
    ).slice(0, 32);

    if (action === 'create') {
      const { difficulty, level } = req.body as { difficulty: number; level: number };
      if (!isValidLevel(Number(difficulty), Number(level))) {
        return res.status(400).json({ message: 'No such level' });
      }
      // The server deals the board, as it does for a rematch.
      const seed = newBoardSeed();
      const id = newRoomCode();

      await sql`
        INSERT INTO challenge_rooms (id, host_telegram_id, difficulty, level, seed)
        VALUES (${id}, ${tid}, ${difficulty}, ${level}, ${seed})
      `;

      await sql`
        INSERT INTO challenge_room_participants (room_id, telegram_id, display_name, status)
        VALUES (${id}, ${tid}, ${displayName}, 'joined')
      `;

      const room = await fetchRoomPayload(id, tid);
      return res.status(200).json(room);
    }

    const roomIdParam = normalizeRoomCode(req.body?.roomId);
    if (!roomIdParam) return res.status(400).json({ message: 'Missing or invalid roomId' });

    // Duels live in the same table but have their own rules — two seats, an
    // expiry — enforced by /api/activities. Keep the room actions off them.
    const modeRows = (await sql`SELECT mode FROM challenge_rooms WHERE id = ${roomIdParam} LIMIT 1`) as Array<{ mode: string }>;
    const isDuel = modeRows[0]?.mode === 'duel';
    if (isDuel && action !== 'submit') {
      return res.status(409).json({ message: 'That code is a duel — accept it from Activities' });
    }

    if (action === 'join') {
      if (!modeRows.length) return res.status(404).json({ message: 'Room not found' });

      await sql`
        INSERT INTO challenge_room_participants (room_id, telegram_id, display_name, status)
        VALUES (${roomIdParam}, ${tid}, ${displayName}, 'joined')
        ON CONFLICT (room_id, telegram_id) DO UPDATE SET
          display_name = EXCLUDED.display_name
      `;
      const room = await fetchRoomPayload(roomIdParam, tid);
      if (!room) return res.status(404).json({ message: 'Room not found' });
      return res.status(200).json(room);
    }

    if (action === 'start') {
      const roomRows = await sql`
        SELECT host_telegram_id, status
        FROM challenge_rooms
        WHERE id = ${roomIdParam}
        LIMIT 1
      `;
      if (!roomRows.length) return res.status(404).json({ message: 'Room not found' });
      if (BigInt(roomRows[0].host_telegram_id) !== tid) return res.status(403).json({ message: 'Only the host can start the room' });

      await sql`
        UPDATE challenge_rooms
        SET status = 'countdown', started_at = NOW() + INTERVAL '5 seconds', completed_at = NULL
        WHERE id = ${roomIdParam}
      `;
      await sql`
        UPDATE challenge_room_participants
        SET status = 'joined'
        WHERE room_id = ${roomIdParam}
      `;
      const room = await fetchRoomPayload(roomIdParam, tid);
      return res.status(200).json(room);
    }

    if (action === 'rematch') {
      const roomRows = await sql`
        SELECT host_telegram_id, difficulty, level
        FROM challenge_rooms
        WHERE id = ${roomIdParam}
        LIMIT 1
      `;
      if (!roomRows.length) return res.status(404).json({ message: 'Room not found' });
      if (BigInt(roomRows[0].host_telegram_id) !== tid) return res.status(403).json({ message: 'Only the host can start a rematch' });

      const nextSeed = newBoardSeed();
      await sql`
        UPDATE challenge_rooms
        SET
          seed = ${nextSeed},
          status = 'countdown',
          started_at = NOW() + INTERVAL '5 seconds',
          completed_at = NULL
        WHERE id = ${roomIdParam}
      `;
      await sql`
        UPDATE challenge_room_participants
        SET
          status = 'joined',
          finished_at = NULL,
          best_time_seconds = NULL,
          best_moves = NULL,
          best_score = NULL,
          verified = FALSE
        WHERE room_id = ${roomIdParam}
      `;

      const room = await fetchRoomPayload(roomIdParam, tid);
      return res.status(200).json(room);
    }

    if (action === 'submit') {
      // A room result is read from the verified run, never from the request.
      // scores.ts has already replayed and checked it before the client gets
      // here, so all this does is look the numbers up.
      const runId = Number(req.body?.runId);
      if (!Number.isSafeInteger(runId) || runId <= 0) {
        return res.status(400).json({ message: 'Missing verified run' });
      }

      const results = (await sql`
        SELECT g.score, g.moves, g.time_seconds
        FROM run_sessions r
        JOIN game_sessions g ON g.run_id = r.id AND g.verified = TRUE
        JOIN challenge_rooms c ON c.id = r.room_id AND c.seed = r.seed
        WHERE r.id = ${runId}
          AND r.telegram_id = ${tid}
          AND r.room_id = ${roomIdParam}
          AND r.verification_status = 'verified'
        LIMIT 1
      `) as Array<{ score: number; moves: number; time_seconds: number }>;

      if (!results.length) {
        return res.status(400).json({ message: 'No verified run for this room' });
      }
      const result = results[0];

      await sql`
        UPDATE challenge_room_participants
        SET
          status = 'finished',
          finished_at = NOW(),
          best_time_seconds = ${result.time_seconds},
          best_moves = ${result.moves},
          best_score = ${result.score},
          verified = TRUE
        WHERE room_id = ${roomIdParam} AND telegram_id = ${tid}
      `;

      const pending = await sql`
        SELECT COUNT(*)::int AS pending
        FROM challenge_room_participants
        WHERE room_id = ${roomIdParam} AND status <> 'finished'
      `;

      if ((pending[0]?.pending ?? 0) === 0) {
        await sql`
          UPDATE challenge_rooms
          SET status = 'completed', completed_at = NOW()
          WHERE id = ${roomIdParam}
        `;
      }

      const room = await fetchRoomPayload(roomIdParam, tid);
      return res.status(200).json(room);
    }

    return res.status(400).json({ message: 'Invalid action' });
  } catch (error: any) {
    if (error instanceof AuthError) return res.status(401).json({ message: error.message });
    await logApiError('challenge-room', error);
    const message = error.message?.startsWith('Unauthorized') ? error.message : error.message || 'Internal server error';
    const status = error.message?.startsWith('Unauthorized') ? 401 : 500;
    return res.status(status).json({ message });
  }
}
