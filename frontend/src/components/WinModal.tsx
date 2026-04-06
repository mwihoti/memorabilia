import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useGameStore } from '../store/gameStore';
import { calculateStars, calculateGrade, GAME_CONFIGS, ERA_LEVEL_CONFIGS, getTimeMedal } from '../types';
import { hapticNotification } from '../telegram/telegram';
import { isScoreEligibleForNFT } from '../cartridge/config';
import { fetchPlayerStats } from '../lib/api';
import { loadGhostReplay } from '../store/ghostReplay';
import MedalBadge from './MedalBadge';

interface WinModalProps {
  onClose: () => void;
  onShowGhostReplay?: () => void; // optional — offered if ghost replay exists
}

const GRADE_STYLES: Record<string, string> = {
  S: 'from-amber-400 to-amber-600 text-white',
  A: 'from-sky-400 to-sky-600 text-white',
  B: 'from-emerald-400 to-emerald-600 text-white',
  C: 'from-slate-400 to-slate-600 text-white',
};

export default function WinModal({ onClose, onShowGhostReplay }: WinModalProps) {
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
  } = useGameStore();

  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    hapticNotification('success');
    if (currentGame && !scoreSubmitted) submitScoreToLeaderboard();
  }, [currentGame?.game_id]);

  useEffect(() => {
    if (!scoreSubmitted || !telegramUser) return;
    const timer = setTimeout(async () => {
      try {
        const stats = await fetchPlayerStats(telegramUser.id);
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
  const diffLabel =
    currentGame.difficulty === 1 ? '🏺 Ancient Era' :
    currentGame.difficulty === 2 ? '⚔️ Medieval Times' : '🚀 Modern Era';

  // ── Level mode extras ─────────────────────────────────────────────────────
  const levelConfig = currentEra !== null
    ? ERA_LEVEL_CONFIGS[currentEra]?.[currentLevel - 1] ?? null
    : null;

  const timeMedal = levelConfig ? getTimeMedal(elapsedTime, levelConfig) : null;

  // Ghost replay availability
  const ghostReplay = currentEra !== null
    ? loadGhostReplay(currentEra, currentLevel)
    : null;

  // Next level info
  const nextLevelConfig = levelConfig && currentLevel < 5
    ? ERA_LEVEL_CONFIGS[currentEra!]?.[currentLevel] ?? null
    : null;

  // Era completion check: just completed level 3 of an era
  const justCompletedEraLevel3 =
    levelConfig !== null &&
    currentLevel === 3 &&
    levelProgress.some(
      (lp) => lp.era === currentEra && lp.level === 3 && lp.completed
    );

  const nextEraLabel =
    currentGame.difficulty === 1 ? '⚔️ Medieval Times' :
    currentGame.difficulty === 2 ? '🚀 Modern Era' : null;

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

  const handleShare = async () => {
    const starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    const shareText =
      `${starStr} I scored ${currentGame.score.toLocaleString()} pts on Memorabilia!\n` +
      `${diffLabel} · ${currentGame.moves} moves · ${formatTime(elapsedTime)}\n` +
      `Play now 👉 https://t.me/memorabilia_game_bot`;

    // Try native Web Share first (works in Telegram WebApp on mobile)
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch { /* user cancelled or not supported */ }
    }

    // Telegram forward link fallback
    const tgUrl = `https://t.me/share/url?url=https://t.me/memorabilia_game_bot&text=${encodeURIComponent(shareText)}`;
    const tg = (window as any).Telegram?.WebApp;
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
    } catch {
      window.open(tgUrl, '_blank');
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
                        Next Level: <span className="font-bold text-white">{nextLevelConfig.label}</span>
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

              {/* Actions */}
              <div className="flex gap-3">
                <motion.button
                  onClick={onClose}
                  className={`flex-1 py-3.5 bg-gradient-to-r ${themeAccent.btn} text-white font-bold rounded-xl text-sm transition-all shadow-lg`}
                  whileTap={{ scale: 0.97 }}
                >
                  New Exhibition
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
