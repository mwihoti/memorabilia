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
  moves: number;
  timeSeconds: number;
  stars: number;
}

export interface SubmitScoreResult {
  success: boolean;
  rank?: number;
  totalPlayers?: number;
  isNewBest?: boolean;
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
