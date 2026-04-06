import { motion } from 'framer-motion';
import { hapticImpact } from '../telegram/telegram';
import { useGameStore } from '../store/gameStore';

interface CardProps {
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
  disabled?: boolean;
  index?: number;
  isMismatched?: boolean;
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
  const { theme } = useGameStore();

  const handleClick = () => {
    if (disabled || isMatched || isFlipped) return;
    hapticImpact('light');
    onClick();
  };

  // Theme-specific card back styles
  const cardBack = {
    museum: {
      bg: 'from-amber-800 via-amber-700 to-yellow-700',
      border: 'border-amber-500/60',
      hoverBorder: 'hover:border-yellow-300/80',
      matchedBg: 'from-amber-400 via-amber-500 to-amber-600 border-amber-300 shadow-amber-500/40',
      frontBg: 'from-slate-100 to-amber-50 border-slate-300',
      burstColor: 'rgba(250,204,21,0.6)',
      centerIcon: '🏛️',
      pattern: (i: number) => (
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`tile-${i}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="8" cy="8" r="1.5" fill="rgba(250,204,21,0.8)" />
              <path d="M0 0 L8 8 L16 0 M0 16 L8 8 L16 16" stroke="rgba(250,204,21,0.4)" strokeWidth="0.5" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#tile-${i})`} />
        </svg>
      ),
    },
    nature: {
      bg: 'from-green-900 via-green-800 to-emerald-800',
      border: 'border-green-500/50',
      hoverBorder: 'hover:border-green-300/70',
      matchedBg: 'from-green-400 via-green-500 to-emerald-500 border-green-300 shadow-green-500/40',
      frontBg: 'from-green-50 to-emerald-50 border-green-200',
      burstColor: 'rgba(74,222,128,0.6)',
      centerIcon: '🌿',
      pattern: (i: number) => (
        <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`leaf-${i}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <ellipse cx="10" cy="6" rx="4" ry="6" fill="none" stroke="rgba(74,222,128,0.6)" strokeWidth="0.8" />
              <line x1="10" y1="12" x2="10" y2="20" stroke="rgba(74,222,128,0.4)" strokeWidth="0.6" />
              <circle cx="4" cy="16" r="2" fill="none" stroke="rgba(52,211,153,0.4)" strokeWidth="0.5" />
              <circle cx="16" cy="16" r="2" fill="none" stroke="rgba(52,211,153,0.4)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#leaf-${i})`} />
        </svg>
      ),
    },
    urban: {
      bg: 'from-zinc-900 via-zinc-800 to-zinc-900',
      border: 'border-[#00ff88]/30',
      hoverBorder: 'hover:border-[#00ff88]/70',
      matchedBg: 'from-[#00ff88]/30 via-[#00e5ff]/20 to-[#ff0080]/20 border-[#00ff88]/80 shadow-[#00ff88]/30',
      frontBg: 'from-zinc-100 to-zinc-200 border-zinc-300',
      burstColor: 'rgba(0,255,136,0.5)',
      centerIcon: '🎨',
      pattern: (i: number) => (
        <svg className="absolute inset-0 w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`spray-${i}`} x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1" fill="rgba(0,255,136,0.7)" />
              <circle cx="20" cy="4" r="0.7" fill="rgba(0,229,255,0.6)" />
              <circle cx="12" cy="12" r="1.5" fill="rgba(255,0,128,0.5)" />
              <circle cx="4" cy="20" r="0.8" fill="rgba(0,255,136,0.5)" />
              <circle cx="20" cy="20" r="1" fill="rgba(0,229,255,0.7)" />
              <line x1="0" y1="12" x2="24" y2="12" stroke="rgba(0,255,136,0.15)" strokeWidth="0.5" />
              <line x1="12" y1="0" x2="12" y2="24" stroke="rgba(0,229,255,0.15)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#spray-${i})`} />
        </svg>
      ),
    },
  }[theme];

  return (
    <motion.div
      className="aspect-square cursor-pointer select-none"
      initial={{ opacity: 0, scale: 0.4, y: (index % 3 === 0 ? -30 : index % 3 === 1 ? 30 : 0) }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        x: isMismatched ? [0, -8, 8, -6, 6, -3, 3, 0] : 0,
      }}
      transition={{
        opacity:  { delay: index * 0.04, duration: 0.25 },
        scale:    { delay: index * 0.04, duration: 0.3, type: 'spring', stiffness: 220, damping: 18 },
        y:        { delay: index * 0.04, duration: 0.3, type: 'spring' },
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
              bg-gradient-to-br ${cardBack.bg}
              border-2 ${cardBack.border}
              shadow-lg transition-colors duration-150
              ${!disabled && !isMatched ? cardBack.hoverBorder : ''}
            `}>
              {cardBack.pattern(index)}

              {/* Ornamental border rings */}
              <div className="absolute inset-[3px] rounded-lg border border-white/10 pointer-events-none" />
              <div className="absolute inset-[6px] rounded-md border border-white/5 pointer-events-none" />

              {/* Center icon */}
              <motion.div
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl z-10 filter drop-shadow-lg"
                animate={!disabled ? {
                  scale: [1, 1.06, 1],
                  opacity: [0.9, 1, 0.9],
                } : {}}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.15 }}
              >
                {cardBack.centerIcon}
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
                ? `bg-gradient-to-br ${cardBack.matchedBg}`
                : `bg-gradient-to-br ${cardBack.frontBg}`
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
                  style={{ background: `radial-gradient(circle, ${cardBack.burstColor} 0%, transparent 70%)` }}
                />
              )}

              {/* Emoji */}
              <motion.div
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl filter drop-shadow-md z-10"
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
