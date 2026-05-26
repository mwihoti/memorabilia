"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GameBoard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const gameStore_1 = require("../store/gameStore");
const types_1 = require("../types");
const settings_1 = require("../store/settings");
const Card_1 = require("./Card");
const ComboDisplay_1 = require("./ComboDisplay");
function GameBoard() {
    const { currentGame, flippedCards, flipCard, isChecking, theme, combo, mismatches, currentEra, currentLevel, streak, shieldCharges, hintCharges, freezeCharges, trapCharges, multiplierCharges, pendingMultiplier, hiddenCardIndices, pulseScanRow, hintPairIndices, useHint, useFreeze, useTrap, armMultiplier, triggerSandstorm, triggerPulseScan, } = (0, gameStore_1.useGameStore)();
    const [elapsedTime, setElapsedTime] = (0, react_1.useState)(0);
    const [showPreview, setShowPreview] = (0, react_1.useState)(true);
    const [previewCountdown, setPreviewCountdown] = (0, react_1.useState)(3);
    const [mismatchedIndices, setMismatchedIndices] = (0, react_1.useState)([]);
    const [streakCount, setStreakCount] = (0, react_1.useState)(0);
    const [showStreak, setShowStreak] = (0, react_1.useState)(false);
    const prevMatchedCount = (0, react_1.useRef)(0);
    // Preview countdown — use level config preview duration if available
    (0, react_1.useEffect)(() => {
        if (!currentGame)
            return;
        setShowPreview(true);
        prevMatchedCount.current = 0;
        // Determine preview duration from level config if in level mode
        let previewDurationMs = 3000;
        const settings = (0, settings_1.getPlayerSettings)();
        if (currentEra !== null) {
            const levelConfig = types_1.ERA_LEVEL_CONFIGS[currentEra]?.[currentLevel - 1];
            if (levelConfig) {
                previewDurationMs = Math.round(levelConfig.previewDuration * (0, settings_1.getPreviewMultiplier)(settings.previewLength));
            }
        }
        const previewSeconds = Math.ceil(previewDurationMs / 1000) || 0;
        setPreviewCountdown(previewSeconds);
        if (previewDurationMs === 0) {
            // No preview for highest levels
            setShowPreview(false);
            return;
        }
        const tick = setInterval(() => {
            setPreviewCountdown(c => {
                if (c <= 1) {
                    clearInterval(tick);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
        const hide = setTimeout(() => setShowPreview(false), previewDurationMs);
        return () => { clearInterval(tick); clearTimeout(hide); };
    }, [currentGame?.game_id]);
    (0, react_1.useEffect)(() => {
        if (!currentGame || showPreview || currentEra !== 1)
            return;
        const id = setInterval(() => triggerSandstorm(), 18000);
        return () => clearInterval(id);
    }, [currentGame?.game_id, showPreview, currentEra, triggerSandstorm]);
    (0, react_1.useEffect)(() => {
        if (!currentGame || showPreview || currentEra !== 3)
            return;
        const id = setInterval(() => triggerPulseScan(), 16000);
        return () => clearInterval(id);
    }, [currentGame?.game_id, showPreview, currentEra, triggerPulseScan]);
    // Timer
    (0, react_1.useEffect)(() => {
        if (!currentGame || currentGame.status !== 0 || showPreview)
            return;
        const interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - currentGame.started_at) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [currentGame, showPreview]);
    // Streak tracking
    (0, react_1.useEffect)(() => {
        if (!currentGame)
            return;
        if (currentGame.matched_count > prevMatchedCount.current) {
            setStreakCount(s => s + 1);
            if (currentGame.matched_count - prevMatchedCount.current === 1) {
                setShowStreak(true);
                setTimeout(() => setShowStreak(false), 1500);
            }
        }
        prevMatchedCount.current = currentGame.matched_count;
    }, [currentGame?.matched_count]);
    // Track mismatches
    const prevChecking = (0, react_1.useRef)(false);
    const matchedAtCheckStart = (0, react_1.useRef)(0);
    (0, react_1.useEffect)(() => {
        if (!currentGame)
            return;
        if (isChecking && !prevChecking.current) {
            matchedAtCheckStart.current = currentGame.matched_count;
        }
        if (!isChecking && prevChecking.current && flippedCards.length === 0) {
            if (currentGame.matched_count === matchedAtCheckStart.current) {
                setStreakCount(0);
            }
        }
        prevChecking.current = isChecking;
    }, [isChecking]);
    if (!currentGame || !currentGame.cards || currentGame.cards.length === 0)
        return null;
    const config = types_1.GAME_CONFIGS[currentGame.difficulty];
    const progress = (currentGame.matched_count / currentGame.total_pairs) * 100;
    // Resolve level config for time-limit ring and level labels
    const levelConfig = currentEra !== null
        ? types_1.ERA_LEVEL_CONFIGS[currentEra]?.[currentLevel - 1] ?? null
        : null;
    // Time medal calculation (only when in level mode)
    const timeMedal = levelConfig ? (0, types_1.getTimeMedal)(elapsedTime, levelConfig) : null;
    // Countdown ring values — based on gold time limit
    const goldLimit = levelConfig?.timeLimitGold ?? 0;
    const ringProgress = goldLimit > 0
        ? Math.max(0, Math.min(1, 1 - elapsedTime / goldLimit))
        : null;
    // Ring color: green >50%, yellow 25-50%, red <25%
    const ringColor = ringProgress === null ? 'var(--theme-accent)'
        : ringProgress > 0.5 ? '#22c55e'
            : ringProgress > 0.25 ? '#eab308'
                : '#ef4444';
    // Medal emoji
    const medalEmoji = timeMedal === 'gold' ? '🥇'
        : timeMedal === 'silver' ? '🥈'
            : timeMedal === 'bronze' ? '🥉'
                : timeMedal === 'none' ? '💨'
                    : null;
    // SVG ring dimensions
    const RING_R = 18;
    const RING_CIRC = 2 * Math.PI * RING_R;
    // Dynamic grid — always even columns (2, 4, 6) per requirement
    const actualCardCount = currentGame.cards.length;
    const gridClass = actualCardCount <= 16 ? 'grid-cols-4' :
        actualCardCount <= 24 ? 'grid-cols-4 md:grid-cols-6' :
            'grid-cols-4 md:grid-cols-6'; // 30 cards: 4-col mobile, 6-col desktop
    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const difficultyMeta = (0, types_1.getDifficultyMeta)(currentGame.difficulty);
    const difficultyLabel = `${difficultyMeta.icon} ${difficultyMeta.label}`;
    // Level label (e.g. "Scholar") from config
    const levelLabel = levelConfig?.label ?? null;
    // Preview banner label
    const previewLabel = levelConfig
        ? `Level ${currentLevel} · ${levelConfig.label} · ${(levelConfig.previewDuration / 1000).toFixed(1)}s preview`
        : null;
    const mechanicLabels = levelConfig?.mechanics ?? [];
    const accentColor = theme === 'museum' ? 'text-amber-400' : theme === 'nature' ? 'text-green-400' : 'text-[#00ff88]';
    const streakBg = theme === 'museum' ? 'bg-amber-500 text-slate-900' : theme === 'nature' ? 'bg-green-500 text-slate-900' : 'bg-[#00ff88] text-black';
    const progressBar = theme === 'museum' ? 'from-amber-500 to-amber-700' : theme === 'nature' ? 'from-green-500 to-green-700' : 'from-[#00ff88] to-[#00e5ff]';
    return ((0, jsx_runtime_1.jsxs)("div", { className: "max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-0.5 sm:px-1", children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "text-center mb-2 sm:mb-3", children: (0, jsx_runtime_1.jsxs)("span", { className: `text-[10px] sm:text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full border ${accentColor}`, style: { borderColor: 'var(--theme-border)', backgroundColor: 'rgba(255,255,255,0.05)' }, children: [difficultyLabel, levelLabel && (0, jsx_runtime_1.jsxs)("span", { className: "ml-1.5 opacity-60", children: ["\u00B7 ", levelLabel] })] }) }), (0, jsx_runtime_1.jsx)(framer_motion_1.AnimatePresence, { children: showPreview && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, scaleY: 0 }, animate: { opacity: 1, scaleY: 1 }, exit: { opacity: 0, scaleY: 0 }, className: "mb-3 rounded-xl p-3 text-center overflow-hidden", style: { background: 'linear-gradient(to right, var(--theme-accent2), var(--theme-accent))' }, children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm sm:text-base font-bold text-white", children: "\uD83D\uDC40 Memorize the Artifacts!" }), (0, jsx_runtime_1.jsx)("div", { className: "text-xs text-white/70", children: previewLabel
                                ? previewLabel
                                : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["Game starts in ", (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-white", children: previewCountdown }), "\u2026"] }) }), previewLabel && ((0, jsx_runtime_1.jsxs)("div", { className: "text-xs text-white/60 mt-0.5", children: ["Starts in ", (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-white", children: previewCountdown }), "\u2026"] }))] })) }), mechanicLabels.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "mb-3 flex flex-wrap gap-1.5 justify-center", children: mechanicLabels.map((mechanic) => ((0, jsx_runtime_1.jsx)("span", { className: "px-2.5 py-1 rounded-full text-[10px] sm:text-xs border text-white/75", style: { borderColor: 'var(--theme-border)', backgroundColor: 'rgba(255,255,255,0.05)' }, children: mechanic }, mechanic))) })), (0, jsx_runtime_1.jsxs)("div", { className: "mb-3 grid grid-cols-4 gap-1.5 sm:gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl p-2 sm:p-3 text-center border", style: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'var(--theme-border)' }, children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { scale: 1.3 }, animate: { scale: 1 }, transition: { duration: 0.25 }, className: `text-lg sm:text-2xl font-bold ${accentColor}`, children: currentGame.score.toLocaleString() }, currentGame.score), (0, jsx_runtime_1.jsx)("div", { className: "text-[10px] sm:text-xs", style: { color: 'var(--theme-muted)' }, children: "Score" }), streak.multiplierBonus > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-0.5 text-[9px] font-semibold text-orange-400", children: ["\uD83D\uDD25 +", Math.round(streak.multiplierBonus * 100), "% streak"] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl p-2 sm:p-3 text-center border relative", style: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'var(--theme-border)' }, children: [ringProgress !== null ? (
                            /* Countdown ring */
                            (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-center gap-1", children: [(0, jsx_runtime_1.jsxs)("svg", { width: "42", height: "42", viewBox: "0 0 42 42", className: "flex-shrink-0", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "21", cy: "21", r: RING_R, fill: "none", stroke: "rgba(255,255,255,0.1)", strokeWidth: "3" }), (0, jsx_runtime_1.jsx)("circle", { cx: "21", cy: "21", r: RING_R, fill: "none", stroke: ringColor, strokeWidth: "3", strokeLinecap: "round", strokeDasharray: RING_CIRC, strokeDashoffset: RING_CIRC * (1 - ringProgress), transform: "rotate(-90 21 21)", style: { transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' } }), (0, jsx_runtime_1.jsx)("text", { x: "21", y: "25", textAnchor: "middle", fontSize: "8", fill: "white", fontFamily: "monospace", fontWeight: "bold", children: formatTime(elapsedTime) })] }), medalEmoji && (0, jsx_runtime_1.jsx)("span", { className: "text-base", children: medalEmoji })] })) : ((0, jsx_runtime_1.jsx)("div", { className: `text-lg sm:text-2xl font-bold font-mono ${elapsedTime > 60 ? 'text-orange-400' : 'text-white/90'}`, children: formatTime(elapsedTime) })), (0, jsx_runtime_1.jsx)("div", { className: "text-[10px] sm:text-xs", style: { color: 'var(--theme-muted)' }, children: "Time" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl p-2 sm:p-3 text-center border", style: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'var(--theme-border)' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: `text-lg sm:text-2xl font-bold ${accentColor}`, children: [currentGame.matched_count, (0, jsx_runtime_1.jsxs)("span", { className: "text-sm sm:text-base text-white/40", children: ["/", currentGame.total_pairs] })] }), (0, jsx_runtime_1.jsx)("div", { className: "text-[10px] sm:text-xs", style: { color: 'var(--theme-muted)' }, children: "Pairs" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl p-2 sm:p-3 text-center border", style: {
                            backgroundColor: mismatches > 0 ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.06)',
                            borderColor: mismatches > 0 ? 'rgba(239,68,68,0.35)' : 'var(--theme-border)',
                        }, children: [(0, jsx_runtime_1.jsx)("div", { className: `text-lg sm:text-2xl font-bold ${mismatches > 0 ? 'text-red-400' : 'text-white/60'}`, children: mismatches }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[10px] sm:text-xs flex items-center justify-center gap-0.5", style: { color: 'var(--theme-muted)' }, children: [(0, jsx_runtime_1.jsx)("span", { children: "\u274C" }), (0, jsx_runtime_1.jsx)("span", { children: "Mistakes" })] })] })] }), (0, jsx_runtime_1.jsx)(ComboDisplay_1.default, { combo: combo }), (0, jsx_runtime_1.jsx)("div", { className: "mb-3 grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2", children: [
                    { label: 'Hint', icon: '💡', charges: hintCharges, onClick: useHint, disabled: hintCharges <= 0 },
                    { label: 'Freeze', icon: '❄️', charges: freezeCharges, onClick: useFreeze, disabled: freezeCharges <= 0 },
                    { label: 'Trap', icon: '🌀', charges: trapCharges, onClick: useTrap, disabled: trapCharges <= 0 },
                    { label: pendingMultiplier > 1 ? 'Armed x2' : 'Boost', icon: '⚡', charges: multiplierCharges, onClick: armMultiplier, disabled: multiplierCharges <= 0 || pendingMultiplier > 1 },
                ].map((action) => ((0, jsx_runtime_1.jsxs)("button", { onClick: action.onClick, disabled: action.disabled || showPreview || isChecking, className: "rounded-xl border px-3 py-2 text-left disabled:opacity-40", style: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'var(--theme-border)' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm sm:text-base", children: action.icon }), (0, jsx_runtime_1.jsxs)("span", { className: `text-[10px] sm:text-xs font-semibold ${accentColor}`, children: ["x", action.charges] })] }), (0, jsx_runtime_1.jsx)("div", { className: "text-xs sm:text-sm font-bold text-white/85", children: action.label })] }, action.label))) }), (shieldCharges > 0 || pendingMultiplier > 1) && ((0, jsx_runtime_1.jsxs)("div", { className: "mb-3 flex flex-wrap justify-center gap-2 text-[10px] sm:text-xs", children: [shieldCharges > 0 && ((0, jsx_runtime_1.jsxs)("span", { className: "px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300", children: ["\uD83D\uDEE1\uFE0F ", shieldCharges, " shield", shieldCharges === 1 ? '' : 's', " ready"] })), pendingMultiplier > 1 && ((0, jsx_runtime_1.jsxs)("span", { className: "px-2.5 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300", children: ["\u26A1 next match x", pendingMultiplier] }))] })), (0, jsx_runtime_1.jsx)("div", { className: "mb-3 rounded-full h-1.5 sm:h-2 overflow-hidden", style: { backgroundColor: 'rgba(255,255,255,0.1)' }, children: (0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: `h-full bg-gradient-to-r ${progressBar}`, animate: { width: `${progress}%` }, transition: { duration: 0.4, ease: 'easeOut' } }) }), (0, jsx_runtime_1.jsx)(framer_motion_1.AnimatePresence, { children: showStreak && streakCount >= 2 && ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { opacity: 0, scale: 0.5, y: 10 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.8, y: -10 }, className: "mb-2 text-center", children: (0, jsx_runtime_1.jsxs)("span", { className: `inline-block font-bold text-xs sm:text-sm px-4 py-1 rounded-full shadow-lg ${streakBg}`, children: ["\uD83D\uDD25 ", streakCount, " in a row!"] }) })) }), (0, jsx_runtime_1.jsx)("div", { className: `grid ${gridClass} gap-1.5 sm:gap-2`, children: currentGame.cards.map((card, index) => {
                    const isMatched = card.is_matched;
                    const columns = actualCardCount <= 16 ? 4 : 6;
                    const row = Math.floor(index / columns);
                    const pulseReveal = pulseScanRow !== null && row === pulseScanRow;
                    const isFlipped = showPreview || flippedCards.includes(index) || isMatched || pulseReveal;
                    const emoji = currentGame.emojis?.[card.value] ?? '❓';
                    const isMismatched = mismatchedIndices.includes(index);
                    const isObscured = hiddenCardIndices.includes(index) && !isFlipped;
                    const isHinted = hintPairIndices.includes(index);
                    return ((0, jsx_runtime_1.jsx)(Card_1.default, { emoji: emoji, isFlipped: isFlipped, isMatched: isMatched, isMismatched: isMismatched, isHinted: isHinted, isObscured: isObscured, index: index, onClick: () => !isChecking && !showPreview && flipCard(index), disabled: isChecking || isMatched || showPreview }, card.id));
                }) }), (0, jsx_runtime_1.jsx)(framer_motion_1.AnimatePresence, { children: isChecking && ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: `mt-3 text-center text-xs sm:text-sm font-medium ${accentColor}`, children: (0, jsx_runtime_1.jsx)(framer_motion_1.motion.span, { animate: { opacity: [1, 0.4, 1] }, transition: { duration: 0.6, repeat: Infinity }, children: "\uD83D\uDD0D Examining artifacts\u2026" }) })) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 text-center text-[10px] sm:text-xs", style: { color: 'var(--theme-muted)' }, children: [currentGame.moves, " moves \u00B7 optimal ", config.optimalMoves] })] }));
}
