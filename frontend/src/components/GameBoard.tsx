import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { GAME_CONFIGS, ERA_LEVEL_CONFIGS, getDifficultyMeta, getTimeMedal } from '../types';
import Card from './Card';
import ComboDisplay from './ComboDisplay';

export default function GameBoard() {
  const {
    currentGame,
    flippedCards,
    flipCard,
    isChecking,
    theme,
    combo,
    mismatches,
    currentEra,
    currentLevel,
    currentStage,
    streak,
    shieldCharges,
    hintCharges,
    freezeCharges,
    trapCharges,
    multiplierCharges,
    pendingMultiplier,
    hiddenCardIndices,
    pulseScanRow,
    hintPairIndices,
    useHint,
    useFreeze,
    useTrap,
    armMultiplier,
    triggerSandstorm,
    triggerPulseScan,
  } = useGameStore();

  const [elapsedTime, setElapsedTime] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [previewCountdown, setPreviewCountdown] = useState(3);
  const [mismatchedIndices, setMismatchedIndices] = useState<number[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [showStreak, setShowStreak] = useState(false);
  const prevMatchedCount = useRef(0);

  // Preview countdown — use level config preview duration if available
  useEffect(() => {
    if (!currentGame) return;
    setShowPreview(true);
    prevMatchedCount.current = 0;

    // Determine preview duration from level config if in level mode
    let previewDurationMs = 3000;
    if (currentEra !== null) {
      const levelConfig = ERA_LEVEL_CONFIGS[currentEra]?.[currentLevel - 1];
      if (levelConfig) {
        previewDurationMs = levelConfig.previewDuration;
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
        if (c <= 1) { clearInterval(tick); return 0; }
        return c - 1;
      });
    }, 1000);

    const hide = setTimeout(() => setShowPreview(false), previewDurationMs);
    return () => { clearInterval(tick); clearTimeout(hide); };
  }, [currentGame?.game_id]);

  useEffect(() => {
    if (!currentGame || showPreview || currentEra !== 1) return;
    const id = setInterval(() => triggerSandstorm(), 18000);
    return () => clearInterval(id);
  }, [currentGame?.game_id, showPreview, currentEra, triggerSandstorm]);

  useEffect(() => {
    if (!currentGame || showPreview || currentEra !== 3) return;
    const id = setInterval(() => triggerPulseScan(), 16000);
    return () => clearInterval(id);
  }, [currentGame?.game_id, showPreview, currentEra, triggerPulseScan]);

  // Timer
  useEffect(() => {
    if (!currentGame || currentGame.status !== 0 || showPreview) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - currentGame.started_at) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentGame, showPreview]);

  // Streak tracking
  useEffect(() => {
    if (!currentGame) return;
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
  const prevChecking = useRef(false);
  const matchedAtCheckStart = useRef(0);
  useEffect(() => {
    if (!currentGame) return;
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

  if (!currentGame || !currentGame.cards || currentGame.cards.length === 0) return null;

  const config = GAME_CONFIGS[currentGame.difficulty];
  const progress = (currentGame.matched_count / currentGame.total_pairs) * 100;

  // Resolve level config for time-limit ring and level labels
  const levelConfig = currentEra !== null
    ? ERA_LEVEL_CONFIGS[currentEra]?.[currentLevel - 1] ?? null
    : null;

  // Time medal calculation (only when in level mode)
  const timeMedal = levelConfig ? getTimeMedal(elapsedTime, levelConfig) : null;

  // Countdown ring values — based on gold time limit
  const goldLimit = levelConfig?.timeLimitGold ?? 0;
  const ringProgress = goldLimit > 0
    ? Math.max(0, Math.min(1, 1 - elapsedTime / goldLimit))
    : null;

  // Ring color: green >50%, yellow 25-50%, red <25%
  const ringColor =
    ringProgress === null ? 'var(--theme-accent)'
    : ringProgress > 0.5  ? '#22c55e'
    : ringProgress > 0.25 ? '#eab308'
    : '#ef4444';

  // Medal emoji
  const medalEmoji =
    timeMedal === 'gold'   ? '🥇'
    : timeMedal === 'silver' ? '🥈'
    : timeMedal === 'bronze' ? '🥉'
    : timeMedal === 'none'   ? '💨'
    : null;

  // SVG ring dimensions
  const RING_R = 18;
  const RING_CIRC = 2 * Math.PI * RING_R;

  // Dynamic grid — always even columns (2, 4, 6) per requirement
  const actualCardCount = currentGame.cards.length;
  const gridClass =
    actualCardCount <= 16 ? 'grid-cols-4' :
    actualCardCount <= 24 ? 'grid-cols-4 md:grid-cols-6' :
    'grid-cols-4 md:grid-cols-6'; // 30 cards: 4-col mobile, 6-col desktop

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const difficultyMeta = getDifficultyMeta(currentGame.difficulty);
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

  return (
    <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-0.5 sm:px-1">

      {/* Era label */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-2 sm:mb-3"
      >
        <span
          className={`text-[10px] sm:text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full border ${accentColor}`}
          style={{ borderColor: 'var(--theme-border)', backgroundColor: 'rgba(255,255,255,0.05)' }}
        >
          {difficultyLabel}
          {levelLabel && <span className="ml-1.5 opacity-60">· {levelLabel}</span>}
        </span>
      </motion.div>

      {/* Preview banner */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            className="mb-3 rounded-xl p-3 text-center overflow-hidden"
            style={{ background: 'linear-gradient(to right, var(--theme-accent2), var(--theme-accent))' }}
          >
            <div className="text-sm sm:text-base font-bold text-white">👀 Memorize the Artifacts!</div>
            <div className="text-xs text-white/70">
              {previewLabel
                ? previewLabel
                : <>Game starts in <span className="font-bold text-white">{previewCountdown}</span>…</>}
            </div>
            {previewLabel && (
              <div className="text-xs text-white/60 mt-0.5">
                Starts in <span className="font-bold text-white">{previewCountdown}</span>…
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {mechanicLabels.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5 justify-center">
          {mechanicLabels.map((mechanic) => (
            <span
              key={mechanic}
              className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs border text-white/75"
              style={{ borderColor: 'var(--theme-border)', backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              {mechanic}
            </span>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div className="mb-3 grid grid-cols-4 gap-1.5 sm:gap-2">
        {/* Score */}
        <div className="rounded-xl p-2 sm:p-3 text-center border" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'var(--theme-border)' }}>
          <motion.div
            key={currentGame.score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className={`text-lg sm:text-2xl font-bold ${accentColor}`}
          >
            {currentGame.score.toLocaleString()}
          </motion.div>
          <div className="text-[10px] sm:text-xs" style={{ color: 'var(--theme-muted)' }}>Score</div>
          {/* Streak multiplier badge */}
          {streak.multiplierBonus > 0 && (
            <div className="mt-0.5 text-[9px] font-semibold text-orange-400">
              🔥 +{Math.round(streak.multiplierBonus * 100)}% streak
            </div>
          )}
        </div>

        {/* Time — with countdown ring when in level mode */}
        <div className="rounded-xl p-2 sm:p-3 text-center border relative" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'var(--theme-border)' }}>
          {ringProgress !== null ? (
            /* Countdown ring */
            <div className="flex items-center justify-center gap-1">
              <svg width="42" height="42" viewBox="0 0 42 42" className="flex-shrink-0">
                {/* Track */}
                <circle cx="21" cy="21" r={RING_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                {/* Progress */}
                <circle
                  cx="21" cy="21" r={RING_R}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={RING_CIRC * (1 - ringProgress)}
                  transform="rotate(-90 21 21)"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
                />
                {/* Timer text inside ring */}
                <text x="21" y="25" textAnchor="middle" fontSize="8" fill="white" fontFamily="monospace" fontWeight="bold">
                  {formatTime(elapsedTime)}
                </text>
              </svg>
              {medalEmoji && <span className="text-base">{medalEmoji}</span>}
            </div>
          ) : (
            <div className={`text-lg sm:text-2xl font-bold font-mono ${elapsedTime > 60 ? 'text-orange-400' : 'text-white/90'}`}>
              {formatTime(elapsedTime)}
            </div>
          )}
          <div className="text-[10px] sm:text-xs" style={{ color: 'var(--theme-muted)' }}>Time</div>
        </div>

        {/* Pairs */}
        <div className="rounded-xl p-2 sm:p-3 text-center border" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'var(--theme-border)' }}>
          <div className={`text-lg sm:text-2xl font-bold ${accentColor}`}>
            {currentGame.matched_count}
            <span className="text-sm sm:text-base text-white/40">/{currentGame.total_pairs}</span>
          </div>
          <div className="text-[10px] sm:text-xs" style={{ color: 'var(--theme-muted)' }}>Pairs</div>
        </div>

        {/* Mistakes */}
        <div
          className="rounded-xl p-2 sm:p-3 text-center border"
          style={{
            backgroundColor: mismatches > 0 ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.06)',
            borderColor: mismatches > 0 ? 'rgba(239,68,68,0.35)' : 'var(--theme-border)',
          }}
        >
          <div className={`text-lg sm:text-2xl font-bold ${mismatches > 0 ? 'text-red-400' : 'text-white/60'}`}>
            {mismatches}
          </div>
          <div className="text-[10px] sm:text-xs flex items-center justify-center gap-0.5" style={{ color: 'var(--theme-muted)' }}>
            <span>❌</span><span>Mistakes</span>
          </div>
        </div>
      </div>

      {/* Combo display */}
      <ComboDisplay combo={combo} />

      {/* Action bar */}
      <div className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2">
        {[
          { label: 'Hint', icon: '💡', charges: hintCharges, onClick: useHint, disabled: hintCharges <= 0 },
          { label: 'Freeze', icon: '❄️', charges: freezeCharges, onClick: useFreeze, disabled: freezeCharges <= 0 },
          { label: 'Trap', icon: '🌀', charges: trapCharges, onClick: useTrap, disabled: trapCharges <= 0 },
          { label: pendingMultiplier > 1 ? 'Armed x2' : 'Boost', icon: '⚡', charges: multiplierCharges, onClick: armMultiplier, disabled: multiplierCharges <= 0 || pendingMultiplier > 1 },
        ].map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.disabled || showPreview || isChecking}
            className="rounded-xl border px-3 py-2 text-left disabled:opacity-40"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'var(--theme-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base">{action.icon}</span>
              <span className={`text-[10px] sm:text-xs font-semibold ${accentColor}`}>x{action.charges}</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white/85">{action.label}</div>
          </button>
        ))}
      </div>

      {(shieldCharges > 0 || pendingMultiplier > 1) && (
        <div className="mb-3 flex flex-wrap justify-center gap-2 text-[10px] sm:text-xs">
          {shieldCharges > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300">
              🛡️ {shieldCharges} shield{shieldCharges === 1 ? '' : 's'} ready
            </span>
          )}
          {pendingMultiplier > 1 && (
            <span className="px-2.5 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300">
              ⚡ next match x{pendingMultiplier}
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-3 rounded-full h-1.5 sm:h-2 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <motion.div
          className={`h-full bg-gradient-to-r ${progressBar}`}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Streak popup */}
      <AnimatePresence>
        {showStreak && streakCount >= 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="mb-2 text-center"
          >
            <span className={`inline-block font-bold text-xs sm:text-sm px-4 py-1 rounded-full shadow-lg ${streakBg}`}>
              🔥 {streakCount} in a row!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Board */}
      <div className={`grid ${gridClass} gap-1.5 sm:gap-2`}>
        {currentGame.cards.map((card, index) => {
          const isMatched = card.is_matched;
          const columns = actualCardCount <= 16 ? 4 : 6;
          const row = Math.floor(index / columns);
          const pulseReveal = pulseScanRow !== null && row === pulseScanRow;
          const isFlipped = showPreview || flippedCards.includes(index) || isMatched || pulseReveal;
          const emoji = currentGame.emojis?.[card.value] ?? '❓';
          const isMismatched = mismatchedIndices.includes(index);
          const isObscured = hiddenCardIndices.includes(index) && !isFlipped;
          const isHinted = hintPairIndices.includes(index);

          return (
            <Card
              key={card.id}
              emoji={emoji}
              isFlipped={isFlipped}
              isMatched={isMatched}
              isMismatched={isMismatched}
              isHinted={isHinted}
              isObscured={isObscured}
              index={index}
              onClick={() => !isChecking && !showPreview && flipCard(index)}
              disabled={isChecking || isMatched || showPreview}
            />
          );
        })}
      </div>

      {/* Checking indicator */}
      <AnimatePresence>
        {isChecking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`mt-3 text-center text-xs sm:text-sm font-medium ${accentColor}`}
          >
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              🔍 Examining artifacts…
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Moves counter */}
      <div className="mt-2 text-center text-[10px] sm:text-xs" style={{ color: 'var(--theme-muted)' }}>
        {currentGame.moves} moves · optimal {config.optimalMoves}
      </div>
    </div>
  );
}
