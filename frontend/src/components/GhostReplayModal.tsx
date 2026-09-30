import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GhostReplay, Difficulty, ERA_LEVEL_CONFIGS, ReplayMove } from '../types';
import { useGameStore } from '../store/gameStore';
import Card from './Card';
import { getCardSkin } from '../theme/cardSkins';

interface GhostReplayModalProps {
  replay: GhostReplay;
  era?: Difficulty;
  level?: number;
  onClose: () => void;
}

const ERA_LABELS: Record<Difficulty, string> = {
  [Difficulty.Easy]:   '🏺 Ancient Era',
  [Difficulty.Medium]: '⚔️ Medieval Times',
  [Difficulty.Hard]:   '🚀 Modern Era',
  [Difficulty.Expert]: '🛸 Future Nexus',
  [Difficulty.Master]: '🐲 Mythic Vault',
};

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function GhostReplayModal({ replay, era: eraProp, level: levelProp, onClose }: GhostReplayModalProps) {
  const era   = eraProp   ?? replay.era;
  const level = levelProp ?? replay.level;
  const { theme } = useGameStore();
  const levelConfig   = ERA_LEVEL_CONFIGS[era][level - 1];
  const levelLabel    = levelConfig?.label ?? `Level ${level}`;
  const cardCount     = levelConfig?.cardCount ?? replay.moves.length;
  const pairCount     = cardCount / 2;

  // Use saved emojis from the actual best run, or fall back to generic placeholders
  const buildEmojiGrid = (): string[] => {
    if (replay.emojis && replay.emojis.length >= pairCount) {
      // Reconstruct the card grid: saved emojis are [emoji0, emoji1, ..., emojiN] for N pairs
      // We need to create a paired array of length cardCount, but we don't know the original
      // shuffle order. Show emojis as sequential pairs for visual clarity.
      const paired: string[] = [];
      for (let i = 0; i < pairCount; i++) {
        paired.push(replay.emojis[i], replay.emojis[i]);
      }
      return paired;
    }
    // Fallback: generic numbered placeholders
    const fallback: string[] = [];
    for (let i = 0; i < pairCount; i++) {
      fallback.push(`${i + 1}️⃣`, `${i + 1}️⃣`);
    }
    return fallback;
  };

  const emojis = buildEmojiGrid();

  const [playing, setPlaying]     = useState(false);
  const [speed, setSpeed]         = useState<1 | 2>(1);
  const [flipped, setFlipped]     = useState<number[]>([]);
  const [matched, setMatched]     = useState<number[]>([]);
  const [moveIdx, setMoveIdx]     = useState(0);
  const [finished, setFinished]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset replay state
  function resetReplay() {
    setFlipped([]);
    setMatched([]);
    setMoveIdx(0);
    setFinished(false);
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  // Schedule the next move
  useEffect(() => {
    if (!playing || finished) return;
    if (moveIdx >= replay.moves.length) {
      setFinished(true);
      setPlaying(false);
      return;
    }

    const moves     = replay.moves;
    const currentMove: ReplayMove = moves[moveIdx];
    const nextMove: ReplayMove | undefined = moves[moveIdx + 1];

    // Delay until this move's timestamp relative to the previous
    const prevTimestamp = moveIdx === 0 ? 0 : moves[moveIdx - 1].timestamp;
    const delay = Math.max(200, (currentMove.timestamp - prevTimestamp) / speed);

    timerRef.current = setTimeout(() => {
      setFlipped((prev) => {
        const next = [...prev, currentMove.cardIndex];

        // If we now have 2 flipped cards, decide match/mismatch
        if (next.length === 2) {
          const [a, b] = next;
          const isMatch = emojis[a] === emojis[b];

          if (isMatch) {
            setMatched((m) => [...m, a, b]);
            setFlipped([]);
          } else {
            // Flip back after 1 second
            setTimeout(() => setFlipped([]), 1000 / speed);
          }
          return isMatch ? [] : next;
        }

        return next;
      });

      setMoveIdx((prev) => prev + 1);
    }, delay);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, moveIdx, finished, speed, replay.moves, emojis]);

  const themeAccent = {
    museum: { btn: 'from-amber-500 to-amber-700 hover:from-amber-400', text: 'text-amber-400', badge: 'bg-amber-500/20 border-amber-500/30 text-amber-300' },
    nature: { btn: 'from-green-500 to-green-700 hover:from-green-400',  text: 'text-green-400',  badge: 'bg-green-500/20 border-green-500/30 text-green-300'  },
    urban:  { btn: 'from-[#00ff88] to-[#00e5ff] hover:from-[#00e5ff]', text: 'text-[#00ff88]', badge: 'bg-[#00ff88]/10 border-[#00ff88]/25 text-[#00ff88]'  },
  }[theme];

  // Compute columns for mini grid — always even (2, 4, 6)
  const cols = cardCount <= 16 ? 4 : 6;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl"
          style={{ maxHeight: '92dvh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="sm:hidden flex justify-center pt-3 pb-1 bg-[#1e293b]">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

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
                  className="text-5xl mb-2"
                >
                  👻
                </motion.div>
                <h2 className={`text-2xl font-extrabold ${themeAccent.text}`}>Your Best Run</h2>
                <p className="text-white/50 text-xs mt-0.5">
                  {ERA_LABELS[era]} · {levelLabel}
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Score', value: replay.score.toLocaleString() },
                  { label: 'Time',  value: formatTime(replay.totalTime)  },
                  { label: 'Moves', value: String(replay.moves.length)   },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/5 rounded-xl px-3 py-2.5 text-center">
                    <div className="text-white font-bold text-sm">{value}</div>
                    <div className="text-white/40 text-[10px]">{label}</div>
                  </div>
                ))}
              </div>

              {/* Mini card grid */}
              <div
                className="grid gap-1.5 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  maxWidth: cols * 64 + (cols - 1) * 6,
                }}
              >
                {Array.from({ length: cardCount }).map((_, idx) => {
                  const isFlipped  = flipped.includes(idx);
                  const isMatched  = matched.includes(idx);
                  return (
                    <Card
                      key={idx}
                      emoji={emojis[idx] ?? '❓'}
                      skin={getCardSkin(replay.era, replay.level)}
                      isFlipped={isFlipped}
                      isMatched={isMatched}
                      onClick={() => {}}
                      disabled={true}
                      index={idx}
                    />
                  );
                })}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {/* Play / Pause */}
                <motion.button
                  onClick={() => {
                    if (finished) {
                      resetReplay();
                      setTimeout(() => setPlaying(true), 50);
                    } else {
                      setPlaying((p) => !p);
                    }
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r ${themeAccent.btn} text-white transition-all shadow-md`}
                  whileTap={{ scale: 0.97 }}
                >
                  {finished ? '↩ Replay' : playing ? '⏸ Pause' : '▶ Play'}
                </motion.button>

                {/* Speed selector */}
                <div className="flex gap-1">
                  {([1, 2] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`
                        px-3 py-2 rounded-xl text-xs font-bold border transition-all
                        ${speed === s
                          ? `${themeAccent.badge} scale-105`
                          : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30'
                        }
                      `}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="w-full py-3 bg-white/8 hover:bg-white/12 rounded-xl font-bold text-sm text-white/70 transition-all"
              >
                Close
              </button>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
