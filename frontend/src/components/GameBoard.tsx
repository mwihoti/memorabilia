import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { GAME_CONFIGS, ERA_LEVEL_CONFIGS, getDifficultyMeta, getTimeMedal } from '../types';
import { getPlayerSettings, getPreviewMultiplier } from '../store/settings';
import { getCardSkin } from '../theme/cardSkins';
import Card from './Card';
import ComboDisplay from './ComboDisplay';

export default function GameBoard() {
  const {
    currentGame,
    flippedCards,
    flipCard,
    isChecking,
    combo,
    mismatches,
    currentEra,
    currentLevel,
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

  // Tailwind's `sm` breakpoint — the board goes 4-wide below it, 6-wide above.
  const isWide = useMediaQuery('(min-width: 640px)');

  // The board's era skin — this is what makes level 1 Ancient clay and level 300
  // Mythic obsidian without touching any other component.
  const skin = getCardSkin(currentEra, currentLevel);

  // ── Preview countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentGame) return;
    setShowPreview(true);
    prevMatchedCount.current = 0;

    let previewDurationMs = 3000;
    const settings = getPlayerSettings();
    if (currentEra !== null) {
      const levelConfig = ERA_LEVEL_CONFIGS[currentEra]?.[currentLevel - 1];
      if (levelConfig) {
        previewDurationMs = Math.round(
          levelConfig.previewDuration * getPreviewMultiplier(settings.previewLength),
        );
      }
    }

    setPreviewCountdown(Math.ceil(previewDurationMs / 1000) || 0);

    if (previewDurationMs === 0) {
      setShowPreview(false);
      return;
    }

    const tick = setInterval(() => {
      setPreviewCountdown((c) => {
        if (c <= 1) {
          clearInterval(tick);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    const hide = setTimeout(() => setShowPreview(false), previewDurationMs);
    return () => {
      clearInterval(tick);
      clearTimeout(hide);
    };
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

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentGame || currentGame.status !== 0 || showPreview) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - currentGame.started_at) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentGame, showPreview]);

  // ── Streak tracking ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentGame) return;
    if (currentGame.matched_count > prevMatchedCount.current) {
      setStreakCount((s) => s + 1);
      if (currentGame.matched_count - prevMatchedCount.current === 1) {
        setShowStreak(true);
        setTimeout(() => setShowStreak(false), 1500);
      }
    }
    prevMatchedCount.current = currentGame.matched_count;
  }, [currentGame?.matched_count]);

  const prevChecking = useRef(false);
  const matchedAtCheckStart = useRef(0);
  const pairUnderTest = useRef<number[]>([]);
  useEffect(() => {
    if (!currentGame) return;

    if (isChecking && !prevChecking.current) {
      matchedAtCheckStart.current = currentGame.matched_count;
      // Remember which two cards are being compared — once the check resolves
      // they are gone from flippedCards, so capture them now.
      pairUnderTest.current = [...flippedCards];
    }

    if (!isChecking && prevChecking.current && flippedCards.length === 0) {
      if (currentGame.matched_count === matchedAtCheckStart.current) {
        setStreakCount(0);
        // A miss — shake the pair that failed.
        setMismatchedIndices(pairUnderTest.current);
        const t = setTimeout(() => setMismatchedIndices([]), 450);
        prevChecking.current = isChecking;
        return () => clearTimeout(t);
      }
    }

    prevChecking.current = isChecking;
  }, [isChecking]);

  if (!currentGame || !currentGame.cards || currentGame.cards.length === 0) return null;

  const config = GAME_CONFIGS[currentGame.difficulty];
  const progress = (currentGame.matched_count / currentGame.total_pairs) * 100;
  const levelConfig =
    currentEra !== null ? (ERA_LEVEL_CONFIGS[currentEra]?.[currentLevel - 1] ?? null) : null;

  const timeMedal = levelConfig ? getTimeMedal(elapsedTime, levelConfig) : null;
  const goldLimit = levelConfig?.timeLimitGold ?? 0;
  const ringProgress =
    goldLimit > 0 ? Math.max(0, Math.min(1, 1 - elapsedTime / goldLimit)) : null;

  const ringColor =
    ringProgress === null ? skin.accent
    : ringProgress > 0.5 ? 'var(--mu-good)'
    : ringProgress > 0.25 ? 'var(--mu-warn)'
    : 'var(--mu-bad)';

  const medalEmoji =
    timeMedal === 'gold' ? '🥇'
    : timeMedal === 'silver' ? '🥈'
    : timeMedal === 'bronze' ? '🥉'
    : timeMedal === 'none' ? '💨'
    : null;

  const RING_R = 18;
  const RING_CIRC = 2 * Math.PI * RING_R;

  // Even columns at every breakpoint so pairs stay visually adjacent.
  // `columns` must track what the grid actually renders — the pulse-scan row
  // highlight reads it, and assuming 6 on a 4-wide phone lights the wrong row.
  const cardCount = currentGame.cards.length;
  const columns = cardCount <= 16 ? 4 : isWide ? 6 : 4;
  const gridClass = cardCount <= 16 ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-6';

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const difficultyMeta = getDifficultyMeta(currentGame.difficulty);

  const powerUps = [
    { label: 'Hint', icon: '💡', charges: hintCharges, onClick: useHint, disabled: hintCharges <= 0 },
    { label: 'Freeze', icon: '❄️', charges: freezeCharges, onClick: useFreeze, disabled: freezeCharges <= 0 },
    { label: 'Trap', icon: '🌀', charges: trapCharges, onClick: useTrap, disabled: trapCharges <= 0 },
    {
      label: pendingMultiplier > 1 ? 'Armed' : 'Boost',
      icon: '⚡',
      charges: multiplierCharges,
      onClick: armMultiplier,
      disabled: multiplierCharges <= 0 || pendingMultiplier > 1,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* ── Era seed chip ─────────────────────────────────────────────────── */}
      <div className="mb-3 flex justify-center">
        <motion.span
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mu-chip mu-chip-gold px-3 py-1"
          style={{ borderColor: `${skin.accent}66`, color: skin.accent }}
        >
          <span>✦</span>
          {difficultyMeta.label} · Level {currentLevel}
          {levelConfig?.label && <span className="opacity-60">· {levelConfig.label}</span>}
        </motion.span>
      </div>

      {/* ── Title ─────────────────────────────────────────────────────────── */}
      <h1
        className="font-display mu-wordmark mb-4 text-center text-3xl leading-tight sm:text-4xl lg:text-5xl"
      >
        {showPreview ? 'Memorize the Artifacts!' : 'Find the Pairs'}
      </h1>

      {/* ── Stat bar ──────────────────────────────────────────────────────── */}
      <div className="mu-panel mb-3 grid grid-cols-4 gap-1 p-2 sm:gap-2 sm:p-3">
        <Stat label="Score" accent={skin.accent}>
          <motion.span
            key={currentGame.score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className="block"
          >
            {currentGame.score.toLocaleString()}
          </motion.span>
          {streak.multiplierBonus > 0 && (
            <span className="mt-0.5 block text-[0.6rem] font-semibold text-orange-400">
              🔥 +{Math.round(streak.multiplierBonus * 100)}%
            </span>
          )}
        </Stat>

        <Stat label="Time" accent={skin.accent}>
          {ringProgress !== null ? (
            <span className="flex items-center justify-center gap-1">
              <svg width="44" height="44" viewBox="0 0 42 42" className="shrink-0">
                <circle cx="21" cy="21" r={RING_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <circle
                  cx="21"
                  cy="21"
                  r={RING_R}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={RING_CIRC * (1 - ringProgress)}
                  transform="rotate(-90 21 21)"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
                />
                <text
                  x="21"
                  y="25"
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--mu-text)"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="bold"
                >
                  {formatTime(elapsedTime)}
                </text>
              </svg>
              {medalEmoji && <span className="text-base">{medalEmoji}</span>}
            </span>
          ) : (
            <span className="font-mono">{formatTime(elapsedTime)}</span>
          )}
        </Stat>

        <Stat label="Pairs" accent={skin.accent}>
          {currentGame.matched_count}
          <span className="text-sm opacity-40">/{currentGame.total_pairs}</span>
        </Stat>

        <Stat label="Mistakes" accent={mismatches > 0 ? 'var(--mu-bad)' : 'var(--mu-muted)'}>
          {mismatches}
        </Stat>
      </div>

      {/* ── Power-ups ─────────────────────────────────────────────────────── */}
      <div className="mb-3 grid grid-cols-4 gap-1.5 sm:gap-2">
        {powerUps.map((p) => (
          <button
            key={p.label}
            onClick={p.onClick}
            disabled={p.disabled || showPreview || isChecking}
            className="mu-panel relative flex flex-col items-center gap-0.5 px-1 py-2 transition-all disabled:opacity-35 sm:py-2.5"
            style={!p.disabled ? { borderColor: `${skin.accent}44` } : undefined}
          >
            <span
              className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[0.6rem] font-bold"
              style={{
                color: '#2a1e06',
                background: 'linear-gradient(160deg, var(--mu-gold-bright), var(--mu-gold-deep))',
              }}
            >
              x{p.charges}
            </span>
            <span className="text-base sm:text-lg">{p.icon}</span>
            <span className="text-[0.66rem] font-semibold sm:text-xs" style={{ color: 'var(--mu-text)' }}>
              {p.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Preview / mechanics banner ────────────────────────────────────── */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-3 rounded-xl px-4 py-2.5 text-center"
            style={{
              background: `linear-gradient(100deg, ${skin.accent}22, transparent)`,
              border: `1px solid ${skin.accent}44`,
            }}
          >
            <div className="text-sm font-bold" style={{ color: 'var(--mu-ivory)' }}>
              👀 Study the board — {previewCountdown}s
            </div>
            {levelConfig?.mechanics?.length ? (
              <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
                {levelConfig.mechanics.map((m) => (
                  <span key={m} className="mu-chip text-[0.6rem]">
                    {m}
                  </span>
                ))}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <ComboDisplay combo={combo} />

      {(shieldCharges > 0 || pendingMultiplier > 1) && (
        <div className="mb-3 flex flex-wrap justify-center gap-2">
          {shieldCharges > 0 && (
            <span className="mu-chip" style={{ color: 'var(--mu-info)' }}>
              🛡️ {shieldCharges} shield{shieldCharges === 1 ? '' : 's'} ready
            </span>
          )}
          {pendingMultiplier > 1 && (
            <span className="mu-chip" style={{ color: '#e879f9' }}>
              ⚡ next match x{pendingMultiplier}
            </span>
          )}
        </div>
      )}

      {/* ── Progress ──────────────────────────────────────────────────────── */}
      <div className="mu-track mb-3 h-1.5">
        <motion.div
          className="mu-fill"
          style={{ background: `linear-gradient(90deg, ${skin.matchedTo}, ${skin.matchedFrom})` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <AnimatePresence>
        {showStreak && streakCount >= 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="mb-2 text-center"
          >
            <span
              className="inline-block rounded-full px-4 py-1 text-xs font-bold shadow-lg"
              style={{ background: skin.accent, color: '#0a1020' }}
            >
              🔥 {streakCount} in a row!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      <div className={`grid ${gridClass} gap-1.5 sm:gap-2.5`}>
        {currentGame.cards.map((card, index) => {
          const isMatched = card.is_matched;
          const row = Math.floor(index / columns);
          const pulseReveal = pulseScanRow !== null && row === pulseScanRow;
          const isFlipped = showPreview || flippedCards.includes(index) || isMatched || pulseReveal;

          return (
            <Card
              key={card.id}
              emoji={currentGame.emojis?.[card.value] ?? '❓'}
              skin={skin}
              isFlipped={isFlipped}
              isMatched={isMatched}
              isMismatched={mismatchedIndices.includes(index)}
              isHinted={hintPairIndices.includes(index)}
              isObscured={hiddenCardIndices.includes(index) && !isFlipped}
              index={index}
              onClick={() => !isChecking && !showPreview && flipCard(index)}
              disabled={isChecking || isMatched || showPreview}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {isChecking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-center text-xs font-medium sm:text-sm"
            style={{ color: skin.accent }}
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

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[0.7rem]" style={{ color: 'var(--mu-faint)' }}>
        <span>ⓘ</span>
        <span>
          {currentGame.moves} moves · optimal {config.optimalMoves} · find all pairs to complete the
          round
        </span>
      </div>
    </div>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

function Stat({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg px-1 py-1.5 text-center">
      <div
        className="text-lg font-bold leading-tight sm:text-2xl"
        style={{ color: accent }}
      >
        {children}
      </div>
      <div className="mt-0.5 text-[0.62rem] sm:text-xs" style={{ color: 'var(--mu-faint)' }}>
        {label}
      </div>
    </div>
  );
}

/** Subscribes to a media query and re-renders when it flips. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
