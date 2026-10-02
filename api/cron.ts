import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from './_db';
import { logApiError } from './_telemetry';
import {
  getWeekKey,
  getWeekStart,
  getSeason,
  planBossForWeek,
  BOSS_WINDOW_HOURS,
} from '../shared/activities';
import { getDailyChallengeConfigFromDate, getDifficultyMeta } from '../shared/gameRules';

/**
 * Scheduled jobs, dispatched by `?job=`.
 *
 *   daily-push       — tell players the day's board is live (09:00 UTC)
 *   weekly-rollover  — crown last week's champion, open the new ladder (Mon 00:05 UTC)
 *   boss-rotate      — open this week's boss window (Fri 17:00 UTC)
 *   duel-settle      — notify both sides of duels whose window just closed
 *   tick             — runs whichever of the above are due; this is what the
 *                      schedule actually calls, so one daily cron covers all
 *                      four and a missed run self-heals on the next one
 *
 * Guarded by CRON_SECRET: Vercel sends it as a bearer token, and without it
 * this endpoint would let anyone spam every player in the database.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization ?? '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : String(req.query.secret ?? '');

  if (!secret) return res.status(500).json({ message: 'CRON_SECRET is not configured' });
  if (provided !== secret) return res.status(401).json({ message: 'Unauthorized' });

  const job = String(req.query.job ?? '');

  try {
    await ensureDb();

    switch (job) {
      case 'daily-push':
        return res.status(200).json(await dailyPush());
      case 'weekly-rollover':
        return res.status(200).json(await weeklyRollover());
      case 'boss-rotate':
        return res.status(200).json(await bossRotate());
      case 'duel-settle':
        return res.status(200).json(await duelSettle());
      case 'tick':
        return res.status(200).json(await tick());
      default:
        return res.status(400).json({ message: `Unknown job: ${job}` });
    }
  } catch (err: any) {
    await logApiError(`cron:${job}`, err);
    return res.status(500).json({ message: err?.message ?? 'Cron job failed' });
  }
}

/* ── Telegram ────────────────────────────────────────────────────────────── */

const TG = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const GAME_URL = process.env.GAME_URL || 'https://memorabilia-game.vercel.app';

async function send(chatId: number, text: string): Promise<boolean> {
  const res = await fetch(`${TG}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '🏛️ Open the museum', url: GAME_URL }]] },
    }),
  });

  if (res.ok) return true;

  // 403 means the player blocked the bot — stop pushing to them rather than
  // retrying this every single day forever.
  if (res.status === 403) {
    await sql`UPDATE users SET push_enabled = FALSE WHERE chat_id = ${chatId}`;
  }
  return false;
}

/**
 * Telegram rate-limits bulk sends to roughly 30 messages a second. Batching with
 * a pause keeps us under it without needing a queue.
 */
async function sendBatch(rows: Array<{ chat_id: number; text: string }>): Promise<number[]> {
  const delivered: number[] = [];
  for (let i = 0; i < rows.length; i += 25) {
    const slice = rows.slice(i, i + 25);
    const results = await Promise.all(slice.map((r) => send(Number(r.chat_id), r.text)));
    results.forEach((ok, j) => {
      if (ok) delivered.push(Number(slice[j].chat_id));
    });
    if (i + 25 < rows.length) await new Promise((r) => setTimeout(r, 1100));
  }
  return delivered;
}

/**
 * How many players one invocation can reach.
 *
 * Telegram caps bulk sends near 30/second, so we batch 25 with a 1.1s pause —
 * about 1.1s per 25. At a 60s function limit that is ~1300 in theory; 500 keeps
 * a wide margin for the queries either side. Anyone not reached keeps their old
 * `last_push_at` and is picked up by the next run.
 */
const PUSH_BUDGET = 500;

/* ── Jobs ────────────────────────────────────────────────────────────────── */

/** "Today's board is live, 12 curators have cleared it, your streak is 4." */
async function dailyPush() {
  const today = new Date().toISOString().slice(0, 10);
  const config = getDailyChallengeConfigFromDate(today);
  const meta = getDifficultyMeta(config.difficulty);

  const clears = (await sql`
    SELECT COUNT(DISTINCT telegram_id)::int AS n
    FROM game_sessions
    WHERE played_at::date = CURRENT_DATE AND verified = TRUE
  `) as any[];

  // Only players who have been seen in the last 21 days — pushing to someone
  // who left two months ago is how a bot gets reported.
  const targets = (await sql`
    SELECT chat_id, first_name, streak_current
    FROM users
    WHERE chat_id IS NOT NULL
      AND push_enabled = TRUE
      AND last_active > NOW() - INTERVAL '21 days'
      AND (last_push_at IS NULL OR last_push_at < CURRENT_DATE)
    ORDER BY last_active DESC
    LIMIT ${PUSH_BUDGET}
  `) as any[];

  const cleared = clears[0]?.n ?? 0;

  const rows = targets.map((u) => {
    const streak = Number(u.streak_current ?? 0);
    const streakLine =
      streak > 1
        ? `\n🔥 Your streak is <b>${streak} days</b> — don't drop it.`
        : '';
    return {
      chat_id: u.chat_id,
      text:
        `🏛️ <b>Today's board is open</b>\n\n` +
        `${meta.icon} ${meta.label} · Level ${config.level}\n` +
        `Same puzzle for every curator today.` +
        (cleared > 0 ? `\n\n${cleared} ${cleared === 1 ? 'curator has' : 'curators have'} cleared it so far.` : '') +
        streakLine,
    };
  });

  const delivered = await sendBatch(rows);

  // Mark only the players we actually reached. Marking everyone — as this did
  // originally — silently skips anyone whose send failed until tomorrow.
  if (delivered.length) {
    await sql`
      UPDATE users SET last_push_at = NOW() WHERE chat_id = ANY(${delivered})
    `;
  }

  return { job: 'daily-push', targets: targets.length, sent: delivered.length };
}

