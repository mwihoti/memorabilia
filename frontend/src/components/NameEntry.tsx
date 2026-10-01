import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { hapticImpact, hapticNotification } from '../telegram/telegram';

interface NameEntryProps {
  onContinue: () => void;
}

const STORAGE_KEY = 'memorabilia_player_name';
const MAX_NAME = 24;

export default function NameEntry({ onContinue }: NameEntryProps) {
  const { telegramUser, setPlayerName } = useGameStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const savedName = localStorage.getItem(STORAGE_KEY) || '';
  const suggestedName = savedName || telegramUser?.first_name || '';

  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 700);
    return () => clearTimeout(t);
  }, []);

  const avatarLetter = (name || suggestedName || '?')[0]?.toUpperCase();

  const handleContinue = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a display name to continue');
      hapticNotification('error');
      return;
    }
    if (trimmed.length > MAX_NAME) {
      setError(`Keep it to ${MAX_NAME} characters or fewer`);
      hapticNotification('error');
      return;
    }

    hapticImpact('medium');
    setError('');
    setSubmitted(true);
    localStorage.setItem(STORAGE_KEY, trimmed);
    setPlayerName(trimmed);
    setTimeout(onContinue, 420);
  };

  return (
    <div
      className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-5"
      style={{
        paddingTop: 'calc(1.5rem + var(--safe-top))',
        paddingBottom: 'calc(1.5rem + var(--safe-bottom))',
      }}
    >
      {/* ── Crest ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -18, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <div
          className="text-5xl sm:text-6xl"
          style={{ filter: 'drop-shadow(0 8px 30px rgba(232,180,74,0.55))' }}
        >
          🏛️
        </div>

        {/* Rule with a diamond either side */}
        <div className="mt-3 flex items-center justify-center gap-2.5">
          <Diamond />
          <span
            className="block h-px w-16 sm:w-24"
            style={{ background: 'linear-gradient(90deg, transparent, var(--mu-gold-dim))' }}
          />
          <Diamond />
          <span
            className="block h-px w-16 sm:w-24"
            style={{ background: 'linear-gradient(90deg, var(--mu-gold-dim), transparent)' }}
          />
          <Diamond />
        </div>
      </motion.div>

      {/* ── Wordmark ────────────────────────────────────────────────────────── */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="font-display mu-wordmark mt-3 text-center text-[3.25rem] leading-[0.95] sm:text-7xl lg:text-8xl"
      >
        Memorabilia
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mt-3 flex items-center gap-3"
      >
        <span className="block h-px w-5 sm:w-8" style={{ background: 'var(--mu-gold-dim)' }} />
        <span className="mu-eyebrow text-center text-[0.6rem] sm:text-xs">
          The On-Chain Museum Game
        </span>
        <span className="block h-px w-5 sm:w-8" style={{ background: 'var(--mu-gold-dim)' }} />
      </motion.div>

      {/* ── Card ────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mu-panel mt-7 w-full max-w-sm px-5 pb-6 pt-8 sm:mt-9 sm:px-7"
        style={{ boxShadow: '0 30px 80px -40px rgba(0,0,0,0.95)' }}
      >
        {/* Avatar ring */}
        <div className="-mt-[3.25rem] mb-4 flex justify-center">
          <div className="relative">
            <div
              className="absolute -inset-2 rounded-full opacity-70 blur-md"
              style={{ background: 'radial-gradient(circle, rgba(232,180,74,0.5), transparent 70%)' }}
            />
            <div
              className="font-display relative grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full text-3xl font-bold"
              style={{
                color: 'var(--mu-gold-bright)',
                background: 'linear-gradient(165deg, #131c33, #080d1a)',
                border: '2px solid var(--mu-gold)',
                boxShadow: 'inset 0 0 22px rgba(232,180,74,0.22), 0 0 26px -6px rgba(232,180,74,0.6)',
              }}
            >
              {avatarLetter}
            </div>
          </div>
        </div>

        {telegramUser?.username && (
          <div className="mb-3 flex justify-center">
            <span className="mu-chip">
              <span style={{ color: 'var(--mu-good)' }}>✓</span>
              Authentic via Telegram
            </span>
          </div>
        )}

        <h2
          className="text-center text-lg font-bold sm:text-xl"
          style={{ color: 'var(--mu-ivory)' }}
        >
          Welcome, Curator!
        </h2>
        <p className="mt-1 text-center text-[0.8rem]" style={{ color: 'var(--mu-muted)' }}>
          Choose your display name for the game
        </p>

        <div className="mt-5">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
            maxLength={MAX_NAME + 6}
            placeholder="Your name"
            aria-label="Display name"
            aria-invalid={!!error}
            className="mu-field px-4 py-3 text-base"
            style={error ? { borderColor: 'var(--mu-bad)' } : undefined}
          />

          <AnimatePresence mode="wait">
            {error ? (
              <motion.p
                key="err"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 text-center text-xs font-medium"
                style={{ color: 'var(--mu-bad)' }}
              >
                {error}
              </motion.p>
            ) : (
              <motion.p
                key="count"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-center text-[0.68rem]"
                style={{ color: 'var(--mu-faint)' }}
              >
                {name.trim().length}/{MAX_NAME}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleContinue}
          disabled={submitted}
          className="mu-btn-gold mt-3 w-full px-5 py-3.5 text-[0.95rem]"
        >
          {submitted ? (
            <>Opening the doors…</>
          ) : (
            <>
              <span>🏛️</span>
              <span>Enter Museum</span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                →
              </motion.span>
            </>
          )}
        </button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-6 text-center text-[0.68rem]"
        style={{ color: 'var(--mu-faint)' }}
      >
        Five eras · 400 levels · verified scores
      </motion.p>
    </div>
  );
}

function Diamond() {
  return (
    <span
      className="block h-1 w-1 rotate-45"
      style={{ background: 'var(--mu-gold)', boxShadow: '0 0 6px var(--mu-gold)' }}
    />
  );
}
