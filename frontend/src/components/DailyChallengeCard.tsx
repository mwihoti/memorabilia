import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { ERA_LEVEL_CONFIGS, Difficulty } from '../types';
import { loadDailyChallenge, getDailyChallengeConfig, loadWeeklyChallenge, getWeeklyChallengeConfig } from '../store/dailyChallenge';

interface DailyChallengeCardProps {
  onPlay: () => void;
  onPlayWeekly: () => void;
}

function getTimeUntilMidnight(): string {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const diff = Math.floor((next.getTime() - now.getTime()) / 1000);
  const h    = Math.floor(diff / 3600);
  const m    = Math.floor((diff % 3600) / 60);
  const s    = diff % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ERA_INFO: Record<Difficulty, { icon: string; label: string }> = {
  [Difficulty.Easy]:   { icon: '🏺', label: 'Ancient Era'    },
  [Difficulty.Medium]: { icon: '⚔️', label: 'Medieval Times' },
  [Difficulty.Hard]:   { icon: '🚀', label: 'Modern Era'     },
  [Difficulty.Expert]: { icon: '🛸', label: 'Future Nexus'   },
  [Difficulty.Master]: { icon: '🐲', label: 'Mythic Vault'   },
};

export default function DailyChallengeCard({ onPlay, onPlayWeekly }: DailyChallengeCardProps) {
  const { theme } = useGameStore();
  const [countdown, setCountdown] = useState(getTimeUntilMidnight());
  const [challenge] = useState(() => loadDailyChallenge());
  const [config]    = useState(() => getDailyChallengeConfig());
  const [weeklyChallenge] = useState(() => loadWeeklyChallenge());
  const [weeklyConfig] = useState(() => getWeeklyChallengeConfig());

  useEffect(() => {
    const id = setInterval(() => setCountdown(getTimeUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const themeAccent = {
    museum: { border: 'border-amber-500/30', header: 'from-amber-500/20 to-amber-700/10', btn: 'from-amber-500 to-amber-700 hover:from-amber-400', text: 'text-amber-400', badge: 'bg-amber-500 text-amber-900' },
    nature: { border: 'border-green-500/30',  header: 'from-green-500/20 to-green-700/10',  btn: 'from-green-500 to-green-700 hover:from-green-400',  text: 'text-green-400',  badge: 'bg-green-500 text-green-900' },
    urban:  { border: 'border-[#00ff88]/30',  header: 'from-[#00ff88]/20 to-[#00e5ff]/10', btn: 'from-[#00ff88] to-[#00e5ff] hover:from-[#00e5ff]',  text: 'text-[#00ff88]', badge: 'bg-[#00ff88] text-zinc-900' },
  }[theme];

  const eraInfo    = ERA_INFO[config.difficulty];
  const levelLabel = ERA_LEVEL_CONFIGS[config.difficulty][config.level - 1]?.label ?? `Level ${config.level}`;
  const todayStr   = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const completed  = challenge.completed;
  const weeklyEraInfo = ERA_INFO[weeklyConfig.difficulty];
  const weeklyLevelLabel = ERA_LEVEL_CONFIGS[weeklyConfig.difficulty][weeklyConfig.level - 1]?.label ?? `Level ${weeklyConfig.level}`;

  return (
    <div className={`rounded-2xl border-2 ${themeAccent.border} overflow-hidden shadow-lg mb-4`}>
      {/* Header band */}
      <div className={`bg-gradient-to-r ${themeAccent.header} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">📅</span>
          <div>
            <p className={`text-xs font-extrabold uppercase tracking-widest ${themeAccent.text}`}>
              Daily Challenge
            </p>
            <p className="text-white font-bold text-sm leading-tight">{todayStr}</p>
          </div>
        </div>

        {/* Bonus badge */}
        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${themeAccent.badge}`}>
          +500 pts
        </span>
      </div>

      {/* Body */}
      <div className="bg-[#1e293b] px-4 py-3 space-y-3">
        {/* Era + level */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl border border-white/10">
            {eraInfo.icon}
          </div>
          <div>
            <p className="font-bold text-white text-sm">{eraInfo.label}</p>
            <p className="text-xs text-white/50">{eraInfo.label} · {levelLabel}</p>
          </div>
        </div>

        {/* Sub-note */}
        <p className="text-[11px] text-white/40">Same puzzle for all players today</p>

        {/* Completed state */}
        {completed ? (
          <div className="flex items-center gap-3 py-2 px-3 bg-green-500/10 border border-green-500/25 rounded-xl">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-bold text-green-400">COMPLETED</p>
              {challenge.score !== undefined && (
                <p className="text-xs text-white/50">Score: {challenge.score.toLocaleString()} pts</p>
              )}
            </div>
          </div>
        ) : (
          <motion.button
            onClick={onPlay}
            className={`w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r ${themeAccent.btn} text-white shadow-md transition-all`}
            whileTap={{ scale: 0.97 }}
            animate={{ boxShadow: ['0 0 0px rgba(0,0,0,0)', '0 0 14px rgba(251,191,36,0.35)', '0 0 0px rgba(0,0,0,0)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Play Daily Seed
          </motion.button>
        )}

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Weekly Ladder</p>
              <p className="text-sm font-bold text-white">{weeklyEraInfo.label} · {weeklyLevelLabel}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">{weeklyConfig.weekKey}</span>
          </div>
          <p className="text-[11px] text-white/40">One fixed seed all week. Share the result and challenge friends.</p>
          {weeklyChallenge.completed ? (
            <div className="flex items-center gap-2 text-xs text-green-300">
              <span>🏁</span>
              <span>Best this week: {weeklyChallenge.score?.toLocaleString() ?? 0} pts</span>
            </div>
          ) : (
            <motion.button
              onClick={onPlayWeekly}
              className="w-full py-2.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white transition-all"
              whileTap={{ scale: 0.97 }}
            >
              Play Weekly Ladder
            </motion.button>
          )}
        </div>

        {/* Countdown */}
        <p className="text-[10px] text-white/30 text-center">
          Resets in {countdown}
        </p>
      </div>
    </div>
  );
}
