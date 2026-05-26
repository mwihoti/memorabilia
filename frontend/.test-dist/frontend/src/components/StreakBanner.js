"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StreakBanner;
const jsx_runtime_1 = require("react/jsx-runtime");
const framer_motion_1 = require("framer-motion");
const gameStore_1 = require("../store/gameStore");
function StreakBanner() {
    const { streak, theme } = (0, gameStore_1.useGameStore)();
    const { currentStreak, shieldsAvailable, multiplierBonus } = streak;
    const themeAccent = {
        museum: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', badge: 'bg-amber-500 text-amber-900' },
        nature: { bg: 'bg-green-500/10 border-green-500/20', text: 'text-green-400', badge: 'bg-green-500 text-green-900' },
        urban: { bg: 'bg-[#00ff88]/10 border-[#00ff88]/20', text: 'text-[#00ff88]', badge: 'bg-[#00ff88] text-zinc-900' },
    }[theme];
    const multiplierLabel = multiplierBonus >= 1.0 ? '+100% score' :
        multiplierBonus >= 0.5 ? '+50% score' :
            multiplierBonus >= 0.25 ? '+25% score' : null;
    const highStreak = currentStreak >= 7;
    return ((0, jsx_runtime_1.jsxs)("div", { className: `flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border ${themeAccent.bg} mb-4`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.span, { className: "text-xl leading-none", animate: highStreak ? {
                            scale: [1, 1.15, 1],
                            filter: ['drop-shadow(0 0 0px #f97316)', 'drop-shadow(0 0 8px #f97316)', 'drop-shadow(0 0 0px #f97316)'],
                        } : {}, transition: highStreak ? { duration: 1.8, repeat: Infinity } : {}, children: "\uD83D\uDD25" }), currentStreak > 0 ? ((0, jsx_runtime_1.jsxs)("span", { className: `text-sm font-bold ${themeAccent.text}`, children: [currentStreak, " day streak!"] })) : ((0, jsx_runtime_1.jsx)("span", { className: "text-sm text-white/50 font-medium", children: "Start your streak today!" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [shieldsAvailable > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-0.5", children: Array.from({ length: shieldsAvailable }).map((_, i) => ((0, jsx_runtime_1.jsx)("span", { className: "text-sm", children: "\uD83D\uDEE1\uFE0F" }, i))) })), multiplierLabel && ((0, jsx_runtime_1.jsx)("span", { className: `text-[10px] font-extrabold px-2 py-0.5 rounded-full ${themeAccent.badge}`, children: multiplierLabel }))] })] }));
}
