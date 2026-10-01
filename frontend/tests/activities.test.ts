import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWeekKey,
  msUntilWeekReset,
  getSeason,
  advanceStreak,
  streakGrant,
  resolveDuel,
  seasonPointsFor,
  planBossForWeek,
  ALL_RELICS,
  hashString,
} from '../../shared/activities.js';

/* ── Week keys ───────────────────────────────────────────────────────────── */

test('week key follows ISO-8601, not a naive day count', () => {
  // 2026-01-01 is a Thursday, so it belongs to week 1 of 2026.
  assert.equal(getWeekKey(new Date('2026-01-01T12:00:00Z')), '2026-W01');
  // 2025-12-29 is the Monday of that same ISO week — it must agree.
  assert.equal(getWeekKey(new Date('2025-12-29T12:00:00Z')), '2026-W01');
});

test('week key is stable across a week and rolls on Monday', () => {
  const monday = getWeekKey(new Date('2026-09-28T00:00:00Z'));
  const sunday = getWeekKey(new Date('2026-10-04T23:59:00Z'));
  const nextMonday = getWeekKey(new Date('2026-10-05T00:00:00Z'));

  assert.equal(monday, sunday, 'the whole week shares one key');
  assert.notEqual(sunday, nextMonday, 'Monday starts a new ladder');
});

test('reset countdown never goes negative and is under a week', () => {
  for (const iso of ['2026-10-05T00:00:00Z', '2026-10-08T13:22:00Z', '2026-10-11T23:59:59Z']) {
    const ms = msUntilWeekReset(new Date(iso));
    assert.ok(ms >= 0, `${iso} produced a negative countdown`);
    assert.ok(ms <= 7 * 86400000, `${iso} produced a countdown over a week`);
  }
});

/* ── Seasons ─────────────────────────────────────────────────────────────── */

test('season runs six weeks and reports the right week within it', () => {
  const start = getSeason(new Date('2026-01-05T00:00:00Z'));
  assert.equal(start.week, 1);

  const later = getSeason(new Date('2026-02-09T00:00:00Z')); // 5 weeks on
  assert.equal(later.key, start.key, 'still the same season');
  assert.equal(later.week, 6);

  const next = getSeason(new Date('2026-02-16T00:00:00Z')); // 6 weeks on
  assert.notEqual(next.key, start.key, 'a new season has begun');
});

test('season points compress the gap between a beginner and a veteran', () => {
  const beginner = seasonPointsFor(4_000, 1, 1);
  const veteran = seasonPointsFor(40_000, 5, 3);

  assert.ok(veteran > beginner, 'the veteran still leads');
  assert.ok(
    veteran < beginner * 6,
    `a 10x score gap must not become a 6x+ points gap (${beginner} vs ${veteran})`,
  );
});

/* ── Streaks ─────────────────────────────────────────────────────────────── */

test('streak extends on consecutive days, resets on a gap, ignores same day', () => {
  let state = { current: 0, longest: 0, lastDate: null as string | null };

  state = advanceStreak(state, '2026-10-01');
  assert.equal(state.current, 1);

  state = advanceStreak(state, '2026-10-01');
  assert.equal(state.current, 1, 'a second play the same day does not count');

  state = advanceStreak(state, '2026-10-02');
  assert.equal(state.current, 2);

  state = advanceStreak(state, '2026-10-05');
  assert.equal(state.current, 1, 'a missed day resets');
  assert.equal(state.longest, 2, 'the longest run is remembered');
});

test('streak rewards grow with the streak and never shrink', () => {
  const days = [1, 3, 7, 14, 30];
  let previous = -1;
  for (const day of days) {
    const total = Object.values(streakGrant(day)).reduce((a, b) => a + b, 0);
    assert.ok(total > previous, `day ${day} must not reward less than the day before`);
    previous = total;
  }
});

/* ── Duels ───────────────────────────────────────────────────────────────── */

const future = new Date('2026-10-10T00:00:00Z');
const past = new Date('2026-10-01T00:00:00Z');
const now = new Date('2026-10-05T00:00:00Z');

test('duel stays pending while the window is open and a side has not played', () => {
  const r = resolveDuel(
    { telegramId: 1, score: 900, timeSeconds: 40 },
    { telegramId: 2, score: null, timeSeconds: null },
    future,
    now,
  );
  assert.equal(r.outcome, 'pending');
});

test('higher score wins, ties break on the faster clear', () => {
  const byScore = resolveDuel(
    { telegramId: 1, score: 900, timeSeconds: 80 },
    { telegramId: 2, score: 800, timeSeconds: 20 },
    future,
    now,
  );
  assert.equal(byScore.winnerTelegramId, 1, 'score outranks time');

  const byTime = resolveDuel(
    { telegramId: 1, score: 900, timeSeconds: 80 },
    { telegramId: 2, score: 900, timeSeconds: 20 },
    future,
    now,
  );
  assert.equal(byTime.winnerTelegramId, 2, 'equal scores go to the faster clear');
});

test('an identical score and time is a draw, not an arbitrary win', () => {
  const r = resolveDuel(
    { telegramId: 1, score: 900, timeSeconds: 40 },
    { telegramId: 2, score: 900, timeSeconds: 40 },
    future,
    now,
  );
  assert.equal(r.outcome, 'drawn');
  assert.equal(r.winnerTelegramId, null);
});

test('a closed window forfeits to whoever actually played', () => {
  const forfeit = resolveDuel(
    { telegramId: 1, score: 500, timeSeconds: 60 },
    { telegramId: 2, score: null, timeSeconds: null },
    past,
    now,
  );
  assert.equal(forfeit.winnerTelegramId, 1);

  const nobody = resolveDuel(
    { telegramId: 1, score: null, timeSeconds: null },
    { telegramId: 2, score: null, timeSeconds: null },
    past,
    now,
  );
  assert.equal(nobody.outcome, 'expired');
  assert.equal(nobody.winnerTelegramId, null);
});

/* ── Bosses and relics ───────────────────────────────────────────────────── */

test('boss plan is deterministic per week and lands on a real boss level', () => {
  const a = planBossForWeek('2026-W40');
  const b = planBossForWeek('2026-W40');
  assert.deepEqual(a, b, 'the same week must always pick the same boss');

  assert.ok(a.era >= 1 && a.era <= 5);
  assert.equal(a.level % 10, 0, 'boss levels fall every ten levels');
});

test('different weeks generally pick different boards', () => {
  const keys = ['2026-W40', '2026-W41', '2026-W42', '2026-W43', '2026-W44'];
  const picks = new Set(keys.map((k) => `${planBossForWeek(k).era}-${planBossForWeek(k).level}`));
  assert.ok(picks.size > 1, 'the schedule must not be stuck on one board');
});

test('relic catalogue has no duplicate ids or names within an era', () => {
  const ids = ALL_RELICS.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'relic ids must be unique');

  for (const era of [1, 2, 3, 4, 5]) {
    const names = ALL_RELICS.filter((r) => r.era === era && r.source !== 'referral' && r.source !== 'streak')
      .map((r) => r.name);
    assert.equal(
      new Set(names).size,
      names.length,
      `era ${era} shows the same relic name twice`,
    );
  }
});

test('hash is stable and well distributed enough to pick a boss', () => {
  assert.equal(hashString('2026-W40'), hashString('2026-W40'));
  assert.notEqual(hashString('2026-W40'), hashString('2026-W41'));
});
