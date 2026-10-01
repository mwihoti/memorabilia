import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from './_db';
import { requireTelegramUser, AuthError } from './_auth';
import { getClientKey, rateLimit } from './_rateLimit';
import { logApiError } from './_telemetry';
import {
  getWeekKey,
  msUntilWeekReset,
  getSeason,
  planBossForWeek,
  duelExpiry,
  resolveDuel,
  ALL_RELICS,
  DUEL_WINDOW_HOURS,
  BOSS_WINDOW_HOURS,
} from '../shared/activities';

/**
 * The activity layer: everything with a clock on it.
 *
 * One route rather than six because Vercel counts serverless functions, and
 * because the lobby wants all of this in a single round trip anyway.
 *
 *   GET  /api/activities?telegramId=123   → the whole activity board
 *   POST /api/activities { action: ... }  → duel create/accept, boss claim
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureDb();

    if (req.method === 'GET') return await readBoard(req, res);
    if (req.method === 'POST') return await handleAction(req, res);
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    if (err instanceof AuthError) return res.status(401).json({ message: err.message });
    await logApiError('activities', err);
    return res.status(500).json({ message: err?.message ?? 'Activity request failed' });
  }
}

/* ── Read ────────────────────────────────────────────────────────────────── */

async function readBoard(req: VercelRequest, res: VercelResponse) {
  const telegramId = req.query.telegramId ? BigInt(String(req.query.telegramId)) : null;
  const weekKey = getWeekKey();
  const season = getSeason();

  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=45');

  const [ladder, champions, boss, seasonBoard, duels, relics, guild] = await Promise.all([
    sql`
      SELECT w.telegram_id, w.best_score, w.games, u.username, u.first_name
      FROM weekly_scores w
      JOIN users u ON u.telegram_id = w.telegram_id
      WHERE w.week_key = ${weekKey}
      ORDER BY w.best_score DESC
      LIMIT 25
    `,
    sql`
      SELECT c.week_key, c.score, u.username, u.first_name
      FROM weekly_champions c
      JOIN users u ON u.telegram_id = c.telegram_id
      ORDER BY c.week_key DESC
      LIMIT 8
    `,
    sql`
      SELECT id, era, level, seed, relic_id, title, opens_at, closes_at
      FROM boss_events
      WHERE opens_at <= NOW() AND closes_at > NOW()
      ORDER BY opens_at DESC
      LIMIT 1
    `,
    sql`
      SELECT s.telegram_id, s.points, u.username, u.first_name
      FROM season_scores s
      JOIN users u ON u.telegram_id = s.telegram_id
      WHERE s.season_key = ${season.key}
      ORDER BY s.points DESC
      LIMIT 25
    `,
    telegramId === null
      ? Promise.resolve([])
      : sql`
          SELECT r.id, r.difficulty, r.level, r.seed, r.status, r.expires_at, r.host_telegram_id,
                 p.telegram_id, p.display_name, p.best_score, p.best_time_seconds, p.status AS seat_status
          FROM challenge_rooms r
          JOIN challenge_room_participants p ON p.room_id = r.id
          WHERE r.mode = 'duel'
            AND r.id IN (
              SELECT room_id FROM challenge_room_participants WHERE telegram_id = ${telegramId}
            )
            AND r.expires_at > NOW() - INTERVAL '7 days'
          ORDER BY r.created_at DESC
          LIMIT 40
        `,
    telegramId === null
      ? Promise.resolve([])
      : sql`SELECT relic_id, earned_at FROM player_relics WHERE telegram_id = ${telegramId}`,
    telegramId === null
      ? Promise.resolve([])
      : sql`
          SELECT g.id, g.name, g.emblem, m.role
          FROM guild_members m
          JOIN guilds g ON g.id = m.guild_id
          WHERE m.telegram_id = ${telegramId}
        `,
  ]);

  const bossRow: any = (boss as any[])[0] ?? null;
  const bossClears = bossRow
    ? await sql`
        SELECT COUNT(*)::int AS clears FROM boss_clears WHERE event_id = ${bossRow.id}
      `
    : [{ clears: 0 }];

  const earned = new Set((relics as any[]).map((r) => r.relic_id));

  return res.status(200).json({
    weekKey,
    resetInMs: msUntilWeekReset(),
    ladder: (ladder as any[]).map((r, i) => ({
      rank: i + 1,
      telegram_id: Number(r.telegram_id),
      name: r.username ? `@${r.username}` : (r.first_name ?? 'Curator'),
      best_score: r.best_score,
      games: r.games,
    })),
    champions: (champions as any[]).map((c) => ({
      week_key: c.week_key,
      score: c.score,
      name: c.username ? `@${c.username}` : (c.first_name ?? 'Curator'),
    })),
    boss: bossRow
      ? {
          id: bossRow.id,
          era: bossRow.era,
          level: bossRow.level,
          seed: bossRow.seed,
          relicId: bossRow.relic_id,
          title: bossRow.title,
          closesAt: bossRow.closes_at,
          clears: (bossClears as any[])[0]?.clears ?? 0,
          windowHours: BOSS_WINDOW_HOURS,
        }
      : null,
    season: {
      key: season.key,
      name: season.name,
      week: season.week,
      endsAt: season.endsAt,
      board: (seasonBoard as any[]).map((r, i) => ({
        rank: i + 1,
        telegram_id: Number(r.telegram_id),
        name: r.username ? `@${r.username}` : (r.first_name ?? 'Curator'),
        points: r.points,
      })),
    },
    duels: groupDuels(duels as any[], telegramId),
    collection: {
      total: ALL_RELICS.length,
      earned: earned.size,
      relics: ALL_RELICS.map((r) => ({ ...r, earned: earned.has(r.id) })),
    },
    guild: (guild as any[])[0]
      ? {
          id: (guild as any[])[0].id,
          name: (guild as any[])[0].name,
          emblem: (guild as any[])[0].emblem,
          role: (guild as any[])[0].role,
        }
      : null,
  });
}

