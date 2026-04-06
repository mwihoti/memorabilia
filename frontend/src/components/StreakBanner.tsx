import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export default function StreakBanner() {
  const { streak, theme } = useGameStore();
  const { currentStreak, shieldsAvailable, multiplierBonus } = streak;

  const themeAccent = {
    museum: { bg: 'bg-amber-500/10 border-amber-500/20',  text: 'text-amber-400', badge: 'bg-amber-500 text-amber-900' },
    nature: { bg: 'bg-green-500/10 border-green-500/20',  text: 'text-green-400', badge: 'bg-green-500 text-green-900' },
    urban:  { bg: 'bg-[#00ff88]/10 border-[#00ff88]/20',  text: 'text-[#00ff88]', badge: 'bg-[#00ff88] text-zinc-900' },
  }[theme];

  const multiplierLabel =
    multiplierBonus >= 1.0 ? '+100% score' :
    multiplierBonus >= 0.5 ? '+50% score'  :
    multiplierBonus >= 0.25 ? '+25% score' : null;

  const highStreak = currentStreak >= 7;

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border ${themeAccent.bg} mb-4`}>
      {/* Fire + streak count */}
      <div className="flex items-center gap-2">
        <motion.span
          className="text-xl leading-none"
          animate={highStreak ? {
            scale: [1, 1.15, 1],
            filter: ['drop-shadow(0 0 0px #f97316)', 'drop-shadow(0 0 8px #f97316)', 'drop-shadow(0 0 0px #f97316)'],
          } : {}}
          transition={highStreak ? { duration: 1.8, repeat: Infinity } : {}}
        >
          🔥
        </motion.span>

        {currentStreak > 0 ? (
          <span className={`text-sm font-bold ${themeAccent.text}`}>
            {currentStreak} day streak!
          </span>
        ) : (
          <span className="text-sm text-white/50 font-medium">
            Start your streak today!
          </span>
        )}
      </div>

      {/* Right side: shields + multiplier */}
      <div className="flex items-center gap-2">
        {shieldsAvailable > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: shieldsAvailable }).map((_, i) => (
              <span key={i} className="text-sm">🛡️</span>
            ))}
          </div>
        )}

        {multiplierLabel && (
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${themeAccent.badge}`}>
            {multiplierLabel}
          </span>
        )}
      </div>
    </div>
  );
}
