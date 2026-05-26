"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserDashboard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const gameStore_1 = require("../store/gameStore");
const api_1 = require("../lib/api");
const types_1 = require("../types");
const settings_1 = require("../store/settings");
const sounds_1 = require("../utils/sounds");
function formatCompactTime(timestamp) {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1)
        return 'Just now';
    if (minutes < 60)
        return `${minutes}m ago`;
    if (hours < 24)
        return `${hours}h ago`;
    if (days < 7)
        return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}
function UserDashboard() {
    const { telegramUser, playerName, theme, levelProgress, streak, relicRewards, newlyUnlockedAchievements } = (0, gameStore_1.useGameStore)();
    const [playerStats, setPlayerStats] = (0, react_1.useState)(null);
    const [topPlayers, setTopPlayers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [settings, setSettings] = (0, react_1.useState)(() => (0, settings_1.getPlayerSettings)());
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        async function load() {
            if (!telegramUser?.id) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const [statsResult, leaderboardResult] = await Promise.allSettled([
                    (0, api_1.fetchPlayerStats)(telegramUser.id),
                    (0, api_1.fetchLeaderboard)(8),
                ]);
                if (cancelled)
                    return;
                if (statsResult.status === 'fulfilled') {
                    setPlayerStats(statsResult.value);
                }
                if (leaderboardResult.status === 'fulfilled') {
                    setTopPlayers(leaderboardResult.value.entries);
                }
                if (statsResult.status === 'rejected' && leaderboardResult.status === 'rejected') {
                    setError('Could not load live dashboard data right now.');
                }
                else if (statsResult.status === 'rejected') {
                    setError('Profile stats are temporarily unavailable. Live leaderboard still loaded.');
                }
                else if (leaderboardResult.status === 'rejected') {
                    setError('Leaderboard snapshot is temporarily unavailable. Your profile still loaded.');
                }
            }
            catch (err) {
                if (cancelled)
                    return;
                setError(err.message || 'Failed to load dashboard');
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [telegramUser?.id]);
    const progressSummary = (0, react_1.useMemo)(() => {
        return types_1.DIFFICULTY_ORDER.map((era) => {
            const levels = types_1.ERA_LEVEL_CONFIGS[era];
            const completed = levelProgress.filter((entry) => entry.era === era && entry.completed).length;
            const bestUnlocked = levelProgress
                .filter((entry) => entry.era === era)
                .reduce((max, entry) => Math.max(max, entry.level), 0);
            return {
                era,
                meta: (0, types_1.getDifficultyMeta)(era),
                completed,
                total: levels.length,
                bestUnlocked,
                percent: Math.round((completed / levels.length) * 100),
            };
        });
    }, [levelProgress]);
    const totalCompletedLevels = levelProgress.filter((entry) => entry.completed).length;
    const totalLevels = progressSummary.reduce((sum, era) => sum + era.total, 0);
    const displayName = playerName || telegramUser?.first_name || 'Curator';
    const updateSetting = (key, value) => {
        const next = (0, settings_1.savePlayerSettings)({ [key]: value });
        setSettings(next);
        if (key === 'soundEnabled')
            sounds_1.soundManager.setEnabled(Boolean(value));
    };
    const themeAccent = {
        museum: {
            shell: 'from-slate-950 via-slate-900 to-amber-950/60',
            card: 'bg-white/5 border-white/10',
            text: 'text-amber-300',
            soft: 'text-amber-100/65',
            badge: 'bg-amber-500/10 border-amber-400/20 text-amber-200',
            line: 'from-amber-400 to-amber-600',
        },
        nature: {
            shell: 'from-slate-950 via-emerald-950/60 to-slate-900',
            card: 'bg-white/5 border-white/10',
            text: 'text-green-300',
            soft: 'text-green-100/65',
            badge: 'bg-green-500/10 border-green-400/20 text-green-200',
            line: 'from-green-400 to-emerald-600',
        },
        urban: {
            shell: 'from-zinc-950 via-zinc-900 to-cyan-950/50',
            card: 'bg-white/5 border-white/10',
            text: 'text-[#00ff88]',
            soft: 'text-white/60',
            badge: 'bg-[#00ff88]/10 border-[#00ff88]/20 text-[#9cffd1]',
            line: 'from-[#00ff88] to-[#00e5ff]',
        },
    }[theme];
    if (loading) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: `rounded-3xl border ${themeAccent.card} bg-gradient-to-br ${themeAccent.shell} p-8 text-center`, children: [(0, jsx_runtime_1.jsx)("p", { className: `text-sm font-semibold uppercase tracking-[0.25em] ${themeAccent.text}`, children: "Player Dashboard" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-4 text-white/70", children: "Loading your profile\u2026" })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: `rounded-3xl border ${themeAccent.card} bg-gradient-to-br ${themeAccent.shell} p-4 sm:p-6 space-y-6`, children: [(0, jsx_runtime_1.jsx)("section", { className: "rounded-3xl border border-white/10 bg-black/20 p-5 sm:p-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: `text-[11px] font-semibold uppercase tracking-[0.3em] ${themeAccent.text}`, children: "Player Dashboard" }), (0, jsx_runtime_1.jsx)("h2", { className: "mt-2 text-3xl sm:text-4xl font-black text-white", children: displayName }), (0, jsx_runtime_1.jsx)("p", { className: `mt-2 text-sm ${themeAccent.soft}`, children: playerStats?.display_name ?? telegramUser?.username ? `Signed in as ${playerStats?.display_name ?? `@${telegramUser?.username}`}` : 'Your live progression, streak, relics, and recent runs.' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: `rounded-full border px-3 py-1.5 text-xs font-semibold ${themeAccent.badge}`, children: ["\uD83D\uDD25 ", streak.currentStreak, "-day streak"] }), (0, jsx_runtime_1.jsxs)("span", { className: `rounded-full border px-3 py-1.5 text-xs font-semibold ${themeAccent.badge}`, children: ["\uD83C\uDFDB\uFE0F ", relicRewards.length, " relics"] }), (0, jsx_runtime_1.jsxs)("span", { className: `rounded-full border px-3 py-1.5 text-xs font-semibold ${themeAccent.badge}`, children: ["\u2705 ", totalCompletedLevels, "/", totalLevels, " levels cleared"] })] })] }) }), error && ((0, jsx_runtime_1.jsx)("div", { className: "rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300", children: error })), (0, jsx_runtime_1.jsx)("section", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: [
                    { label: 'Global Rank', value: playerStats?.rank ? `#${playerStats.rank}` : '—', note: 'Best score standing' },
                    { label: 'Best Score', value: playerStats?.best_score?.toLocaleString() ?? '0', note: 'Highest verified score' },
                    { label: 'Average Score', value: playerStats?.average_score?.toLocaleString() ?? '0', note: 'Across recorded runs' },
                    { label: 'Total Runs', value: playerStats?.total_games?.toLocaleString() ?? '0', note: 'Completed games' },
                ].map((card) => ((0, jsx_runtime_1.jsxs)("div", { className: `rounded-2xl border ${themeAccent.card} p-4`, children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] uppercase tracking-[0.22em] text-white/45", children: card.label }), (0, jsx_runtime_1.jsx)("p", { className: `mt-3 text-2xl font-black ${themeAccent.text}`, children: card.value }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-xs text-white/50", children: card.note })] }, card.label))) }), (0, jsx_runtime_1.jsxs)("section", { className: `rounded-3xl border ${themeAccent.card} p-5`, children: [(0, jsx_runtime_1.jsx)("p", { className: `text-[11px] font-semibold uppercase tracking-[0.25em] ${themeAccent.text}`, children: "Player Settings" }), (0, jsx_runtime_1.jsx)("h3", { className: "mt-1 text-xl font-bold text-white", children: "Comfort & Accessibility" }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4 grid gap-3 md:grid-cols-3", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => updateSetting('soundEnabled', !settings.soundEnabled), className: "rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-left", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-bold text-white", children: settings.soundEnabled ? '🔊 Sound On' : '🔇 Sound Off' }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-xs text-white/45", children: "Toggle in-game sound effects." })] }), (0, jsx_runtime_1.jsxs)("button", { onClick: () => updateSetting('reducedMotion', !settings.reducedMotion), className: "rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-left", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-bold text-white", children: settings.reducedMotion ? '🪶 Reduced Motion' : '✨ Full Motion' }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-xs text-white/45", children: "Shortens intro transitions and animation weight." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-white/10 bg-black/10 px-4 py-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-bold text-white", children: "\uD83E\uDDE0 Preview Length" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-3 flex flex-wrap gap-2", children: ['normal', 'long', 'very_long'].map((option) => ((0, jsx_runtime_1.jsx)("button", { onClick: () => updateSetting('previewLength', option), className: `rounded-full px-3 py-1.5 text-xs font-semibold ${settings.previewLength === option
                                                ? `${themeAccent.badge}`
                                                : 'border border-white/10 bg-black/10 text-white/65'}`, children: option === 'normal' ? 'Normal' : option === 'long' ? 'Longer' : 'Very Long' }, option))) })] })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "grid gap-6 xl:grid-cols-[1.2fr_0.8fr]", children: [(0, jsx_runtime_1.jsxs)("div", { className: `rounded-3xl border ${themeAccent.card} p-5`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: `text-[11px] font-semibold uppercase tracking-[0.25em] ${themeAccent.text}`, children: "Progress Map" }), (0, jsx_runtime_1.jsx)("h3", { className: "mt-1 text-xl font-bold text-white", children: "Era Completion" })] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-white/50", children: [totalCompletedLevels, "/", totalLevels, " levels mastered"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-5 space-y-4", children: progressSummary.map((era) => ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-white/10 bg-black/10 p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("p", { className: "font-bold text-white", children: [era.meta.icon, " ", era.meta.label] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-white/45", children: [era.completed, "/", era.total, " levels complete", era.bestUnlocked > 0 ? ` · highest unlocked ${era.bestUnlocked}` : ' · not started'] })] }), (0, jsx_runtime_1.jsxs)("div", { className: `text-sm font-bold ${themeAccent.text}`, children: [era.percent, "%"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-3 h-2 rounded-full bg-white/10 overflow-hidden", children: (0, jsx_runtime_1.jsx)("div", { className: `h-full rounded-full bg-gradient-to-r ${themeAccent.line}`, style: { width: `${era.percent}%` } }) })] }, era.era))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: `rounded-3xl border ${themeAccent.card} p-5`, children: [(0, jsx_runtime_1.jsx)("p", { className: `text-[11px] font-semibold uppercase tracking-[0.25em] ${themeAccent.text}`, children: "Relics & Achievements" }), (0, jsx_runtime_1.jsx)("h3", { className: "mt-1 text-xl font-bold text-white", children: "Collection" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4 flex flex-wrap gap-2", children: relicRewards.length > 0 ? relicRewards.map((relic) => ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white/75", children: [(0, jsx_runtime_1.jsx)("span", { className: "mr-1.5", children: relic.icon }), (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-white", children: relic.name })] }, relic.id))) : ((0, jsx_runtime_1.jsx)("p", { className: "text-sm text-white/45", children: "No relics unlocked yet. Boss clears with strong scores will add them here." })) }), newlyUnlockedAchievements.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-semibold uppercase tracking-[0.2em] text-amber-300", children: "Latest Achievements" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 flex flex-wrap gap-2", children: newlyUnlockedAchievements.map((achievement) => ((0, jsx_runtime_1.jsxs)("span", { className: "rounded-full bg-black/20 px-2.5 py-1 text-xs text-white/80", children: [achievement.icon, " ", achievement.name] }, achievement.id))) })] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: `rounded-3xl border ${themeAccent.card} p-5`, children: [(0, jsx_runtime_1.jsx)("p", { className: `text-[11px] font-semibold uppercase tracking-[0.25em] ${themeAccent.text}`, children: "Top Players" }), (0, jsx_runtime_1.jsx)("h3", { className: "mt-1 text-xl font-bold text-white", children: "Live Hall of Fame" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4 space-y-3", children: topPlayers.length > 0 ? topPlayers.slice(0, 5).map((entry) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("p", { className: "font-semibold text-white", children: ["#", entry.rank, " ", entry.display_name] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-white/45", children: [entry.total_games, " runs \u00B7 ", entry.total_wins, " wins"] })] }), (0, jsx_runtime_1.jsx)("div", { className: `text-sm font-bold ${themeAccent.text}`, children: entry.best_score.toLocaleString() })] }, entry.telegram_id))) : ((0, jsx_runtime_1.jsx)("p", { className: "text-sm text-white/45", children: "Leaderboard data will appear here after scores are submitted." })) })] })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: `rounded-3xl border ${themeAccent.card} p-5`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: `text-[11px] font-semibold uppercase tracking-[0.25em] ${themeAccent.text}`, children: "Recent Runs" }), (0, jsx_runtime_1.jsx)("h3", { className: "mt-1 text-xl font-bold text-white", children: "Your latest sessions" })] }), playerStats?.last_active && ((0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-white/45", children: ["Last active ", formatCompactTime(playerStats.last_active)] }))] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3", children: playerStats?.recentGames?.length ? playerStats.recentGames.map((game) => {
                            const difficulty = (0, types_1.getDifficultyMeta)(game.difficulty);
                            const stars = '⭐'.repeat(game.stars) + '☆'.repeat(Math.max(0, 3 - game.stars));
                            return ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-white/10 bg-black/10 p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("p", { className: "font-bold text-white", children: [difficulty.icon, " ", difficulty.shortLabel] }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-white/45", children: formatCompactTime(game.played_at) })] }), (0, jsx_runtime_1.jsx)("p", { className: `mt-3 text-xl font-black ${themeAccent.text}`, children: game.score.toLocaleString() }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-xs text-white/50", children: [game.moves, " moves \u00B7 ", game.time_seconds, "s"] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-sm text-white/80", children: stars })] }, game.id));
                        }) : ((0, jsx_runtime_1.jsx)("div", { className: "rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/45", children: "Finish a few runs and your recent sessions will appear here." })) })] })] }));
}
