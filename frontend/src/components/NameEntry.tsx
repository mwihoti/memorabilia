import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { hapticImpact, hapticNotification } from '../telegram/telegram';

interface NameEntryProps {
  onContinue: () => void;
}

const STORAGE_KEY = 'memorabilia_player_name';

export default function NameEntry({ onContinue }: NameEntryProps) {
  const { telegramUser, setPlayerName } = useGameStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const savedName = localStorage.getItem(STORAGE_KEY) || '';
  const suggestedName = savedName || telegramUser?.first_name || '';

  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // auto-focus input after entrance animation
    const t = setTimeout(() => inputRef.current?.focus(), 600);
    return () => clearTimeout(t);
  }, []);

  const avatarLetter = (name || suggestedName || '?')[0]?.toUpperCase();

  const handleContinue = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter your name to continue');
      hapticNotification('error');
      return;
    }
    if (trimmed.length > 24) {
      setError('Name must be 24 characters or less');
      hapticNotification('error');
      return;
    }

    hapticImpact('medium');
    setError('');
    setSubmitted(true);
    localStorage.setItem(STORAGE_KEY, trimmed);
    setPlayerName(trimmed);

    setTimeout(onContinue, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleContinue();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo area */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="text-center mb-8"
        >
          <div className="text-7xl mb-3">🏛️</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-museum-gold-400 to-museum-bronze-500 bg-clip-text text-transparent">
            Memorabilia
          </h1>
          <p className="text-museum-stone-400 text-sm mt-1">The on-chain museum game</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-museum-stone-900/80 backdrop-blur-lg rounded-3xl p-8 border border-museum-bronze-400/30 shadow-2xl"
        >
          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 180 }}
              className="relative"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-museum-gold-500 to-museum-bronze-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-museum-gold-400/50">
                {avatarLetter}
              </div>
              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-museum-gold-400"
                animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>

          {/* Verified Telegram badge */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-blue-400 text-xs font-semibold bg-blue-400/10 border border-blue-400/30 px-3 py-1 rounded-full">
              ✓ Authenticated via Telegram
            </span>
          </div>

          <h2 className="text-xl font-bold text-center text-white mb-1">
            Welcome, Curator!
          </h2>
          <p className="text-museum-stone-400 text-sm text-center mb-6">
            Choose your display name for the game
          </p>

          {/* Input */}
          <div className="mb-2">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              maxLength={24}
              placeholder="Enter your name..."
              className={`
                w-full px-4 py-3 rounded-xl text-white text-lg font-medium text-center
                bg-museum-stone-800 border-2 transition-all duration-200 outline-none
                placeholder:text-museum-stone-500
                ${error
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-museum-bronze-400/40 focus:border-museum-gold-400'
                }
              `}
            />
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-xs text-center mt-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Character count */}
          <p className="text-museum-stone-600 text-xs text-right mb-5">
            {name.length}/24
          </p>

          {/* Continue button */}
          <motion.button
            onClick={handleContinue}
            disabled={submitted}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
              ${submitted
                ? 'bg-museum-stone-700 text-museum-stone-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-museum-gold-500 to-museum-bronze-600 text-white shadow-lg hover:from-museum-gold-600 hover:to-museum-bronze-700'
              }
            `}
          >
            {submitted ? '✓ Entering Museum...' : 'Enter Museum →'}
          </motion.button>

          {/* Telegram identity — always shown, not changeable */}
          <div className="mt-4 pt-4 border-t border-museum-stone-700/50">
            <div className="flex items-center justify-center gap-2 text-xs text-museum-stone-500">
              <span>🔒</span>
              <span>
                Telegram ID: <span className="text-museum-stone-400 font-mono">{telegramUser?.id}</span>
                {telegramUser?.username && (
                  <> · <span className="text-museum-stone-400">@{telegramUser.username}</span></>
                )}
              </span>
            </div>
            <p className="text-museum-stone-600 text-xs text-center mt-1">
              Your score is linked to your Telegram account
            </p>
          </div>
        </motion.div>

        {/* Stats teaser */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-6 mt-6 text-center"
        >
          {[
            { icon: '🏆', label: 'Leaderboard' },
            { icon: '🎭', label: 'Eras' },
            { icon: '🏛️', label: 'NFT Rewards' },
          ].map(({ icon, label }) => (
            <div key={label} className="text-museum-stone-400">
              <div className="text-2xl">{icon}</div>
              <div className="text-xs mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
