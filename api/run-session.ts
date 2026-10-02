import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDb, sql } from './_db';
import { requireTelegramUser, AuthError } from './_auth';
import { getClientKey, rateLimit } from './_rateLimit';
import { logApiError } from './_telemetry';
import { newBoardSeed } from './_roomCode';
import { getChallengeCandidates, isLevelOpen, isValidLevel } from '../shared/gameRules';
import { normalizeRoomCode } from '../shared/deepLinks';

type RunMode = 'standard' | 'daily' | 'weekly' | 'room' | 'boss';
const RUN_MODES: RunMode[] = ['standard', 'daily', 'weekly', 'room', 'boss'];


export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const limit = await rateLimit(`run-session:${getClientKey(req)}`, 30, 60_000);
  if (!limit.allowed) {
    return res.status(429).json({ message: 'Too many run starts', retryAfter: limit.retryAfter });
  }

  try {
    await ensureDb();

    const { telegramUser, difficulty, level, challengeMode, requestedSeed, roomId, initData } = req.body as {
      telegramUser: { id: number; username?: string; first_name: string; last_name?: string };
      difficulty: number;
      level: number;
      challengeMode: RunMode;
      requestedSeed?: number;
      roomId?: string;
      initData?: string;
    };

    if (!telegramUser?.id || !difficulty || !level || !challengeMode) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!RUN_MODES.includes(challengeMode)) {
      return res.status(400).json({ message: 'Unknown challenge mode' });
    }
    if (!isValidLevel(Number(difficulty), Number(level))) {
      return res.status(400).json({ message: 'No such level' });
    }

    const verifiedUser = await requireTelegramUser({ telegramUser, initData });

    const tid = BigInt(verifiedUser.id);
    await sql`
      INSERT INTO users (telegram_id, username, first_name, last_name)
      VALUES (${tid}, ${verifiedUser.username ?? null}, ${verifiedUser.first_name ?? null}, ${verifiedUser.last_name ?? null})
      ON CONFLICT (telegram_id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, users.username),
        first_name = COALESCE(EXCLUDED.first_name, users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, users.last_name),
        last_active = NOW()
    `;

    // The server decides which board this run is on. The client only says
    // which board it is asking for, and every way of asking is checked.
    let seed: number;
    let runRoomId: string | null = null;

    if (challengeMode === 'standard') {
      // Either record of a clear counts: progress rows predate verified runs,
      // and a verified run proves a clear even if its progress write failed.
      const cleared = (await sql`
        SELECT era, level FROM player_progress
        WHERE telegram_id = ${tid} AND completed = TRUE
        UNION
        SELECT g.difficulty AS era, g.level FROM game_sessions g
        JOIN run_sessions r ON r.id = g.run_id
        WHERE g.telegram_id = ${tid} AND g.verified = TRUE AND r.challenge_mode = 'standard'
      `) as Array<{ era: number; level: number }>;
      const clearedLevels = cleared.map((row) => ({ era: Number(row.era), level: Number(row.level) }));
      if (!isLevelOpen(Number(difficulty) as 1 | 2 | 3 | 4 | 5, Number(level), clearedLevels)) {
        return res.status(403).json({ message: 'That level is still locked', code: 'locked' });
      }
      seed = newBoardSeed();
    } else if (challengeMode === 'boss') {
      // A boss hunt is open to everyone while its window runs, locked level
      // or not, so it is checked against the live event instead of the gate.
      // Everyone hunts the same board: the event's seed, not a fresh one.
      const bosses = (await sql`
        SELECT seed FROM boss_events
        WHERE era = ${difficulty} AND level = ${level}
          AND opens_at <= NOW() AND closes_at > NOW()
        LIMIT 1
      `) as Array<{ seed: number }>;
      if (!bosses.length) return res.status(400).json({ message: 'That boss is not being hunted right now' });
      seed = Number(bosses[0].seed);
    } else if (challengeMode === 'daily' || challengeMode === 'weekly') {
      const match = getChallengeCandidates(challengeMode).find(
        (c) => c.difficulty === Number(difficulty) && c.level === Number(level) && c.seed === Number(requestedSeed),
      );
      if (!match) {
        return res.status(400).json({ message: `That is not a current ${challengeMode} challenge` });
      }
      seed = match.seed;
    } else {
      const code = normalizeRoomCode(roomId);
      if (!code) return res.status(400).json({ message: 'Missing or invalid room code' });

      const rooms = (await sql`
        SELECT r.difficulty, r.level, r.seed, r.status,
               (r.expires_at IS NOT NULL AND r.expires_at <= NOW()) AS expired
        FROM challenge_rooms r
        JOIN challenge_room_participants p ON p.room_id = r.id AND p.telegram_id = ${tid}
        WHERE r.id = ${code}
        LIMIT 1
      `) as Array<{ difficulty: number; level: number; seed: number; status: string; expired: boolean }>;
      const room = rooms[0];
      if (!room) return res.status(404).json({ message: 'Join the room before playing it' });
      if (room.expired) return res.status(410).json({ message: 'This duel has expired' });
      if (room.status !== 'live' && room.status !== 'countdown') {
        return res.status(409).json({ message: 'This room is not running a duel right now' });
      }
      if (Number(room.difficulty) !== Number(difficulty) || Number(room.level) !== Number(level)) {
        return res.status(400).json({ message: 'That is not the board this room is playing' });
      }
      seed = Number(room.seed);
      runRoomId = code;
    }

    const inserted = await sql`
      INSERT INTO run_sessions (telegram_id, difficulty, level, challenge_mode, seed, room_id)
      VALUES (${tid}, ${difficulty}, ${level}, ${challengeMode}, ${seed}, ${runRoomId})
      RETURNING id
    `;

    return res.status(200).json({ success: true, runId: inserted[0].id, seed });
  } catch (error: any) {
    if (error instanceof AuthError) return res.status(401).json({ message: error.message });
    await logApiError('run-session', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
