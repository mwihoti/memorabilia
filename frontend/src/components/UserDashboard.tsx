import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import {
  fetchLeaderboard,
  fetchPlayerStats,
  LeaderboardRow,
  PlayerStatsResponse,
} from '../lib/api';
import { DIFFICULTY_ORDER, ERA_LEVEL_CONFIGS, getDifficultyMeta } from '../types';
import { getPlayerSettings, PreviewLength, savePlayerSettings } from '../store/settings';
import { getUnlockedAchievements } from '../store/achievementStore';
import { getEraSkin } from '../theme/cardSkins';
import { soundManager } from '../utils/sounds';

export default function UserDashboard() {
  const { telegramUser, playerName, levelProgress, streak, relicRewards } = useGameStore();

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

      const [stats, board] = await Promise.allSettled([
        fetchPlayerStats(telegramUser.id),
        fetchLeaderboard(8),
      ]);
      if (cancelled) return;

      if (stats.status === 'fulfilled') setPlayerStats(stats.value);
      if (board.status === 'fulfilled') setTopPlayers(board.value.entries);

      if (stats.status === 'rejected' && board.status === 'rejected') {
        setError('Could not load live dashboard data right now.');
      } else if (stats.status === 'rejected') {
        setError('Profile stats are temporarily unavailable.');
      } else if (board.status === 'rejected') {
        setError('Leaderboard snapshot is temporarily unavailable.');
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [telegramUser?.id]);

  const displayName = playerName || telegramUser?.first_name || 'Curator';
  const unlocked = getUnlockedAchievements();

  const update = (patch: Partial<typeof settings>) => {
    const next = savePlayerSettings(patch);
    setSettings(next);
    if (patch.soundEnabled !== undefined) soundManager.setEnabled(patch.soundEnabled);
  };

  const tiles = [
    {
      icon: '🌐',
      label: 'Global Rank',
      value: playerStats?.rank ? `#${playerStats.rank}` : '—',
      note: 'Best score standing',
    },
    {
      icon: '🏅',
      label: 'Best Score',
      value: (playerStats?.best_score ?? 0).toLocaleString(),
      note: 'Highest verified score',
    },
    {
      icon: '📈',
      label: 'Average Score',
      value: (playerStats?.average_score ?? 0).toLocaleString(),
      note: 'Across recorded runs',
    },
    {
      icon: '▶️',
      label: 'Total Runs',
      value: (playerStats?.total_games ?? 0).toLocaleString(),
      note: 'Completed games',
    },
  ];

  return (
    <div className="mu-rise">
      <header className="mb-4 sm:mb-6">
        <span className="mu-eyebrow">Curator File</span>
        <h1
          className="font-display mt-1 text-3xl leading-none sm:text-4xl lg:text-5xl"
          style={{ color: 'var(--mu-ivory)' }}
        >
          {displayName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {telegramUser?.username && <span className="mu-chip">@{telegramUser.username}</span>}
          <span className="mu-chip">🔥 {streak.currentStreak}-day streak</span>
          <span className="mu-chip">🏺 {relicRewards.length} relics</span>
        </div>
      </header>

      {error && (
        <div
          className="mb-4 rounded-xl px-4 py-2.5 text-sm"
          style={{
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            color: 'var(--mu-bad)',
          }}
          role="status"
        >
          {error}
        </div>
      )}

      {/* ── Parchment stat tiles ──────────────────────────────────────────── */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="mu-parchment flex items-center gap-3 p-3 sm:p-4"
          >
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg sm:h-11 sm:w-11"
              style={{ background: 'rgba(58,47,28,0.12)', border: '1px solid rgba(58,47,28,0.2)' }}
            >
              {t.icon}
            </span>
            <div className="min-w-0">
              <div
                className="text-[0.66rem] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--mu-parch-muted)' }}
              >
                {t.label}
              </div>
              <div className="font-display truncate text-2xl font-bold leading-tight sm:text-3xl">
                {loading ? '···' : t.value}
              </div>
              <div className="truncate text-[0.62rem]" style={{ color: 'var(--mu-parch-muted)' }}>
                {t.note}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Three modules ─────────────────────────────────────────────────── */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Era completion */}
        <section className="mu-panel p-3.5 sm:p-4">
          <ModuleTitle icon="🏛️" title="Era Completion" />
          <div className="mt-3 flex flex-col gap-3">
            {DIFFICULTY_ORDER.map((era) => {
              const meta = getDifficultyMeta(era);
              const skin = getEraSkin(era);
              const total = ERA_LEVEL_CONFIGS[era].length;
              const done = levelProgress.filter((lp) => lp.era === era && lp.completed).length;
              const pct = total ? Math.round((done / total) * 100) : 0;

              return (
                <div key={era} className="flex items-center gap-2.5">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base"
                    style={{
                      background: `linear-gradient(150deg, ${skin.backFrom}, ${skin.backTo})`,
                      border: `1px solid ${skin.accent}44`,
                    }}
                  >
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className="truncate text-sm font-semibold"
                        style={{ color: 'var(--mu-text)' }}
                      >
                        {meta.label}
                      </span>
                      <span className="shrink-0 text-xs font-bold" style={{ color: skin.accent }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="mu-track mt-1 h-1.5">
                      <div
                        className="mu-fill"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${skin.matchedTo}, ${skin.matchedFrom})`,
                        }}
                      />
                    </div>
                    <div className="mt-0.5 text-[0.62rem]" style={{ color: 'var(--mu-faint)' }}>
                      {done}/{total} levels complete
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Settings + achievements */}
        <section className="flex flex-col gap-3">
          <div className="mu-panel p-3.5 sm:p-4">
            <ModuleTitle icon="⚙️" title="Player Settings" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Toggle
                icon={settings.soundEnabled ? '🔊' : '🔇'}
                label={settings.soundEnabled ? 'Sound On' : 'Sound Off'}
                on={settings.soundEnabled}
                onClick={() => update({ soundEnabled: !settings.soundEnabled })}
              />
              <Toggle
                icon={settings.reducedMotion ? '🐢' : '✳️'}
                label={settings.reducedMotion ? 'Motion Low' : 'Motion Full'}
                on={!settings.reducedMotion}
                onClick={() => update({ reducedMotion: !settings.reducedMotion })}
              />
            </div>

            <div className="mt-3">
              <div className="mb-1.5 text-[0.66rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--mu-faint)' }}>
                Preview length
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['normal', 'long', 'very_long'] as PreviewLength[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => update({ previewLength: p })}
                    className="rounded-lg px-2 py-1.5 text-[0.68rem] font-semibold transition-colors"
                    style={
                      settings.previewLength === p
                        ? {
                            background: 'rgba(232,180,74,0.16)',
                            color: 'var(--mu-gold-bright)',
                            border: '1px solid var(--mu-line-strong)',
                          }
                        : { color: 'var(--mu-faint)', border: '1px solid var(--mu-line-soft)' }
                    }
                  >
                    {p === 'very_long' ? 'Longest' : p === 'long' ? 'Long' : 'Normal'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mu-panel flex-1 p-3.5 sm:p-4">
            <ModuleTitle icon="🏆" title="Achievements" />
            {unlocked.length === 0 ? (
              <p className="mt-3 text-xs" style={{ color: 'var(--mu-faint)' }}>
                None yet — clear a level to earn your first.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-1.5">
                {unlocked.slice(0, 5).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                    style={{ background: 'rgba(255,255,255,0.035)' }}
                  >
                    <span className="text-base">{a.icon}</span>
                    <span className="truncate text-xs font-semibold" style={{ color: 'var(--mu-text)' }}>
                      {a.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Hall of fame */}
        <section className="mu-panel p-3.5 sm:p-4">
          <ModuleTitle icon="🏅" title="Hall of Fame" />
          <div className="mt-3 flex items-center justify-between px-1 pb-1.5 text-[0.62rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--mu-faint)' }}>
            <span>Curator</span>
            <span>Score</span>
          </div>
          {loading ? (
            <p className="text-xs" style={{ color: 'var(--mu-faint)' }}>
              Loading…
            </p>
          ) : topPlayers.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--mu-faint)' }}>
              No verified scores yet. Be the first.
            </p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {topPlayers.slice(0, 6).map((row, i) => {
                const isMe = row.telegram_id === telegramUser?.id;
                return (
                  <li
                    key={row.telegram_id ?? i}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                    style={{
                      background: isMe ? 'rgba(232,180,74,0.12)' : 'rgba(255,255,255,0.035)',
                      border: isMe ? '1px solid var(--mu-line-strong)' : '1px solid transparent',
                    }}
                  >
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.66rem] font-bold"
                      style={{
                        color: i < 3 ? '#2a1e06' : 'var(--mu-muted)',
                        background:
                          i < 3
                            ? 'linear-gradient(160deg, var(--mu-gold-bright), var(--mu-gold-deep))'
                            : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ color: 'var(--mu-text)' }}>
                      {row.username ? `@${row.username}` : row.first_name || 'Curator'}
                    </span>
                    <span className="shrink-0 text-xs font-bold" style={{ color: 'var(--mu-gold)' }}>
                      {(row.best_score ?? 0).toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

function ModuleTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="grid h-7 w-7 place-items-center rounded-lg text-sm"
        style={{ background: 'rgba(232,180,74,0.12)', border: '1px solid var(--mu-line)' }}
      >
        {icon}
      </span>
      <h2 className="text-sm font-bold sm:text-base" style={{ color: 'var(--mu-ivory)' }}>
        {title}
      </h2>
    </div>
  );
}

function Toggle({
  icon,
  label,
  on,
  onClick,
}: {
  icon: string;
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors"
      style={{
        background: on ? 'rgba(232,180,74,0.1)' : 'rgba(255,255,255,0.035)',
        border: `1px solid ${on ? 'var(--mu-line)' : 'var(--mu-line-soft)'}`,
      }}
    >
      <span className="text-base">{icon}</span>
      <span
        className="text-[0.68rem] font-semibold leading-tight"
        style={{ color: on ? 'var(--mu-gold-bright)' : 'var(--mu-muted)' }}
      >
        {label}
      </span>
    </button>
  );
}
