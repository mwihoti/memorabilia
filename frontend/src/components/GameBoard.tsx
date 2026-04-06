import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { GAME_CONFIGS } from '../types';
import Card from './Card';

export default function GameBoard() {
  const { currentGame, flippedCards, flipCard, isChecking, theme } = useGameStore();
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

  // Dynamic grid based on card count — tighter on mobile
  const gridClass =
    config.cardCount === 12 ? 'grid-cols-4' :
    config.cardCount === 20 ? 'grid-cols-5' :
    'grid-cols-5 sm:grid-cols-6'; // 30 cards: 5-col on mobile to keep cards bigger

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const difficultyLabel =
    currentGame.difficulty === 1 ? '🏺 Ancient Era' :
    currentGame.difficulty === 2 ? '⚔️ Medieval Times' : '🚀 Modern Era';

  const accentColor = theme === 'museum' ? 'text-amber-400' : theme === 'nature' ? 'text-green-400' : 'text-[#00ff88]';
  const streakBg = theme === 'museum' ? 'bg-amber-500 text-slate-900' : theme === 'nature' ? 'bg-green-500 text-slate-900' : 'bg-[#00ff88] text-black';
  const progressBar = theme === 'museum' ? 'from-amber-500 to-amber-700' : theme === 'nature' ? 'from-green-500 to-green-700' : 'from-[#00ff88] to-[#00e5ff]';

  return (
    <div className="max-w-2xl mx-auto px-0.5 sm:px-1">

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
              Game starts in <span className="font-bold text-white">{previewCountdown}</span>…
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      <div className="mb-3 grid grid-cols-3 gap-1.5 sm:gap-2">
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
        </div>

        {/* Time */}
        <div className="rounded-xl p-2 sm:p-3 text-center border" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'var(--theme-border)' }}>
          <div className={`text-lg sm:text-2xl font-bold font-mono ${elapsedTime > 60 ? 'text-orange-400' : 'text-white/90'}`}>
            {formatTime(elapsedTime)}
          </div>
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
      </div>

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
