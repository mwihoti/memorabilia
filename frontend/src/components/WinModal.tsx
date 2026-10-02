import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useGameStore } from '../store/gameStore';
import { calculateStars, calculateGrade, DIFFICULTY_ORDER, GAME_CONFIGS, ERA_LEVEL_CONFIGS, getDifficultyMeta, getMaxLevelForEra, getMovesNeededForThreeStars, getTimeMedal, getTotalLevelCount } from '../types';
import { hapticNotification } from '../telegram/telegram';
import { isScoreEligibleForNFT } from '../cartridge/config';
import { createDuel, fetchPlayerStats } from '../lib/api';
import { loadGhostReplay } from '../store/ghostReplay';
import MedalBadge from './MedalBadge';
import { referralLink, shareLink } from '../lib/links';

interface WinModalProps {
  onClose: () => void;
  onNextLevel?: () => void;       // go directly to the next level
  onShowGhostReplay?: () => void; // optional — offered if ghost replay exists
}

const GRADE_STYLES: Record<string, string> = {
  S: 'from-amber-400 to-amber-600 text-white',
  A: 'from-sky-400 to-sky-600 text-white',
  B: 'from-emerald-400 to-emerald-600 text-white',
  C: 'from-slate-400 to-slate-600 text-white',
};

export default function WinModal({ onClose, onNextLevel, onShowGhostReplay }: WinModalProps) {
  const {
    currentGame,
    isWalletConnected,
    isMinting,
    mintTxHash,
    mintError,
    mintNFT,
    clearMintError,
    telegramUser,
    playerName,
    theme,
    currentEra,
    currentLevel,
    streak,
    levelProgress,
    newlyUnlockedAchievements,
    relicRewards,
    lastRunAnalytics,
    challengeMode,
    challengeSeed,
  } = useGameStore();

  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [duelCode, setDuelCode] = useState<string | null>(null);
  const [duelBusy, setDuelBusy] = useState(false);

  useEffect(() => {
    hapticNotification('success');
    if (currentGame && !scoreSubmitted) submitScoreToLeaderboard();
  }, [currentGame?.game_id]);

  useEffect(() => {
    if (!scoreSubmitted || !telegramUser) return;
    const timer = setTimeout(async () => {
      try {
        const stats = await fetchPlayerStats(telegramUser);
        if (stats) setPlayerRank(stats.rank);
      } catch { /* optional */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, [scoreSubmitted, telegramUser]);

  if (!currentGame) return null;

  const config = GAME_CONFIGS[currentGame.difficulty];
  const stars = calculateStars(currentGame.moves, config.optimalMoves);
  const grade = calculateGrade(currentGame.score);
  const elapsedTime = Math.floor((Date.now() - currentGame.started_at) / 1000);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const isEligibleForNFT = isScoreEligibleForNFT(currentGame.score);
  const canMintNFT = isEligibleForNFT && isWalletConnected && !mintTxHash;

  const displayName = playerName || telegramUser?.first_name || 'Curator';
  const difficultyMeta = getDifficultyMeta(currentGame.difficulty);
  const diffLabel = `${difficultyMeta.icon} ${difficultyMeta.label}`;

  // ── Level mode extras ─────────────────────────────────────────────────────
  const levelConfig = currentEra !== null
    ? ERA_LEVEL_CONFIGS[currentEra]?.[currentLevel - 1] ?? null
    : null;

  const timeMedal = levelConfig ? getTimeMedal(elapsedTime, levelConfig) : null;

  // Ghost replay availability
  const ghostReplay = currentEra !== null
    ? loadGhostReplay(currentEra, currentLevel)
    : null;

  const nextLevelConfig = levelConfig && currentEra !== null && currentLevel < getMaxLevelForEra(currentEra)
    ? ERA_LEVEL_CONFIGS[currentEra!]?.[currentLevel] ?? null
    : null;

  const totalLevels = getTotalLevelCount();
  const allLevelsComplete = levelProgress.filter((lp) => lp.completed).length >= totalLevels;

  const eraUnlockCheckpoint = currentEra !== null ? getMaxLevelForEra(currentEra) : 0;
  const justCompletedEraLevel3 =
    levelConfig !== null &&
    currentLevel === eraUnlockCheckpoint &&
    levelProgress.some(
      (lp) => lp.era === currentEra && lp.level === eraUnlockCheckpoint && lp.completed
    );

  const currentDifficultyIndex = DIFFICULTY_ORDER.indexOf(currentGame.difficulty);
  const nextEra = currentDifficultyIndex >= 0 ? DIFFICULTY_ORDER[currentDifficultyIndex + 1] : undefined;
  const nextEraLabel = nextEra ? `${getDifficultyMeta(nextEra).icon} ${getDifficultyMeta(nextEra).label}` : null;

  // ── Streak display ────────────────────────────────────────────────────────
  const streakMessage =
    streak.currentStreak >= 2
      ? `🔥 ${streak.currentStreak}-day streak! Keep it up!`
      : streak.currentStreak === 1
      ? 'Streak started! Come back tomorrow!'
      : null;

  const themeAccent = {
    museum: { btn: 'from-amber-500 to-amber-700 hover:from-amber-400', label: 'text-amber-400', badge: 'bg-amber-500/20 border-amber-500/30 text-amber-300' },
    nature: { btn: 'from-green-500 to-green-700 hover:from-green-400', label: 'text-green-400', badge: 'bg-green-500/20 border-green-500/30 text-green-300' },
    urban:  { btn: 'from-[#00ff88] to-[#00e5ff] hover:from-[#00e5ff]', label: 'text-[#00ff88]', badge: 'bg-[#00ff88]/10 border-[#00ff88]/25 text-[#00ff88]' },
  }[theme];

  /**
   * Turn the run just finished into a 24-hour duel on the same board.
   *
   * Offered at the moment of a win because that is the only moment someone
   * actually wants to be seen — a share prompt on the main menu converts at a
   * fraction of this.
   */
  const handleChallenge = async () => {
    if (!telegramUser || currentEra === null) return;
    setDuelBusy(true);
    try {
      const duel = await createDuel({
        telegramUser: {
          id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
        },
        difficulty: currentEra,
        level: currentLevel,
        displayName: playerName || telegramUser.first_name || 'Curator',
      });
      setDuelCode(duel.id);

      const text =
        `⚔️ I scored ${(currentGame?.score ?? 0).toLocaleString()} on this board. ` +
        `You have 24 hours to beat it.\n\nDuel code: ${duel.id}`;
      await shareLink(referralLink(telegramUser.id), text);
    } catch {
      // A failed duel must not block the win screen; the code stays null and
      // the button returns to its resting state.
    } finally {
      setDuelBusy(false);
    }
  };

  const handleShare = async () => {
    const starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    const challengeLine =
      challengeMode === 'weekly'
        ? `Weekly ladder seed ${challengeSeed}`
        : challengeMode === 'daily'
        ? `Daily challenge seed ${challengeSeed}`
        : null;
    const shareText =
      `${starStr} I scored ${currentGame.score.toLocaleString()} pts on Memorabilia!\n` +
      `${diffLabel} · ${currentGame.moves} moves · ${formatTime(elapsedTime)}\n` +
      `${challengeLine ? `${challengeLine}\n` : ''}` +
      `Can you beat it? 👇`;

    // The link carries the player's referral code, so a friend who joins
    // through it and clears a level pays out to both of them.
    const how = await shareLink(referralLink(telegramUser?.id), shareText);
    if (how === 'copied') {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  const submitScoreToLeaderboard = async () => {
    if (!currentGame || scoreSubmitted) return;
    try {
      setSubmitError(null);
      if (!currentGame.player || currentGame.player === 'demo_player') {
        setScoreSubmitted(true);
        return;
      }
      setScoreSubmitted(true);
    } catch {
      setSubmitError('Failed to add score to Hall of Fame');
      setScoreSubmitted(true);
    }
  };

  const newestRelic = levelConfig?.relic
    ? relicRewards.find((relic) => relic.name === levelConfig.relic)
    : null;
  const threeStarMoveCap = getMovesNeededForThreeStars(config.optimalMoves);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Confetti */}
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={300}
          gravity={0.3}
        />

        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal — sheet on mobile, centered card on desktop */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl"
          style={{ maxHeight: '92dvh' }}
        >
          {/* Drag handle (mobile) */}
          <div className="sm:hidden flex justify-center pt-3 pb-1 bg-[#1e293b]">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Scrollable content */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: 'calc(92dvh - 20px)', backgroundColor: '#1e293b' }}
          >
            <div className="px-5 pt-4 pb-6 space-y-4">

              {/* Header */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: 'spring' }}
                  className="text-5xl sm:text-6xl mb-2"
                >
                  🏆
                </motion.div>
                <h2 className={`text-2xl sm:text-3xl font-extrabold ${themeAccent.label}`}>
                  Exhibition Complete!
                </h2>
                <p className="text-white/50 text-xs mt-0.5">{displayName} · {diffLabel}</p>
              </div>

              {/* Stars */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3].map((star) => (
                  <motion.span
                    key={star}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.25 + star * 0.1, type: 'spring' }}
                    className="text-4xl sm:text-5xl"
                  >
                    {star <= stars ? '⭐' : '☆'}
                  </motion.span>
                ))}
              </div>

              {/* Medal display (level mode only) */}
              {levelConfig && timeMedal && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="flex items-center justify-center gap-2"
                >
                  <MedalBadge medal={timeMedal} />
                  <span className="text-white/70 text-sm">
                    ⏱️ {formatTime(elapsedTime)}
                    {timeMedal !== 'none' && (
                      <span className="ml-1 font-bold text-white">
                        · {timeMedal.charAt(0).toUpperCase() + timeMedal.slice(1)}!
                      </span>
                    )}
                  </span>
                </motion.div>
              )}

              {/* Grade + Score row */}
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.55, type: 'spring' }}
                  className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-extrabold bg-gradient-to-br ${GRADE_STYLES[grade] ?? GRADE_STYLES.C}`}
                >
                  {grade}
                </motion.div>
                <div className="flex-1 bg-white/5 rounded-2xl px-4 py-3">
                  <div className={`text-3xl font-extrabold ${themeAccent.label}`}>
                    {currentGame.score.toLocaleString()}
                  </div>
                  <div className="text-white/40 text-xs">points scored</div>
                  {/* Streak multiplier bonus applied */}
                  {streak.multiplierBonus > 0 && (
                    <div className="text-orange-400 text-[10px] mt-0.5">
                      +{Math.round(streak.multiplierBonus * 100)}% score bonus applied
                    </div>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Moves', value: currentGame.moves, sub: `opt. ${config.optimalMoves}` },
                  { label: 'Time',  value: formatTime(elapsedTime), sub: '' },
                  { label: 'Pairs', value: `${currentGame.matched_count}/${currentGame.total_pairs}`, sub: '' },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="bg-white/5 rounded-xl px-3 py-2.5 text-center">
                    <div className="text-white font-bold text-sm sm:text-base">{value}</div>
                    <div className="text-white/40 text-[10px]">{label}</div>
                    {sub && <div className="text-white/25 text-[9px]">{sub}</div>}
                  </div>
                ))}
              </div>

              {lastRunAnalytics && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">Run Breakdown</p>
                    {lastRunAnalytics.bossLevel && (
                      <span className="text-[10px] uppercase tracking-widest text-amber-300">Boss Clear</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-black/10 px-3 py-2">
                      <div className="text-white font-semibold">Longest Combo</div>
                      <div className="text-white/50">{lastRunAnalytics.longestCombo} chain</div>
                    </div>
                    <div className="rounded-xl bg-black/10 px-3 py-2">
                      <div className="text-white font-semibold">Mistakes</div>
                      <div className="text-white/50">{lastRunAnalytics.mistakes} total</div>
                    </div>
                    <div className="rounded-xl bg-black/10 px-3 py-2">
                      <div className="text-white font-semibold">Gold Pace</div>
                      <div className="text-white/50">
                        {lastRunAnalytics.goldTimeDelta <= 0
                          ? `${Math.abs(lastRunAnalytics.goldTimeDelta)}s inside gold`
                          : `${lastRunAnalytics.goldTimeDelta}s slower than gold`}
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/10 px-3 py-2">
                      <div className="text-white font-semibold">3-Star Pace</div>
                      <div className="text-white/50">
                        {currentGame.moves <= threeStarMoveCap
                          ? `${threeStarMoveCap - currentGame.moves} moves to spare`
                          : `${currentGame.moves - threeStarMoveCap} moves over cap`}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-white/60">
                    <span>💡 {lastRunAnalytics.hintUses} hints</span>
                    <span>❄️ {lastRunAnalytics.freezeBurstsUsed} freezes</span>
                    <span>🌀 {lastRunAnalytics.trapReshufflesUsed} reshuffles</span>
                    <span>🛡️ {lastRunAnalytics.shieldBlocksUsed} shield blocks</span>
                    <span>⚡ {lastRunAnalytics.multiplierMatches} boosted matches</span>
                  </div>
                </div>
              )}

              {lastRunAnalytics && (
                <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-4 py-3 text-sm text-sky-200">
                  {lastRunAnalytics.goldTimeDelta > 0
                    ? `Almost there: ${lastRunAnalytics.goldTimeDelta}s faster would have earned gold.`
                    : lastRunAnalytics.moveGapToThreeStars > 0
                    ? `Almost there: ${lastRunAnalytics.moveGapToThreeStars} fewer moves would have secured 3 stars.`
                    : 'Clean run. Push for a faster finish to widen your margin.'}
                </div>
              )}

              {/* Streak info */}
              {streakMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 border border-orange-500/25 rounded-xl"
                >
                  <span className="text-xl flex-shrink-0">🔥</span>
                  <p className="text-sm font-medium text-orange-300">{streakMessage}</p>
                </motion.div>
              )}

              {/* Achievement unlocks */}
              {newlyUnlockedAchievements.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-2"
                >
                  <p className="text-sm font-bold text-amber-300">🏆 New Achievements!</p>
                  <ul className="space-y-1">
                    {newlyUnlockedAchievements.map((ach) => (
                      <li key={ach.id} className="flex items-center gap-2 text-xs text-white/80">
                        <span className="text-base">{ach.icon}</span>
                        <span className="font-semibold">{ach.name}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {newestRelic && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.68 }}
                  className="px-4 py-3 bg-violet-500/10 border border-violet-500/25 rounded-xl"
                >
                  <p className="text-sm font-bold text-violet-300">Relic Unlocked</p>
                  <p className="text-xs text-white/70 mt-1">
                    {newestRelic.icon} {newestRelic.name} added to your vault.
                  </p>
                </motion.div>
              )}

              {/* Level progression */}
              {levelConfig && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-1.5"
                >
                  {nextLevelConfig && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-xl text-sm">
                      <span>⬆️</span>
                      <span className="text-white/70">
                        <>Next Level: <span className="font-bold text-white">{nextLevelConfig.label}</span></>
                      </span>
                    </div>
                  )}
                  {justCompletedEraLevel3 && nextEraLabel && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-sm">
                      <span>🔓</span>
                      <span className="text-emerald-300 font-medium">
                        Era Complete! {nextEraLabel} unlocked!
                      </span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Hall of Fame banner */}
              {scoreSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${themeAccent.badge}`}
                >
                  <span className="text-xl flex-shrink-0">🏅</span>
                  <div>
                    <p className="text-sm font-bold leading-tight">Added to Hall of Fame!</p>
                    <p className="text-xs opacity-70">
                      {playerRank
                        ? `You're ranked #${playerRank} globally`
                        : 'Your score is on the leaderboard'}
                    </p>
                  </div>
                </motion.div>
              )}

              {submitError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <span>⚠️</span><span>{submitError}</span>
                </div>
              )}

              {/* NFT section */}
              {isEligibleForNFT && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏛️</span>
                    <div>
                      <p className="font-bold text-amber-400 text-sm">NFT Eligible</p>
                      <p className="text-xs text-white/40">Score ≥ 10 · Mint your achievement</p>
                    </div>
                  </div>

                  {!isWalletConnected && (
                    <p className="text-xs text-amber-300">Connect your Cartridge wallet to mint</p>
                  )}

                  {mintTxHash && (
                    <div className="bg-white/5 rounded-xl p-3 text-xs text-white/60 break-all">
                      ✅ NFT Minted · Tx: {mintTxHash.slice(0, 10)}…{mintTxHash.slice(-6)}
                    </div>
                  )}

                  {mintError && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
                      ❌ {mintError.includes('Validate') ? 'Validation failed — reconnect wallet and retry' : mintError}
                      <button onClick={clearMintError} className="ml-2 underline opacity-70">Dismiss</button>
                    </div>
                  )}

                  {canMintNFT && (
                    <button
                      onClick={() => { clearMintError(); mintNFT(); }}
                      disabled={isMinting}
                      className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 text-white transition-all disabled:opacity-50"
                    >
                      {isMinting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Minting…
                        </span>
                      ) : 'Mint NFT 🏛️'}
                    </button>
                  )}

                  {mintError && (
                    <button
                      onClick={() => { clearMintError(); mintNFT(); }}
                      disabled={isMinting}
                      className="w-full py-2.5 border border-red-500/40 rounded-xl text-red-400 text-sm font-bold hover:bg-red-900/20 transition-all"
                    >
                      {isMinting ? 'Retrying…' : '🔄 Retry Minting'}
                    </button>
                  )}
                </div>
              )}

              {/* Ghost replay offer */}
              {ghostReplay && onShowGhostReplay && (
                <motion.button
                  onClick={onShowGhostReplay}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-sm font-medium text-white/70 hover:text-white/90 transition-all flex items-center justify-center gap-2"
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 }}
                >
                  <span>👻</span>
                  <span>Watch Best Run</span>
                </motion.button>
              )}

              {/* All levels complete banner */}
              {allLevelsComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, type: 'spring' }}
                  className="px-4 py-4 bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/40 rounded-2xl text-center space-y-2"
                >
                  <div className="text-3xl">🎉</div>
                  <p className="text-amber-300 font-extrabold text-base">You've Mastered All Levels!</p>
                  <p className="text-white/60 text-xs">You completed all {totalLevels} levels across every era. More games are coming — stay tuned!</p>
                  <p className="text-white/40 text-[10px] italic">🚀 New challenges coming soon…</p>
                </motion.div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                {/* Next Level button — shown if next level exists and not all levels done */}
                {nextLevelConfig && onNextLevel && !allLevelsComplete && (
                  <motion.button
                    onClick={onNextLevel}
                    className={`w-full py-3.5 bg-gradient-to-r ${themeAccent.btn} text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2`}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <span>⬆️</span>
                    <span>{`Next Level: ${nextLevelConfig?.label ?? 'Continue'}`}</span>
                  </motion.button>
                )}

                <motion.button
                  onClick={handleChallenge}
                  disabled={duelBusy}
                  className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(180deg, rgba(232,180,74,0.18), rgba(232,180,74,0.08))',
                    border: '1px solid rgba(232,180,74,0.42)',
                    color: '#f5cd6d',
                  }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85 }}
                >
                  {duelCode ? (
                    <><span>⚔️</span><span>Duel code {duelCode} — share it</span></>
                  ) : (
                    <><span>⚔️</span><span>{duelBusy ? 'Opening duel…' : 'Challenge a friend'}</span></>
                  )}
                </motion.button>

                <div className="flex gap-3">
                  <motion.button
                    onClick={onClose}
                    className="flex-1 py-3.5 bg-white/10 hover:bg-white/15 rounded-xl font-bold text-sm text-white/80 transition-all"
                    whileTap={{ scale: 0.97 }}
                  >
                    {nextLevelConfig ? 'Choose Level' : 'New Exhibition'}
                  </motion.button>

                  <motion.button
                    onClick={handleShare}
                    className="flex-1 py-3.5 bg-white/10 hover:bg-white/15 rounded-xl font-bold text-sm text-white/80 transition-all flex items-center justify-center gap-1.5"
                    whileTap={{ scale: 0.97 }}
                  >
                    {shareCopied ? (
                      <><span>✅</span><span>Copied!</span></>
                    ) : (
                      <><span>📤</span><span>Share</span></>
                    )}
                  </motion.button>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
