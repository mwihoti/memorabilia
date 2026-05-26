"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DailyChallengeCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const gameStore_1 = require("../store/gameStore");
const types_1 = require("../types");
const dailyChallenge_1 = require("../store/dailyChallenge");
function getTimeUntilMidnight() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const diff = Math.floor((next.getTime() - now.getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
const ERA_INFO = {
    [types_1.Difficulty.Easy]: { icon: '🏺', label: 'Ancient Era' },
    [types_1.Difficulty.Medium]: { icon: '⚔️', label: 'Medieval Times' },
    [types_1.Difficulty.Hard]: { icon: '🚀', label: 'Modern Era' },
    [types_1.Difficulty.Expert]: { icon: '🛸', label: 'Future Nexus' },
    [types_1.Difficulty.Master]: { icon: '🐲', label: 'Mythic Vault' },
};
function DailyChallengeCard({ onPlay, onPlayWeekly }) {
    const { theme } = (0, gameStore_1.useGameStore)();
    const [countdown, setCountdown] = (0, react_1.useState)(getTimeUntilMidnight());
    const [challenge] = (0, react_1.useState)(() => (0, dailyChallenge_1.loadDailyChallenge)());
    const [config] = (0, react_1.useState)(() => (0, dailyChallenge_1.getDailyChallengeConfig)());
    const [weeklyChallenge] = (0, react_1.useState)(() => (0, dailyChallenge_1.loadWeeklyChallenge)());
    const [weeklyConfig] = (0, react_1.useState)(() => (0, dailyChallenge_1.getWeeklyChallengeConfig)());
    (0, react_1.useEffect)(() => {
        const id = setInterval(() => setCountdown(getTimeUntilMidnight()), 1000);
        return () => clearInterval(id);
    }, []);
    const themeAccent = {
        museum: { border: 'border-amber-500/30', header: 'from-amber-500/20 to-amber-700/10', btn: 'from-amber-500 to-amber-700 hover:from-amber-400', text: 'text-amber-400', badge: 'bg-amber-500 text-amber-900' },
        nature: { border: 'border-green-500/30', header: 'from-green-500/20 to-green-700/10', btn: 'from-green-500 to-green-700 hover:from-green-400', text: 'text-green-400', badge: 'bg-green-500 text-green-900' },
        urban: { border: 'border-[#00ff88]/30', header: 'from-[#00ff88]/20 to-[#00e5ff]/10', btn: 'from-[#00ff88] to-[#00e5ff] hover:from-[#00e5ff]', text: 'text-[#00ff88]', badge: 'bg-[#00ff88] text-zinc-900' },
    }[theme];
    const eraInfo = ERA_INFO[config.difficulty];
    const levelLabel = types_1.ERA_LEVEL_CONFIGS[config.difficulty][config.level - 1]?.label ?? `Level ${config.level}`;
    const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const completed = challenge.completed;
    const weeklyEraInfo = ERA_INFO[weeklyConfig.difficulty];
    const weeklyLevelLabel = types_1.ERA_LEVEL_CONFIGS[weeklyConfig.difficulty][weeklyConfig.level - 1]?.label ?? `Level ${weeklyConfig.level}`;
    return ((0, jsx_runtime_1.jsxs)("div", { className: `rounded-2xl border-2 ${themeAccent.border} overflow-hidden shadow-lg mb-4`, children: [(0, jsx_runtime_1.jsxs)("div", { className: `bg-gradient-to-r ${themeAccent.header} px-4 py-3 flex items-center justify-between`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xl", children: "\uD83D\uDCC5" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: `text-xs font-extrabold uppercase tracking-widest ${themeAccent.text}`, children: "Daily Challenge" }), (0, jsx_runtime_1.jsx)("p", { className: "text-white font-bold text-sm leading-tight", children: todayStr })] })] }), (0, jsx_runtime_1.jsx)("span", { className: `text-[10px] font-extrabold px-2.5 py-1 rounded-full ${themeAccent.badge}`, children: "+500 pts" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-[#1e293b] px-4 py-3 space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl border border-white/10", children: eraInfo.icon }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "font-bold text-white text-sm", children: eraInfo.label }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-white/50", children: [eraInfo.label, " \u00B7 ", levelLabel] })] })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-white/40", children: "Same puzzle for all players today" }), completed ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 py-2 px-3 bg-green-500/10 border border-green-500/25 rounded-xl", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-2xl", children: "\u2705" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-bold text-green-400", children: "COMPLETED" }), challenge.score !== undefined && ((0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-white/50", children: ["Score: ", challenge.score.toLocaleString(), " pts"] }))] })] })) : ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.button, { onClick: onPlay, className: `w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r ${themeAccent.btn} text-white shadow-md transition-all`, whileTap: { scale: 0.97 }, animate: { boxShadow: ['0 0 0px rgba(0,0,0,0)', '0 0 14px rgba(251,191,36,0.35)', '0 0 0px rgba(0,0,0,0)'] }, transition: { duration: 2, repeat: Infinity }, children: "Play Daily Seed" })), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-white/10 bg-white/5 p-3 space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[10px] uppercase tracking-widest text-white/40", children: "Weekly Ladder" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm font-bold text-white", children: [weeklyEraInfo.label, " \u00B7 ", weeklyLevelLabel] })] }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs px-2 py-1 rounded-full bg-white/10 text-white/70", children: weeklyConfig.weekKey })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-white/40", children: "One fixed seed all week. Share the result and challenge friends." }), weeklyChallenge.completed ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 text-xs text-green-300", children: [(0, jsx_runtime_1.jsx)("span", { children: "\uD83C\uDFC1" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Best this week: ", weeklyChallenge.score?.toLocaleString() ?? 0, " pts"] })] })) : ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.button, { onClick: onPlayWeekly, className: "w-full py-2.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white transition-all", whileTap: { scale: 0.97 }, children: "Play Weekly Ladder" }))] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[10px] text-white/30 text-center", children: ["Resets in ", countdown] })] })] }));
}
