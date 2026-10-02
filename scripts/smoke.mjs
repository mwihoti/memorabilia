#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 *   node scripts/smoke.mjs                              # checks production
 *   node scripts/smoke.mjs https://my-preview.vercel.app
 *
 * Answers one question: is the deployment actually running the current code,
 * with its database migrated and its environment configured? Read-only — it
 * sends no Telegram messages and writes nothing.
 */

const BASE = (process.argv[2] || 'https://memorabilia-game.vercel.app').replace(/\/$/, '');

let failures = 0;

function report(ok, label, detail = '') {
  const mark = ok ? '\x1b[32m  ok  \x1b[0m' : '\x1b[31m FAIL \x1b[0m';
  console.log(`${mark} ${label}${detail ? `  — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function get(path) {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not json — fine for the HTML check */
    }
    return { status: res.status, text, json };
  } catch (err) {
    return { status: 0, text: String(err), json: null };
  }
}

console.log(`\nSmoke testing ${BASE}\n`);

/* ── 1. Is the new frontend build being served? ───────────────────────────── */

const page = await get('/');
report(page.status === 200, 'site responds', `HTTP ${page.status}`);
report(
  page.text.includes('Cormorant+Garamond'),
  'new UI is live',
  page.text.includes('Cormorant+Garamond')
    ? 'display font present'
    : 'still serving the pre-redesign build — Vercel has not deployed',
);

/* ── 2. Do the new API routes exist? ──────────────────────────────────────── */

const activities = await get('/api/activities');
report(activities.status === 200, '/api/activities exists', `HTTP ${activities.status}`);

const guilds = await get('/api/guild');
report(guilds.status === 200, '/api/guild exists', `HTTP ${guilds.status}`);

/* ── 3. Has the database been migrated? ───────────────────────────────────── */

if (activities.json) {
  const a = activities.json;
  report(typeof a.weekKey === 'string', 'weekly ladder table reachable', a.weekKey ?? '');
  report(!!a.season?.key, 'season table reachable', a.season?.name ?? '');
  report(
    Array.isArray(a.collection?.relics) && a.collection.relics.length > 0,
    'relic catalogue built',
    `${a.collection?.relics?.length ?? 0} relics`,
  );
} else if (activities.status === 500) {
  report(false, 'database migrated', 'activities returned 500 — run `npm run migrate`');
}

/* ── 4. Is auth failing closed as intended? ───────────────────────────────── */

// An unauthenticated write must be rejected. A 200 here means TELEGRAM_BOT_TOKEN
// is missing and anyone can post as anyone.
try {
  const res = await fetch(`${BASE}/api/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'duel.create', telegramUser: { id: 1, first_name: 'smoke' } }),
  });
  report(
    res.status === 401,
    'auth fails closed',
    res.status === 401
      ? 'unauthenticated write rejected'
      : `expected 401, got ${res.status} — check TELEGRAM_BOT_TOKEN`,
  );
} catch (err) {
  report(false, 'auth fails closed', String(err));
}

/* ── 5. Is the cron endpoint protected? ───────────────────────────────────── */

const cron = await get('/api/cron?job=tick');
report(
  cron.status === 401,
  'cron requires its secret',
  cron.status === 401 ? 'unauthorised call rejected'
    : cron.status === 500 ? 'CRON_SECRET is not set'
    : `expected 401, got ${cron.status}`,
);

/* ── 6. Old routes still work ─────────────────────────────────────────────── */

const leaderboard = await get('/api/leaderboard');
report(leaderboard.status === 200, '/api/leaderboard still works', `HTTP ${leaderboard.status}`);

console.log(
  failures === 0
    ? '\n\x1b[32mAll checks passed.\x1b[0m\n'
    : `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`,
);

process.exit(failures === 0 ? 0 : 1);