/** Crown last week's leader, then let the new week start empty. */
async function weeklyRollover() {
  const lastWeek = getWeekKey(new Date(getWeekStart().getTime() - 86400000));

  const leaders = (await sql`
    SELECT w.telegram_id, w.best_score, u.username, u.first_name, u.chat_id
    FROM weekly_scores w
    JOIN users u ON u.telegram_id = w.telegram_id
    WHERE w.week_key = ${lastWeek}
    ORDER BY w.best_score DESC
    LIMIT 1
  `) as any[];

  if (!leaders.length) return { job: 'weekly-rollover', weekKey: lastWeek, crowned: null };

  const champ = leaders[0];
  await sql`
    INSERT INTO weekly_champions (week_key, telegram_id, score)
    VALUES (${lastWeek}, ${champ.telegram_id}, ${champ.best_score})
    ON CONFLICT (week_key) DO UPDATE SET telegram_id = EXCLUDED.telegram_id, score = EXCLUDED.score
  `;

  const name = champ.username ? `@${champ.username}` : (champ.first_name ?? 'A curator');

  // Tell everyone who the champion is — a ladder nobody announces is a ladder
  // nobody competes on. The new week starts empty, so everyone has a shot.
  const targets = (await sql`
    SELECT chat_id FROM users
    WHERE chat_id IS NOT NULL AND push_enabled = TRUE
      AND last_active > NOW() - INTERVAL '21 days'
    LIMIT ${PUSH_BUDGET}
  `) as any[];

  const text =
    `🏅 <b>${lastWeek} is settled</b>\n\n` +
    `${name} took the week with <b>${Number(champ.best_score).toLocaleString()}</b> points.\n\n` +
    `The ladder has reset. Everyone starts at zero.`;

  const delivered = await sendBatch(targets.map((t) => ({ chat_id: t.chat_id, text })));

  return { job: 'weekly-rollover', weekKey: lastWeek, crowned: name, sent: delivered.length };
}

