import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLevelCardValues,
  checkRunTiming,
  getChallengeCandidates,
  getDailyChallengeConfigFromDate,
  getMaxLevelForEra,
  getWeeklyChallengeConfigFromDate,
  isLevelOpen,
  isValidLevel,
  MAX_RUN_AGE_MS,
  MIN_TURN_GAP_MS,
  verifyReplaySubmission,
} from '../../shared/gameRules.js';
import {
  buildReferralLink,
  buildRoomInviteLink,
  normalizeRoomCode,
  parseStartPayload,
} from '../../shared/deepLinks.js';

/* ── Replays ─────────────────────────────────────────────────────────────── */

/** A perfect clear of a board: every pair found first time, at a human pace. */
function perfectReplay(era: 1 | 2 | 3 | 4 | 5, level: number, seed: number, turnGapMs = 600, pairGapMs = 150) {
  const values = buildLevelCardValues(era, level, seed);
  const byValue = new Map<number, number[]>();
  values.forEach((value, index) => byValue.set(value, [...(byValue.get(value) ?? []), index]));

  const moves: Array<{ cardIndex: number; timestamp: number }> = [];
  let t = 1_000;
  for (const [a, b] of byValue.values()) {
    moves.push({ cardIndex: a, timestamp: t });
    moves.push({ cardIndex: b, timestamp: t + pairGapMs });
    t += pairGapMs + turnGapMs;
  }
  return moves;
}

test('a perfect clear at a human pace verifies', () => {
  const replay = perfectReplay(1, 1, 12345);
  const result = verifyReplaySubmission({ difficulty: 1, level: 1, seed: 12345, replayMoves: replay });
  assert.equal(result.verified, true, result.reason);
  assert.equal(result.mismatches, 0);
});

test('two flips inside one turn may land together', () => {
  const replay = perfectReplay(1, 1, 777, 600, 0);
  const result = verifyReplaySubmission({ difficulty: 1, level: 1, seed: 777, replayMoves: replay });
  assert.equal(result.verified, true, result.reason);
});

test('a new turn faster than the board unlocks is rejected', () => {
  const replay = perfectReplay(1, 1, 99, MIN_TURN_GAP_MS - 50, 100);
  const result = verifyReplaySubmission({ difficulty: 1, level: 1, seed: 99, replayMoves: replay });
  assert.equal(result.verified, false);
  assert.match(result.reason ?? '', /faster than the board allows/);
});

test('a turn whose second flip predates its first is rejected', () => {
  const replay = perfectReplay(1, 1, 5);
  replay[1] = { ...replay[1], timestamp: replay[0].timestamp - 1 };
  const result = verifyReplaySubmission({ difficulty: 1, level: 1, seed: 5, replayMoves: replay });
  assert.equal(result.verified, false);
  assert.match(result.reason ?? '', /increasing/);
});

test('malformed moves are rejected before they are replayed', () => {
  const replay = perfectReplay(1, 1, 5);
  for (const bad of [
    { cardIndex: 0.5, timestamp: replay[0].timestamp },
    { cardIndex: replay[0].cardIndex, timestamp: Number.NaN },
    { cardIndex: replay[0].cardIndex, timestamp: -1 },
  ]) {
    const tampered = [bad, ...replay.slice(1)];
    const result = verifyReplaySubmission({ difficulty: 1, level: 1, seed: 5, replayMoves: tampered as any });
    assert.equal(result.verified, false);
  }
});

test('an absurdly long replay is refused outright', () => {
  const values = buildLevelCardValues(1, 1, 5);
  const moves = Array.from({ length: values.length * 50 }, (_, i) => ({ cardIndex: i % 2, timestamp: i * 1_000 }));
  const result = verifyReplaySubmission({ difficulty: 1, level: 1, seed: 5, replayMoves: moves });
  assert.equal(result.verified, false);
  assert.match(result.reason ?? '', /implausibly long/);
});

/* ── Run timing ──────────────────────────────────────────────────────────── */

test('a replay cannot claim more time than the run has existed', () => {
  assert.deepEqual(checkRunTiming({ serverElapsedMs: 30_000, replayDurationMs: 25_000 }), { ok: true });
  assert.equal(checkRunTiming({ serverElapsedMs: 3_000, replayDurationMs: 25_000 }).ok, false);
});

test('a run submitted long after it began has expired', () => {
  assert.equal(checkRunTiming({ serverElapsedMs: MAX_RUN_AGE_MS + 1, replayDurationMs: 10_000 }).ok, false);
});

