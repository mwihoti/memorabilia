"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LevelSelector;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const gameStore_1 = require("../store/gameStore");
const types_1 = require("../types");
const dailyChallenge_1 = require("../store/dailyChallenge");
const telegram_1 = require("../telegram/telegram");
const StreakBanner_1 = require("./StreakBanner");
const DailyChallengeCard_1 = require("./DailyChallengeCard");
const ERAS = [
    ...types_1.DIFFICULTY_ORDER.map((difficulty, index) => {
        const meta = (0, types_1.getDifficultyMeta)(difficulty);
        const gradients = [
            'from-amber-700/50 to-orange-800/50',
            'from-slate-700/50 to-indigo-800/50',
            'from-cyan-700/50 to-purple-800/50',
            'from-violet-700/50 to-fuchsia-800/50',
            'from-rose-700/50 to-red-900/50',
        ];
        return {
            id: difficulty,
            label: meta.label,
            icon: meta.icon,
            gradient: gradients[index] ?? gradients[gradients.length - 1],
            lockedBy: index === 0 ? '' : `${(0, types_1.getDifficultyMeta)(types_1.DIFFICULTY_ORDER[index - 1]).label} Level ${(0, types_1.getMaxLevelForEra)(types_1.DIFFICULTY_ORDER[index - 1])}`,
        };
    }),
];
// ── Helpers ────────────────────────────────────────────────────────────────────
function getProgressForEra(era, levelProgress) {
    const total = types_1.ERA_LEVEL_CONFIGS[era].length;
    const completed = levelProgress.filter((lp) => lp.era === era && lp.completed).length;
    return { completed, total };
}
function getLevelProgress(era, level, levelProgress) {
    return levelProgress.find((lp) => lp.era === era && lp.level === level);
}
function starDisplay(stars, max = 3) {
    return '⭐'.repeat(stars) + '☆'.repeat(Math.max(0, max - stars));
}
function medalIcon(medal) {
    if (medal === 'gold')
        return '🥇';
    if (medal === 'silver')
        return '🥈';
    if (medal === 'bronze')
        return '🥉';
    return '—';
}
function chunkLevels(levels, size) {
    const chunks = [];
    for (let i = 0; i < levels.length; i += size) {
        chunks.push(levels.slice(i, i + size));
    }
    return chunks;
}
function LevelButton({ eraConfig: _era, levelConfig, progress, locked, themeAccent, onSelect }) {
    const isComplete = progress?.completed ?? false;
    const medal = progress?.bestMedal ?? 'none';
    const stars = progress?.stars ?? 0;
    const previewSec = levelConfig.previewDuration > 0 ? `${levelConfig.previewDuration / 1000}s preview` : 'No preview';
    return ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.button, { onClick: locked ? undefined : onSelect, className: `
        relative p-3 lg:p-4 rounded-xl border-2 text-left transition-all duration-200
        ${locked
            ? 'border-white/5 bg-white/3 opacity-50 cursor-not-allowed'
            : isComplete
                ? `border-green-500/30 bg-green-500/5 hover:border-green-400/50`
                : `border-white/10 bg-white/5 hover:border-white/20`}
      `, whileHover: locked ? {} : { scale: 1.03 }, whileTap: locked ? {} : { scale: 0.97 }, children: [locked && ((0, jsx_runtime_1.jsx)("span", { className: "absolute top-2 right-2 text-white/30 text-xs", children: "\uD83D\uDD12" })), !locked && isComplete && ((0, jsx_runtime_1.jsx)("span", { className: "absolute top-2 right-2 text-green-400 text-xs font-bold", children: "\u2713" })), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5 mb-1.5", children: [(0, jsx_runtime_1.jsxs)("span", { className: `text-xs lg:text-sm font-extrabold ${locked ? 'text-white/30' : themeAccent.text}`, children: ["Lv.", levelConfig.level] }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs lg:text-sm font-bold text-white truncate", children: levelConfig.label })] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[10px] lg:text-xs text-white/40 mb-1.5", children: [levelConfig.cardCount, " cards"] }), levelConfig.boss && ((0, jsx_runtime_1.jsxs)("p", { className: "text-[9px] lg:text-[10px] text-amber-300 mb-1", children: ["Boss Level \u00B7 ", levelConfig.relic, " reward"] })), !locked && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm lg:text-base leading-none", children: medalIcon(medal) }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] lg:text-xs text-white/60", children: isComplete ? starDisplay(stars) : '☆☆☆' })] })), !locked && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-0.5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[9px] lg:text-[10px] text-white/30", children: previewSec }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[9px] lg:text-[10px] text-white/30", children: ["\uD83E\uDD47 < ", levelConfig.timeLimitGold, "s"] }), levelConfig.mechanics?.[0] && ((0, jsx_runtime_1.jsx)("p", { className: "text-[9px] lg:text-[10px] text-white/30 truncate", children: levelConfig.mechanics[0] }))] })), locked && ((0, jsx_runtime_1.jsxs)("p", { className: "text-[9px] lg:text-[10px] text-white/25", children: ["Complete Level ", levelConfig.level - 1, " first"] }))] }));
}
// ── Main component ─────────────────────────────────────────────────────────────
function LevelSelector({ onStart, onStartWeekly }) {
    const { theme, levelProgress, relicRewards } = (0, gameStore_1.useGameStore)();
    const [expandedEra, setExpandedEra] = (0, react_1.useState)(null);
    const themeAccent = {
        museum: { text: 'text-amber-400', border: 'border-amber-500', ring: 'ring-amber-500/40', selected: 'border-amber-400 bg-amber-500/10', cta: 'from-amber-500 to-amber-700 hover:from-amber-400' },
        nature: { text: 'text-green-400', border: 'border-green-500', ring: 'ring-green-500/40', selected: 'border-green-400 bg-green-500/10', cta: 'from-green-500 to-green-700 hover:from-green-400' },
        urban: { text: 'text-[#00ff88]', border: 'border-[#00ff88]', ring: 'ring-[#00ff88]/30', selected: 'border-[#00ff88] bg-[#00ff88]/5', cta: 'from-[#00ff88] to-[#00e5ff] hover:from-[#00e5ff]' },
    }[theme];
    const dailyConfig = (0, dailyChallenge_1.getDailyChallengeConfig)();
    const dailyCompleted = (0, dailyChallenge_1.isDailyChallengeCompleted)();
    const handleEraClick = (era) => {
        const unlocked = (0, types_1.isEraUnlocked)(era, levelProgress);
        if (!unlocked)
            return;
        (0, telegram_1.hapticImpact)('light');
        setExpandedEra((prev) => (prev === era ? null : era));
    };
    const handleLevelSelect = (era, level) => {
        if (!(0, types_1.isLevelUnlocked)(era, level, levelProgress))
            return;
        (0, telegram_1.hapticImpact)('medium');
        onStart(era, level);
    };
    const handleDailyPlay = () => {
        (0, telegram_1.hapticImpact)('medium');
        onStart(dailyConfig.difficulty, dailyConfig.level, true);
    };
    const handleWeeklyPlay = () => {
        (0, telegram_1.hapticImpact)('medium');
        onStartWeekly();
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto", children: [(0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "text-center mb-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-3xl sm:text-4xl font-bold mb-1", style: { color: 'var(--theme-text)' }, children: "Choose Your Level" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm", style: { color: 'var(--theme-muted)' }, children: "Select an era and level to begin" })] }), (0, jsx_runtime_1.jsx)(StreakBanner_1.default, {}), (0, jsx_runtime_1.jsx)(DailyChallengeCard_1.default, { onPlay: handleDailyPlay, onPlayWeekly: handleWeeklyPlay }), relicRewards.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mb-4 rounded-2xl border border-white/10 bg-white/5 p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 mb-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs uppercase tracking-widest text-white/40", children: "Relic Vault" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm font-bold text-white", children: "Mastery rewards you have unlocked" })] }), (0, jsx_runtime_1.jsxs)("span", { className: `text-xs font-semibold ${themeAccent.text}`, children: [relicRewards.length, " relics"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: relicRewards.map((relic) => ((0, jsx_runtime_1.jsxs)("div", { className: "px-3 py-2 rounded-xl border border-white/10 bg-black/10 text-xs text-white/75", children: [(0, jsx_runtime_1.jsx)("span", { className: "mr-1.5", children: relic.icon }), (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-white", children: relic.name })] }, relic.id))) })] })), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: ERAS.map((era, i) => {
                    const unlocked = (0, types_1.isEraUnlocked)(era.id, levelProgress);
                    const progress = getProgressForEra(era.id, levelProgress);
                    const isExpanded = expandedEra === era.id;
                    const progressPct = (progress.completed / progress.total) * 100;
                    return ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 + i * 0.07 }, className: `
                rounded-2xl border-2 overflow-hidden transition-all duration-200
                ${isExpanded ? `${themeAccent.border} ring-2 ${themeAccent.ring}` : 'border-white/10'}
                ${!unlocked ? 'opacity-60' : ''}
              `, children: [(0, jsx_runtime_1.jsxs)("button", { className: `
                  w-full p-4 flex items-center gap-4 text-left transition-all
                  bg-gradient-to-r ${era.gradient}
                  ${unlocked ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed'}
                `, onClick: () => handleEraClick(era.id), children: [(0, jsx_runtime_1.jsx)("div", { className: "text-3xl lg:text-4xl w-12 h-12 lg:w-14 lg:h-14 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0", children: unlocked ? era.icon : '🔒' }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-w-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-1", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-white text-base", children: era.label }), unlocked && ((0, jsx_runtime_1.jsxs)("span", { className: "text-white/60 text-xs font-medium", children: [progress.completed, "/", progress.total, " complete"] }))] }), unlocked ? ((0, jsx_runtime_1.jsx)("div", { className: "h-1.5 bg-white/10 rounded-full overflow-hidden", children: (0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: `h-full rounded-full bg-gradient-to-r ${themeAccent.cta}`, initial: { width: 0 }, animate: { width: `${progressPct}%` }, transition: { duration: 0.6, ease: 'easeOut' } }) })) : ((0, jsx_runtime_1.jsxs)("p", { className: "text-white/50 text-xs", children: ["Complete ", era.lockedBy, " to unlock"] }))] }), unlocked && ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.span, { className: "text-white/50 text-sm flex-shrink-0", animate: { rotate: isExpanded ? 180 : 0 }, transition: { duration: 0.2 }, children: "\u25BC" }))] }), (0, jsx_runtime_1.jsx)(framer_motion_1.AnimatePresence, { children: isExpanded && unlocked && ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.25, ease: 'easeInOut' }, className: "overflow-hidden bg-[#1e293b]", children: (0, jsx_runtime_1.jsx)("div", { className: "p-3 space-y-3", children: chunkLevels(types_1.ERA_LEVEL_CONFIGS[era.id], 10).map((group, groupIndex) => ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-[10px] uppercase tracking-widest text-white/35 px-1", children: ["Levels ", group[0].level, "-", group[group.length - 1].level] }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2", children: group.map((levelConfig) => {
                                                        const lvlLocked = !(0, types_1.isLevelUnlocked)(era.id, levelConfig.level, levelProgress);
                                                        return ((0, jsx_runtime_1.jsx)(LevelButton, { eraConfig: era, levelConfig: levelConfig, progress: getLevelProgress(era.id, levelConfig.level, levelProgress), locked: lvlLocked, themeAccent: themeAccent, onSelect: () => handleLevelSelect(era.id, levelConfig.level) }, levelConfig.level));
                                                    }) })] }, `${era.id}-${groupIndex}`))) }) })) })] }, era.id));
                }) })] }));
}
