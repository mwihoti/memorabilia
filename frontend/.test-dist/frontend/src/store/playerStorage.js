"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreatePlayer = getOrCreatePlayer;
exports.addGameScore = addGameScore;
exports.getAllPlayers = getAllPlayers;
exports.getLeaderboard = getLeaderboard;
exports.getLeaderboardPage = getLeaderboardPage;
exports.getLeaderboardStats = getLeaderboardStats;
exports.getAllLevelProgress = getAllLevelProgress;
exports.getLevelProgress = getLevelProgress;
exports.saveLevelProgress = saveLevelProgress;
exports.getEraCompletionStatus = getEraCompletionStatus;
exports.getRelicRewards = getRelicRewards;
exports.saveRelicReward = saveRelicReward;
// Local storage for player scores and stats in demo mode
const types_1 = require("../types");
const STORAGE_KEY = 'memorabilia_player_data';
const LEADERBOARD_KEY = 'memorabilia_leaderboard';
const LEVEL_PROGRESS_KEY = 'memorabilia_level_progress';
const RELIC_REWARDS_KEY = 'memorabilia_relic_rewards';
/**
 * Get or create player data
 */
function getOrCreatePlayer(telegramId, playerName) {
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
function addGameScore(telegramId, playerName, score, difficulty, moves, timeSeconds, isWin) {
    try {
        // Update player stats
        const players = getAllPlayers();
        let playerIndex = players.findIndex((p) => p.telegramId === telegramId);
        let player;
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
        }
        else {
            // Existing player
            player = players[playerIndex];
            player.totalGames += 1;
            if (isWin) {
                player.totalWins += 1;
            }
            if (score > player.bestScore) {
                player.bestScore = score;
            }
            player.averageScore = Math.round((player.averageScore * (player.totalGames - 1) + score) / player.totalGames);
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
    }
    catch (error) {
        console.error('❌ Failed to save game score:', error);
    }
}
/**
 * Add score to leaderboard
 */
function addToLeaderboard(telegramId, playerName, score, difficulty, moves, timeSeconds) {
    const leaderboard = getLeaderboard();
    const entry = {
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
function getAllPlayers() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        const players = data ? JSON.parse(data) : [];
        console.log('📂 getAllPlayers() - Retrieved', players.length, 'players from localStorage:', players);
        return players;
    }
    catch (error) {
        console.error('Failed to get players:', error);
        return [];
    }
}
/**
 * Get leaderboard
 */
function getLeaderboard() {
    try {
        const data = localStorage.getItem(LEADERBOARD_KEY);
        return data ? JSON.parse(data) : [];
    }
    catch (error) {
        console.error('Failed to get leaderboard:', error);
        return [];
    }
}
/**
 * Get leaderboard with pagination
 */
function getLeaderboardPage(limit = 100, offset = 0) {
    const leaderboard = getLeaderboard();
    return leaderboard.slice(offset, offset + limit);
}
/**
 * Save all players to storage
 */
function saveAllPlayers(players) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    }
    catch (error) {
        console.error('Failed to save players:', error);
    }
}
/**
 * Save leaderboard to storage
 */
function saveLeaderboard(leaderboard) {
    try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    }
    catch (error) {
        console.error('Failed to save leaderboard:', error);
    }
}
/**
 * Get difficulty name from number
 */
function getDifficultyName(difficulty) {
    return (0, types_1.getDifficultyMeta)(difficulty)?.label ?? 'Unknown';
}
/**
 * Get leaderboard stats
 */
function getLeaderboardStats() {
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
        averageScore: Math.round(leaderboard.reduce((sum, e) => sum + e.score, 0) / leaderboard.length),
        highestScore: leaderboard[0]?.score || 0,
    };
}
// ── Level Progress ────────────────────────────────────────────────────────────
function getAllLevelProgress() {
    try {
        const data = localStorage.getItem(LEVEL_PROGRESS_KEY);
        const parsed = data ? JSON.parse(data) : [];
        return parsed.map(({ highestStageCompleted: _unused, ...entry }) => entry);
    }
    catch {
        return [];
    }
}
function saveAllLevelProgress(progress) {
    try {
        localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(progress));
    }
    catch (error) {
        console.error('Failed to save level progress:', error);
    }
}
function getLevelProgress(era, level) {
    const all = getAllLevelProgress();
    return all.find((lp) => lp.era === era && lp.level === level) ?? null;
}
function saveLevelProgress(incoming) {
    const all = getAllLevelProgress();
    const index = all.findIndex((lp) => lp.era === incoming.era && lp.level === incoming.level);
    const existing = index !== -1 ? all[index] : null;
    // Merge: keep best values
    const merged = {
        era: incoming.era,
        level: incoming.level,
        completed: incoming.completed || (existing?.completed ?? false),
        bestScore: Math.max(incoming.bestScore, existing?.bestScore ?? 0),
        bestTime: existing?.bestTime
            ? Math.min(incoming.bestTime, existing.bestTime)
            : incoming.bestTime,
        bestMedal: mergeMedal(incoming.bestMedal, existing?.bestMedal),
        stars: Math.max(incoming.stars, existing?.stars ?? 0),
        completedAt: incoming.completedAt ?? existing?.completedAt,
    };
    if (index !== -1) {
        all[index] = merged;
    }
    else {
        all.push(merged);
    }
    saveAllLevelProgress(all);
}
function medalRank(medal) {
    if (medal === 'gold')
        return 3;
    if (medal === 'silver')
        return 2;
    if (medal === 'bronze')
        return 1;
    return 0;
}
function mergeMedal(a, b) {
    return medalRank(a) >= medalRank(b) ? a : b;
}
function getEraCompletionStatus() {
    const all = getAllLevelProgress();
    function eraStatus(era) {
        const eraProgress = all.filter((lp) => lp.era === era && lp.completed);
        const levelsCompleted = eraProgress.length;
        const maxLevel = eraProgress.reduce((max, lp) => Math.max(max, lp.level), 0);
        return { levelsCompleted, maxLevel };
    }
    return Object.fromEntries(types_1.DIFFICULTY_ORDER.map((era) => [era, eraStatus(era)]));
}
function getRelicRewards() {
    try {
        const data = localStorage.getItem(RELIC_REWARDS_KEY);
        return data ? JSON.parse(data) : [];
    }
    catch {
        return [];
    }
}
function saveRelicReward(reward) {
    const all = getRelicRewards();
    if (all.some((entry) => entry.id === reward.id))
        return;
    try {
        localStorage.setItem(RELIC_REWARDS_KEY, JSON.stringify([...all, reward]));
    }
    catch (error) {
        console.error('Failed to save relic reward:', error);
    }
}
