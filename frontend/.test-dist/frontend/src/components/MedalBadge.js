"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MedalBadge;
const jsx_runtime_1 = require("react/jsx-runtime");
const framer_motion_1 = require("framer-motion");
const MEDAL_CONFIG = {
    gold: { icon: '🥇', bg: 'bg-gradient-to-br from-amber-400 to-yellow-600', text: 'text-amber-900', label: 'Gold', shimmer: true },
    silver: { icon: '🥈', bg: 'bg-gradient-to-br from-slate-300 to-slate-500', text: 'text-slate-900', label: 'Silver', shimmer: false },
    bronze: { icon: '🥉', bg: 'bg-gradient-to-br from-amber-600 to-orange-700', text: 'text-amber-100', label: 'Bronze', shimmer: false },
    none: { icon: '⏱️', bg: 'bg-gradient-to-br from-slate-600 to-slate-700', text: 'text-slate-300', label: '—', shimmer: false },
};
const SIZE_CLASSES = {
    sm: { wrapper: 'w-7 h-7', icon: 'text-base', label: 'text-[9px]' },
    md: { wrapper: 'w-10 h-10', icon: 'text-xl', label: 'text-[10px]' },
    lg: { wrapper: 'w-14 h-14', icon: 'text-3xl', label: 'text-xs' },
};
function MedalBadge({ medal, size = 'md', showLabel = false }) {
    const config = MEDAL_CONFIG[medal];
    const sizes = SIZE_CLASSES[size];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center gap-1", children: [(0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { className: `relative ${sizes.wrapper} rounded-full ${config.bg} flex items-center justify-center overflow-hidden shadow-md`, whileHover: { scale: 1.1 }, children: [config.shimmer && ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: "absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent", animate: { x: ['-100%', '150%'] }, transition: { duration: 1.6, repeat: Infinity, repeatDelay: 2 } })), (0, jsx_runtime_1.jsx)("span", { className: `${sizes.icon} z-10 leading-none`, children: config.icon })] }), showLabel && ((0, jsx_runtime_1.jsx)("span", { className: `${sizes.label} font-semibold text-white/70 leading-none`, children: config.label }))] }));
}
