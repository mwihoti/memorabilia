// Local storage for player scores and stats in demo mode
import { GameState, LeaderboardEntry, LevelProgress, Difficulty, TimeMedal } from '../types';

const STORAGE_KEY = 'memorabilia_player_data';
const LEADERBOARD_KEY = 'memorabilia_leaderboard';
const LEVEL_PROGRESS_KEY = 'memorabilia_level_progress';

export interface LocalPlayerData {
  telegramId: number;
  playerName: string;
  totalGames: number;
  totalWins: number;
  bestScore: number;
  averageScore: number;
  joinedAt: number;
  lastPlayed: number;
}

export interface LocalLeaderboardEntry {
  rank: number;
  playerName: string;
  telegramId: number;
  score: number;
  difficulty: string;
  moves: number;
  time: number;
  achievedAt: number;
}

/**
 * Get or create player data
 */
export function getOrCreatePlayer(
  telegramId: number,
  playerName: string
): LocalPlayerData {
  const players = getAllPlayers();
  let player = players.find((p) => p.telegramId === telegramId);

  if (!player) {
    player = {
      telegramId,
      playerName,
      totalGames: 0,
      totalWins: 0,
      bestScore: 0,
      averageScore: 0,
      joinedAt: Date.now(),
      lastPlayed: 0,
    };
    players.push(player);
    saveAllPlayers(players);
  }

  return player;
}

/**
 * Add game score to player stats
 */
export function addGameScore(
  telegramId: number,
  playerName: string,
  score: number,
  difficulty: number,
  moves: number,
  timeSeconds: number,
  isWin: boolean
) {
  try {
    // Update player stats
    const players = getAllPlayers();
    let playerIndex = players.findIndex((p) => p.telegramId === telegramId);
    
    let player: LocalPlayerData;
    if (playerIndex === -1) {
      // New player
      player = {
        telegramId,
        playerName,
        totalGames: 1,
        totalWins: isWin ? 1 : 0,
        bestScore: score,
        averageScore: score,
        joinedAt: Date.now(),
        lastPlayed: Date.now(),
      };
      players.push(player);
      console.log('✨ New player created:', playerName, 'ID:', telegramId);
    } else {
      // Existing player
      player = players[playerIndex];
      player.totalGames += 1;
      if (isWin) {
        player.totalWins += 1;
      }
      if (score > player.bestScore) {
        player.bestScore = score;
      }
      player.averageScore = Math.round(
        (player.averageScore * (player.totalGames - 1) + score) / player.totalGames
      );
      player.lastPlayed = Date.now();
      console.log('📊 Player updated:', playerName, 'Total games:', player.totalGames);
    }

    // Save all players
    saveAllPlayers(players);
    console.log('💾 Player data saved to localStorage');

    // Add to leaderboard
    addToLeaderboard(telegramId, playerName, score, difficulty, moves, timeSeconds);
    console.log('🏆 Score added to leaderboard');

    return player;
  } catch (error) {
    console.error('❌ Failed to save game score:', error);
  }
}

/**
 * Add score to leaderboard
 */
function addToLeaderboard(
  telegramId: number,
  playerName: string,
  score: number,
  difficulty: number,
  moves: number,
  timeSeconds: number
) {
  const leaderboard = getLeaderboard();

  const entry: LocalLeaderboardEntry = {
    rank: 0, // Will be recalculated
    playerName,
    telegramId,
    score,
    difficulty: getDifficultyName(difficulty),
    moves,
    time: timeSeconds,
    achievedAt: Date.now(),
  };

  leaderboard.push(entry);

  // Sort by score and update ranks
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  // Keep only top 100
  const topLeaderboard = leaderboard.slice(0, 100);
  saveLeaderboard(topLeaderboard);
}

/**
 * Get all players
 */
export function getAllPlayers(): LocalPlayerData[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const players = data ? JSON.parse(data) : [];
    console.log('📂 getAllPlayers() - Retrieved', players.length, 'players from localStorage:', players);
    return players;
  } catch (error) {
    console.error('Failed to get players:', error);
    return [];
  }
}

/**
 * Get leaderboard
 */
export function getLeaderboard(): LocalLeaderboardEntry[] {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return [];
  }
}

/**
 * Get leaderboard with pagination
 */
export function getLeaderboardPage(
  limit: number = 100,
  offset: number = 0
): LocalLeaderboardEntry[] {
  const leaderboard = getLeaderboard();
  return leaderboard.slice(offset, offset + limit);
}

/**
 * Save all players to storage
 */
function saveAllPlayers(players: LocalPlayerData[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  } catch (error) {
    console.error('Failed to save players:', error);
  }
}

/**
 * Save leaderboard to storage
 */
function saveLeaderboard(leaderboard: LocalLeaderboardEntry[]) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
  } catch (error) {
    console.error('Failed to save leaderboard:', error);
  }
}

/**
 * Get difficulty name from number
 */
