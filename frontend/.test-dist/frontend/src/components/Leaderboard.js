"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Leaderboard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const api_1 = require("../lib/api");
function Leaderboard({ onBack }) {
    const [entries, setEntries] = (0, react_1.useState)([]);
    const [total, setTotal] = (0, react_1.useState)(0);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [lastUpdated, setLastUpdated] = (0, react_1.useState)(null);
    const [filter, setFilter] = (0, react_1.useState)('all');
    const load = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await (0, api_1.fetchLeaderboard)(100);
            setEntries(data.entries);
            setTotal(data.total);
            setLastUpdated(data.updatedAt);
        }
        catch (err) {
            setError(err.message || 'Failed to load leaderboard');
        }
        finally {
            setLoading(false);
        }
    }, []);
    (0, react_1.useEffect)(() => {
        load();
        // Auto-refresh every 30s
        const interval = setInterval(load, 30_000);
        return () => clearInterval(interval);
    }, [load]);
    const formatTime = (iso) => {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60_000);
        const hours = Math.floor(diff / 3_600_000);
        const days = Math.floor(diff / 86_400_000);
        if (mins < 1)
            return 'just now';
        if (mins < 60)
            return `${mins}m ago`;
        if (hours < 24)
            return `${hours}h ago`;
        return `${days}d ago`;
    };
    const getRankEmoji = (rank) => {
        if (rank === 1)
            return '🥇';
        if (rank === 2)
            return '🥈';
        if (rank === 3)
            return '🥉';
        return `#${rank}`;
    };
    const difficultyLabel = (d) => {
        if (d === 1)
            return { label: 'Ancient', cls: 'bg-museum-bronze-600' };
        if (d === 2)
            return { label: 'Medieval', cls: 'bg-museum-stone-600' };
        return { label: 'Modern', cls: 'bg-museum-blue-600' };
    };
    // Neon leaderboard is by best_score across all difficulties
    // Filter tabs are informational only (show difficulty breakdown from recent games)
    const displayed = entries;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "max-w-4xl mx-auto", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-8", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-4xl font-bold bg-gradient-to-r from-museum-gold-400 to-museum-bronze-500 bg-clip-text text-transparent mb-2", children: "\uD83C\uDFC6 Hall of Fame" }), (0, jsx_runtime_1.jsx)("p", { className: "text-museum-stone-400", children: total > 0 ? `${total} collectors competing` : 'Top collectors and their finest exhibitions' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: load, disabled: loading, className: "px-4 py-2 bg-museum-blue-600 hover:bg-museum-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors", title: "Refresh leaderboard", children: [loading ? '⏳' : '🔄', " Refresh"] }), (0, jsx_runtime_1.jsx)("button", { onClick: onBack, className: "px-6 py-3 bg-museum-stone-700 hover:bg-museum-stone-600 rounded-xl font-medium transition-colors", children: "\u2190 Back" })] })] }), lastUpdated && ((0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-museum-stone-500 mb-4", children: ["Last updated ", formatTime(lastUpdated), " \u00B7 auto-refreshes every 30s"] })), error && ((0, jsx_runtime_1.jsxs)("div", { className: "mb-6 p-4 bg-red-900/20 border border-red-600/50 rounded-lg text-red-400", children: ["\u26A0\uFE0F ", error] })), loading && entries.length === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: Array.from({ length: 5 }).map((_, i) => ((0, jsx_runtime_1.jsx)("div", { className: "h-16 bg-museum-stone-800/50 rounded-xl animate-pulse" }, i))) })), entries.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "bg-museum-stone-800/50 backdrop-blur-lg rounded-2xl overflow-hidden border border-museum-bronze-400/20", children: (0, jsx_runtime_1.jsx)("div", { className: "overflow-x-auto", children: (0, jsx_runtime_1.jsxs)("table", { className: "w-full", children: [(0, jsx_runtime_1.jsx)("thead", { className: "bg-museum-stone-900/50", children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { className: "px-6 py-4 text-left text-sm font-semibold text-museum-stone-400", children: "Rank" }), (0, jsx_runtime_1.jsx)("th", { className: "px-6 py-4 text-left text-sm font-semibold text-museum-stone-400", children: "Collector" }), (0, jsx_runtime_1.jsx)("th", { className: "px-6 py-4 text-left text-sm font-semibold text-museum-stone-400", children: "Best Score" }), (0, jsx_runtime_1.jsx)("th", { className: "px-6 py-4 text-left text-sm font-semibold text-museum-stone-400", children: "Games" }), (0, jsx_runtime_1.jsx)("th", { className: "px-6 py-4 text-left text-sm font-semibold text-museum-stone-400", children: "Wins" }), (0, jsx_runtime_1.jsx)("th", { className: "px-6 py-4 text-left text-sm font-semibold text-museum-stone-400", children: "Last Seen" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { className: "divide-y divide-museum-stone-700", children: displayed.map((entry) => ((0, jsx_runtime_1.jsxs)("tr", { className: `hover:bg-museum-stone-700/30 transition-colors ${entry.rank <= 3 ? 'bg-museum-gold-500/5' : ''}`, children: [(0, jsx_runtime_1.jsx)("td", { className: "px-6 py-4", children: (0, jsx_runtime_1.jsx)("div", { className: "text-2xl font-bold", children: getRankEmoji(entry.rank) }) }), (0, jsx_runtime_1.jsxs)("td", { className: "px-6 py-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "font-medium text-white", children: entry.display_name }), entry.username && entry.first_name && ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-museum-stone-500", children: entry.first_name }))] }), (0, jsx_runtime_1.jsx)("td", { className: "px-6 py-4", children: (0, jsx_runtime_1.jsx)("div", { className: "text-xl font-bold text-museum-gold-400", children: entry.best_score.toLocaleString() }) }), (0, jsx_runtime_1.jsx)("td", { className: "px-6 py-4", children: (0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: entry.total_games }) }), (0, jsx_runtime_1.jsx)("td", { className: "px-6 py-4", children: (0, jsx_runtime_1.jsx)("span", { className: "font-medium text-green-400", children: entry.total_wins }) }), (0, jsx_runtime_1.jsx)("td", { className: "px-6 py-4", children: (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-museum-stone-400", children: formatTime(entry.last_active) }) })] }, entry.telegram_id))) })] }) }) })), !loading && entries.length === 0 && !error && ((0, jsx_runtime_1.jsxs)("div", { className: "text-center py-12", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-6xl mb-4", children: "\uD83C\uDFDB\uFE0F" }), (0, jsx_runtime_1.jsx)("h3", { className: "text-2xl font-bold mb-2", children: "No Exhibitions Yet" }), (0, jsx_runtime_1.jsx)("p", { className: "text-museum-stone-400", children: "Be the first to complete a collection and claim the top spot!" })] }))] }));
}
