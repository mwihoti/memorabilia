import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { showConfirm, hapticImpact } from '../telegram/telegram';
import { QUIT_STRIKE_LIMIT, QUIT_PENALTY_POINTS } from '../../../shared/activities.js';

interface GameExitBarProps {
  /** Back to the level list, keeping the run. */
  onHome: () => void;
  /** Abandon the current run and leave. */
  onQuit: () => void;
  /** True while a board is in play — drives the warning copy. */
  inGame: boolean;
}

/**
 * Home and quit controls for the game screen.
 *
 * Lives in the page body rather than the top bar because the top bar's slot is
 * inside a `lg:flex` container, so on a phone — where nearly everyone plays —
 * there was no visible way out of a board at all.
 */
export default function GameExitBar({ onHome, onQuit, inGame }: GameExitBarProps) {
  const { consecutiveQuits } = useGameStore();

  // One more quit after this many triggers the penalty.
  const remaining = QUIT_STRIKE_LIMIT - 1 - consecutiveQuits;
  const nextQuitCosts = remaining <= 0;

  const confirmQuit = () => {
    hapticImpact('medium');

    const warning = nextQuitCosts
      ? `Quit this board?\n\nThis is your ${QUIT_STRIKE_LIMIT}th quit in a row, so it costs ${QUIT_PENALTY_POINTS} season points. Finishing a level clears the count.`
      : 'Quit this board? Your progress on this level will be lost.';

    showConfirm(warning, (confirmed) => {
      if (confirmed) onQuit();
    });
  };

  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        onClick={() => {
          hapticImpact('light');
          onHome();
        }}
        className="mu-btn-ghost px-3 py-2 text-sm"
        aria-label="Back to the level list"
      >
        <span aria-hidden="true">←</span>
        <span className="hidden sm:inline">Museum</span>
      </button>

      <div className="flex-1" />

      {inGame && nextQuitCosts && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mu-chip"
          style={{ color: 'var(--mu-warn)', borderColor: 'rgba(251,191,36,0.4)' }}
        >
          Next quit costs {QUIT_PENALTY_POINTS} pts
        </motion.span>
      )}

      <button
        onClick={confirmQuit}
        className="mu-btn-ghost px-3 py-2 text-sm"
        style={{ color: 'var(--mu-bad)', borderColor: 'rgba(248,113,113,0.32)' }}
      >
        <span aria-hidden="true">✕</span>
        <span>Quit</span>
      </button>
    </div>
  );
}
