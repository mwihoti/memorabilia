import { motion } from 'framer-motion';
import { hapticImpact } from '../telegram/telegram';
import CardPattern from './CardPattern';
import type { CardSkin } from '../theme/cardSkins';

interface CardProps {
  emoji: string;
  /** Era skin for this board — supplied by GameBoard, never read from theme. */
  skin: CardSkin;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
  disabled?: boolean;
  index?: number;
  isMismatched?: boolean;
  isHinted?: boolean;
  isObscured?: boolean;
}

export default function Card({
  emoji,
  skin,
  isFlipped,
  isMatched,
  onClick,
  disabled,
  index = 0,
  isMismatched = false,
  isHinted = false,
  isObscured = false,
}: CardProps) {
  const handleClick = () => {
    if (disabled || isMatched || isFlipped) return;
    hapticImpact('light');
    onClick();
  };

  const faceUp = isFlipped || isMatched;

  return (
    <motion.div
      className="aspect-square cursor-pointer select-none"
      initial={{ opacity: 0, scale: 0.5, y: index % 3 === 0 ? -22 : index % 3 === 1 ? 22 : 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        x: isMismatched ? [0, -7, 7, -5, 5, -2, 2, 0] : 0,
      }}
      transition={{
        opacity: { delay: index * 0.028, duration: 0.24 },
        scale: { delay: index * 0.028, type: 'spring', stiffness: 240, damping: 19 },
        y: { delay: index * 0.028, type: 'spring', stiffness: 240, damping: 19 },
        x: isMismatched ? { duration: 0.4, ease: 'easeInOut' } : {},
      }}
      whileHover={!disabled && !faceUp ? { scale: 1.07, y: -3 } : {}}
      whileTap={!disabled && !isMatched ? { scale: 0.93 } : {}}
      onClick={handleClick}
      role="button"
      aria-label={faceUp ? `Card showing ${emoji}` : 'Face-down card'}
      aria-pressed={faceUp}
    >
      <div className="relative h-full w-full" style={{ perspective: '1200px' }}>
        <motion.div
          className="relative h-full w-full"
          initial={false}
          animate={{ rotateY: faceUp ? 180 : 0 }}
          transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
        >
          {/* ── Back ──────────────────────────────────────────────────────── */}
          <div
            className="absolute h-full w-full overflow-hidden rounded-xl"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div
              className="relative flex h-full w-full items-center justify-center rounded-xl transition-colors duration-150"
              style={{
                background: `linear-gradient(150deg, ${skin.backFrom} 0%, ${skin.backVia} 55%, ${skin.backTo} 100%)`,
                border: `1.5px solid ${skin.border}`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 18px -10px rgba(0,0,0,0.9)`,
              }}
            >
              <CardPattern kind={skin.pattern} uid={`${skin.id}-${index}`} tint={skin.accent} />

              {/* Inlaid frame */}
              <div className="pointer-events-none absolute inset-[3px] rounded-[9px] border border-white/10" />
              <div
                className="pointer-events-none absolute inset-[6px] rounded-md border"
                style={{ borderColor: `${skin.accent}22` }}
              />

              <motion.div
                className="z-10 text-2xl drop-shadow-lg sm:text-3xl"
                animate={
                  !disabled && !faceUp
                    ? { scale: [1, 1.06, 1], opacity: [0.82, 1, 0.82] }
                    : { scale: 1, opacity: 0.85 }
                }
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: index * 0.13,
                }}
              >
                {skin.glyph}
              </motion.div>

              {isObscured && (
                <div
                  className="absolute inset-0 z-20 backdrop-blur-[2px]"
                  style={{
                    background: `linear-gradient(150deg, ${skin.accent}44, transparent 70%)`,
                  }}
                />
              )}
            </div>
          </div>

          {/* ── Front ─────────────────────────────────────────────────────── */}
          <div
            className="absolute h-full w-full overflow-hidden rounded-xl"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div
              className="relative flex h-full w-full items-center justify-center rounded-xl transition-colors duration-200"
              style={
                isMatched
                  ? {
                      background: `linear-gradient(150deg, ${skin.matchedFrom}, ${skin.matchedVia} 55%, ${skin.matchedTo})`,
                      border: `1.5px solid ${skin.matchedBorder}`,
                      boxShadow: `0 0 20px -4px ${skin.glow}`,
                    }
                  : {
                      background: `linear-gradient(150deg, ${skin.frontFrom}, ${skin.frontTo})`,
                      border: `1.5px solid ${skin.frontBorder}`,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
                    }
              }
            >
              {isMatched && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  initial={{ scale: 0.6, opacity: 0.9 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ background: `radial-gradient(circle, ${skin.burst} 0%, transparent 70%)` }}
                />
              )}

              <motion.div
                className="z-10 text-2xl drop-shadow-md sm:text-3xl md:text-4xl"
                style={isHinted ? { filter: `drop-shadow(0 0 12px ${skin.glow})` } : undefined}
                initial={false}
                animate={
                  isMatched
                    ? { scale: [1, 1.38, 1.1], rotate: [0, 11, -11, 0] }
                    : isHinted
                      ? { scale: [1, 1.13, 1], rotate: [0, -6, 6, 0] }
                      : { scale: 1, rotate: 0 }
                }
                transition={{ duration: 0.35, ease: 'backOut' }}
              >
                {emoji}
              </motion.div>

              {isHinted && !isMatched && (
                <div
                  className="absolute inset-[4px] rounded-lg border-2"
                  style={{ borderColor: skin.glow, boxShadow: `0 0 16px ${skin.burst}` }}
                />
              )}

              {isMatched && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute bottom-1 right-1.5 text-[0.65rem] font-bold text-white/80"
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
