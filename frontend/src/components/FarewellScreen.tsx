import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

interface FarewellScreenProps {
  onPlayAgain: () => void;
}

export default function FarewellScreen({ onPlayAgain }: FarewellScreenProps) {
  const { telegramUser, playerName, theme } = useGameStore();
  const displayName = playerName || telegramUser?.first_name || 'Curator';

  const themeConfig = {
    museum: {
      bg: 'from-[#0f172a] via-[#1e293b] to-[#0f172a]',
      card: 'bg-[#1e293b]/80 border-amber-500/30',
      accent: 'text-amber-400',
      btn: 'from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600',
      icon: '🏛️',
      title: 'Thank You, Curator!',
      subtitle: 'Your exhibition was magnificent.',
      badge: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
      badgeText: 'Museum Tour Complete',
    },
    nature: {
      bg: 'from-[#052e16] via-[#14532d] to-[#052e16]',
      card: 'bg-[#14532d]/80 border-green-400/30',
      accent: 'text-green-400',
      btn: 'from-green-500 to-green-700 hover:from-green-400 hover:to-green-600',
      icon: '🌿',
      title: 'Until Next Season!',
      subtitle: 'The forest remembers your journey.',
      badge: 'bg-green-500/20 border-green-500/40 text-green-300',
      badgeText: 'Nature Trail Complete',
    },
    urban: {
      bg: 'from-[#09090b] via-[#18181b] to-[#09090b]',
      card: 'bg-[#18181b]/80 border-[#00ff88]/25',
      accent: 'text-[#00ff88]',
      btn: 'from-[#00ff88] to-[#00e5ff] hover:from-[#00e5ff] hover:to-[#00ff88]',
      icon: '🎨',
      title: 'Later, Legend!',
      subtitle: 'Your tag lives on these walls forever.',
      badge: 'bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88]',
      badgeText: 'Streets Conquered',
    },
  }[theme];

  const stats = [
    { icon: '🎮', label: 'Come back anytime', value: 'We\'ll be here' },
    { icon: '🏆', label: 'Your scores are saved', value: 'Leaderboard lives on' },
    { icon: '🔗', label: 'Powered by Starknet', value: 'On-chain forever' },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${themeConfig.bg} flex items-center justify-center p-4`}>
      <div className={`max-w-sm w-full ${themeConfig.card} backdrop-blur-lg rounded-3xl p-8 shadow-2xl border`}>

        {/* Animated icon */}
        <motion.div
          className="text-center mb-6"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        >
          <motion.div
            className="text-7xl mb-4 inline-block"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {themeConfig.icon}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className={`text-3xl font-bold mb-1 ${themeConfig.accent}`}>
              {themeConfig.title}
            </h1>
            <p className="text-white/70 text-sm">{themeConfig.subtitle}</p>
          </motion.div>
        </motion.div>

        {/* Player badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className={`flex items-center justify-between px-4 py-3 rounded-xl border mb-6 ${themeConfig.badge}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white
              ${theme === 'museum' ? 'bg-amber-600' : theme === 'nature' ? 'bg-green-600' : 'bg-[#00ff88]/20 border border-[#00ff88]/50'}`}>
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="font-semibold text-sm text-white">{displayName}</p>
              {telegramUser?.username && (
                <p className="text-xs opacity-70">@{telegramUser.username}</p>
              )}
            </div>
          </div>
          <span className="text-xs font-medium">{themeConfig.badgeText}</span>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-2 mb-8"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.45 + i * 0.08 }}
              className="flex items-center justify-between px-4 py-2.5 bg-white/5 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.icon}</span>
                <span className="text-white/60 text-xs">{s.label}</span>
              </div>
              <span className="text-white/90 text-xs font-medium">{s.value}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Play again button */}
        <motion.button
          onClick={onPlayAgain}
          className={`w-full py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r ${themeConfig.btn} transition-all shadow-lg`}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Play Again
        </motion.button>

        <motion.p
          className="text-center text-white/30 text-xs mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Memorabilia · Built on Starknet
        </motion.p>
      </div>
    </div>
  );
}
