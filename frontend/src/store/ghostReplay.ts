import { GhostReplay, ReplayMove, Difficulty } from '../types';

const GHOST_REPLAYS_KEY = 'memorabilia_ghost_replays';

// ── Storage helpers ───────────────────────────────────────────────────────────

function replayKey(era: Difficulty, level: number, stage = 1): string {
  return `${era}-${level}-${stage}`;
}

function loadAllReplays(): Record<string, GhostReplay> {
  try {
    const data = localStorage.getItem(GHOST_REPLAYS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveAllReplays(replays: Record<string, GhostReplay>): void {
  try {
    localStorage.setItem(GHOST_REPLAYS_KEY, JSON.stringify(replays));
  } catch (error) {
    console.error('Failed to save ghost replays:', error);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function loadGhostReplay(era: Difficulty, level: number, stage = 1): GhostReplay | null {
  const all = loadAllReplays();
  return all[replayKey(era, level, stage)] ?? null;
}

/**
 * Save replay if it has a better score than the stored one.
 * Returns true if the replay was saved (new best).
 */
export function saveGhostReplayIfBest(replay: GhostReplay): boolean {
  const all      = loadAllReplays();
  const key      = replayKey(replay.era, replay.level, replay.stage ?? 1);
  const existing = all[key];

  if (!existing || replay.score > existing.score) {
    all[key] = replay;
    saveAllReplays(all);
    return true;
  }

  return false;
}

export function buildReplay(
  gameId: number,
  era: Difficulty,
  level: number,
  stage: number,
  moves: ReplayMove[],
  totalTimeMs: number,
  score: number,
  emojis?: string[]
): GhostReplay {
  return { gameId, era, level, stage, moves, totalTime: totalTimeMs, score, emojis };
}
