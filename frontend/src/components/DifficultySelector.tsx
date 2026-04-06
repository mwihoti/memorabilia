import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore, Theme } from '../store/gameStore';
import { Difficulty, GAME_CONFIGS } from '../types';
import { hapticImpact } from '../telegram/telegram';

interface DifficultySelectorProps {
  onStart: () => void;
}

const THEMES: { id: Theme; label: string; icon: string; desc: string }[] = [
  { id: 'museum', label: 'Museum',  icon: '🏛️', desc: 'Classic gold & amber' },
  { id: 'nature', label: 'Nature',  icon: '🌿', desc: 'Forest green & earth' },
  { id: 'urban',  label: 'Urban',   icon: '🎨', desc: 'Neon graffiti streets' },
];

export default function DifficultySelector({ onStart }: DifficultySelectorProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const { startNewGame, isGameLoading, playerName, telegramUser, theme, setTheme } = useGameStore();
  const displayName = playerName || telegramUser?.first_name || 'Curator';

  const handleSelectDifficulty = (difficulty: Difficulty) => {
    hapticImpact('light');
    setSelectedDifficulty(difficulty);
  };

  const handleStart = async () => {
    if (!selectedDifficulty || isGameLoading) return;
    hapticImpact('medium');
    await startNewGame(selectedDifficulty);
    onStart();
  };

  const difficulties = [
    {
      level: Difficulty.Easy,
      name: 'Ancient Era',
      emoji: '🏺',
      description: '6 artifacts · 12 cards',
      time: '~2 min',
    },
    {
      level: Difficulty.Medium,
      name: 'Medieval Times',
      emoji: '⚔️',
      description: '10 artifacts · 20 cards',
      time: '~4 min',
    },
    {
      level: Difficulty.Hard,
      name: 'Modern Era',
      emoji: '🚀',
      description: '15 artifacts · 30 cards',
      time: '~7 min',
    },
  ];

  const themeAccent = {
    museum: { text: 'text-amber-400', border: 'border-amber-500', ring: 'ring-amber-500/40', cta: 'from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600', ctaDisabled: 'bg-slate-700 text-slate-500', selected: 'border-amber-400 bg-amber-500/10' },
    nature: { text: 'text-green-400', border: 'border-green-500', ring: 'ring-green-500/40', cta: 'from-green-500 to-green-700 hover:from-green-400 hover:to-green-600', ctaDisabled: 'bg-[#14532d] text-green-800', selected: 'border-green-400 bg-green-500/10' },
    urban:  { text: 'text-[#00ff88]', border: 'border-[#00ff88]', ring: 'ring-[#00ff88]/30', cta: 'from-[#00ff88] to-[#00e5ff] hover:from-[#00e5ff] hover:to-[#00ff88]', ctaDisabled: 'bg-zinc-800 text-zinc-600', selected: 'border-[#00ff88] bg-[#00ff88]/5' },
  }[theme];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <p className={`${themeAccent.text} text-xs font-semibold tracking-wider uppercase mb-1`}>
          Welcome back, {displayName}!
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--theme-text)' }}>
          Choose Your Era
        </h2>
        <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>Select a time period to discover artifacts</p>
      </motion.div>

      {/* Theme selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--theme-muted)' }}>
          Visual Theme
        </p>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => { hapticImpact('light'); setTheme(t.id); }}
              className={`
                flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-200
                ${theme === t.id
                  ? `${themeAccent.selected} ring-2 ${themeAccent.ring} scale-105`
                  : 'border-white/10 bg-white/5 hover:border-white/25'
                }
              `}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="text-xs font-bold text-white">{t.label}</span>
              <span className="text-[10px] text-white/50 text-center leading-tight hidden sm:block">{t.desc}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Difficulty cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {difficulties.map((diff, i) => {
          const config = GAME_CONFIGS[diff.level];
          const isSelected = selectedDifficulty === diff.level;

          return (
            <motion.button
              key={diff.level}
              onClick={() => handleSelectDifficulty(diff.level)}
              className={`
                relative p-4 sm:p-5 rounded-2xl transition-all duration-200 text-left
                border-2 backdrop-blur-sm
                ${isSelected
                  ? `${themeAccent.selected} ${themeAccent.border} ring-2 ${themeAccent.ring} scale-[1.03]`
                  : 'border-white/10 bg-white/5 hover:border-white/25 hover:scale-[1.02]'
                }
              `}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
            >
              <div className="text-4xl mb-3">{diff.emoji}</div>
              <h3 className="text-base font-bold mb-1 text-white">{diff.name}</h3>
              <p className="text-xs mb-3" style={{ color: 'var(--theme-muted)' }}>{diff.description}</p>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--theme-muted)' }}>Optimal moves</span>
                  <span className="font-bold text-white">{config.optimalMoves}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--theme-muted)' }}>Est. time</span>
                  <span className={`font-bold ${themeAccent.text}`}>{diff.time}</span>
                </div>
              </div>

              {isSelected && (
                <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-slate-900 ${theme === 'museum' ? 'bg-amber-400' : theme === 'nature' ? 'bg-green-400' : 'bg-[#00ff88]'}`}>
                  ✓
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Start Button */}
      <div className="text-center mb-8">
        <motion.button
          onClick={handleStart}
          disabled={!selectedDifficulty || isGameLoading}
          className={`
            px-10 py-3.5 rounded-xl text-base font-bold transition-all duration-200
            ${selectedDifficulty && !isGameLoading
              ? `bg-gradient-to-r ${themeAccent.cta} text-white shadow-lg hover:scale-105`
              : `${themeAccent.ctaDisabled} cursor-not-allowed opacity-50`
            }
          `}
          whileTap={selectedDifficulty && !isGameLoading ? { scale: 0.96 } : {}}
        >
          {isGameLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              <span>Entering Gallery…</span>
            </span>
          ) : (
            theme === 'urban' ? 'Hit the Streets' : theme === 'nature' ? 'Enter the Forest' : 'Enter Museum'
          )}
        </motion.button>
      </div>

      {/* How to play */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="p-4 sm:p-5 rounded-xl border"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'var(--theme-border)' }}
      >
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
          <span>📖</span> How to Play
        </h3>
        <ul className="space-y-2 text-xs" style={{ color: 'var(--theme-muted)' }}>
          <li className="flex items-start gap-2">
            <span className={`font-bold ${themeAccent.text} flex-shrink-0`}>1.</span>
            <span>Tap any card to flip it and reveal a hidden artifact</span>
          </li>
          <li className="flex items-start gap-2">
            <span className={`font-bold ${themeAccent.text} flex-shrink-0`}>2.</span>
            <span>Remember where it is, then tap a second card to find its match</span>
          </li>
          <li className="flex items-start gap-2">
            <span className={`font-bold ${themeAccent.text} flex-shrink-0`}>3.</span>
            <span>Match all pairs to complete the exhibition — fewer moves = higher score</span>
          </li>
          <li className="flex items-start gap-2">
            <span className={`font-bold ${themeAccent.text} flex-shrink-0`}>4.</span>
            <span>Earn ⭐⭐⭐ stars and climb the global leaderboard!</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