/** Open a 48-hour boss window, derived from the week key so it never runs out. */
async function bossRotate() {
  const weekKey = getWeekKey();
  const plan = planBossForWeek(weekKey);

  const existing = (await sql`
    SELECT id FROM boss_events WHERE title = ${plan.title}
  `) as any[];
  if (existing.length) {
    return { job: 'boss-rotate', weekKey, created: false, eventId: existing[0].id };
  }

  const opens = new Date();
  const closes = new Date(opens.getTime() + BOSS_WINDOW_HOURS * 3600000);

  const inserted = (await sql`
    INSERT INTO boss_events (era, level, seed, relic_id, title, opens_at, closes_at)
    VALUES (${plan.era}, ${plan.level}, ${plan.seed}, ${plan.relicId}, ${plan.title},
            ${opens.toISOString()}, ${closes.toISOString()})
    RETURNING id
  `) as any[];

  const meta = getDifficultyMeta(plan.era);
  const targets = (await sql`
    SELECT chat_id FROM users
    WHERE chat_id IS NOT NULL AND push_enabled = TRUE
      AND last_active > NOW() - INTERVAL '21 days'
    LIMIT ${PUSH_BUDGET}
  `) as any[];

  const text =
    `⚔️ <b>Boss hunt is open</b>\n\n` +
    `${meta.icon} ${meta.label} · Level ${plan.level}\n` +
    `One board, same for everyone, open for ${BOSS_WINDOW_HOURS} hours.\n\n` +
    `Clear it and the relic is yours.`;

  const delivered = await sendBatch(targets.map((t) => ({ chat_id: t.chat_id, text })));

  return { job: 'boss-rotate', weekKey, created: true, eventId: inserted[0].id, sent: delivered.length };
}

/** Tell both sides when a duel's 24 hours run out. */
async function duelSettle() {
  const rooms = (await sql`
    SELECT id FROM challenge_rooms
    WHERE mode = 'duel' AND status != 'settled'
      AND expires_at <= NOW() AND expires_at > NOW() - INTERVAL '3 days'
  `) as any[];

  let notified = 0;

  for (const room of rooms) {
    const seats = (await sql`
      SELECT p.telegram_id, p.display_name, p.best_score, p.best_time_seconds, u.chat_id
      FROM challenge_room_participants p
      JOIN users u ON u.telegram_id = p.telegram_id
      WHERE p.room_id = ${room.id}
    `) as any[];

    if (seats.length === 2) {
      const [a, b] = seats;
      const aScore = Number(a.best_score ?? -1);
      const bScore = Number(b.best_score ?? -1);
      const winner = aScore === bScore ? null : aScore > bScore ? a : b;

      for (const seat of seats) {
        if (!seat.chat_id) continue;
        const other = seat === a ? b : a;
        const text = !winner
          ? `🤝 <b>Duel drawn</b>\n\nYou and ${other.display_name} finished level.`
          : winner === seat
            ? `🏆 <b>You won the duel</b>\n\nYou beat ${other.display_name}.`
            : `💀 <b>Duel lost</b>\n\n${other.display_name} beat you. Rematch?`;
        if (await send(Number(seat.chat_id), text)) notified++;
      }
    }

    await sql`UPDATE challenge_rooms SET status = 'settled' WHERE id = ${room.id}`;
  }

  return { job: 'duel-settle', settled: rooms.length, notified };
}

/* ── Dispatcher ──────────────────────────────────────────────────────────── */

/**
 * Run whatever is due.
 *
 * Vercel's Hobby plan allows only a couple of cron jobs at daily frequency, so
 * the schedule calls this once a day rather than scheduling each job
 * separately. Every job below is idempotent and checks its own precondition, so
 * a missed day costs nothing and a double run changes nothing.
 *
 * On a plan with more cron slots, schedule the four jobs directly instead —
 * duels would then settle within the hour rather than within the day.
 */
async function tick() {
  const results: Record<string, unknown> = {};

  // Always: cheap, and both self-limit.
  results.duels = await duelSettle();
  results.push = await dailyPush();

  // Monday, or any day the previous week was never crowned.
  const lastWeek = getWeekKey(new Date(getWeekStart().getTime() - 86400000));
  const crowned = (await sql`
    SELECT week_key FROM weekly_champions WHERE week_key = ${lastWeek}
  `) as any[];
  if (!crowned.length) {
    results.rollover = await weeklyRollover();
  }

  // Open a boss window whenever there is not one running.
  const openBoss = (await sql`
    SELECT id FROM boss_events WHERE opens_at <= NOW() AND closes_at > NOW() LIMIT 1
  `) as any[];
  if (!openBoss.length) {
    results.boss = await bossRotate();
  }

  return { job: 'tick', ran: results };
}
