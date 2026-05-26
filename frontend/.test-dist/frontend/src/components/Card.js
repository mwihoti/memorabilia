"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Card;
const jsx_runtime_1 = require("react/jsx-runtime");
const framer_motion_1 = require("framer-motion");
const telegram_1 = require("../telegram/telegram");
const gameStore_1 = require("../store/gameStore");
function Card({ emoji, isFlipped, isMatched, onClick, disabled, index = 0, isMismatched = false, isHinted = false, isObscured = false, }) {
    const { theme } = (0, gameStore_1.useGameStore)();
    const handleClick = () => {
        if (disabled || isMatched || isFlipped)
            return;
        (0, telegram_1.hapticImpact)('light');
        onClick();
    };
    // Theme-specific card back styles
    const cardBack = {
        museum: {
            bg: 'from-amber-800 via-amber-700 to-yellow-700',
            border: 'border-amber-500/60',
            hoverBorder: 'hover:border-yellow-300/80',
            matchedBg: 'from-amber-400 via-amber-500 to-amber-600 border-amber-300 shadow-amber-500/40',
            frontBg: 'from-slate-100 to-amber-50 border-slate-300',
            burstColor: 'rgba(250,204,21,0.6)',
            centerIcon: '🏛️',
            pattern: (i) => ((0, jsx_runtime_1.jsxs)("svg", { className: "absolute inset-0 w-full h-full opacity-20", xmlns: "http://www.w3.org/2000/svg", children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsxs)("pattern", { id: `tile-${i}`, x: "0", y: "0", width: "16", height: "16", patternUnits: "userSpaceOnUse", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "8", cy: "8", r: "1.5", fill: "rgba(250,204,21,0.8)" }), (0, jsx_runtime_1.jsx)("path", { d: "M0 0 L8 8 L16 0 M0 16 L8 8 L16 16", stroke: "rgba(250,204,21,0.4)", strokeWidth: "0.5", fill: "none" })] }) }), (0, jsx_runtime_1.jsx)("rect", { width: "100%", height: "100%", fill: `url(#tile-${i})` })] })),
        },
        nature: {
            bg: 'from-green-900 via-green-800 to-emerald-800',
            border: 'border-green-500/50',
            hoverBorder: 'hover:border-green-300/70',
            matchedBg: 'from-green-400 via-green-500 to-emerald-500 border-green-300 shadow-green-500/40',
            frontBg: 'from-green-50 to-emerald-50 border-green-200',
            burstColor: 'rgba(74,222,128,0.6)',
            centerIcon: '🌿',
            pattern: (i) => ((0, jsx_runtime_1.jsxs)("svg", { className: "absolute inset-0 w-full h-full opacity-15", xmlns: "http://www.w3.org/2000/svg", children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsxs)("pattern", { id: `leaf-${i}`, x: "0", y: "0", width: "20", height: "20", patternUnits: "userSpaceOnUse", children: [(0, jsx_runtime_1.jsx)("ellipse", { cx: "10", cy: "6", rx: "4", ry: "6", fill: "none", stroke: "rgba(74,222,128,0.6)", strokeWidth: "0.8" }), (0, jsx_runtime_1.jsx)("line", { x1: "10", y1: "12", x2: "10", y2: "20", stroke: "rgba(74,222,128,0.4)", strokeWidth: "0.6" }), (0, jsx_runtime_1.jsx)("circle", { cx: "4", cy: "16", r: "2", fill: "none", stroke: "rgba(52,211,153,0.4)", strokeWidth: "0.5" }), (0, jsx_runtime_1.jsx)("circle", { cx: "16", cy: "16", r: "2", fill: "none", stroke: "rgba(52,211,153,0.4)", strokeWidth: "0.5" })] }) }), (0, jsx_runtime_1.jsx)("rect", { width: "100%", height: "100%", fill: `url(#leaf-${i})` })] })),
        },
        urban: {
            bg: 'from-zinc-900 via-zinc-800 to-zinc-900',
            border: 'border-[#00ff88]/30',
            hoverBorder: 'hover:border-[#00ff88]/70',
            matchedBg: 'from-[#00ff88]/30 via-[#00e5ff]/20 to-[#ff0080]/20 border-[#00ff88]/80 shadow-[#00ff88]/30',
            frontBg: 'from-zinc-100 to-zinc-200 border-zinc-300',
            burstColor: 'rgba(0,255,136,0.5)',
            centerIcon: '🎨',
            pattern: (i) => ((0, jsx_runtime_1.jsxs)("svg", { className: "absolute inset-0 w-full h-full opacity-25", xmlns: "http://www.w3.org/2000/svg", children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsxs)("pattern", { id: `spray-${i}`, x: "0", y: "0", width: "24", height: "24", patternUnits: "userSpaceOnUse", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "4", cy: "4", r: "1", fill: "rgba(0,255,136,0.7)" }), (0, jsx_runtime_1.jsx)("circle", { cx: "20", cy: "4", r: "0.7", fill: "rgba(0,229,255,0.6)" }), (0, jsx_runtime_1.jsx)("circle", { cx: "12", cy: "12", r: "1.5", fill: "rgba(255,0,128,0.5)" }), (0, jsx_runtime_1.jsx)("circle", { cx: "4", cy: "20", r: "0.8", fill: "rgba(0,255,136,0.5)" }), (0, jsx_runtime_1.jsx)("circle", { cx: "20", cy: "20", r: "1", fill: "rgba(0,229,255,0.7)" }), (0, jsx_runtime_1.jsx)("line", { x1: "0", y1: "12", x2: "24", y2: "12", stroke: "rgba(0,255,136,0.15)", strokeWidth: "0.5" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "0", x2: "12", y2: "24", stroke: "rgba(0,229,255,0.15)", strokeWidth: "0.5" })] }) }), (0, jsx_runtime_1.jsx)("rect", { width: "100%", height: "100%", fill: `url(#spray-${i})` })] })),
        },
    }[theme];
    return ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: "aspect-square cursor-pointer select-none", initial: { opacity: 0, scale: 0.4, y: (index % 3 === 0 ? -30 : index % 3 === 1 ? 30 : 0) }, animate: {
            opacity: 1,
            scale: 1,
            y: 0,
            x: isMismatched ? [0, -8, 8, -6, 6, -3, 3, 0] : 0,
        }, transition: {
            opacity: { delay: index * 0.04, duration: 0.25 },
            scale: { delay: index * 0.04, duration: 0.3, type: 'spring', stiffness: 220, damping: 18 },
            y: { delay: index * 0.04, duration: 0.3, type: 'spring' },
            x: isMismatched ? { duration: 0.4, ease: 'easeInOut' } : {},
        }, whileHover: !disabled && !isMatched && !isFlipped ? { scale: 1.08, y: -3 } : {}, whileTap: !disabled && !isMatched ? { scale: 0.92 } : {}, onClick: handleClick, children: (0, jsx_runtime_1.jsx)("div", { className: "relative w-full h-full", style: { perspective: '1200px', willChange: 'transform' }, children: (0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { className: "w-full h-full relative", initial: false, animate: { rotateY: isFlipped || isMatched ? 180 : 0 }, transition: { duration: 0.13, ease: [0.4, 0, 0.2, 1] }, style: { transformStyle: 'preserve-3d', willChange: 'transform' }, children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute w-full h-full rounded-xl overflow-hidden", style: {
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                        }, children: (0, jsx_runtime_1.jsxs)("div", { className: `
              w-full h-full rounded-xl flex items-center justify-center relative
              bg-gradient-to-br ${cardBack.bg}
              border-2 ${cardBack.border}
              shadow-lg transition-colors duration-150
              ${!disabled && !isMatched ? cardBack.hoverBorder : ''}
            `, children: [cardBack.pattern(index), (0, jsx_runtime_1.jsx)("div", { className: "absolute inset-[3px] rounded-lg border border-white/10 pointer-events-none" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute inset-[6px] rounded-md border border-white/5 pointer-events-none" }), (0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: "text-2xl sm:text-3xl md:text-3xl z-10 filter drop-shadow-lg", animate: !disabled && !isFlipped && !isMatched ? {
                                        scale: [1, 1.06, 1],
                                        opacity: [0.9, 1, 0.9],
                                    } : { scale: 1, opacity: 0.9 }, transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.15 }, children: cardBack.centerIcon }), isObscured && ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 z-20 bg-gradient-to-br from-amber-100/35 via-stone-300/20 to-transparent backdrop-blur-[2px]" }))] }) }), (0, jsx_runtime_1.jsx)("div", { className: "absolute w-full h-full rounded-xl overflow-hidden", style: {
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                        }, children: (0, jsx_runtime_1.jsxs)("div", { className: `
              w-full h-full rounded-xl flex items-center justify-center relative
              border-2 shadow-lg
              ${isMatched
                                ? `bg-gradient-to-br ${cardBack.matchedBg}`
                                : `bg-gradient-to-br ${cardBack.frontBg}`}
              transition-colors duration-200
            `, children: [isMatched && ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: "absolute inset-0 rounded-xl", initial: { scale: 0.6, opacity: 0.9 }, animate: { scale: 2.2, opacity: 0 }, transition: { duration: 0.5 }, style: { background: `radial-gradient(circle, ${cardBack.burstColor} 0%, transparent 70%)` } })), (0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: `text-2xl sm:text-3xl md:text-4xl lg:text-5xl filter drop-shadow-md z-10 ${isHinted ? 'drop-shadow-[0_0_12px_rgba(250,204,21,0.85)]' : ''}`, initial: false, animate: isMatched ? {
                                        scale: [1, 1.4, 1.1],
                                        rotate: [0, 12, -12, 0],
                                    } : isHinted ? {
                                        scale: [1, 1.14, 1],
                                        rotate: [0, -6, 6, 0],
                                    } : { scale: 1, rotate: 0 }, transition: { duration: 0.35, ease: 'backOut' }, children: emoji }), isHinted && !isMatched && ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-[4px] rounded-xl border-2 border-amber-300/80 shadow-[0_0_16px_rgba(250,204,21,0.45)]" })), isMatched && ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, className: "absolute bottom-1 right-1 text-xs", children: "\u2713" }))] }) })] }) }) }));
}
