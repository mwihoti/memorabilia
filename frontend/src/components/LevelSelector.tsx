import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import {
  Difficulty,
  ERA_LEVEL_CONFIGS,
  LevelProgress,
  DIFFICULTY_ORDER,
  getDifficultyMeta,
  getMaxLevelForEra,
  isEraUnlocked,
  isLevelUnlocked,
  TimeMedal,
} from '../types';
import {
  loadDailyChallenge,
  getDailyChallengeConfig,
  isDailyChallengeCompleted,
  getWeeklyChallengeConfig,
  isWeeklyChallengeCompleted,
} from '../store/dailyChallenge';
import { getEraSkin } from '../theme/cardSkins';
import { fetchLeaderboard, LeaderboardRow } from '../lib/api';
import { hapticImpact } from '../telegram/telegram';
import MedalBadge from './MedalBadge';

interface LevelSelectorProps {
  onStart: (era: Difficulty, level: number, isDailyChallenge?: boolean) => void;
  onStartWeekly: () => void;
  onCreateChallenge: (era: Difficulty, level: number) => void;
}

export default function LevelSelector({
  onStart,
  onStartWeekly,
  onCreateChallenge,
}: LevelSelectorProps) {
  const { levelProgress } = useGameStore();
  const [openEra, setOpenEra] = useState<Difficulty | null>(null);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);

  const daily = getDailyChallengeConfig();
  const dailyDone = isDailyChallengeCompleted();
  const dailyState = loadDailyChallenge();
  const weekly = getWeeklyChallengeConfig();
  const weeklyDone = isWeeklyChallengeCompleted();

  useEffect(() => {
    let alive = true;
    fetchLeaderboard(3)
      .then((r) => alive && setBoard(r.entries ?? []))
      .catch(() => {
        /* leaderboard is decorative here — a failure must not block play */
      });
    return () => {
      alive = false;
    };
  }, []);

  const resetIn = useCountdownToMidnight();

  return (
    <div className="mu-rise">
      {/* ── Heading ───────────────────────────────────────────────────────── */}
      <header className="mb-5 sm:mb-7">
        <h1
          className="font-display text-4xl leading-none sm:text-5xl lg:text-6xl"
          style={{ color: 'var(--mu-ivory)' }}
        >
          Choose Your Level
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--mu-muted)' }}>
          Select an era and level to begin
        </p>
      </header>

      {/* ── Two columns on desktop, stacked on phones ─────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        {/* Left — challenges */}
        <div className="flex flex-col gap-4">
          <ChallengeCard
            eyebrow="Daily Challenge"
            eyebrowColor="var(--mu-gold)"
            badge={dailyDone ? 'Completed' : '+500 pts'}
            dayNumber={new Date().getDate()}
            icon={getDifficultyMeta(daily.difficulty as Difficulty).icon}
            title={getDifficultyMeta(daily.difficulty as Difficulty).label}
            subtitle={`${getDifficultyMeta(daily.difficulty as Difficulty).label} · Level ${daily.level}`}
            note="Same puzzle for all players today"
            cta={dailyDone ? `Best ${(dailyState.score ?? 0).toLocaleString()} — replay` : 'Play Daily Seed →'}
            primary
            onPlay={() => {
              hapticImpact('medium');
              onStart(daily.difficulty as Difficulty, daily.level, true);
            }}
          />

          <ChallengeCard
            eyebrow="Weekly Ladder"
            eyebrowColor="var(--mu-info)"
            badge={weekly.weekKey}
            title={`${getDifficultyMeta(weekly.difficulty as Difficulty).label} · Level ${weekly.level}`}
            note="One fixed seed all week. Share the result and challenge friends."
            cta={weeklyDone ? 'Replay Weekly Ladder →' : 'Play Weekly Ladder →'}
            accent="var(--mu-info)"
            onPlay={() => {
              hapticImpact('medium');
              onStartWeekly();
            }}
            onShare={() => onCreateChallenge(weekly.difficulty as Difficulty, weekly.level)}
          />

          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--mu-faint)' }}>
            <span>🕐</span> Resets in {resetIn}
          </p>
        </div>

        {/* Right — eras */}
        <div className="flex flex-col gap-3">
          {DIFFICULTY_ORDER.map((era) => (
            <EraCard
              key={era}
              era={era}
              levelProgress={levelProgress}
              expanded={openEra === era}
              onToggle={() => setOpenEra(openEra === era ? null : era)}
              onStart={onStart}
              onCreateChallenge={onCreateChallenge}
            />
          ))}
        </div>
      </div>

      {/* ── Leaderboard strip ─────────────────────────────────────────────── */}
      {board.length > 0 && (
        <div className="mu-panel mt-4 flex flex-col gap-3 p-3 sm:mt-5 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
          <div className="flex items-center gap-2.5 sm:w-52 sm:shrink-0">
            <span className="text-xl">🏅</span>
            <div className="leading-tight">
              <div className="text-sm font-bold" style={{ color: 'var(--mu-text)' }}>
                Weekly Leaderboard
              </div>
              <div className="text-[0.68rem]" style={{ color: 'var(--mu-faint)' }}>
                Top explorers this week
              </div>
            </div>
          </div>

          <div className="mu-noscroll flex flex-1 gap-4 overflow-x-auto">
            {board.slice(0, 3).map((row, i) => (
              <div key={row.telegram_id ?? i} className="flex min-w-[8.5rem] items-center gap-2">
                <span className="text-lg">{['🥇', '🥈', '🥉'][i]}</span>
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-xs font-semibold" style={{ color: 'var(--mu-text)' }}>
                    {row.username ? `@${row.username}` : row.first_name || 'Curator'}
                  </div>
                  <div className="text-[0.68rem]" style={{ color: 'var(--mu-gold)' }}>
                    {(row.best_score ?? 0).toLocaleString()} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Challenge card ──────────────────────────────────────────────────────── */

function ChallengeCard({
  eyebrow,
  eyebrowColor,
  badge,
  dayNumber,
  icon,
  title,
  subtitle,
  note,
  cta,
  primary,
  accent,
  onPlay,
  onShare,
}: {
  eyebrow: string;
  eyebrowColor: string;
  badge?: string;
  dayNumber?: number;
  icon?: string;
  title: string;
  subtitle?: string;
  note: string;
  cta: string;
  primary?: boolean;
  accent?: string;
  onPlay: () => void;
  onShare?: () => void;
}) {
  return (
    <section className={primary ? 'mu-panel-gold p-3.5 sm:p-4' : 'mu-panel p-3.5 sm:p-4'}>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <span
          className="text-[0.62rem] font-bold uppercase tracking-[0.18em]"
          style={{ color: eyebrowColor }}
        >
          {eyebrow}
        </span>
        {badge && (
          <span className={primary ? 'mu-chip mu-chip-gold' : 'mu-chip'}>{badge}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {dayNumber !== undefined && (
          <div
            className="font-display grid h-14 w-14 shrink-0 place-items-center rounded-xl text-2xl font-bold"
            style={{
              color: 'var(--mu-ivory)',
              background: 'linear-gradient(160deg, #1a2440, #0c1326)',
              border: '1px solid var(--mu-line)',
            }}
          >
            {dayNumber}
          </div>
        )}
        {icon && (
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--mu-line-soft)' }}
          >
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold sm:text-lg" style={{ color: 'var(--mu-ivory)' }}>
            {title}
          </h3>
          {subtitle && (
            <p className="truncate text-xs" style={{ color: 'var(--mu-muted)' }}>
              {subtitle}
            </p>
          )}
          <p className="mt-0.5 text-xs" style={{ color: 'var(--mu-faint)' }}>
            {note}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onPlay}
          className={`${primary ? 'mu-btn-gold' : 'mu-btn-ghost'} flex-1 px-4 py-2.5 text-sm`}
          style={!primary && accent ? { borderColor: `${accent}55`, color: accent } : undefined}
        >
          {cta}
        </button>
        {onShare && (
          <button onClick={onShare} className="mu-btn-ghost px-3 py-2.5 text-sm" aria-label="Challenge a friend">
            🔗
          </button>
        )}
      </div>
    </section>
  );
}

/* ── Era card ────────────────────────────────────────────────────────────── */

function EraCard({
  era,
  levelProgress,
  expanded,
  onToggle,
  onStart,
  onCreateChallenge,
}: {
  era: Difficulty;
  levelProgress: LevelProgress[];
  expanded: boolean;
  onToggle: () => void;
  onStart: (era: Difficulty, level: number) => void;
  onCreateChallenge: (era: Difficulty, level: number) => void;
}) {
  const meta = getDifficultyMeta(era);
  const skin = getEraSkin(era);
  const unlocked = isEraUnlocked(era, levelProgress);
  const total = ERA_LEVEL_CONFIGS[era].length;
  const completed = levelProgress.filter((lp) => lp.era === era && lp.completed).length;
  const pct = total ? (completed / total) * 100 : 0;

  const index = DIFFICULTY_ORDER.indexOf(era);
  const prevEra = index > 0 ? DIFFICULTY_ORDER[index - 1] : null;
  const lockNote = prevEra
    ? `Complete ${getDifficultyMeta(prevEra).label} Level ${getMaxLevelForEra(prevEra)} to unlock.`
    : '';

  const blurb: Record<number, string> = {
    1: 'Step into the dawn of civilization and uncover timeless artifacts.',
    2: 'Castles, crusades and the relics of a darker age.',
    3: 'Machines, moonshots and the memory of a century in motion.',
    4: 'Beyond the horizon — artifacts that have not been made yet.',
    5: 'The sealed vault. Only the finest curators get this far.',
  };

  return (
    <section
      className={unlocked ? 'mu-panel overflow-hidden' : 'mu-panel overflow-hidden opacity-60'}
      style={unlocked ? { borderColor: `${skin.accent}3a` } : undefined}
    >
      <button
        onClick={() => unlocked && onToggle()}
        disabled={!unlocked}
        className="flex w-full items-start gap-3 p-3.5 text-left sm:p-4"
        aria-expanded={expanded}
      >
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
          style={{
            background: unlocked
              ? `linear-gradient(150deg, ${skin.backFrom}, ${skin.backTo})`
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${unlocked ? `${skin.accent}44` : 'var(--mu-line-soft)'}`,
          }}
        >
          {unlocked ? meta.icon : '🔒'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-base font-bold sm:text-lg" style={{ color: 'var(--mu-ivory)' }}>
              {meta.label}
            </h3>
            {unlocked ? (
              <span className="shrink-0 text-xs" style={{ color: 'var(--mu-muted)' }}>
                {completed}/{total} complete
              </span>
            ) : (
              <span className="shrink-0 text-base">🔒</span>
            )}
          </div>

          {unlocked && (
            <div className="mu-track mt-2 h-1.5">
              <div
                className="mu-fill"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${skin.matchedTo}, ${skin.matchedFrom})`,
                }}
              />
            </div>
          )}

          <p className="mt-2 text-xs" style={{ color: 'var(--mu-faint)' }}>
            {unlocked ? blurb[era] : lockNote}
          </p>
        </div>
      </button>

      {/* Level strip */}
      <AnimatePresence initial={false}>
        {expanded && unlocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t px-3.5 pb-3.5 pt-3 sm:px-4" style={{ borderColor: 'var(--mu-line-soft)' }}>
              <LevelGrid
                era={era}
                levelProgress={levelProgress}
                accent={skin.accent}
                onStart={onStart}
                onCreateChallenge={onCreateChallenge}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── Level grid ──────────────────────────────────────────────────────────── */

const PAGE = 25;

function LevelGrid({
  era,
  levelProgress,
  accent,
  onStart,
  onCreateChallenge,
}: {
  era: Difficulty;
  levelProgress: LevelProgress[];
  accent: string;
  onStart: (era: Difficulty, level: number) => void;
  onCreateChallenge: (era: Difficulty, level: number) => void;
}) {
  const max = getMaxLevelForEra(era);

  // Open on the page holding the furthest unlocked level, not always page 1.
  const furthest = useMemo(() => {
    const done = levelProgress.filter((lp) => lp.era === era && lp.completed);
    return done.length ? Math.min(max, Math.max(...done.map((d) => d.level)) + 1) : 1;
  }, [era, levelProgress, max]);

  const [page, setPage] = useState(Math.floor((furthest - 1) / PAGE));
  const pages = Math.ceil(max / PAGE);
  const start = page * PAGE + 1;
  const end = Math.min(max, start + PAGE - 1);

  return (
    <>
      {pages > 1 && (
        <div className="mu-noscroll mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className="shrink-0 rounded-lg px-2.5 py-1 text-[0.68rem] font-semibold transition-colors"
              style={
                page === i
                  ? { background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }
                  : { color: 'var(--mu-faint)', border: '1px solid var(--mu-line-soft)' }
              }
            >
              {i * PAGE + 1}–{Math.min(max, (i + 1) * PAGE)}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
        {Array.from({ length: end - start + 1 }, (_, i) => {
          const level = start + i;
          const unlocked = isLevelUnlocked(era, level, levelProgress);
          const prog = levelProgress.find((lp) => lp.era === era && lp.level === level);
          const done = !!prog?.completed;

          return (
            <button
              key={level}
              disabled={!unlocked}
              onClick={() => {
                hapticImpact('light');
                onStart(era, level);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (unlocked) onCreateChallenge(era, level);
              }}
              title={unlocked ? `Level ${level}` : 'Locked'}
              className="relative aspect-square rounded-lg text-xs font-bold transition-transform active:scale-95 disabled:cursor-not-allowed"
              style={{
                color: done ? accent : unlocked ? 'var(--mu-text)' : 'var(--mu-faint)',
                background: done ? `${accent}1c` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${done ? `${accent}55` : 'var(--mu-line-soft)'}`,
                opacity: unlocked ? 1 : 0.35,
              }}
            >
              {unlocked ? level : '🔒'}
              {prog?.bestMedal && prog.bestMedal !== 'none' && (
                <span className="absolute -right-0.5 -top-0.5">
                  <MedalBadge medal={prog.bestMedal as TimeMedal} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-[0.68rem]" style={{ color: 'var(--mu-faint)' }}>
        Tap to play · long-press or right-click a level to challenge a friend
      </p>
    </>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** Time left until the daily seed rolls over at local midnight. */
function useCountdownToMidnight(): string {
  const [label, setLabel] = useState('--:--:--');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
      const pad = (n: number) => String(n).padStart(2, '0');
      setLabel(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return label;
}
