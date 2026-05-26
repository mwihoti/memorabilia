"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AchievementToast;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
function AchievementToast({ achievements, onDismiss }) {
    const [toasts, setToasts] = (0, react_1.useState)([]);
    // Whenever new achievements arrive, push them into the queue (max 3)
    (0, react_1.useEffect)(() => {
        if (achievements.length === 0)
            return;
        const incoming = achievements.map((a) => ({
            achievement: a,
            id: `${a.id}-${Date.now()}-${Math.random()}`,
        }));
        setToasts((prev) => [...prev, ...incoming].slice(-3));
    }, [achievements]);
    // Auto-dismiss each toast after 4 seconds
    (0, react_1.useEffect)(() => {
        if (toasts.length === 0)
            return;
        const timers = toasts.map((t) => setTimeout(() => {
            setToasts((prev) => prev.filter((item) => item.id !== t.id));
        }, 4000));
        return () => timers.forEach(clearTimeout);
    }, [toasts]);
    // When all toasts are gone, notify parent so it can clear the queue
    (0, react_1.useEffect)(() => {
        if (toasts.length === 0 && achievements.length > 0) {
            onDismiss();
        }
    }, [toasts, achievements, onDismiss]);
    return ((0, jsx_runtime_1.jsx)("div", { className: "fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none", children: (0, jsx_runtime_1.jsx)(framer_motion_1.AnimatePresence, { mode: "sync", children: toasts.map((item) => ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { x: 100, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 100, opacity: 0 }, transition: { type: 'spring', stiffness: 280, damping: 28 }, className: "pointer-events-auto w-72 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-600" }), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 flex items-start gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex-shrink-0 w-12 h-12 bg-amber-500/15 border border-amber-500/25 rounded-xl flex items-center justify-center text-2xl", children: item.achievement.icon }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-w-0", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2 mb-0.5", children: (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-extrabold uppercase tracking-widest text-amber-400", children: "UNLOCKED!" }) }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm font-bold text-white leading-tight truncate", children: item.achievement.name }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-white/50 leading-snug mt-0.5", children: item.achievement.description }), item.achievement.reward && ((0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-amber-300 mt-1", children: ["\uD83C\uDF81 Unlocked: ", item.achievement.reward.replace(/_/g, ' ')] }))] })] })] }, item.id))) }) }));
}
