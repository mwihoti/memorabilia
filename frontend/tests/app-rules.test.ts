import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveStartupIntroState } from '../../shared/startupIntro.js';
import {
  getDailyChallengeConfigFromDate,
  getMaxLevelForEra,
  getNextLevelTarget,
  getWeeklyChallengeConfigFromDate,
} from '../../shared/gameRules.js';
import { Difficulty, isEraUnlocked, isLevelUnlocked, LevelProgress } from '../src/types/index.js';

test('unlock flow stays sequential within an era', () => {
  const progress: LevelProgress[] = [
    {
      era: Difficulty.Easy,
      level: 1,
      completed: true,
      bestScore: 1000,
      bestTime: 40,
      bestMedal: 'gold',
      stars: 3,
    },
  ];

  assert.equal(isLevelUnlocked(Difficulty.Easy, 2, progress), true);
  assert.equal(isLevelUnlocked(Difficulty.Easy, 3, progress), false);
});

test('next era stays locked until the previous era is fully cleared', () => {
  const almostThere: LevelProgress[] = [
    {
      era: Difficulty.Easy,
      level: getMaxLevelForEra(Difficulty.Easy) - 1,
      completed: true,
      bestScore: 1200,
      bestTime: 35,
      bestMedal: 'gold',
      stars: 3,
    },
  ];

  const unlocked: LevelProgress[] = [
    {
      era: Difficulty.Easy,
      level: getMaxLevelForEra(Difficulty.Easy),
      completed: true,
      bestScore: 1400,
      bestTime: 34,
      bestMedal: 'gold',
      stars: 3,
    },
  ];

  assert.equal(isEraUnlocked(Difficulty.Medium, almostThere), false);
  assert.equal(isEraUnlocked(Difficulty.Medium, unlocked), true);
});

test('next-level flow advances inside an era and then into the next era', () => {
  assert.deepEqual(getNextLevelTarget(1, 1), { era: 1, level: 2 });
  assert.deepEqual(getNextLevelTarget(1, 50), { era: 2, level: 1 });
  assert.equal(getNextLevelTarget(5, 100), null);
});

test('startup intro resolves to opening only once, then splash', () => {
  assert.deepEqual(resolveStartupIntroState(false), { showOpeningIntro: true, showSplashIntro: false });
  assert.deepEqual(resolveStartupIntroState(true), { showOpeningIntro: false, showSplashIntro: true });
});

test('daily challenge config is deterministic for a fixed date', () => {
  const first = getDailyChallengeConfigFromDate('2026-05-26');
  const second = getDailyChallengeConfigFromDate('2026-05-26');
  assert.deepEqual(first, second);
});

test('weekly challenge config is deterministic for a fixed date', () => {
  const first = getWeeklyChallengeConfigFromDate('2026-05-26');
  const second = getWeeklyChallengeConfigFromDate('2026-05-26');
  assert.deepEqual(first, second);
});
