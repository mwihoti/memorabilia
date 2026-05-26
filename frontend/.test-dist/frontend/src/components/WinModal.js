"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WinModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const react_confetti_1 = require("react-confetti");
const gameStore_1 = require("../store/gameStore");
const types_1 = require("../types");
const telegram_1 = require("../telegram/telegram");
const config_1 = require("../cartridge/config");
const api_1 = require("../lib/api");
const ghostReplay_1 = require("../store/ghostReplay");
const MedalBadge_1 = require("./MedalBadge");
const GRADE_STYLES = {
    S: 'from-amber-400 to-amber-600 text-white',
    A: 'from-sky-400 to-sky-600 text-white',
    B: 'from-emerald-400 to-emerald-600 text-white',
    C: 'from-slate-400 to-slate-600 text-white',
};
function WinModal({ onClose, onNextLevel, onShowGhostReplay }) {
    const { currentGame, isWalletConnected, isMinting, mintTxHash, mintError, mintNFT, clearMintError, telegramUser, playerName, theme, currentEra, currentLevel, streak, levelProgress, newlyUnlockedAchievements, relicRewards, lastRunAnalytics, challengeMode, challengeSeed, } = (0, gameStore_1.useGameStore)();
    const [scoreSubmitted, setScoreSubmitted] = (0, react_1.useState)(false);
    const [submitError, setSubmitError] = (0, react_1.useState)(null);
    const [playerRank, setPlayerRank] = (0, react_1.useState)(null);
    const [shareCopied, setShareCopied] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        (0, telegram_1.hapticNotification)('success');
        if (currentGame && !scoreSubmitted)
            submitScoreToLeaderboard();
    }, [currentGame?.game_id]);
    (0, react_1.useEffect)(() => {
        if (!scoreSubmitted || !telegramUser)
            return;
        const timer = setTimeout(async () => {
            try {
                const stats = await (0, api_1.fetchPlayerStats)(telegramUser.id);
                if (stats)
                    setPlayerRank(stats.rank);
            }
            catch { /* optional */ }
        }, 1500);
        return () => clearTimeout(timer);
    }, [scoreSubmitted, telegramUser]);
    if (!currentGame)
        return null;
    const config = types_1.GAME_CONFIGS[currentGame.difficulty];
    const stars = (0, types_1.calculateStars)(currentGame.moves, config.optimalMoves);
    const grade = (0, types_1.calculateGrade)(currentGame.score);
    const elapsedTime = Math.floor((Date.now() - currentGame.started_at) / 1000);
    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const isEligibleForNFT = (0, config_1.isScoreEligibleForNFT)(currentGame.score);
    const canMintNFT = isEligibleForNFT && isWalletConnected && !mintTxHash;
    const displayName = playerName || telegramUser?.first_name || 'Curator';
    const difficultyMeta = (0, types_1.getDifficultyMeta)(currentGame.difficulty);
    const diffLabel = `${difficultyMeta.icon} ${difficultyMeta.label}`;
    // ── Level mode extras ─────────────────────────────────────────────────────
    const levelConfig = currentEra !== null
        ? types_1.ERA_LEVEL_CONFIGS[currentEra]?.[currentLevel - 1] ?? null
        : null;
    const timeMedal = levelConfig ? (0, types_1.getTimeMedal)(elapsedTime, levelConfig) : null;
    // Ghost replay availability
    const ghostReplay = currentEra !== null
        ? (0, ghostReplay_1.loadGhostReplay)(currentEra, currentLevel)
        : null;
    const nextLevelConfig = levelConfig && currentEra !== null && currentLevel < (0, types_1.getMaxLevelForEra)(currentEra)
        ? types_1.ERA_LEVEL_CONFIGS[currentEra]?.[currentLevel] ?? null
        : null;
    const totalLevels = (0, types_1.getTotalLevelCount)();
    const allLevelsComplete = levelProgress.filter((lp) => lp.completed).length >= totalLevels;
    const eraUnlockCheckpoint = currentEra !== null ? (0, types_1.getMaxLevelForEra)(currentEra) : 0;
    const justCompletedEraLevel3 = levelConfig !== null &&
        currentLevel === eraUnlockCheckpoint &&
        levelProgress.some((lp) => lp.era === currentEra && lp.level === eraUnlockCheckpoint && lp.completed);
    const currentDifficultyIndex = types_1.DIFFICULTY_ORDER.indexOf(currentGame.difficulty);
    const nextEra = currentDifficultyIndex >= 0 ? types_1.DIFFICULTY_ORDER[currentDifficultyIndex + 1] : undefined;
    const nextEraLabel = nextEra ? `${(0, types_1.getDifficultyMeta)(nextEra).icon} ${(0, types_1.getDifficultyMeta)(nextEra).label}` : null;
    // ── Streak display ────────────────────────────────────────────────────────
    const streakMessage = streak.currentStreak >= 2
        ? `🔥 ${streak.currentStreak}-day streak! Keep it up!`
        : streak.currentStreak === 1
            ? 'Streak started! Come back tomorrow!'
            : null;
    const themeAccent = {
        museum: { btn: 'from-amber-500 to-amber-700 hover:from-amber-400', label: 'text-amber-400', badge: 'bg-amber-500/20 border-amber-500/30 text-amber-300' },
        nature: { btn: 'from-green-500 to-green-700 hover:from-green-400', label: 'text-green-400', badge: 'bg-green-500/20 border-green-500/30 text-green-300' },
        urban: { btn: 'from-[#00ff88] to-[#00e5ff] hover:from-[#00e5ff]', label: 'text-[#00ff88]', badge: 'bg-[#00ff88]/10 border-[#00ff88]/25 text-[#00ff88]' },
    }[theme];
    const handleShare = async () => {
        const starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        const challengeLine = challengeMode === 'weekly'
            ? `Weekly ladder seed ${challengeSeed}`
            : challengeMode === 'daily'
                ? `Daily challenge seed ${challengeSeed}`
                : null;
        const shareText = `${starStr} I scored ${currentGame.score.toLocaleString()} pts on Memorabilia!\n` +
            `${diffLabel} · ${currentGame.moves} moves · ${formatTime(elapsedTime)}\n` +
            `${challengeLine ? `${challengeLine}\n` : ''}` +
            `Play now 👉 https://t.me/enter_memorabilia_musem_bot`;
        // Try native Web Share first (works in Telegram WebApp on mobile)
        if (navigator.share) {
            try {
                await navigator.share({ text: shareText });
                return;
            }
            catch { /* user cancelled or not supported */ }
        }
        // Telegram forward link fallback
        const tgUrl = `https://t.me/share/url?url=https://t.me/enter_memorabilia_musem_bot&text=${encodeURIComponent(shareText)}`;
        const tg = window.Telegram?.WebApp;
        if (tg?.openTelegramLink) {
            tg.openTelegramLink(tgUrl);
            return;
        }
        if (tg?.openLink) {
            tg.openLink(tgUrl);
            return;
        }
        // Final fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(shareText);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2500);
        }
        catch {
            window.open(tgUrl, '_blank');
        }
    };
    const submitScoreToLeaderboard = async () => {
        if (!currentGame || scoreSubmitted)
            return;
        try {
            setSubmitError(null);
            if (!currentGame.player || currentGame.player === 'demo_player') {
                setScoreSubmitted(true);
                return;
            }
            setScoreSubmitted(true);
        }
        catch {
            setSubmitError('Failed to add score to Hall of Fame');
            setScoreSubmitted(true);
        }
    };
    const newestRelic = levelConfig?.relic
        ? relicRewards.find((relic) => relic.name === levelConfig.relic)
        : null;
    const threeStarMoveCap = (0, types_1.getMovesNeededForThreeStars)(config.optimalMoves);
    return ((0, jsx_runtime_1.jsx)(framer_motion_1.AnimatePresence, { children: (0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4", children: [(0, jsx_runtime_1.jsx)(react_confetti_1.default, { width: window.innerWidth, height: window.innerHeight, recycle: false, numberOfPieces: 300, gravity: 0.3 }), (0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "absolute inset-0 bg-black/75 backdrop-blur-sm", onClick: onClose }), (0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { y: '100%', opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: '100%', opacity: 0 }, transition: { type: 'spring', stiffness: 300, damping: 30 }, className: "relative w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl", style: { maxHeight: '92dvh' }, children: [(0, jsx_runtime_1.jsx)("div", { className: "sm:hidden flex justify-center pt-3 pb-1 bg-[#1e293b]", children: (0, jsx_runtime_1.jsx)("div", { className: "w-10 h-1 bg-white/20 rounded-full" }) }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-y-auto", style: { maxHeight: 'calc(92dvh - 20px)', backgroundColor: '#1e293b' }, children: (0, jsx_runtime_1.jsxs)("div", { className: "px-5 pt-4 pb-6 space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { scale: 0, rotate: -180 }, animate: { scale: 1, rotate: 0 }, transition: { delay: 0.15, type: 'spring' }, className: "text-5xl sm:text-6xl mb-2", children: "\uD83C\uDFC6" }), (0, jsx_runtime_1.jsx)("h2", { className: `text-2xl sm:text-3xl font-extrabold ${themeAccent.label}`, children: "Exhibition Complete!" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-white/50 text-xs mt-0.5", children: [displayName, " \u00B7 ", diffLabel] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex justify-center gap-2", children: [1, 2, 3].map((star) => ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.span, { initial: { scale: 0, rotate: -180 }, animate: { scale: 1, rotate: 0 }, transition: { delay: 0.25 + star * 0.1, type: 'spring' }, className: "text-4xl sm:text-5xl", children: star <= stars ? '⭐' : '☆' }, star))) }), levelConfig && timeMedal && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.55 }, className: "flex items-center justify-center gap-2", children: [(0, jsx_runtime_1.jsx)(MedalBadge_1.default, { medal: timeMedal }), (0, jsx_runtime_1.jsxs)("span", { className: "text-white/70 text-sm", children: ["\u23F1\uFE0F ", formatTime(elapsedTime), timeMedal !== 'none' && ((0, jsx_runtime_1.jsxs)("span", { className: "ml-1 font-bold text-white", children: ["\u00B7 ", timeMedal.charAt(0).toUpperCase() + timeMedal.slice(1), "!"] }))] })] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { scale: 0 }, animate: { scale: 1 }, transition: { delay: 0.55, type: 'spring' }, className: `flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-extrabold bg-gradient-to-br ${GRADE_STYLES[grade] ?? GRADE_STYLES.C}`, children: grade }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 bg-white/5 rounded-2xl px-4 py-3", children: [(0, jsx_runtime_1.jsx)("div", { className: `text-3xl font-extrabold ${themeAccent.label}`, children: currentGame.score.toLocaleString() }), (0, jsx_runtime_1.jsx)("div", { className: "text-white/40 text-xs", children: "points scored" }), streak.multiplierBonus > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "text-orange-400 text-[10px] mt-0.5", children: ["+", Math.round(streak.multiplierBonus * 100), "% score bonus applied"] }))] })] }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-3 gap-2", children: [
                                            { label: 'Moves', value: currentGame.moves, sub: `opt. ${config.optimalMoves}` },
                                            { label: 'Time', value: formatTime(elapsedTime), sub: '' },
                                            { label: 'Pairs', value: `${currentGame.matched_count}/${currentGame.total_pairs}`, sub: '' },
                                        ].map(({ label, value, sub }) => ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white/5 rounded-xl px-3 py-2.5 text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-white font-bold text-sm sm:text-base", children: value }), (0, jsx_runtime_1.jsx)("div", { className: "text-white/40 text-[10px]", children: label }), sub && (0, jsx_runtime_1.jsx)("div", { className: "text-white/25 text-[9px]", children: sub })] }, label))) }), lastRunAnalytics && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-bold text-white", children: "Run Breakdown" }), lastRunAnalytics.bossLevel && ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] uppercase tracking-widest text-amber-300", children: "Boss Clear" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl bg-black/10 px-3 py-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-white font-semibold", children: "Longest Combo" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-white/50", children: [lastRunAnalytics.longestCombo, " chain"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl bg-black/10 px-3 py-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-white font-semibold", children: "Mistakes" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-white/50", children: [lastRunAnalytics.mistakes, " total"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl bg-black/10 px-3 py-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-white font-semibold", children: "Gold Pace" }), (0, jsx_runtime_1.jsx)("div", { className: "text-white/50", children: lastRunAnalytics.goldTimeDelta <= 0
                                                                    ? `${Math.abs(lastRunAnalytics.goldTimeDelta)}s inside gold`
                                                                    : `${lastRunAnalytics.goldTimeDelta}s slower than gold` })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl bg-black/10 px-3 py-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-white font-semibold", children: "3-Star Pace" }), (0, jsx_runtime_1.jsx)("div", { className: "text-white/50", children: currentGame.moves <= threeStarMoveCap
                                                                    ? `${threeStarMoveCap - currentGame.moves} moves to spare`
                                                                    : `${currentGame.moves - threeStarMoveCap} moves over cap` })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-2 text-[11px] text-white/60", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["\uD83D\uDCA1 ", lastRunAnalytics.hintUses, " hints"] }), (0, jsx_runtime_1.jsxs)("span", { children: ["\u2744\uFE0F ", lastRunAnalytics.freezeBurstsUsed, " freezes"] }), (0, jsx_runtime_1.jsxs)("span", { children: ["\uD83C\uDF00 ", lastRunAnalytics.trapReshufflesUsed, " reshuffles"] }), (0, jsx_runtime_1.jsxs)("span", { children: ["\uD83D\uDEE1\uFE0F ", lastRunAnalytics.shieldBlocksUsed, " shield blocks"] }), (0, jsx_runtime_1.jsxs)("span", { children: ["\u26A1 ", lastRunAnalytics.multiplierMatches, " boosted matches"] })] })] })), lastRunAnalytics && ((0, jsx_runtime_1.jsx)("div", { className: "rounded-xl bg-sky-500/10 border border-sky-500/20 px-4 py-3 text-sm text-sky-200", children: lastRunAnalytics.goldTimeDelta > 0
                                            ? `Almost there: ${lastRunAnalytics.goldTimeDelta}s faster would have earned gold.`
                                            : lastRunAnalytics.moveGapToThreeStars > 0
                                                ? `Almost there: ${lastRunAnalytics.moveGapToThreeStars} fewer moves would have secured 3 stars.`
                                                : 'Clean run. Push for a faster finish to widen your margin.' })), streakMessage && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.6 }, className: "flex items-center gap-2 px-4 py-3 bg-orange-500/10 border border-orange-500/25 rounded-xl", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xl flex-shrink-0", children: "\uD83D\uDD25" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium text-orange-300", children: streakMessage })] })), newlyUnlockedAchievements.length > 0 && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.65 }, className: "px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-bold text-amber-300", children: "\uD83C\uDFC6 New Achievements!" }), (0, jsx_runtime_1.jsx)("ul", { className: "space-y-1", children: newlyUnlockedAchievements.map((ach) => ((0, jsx_runtime_1.jsxs)("li", { className: "flex items-center gap-2 text-xs text-white/80", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-base", children: ach.icon }), (0, jsx_runtime_1.jsx)("span", { className: "font-semibold", children: ach.name })] }, ach.id))) })] })), newestRelic && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.68 }, className: "px-4 py-3 bg-violet-500/10 border border-violet-500/25 rounded-xl", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-bold text-violet-300", children: "Relic Unlocked" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-white/70 mt-1", children: [newestRelic.icon, " ", newestRelic.name, " added to your vault."] })] })), levelConfig && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.7 }, className: "space-y-1.5", children: [nextLevelConfig && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-xl text-sm", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2B06\uFE0F" }), (0, jsx_runtime_1.jsx)("span", { className: "text-white/70", children: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["Next Level: ", (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-white", children: nextLevelConfig.label })] }) })] })), justCompletedEraLevel3 && nextEraLabel && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-sm", children: [(0, jsx_runtime_1.jsx)("span", { children: "\uD83D\uDD13" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-emerald-300 font-medium", children: ["Era Complete! ", nextEraLabel, " unlocked!"] })] }))] })), scoreSubmitted && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, className: `flex items-center gap-3 px-4 py-3 rounded-xl border ${themeAccent.badge}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xl flex-shrink-0", children: "\uD83C\uDFC5" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-bold leading-tight", children: "Added to Hall of Fame!" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs opacity-70", children: playerRank
                                                            ? `You're ranked #${playerRank} globally`
                                                            : 'Your score is on the leaderboard' })] })] })), submitError && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u26A0\uFE0F" }), (0, jsx_runtime_1.jsx)("span", { children: submitError })] })), isEligibleForNFT && ((0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-2xl", children: "\uD83C\uDFDB\uFE0F" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "font-bold text-amber-400 text-sm", children: "NFT Eligible" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-white/40", children: "Score \u2265 10 \u00B7 Mint your achievement" })] })] }), !isWalletConnected && ((0, jsx_runtime_1.jsx)("p", { className: "text-xs text-amber-300", children: "Connect your Cartridge wallet to mint" })), mintTxHash && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white/5 rounded-xl p-3 text-xs text-white/60 break-all", children: ["\u2705 NFT Minted \u00B7 Tx: ", mintTxHash.slice(0, 10), "\u2026", mintTxHash.slice(-6)] })), mintError && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-xs text-red-400", children: ["\u274C ", mintError.includes('Validate') ? 'Validation failed — reconnect wallet and retry' : mintError, (0, jsx_runtime_1.jsx)("button", { onClick: clearMintError, className: "ml-2 underline opacity-70", children: "Dismiss" })] })), canMintNFT && ((0, jsx_runtime_1.jsx)("button", { onClick: () => { clearMintError(); mintNFT(); }, disabled: isMinting, className: "w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 text-white transition-all disabled:opacity-50", children: isMinting ? ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-center justify-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }), "Minting\u2026"] })) : 'Mint NFT 🏛️' })), mintError && ((0, jsx_runtime_1.jsx)("button", { onClick: () => { clearMintError(); mintNFT(); }, disabled: isMinting, className: "w-full py-2.5 border border-red-500/40 rounded-xl text-red-400 text-sm font-bold hover:bg-red-900/20 transition-all", children: isMinting ? 'Retrying…' : '🔄 Retry Minting' }))] })), ghostReplay && onShowGhostReplay && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.button, { onClick: onShowGhostReplay, className: "w-full py-3 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-sm font-medium text-white/70 hover:text-white/90 transition-all flex items-center justify-center gap-2", whileTap: { scale: 0.97 }, initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.75 }, children: [(0, jsx_runtime_1.jsx)("span", { children: "\uD83D\uDC7B" }), (0, jsx_runtime_1.jsx)("span", { children: "Watch Best Run" })] })), allLevelsComplete && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, transition: { delay: 0.8, type: 'spring' }, className: "px-4 py-4 bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/40 rounded-2xl text-center space-y-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-3xl", children: "\uD83C\uDF89" }), (0, jsx_runtime_1.jsx)("p", { className: "text-amber-300 font-extrabold text-base", children: "You've Mastered All Levels!" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-white/60 text-xs", children: ["You completed all ", totalLevels, " levels across every era. More games are coming \u2014 stay tuned!"] }), (0, jsx_runtime_1.jsx)("p", { className: "text-white/40 text-[10px] italic", children: "\uD83D\uDE80 New challenges coming soon\u2026" })] })), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [nextLevelConfig && onNextLevel && !allLevelsComplete && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.button, { onClick: onNextLevel, className: `w-full py-3.5 bg-gradient-to-r ${themeAccent.btn} text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2`, whileTap: { scale: 0.97 }, initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.8 }, children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2B06\uFE0F" }), (0, jsx_runtime_1.jsx)("span", { children: `Next Level: ${nextLevelConfig?.label ?? 'Continue'}` })] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-3", children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.button, { onClick: onClose, className: "flex-1 py-3.5 bg-white/10 hover:bg-white/15 rounded-xl font-bold text-sm text-white/80 transition-all", whileTap: { scale: 0.97 }, children: nextLevelConfig ? 'Choose Level' : 'New Exhibition' }), (0, jsx_runtime_1.jsx)(framer_motion_1.motion.button, { onClick: handleShare, className: "flex-1 py-3.5 bg-white/10 hover:bg-white/15 rounded-xl font-bold text-sm text-white/80 transition-all flex items-center justify-center gap-1.5", whileTap: { scale: 0.97 }, children: shareCopied ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2705" }), (0, jsx_runtime_1.jsx)("span", { children: "Copied!" })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { children: "\uD83D\uDCE4" }), (0, jsx_runtime_1.jsx)("span", { children: "Share" })] })) })] })] })] }) })] })] }) }));
}
