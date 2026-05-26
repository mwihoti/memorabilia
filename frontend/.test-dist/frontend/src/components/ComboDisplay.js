"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ComboDisplay;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
function ComboDisplay({ combo }) {
    const prevCount = (0, react_1.useRef)(combo.count);
    const [broken, setBroken] = (0, react_1.useState)(false);
    const [visible, setVisible] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const prev = prevCount.current;
        prevCount.current = combo.count;
        if (combo.count >= 2) {
            setBroken(false);
            setVisible(true);
        }
        else if (prev >= 2 && combo.count === 0) {
            // Combo just broke
            setBroken(true);
            setVisible(true);
            const t = setTimeout(() => setVisible(false), 600);
            return () => clearTimeout(t);
        }
        else {
            setVisible(false);
        }
    }, [combo.count]);
    const level = combo.multiplier >= 3 ? 3 :
        combo.multiplier >= 2 ? 2 :
            combo.multiplier >= 1.5 ? 1.5 : 0;
    const config = {
        3: { icon: '⚡', label: 'x3 COMBO!', color: 'text-purple-300', glow: 'shadow-purple-500/60', bg: 'from-purple-700/80 to-purple-900/80 border-purple-500/50' },
        2: { icon: '💥', label: 'x2 COMBO!', color: 'text-red-300', glow: 'shadow-red-500/50', bg: 'from-red-700/80 to-red-900/80 border-red-500/50' },
        1.5: { icon: '🔥', label: 'x1.5 COMBO!', color: 'text-orange-300', glow: 'shadow-orange-500/40', bg: 'from-orange-700/80 to-orange-900/80 border-orange-500/50' },
        0: { icon: '🔥', label: 'x1 COMBO!', color: 'text-white', glow: '', bg: 'from-slate-700/80 to-slate-900/80 border-white/20' },
    }[level] ?? { icon: '🔥', label: '', color: 'text-white', glow: '', bg: '' };
    return ((0, jsx_runtime_1.jsx)("div", { className: "fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none", children: (0, jsx_runtime_1.jsx)(framer_motion_1.AnimatePresence, { children: visible && ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { scale: 0, opacity: 0, y: -10 }, animate: broken
                    ? { scale: [1, 1.1, 0.9], opacity: [1, 1, 0], y: 0 }
                    : { scale: [0, 1.25, 1], opacity: 1, y: 0 }, exit: { scale: 0.8, opacity: 0, y: -8 }, transition: { duration: broken ? 0.5 : 0.35, ease: 'backOut' }, className: `
              px-5 py-2.5 rounded-2xl border backdrop-blur-md shadow-xl
              bg-gradient-to-br ${config.bg} ${config.glow}
              ${broken ? 'bg-red-900/80 border-red-400/50' : ''}
            `, children: (0, jsx_runtime_1.jsxs)("div", { className: `flex items-center gap-2 font-extrabold text-lg ${broken ? 'text-red-300' : config.color}`, children: [level === 3 && !broken && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: "absolute inset-0 rounded-2xl border-2 border-purple-400/60", animate: { scale: [1, 1.5], opacity: [0.8, 0] }, transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.3 } }), (0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: "absolute inset-0 rounded-2xl border-2 border-purple-300/40", animate: { scale: [1, 1.8], opacity: [0.6, 0] }, transition: { duration: 0.9, repeat: Infinity, repeatDelay: 0.3, delay: 0.15 } })] })), (0, jsx_runtime_1.jsx)("span", { className: "text-xl leading-none", children: broken ? '💔' : config.icon }), (0, jsx_runtime_1.jsx)("span", { className: "relative z-10", children: broken ? 'Combo Lost!' : config.label })] }) }, `combo-${combo.count}-${broken}`)) }) }));
}
