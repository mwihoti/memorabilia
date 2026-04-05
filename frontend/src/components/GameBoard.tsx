import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { GAME_CONFIGS } from '../types';
import Card from './Card';

export default function GameBoard() {
  const { currentGame, flippedCards, flipCard, isChecking } = useGameStore();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [previewCountdown, setPreviewCountdown] = useState(3);
  const [mismatchedIndices, setMismatchedIndices] = useState<number[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [showStreak, setShowStreak] = useState(false);
  const prevMatchedCount = useRef(0);

  // Preview countdown
  useEffect(() => {
    if (!currentGame) return;
    setShowPreview(true);
    setPreviewCountdown(3);
    prevMatchedCount.current = 0;

    const tick = setInterval(() => {
      setPreviewCountdown(c => {
        if (c <= 1) { clearInterval(tick); return 0; }
        return c - 1;
      });
    }, 1000);

    const hide = setTimeout(() => setShowPreview(false), 3000);
    return () => { clearInterval(tick); clearTimeout(hide); };
  }, [currentGame?.game_id]);

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

  // Track mismatches — when isChecking turns false and no new match happened
  const prevChecking = useRef(false);
  const matchedAtCheckStart = useRef(0);
  useEffect(() => {
    if (!currentGame) return;
    if (isChecking && !prevChecking.current) {
      matchedAtCheckStart.current = currentGame.matched_count;
    }
    if (!isChecking && prevChecking.current && flippedCards.length === 0) {
      // Check was done: if matched_count didn't increase, it was a mismatch
      if (currentGame.matched_count === matchedAtCheckStart.current && flippedCards.length === 0) {
        // We lost the flippedCards already — highlight last two by storing them
      }
      setStreakCount(0);
    }
    prevChecking.current = isChecking;
  }, [isChecking]);

  if (!currentGame || !currentGame.cards || currentGame.cards.length === 0) return null;

  const config = GAME_CONFIGS[currentGame.difficulty];
  const progress = (currentGame.matched_count / currentGame.total_pairs) * 100;

  // Dynamic grid based on card count
  const gridClass =
    config.cardCount === 12 ? 'grid-cols-4' :
    config.cardCount === 20 ? 'grid-cols-5' :
    'grid-cols-6'; // 30 cards → 6×5

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const difficultyLabel =
    currentGame.difficulty === 1 ? 'Ancient Era' :
    currentGame.difficulty === 2 ? 'Medieval Times' : 'Modern Era';

  return (
    <div className="max-w-2xl mx-auto px-1">

      {/* ── Era label ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-3"
      >
        <span className="text-xs font-semibold tracking-widest uppercase text-museum-bronze-400 bg-museum-bronze-400/10 px-3 py-1 rounded-full border border-museum-bronze-400/20">
          {difficultyLabel}
        </span>
      </motion.div>

      {/* ── Preview banner ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            className="mb-4 bg-gradient-to-r from-museum-blue-600 to-museum-bronze-600 rounded-xl p-3 text-center overflow-hidden"
          >
            <div className="text-lg font-bold text-white">👀 Memorize the Artifacts!</div>
            <div className="text-sm text-white/70">
              Game starts in <span className="font-bold text-museum-gold-300">{previewCountdown}</span>...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {/* Score — dominant */}
        <div className="col-span-1 bg-museum-stone-800/60 backdrop-blur-sm rounded-xl p-3 text-center border border-museum-gold-400/20 relative overflow-hidden">
          <motion.div
            key={currentGame.score}
            initial={{ scale: 1.3, color: '#fbbf24' }}
            animate={{ scale: 1, color: '#f59e0b' }}
            transition={{ duration: 0.25 }}
            className="text-2xl font-bold text-museum-gold-400"
          >
            {currentGame.score.toLocaleString()}
          </motion.div>
          <div className="text-xs text-museum-stone-400">Score</div>
        </div>

        {/* Time */}
        <div className="bg-museum-stone-800/60 backdrop-blur-sm rounded-xl p-3 text-center border border-museum-bronze-400/20">
          <div className={`text-2xl font-bold font-mono ${elapsedTime > 60 ? 'text-orange-400' : 'text-museum-blue-300'}`}>
            {formatTime(elapsedTime)}
          </div>
          <div className="text-xs text-museum-stone-400">Time</div>
        </div>

        {/* Pairs */}
        <div className="bg-museum-stone-800/60 backdrop-blur-sm rounded-xl p-3 text-center border border-museum-bronze-400/20">
          <div className="text-2xl font-bold text-museum-bronze-400">
            {currentGame.matched_count}
            <span className="text-base text-museum-stone-500">/{currentGame.total_pairs}</span>
          </div>
          <div className="text-xs text-museum-stone-400">Pairs</div>
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div className="mb-4 bg-museum-stone-800/40 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-museum-gold-500 to-museum-bronze-400"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* ── Streak popup ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showStreak && streakCount >= 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="mb-3 text-center"
          >
            <span className="inline-block bg-museum-gold-500 text-museum-stone-900 font-bold text-sm px-4 py-1 rounded-full shadow-lg">
              🔥 {streakCount} in a row!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Game Board ───────────────────────────────────────────────────── */}
      <div className={`grid ${gridClass} gap-2 sm:gap-2.5`}>
        {currentGame.cards.map((card, index) => {
          const isMatched = card.is_matched;
          const isFlipped = showPreview || flippedCards.includes(index) || isMatched;
          const emoji = currentGame.emojis?.[card.value] ?? '❓';
          const isMismatched = mismatchedIndices.includes(index);

          return (
            <Card
              key={card.id}
              emoji={emoji}
              isFlipped={isFlipped}
              isMatched={isMatched}
              isMismatched={isMismatched}
              index={index}
              onClick={() => !isChecking && !showPreview && flipCard(index)}
              disabled={isChecking || isMatched || showPreview}
            />
          );
        })}
      </div>

      {/* ── Checking indicator ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isChecking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center text-museum-gold-400 text-sm font-medium"
          >
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              🔍 Examining artifacts...
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Moves counter below board */}
      <div className="mt-3 text-center text-xs text-museum-stone-500">
        {currentGame.moves} moves · optimal {config.optimalMoves}
      </div>
    </div>
  );
}
