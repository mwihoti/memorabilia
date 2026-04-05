import { motion } from 'framer-motion';
import { hapticImpact } from '../telegram/telegram';

interface CardProps {
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
  disabled?: boolean;
  index?: number;       // for staggered entrance
  isMismatched?: boolean; // triggers shake
}

export default function Card({
  emoji,
  isFlipped,
  isMatched,
  onClick,
  disabled,
  index = 0,
  isMismatched = false,
}: CardProps) {
  const handleClick = () => {
    if (disabled || isMatched || isFlipped) return;
    hapticImpact('light');
    onClick();
  };

  return (
    <motion.div
      className="aspect-square cursor-pointer select-none"
      // Staggered entrance: each card flies in from a random direction
      initial={{ opacity: 0, scale: 0.4, y: (index % 3 === 0 ? -30 : index % 3 === 1 ? 30 : 0) }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        // Shake on mismatch
        x: isMismatched ? [0, -8, 8, -6, 6, -3, 3, 0] : 0,
      }}
      transition={{
        // Entrance stagger
        opacity:  { delay: index * 0.04, duration: 0.25 },
        scale:    { delay: index * 0.04, duration: 0.3, type: 'spring', stiffness: 220, damping: 18 },
        y:        { delay: index * 0.04, duration: 0.3, type: 'spring' },
        // Shake
        x: isMismatched ? { duration: 0.4, ease: 'easeInOut' } : {},
      }}
      whileHover={!disabled && !isMatched && !isFlipped ? { scale: 1.08, y: -3 } : {}}
      whileTap={!disabled && !isMatched ? { scale: 0.92 } : {}}
      onClick={handleClick}
    >
      <div className="relative w-full h-full" style={{ perspective: '800px' }}>
        <motion.div
          className="w-full h-full relative"
          initial={false}
          animate={{ rotateY: isFlipped || isMatched ? 180 : 0 }}
          transition={{ duration: 0.13, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* ── Card Back ─────────────────────────────────────────────────── */}
          <div
            className="absolute w-full h-full rounded-xl overflow-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className={`
              w-full h-full rounded-xl flex items-center justify-center relative
              bg-gradient-to-br from-museum-bronze-700 via-museum-bronze-600 to-museum-gold-700
              border-2 border-museum-bronze-400/60
              shadow-lg transition-colors duration-150
              ${!disabled && !isMatched ? 'hover:border-museum-gold-300/80' : ''}
            `}>
              {/* SVG ornamental pattern */}
              <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id={`tile-${index}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                    <circle cx="8" cy="8" r="1.5" fill="rgba(250,204,21,0.8)" />
                    <path d="M0 0 L8 8 L16 0 M0 16 L8 8 L16 16" stroke="rgba(250,204,21,0.4)" strokeWidth="0.5" fill="none" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#tile-${index})`} />
              </svg>

              {/* Ornamental border */}
              <div className="absolute inset-[3px] rounded-lg border border-museum-gold-400/30 pointer-events-none" />
              <div className="absolute inset-[6px] rounded-md border border-museum-gold-400/15 pointer-events-none" />

              {/* Center symbol */}
              <motion.div
                className="text-2xl sm:text-3xl z-10 filter drop-shadow-lg"
                animate={!disabled ? {
                  scale: [1, 1.06, 1],
                  opacity: [0.9, 1, 0.9],
                } : {}}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.15 }}
              >
                🏛️
              </motion.div>
            </div>
          </div>

          {/* ── Card Front ────────────────────────────────────────────────── */}
          <div
            className="absolute w-full h-full rounded-xl overflow-hidden"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className={`
              w-full h-full rounded-xl flex items-center justify-center relative
              border-2 shadow-lg
              ${isMatched
                ? 'bg-gradient-to-br from-museum-gold-400 via-museum-gold-500 to-museum-bronze-500 border-museum-gold-300 shadow-museum-gold-500/40'
                : 'bg-gradient-to-br from-museum-stone-100 to-museum-sand-200 border-museum-stone-300'
              }
              transition-colors duration-200
            `}>
              {/* Match burst */}
              {isMatched && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  initial={{ scale: 0.6, opacity: 0.9 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.6) 0%, transparent 70%)' }}
                />
              )}

              {/* Emoji */}
              <motion.div
                className="text-2xl sm:text-3xl md:text-4xl filter drop-shadow-md z-10"
                initial={false}
                animate={isMatched ? {
                  scale: [1, 1.4, 1.1],
                  rotate: [0, 12, -12, 0],
                } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.35, ease: 'backOut' }}
              >
                {emoji}
              </motion.div>

              {/* Matched checkmark */}
              {isMatched && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute bottom-1 right-1 text-xs"
                >
                  ✓
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
