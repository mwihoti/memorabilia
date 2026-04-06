import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Achievement } from '../types';

interface AchievementToastProps {
  achievements: Achievement[];
  onDismiss: () => void;
}

interface ToastItem {
  achievement: Achievement;
  id: string;
}

export default function AchievementToast({ achievements, onDismiss }: AchievementToastProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Whenever new achievements arrive, push them into the queue (max 3)
  useEffect(() => {
    if (achievements.length === 0) return;

    const incoming = achievements.map((a) => ({
      achievement: a,
      id: `${a.id}-${Date.now()}-${Math.random()}`,
    }));

    setToasts((prev) => [...prev, ...incoming].slice(-3));
  }, [achievements]);

  // Auto-dismiss each toast after 4 seconds
  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((t) =>
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== t.id));
      }, 4000)
    );

    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  // When all toasts are gone, notify parent so it can clear the queue
  useEffect(() => {
    if (toasts.length === 0 && achievements.length > 0) {
      onDismiss();
    }
  }, [toasts, achievements, onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((item) => (
          <motion.div
            key={item.id}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="pointer-events-auto w-72 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Accent bar */}
            <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-600" />

            <div className="p-4 flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-12 h-12 bg-amber-500/15 border border-amber-500/25 rounded-xl flex items-center justify-center text-2xl">
                {item.achievement.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                    UNLOCKED!
                  </span>
                </div>
                <p className="text-sm font-bold text-white leading-tight truncate">
                  {item.achievement.name}
                </p>
                <p className="text-xs text-white/50 leading-snug mt-0.5">
                  {item.achievement.description}
                </p>
                {item.achievement.reward && (
                  <p className="text-xs text-amber-300 mt-1">
                    🎁 Unlocked: {item.achievement.reward.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