/* ── Level gate ──────────────────────────────────────────────────────────── */

test('the first level of the first era is always open', () => {
  assert.equal(isLevelOpen(1, 1, []), true);
});

test('a level opens only when the one before it is cleared', () => {
  assert.equal(isLevelOpen(1, 3, [{ era: 1, level: 1 }]), false);
  assert.equal(isLevelOpen(1, 3, [{ era: 1, level: 2 }]), true);
});

test('an era opens only after the previous era is fully cleared', () => {
  const last = getMaxLevelForEra(1);
  assert.equal(isLevelOpen(2, 1, [{ era: 1, level: last - 1 }]), false);
  assert.equal(isLevelOpen(2, 1, [{ era: 1, level: last }]), true);
});

test('levels outside the catalogue are not valid', () => {
  assert.equal(isValidLevel(1, 1), true);
  assert.equal(isValidLevel(0, 1), false);
  assert.equal(isValidLevel(6, 1), false);
  assert.equal(isValidLevel(1, 0), false);
  assert.equal(isValidLevel(1, getMaxLevelForEra(1) + 1), false);
  assert.equal(isValidLevel(1, 1.5), false);
});

/* ── Daily and weekly boards ─────────────────────────────────────────────── */

test('the daily board for a date is the same in every timezone', () => {
  // getDay/getDate on a UTC-midnight date shift by a day west of Greenwich;
  // the config must read the key back in UTC so client and server agree.
  const config = getDailyChallengeConfigFromDate('2026-10-05'); // a Monday
  assert.equal(config.seed, 20261005);
  assert.equal(config.difficulty, 2); // DIFFICULTY_ORDER[1 % 5]
  assert.equal(config.level, (5 % getMaxLevelForEra(2)) + 1);
});

test('the weekly board starts its week on Monday in UTC', () => {
  const sunday = getWeeklyChallengeConfigFromDate('2026-10-04');
  const monday = getWeeklyChallengeConfigFromDate('2026-10-05');
  const nextSunday = getWeeklyChallengeConfigFromDate('2026-10-11');
  assert.notEqual(sunday.seed, monday.seed);
  assert.equal(monday.seed, nextSunday.seed);
  assert.equal(monday.seed, 20261005);
});

test('current challenge candidates cover yesterday through tomorrow', () => {
  const now = Date.UTC(2026, 9, 5, 12, 0, 0);
  const seeds = getChallengeCandidates('daily', now).map((c) => c.seed);
  assert.deepEqual(seeds, [20261004, 20261005, 20261006]);
  assert.equal(getChallengeCandidates('daily', now).some((c) => c.seed === 20261008), false);
});

/* ── Deep links ──────────────────────────────────────────────────────────── */

test('room invites round-trip through the bot link', () => {
  const link = buildRoomInviteLink('enter_memorabilia_musem_bot', 'ab12cd');
  assert.equal(link, 'https://t.me/enter_memorabilia_musem_bot?start=room_AB12CD');
  const payload = new URL(link).searchParams.get('start');
  assert.deepEqual(parseStartPayload(payload), { kind: 'room', roomId: 'AB12CD' });
});

test('start payloads are parsed strictly', () => {
  assert.deepEqual(parseStartPayload('ref_12345'), { kind: 'ref', inviterId: 12345 });
  assert.deepEqual(parseStartPayload('ref_abc'), { kind: 'none' });
  assert.deepEqual(parseStartPayload('room_TOOLONG1'), { kind: 'none' });
  assert.deepEqual(parseStartPayload('room_<script>'), { kind: 'none' });
  assert.deepEqual(parseStartPayload('theme_museum'), { kind: 'theme', theme: 'museum' });
  assert.deepEqual(parseStartPayload(''), { kind: 'none' });
  assert.deepEqual(parseStartPayload(undefined), { kind: 'none' });
});

test('room codes are normalised and validated', () => {
  assert.equal(normalizeRoomCode(' ab12cd '), 'AB12CD');
  assert.equal(normalizeRoomCode('AB12C'), null);
  assert.equal(normalizeRoomCode(null), null);
});

test('referral links carry the inviter, or none', () => {
  assert.equal(buildReferralLink('@bot', 42), 'https://t.me/bot?start=ref_42');
  assert.equal(buildReferralLink('bot', null), 'https://t.me/bot');
});
