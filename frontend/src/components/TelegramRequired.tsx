import { motion } from 'framer-motion';

export default function TelegramRequired() {
  const handleOpenInTelegram = () => {
    window.location.href = 'https://t.me/memorabilia_game_bot/memorabilia_game';
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://t.me/memorabilia_game_bot/memorabilia_game').then(() => {
      alert('Link copied! Open it in Telegram.');
    });
  };

  const howToPlay = [
    { icon: '👆', text: 'Tap any card to flip it and reveal a hidden artifact' },
    { icon: '🧠', text: 'Remember its position — then find its matching pair' },
    { icon: '✅', text: 'Match all pairs before the clock runs out to win' },
    { icon: '⚡', text: 'Fewer moves = higher score. Can you get 3 stars?' },
  ];

  const features = [
    { icon: '🏛️', label: 'Museum Theme' },
    { icon: '🌿', label: 'Nature Theme' },
    { icon: '🎨', label: 'Urban/Graffiti' },
    { icon: '🏆', label: 'Leaderboard' },
    { icon: '⛓️', label: 'On-chain Starknet' },
    { icon: '📊', label: 'Score History' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">

        {/* Hero */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="text-7xl mb-3 inline-block"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            🏛️
          </motion.div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Memorabilia</h1>
          <p className="text-indigo-300 mt-1 text-sm font-medium tracking-wide uppercase">
            On-chain Memory Card Game · Starknet
          </p>
        </motion.div>

        {/* Main card */}
        <motion.div
          className="bg-white/8 backdrop-blur-xl rounded-3xl border border-white/15 shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          {/* Telegram notice */}
          <div className="bg-amber-500/15 border-b border-amber-500/25 px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="text-amber-200 font-semibold text-sm">Open inside Telegram</p>
              <p className="text-amber-100/60 text-xs">This Mini App requires Telegram authentication</p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* How to play */}
            <div>
              <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
                <span>🎮</span> How to Play
              </h2>
              <ul className="space-y-2">
                {howToPlay.map((step, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-3 bg-white/5 rounded-xl px-4 py-2.5"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                  >
                    <span className="text-base flex-shrink-0 mt-px">{step.icon}</span>
                    <span className="text-white/80 text-xs leading-relaxed">{step.text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Difficulty info */}
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">Difficulty Levels</h3>
              <div className="space-y-1.5 text-xs text-white/70">
                <div className="flex justify-between"><span>🏺 Ancient Era</span><span className="text-white/50">6 pairs · 12 cards</span></div>
                <div className="flex justify-between"><span>⚔️ Medieval Times</span><span className="text-white/50">10 pairs · 20 cards</span></div>
                <div className="flex justify-between"><span>🚀 Modern Era</span><span className="text-white/50">15 pairs · 30 cards</span></div>
                <div className="flex justify-between"><span>🛸 Future Nexus</span><span className="text-white/50">16 pairs · 32 cards</span></div>
                <div className="flex justify-between"><span>🐲 Mythic Vault</span><span className="text-white/50">16 pairs · 32 cards</span></div>
              </div>
            </div>

            {/* Features grid */}
            <div>
              <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">Features</h3>
              <div className="grid grid-cols-3 gap-2">
                {features.map((f, i) => (
                  <motion.div
                    key={i}
                    className="bg-white/5 rounded-xl py-2.5 flex flex-col items-center gap-1"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                  >
                    <span className="text-lg">{f.icon}</span>
                    <span className="text-white/60 text-[10px] text-center leading-tight">{f.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="px-5 pb-5 space-y-3">
            <motion.button
              onClick={handleOpenInTelegram}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              📱 Open in Telegram
            </motion.button>

            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 text-indigo-300 hover:text-white text-xs font-medium transition-colors"
            >
              📋 Copy Telegram link
            </button>
          </div>
        </motion.div>

        <p className="text-center text-white/20 text-xs mt-5">
          Memorabilia · Powered by Dojo on Starknet
        </p>
      </div>
    </div>
  );
}
