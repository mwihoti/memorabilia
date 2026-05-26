"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DifficultySelector;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const gameStore_1 = require("../store/gameStore");
const types_1 = require("../types");
const telegram_1 = require("../telegram/telegram");
const THEMES = [
    { id: 'museum', label: 'Museum', icon: '🏛️', desc: 'Classic gold & amber' },
    { id: 'nature', label: 'Nature', icon: '🌿', desc: 'Forest green & earth' },
    { id: 'urban', label: 'Urban', icon: '🎨', desc: 'Neon graffiti streets' },
];
function DifficultySelector({ onStart, onSwitchToLevels }) {
    const [selectedDifficulty, setSelectedDifficulty] = (0, react_1.useState)(null);
    const { startNewGame, isGameLoading, playerName, telegramUser, theme, setTheme } = (0, gameStore_1.useGameStore)();
    const displayName = playerName || telegramUser?.first_name || 'Curator';
    const handleSelectDifficulty = (difficulty) => {
        (0, telegram_1.hapticImpact)('light');
        setSelectedDifficulty(difficulty);
    };
    const handleStart = async () => {
        if (!selectedDifficulty || isGameLoading)
            return;
        (0, telegram_1.hapticImpact)('medium');
        await startNewGame(selectedDifficulty);
        onStart();
    };
    const difficulties = types_1.DIFFICULTY_ORDER.map((difficulty) => {
        const meta = (0, types_1.getDifficultyMeta)(difficulty);
        const config = types_1.GAME_CONFIGS[difficulty];
        return {
            level: difficulty,
            name: meta.label,
            emoji: meta.icon,
            description: `${config.pairCount} artifacts · ${config.cardCount} cards`,
            time: `~${Math.max(2, Math.ceil(config.cardCount / 5))} min`,
        };
    });
    const themeAccent = {
        museum: { text: 'text-amber-400', border: 'border-amber-500', ring: 'ring-amber-500/40', cta: 'from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600', ctaDisabled: 'bg-slate-700 text-slate-500', selected: 'border-amber-400 bg-amber-500/10' },
        nature: { text: 'text-green-400', border: 'border-green-500', ring: 'ring-green-500/40', cta: 'from-green-500 to-green-700 hover:from-green-400 hover:to-green-600', ctaDisabled: 'bg-[#14532d] text-green-800', selected: 'border-green-400 bg-green-500/10' },
        urban: { text: 'text-[#00ff88]', border: 'border-[#00ff88]', ring: 'ring-[#00ff88]/30', cta: 'from-[#00ff88] to-[#00e5ff] hover:from-[#00e5ff] hover:to-[#00ff88]', ctaDisabled: 'bg-zinc-800 text-zinc-600', selected: 'border-[#00ff88] bg-[#00ff88]/5' },
    }[theme];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "max-w-2xl mx-auto", children: [onSwitchToLevels && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, className: "mb-5 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/15 bg-white/5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 text-sm text-white/70", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2B06\uFE0F" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Try the new ", (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-white", children: "Level System" }), "!"] })] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { (0, telegram_1.hapticImpact)('light'); onSwitchToLevels(); }, className: `flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-gradient-to-r ${themeAccent.cta} text-white`, children: "Switch" })] })), (0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "text-center mb-6", children: [(0, jsx_runtime_1.jsxs)("p", { className: `${themeAccent.text} text-xs font-semibold tracking-wider uppercase mb-1`, children: ["Welcome back, ", displayName, "!"] }), (0, jsx_runtime_1.jsx)("h2", { className: "text-3xl sm:text-4xl font-bold mb-2", style: { color: 'var(--theme-text)' }, children: "Choose Your Era" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm", style: { color: 'var(--theme-muted)' }, children: "Select a time period to discover artifacts" })] }), (0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.1 }, className: "mb-6", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-semibold uppercase tracking-wider mb-2.5", style: { color: 'var(--theme-muted)' }, children: "Visual Theme" }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-3 gap-2", children: THEMES.map((t) => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => { (0, telegram_1.hapticImpact)('light'); setTheme(t.id); }, className: `
                flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-200
                ${theme === t.id
                                ? `${themeAccent.selected} ring-2 ${themeAccent.ring} scale-105`
                                : 'border-white/10 bg-white/5 hover:border-white/25'}
              `, children: [(0, jsx_runtime_1.jsx)("span", { className: "text-2xl", children: t.icon }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs font-bold text-white", children: t.label }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-white/50 text-center leading-tight hidden sm:block", children: t.desc })] }, t.id))) })] }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6", children: difficulties.map((diff, i) => {
                    const config = types_1.GAME_CONFIGS[diff.level];
                    const isSelected = selectedDifficulty === diff.level;
                    return ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.button, { onClick: () => handleSelectDifficulty(diff.level), className: `
                relative p-4 sm:p-5 rounded-2xl transition-all duration-200 text-left
                border-2 backdrop-blur-sm
                ${isSelected
                            ? `${themeAccent.selected} ${themeAccent.border} ring-2 ${themeAccent.ring} scale-[1.03]`
                            : 'border-white/10 bg-white/5 hover:border-white/25 hover:scale-[1.02]'}
              `, initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.15 + i * 0.08 }, children: [(0, jsx_runtime_1.jsx)("div", { className: "text-4xl mb-3", children: diff.emoji }), (0, jsx_runtime_1.jsx)("h3", { className: "text-base font-bold mb-1 text-white", children: diff.name }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs mb-3", style: { color: 'var(--theme-muted)' }, children: diff.description }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsx)("span", { style: { color: 'var(--theme-muted)' }, children: "Optimal moves" }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-white", children: config.optimalMoves })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsx)("span", { style: { color: 'var(--theme-muted)' }, children: "Est. time" }), (0, jsx_runtime_1.jsx)("span", { className: `font-bold ${themeAccent.text}`, children: diff.time })] })] }), isSelected && ((0, jsx_runtime_1.jsx)("div", { className: `absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-slate-900 ${theme === 'museum' ? 'bg-amber-400' : theme === 'nature' ? 'bg-green-400' : 'bg-[#00ff88]'}`, children: "\u2713" }))] }, diff.level));
                }) }), (0, jsx_runtime_1.jsx)("div", { className: "text-center mb-8", children: (0, jsx_runtime_1.jsx)(framer_motion_1.motion.button, { onClick: handleStart, disabled: !selectedDifficulty || isGameLoading, className: `
            px-10 py-3.5 rounded-xl text-base font-bold transition-all duration-200
            ${selectedDifficulty && !isGameLoading
                        ? `bg-gradient-to-r ${themeAccent.cta} text-white shadow-lg hover:scale-105`
                        : `${themeAccent.ctaDisabled} cursor-not-allowed opacity-50`}
          `, whileTap: selectedDifficulty && !isGameLoading ? { scale: 0.96 } : {}, children: isGameLoading ? ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "animate-spin", children: "\u23F3" }), (0, jsx_runtime_1.jsx)("span", { children: "Entering Gallery\u2026" })] })) : (theme === 'urban' ? 'Hit the Streets' : theme === 'nature' ? 'Enter the Forest' : 'Enter Museum') }) }), (0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.4 }, className: "p-4 sm:p-5 rounded-xl border", style: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'var(--theme-border)' }, children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-sm font-bold mb-3 flex items-center gap-2", style: { color: 'var(--theme-text)' }, children: [(0, jsx_runtime_1.jsx)("span", { children: "\uD83D\uDCD6" }), " How to Play"] }), (0, jsx_runtime_1.jsxs)("ul", { className: "space-y-2 text-xs", style: { color: 'var(--theme-muted)' }, children: [(0, jsx_runtime_1.jsxs)("li", { className: "flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: `font-bold ${themeAccent.text} flex-shrink-0`, children: "1." }), (0, jsx_runtime_1.jsx)("span", { children: "Tap any card to flip it and reveal a hidden artifact" })] }), (0, jsx_runtime_1.jsxs)("li", { className: "flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: `font-bold ${themeAccent.text} flex-shrink-0`, children: "2." }), (0, jsx_runtime_1.jsx)("span", { children: "Remember where it is, then tap a second card to find its match" })] }), (0, jsx_runtime_1.jsxs)("li", { className: "flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: `font-bold ${themeAccent.text} flex-shrink-0`, children: "3." }), (0, jsx_runtime_1.jsx)("span", { children: "Match all pairs to complete the exhibition \u2014 fewer moves = higher score" })] }), (0, jsx_runtime_1.jsxs)("li", { className: "flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: `font-bold ${themeAccent.text} flex-shrink-0`, children: "4." }), (0, jsx_runtime_1.jsx)("span", { children: "Earn \u2B50\u2B50\u2B50 stars and climb the global leaderboard!" })] })] })] })] }));
}
