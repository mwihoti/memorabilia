"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NameEntry;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const gameStore_1 = require("../store/gameStore");
const telegram_1 = require("../telegram/telegram");
const STORAGE_KEY = 'memorabilia_player_name';
function NameEntry({ onContinue }) {
    const { telegramUser, setPlayerName } = (0, gameStore_1.useGameStore)();
    const inputRef = (0, react_1.useRef)(null);
    const savedName = localStorage.getItem(STORAGE_KEY) || '';
    const suggestedName = savedName || telegramUser?.first_name || '';
    const [name, setName] = (0, react_1.useState)(suggestedName);
    const [error, setError] = (0, react_1.useState)('');
    const [submitted, setSubmitted] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // auto-focus input after entrance animation
        const t = setTimeout(() => inputRef.current?.focus(), 600);
        return () => clearTimeout(t);
    }, []);
    const avatarLetter = (name || suggestedName || '?')[0]?.toUpperCase();
    const handleContinue = () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setError('Enter your name to continue');
            (0, telegram_1.hapticNotification)('error');
            return;
        }
        if (trimmed.length > 24) {
            setError('Name must be 24 characters or less');
            (0, telegram_1.hapticNotification)('error');
            return;
        }
        (0, telegram_1.hapticImpact)('medium');
        setError('');
        setSubmitted(true);
        localStorage.setItem(STORAGE_KEY, trimmed);
        setPlayerName(trimmed);
        setTimeout(onContinue, 400);
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter')
            handleContinue();
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "min-h-screen flex items-center justify-center px-4", children: (0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -40 }, transition: { duration: 0.5, ease: 'easeOut' }, className: "w-full max-w-sm", children: [(0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { scale: 0 }, animate: { scale: 1 }, transition: { delay: 0.1, type: 'spring', stiffness: 200 }, className: "text-center mb-8", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-7xl mb-3", children: "\uD83C\uDFDB\uFE0F" }), (0, jsx_runtime_1.jsx)("h1", { className: "text-3xl font-bold bg-gradient-to-r from-museum-gold-400 to-museum-bronze-500 bg-clip-text text-transparent", children: "Memorabilia" }), (0, jsx_runtime_1.jsx)("p", { className: "text-museum-stone-400 text-sm mt-1", children: "The on-chain museum game" })] }), (0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.25 }, className: "bg-museum-stone-900/80 backdrop-blur-lg rounded-3xl p-8 border border-museum-bronze-400/30 shadow-2xl", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex justify-center mb-6", children: (0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { scale: 0, rotate: -180 }, animate: { scale: 1, rotate: 0 }, transition: { delay: 0.35, type: 'spring', stiffness: 180 }, className: "relative", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-20 h-20 rounded-full bg-gradient-to-br from-museum-gold-500 to-museum-bronze-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-museum-gold-400/50", children: avatarLetter }), (0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: "absolute inset-0 rounded-full border-2 border-museum-gold-400", animate: { scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }, transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center gap-2 mb-3", children: (0, jsx_runtime_1.jsx)("span", { className: "text-blue-400 text-xs font-semibold bg-blue-400/10 border border-blue-400/30 px-3 py-1 rounded-full", children: "\u2713 Authenticated via Telegram" }) }), (0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-bold text-center text-white mb-1", children: "Welcome, Curator!" }), (0, jsx_runtime_1.jsx)("p", { className: "text-museum-stone-400 text-sm text-center mb-6", children: "Choose your display name for the game" }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-2", children: [(0, jsx_runtime_1.jsx)("input", { ref: inputRef, type: "text", value: name, onChange: (e) => { setName(e.target.value); setError(''); }, onKeyDown: handleKeyDown, maxLength: 24, placeholder: "Enter your name...", className: `
                w-full px-4 py-3 rounded-xl text-white text-lg font-medium text-center
                bg-museum-stone-800 border-2 transition-all duration-200 outline-none
                placeholder:text-museum-stone-500
                ${error
                                        ? 'border-red-500 focus:border-red-400'
                                        : 'border-museum-bronze-400/40 focus:border-museum-gold-400'}
              ` }), (0, jsx_runtime_1.jsx)(framer_motion_1.AnimatePresence, { children: error && ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.p, { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 }, className: "text-red-400 text-xs text-center mt-2", children: error })) })] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-museum-stone-600 text-xs text-right mb-5", children: [name.length, "/24"] }), (0, jsx_runtime_1.jsx)(framer_motion_1.motion.button, { onClick: handleContinue, disabled: submitted, whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, className: `
              w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
              ${submitted
                                ? 'bg-museum-stone-700 text-museum-stone-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-museum-gold-500 to-museum-bronze-600 text-white shadow-lg hover:from-museum-gold-600 hover:to-museum-bronze-700'}
            `, children: submitted ? '✓ Entering Museum...' : 'Enter Museum →' }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4 pt-4 border-t border-museum-stone-700/50", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-center gap-2 text-xs text-museum-stone-500", children: [(0, jsx_runtime_1.jsx)("span", { children: "\uD83D\uDD12" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Telegram ID: ", (0, jsx_runtime_1.jsx)("span", { className: "text-museum-stone-400 font-mono", children: telegramUser?.id }), telegramUser?.username && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [" \u00B7 ", (0, jsx_runtime_1.jsxs)("span", { className: "text-museum-stone-400", children: ["@", telegramUser.username] })] }))] })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-museum-stone-600 text-xs text-center mt-1", children: "Your score is linked to your Telegram account" })] })] }), (0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.6 }, className: "flex justify-center gap-6 mt-6 text-center", children: [
                        { icon: '🏆', label: 'Leaderboard' },
                        { icon: '🎭', label: 'Eras' },
                        { icon: '🏛️', label: 'NFT Rewards' },
                    ].map(({ icon, label }) => ((0, jsx_runtime_1.jsxs)("div", { className: "text-museum-stone-400", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-2xl", children: icon }), (0, jsx_runtime_1.jsx)("div", { className: "text-xs mt-1", children: label })] }, label))) })] }) }));
}
