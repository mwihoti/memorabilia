import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { fetchLeaderboard, fetchPlayerStats, LeaderboardRow, PlayerStatsResponse } from '../lib/api';
import { DIFFICULTY_ORDER, ERA_LEVEL_CONFIGS, getDifficultyMeta } from '../types';
import { getPlayerSettings, PreviewLength, savePlayerSettings } from '../store/settings';
import { soundManager } from '../utils/sounds';

function formatCompactTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function UserDashboard() {
  const { telegramUser, playerName, theme, levelProgress, streak, relicRewards, newlyUnlockedAchievements } = useGameStore();
  const [playerStats, setPlayerStats] = useState<PlayerStatsResponse | null>(null);
  const [topPlayers, setTopPlayers] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState(() => getPlayerSettings());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!telegramUser?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [statsResult, leaderboardResult] = await Promise.allSettled([
          fetchPlayerStats(telegramUser.id),
          fetchLeaderboard(8),
        ]);

        if (cancelled) return;

        if (statsResult.status === 'fulfilled') {
          setPlayerStats(statsResult.value);
        }

        if (leaderboardResult.status === 'fulfilled') {
          setTopPlayers(leaderboardResult.value.entries);
        }

        if (statsResult.status === 'rejected' && leaderboardResult.status === 'rejected') {
          setError('Could not load live dashboard data right now.');
        } else if (statsResult.status === 'rejected') {
          setError('Profile stats are temporarily unavailable. Live leaderboard still loaded.');
        } else if (leaderboardResult.status === 'rejected') {
          setError('Leaderboard snapshot is temporarily unavailable. Your profile still loaded.');
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [telegramUser?.id]);

  const progressSummary = useMemo(() => {
    return DIFFICULTY_ORDER.map((era) => {
      const levels = ERA_LEVEL_CONFIGS[era];
      const completed = levelProgress.filter((entry) => entry.era === era && entry.completed).length;
      const bestUnlocked = levelProgress
        .filter((entry) => entry.era === era)
        .reduce((max, entry) => Math.max(max, entry.level), 0);
      return {
        era,
        meta: getDifficultyMeta(era),
        completed,
        total: levels.length,
        bestUnlocked,
        percent: Math.round((completed / levels.length) * 100),
      };
    });
  }, [levelProgress]);

  const totalCompletedLevels = levelProgress.filter((entry) => entry.completed).length;
  const totalLevels = progressSummary.reduce((sum, era) => sum + era.total, 0);
  const displayName = playerName || telegramUser?.first_name || 'Curator';

  const updateSetting = <K extends keyof ReturnType<typeof getPlayerSettings>>(key: K, value: ReturnType<typeof getPlayerSettings>[K]) => {
    const next = savePlayerSettings({ [key]: value });
    setSettings(next);
    if (key === 'soundEnabled') soundManager.setEnabled(Boolean(value));
  };

  const themeAccent = {
    museum: {
      shell: 'from-slate-950 via-slate-900 to-amber-950/60',
      card: 'bg-white/5 border-white/10',
      text: 'text-amber-300',
      soft: 'text-amber-100/65',
      badge: 'bg-amber-500/10 border-amber-400/20 text-amber-200',
      line: 'from-amber-400 to-amber-600',
    },
    nature: {
      shell: 'from-slate-950 via-emerald-950/60 to-slate-900',
      card: 'bg-white/5 border-white/10',
      text: 'text-green-300',
      soft: 'text-green-100/65',
      badge: 'bg-green-500/10 border-green-400/20 text-green-200',
      line: 'from-green-400 to-emerald-600',
    },
    urban: {
      shell: 'from-zinc-950 via-zinc-900 to-cyan-950/50',
      card: 'bg-white/5 border-white/10',
      text: 'text-[#00ff88]',
      soft: 'text-white/60',
      badge: 'bg-[#00ff88]/10 border-[#00ff88]/20 text-[#9cffd1]',
      line: 'from-[#00ff88] to-[#00e5ff]',
    },
  }[theme];

  if (loading) {
    return (
      <div className={`rounded-3xl border ${themeAccent.card} bg-gradient-to-br ${themeAccent.shell} p-8 text-center`}>
        <p className={`text-sm font-semibold uppercase tracking-[0.25em] ${themeAccent.text}`}>Player Dashboard</p>
        <p className="mt-4 text-white/70">Loading your profile…</p>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border ${themeAccent.card} bg-gradient-to-br ${themeAccent.shell} p-4 sm:p-6 space-y-6`}>
      <section className="rounded-3xl border border-white/10 bg-black/20 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.3em] ${themeAccent.text}`}>Player Dashboard</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white">{displayName}</h2>
            <p className={`mt-2 text-sm ${themeAccent.soft}`}>
              {playerStats?.display_name ?? telegramUser?.username ? `Signed in as ${playerStats?.display_name ?? `@${telegramUser?.username}`}` : 'Your live progression, streak, relics, and recent runs.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${themeAccent.badge}`}>
              🔥 {streak.currentStreak}-day streak
            </span>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${themeAccent.badge}`}>
              🏛️ {relicRewards.length} relics
            </span>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${themeAccent.badge}`}>
              ✅ {totalCompletedLevels}/{totalLevels} levels cleared
            </span>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Global Rank', value: playerStats?.rank ? `#${playerStats.rank}` : '—', note: 'Best score standing' },
          { label: 'Best Score', value: playerStats?.best_score?.toLocaleString() ?? '0', note: 'Highest verified score' },
          { label: 'Average Score', value: playerStats?.average_score?.toLocaleString() ?? '0', note: 'Across recorded runs' },
          { label: 'Total Runs', value: playerStats?.total_games?.toLocaleString() ?? '0', note: 'Completed games' },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border ${themeAccent.card} p-4`}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{card.label}</p>
            <p className={`mt-3 text-2xl font-black ${themeAccent.text}`}>{card.value}</p>
            <p className="mt-2 text-xs text-white/50">{card.note}</p>
          </div>
        ))}
      </section>

      <section className={`rounded-3xl border ${themeAccent.card} p-5`}>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${themeAccent.text}`}>Player Settings</p>
        <h3 className="mt-1 text-xl font-bold text-white">Comfort & Accessibility</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <button
            onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
            className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-left"
          >
            <p className="text-sm font-bold text-white">{settings.soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}</p>
            <p className="mt-1 text-xs text-white/45">Toggle in-game sound effects.</p>
          </button>

          <button
            onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
            className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-left"
          >
            <p className="text-sm font-bold text-white">{settings.reducedMotion ? '🪶 Reduced Motion' : '✨ Full Motion'}</p>
            <p className="mt-1 text-xs text-white/45">Shortens intro transitions and animation weight.</p>
          </button>

          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <p className="text-sm font-bold text-white">🧠 Preview Length</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(['normal', 'long', 'very_long'] as PreviewLength[]).map((option) => (
                <button
                  key={option}
                  onClick={() => updateSetting('previewLength', option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    settings.previewLength === option
                      ? `${themeAccent.badge}`
                      : 'border border-white/10 bg-black/10 text-white/65'
                  }`}
                >
                  {option === 'normal' ? 'Normal' : option === 'long' ? 'Longer' : 'Very Long'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className={`rounded-3xl border ${themeAccent.card} p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${themeAccent.text}`}>Progress Map</p>
              <h3 className="mt-1 text-xl font-bold text-white">Era Completion</h3>
            </div>
            <p className="text-sm text-white/50">{totalCompletedLevels}/{totalLevels} levels mastered</p>
          </div>

          <div className="mt-5 space-y-4">
            {progressSummary.map((era) => (
              <div key={era.era} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">{era.meta.icon} {era.meta.label}</p>
                    <p className="text-xs text-white/45">
                      {era.completed}/{era.total} levels complete
                      {era.bestUnlocked > 0 ? ` · highest unlocked ${era.bestUnlocked}` : ' · not started'}
                    </p>
                  </div>
                  <div className={`text-sm font-bold ${themeAccent.text}`}>{era.percent}%</div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${themeAccent.line}`}
                    style={{ width: `${era.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-3xl border ${themeAccent.card} p-5`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${themeAccent.text}`}>Relics & Achievements</p>
            <h3 className="mt-1 text-xl font-bold text-white">Collection</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {relicRewards.length > 0 ? relicRewards.map((relic) => (
                <div key={relic.id} className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white/75">
                  <span className="mr-1.5">{relic.icon}</span>
                  <span className="font-semibold text-white">{relic.name}</span>
                </div>
              )) : (
                <p className="text-sm text-white/45">No relics unlocked yet. Boss clears with strong scores will add them here.</p>
              )}
            </div>
            {newlyUnlockedAchievements.length > 0 && (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Latest Achievements</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {newlyUnlockedAchievements.map((achievement) => (
                    <span key={achievement.id} className="rounded-full bg-black/20 px-2.5 py-1 text-xs text-white/80">
                      {achievement.icon} {achievement.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={`rounded-3xl border ${themeAccent.card} p-5`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${themeAccent.text}`}>Top Players</p>
            <h3 className="mt-1 text-xl font-bold text-white">Live Hall of Fame</h3>
            <div className="mt-4 space-y-3">
              {topPlayers.length > 0 ? topPlayers.slice(0, 5).map((entry) => (
                <div key={entry.telegram_id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5">
                  <div>
                    <p className="font-semibold text-white">#{entry.rank} {entry.display_name}</p>
                    <p className="text-xs text-white/45">{entry.total_games} runs · {entry.total_wins} wins</p>
                  </div>
                  <div className={`text-sm font-bold ${themeAccent.text}`}>{entry.best_score.toLocaleString()}</div>
                </div>
              )) : (
                <p className="text-sm text-white/45">Leaderboard data will appear here after scores are submitted.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={`rounded-3xl border ${themeAccent.card} p-5`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${themeAccent.text}`}>Recent Runs</p>
            <h3 className="mt-1 text-xl font-bold text-white">Your latest sessions</h3>
          </div>
          {playerStats?.last_active && (
            <p className="text-xs text-white/45">Last active {formatCompactTime(playerStats.last_active)}</p>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {playerStats?.recentGames?.length ? playerStats.recentGames.map((game) => {
            const difficulty = getDifficultyMeta(game.difficulty);
            const stars = '⭐'.repeat(game.stars) + '☆'.repeat(Math.max(0, 3 - game.stars));
            return (
              <div key={game.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white">{difficulty.icon} {difficulty.shortLabel}</p>
                  <span className="text-xs text-white/45">{formatCompactTime(game.played_at)}</span>
                </div>
                <p className={`mt-3 text-xl font-black ${themeAccent.text}`}>{game.score.toLocaleString()}</p>
                <p className="mt-1 text-xs text-white/50">{game.moves} moves · {game.time_seconds}s</p>
                <p className="mt-2 text-sm text-white/80">{stars}</p>
              </div>
            );
          }) : (
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/45">
              Finish a few runs and your recent sessions will appear here.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
