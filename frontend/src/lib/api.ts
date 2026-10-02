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
  rewards?: {
    streak: { current: number; longest: number; lastDate: string | null };
    streakAdvanced: boolean;
    granted: { hint: number; freeze: number; boost: number };
    relicsEarned: string[];
    achievementsUnlocked: string[];
    seasonPoints: number;
    weekKey: string;
    seasonKey: string;
    bossCleared: boolean;
    referralSettled: boolean;
  };
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

export async function fetchPlayerStats(
  telegramUser: SubmitScoreParams['telegramUser'],
): Promise<PlayerStatsResponse | null> {
  const res = await fetch(`${BASE}/api/player/${telegramUser.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramUser, initData: getInitData() }),
  });
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

export interface PlayerState {
  streak: { current: number; longest: number; lastDate: string | null };
  powers: { hint: number; freeze: number; boost: number };
  achievements: Array<{ id: string; unlockedAt: number }>;
  relics: string[];
}

/**
 * The server's copy of everything a player has earned: streak, power-up
 * charges, achievements and relics. Loaded on start so a new device picks up
 * where the last one left off.
 */
export async function fetchPlayerState(telegramUser: SubmitScoreParams['telegramUser']): Promise<PlayerState> {
  const res = await fetch(`${BASE}/api/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'state', telegramUser, initData: getInitData() }),
  });

  if (!res.ok) throw new Error('Failed to fetch player state');
  return res.json();
}

/** Spend one server-held power-up charge. Resolves to the charges left. */
export async function spendPowerUp(
  telegramUser: SubmitScoreParams['telegramUser'],
  power: 'hint' | 'freeze' | 'boost',
): Promise<number> {
  const res = await fetch(`${BASE}/api/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'power.use', power, telegramUser, initData: getInitData() }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.message || 'Failed to spend power-up');
  return Number(payload.remaining ?? 0);
}

export interface StartRunParams {
  telegramUser: SubmitScoreParams['telegramUser'];
  difficulty: number;
  level: number;
  challengeMode: 'standard' | 'daily' | 'weekly' | 'room' | 'boss';
  requestedSeed?: number;
  /** Required for `room` runs; the server reads the board from the room. */
  roomId?: string;
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

/** The server deals the room's board; the returned room carries its seed. */
export async function createChallengeRoom(params: {
  telegramUser: SubmitScoreParams['telegramUser'];
  displayName: string;
  difficulty: number;
  level: number;
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

/**
 * Post a room finish. Only the verified run id is sent; the server reads the
 * time, moves and score from that run rather than taking them from here.
 */
export async function submitChallengeRoomResult(params: {
  telegramUser: SubmitScoreParams['telegramUser'];
  roomId: string;
  runId: number;
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


// ── Activities ────────────────────────────────────────────────────────────────

export interface LadderRow {
  rank: number;
  telegram_id: number;
  name: string;
  best_score: number;
  games: number;
}

export interface RelicRow {
  id: string;
  name: string;
  icon: string;
  era: number;
  level: number;
  source: 'level' | 'boss' | 'referral' | 'streak';
  earned: boolean;
}

export interface DuelRow {
  id: string;
  era: number;
  level: number;
  seed: number;
  status: string;
  expiresAt: string;
  hostTelegramId: number;
  me: { telegramId: number; name: string; score: number | null; timeSeconds: number | null } | null;
  opponent: { telegramId: number; name: string; score: number | null; timeSeconds: number | null } | null;
  outcome: 'pending' | 'won' | 'lost' | 'drawn' | 'expired';
  iWon: boolean;
}

export interface BossRow {
  id: number;
  era: number;
  level: number;
  seed: number;
  relicId: string;
  title: string;
  closesAt: string;
  clears: number;
  windowHours: number;
}

export interface ActivityBoard {
  weekKey: string;
  resetInMs: number;
  ladder: LadderRow[];
  champions: Array<{ week_key: string; score: number; name: string }>;
  boss: BossRow | null;
  season: {
    key: string;
    name: string;
    week: number;
    endsAt: string;
    board: Array<{ rank: number; telegram_id: number; name: string; points: number }>;
  };
  duels: DuelRow[];
  collection: { total: number; earned: number; relics: RelicRow[] };
  guild: { id: string; name: string; emblem: string; role: string } | null;
}

export async function fetchActivities(telegramId?: number): Promise<ActivityBoard> {
  const query = telegramId ? `?telegramId=${telegramId}` : '';
  const res = await fetch(`${BASE}/api/activities${query}`);
  if (!res.ok) throw new Error('Failed to load activities');
  return res.json();
}

async function postActivity<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}/api/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, initData: getInitData() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/** The server deals the duel's board, so both players get one neither chose. */
export function createDuel(params: {
  telegramUser: SubmitScoreParams['telegramUser'];
  difficulty: number;
  level: number;
  displayName: string;
}) {
  return postActivity<{ id: string; expiresAt: string; windowHours: number }>({
    action: 'duel.create',
    ...params,
  });
}

export function acceptDuel(params: {
  telegramUser: SubmitScoreParams['telegramUser'];
  duelId: string;
  displayName: string;
}) {
  return postActivity<{ id: string; expiresAt: string }>({ action: 'duel.accept', ...params });
}

// ── Guilds ────────────────────────────────────────────────────────────────────

export interface GuildRow {
  rank: number;
  id: string;
  name: string;
  emblem: string;
  members: number;
  weekTotal: number;
}

export interface GuildDetail {
  id: string;
  name: string;
  emblem: string;
  ownerTelegramId: number;
  weekKey: string;
  weekTotal: number;
  members: Array<{ telegramId: number; name: string; role: string; weekScore: number }>;
}

export async function fetchGuilds(): Promise<{ weekKey: string; maxMembers: number; guilds: GuildRow[] }> {
  const res = await fetch(`${BASE}/api/guild`);
  if (!res.ok) throw new Error('Failed to load guilds');
  return res.json();
}

export async function fetchGuild(id: string): Promise<GuildDetail> {
  const res = await fetch(`${BASE}/api/guild?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to load guild');
  return res.json();
}

async function postGuild<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}/api/guild`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, initData: getInitData() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export function createGuild(params: {
  telegramUser: SubmitScoreParams['telegramUser'];
  name: string;
  emblem?: string;
}) {
  return postGuild<{ id: string; name: string; emblem: string }>({ action: 'create', ...params });
}

export function joinGuild(params: {
  telegramUser: SubmitScoreParams['telegramUser'];
  guildId: string;
}) {
  return postGuild<{ id: string }>({ action: 'join', ...params });
}

export function leaveGuild(params: { telegramUser: SubmitScoreParams['telegramUser'] }) {
  return postGuild<{ left: boolean }>({ action: 'leave', ...params });
}

export interface QuitResult {
  strikes: number;
  penalised: boolean;
  penalty: number;
  seasonPoints: number | null;
}

/** Report an abandoned game. Three in a row costs three season points. */
export function reportQuit(telegramUser: SubmitScoreParams['telegramUser']) {
  return postActivity<QuitResult>({ action: 'game.quit', telegramUser });
}
