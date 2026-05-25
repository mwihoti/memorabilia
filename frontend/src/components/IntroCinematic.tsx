import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Difficulty, ERA_LEVEL_CONFIGS, getDifficultyMeta } from '../types';

type IntroMode = 'opening' | 'splash' | 'level';

interface IntroCinematicProps {
  mode: IntroMode;
  open: boolean;
  era?: Difficulty | null;
  level?: number;
  onComplete: () => void;
}

const OPENING_SEQUENCE = [
  { icon: '🏺', label: 'Ancient memories awaken' },
  { icon: '⚔️', label: 'Medieval legends surface' },
  { icon: '🚀', label: 'Modern echoes pulse' },
  { icon: '🛸', label: 'Future signals converge' },
  { icon: '🐲', label: 'Mythic relics stir' },
];

function useIntroDuration(mode: IntroMode, reducedMotion: boolean): number {
  if (reducedMotion) return mode === 'level' ? 700 : 900;
  if (mode === 'opening') return 3600;
  if (mode === 'splash') return 1600;
  return 1800;
}

export default function IntroCinematic({ mode, open, era, level, onComplete }: IntroCinematicProps) {
  const reducedMotion = useReducedMotion();
  const duration = useIntroDuration(mode, reducedMotion);

  const difficultyMeta = era ? getDifficultyMeta(era) : null;
  const levelConfig = era && level ? ERA_LEVEL_CONFIGS[era]?.[level - 1] ?? null : null;

  return (
    <AnimatePresence>
      {open && (
        <CinematicBody
          mode={mode}
          duration={duration}
          reducedMotion={!!reducedMotion}
          difficultyMeta={difficultyMeta}
          levelConfig={levelConfig}
          level={level}
          onComplete={onComplete}
        />
      )}
    </AnimatePresence>
  );
}

function CinematicBody({
  mode,
  duration,
  reducedMotion,
  difficultyMeta,
  levelConfig,
  level,
  onComplete,
}: {
  mode: IntroMode;
  duration: number;
  reducedMotion: boolean;
  difficultyMeta: ReturnType<typeof getDifficultyMeta> | null;
  levelConfig: (typeof ERA_LEVEL_CONFIGS)[Difficulty][number] | null;
  level?: number;
  onComplete: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.15 : 0.35 }}
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(circle at top, rgba(255,255,255,0.12), rgba(2,6,23,0.97) 55%)' }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(251,191,36,0.08),transparent_35%,rgba(34,197,94,0.08)_65%,rgba(14,165,233,0.08))]" />

      <button
        onClick={onComplete}
        className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/70"
      >
        Skip
      </button>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6 text-center">
        {mode === 'opening' && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reducedMotion ? 0.2 : 0.6 }}
              className="mb-5 text-5xl sm:text-7xl"
            >
              🏛️
            </motion.div>
            <motion.h1
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.15, duration: reducedMotion ? 0.2 : 0.5 }}
              className="mb-3 font-black tracking-[0.18em] text-white text-2xl sm:text-5xl"
            >
              MEMORABILIA
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.28 }}
              className="mb-8 max-w-xl text-sm text-white/65 sm:text-base"
            >
              Trace artifacts across time, sharpen your memory, and master every era.
            </motion.p>

            <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-5">
              {OPENING_SEQUENCE.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reducedMotion ? 0 : 0.35 + index * 0.18, duration: reducedMotion ? 0.2 : 0.4 }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-sm"
                >
                  <div className="mb-2 text-3xl">{item.icon}</div>
                  <div className="text-[11px] uppercase tracking-widest text-white/45">Era {index + 1}</div>
                  <div className="mt-1 text-xs font-semibold text-white/80">{item.label}</div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {mode === 'splash' && (
          <>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reducedMotion ? 0.18 : 0.45 }}
              className="mb-5 text-6xl sm:text-7xl"
            >
              🏛️
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reducedMotion ? 0 : 0.12 }}
              className="mb-2 text-3xl font-black tracking-[0.2em] text-white sm:text-5xl"
            >
              MEMORABILIA
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.22 }}
              className="text-sm uppercase tracking-[0.25em] text-white/55 sm:text-base"
            >
              Curate memory. Conquer time.
            </motion.p>
          </>
        )}

        {mode === 'level' && difficultyMeta && levelConfig && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reducedMotion ? 0.18 : 0.4 }}
              className="mb-4 text-6xl sm:text-7xl"
            >
              {difficultyMeta.icon}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reducedMotion ? 0 : 0.12 }}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55"
            >
              {difficultyMeta.label}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reducedMotion ? 0 : 0.2 }}
              className="mt-5 text-3xl font-black text-white sm:text-5xl"
            >
              Level {level} · {levelConfig.label}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.28 }}
              className="mt-3 max-w-xl text-sm text-white/65 sm:text-base"
            >
              {levelConfig.mechanics?.join(' · ') ?? 'Study the board, trust your memory, and clear the gallery.'}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.36 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
            >
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75">
                {levelConfig.cardCount} cards
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75">
                {Math.floor(levelConfig.previewDuration / 1000)}s preview
              </span>
              {levelConfig.boss && (
                <span className="rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
                  Boss Level
                </span>
              )}
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
}
