"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Header;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const gameStore_1 = require("../store/gameStore");
const WalletButton_1 = require("./WalletButton");
const sounds_1 = require("../utils/sounds");
function Header({ onShowLeaderboard, onBackToDifficulty, onShowDashboard, onLeave, currentScreen }) {
    const { telegramUser, playerName, theme, streak } = (0, gameStore_1.useGameStore)();
    const displayName = playerName || telegramUser?.first_name || null;
    const avatarLetter = displayName?.[0]?.toUpperCase() ?? '?';
    const [soundEnabled, setSoundEnabled] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        setSoundEnabled((0, sounds_1.isSoundEnabled)());
    }, []);
    const themeStyles = {
        museum: {
            header: 'bg-[#1e293b]/90 border-amber-600/30',
            title: 'from-amber-400 to-amber-700',
            subtitle: 'text-amber-200/60',
            avatar: 'from-amber-500 to-amber-700',
            btn: 'bg-amber-500 hover:bg-amber-400 text-slate-900',
            btnSecondary: 'bg-amber-700/40 hover:bg-amber-700/60 text-amber-100',
            icon: '🏛️',
            name: 'Time-Travel Museum',
            streak: 'text-orange-400',
        },
        nature: {
            header: 'bg-[#14532d]/90 border-green-400/30',
            title: 'from-green-400 to-green-600',
            subtitle: 'text-green-200/60',
            avatar: 'from-green-500 to-green-700',
            btn: 'bg-green-500 hover:bg-green-400 text-slate-900',
            btnSecondary: 'bg-green-700/40 hover:bg-green-700/60 text-green-100',
            icon: '🌿',
            name: 'Nature Trails',
            streak: 'text-orange-400',
        },
        urban: {
            header: 'bg-[#18181b]/90 border-[#00ff88]/20',
            title: 'from-[#00ff88] to-[#00e5ff]',
            subtitle: 'text-[#00ff88]/50',
            avatar: 'from-[#00ff88]/30 to-[#00e5ff]/30',
            btn: 'bg-[#00ff88] hover:bg-[#00e5ff] text-black',
            btnSecondary: 'bg-white/5 hover:bg-white/10 text-[#00ff88] border border-[#00ff88]/30',
            icon: '🎨',
            name: 'Urban Gallery',
            streak: 'text-orange-400',
        },
    }[theme];
    return ((0, jsx_runtime_1.jsx)("header", { className: `${themeStyles.header} backdrop-blur-lg border-b shadow-lg`, children: (0, jsx_runtime_1.jsx)("div", { className: "container mx-auto px-3 sm:px-4 py-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 min-w-0 flex-shrink-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-2xl", children: themeStyles.icon }), (0, jsx_runtime_1.jsxs)("div", { className: "hidden sm:block min-w-0", children: [(0, jsx_runtime_1.jsx)("h1", { className: `text-base font-bold bg-gradient-to-r ${themeStyles.title} bg-clip-text text-transparent leading-tight`, children: themeStyles.name }), (0, jsx_runtime_1.jsx)("p", { className: `text-[10px] ${themeStyles.subtitle} leading-tight`, children: "Memorabilia \u00B7 Starknet" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end", children: [(0, jsx_runtime_1.jsx)(WalletButton_1.default, {}), streak.currentStreak > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: `flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-bold ${themeStyles.streak} bg-orange-500/10 border border-orange-500/20`, title: `${streak.currentStreak}-day streak`, children: [(0, jsx_runtime_1.jsx)("span", { children: "\uD83D\uDD25" }), (0, jsx_runtime_1.jsx)("span", { children: streak.currentStreak })] })), currentScreen === 'game' && ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setSoundEnabled((0, sounds_1.toggleSound)()), className: `px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${themeStyles.btnSecondary}`, title: soundEnabled ? 'Mute game sounds' : 'Enable game sounds', children: [(0, jsx_runtime_1.jsx)("span", { className: "sm:hidden", children: soundEnabled ? '🔊' : '🔇' }), (0, jsx_runtime_1.jsx)("span", { className: "hidden sm:inline", children: soundEnabled ? '🔊 Sound' : '🔇 Muted' })] })), currentScreen === 'game' && ((0, jsx_runtime_1.jsxs)("button", { onClick: onBackToDifficulty, className: `px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${themeStyles.btnSecondary}`, title: "Back to menu", children: [(0, jsx_runtime_1.jsx)("span", { className: "sm:hidden", children: "\u2190" }), (0, jsx_runtime_1.jsx)("span", { className: "hidden sm:inline", children: "\u2190 Menu" })] })), currentScreen !== 'leaderboard' && ((0, jsx_runtime_1.jsxs)("button", { onClick: onShowLeaderboard, className: `px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${themeStyles.btn}`, title: "Leaderboard", children: [(0, jsx_runtime_1.jsx)("span", { children: "\uD83C\uDFC6" }), (0, jsx_runtime_1.jsx)("span", { className: "hidden sm:inline", children: "Hall of Fame" })] })), currentScreen !== 'dashboard' && ((0, jsx_runtime_1.jsxs)("button", { onClick: onShowDashboard, className: `px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${themeStyles.btnSecondary}`, title: "Dashboard", children: [(0, jsx_runtime_1.jsx)("span", { children: "\uD83D\uDCCA" }), (0, jsx_runtime_1.jsx)("span", { className: "hidden sm:inline", children: "Dashboard" })] })), (0, jsx_runtime_1.jsx)("button", { onClick: onLeave, className: "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-white/40 hover:text-white/70", title: "Leave game", children: (0, jsx_runtime_1.jsx)("span", { children: "\u2715" }) }), displayName && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 ml-1", children: [(0, jsx_runtime_1.jsx)("div", { className: `w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br ${themeStyles.avatar} rounded-full flex items-center justify-center text-xs font-bold text-white border border-white/20`, children: avatarLetter }), (0, jsx_runtime_1.jsxs)("div", { className: "hidden md:block", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-medium text-white/90 leading-tight", children: displayName }), telegramUser?.username && ((0, jsx_runtime_1.jsxs)("p", { className: "text-[10px] text-white/40", children: ["@", telegramUser.username] }))] })] }))] })] }) }) }));
}