/** Fold the participant rows into one object per duel, from this player's side. */
function groupDuels(rows: any[], me: bigint | null) {
  const byRoom = new Map<string, any>();

  for (const row of rows) {
    if (!byRoom.has(row.id)) {
      byRoom.set(row.id, {
        id: row.id,
        era: row.difficulty,
        level: row.level,
        seed: row.seed,
        status: row.status,
        expiresAt: row.expires_at,
        hostTelegramId: Number(row.host_telegram_id),
        seats: [] as any[],
      });
    }
    byRoom.get(row.id).seats.push({
      telegramId: Number(row.telegram_id),
      name: row.display_name,
      score: row.best_score,
      timeSeconds: row.best_time_seconds,
      status: row.seat_status,
    });
  }

  return [...byRoom.values()].map((duel) => {
    const mine = duel.seats.find((s: any) => me !== null && BigInt(s.telegramId) === me) ?? null;
    const theirs = duel.seats.find((s: any) => s !== mine) ?? null;

    const verdict =
      mine && theirs
        ? resolveDuel(
            { telegramId: mine.telegramId, score: mine.score, timeSeconds: mine.timeSeconds },
            { telegramId: theirs.telegramId, score: theirs.score, timeSeconds: theirs.timeSeconds },
            new Date(duel.expiresAt),
          )
        : { outcome: 'pending' as const, winnerTelegramId: null };

    return {
      ...duel,
      me: mine,
      opponent: theirs,
      outcome: verdict.outcome,
      iWon: verdict.winnerTelegramId !== null && mine?.telegramId === verdict.winnerTelegramId,
    };
  });
}

/* ── Write ───────────────────────────────────────────────────────────────── */

async function handleAction(req: VercelRequest, res: VercelResponse) {
  const limit = rateLimit(`activities:${getClientKey(req)}`, 30, 60_000);
  if (!limit.allowed) {
    return res.status(429).json({ message: 'Too many requests', retryAfter: limit.retryAfter });
  }

  const user = await requireTelegramUser(req.body);
  const tid = BigInt(user.id);
  const { action } = req.body as { action: string };

  switch (action) {
    case 'duel.create':
      return await createDuel(req, res, user, tid);
    case 'duel.accept':
      return await acceptDuel(req, res, user, tid);
    default:
      return res.status(400).json({ message: `Unknown action: ${action}` });
  }
}

async function createDuel(req: VercelRequest, res: VercelResponse, user: any, tid: bigint) {
  const { difficulty, level, seed, displayName } = req.body as {
    difficulty: number;
    level: number;
    seed: number;
    displayName: string;
  };

  if (!difficulty || !level) return res.status(400).json({ message: 'Missing difficulty or level' });

  const id = Math.random().toString(36).slice(2, 8).toUpperCase();
  const expires = duelExpiry();

  await sql`
    INSERT INTO challenge_rooms (id, host_telegram_id, difficulty, level, seed, status, mode, expires_at, started_at)
    VALUES (${id}, ${tid}, ${difficulty}, ${level}, ${seed ?? Math.floor(Math.random() * 2_000_000_000)},
            'live', 'duel', ${expires.toISOString()}, NOW())
  `;
  await sql`
    INSERT INTO challenge_room_participants (room_id, telegram_id, display_name, status)
    VALUES (${id}, ${tid}, ${displayName || user.first_name || 'Curator'}, 'playing')
  `;

  return res.status(201).json({ id, expiresAt: expires.toISOString(), windowHours: DUEL_WINDOW_HOURS });
}

async function acceptDuel(req: VercelRequest, res: VercelResponse, user: any, tid: bigint) {
  const { duelId, displayName } = req.body as { duelId: string; displayName: string };
  if (!duelId) return res.status(400).json({ message: 'Missing duelId' });

  const rooms = (await sql`
    SELECT id, expires_at, mode FROM challenge_rooms WHERE id = ${duelId.toUpperCase()}
  `) as any[];
  const room = rooms[0];

  if (!room) return res.status(404).json({ message: 'Duel not found' });
  if (room.mode !== 'duel') return res.status(400).json({ message: 'Not a duel' });
  if (new Date(room.expires_at) <= new Date()) {
    return res.status(410).json({ message: 'This duel has expired' });
  }

  const seats = (await sql`
    SELECT telegram_id FROM challenge_room_participants WHERE room_id = ${room.id}
  `) as any[];

  const alreadyIn = seats.some((s) => BigInt(s.telegram_id) === tid);
  if (!alreadyIn && seats.length >= 2) {
    return res.status(409).json({ message: 'This duel already has two players' });
  }

  if (!alreadyIn) {
    await sql`
      INSERT INTO challenge_room_participants (room_id, telegram_id, display_name, status)
      VALUES (${room.id}, ${tid}, ${displayName || user.first_name || 'Curator'}, 'playing')
      ON CONFLICT (room_id, telegram_id) DO NOTHING
    `;
  }

  return res.status(200).json({ id: room.id, expiresAt: room.expires_at });
}
