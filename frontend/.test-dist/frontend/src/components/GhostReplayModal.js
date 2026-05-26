"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GhostReplayModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const types_1 = require("../types");
const gameStore_1 = require("../store/gameStore");
const Card_1 = require("./Card");
const ERA_LABELS = {
    [types_1.Difficulty.Easy]: '🏺 Ancient Era',
    [types_1.Difficulty.Medium]: '⚔️ Medieval Times',
    [types_1.Difficulty.Hard]: '🚀 Modern Era',
    [types_1.Difficulty.Expert]: '🛸 Future Nexus',
    [types_1.Difficulty.Master]: '🐲 Mythic Vault',
};
function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function GhostReplayModal({ replay, era: eraProp, level: levelProp, onClose }) {
    const era = eraProp ?? replay.era;
    const level = levelProp ?? replay.level;
    const { theme } = (0, gameStore_1.useGameStore)();
    const levelConfig = types_1.ERA_LEVEL_CONFIGS[era][level - 1];
    const levelLabel = levelConfig?.label ?? `Level ${level}`;
    const cardCount = levelConfig?.cardCount ?? replay.moves.length;
    const pairCount = cardCount / 2;
    // Use saved emojis from the actual best run, or fall back to generic placeholders
    const buildEmojiGrid = () => {
        if (replay.emojis && replay.emojis.length >= pairCount) {
            // Reconstruct the card grid: saved emojis are [emoji0, emoji1, ..., emojiN] for N pairs
            // We need to create a paired array of length cardCount, but we don't know the original
            // shuffle order. Show emojis as sequential pairs for visual clarity.
            const paired = [];
            for (let i = 0; i < pairCount; i++) {
                paired.push(replay.emojis[i], replay.emojis[i]);
            }
            return paired;
        }
        // Fallback: generic numbered placeholders
        const fallback = [];
        for (let i = 0; i < pairCount; i++) {
            fallback.push(`${i + 1}️⃣`, `${i + 1}️⃣`);
        }
        return fallback;
    };
    const emojis = buildEmojiGrid();
    const [playing, setPlaying] = (0, react_1.useState)(false);
    const [speed, setSpeed] = (0, react_1.useState)(1);
    const [flipped, setFlipped] = (0, react_1.useState)([]);
    const [matched, setMatched] = (0, react_1.useState)([]);
    const [moveIdx, setMoveIdx] = (0, react_1.useState)(0);
    const [finished, setFinished] = (0, react_1.useState)(false);
    const timerRef = (0, react_1.useRef)(null);
    // Reset replay state
    function resetReplay() {
        setFlipped([]);
        setMatched([]);
        setMoveIdx(0);
        setFinished(false);
        setPlaying(false);
        if (timerRef.current)
            clearTimeout(timerRef.current);
    }
    // Schedule the next move
    (0, react_1.useEffect)(() => {
        if (!playing || finished)
            return;
        if (moveIdx >= replay.moves.length) {
            setFinished(true);
            setPlaying(false);
            return;
        }
        const moves = replay.moves;
        const currentMove = moves[moveIdx];
        const nextMove = moves[moveIdx + 1];
        // Delay until this move's timestamp relative to the previous
        const prevTimestamp = moveIdx === 0 ? 0 : moves[moveIdx - 1].timestamp;
        const delay = Math.max(200, (currentMove.timestamp - prevTimestamp) / speed);
        timerRef.current = setTimeout(() => {
            setFlipped((prev) => {
                const next = [...prev, currentMove.cardIndex];
                // If we now have 2 flipped cards, decide match/mismatch
                if (next.length === 2) {
                    const [a, b] = next;
                    const isMatch = emojis[a] === emojis[b];
                    if (isMatch) {
                        setMatched((m) => [...m, a, b]);
                        setFlipped([]);
                    }
                    else {
                        // Flip back after 1 second
                        setTimeout(() => setFlipped([]), 1000 / speed);
                    }
                    return isMatch ? [] : next;
                }
                return next;
            });
            setMoveIdx((prev) => prev + 1);
        }, delay);
        return () => { if (timerRef.current)
            clearTimeout(timerRef.current); };
    }, [playing, moveIdx, finished, speed, replay.moves, emojis]);
    const themeAccent = {
        museum: { btn: 'from-amber-500 to-amber-700 hover:from-amber-400', text: 'text-amber-400', badge: 'bg-amber-500/20 border-amber-500/30 text-amber-300' },
        nature: { btn: 'from-green-500 to-green-700 hover:from-green-400', text: 'text-green-400', badge: 'bg-green-500/20 border-green-500/30 text-green-300' },
        urban: { btn: 'from-[#00ff88] to-[#00e5ff] hover:from-[#00e5ff]', text: 'text-[#00ff88]', badge: 'bg-[#00ff88]/10 border-[#00ff88]/25 text-[#00ff88]' },
    }[theme];
    // Compute columns for mini grid — always even (2, 4, 6)
    const cols = cardCount <= 16 ? 4 : 6;
    return ((0, jsx_runtime_1.jsx)(framer_motion_1.AnimatePresence, { children: (0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4", children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "absolute inset-0 bg-black/75 backdrop-blur-sm", onClick: onClose }), (0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { y: '100%', opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: '100%', opacity: 0 }, transition: { type: 'spring', stiffness: 300, damping: 30 }, className: "relative w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl", style: { maxHeight: '92dvh' }, onClick: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("div", { className: "sm:hidden flex justify-center pt-3 pb-1 bg-[#1e293b]", children: (0, jsx_runtime_1.jsx)("div", { className: "w-10 h-1 bg-white/20 rounded-full" }) }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-y-auto", style: { maxHeight: 'calc(92dvh - 20px)', backgroundColor: '#1e293b' }, children: (0, jsx_runtime_1.jsxs)("div", { className: "px-5 pt-4 pb-6 space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { scale: 0, rotate: -180 }, animate: { scale: 1, rotate: 0 }, transition: { delay: 0.15, type: 'spring' }, className: "text-5xl mb-2", children: "\uD83D\uDC7B" }), (0, jsx_runtime_1.jsx)("h2", { className: `text-2xl font-extrabold ${themeAccent.text}`, children: "Your Best Run" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-white/50 text-xs mt-0.5", children: [ERA_LABELS[era], " \u00B7 ", levelLabel] })] }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-3 gap-2", children: [
                                            { label: 'Score', value: replay.score.toLocaleString() },
                                            { label: 'Time', value: formatTime(replay.totalTime) },
                                            { label: 'Moves', value: String(replay.moves.length) },
                                        ].map(({ label, value }) => ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white/5 rounded-xl px-3 py-2.5 text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-white font-bold text-sm", children: value }), (0, jsx_runtime_1.jsx)("div", { className: "text-white/40 text-[10px]", children: label })] }, label))) }), (0, jsx_runtime_1.jsx)("div", { className: "grid gap-1.5 mx-auto", style: {
                                            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                                            maxWidth: cols * 64 + (cols - 1) * 6,
                                        }, children: Array.from({ length: cardCount }).map((_, idx) => {
                                            const isFlipped = flipped.includes(idx);
                                            const isMatched = matched.includes(idx);
                                            return ((0, jsx_runtime_1.jsx)(Card_1.default, { emoji: emojis[idx] ?? '❓', isFlipped: isFlipped, isMatched: isMatched, onClick: () => { }, disabled: true, index: idx }, idx));
                                        }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.button, { onClick: () => {
                                                    if (finished) {
                                                        resetReplay();
                                                        setTimeout(() => setPlaying(true), 50);
                                                    }
                                                    else {
                                                        setPlaying((p) => !p);
                                                    }
                                                }, className: `flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r ${themeAccent.btn} text-white transition-all shadow-md`, whileTap: { scale: 0.97 }, children: finished ? '↩ Replay' : playing ? '⏸ Pause' : '▶ Play' }), (0, jsx_runtime_1.jsx)("div", { className: "flex gap-1", children: [1, 2].map((s) => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setSpeed(s), className: `
                        px-3 py-2 rounded-xl text-xs font-bold border transition-all
                        ${speed === s
                                                        ? `${themeAccent.badge} scale-105`
                                                        : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30'}
                      `, children: [s, "x"] }, s))) })] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "w-full py-3 bg-white/8 hover:bg-white/12 rounded-xl font-bold text-sm text-white/70 transition-all", children: "Close" })] }) })] })] }) }));
}
