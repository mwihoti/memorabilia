import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from './_db';
import { requireTelegramUser, AuthError } from './_auth';
import { getClientKey, rateLimit } from './_rateLimit';
import { logApiError } from './_telemetry';
import { getWeekKey } from '../shared/activities';

const MAX_MEMBERS = 12;
const NAME_PATTERN = /^[\p{L}\p{N} '’-]{3,32}$/u;

/**
 * Curator guilds — small teams with a pooled weekly score.
 *
 *   GET  /api/guild                      → the guild ladder for this week
 *   GET  /api/guild?id=ABC123            → one guild and its roster
 *   POST /api/guild { action: create | join | leave | rename }
 *
 * One guild per player, enforced by the primary key on `guild_members`.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureDb();
    if (req.method === 'GET') return await read(req, res);
    if (req.method === 'POST') return await write(req, res);
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    if (err instanceof AuthError) return res.status(401).json({ message: err.message });
    await logApiError('guild', err);
    return res.status(500).json({ message: err?.message ?? 'Guild request failed' });
  }
}

/* ── Read ────────────────────────────────────────────────────────────────── */

async function read(req: VercelRequest, res: VercelResponse) {
  const weekKey = getWeekKey();
  const id = req.query.id ? String(req.query.id).toUpperCase() : null;

  if (id) {
    const [guilds, members] = await Promise.all([
      sql`SELECT id, name, emblem, owner_telegram_id, created_at FROM guilds WHERE id = ${id}`,
      sql`
        SELECT m.telegram_id, m.role, u.username, u.first_name,
               COALESCE(w.best_score, 0) AS week_score
        FROM guild_members m
        JOIN users u ON u.telegram_id = m.telegram_id
        LEFT JOIN weekly_scores w ON w.telegram_id = m.telegram_id AND w.week_key = ${weekKey}
        WHERE m.guild_id = ${id}
        ORDER BY week_score DESC
      `,
    ]);

    const guild = (guilds as any[])[0];
    if (!guild) return res.status(404).json({ message: 'Guild not found' });

    return res.status(200).json({
      id: guild.id,
      name: guild.name,
      emblem: guild.emblem,
      ownerTelegramId: Number(guild.owner_telegram_id),
      weekKey,
      members: (members as any[]).map((m) => ({
        telegramId: Number(m.telegram_id),
        name: m.username ? `@${m.username}` : (m.first_name ?? 'Curator'),
        role: m.role,
        weekScore: m.week_score,
      })),
      weekTotal: (members as any[]).reduce((sum, m) => sum + Number(m.week_score), 0),
    });
  }

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  // Pooled weekly score per guild. The sum is over members' best scores, so a
  // big guild has an edge — capped membership is what keeps that fair.
  const board = await sql`
    SELECT g.id, g.name, g.emblem,
           COUNT(m.telegram_id)::int AS members,
           COALESCE(SUM(w.best_score), 0)::int AS week_total
    FROM guilds g
    JOIN guild_members m ON m.guild_id = g.id
    LEFT JOIN weekly_scores w ON w.telegram_id = m.telegram_id AND w.week_key = ${weekKey}
    GROUP BY g.id, g.name, g.emblem
    ORDER BY week_total DESC
    LIMIT 25
  `;

  return res.status(200).json({
    weekKey,
    maxMembers: MAX_MEMBERS,
    guilds: (board as any[]).map((g, i) => ({
      rank: i + 1,
      id: g.id,
      name: g.name,
      emblem: g.emblem,
      members: g.members,
      weekTotal: g.week_total,
    })),
  });
}

/* ── Write ───────────────────────────────────────────────────────────────── */

async function write(req: VercelRequest, res: VercelResponse) {
  const limit = await rateLimit(`guild:${getClientKey(req)}`, 20, 60_000);
  if (!limit.allowed) {
    return res.status(429).json({ message: 'Too many requests', retryAfter: limit.retryAfter });
  }

  const user = await requireTelegramUser(req.body);
  const tid = BigInt(user.id);
  const { action } = req.body as { action: string };

  if (action === 'create') {
    const { name, emblem } = req.body as { name: string; emblem?: string };
    if (!NAME_PATTERN.test(name ?? '')) {
      return res.status(400).json({ message: 'Guild names are 3–32 letters, numbers or spaces' });
    }

    const existing = (await sql`
      SELECT guild_id FROM guild_members WHERE telegram_id = ${tid}
    `) as any[];
    if (existing.length) {
      return res.status(409).json({ message: 'Leave your current guild first' });
    }

    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    try {
      await sql`
        INSERT INTO guilds (id, name, emblem, owner_telegram_id)
        VALUES (${id}, ${name.trim()}, ${emblem || '🏛️'}, ${tid})
      `;
    } catch {
      // The unique index on name is the only constraint that can realistically
      // trip here; anything else surfaces as a 500 from the outer handler.
      return res.status(409).json({ message: 'That guild name is taken' });
    }

    await sql`
      INSERT INTO guild_members (telegram_id, guild_id, role) VALUES (${tid}, ${id}, 'owner')
    `;
    return res.status(201).json({ id, name: name.trim(), emblem: emblem || '🏛️' });
  }

  if (action === 'join') {
    const guildId = String((req.body as any).guildId ?? '').toUpperCase();
    if (!guildId) return res.status(400).json({ message: 'Missing guildId' });

    const guilds = (await sql`SELECT id FROM guilds WHERE id = ${guildId}`) as any[];
    if (!guilds.length) return res.status(404).json({ message: 'Guild not found' });

    const count = (await sql`
      SELECT COUNT(*)::int AS n FROM guild_members WHERE guild_id = ${guildId}
    `) as any[];
    if (Number(count[0].n) >= MAX_MEMBERS) {
      return res.status(409).json({ message: `Guilds are capped at ${MAX_MEMBERS} curators` });
    }

    await sql`
      INSERT INTO guild_members (telegram_id, guild_id, role)
      VALUES (${tid}, ${guildId}, 'member')
      ON CONFLICT (telegram_id) DO UPDATE SET guild_id = EXCLUDED.guild_id, role = 'member'
    `;
    return res.status(200).json({ id: guildId });
  }

  if (action === 'leave') {
    const rows = (await sql`
      SELECT guild_id, role FROM guild_members WHERE telegram_id = ${tid}
    `) as any[];
    if (!rows.length) return res.status(404).json({ message: 'You are not in a guild' });

    const { guild_id: guildId, role } = rows[0];
    await sql`DELETE FROM guild_members WHERE telegram_id = ${tid}`;

    if (role === 'owner') {
      // Hand the guild to the longest-serving member, or dissolve it if empty.
      const heirs = (await sql`
        SELECT telegram_id FROM guild_members
        WHERE guild_id = ${guildId} ORDER BY joined_at ASC LIMIT 1
      `) as any[];

      if (heirs.length) {
        await sql`
          UPDATE guild_members SET role = 'owner' WHERE telegram_id = ${heirs[0].telegram_id}
        `;
        await sql`
          UPDATE guilds SET owner_telegram_id = ${heirs[0].telegram_id} WHERE id = ${guildId}
        `;
      } else {
        await sql`DELETE FROM guilds WHERE id = ${guildId}`;
      }
    }

    return res.status(200).json({ left: true });
  }

  if (action === 'rename') {
    const { name } = req.body as { name: string };
    if (!NAME_PATTERN.test(name ?? '')) {
      return res.status(400).json({ message: 'Guild names are 3–32 letters, numbers or spaces' });
    }

    const rows = (await sql`
      SELECT guild_id, role FROM guild_members WHERE telegram_id = ${tid}
    `) as any[];
    if (!rows.length || rows[0].role !== 'owner') {
      return res.status(403).json({ message: 'Only the guild owner can rename it' });
    }

    await sql`UPDATE guilds SET name = ${name.trim()} WHERE id = ${rows[0].guild_id}`;
    return res.status(200).json({ id: rows[0].guild_id, name: name.trim() });
  }

  return res.status(400).json({ message: `Unknown action: ${action}` });
}
