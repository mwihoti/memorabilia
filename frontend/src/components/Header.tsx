import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import WalletButton from './WalletButton';
import { isSoundEnabled, toggleSound } from '../utils/sounds';

interface HeaderProps {
  onShowLeaderboard: () => void;
  onBackToDifficulty: () => void;
  onShowDashboard: () => void;
  onLeave: () => void;
  currentScreen: string;
}

export default function Header({ onShowLeaderboard, onBackToDifficulty, onShowDashboard, onLeave, currentScreen }: HeaderProps) {
  const { telegramUser, playerName, theme, streak } = useGameStore();
  const displayName = playerName || telegramUser?.first_name || null;
  const avatarLetter = displayName?.[0]?.toUpperCase() ?? '?';
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setSoundEnabled(isSoundEnabled());
  }, []);

  const themeStyles = {
    museum: {
      header: 'bg-[#1e293b]/90 border-amber-600/30',
      title: 'from-amber-400 to-amber-700',
      subtitle: 'text-amber-200/60',
      avatar: 'from-amber-500 to-amber-700',
      btn: 'bg-amber-500 hover:bg-amber-400 text-slate-900',
      btnSecondary: 'bg-amber-700/40 hover:bg-amber-700/60 text-amber-100',
      icon: '🏛️',
      name: 'Time-Travel Museum',
      streak: 'text-orange-400',
    },
    nature: {
      header: 'bg-[#14532d]/90 border-green-400/30',
      title: 'from-green-400 to-green-600',
      subtitle: 'text-green-200/60',
      avatar: 'from-green-500 to-green-700',
      btn: 'bg-green-500 hover:bg-green-400 text-slate-900',
      btnSecondary: 'bg-green-700/40 hover:bg-green-700/60 text-green-100',
      icon: '🌿',
      name: 'Nature Trails',
      streak: 'text-orange-400',
    },
    urban: {
      header: 'bg-[#18181b]/90 border-[#00ff88]/20',
      title: 'from-[#00ff88] to-[#00e5ff]',
      subtitle: 'text-[#00ff88]/50',
      avatar: 'from-[#00ff88]/30 to-[#00e5ff]/30',
      btn: 'bg-[#00ff88] hover:bg-[#00e5ff] text-black',
      btnSecondary: 'bg-white/5 hover:bg-white/10 text-[#00ff88] border border-[#00ff88]/30',
      icon: '🎨',
      name: 'Urban Gallery',
      streak: 'text-orange-400',
    },
  }[theme];

  return (
    <header className={`${themeStyles.header} backdrop-blur-lg border-b shadow-lg`}>
      <div className="container mx-auto px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between gap-2">

          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <span className="text-2xl">{themeStyles.icon}</span>
            <div className="hidden sm:block min-w-0">
              <h1 className={`text-base font-bold bg-gradient-to-r ${themeStyles.title} bg-clip-text text-transparent leading-tight`}>
                {themeStyles.name}
              </h1>
              <p className={`text-[10px] ${themeStyles.subtitle} leading-tight`}>
                Memorabilia · Starknet
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            <WalletButton />

            {/* Streak indicator */}
            {streak.currentStreak > 0 && (
              <div
                className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-bold ${themeStyles.streak} bg-orange-500/10 border border-orange-500/20`}
                title={`${streak.currentStreak}-day streak`}
              >
                <span>🔥</span>
                <span>{streak.currentStreak}</span>
              </div>
            )}

            {currentScreen === 'game' && (
              <button
                onClick={() => setSoundEnabled(toggleSound())}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${themeStyles.btnSecondary}`}
                title={soundEnabled ? 'Mute game sounds' : 'Enable game sounds'}
              >
                <span className="sm:hidden">{soundEnabled ? '🔊' : '🔇'}</span>
                <span className="hidden sm:inline">{soundEnabled ? '🔊 Sound' : '🔇 Muted'}</span>
              </button>
            )}

            {currentScreen === 'game' && (
              <button
                onClick={onBackToDifficulty}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${themeStyles.btnSecondary}`}
                title="Back to menu"
              >
                <span className="sm:hidden">←</span>
                <span className="hidden sm:inline">← Menu</span>
              </button>
            )}

            {currentScreen !== 'leaderboard' && (
              <button
                onClick={onShowLeaderboard}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${themeStyles.btn}`}
                title="Leaderboard"
              >
                <span>🏆</span>
                <span className="hidden sm:inline">Hall of Fame</span>
              </button>
            )}

            {currentScreen !== 'dashboard' && (
              <button
                onClick={onShowDashboard}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${themeStyles.btnSecondary}`}
                title="Dashboard"
              >
                <span>📊</span>
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            )}

            <button
              onClick={onLeave}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-white/40 hover:text-white/70"
              title="Leave game"
            >
              <span>✕</span>
            </button>

            {/* Avatar */}
            {displayName && (
              <div className="flex items-center gap-2 ml-1">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br ${themeStyles.avatar} rounded-full flex items-center justify-center text-xs font-bold text-white border border-white/20`}>
                  {avatarLetter}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-medium text-white/90 leading-tight">{displayName}</p>
                  {telegramUser?.username && (
                    <p className="text-[10px] text-white/40">@{telegramUser.username}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
