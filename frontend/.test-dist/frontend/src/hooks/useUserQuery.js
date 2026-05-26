"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLeaderboardStatsQuery = exports.useActiveUsersQuery = exports.usePlayerStatsQuery = exports.useLeaderboardQuery = exports.useUserQuery = void 0;
const react_1 = require("react");
const toriiClient_1 = require("../dojo/toriiClient");
/**
 * Hook to fetch all registered users from the Dojo world
 */
const useUserQuery = () => {
    const [allUsers, setAllUsers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const users = await (0, toriiClient_1.queryUserAccounts)({ limit: 1000 });
            setAllUsers(users);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch users');
            console.error('User query error:', err);
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchUsers();
    }, []);
    return {
        allUsers,
        loading,
        error,
        refetch: fetchUsers,
    };
};
exports.useUserQuery = useUserQuery;
/**
 * Hook to fetch top players from leaderboard
 */
const useLeaderboardQuery = (limit = 100) => {
    const [topPlayers, setTopPlayers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchLeaderboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const entries = await (0, toriiClient_1.queryLeaderboard)({ limit });
            setTopPlayers(entries);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
            console.error('Leaderboard query error:', err);
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchLeaderboard();
    }, [limit]);
    return {
        topPlayers,
        loading,
        error,
        refetch: fetchLeaderboard,
    };
};
exports.useLeaderboardQuery = useLeaderboardQuery;
/**
 * Hook to fetch player stats for multiple players
 */
const usePlayerStatsQuery = (playerAddresses) => {
    const [playerStats, setPlayerStats] = (0, react_1.useState)(new Map());
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchPlayerStats = async () => {
        if (playerAddresses.length === 0) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const statsMap = new Map();
            // Fetch stats for each player
            await Promise.all(playerAddresses.map(async (address) => {
                try {
                    const stats = await (0, toriiClient_1.queryPlayerStats)(address);
                    if (stats) {
                        statsMap.set(address, stats);
                    }
                }
                catch (err) {
                    console.error(`Failed to fetch stats for ${address}:`, err);
                }
            }));
            setPlayerStats(statsMap);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch player stats');
            console.error('Player stats query error:', err);
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        if (playerAddresses.length > 0) {
            fetchPlayerStats();
        }
    }, [playerAddresses.join(',')]); // Join to create stable dependency
    return {
        playerStats,
        loading,
        error,
        refetch: fetchPlayerStats,
    };
};
exports.usePlayerStatsQuery = usePlayerStatsQuery;
/**
 * Hook to fetch active users (last 24 hours)
 */
const useActiveUsersQuery = () => {
    const [activeUsers, setActiveUsers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchActiveUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const users = await (0, toriiClient_1.queryActiveUsers)();
            setActiveUsers(users);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch active users');
            console.error('Active users query error:', err);
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchActiveUsers();
        // Refresh every 5 minutes
        const interval = setInterval(fetchActiveUsers, 300000);
        return () => clearInterval(interval);
    }, []);
    return {
        activeUsers,
        loading,
        error,
        refetch: fetchActiveUsers,
    };
};
exports.useActiveUsersQuery = useActiveUsersQuery;
/**
 * Hook to fetch leaderboard statistics
 */
const useLeaderboardStatsQuery = () => {
    const [stats, setStats] = (0, react_1.useState)({
        totalPlayers: 0,
        totalGames: 0,
        averageScore: 0,
        highestScore: 0,
    });
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const leaderboardStats = await (0, toriiClient_1.getLeaderboardStats)();
            setStats(leaderboardStats);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard stats');
            console.error('Leaderboard stats query error:', err);
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchStats();
        // Refresh every 10 minutes
        const interval = setInterval(fetchStats, 600000);
        return () => clearInterval(interval);
    }, []);
    return {
        stats,
        loading,
        error,
        refetch: fetchStats,
    };
};
exports.useLeaderboardStatsQuery = useLeaderboardStatsQuery;
