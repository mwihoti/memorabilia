// API client — calls Vercel serverless functions backed by Neon DB

const BASE = import.meta.env.VITE_API_URL || '';

function getInitData(): string {
  try {
    return window.Telegram?.WebApp?.initData || '';
  } catch {
    return '';
  }
}

// ── Score submission ──────────────────────────────────────────────────────────

export interface SubmitScoreParams {
  telegramUser: {
    id: number;
    username?: string;
    first_name: string;
    last_name?: string;
  };
  score: number;
  difficulty: number;
  level: number;
  moves: number;
  timeSeconds: number;
  stars: number;
  replayMoves: Array<{ cardIndex: number; timestamp: number }>;
  runId?: number | null;
}

export interface SubmitScoreResult {
  success: boolean;
  rank?: number;
  totalPlayers?: number;
  isNewBest?: boolean;
  verifiedScore?: number;
  verifiedMoves?: number;
  verifiedTimeSeconds?: number;
  adjusted?: boolean;
  message?: string;
}

export async function submitScore(params: SubmitScoreParams): Promise<SubmitScoreResult> {
  const res = await fetch(`${BASE}/api/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, initData: getInitData() }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardRow {
  rank: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  display_name: string;
  best_score: number;
  total_games: number;
  total_wins: number;
  last_active: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardRow[];
  total: number;
  updatedAt: string;
}

export async function fetchLeaderboard(limit = 100): Promise<LeaderboardResponse> {
  const res = await fetch(`${BASE}/api/leaderboard?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}

// ── Player stats ──────────────────────────────────────────────────────────────

export interface PlayerStatsResponse {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  display_name: string;
  total_games: number;
  total_wins: number;
  best_score: number;
  average_score: number;
  rank: number | null;
  last_active?: string;
  recentGames: Array<{
    id: number;
    score: number;
    difficulty: number;
    moves: number;
    time_seconds: number;
    stars: number;
    played_at: string;
  }>;
}

export async function fetchPlayerStats(telegramId: number): Promise<PlayerStatsResponse | null> {
  const res = await fetch(`${BASE}/api/player/${telegramId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch player stats');
  return res.json();
}

export interface ProgressRow {
  era: number;
  level: number;
  completed: boolean;
  bestScore: number;
  bestTime: number;
  bestMedal: 'gold' | 'silver' | 'bronze' | 'none';
  stars: number;
  completedAt?: number;
}

export async function fetchPlayerProgress(telegramUser: SubmitScoreParams['telegramUser']): Promise<ProgressRow[]> {
  const res = await fetch(`${BASE}/api/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'load', telegramUser, initData: getInitData() }),
  });

  if (!res.ok) throw new Error('Failed to fetch player progression');
  const payload = await res.json();
  return payload.progress ?? [];
}

export async function savePlayerProgress(
  telegramUser: SubmitScoreParams['telegramUser'],
  progress: ProgressRow
): Promise<void> {
  const res = await fetch(`${BASE}/api/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', telegramUser, progress, initData: getInitData() }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || 'Failed to save player progression');
  }
}

export interface StartRunParams {
  telegramUser: SubmitScoreParams['telegramUser'];
  difficulty: number;
  level: number;
  challengeMode: 'standard' | 'daily' | 'weekly' | 'room';
  requestedSeed?: number;
}

export interface StartRunResult {
  success: boolean;
  runId: number;
  seed: number;
}

export async function startVerifiedRun(params: StartRunParams): Promise<StartRunResult> {
  const res = await fetch(`${BASE}/api/run-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, initData: getInitData() }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || 'Failed to create verified run');
  }

  return res.json();
}

export async function sendTelemetry(payload: {
  type: 'event' | 'error';
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await fetch(`${BASE}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Best-effort only
  }
}

export interface ChallengeRoomParticipant {
  rank: number | null;
  telegramId: number;
  displayName: string;
  status: 'joined' | 'playing' | 'finished';
  joinedAt: string;
  finishedAt?: string | null;
  bestTimeSeconds?: number | null;
  bestMoves?: number | null;
  bestScore?: number | null;
  verified: boolean;
}

export interface ChallengeRoom {
  id: string;
  hostTelegramId: number;
  difficulty: number;
  level: number;
  seed: number;
  status: 'lobby' | 'countdown' | 'live' | 'completed';
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  countdownEndsAt?: string | null;
  isHost?: boolean;
  participants: ChallengeRoomParticipant[];
}

async function postChallengeRoom(body: Record<string, unknown>): Promise<ChallengeRoom> {
  const res = await fetch(`${BASE}/api/challenge-room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, initData: getInitData() }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || 'Challenge room request failed');
  }

  return res.json();
}

export async function createChallengeRoom(params: {
  telegramUser: SubmitScoreParams['telegramUser'];
  displayName: string;
  difficulty: number;
  level: number;
  seed: number;
}): Promise<ChallengeRoom> {
  return postChallengeRoom({ action: 'create', ...params });
}

export async function joinChallengeRoom(params: {
  telegramUser: SubmitScoreParams['telegramUser'];
  displayName: string;
  roomId: string;
}): Promise<ChallengeRoom> {
  return postChallengeRoom({ action: 'join', ...params });
}

export async function startChallengeRoom(params: {
  telegramUser: SubmitScoreParams['telegramUser'];
  roomId: string;
}): Promise<ChallengeRoom> {
  return postChallengeRoom({ action: 'start', ...params });
}

export async function rematchChallengeRoom(params: {
  telegramUser: SubmitScoreParams['telegramUser'];
  roomId: string;
}): Promise<ChallengeRoom> {
  return postChallengeRoom({ action: 'rematch', ...params });
}

export async function submitChallengeRoomResult(params: {
  telegramUser: SubmitScoreParams['telegramUser'];
  roomId: string;
  timeSeconds: number;
  moves: number;
  score: number;
  verified: boolean;
}): Promise<ChallengeRoom> {
  return postChallengeRoom({ action: 'submit', ...params });
}

export async function fetchChallengeRoom(roomId: string): Promise<ChallengeRoom> {
  const res = await fetch(`${BASE}/api/challenge-room?roomId=${encodeURIComponent(roomId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || 'Failed to fetch challenge room');
  }
  return res.json();
}
