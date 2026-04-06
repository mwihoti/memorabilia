import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import {
  Difficulty, ERA_LEVEL_CONFIGS, EraLevel, LevelProgress,
  isEraUnlocked, isLevelUnlocked, TimeMedal,
} from '../types';
import { loadDailyChallenge, getDailyChallengeConfig, isDailyChallengeCompleted } from '../store/dailyChallenge';
import { hapticImpact } from '../telegram/telegram';
import MedalBadge from './MedalBadge';
import StreakBanner from './StreakBanner';
import DailyChallengeCard from './DailyChallengeCard';

interface LevelSelectorProps {
  onStart: (era: Difficulty, level: number, isDailyChallenge?: boolean) => void;
}

// ── Era definitions ────────────────────────────────────────────────────────────

interface EraConfig {
  id: Difficulty;
  label: string;
  icon: string;
  gradient: string;
  lockedBy: string;
}

const ERAS: EraConfig[] = [
  {
    id:       Difficulty.Easy,
    label:    'Ancient Era',
    icon:     '🏺',
    gradient: 'from-amber-700/50 to-orange-800/50',
    lockedBy: '',
  },
  {
    id:       Difficulty.Medium,
    label:    'Medieval Times',
    icon:     '⚔️',
    gradient: 'from-slate-700/50 to-indigo-800/50',
    lockedBy: 'Ancient Era Level 3',
  },
  {
    id:       Difficulty.Hard,
    label:    'Modern Era',
    icon:     '🚀',
    gradient: 'from-cyan-700/50 to-purple-800/50',
    lockedBy: 'Medieval Times Level 3',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getProgressForEra(era: Difficulty, levelProgress: LevelProgress[]): { completed: number; total: number } {
  const total = ERA_LEVEL_CONFIGS[era].length;
  const completed = levelProgress.filter((lp) => lp.era === era && lp.completed).length;
  return { completed, total };
}

function getLevelProgress(era: Difficulty, level: number, levelProgress: LevelProgress[]): LevelProgress | undefined {
  return levelProgress.find((lp) => lp.era === era && lp.level === level);
}

function starDisplay(stars: number, max = 3): string {
  return '⭐'.repeat(stars) + '☆'.repeat(Math.max(0, max - stars));
}

function medalIcon(medal: TimeMedal): string {
  if (medal === 'gold')   return '🥇';
  if (medal === 'silver') return '🥈';
  if (medal === 'bronze') return '🥉';
  return '—';
}

// ── Sub-component: Level button ────────────────────────────────────────────────

interface LevelButtonProps {
  eraConfig: EraConfig;
  levelConfig: EraLevel;
  progress?: LevelProgress;
  locked: boolean;
  themeAccent: { selected: string; border: string; ring: string; text: string };
  onSelect: () => void;
}

function LevelButton({ eraConfig: _era, levelConfig, progress, locked, themeAccent, onSelect }: LevelButtonProps) {
  const isComplete = progress?.completed ?? false;
  const medal      = progress?.bestMedal ?? 'none';
  const stars      = progress?.stars ?? 0;
  const previewSec = levelConfig.previewDuration > 0 ? `${levelConfig.previewDuration / 1000}s preview` : 'No preview';

  return (
    <motion.button
      onClick={locked ? undefined : onSelect}
      className={`
        relative p-3 lg:p-4 rounded-xl border-2 text-left transition-all duration-200
        ${locked
          ? 'border-white/5 bg-white/3 opacity-50 cursor-not-allowed'
          : isComplete
          ? `border-green-500/30 bg-green-500/5 hover:border-green-400/50`
          : `border-white/10 bg-white/5 hover:border-white/20`
        }
      `}
      whileHover={locked ? {} : { scale: 1.03 }}
      whileTap={locked ? {} : { scale: 0.97 }}
    >
      {/* Lock icon */}
      {locked && (
        <span className="absolute top-2 right-2 text-white/30 text-xs">🔒</span>
      )}

      {/* Completed checkmark */}
      {!locked && isComplete && (
        <span className="absolute top-2 right-2 text-green-400 text-xs font-bold">✓</span>
      )}

      {/* Level number + label */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`text-xs lg:text-sm font-extrabold ${locked ? 'text-white/30' : themeAccent.text}`}>Lv.{levelConfig.level}</span>
        <span className="text-xs lg:text-sm font-bold text-white truncate">{levelConfig.label}</span>
      </div>

      {/* Card count */}
      <p className="text-[10px] lg:text-xs text-white/40 mb-1.5">{levelConfig.cardCount} cards</p>

      {/* Medal + stars row */}
      {!locked && (
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm lg:text-base leading-none">{medalIcon(medal)}</span>
          <span className="text-[10px] lg:text-xs text-white/60">{isComplete ? starDisplay(stars) : '☆☆☆'}</span>
        </div>
      )}

      {/* Preview + gold time */}
      {!locked && (
        <div className="space-y-0.5">
          <p className="text-[9px] lg:text-[10px] text-white/30">{previewSec}</p>
          <p className="text-[9px] lg:text-[10px] text-white/30">🥇 &lt; {levelConfig.timeLimitGold}s</p>
        </div>
      )}

      {locked && (
        <p className="text-[9px] lg:text-[10px] text-white/25">Complete Level {levelConfig.level - 1} first</p>
      )}
    </motion.button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LevelSelector({ onStart }: LevelSelectorProps) {
  const { theme, levelProgress } = useGameStore();
  const [expandedEra, setExpandedEra] = useState<Difficulty | null>(null);

  const themeAccent = {
    museum: { text: 'text-amber-400', border: 'border-amber-500', ring: 'ring-amber-500/40', selected: 'border-amber-400 bg-amber-500/10', cta: 'from-amber-500 to-amber-700 hover:from-amber-400' },
    nature: { text: 'text-green-400',  border: 'border-green-500',  ring: 'ring-green-500/40',  selected: 'border-green-400 bg-green-500/10',  cta: 'from-green-500 to-green-700 hover:from-green-400'  },
    urban:  { text: 'text-[#00ff88]',  border: 'border-[#00ff88]',  ring: 'ring-[#00ff88]/30',  selected: 'border-[#00ff88] bg-[#00ff88]/5',   cta: 'from-[#00ff88] to-[#00e5ff] hover:from-[#00e5ff]' },
  }[theme];

  const dailyConfig    = getDailyChallengeConfig();
  const dailyCompleted = isDailyChallengeCompleted();

  const handleEraClick = (era: Difficulty) => {
    const unlocked = isEraUnlocked(era, levelProgress);
    if (!unlocked) return;
    hapticImpact('light');
    setExpandedEra((prev) => (prev === era ? null : era));
  };

  const handleLevelSelect = (era: Difficulty, level: number) => {
    if (!isLevelUnlocked(era, level, levelProgress)) return;
    hapticImpact('medium');
    onStart(era, level);
  };

  const handleDailyPlay = () => {
    hapticImpact('medium');
    onStart(dailyConfig.difficulty, dailyConfig.level, true);
  };

  return (
    <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h2 className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: 'var(--theme-text)' }}>
          Choose Your Level
        </h2>
        <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
          Select an era and level to begin
        </p>
      </motion.div>

      {/* Streak banner */}
      <StreakBanner />

      {/* Daily Challenge */}
      <DailyChallengeCard onPlay={handleDailyPlay} />

      {/* Era cards */}
      <div className="space-y-3">
        {ERAS.map((era, i) => {
          const unlocked = isEraUnlocked(era.id, levelProgress);
          const progress = getProgressForEra(era.id, levelProgress);
          const isExpanded = expandedEra === era.id;
          const progressPct = (progress.completed / progress.total) * 100;

          return (
            <motion.div
              key={era.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className={`
                rounded-2xl border-2 overflow-hidden transition-all duration-200
                ${isExpanded ? `${themeAccent.border} ring-2 ${themeAccent.ring}` : 'border-white/10'}
                ${!unlocked ? 'opacity-60' : ''}
              `}
            >
              {/* Era header */}
              <button
                className={`
                  w-full p-4 flex items-center gap-4 text-left transition-all
                  bg-gradient-to-r ${era.gradient}
                  ${unlocked ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed'}
                `}
                onClick={() => handleEraClick(era.id)}
              >
                {/* Icon */}
                <div className="text-3xl lg:text-4xl w-12 h-12 lg:w-14 lg:h-14 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  {unlocked ? era.icon : '🔒'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-white text-base">{era.label}</h3>
                    {unlocked && (
                      <span className="text-white/60 text-xs font-medium">
                        {progress.completed}/{progress.total} complete
                      </span>
                    )}
                  </div>

                  {unlocked ? (
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${themeAccent.cta}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  ) : (
                    <p className="text-white/50 text-xs">
                      Complete {era.lockedBy} to unlock
                    </p>
                  )}
                </div>

                {/* Expand chevron */}
                {unlocked && (
                  <motion.span
                    className="text-white/50 text-sm flex-shrink-0"
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    ▼
                  </motion.span>
                )}
              </button>

              {/* Levels grid */}
              <AnimatePresence>
                {isExpanded && unlocked && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden bg-[#1e293b]"
                  >
                    <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {ERA_LEVEL_CONFIGS[era.id].map((levelConfig) => {
                        const lvlLocked = !isLevelUnlocked(era.id, levelConfig.level, levelProgress);
                        return (
                          <LevelButton
                            key={levelConfig.level}
                            eraConfig={era}
                            levelConfig={levelConfig}
                            progress={getLevelProgress(era.id, levelConfig.level, levelProgress)}
                            locked={lvlLocked}
                            themeAccent={themeAccent}
                            onSelect={() => handleLevelSelect(era.id, levelConfig.level)}
                          />
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
