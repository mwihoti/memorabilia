import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Difficulty, GAME_CONFIGS } from '../types';
import { hapticImpact } from '../telegram/telegram';

interface DifficultySelectorProps {
  onStart: () => void;
}

export default function DifficultySelector({ onStart }: DifficultySelectorProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const { startNewGame, isGameLoading, playerName, telegramUser } = useGameStore();
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
      color: 'from-museum-bronze-500 to-museum-bronze-700',
      borderColor: 'border-museum-bronze-500',
      description: '6 artifacts • 12 cards',
      time: '~2 min',
    },
    {
      level: Difficulty.Medium,
      name: 'Medieval Times',
      emoji: '⚔️',
      color: 'from-museum-stone-600 to-museum-stone-800',
      borderColor: 'border-museum-stone-600',
      description: '10 artifacts • 20 cards',
      time: '~4 min',
    },
    {
      level: Difficulty.Hard,
      name: 'Modern Era',
      emoji: '🚀',
      color: 'from-museum-blue-600 to-museum-blue-800',
      borderColor: 'border-museum-blue-600',
      description: '15 artifacts • 30 cards',
      time: '~7 min',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <p className="text-museum-gold-400 text-sm font-semibold tracking-wider uppercase mb-2">
          Welcome back, {displayName}!
        </p>
        <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-museum-gold-500 to-museum-bronze-600 bg-clip-text text-transparent">
          Choose Your Era
        </h2>
        <p className="text-[#FCFFF7]/70">Select a time period to discover artifacts</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {difficulties.map((diff) => {
          const config = GAME_CONFIGS[diff.level];
          const isSelected = selectedDifficulty === diff.level;
          
          return (
            <button
              key={diff.level}
              onClick={() => handleSelectDifficulty(diff.level)}
              className={`
                relative p-6 rounded-2xl transition-all duration-300 transform
                ${isSelected 
                  ? `scale-105 border-4 ${diff.borderColor} shadow-2xl` 
                  : 'border-2 border-museum-stone-400 hover:scale-105 hover:border-museum-bronze-400'
                }
                bg-gradient-to-br ${diff.color} bg-opacity-10 backdrop-blur-sm
              `}
            >
              {/* Emoji */}
              <div className="text-6xl mb-4">{diff.emoji}</div>
              
              {/* Name */}
              <h3 className="text-2xl font-bold mb-2 text-[#FCFFF7]">{diff.name}</h3>
              
                  {/* Description */}
              <p className="text-sm text-[#FCFFF7]/80 mb-3">{diff.description}</p>

              {/* Stats */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#FCFFF7]/60">Optimal moves:</span>
                  <span className="font-bold text-[#FCFFF7]">{config.optimalMoves}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#FCFFF7]/60">Est. time:</span>
                  <span className="font-bold text-museum-gold-300">{diff.time}</span>
                </div>
              </div>
              
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 w-8 h-8 bg-museum-gold-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Start Button */}
      <div className="text-center">
        <button
          onClick={handleStart}
          disabled={!selectedDifficulty || isGameLoading}
          className={`
            px-12 py-4 rounded-xl text-xl font-bold transition-all duration-300 transform
            ${selectedDifficulty && !isGameLoading
              ? 'bg-gradient-to-r from-museum-gold-500 to-museum-bronze-600 hover:from-museum-gold-600 hover:to-museum-bronze-700 hover:scale-105 shadow-lg text-white'
              : 'bg-museum-stone-600 cursor-not-allowed opacity-50 text-museum-stone-400'
            }
          `}
        >
          {isGameLoading ? (
            <span className="flex items-center space-x-2">
              <span className="animate-spin">⏳</span>
              <span>Entering Gallery...</span>
            </span>
          ) : (
            'Enter Museum'
          )}
        </button>
      </div>

      {/* How to Play */}
      <div className="mt-12 p-6 bg-museum-stone-800/30 backdrop-blur-sm rounded-xl border border-museum-bronze-400/20">
        <h3 className="text-xl font-bold mb-4 flex items-center space-x-2 text-[#FCFFF7]">
          <span>📖</span>
          <span>How to Build Your Museum</span>
        </h3>
        <ul className="space-y-2 text-[#FCFFF7]">
          <li className="flex items-start space-x-2">
            <span className="text-museum-gold-400 font-bold">1.</span>
            <span>Click on artifacts to reveal their historical significance</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-museum-gold-400 font-bold">2.</span>
            <span>Find matching pairs from the same time period</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-museum-gold-400 font-bold">3.</span>
            <span>Collect all artifacts to complete your museum exhibition</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-museum-gold-400 font-bold">4.</span>
            <span>Compete for the Hall of Fame with the best collections!</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