function getDifficultyName(difficulty: number): string {
  switch (difficulty) {
    case 1:
      return 'Ancient Era';
    case 2:
      return 'Medieval Times';
    case 3:
      return 'Modern Era';
    default:
      return 'Unknown';
  }
}

/**
 * Get leaderboard stats
 */
export function getLeaderboardStats() {
  const leaderboard = getLeaderboard();
  const players = getAllPlayers();

  if (leaderboard.length === 0) {
    return {
      totalPlayers: players.length,
      totalGames: players.reduce((sum, p) => sum + p.totalGames, 0),
      averageScore: 0,
      highestScore: 0,
    };
  }

  return {
    totalPlayers: players.length,
    totalGames: players.reduce((sum, p) => sum + p.totalGames, 0),
    averageScore: Math.round(
      leaderboard.reduce((sum, e) => sum + e.score, 0) / leaderboard.length
    ),
    highestScore: leaderboard[0]?.score || 0,
  };
}

// ── Level Progress ────────────────────────────────────────────────────────────

export function getAllLevelProgress(): LevelProgress[] {
  try {
    const data = localStorage.getItem(LEVEL_PROGRESS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveAllLevelProgress(progress: LevelProgress[]): void {
  try {
    localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save level progress:', error);
  }
}

export function getLevelProgress(era: Difficulty, level: number): LevelProgress | null {
  const all = getAllLevelProgress();
  return all.find((lp) => lp.era === era && lp.level === level) ?? null;
}

export function saveLevelProgress(incoming: LevelProgress): void {
  const all     = getAllLevelProgress();
  const index   = all.findIndex((lp) => lp.era === incoming.era && lp.level === incoming.level);
  const existing = index !== -1 ? all[index] : null;

  // Merge: keep best values
  const merged: LevelProgress = {
    era:       incoming.era,
    level:     incoming.level,
    completed: incoming.completed || (existing?.completed ?? false),
    bestScore: Math.max(incoming.bestScore, existing?.bestScore ?? 0),
    bestTime:  existing?.bestTime
      ? Math.min(incoming.bestTime, existing.bestTime)
      : incoming.bestTime,
    bestMedal: mergeMedal(incoming.bestMedal, existing?.bestMedal),
    stars:     Math.max(incoming.stars, existing?.stars ?? 0),
    completedAt: incoming.completedAt ?? existing?.completedAt,
  };

  if (index !== -1) {
    all[index] = merged;
  } else {
    all.push(merged);
  }

  saveAllLevelProgress(all);
}

function medalRank(medal: TimeMedal | undefined): number {
  if (medal === 'gold')   return 3;
  if (medal === 'silver') return 2;
  if (medal === 'bronze') return 1;
  return 0;
}

function mergeMedal(a: TimeMedal, b: TimeMedal | undefined): TimeMedal {
  return medalRank(a) >= medalRank(b) ? a : b!;
}

export function getEraCompletionStatus(): Record<Difficulty, { levelsCompleted: number; maxLevel: number }> {
  const all = getAllLevelProgress();

  function eraStatus(era: Difficulty) {
    const eraProgress = all.filter((lp) => lp.era === era && lp.completed);
    const levelsCompleted = eraProgress.length;
    const maxLevel = eraProgress.reduce((max, lp) => Math.max(max, lp.level), 0);
    return { levelsCompleted, maxLevel };
  }

  return {
    [Difficulty.Easy]:   eraStatus(Difficulty.Easy),
    [Difficulty.Medium]: eraStatus(Difficulty.Medium),
    [Difficulty.Hard]:   eraStatus(Difficulty.Hard),
  };
}

// ── Legacy helpers ────────────────────────────────────────────────────────────

/**
 * Clear all data (for testing)
 */
export function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEADERBOARD_KEY);
    console.log('🗑️ Cleared all player and leaderboard data from localStorage');
  } catch (error) {
    console.error('Failed to clear data:', error);
  }
}

/**
 * Create test player (for debugging)
 */
export function createTestPlayer() {
  try {
    const testPlayer: LocalPlayerData = {
      telegramId: 452595366,
      playerName: 'Dan🐾',
      totalGames: 1,
      totalWins: 1,
      bestScore: 13680,
      averageScore: 13680,
      joinedAt: Date.now() - 3600000, // 1 hour ago
      lastPlayed: Date.now(),
    };
    
    const players = getAllPlayers();
    players.push(testPlayer);
    saveAllPlayers(players);
    
    // Add test leaderboard entry
    const entry: LocalLeaderboardEntry = {
      rank: 1,
      playerName: 'Dan🐾',
      telegramId: 452595366,
      score: 13680,
      difficulty: 'Modern Era',
      moves: 15,
      time: 120,
      achievedAt: Date.now(),
    };
    
    const leaderboard = getLeaderboard();
    leaderboard.push(entry);
    saveLeaderboard(leaderboard);
    
    console.log('✅ Test player created:', testPlayer);
    return testPlayer;
  } catch (error) {
    console.error('Failed to create test player:', error);
  }
}
