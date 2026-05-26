import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDb, sql } from './_db';
import { verifyTelegramAuth } from './_auth';
import { getClientKey, rateLimit } from './_rateLimit';
import { logApiError } from './_telemetry';

function roomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function verifyUser(body: any) {
  const { telegramUser, initData } = body;
  if (!telegramUser?.id) throw new Error('Missing Telegram user');

  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  if (botToken) {
    if (!initData) throw new Error('Missing Telegram verification data');
    const auth = verifyTelegramAuth(initData, botToken);
    if (!auth.valid || !auth.user || auth.user.id !== telegramUser.id) {
      throw new Error(`Unauthorized: ${auth.reason ?? 'verification failed'}`);
    }
    return {
      id: auth.user.id,
      username: auth.user.username,
      first_name: auth.user.first_name || telegramUser.first_name,
      last_name: auth.user.last_name,
    };
  }

  return telegramUser;
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

  const limit = rateLimit(`challenge-room:${getClientKey(req)}`, 80, 60_000);
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
    const displayName = req.body?.displayName || user.first_name || user.username || `Player ${String(user.id).slice(-4)}`;

    if (action === 'create') {
      const { difficulty, level, seed } = req.body as { difficulty: number; level: number; seed: number };
      const id = roomId();

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

    const roomIdParam = String(req.body?.roomId || '').toUpperCase();
    if (!roomIdParam) return res.status(400).json({ message: 'Missing roomId' });

    if (action === 'join') {
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

      const nextSeed = Math.floor(Math.random() * 2_000_000_000);
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
      const { timeSeconds, moves, score, verified } = req.body as {
        timeSeconds: number;
        moves: number;
        score: number;
        verified: boolean;
      };

      await sql`
        UPDATE challenge_room_participants
        SET
          status = 'finished',
          finished_at = NOW(),
          best_time_seconds = ${timeSeconds},
          best_moves = ${moves},
          best_score = ${score},
          verified = ${verified}
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
    await logApiError('challenge-room', error);
    const message = error.message?.startsWith('Unauthorized') ? error.message : error.message || 'Internal server error';
    const status = error.message?.startsWith('Unauthorized') ? 401 : 500;
    return res.status(status).json({ message });
  }
}
