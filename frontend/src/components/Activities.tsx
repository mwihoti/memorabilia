import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import {
  fetchActivities,
  fetchGuilds,
  createGuild,
  joinGuild,
  leaveGuild,
  acceptDuel,
  ActivityBoard,
  GuildRow,
  DuelRow,
} from '../lib/api';
import { Difficulty, getDifficultyMeta } from '../types';
import { getEraSkin } from '../theme/cardSkins';
import { hapticImpact } from '../telegram/telegram';

type Tab = 'weekly' | 'season' | 'duels' | 'guilds';

interface ActivitiesProps {
  onPlayBoss: (era: Difficulty, level: number, seed: number) => void;
  onPlayDuel: (duel: DuelRow) => void;
}

/**
 * Everything with a clock on it, in one place: the weekly ladder, the running
 * season, open duels and the guild table.
 */
export default function Activities({ onPlayBoss, onPlayDuel }: ActivitiesProps) {
  const { telegramUser, playerName } = useGameStore();
  const [tab, setTab] = useState<Tab>('weekly');
  const [board, setBoard] = useState<ActivityBoard | null>(null);
  const [guilds, setGuilds] = useState<GuildRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      const next = await fetchActivities(telegramUser?.id);
      setBoard(next);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Could not load activities');
    }
  };

  useEffect(() => {
    reload();
  }, [telegramUser?.id]);

  useEffect(() => {
    if (tab !== 'guilds') return;
    fetchGuilds()
      .then((r) => setGuilds(r.guilds))
      .catch(() => setError('Could not load the guild table'));
  }, [tab]);

  const tabs: Array<{ key: Tab; label: string; icon: string }> = [
    { key: 'weekly', label: 'Weekly', icon: '🏅' },
    { key: 'season', label: 'Season', icon: '🗓️' },
    { key: 'duels', label: 'Duels', icon: '⚔️' },
    { key: 'guilds', label: 'Guilds', icon: '🛡️' },
  ];

  return (
    <div className="mu-rise">
      <header className="mb-4">
        <span className="mu-eyebrow">Open Now</span>
        <h1
          className="font-display mt-1 text-3xl leading-none sm:text-4xl lg:text-5xl"
          style={{ color: 'var(--mu-ivory)' }}
        >
          Activities
        </h1>
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

      {/* ── Boss banner — the thing with the shortest fuse goes on top ────── */}
      {board?.boss && (
        <BossBanner boss={board.boss} onPlay={onPlayBoss} />
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="mu-noscroll mb-4 flex gap-1.5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              hapticImpact('light');
              setTab(t.key);
            }}
            className="shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors"
            style={
              tab === t.key
                ? {
                    background: 'rgba(232,180,74,0.16)',
                    color: 'var(--mu-gold-bright)',
                    border: '1px solid var(--mu-line-strong)',
                  }
                : { color: 'var(--mu-muted)', border: '1px solid var(--mu-line-soft)' }
            }
            aria-current={tab === t.key ? 'page' : undefined}
          >
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'weekly' && <WeeklyTab board={board} />}
          {tab === 'season' && <SeasonTab board={board} />}
          {tab === 'duels' && (
            <DuelsTab
              board={board}
              myId={telegramUser?.id}
              busy={busy}
              onAccept={async (id) => {
                if (!telegramUser) return;
                setBusy(true);
                try {
                  await acceptDuel({
                    telegramUser,
                    duelId: id,
                    displayName: playerName || telegramUser.first_name || 'Curator',
                  });
                  await reload();
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
              onPlay={onPlayDuel}
            />
          )}
          {tab === 'guilds' && (
            <GuildsTab
              board={board}
              guilds={guilds}
              busy={busy}
              onAction={async (fn) => {
                setBusy(true);
                try {
                  await fn();
                  await reload();
                  const r = await fetchGuilds();
                  setGuilds(r.guilds);
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Boss ────────────────────────────────────────────────────────────────── */

function BossBanner({
  boss,
  onPlay,
}: {
  boss: NonNullable<ActivityBoard['boss']>;
  onPlay: (era: Difficulty, level: number, seed: number) => void;
}) {
  const meta = getDifficultyMeta(boss.era as Difficulty);
  const skin = getEraSkin(boss.era as Difficulty);
  const left = useCountdown(boss.closesAt);

  return (
    <section
      className="mu-panel-gold mb-4 p-3.5 sm:p-4"
      style={{ borderColor: `${skin.accent}66` }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="text-[0.62rem] font-bold uppercase tracking-[0.18em]"
          style={{ color: skin.accent }}
        >
          Boss Hunt
        </span>
        <span className="mu-chip mu-chip-gold">Closes in {left}</span>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-2xl"
          style={{
            background: `linear-gradient(150deg, ${skin.backFrom}, ${skin.backTo})`,
            border: `1px solid ${skin.accent}55`,
          }}
        >
          {meta.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold sm:text-lg" style={{ color: 'var(--mu-ivory)' }}>
            {meta.label} · Level {boss.level}
          </h3>
          <p className="text-xs" style={{ color: 'var(--mu-muted)' }}>
            One board, same for everyone. Clear it and the relic is yours.
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--mu-faint)' }}>
            {boss.clears} {boss.clears === 1 ? 'curator has' : 'curators have'} cleared it
          </p>
        </div>
      </div>

      <button
        onClick={() => {
          hapticImpact('medium');
          onPlay(boss.era as Difficulty, boss.level, boss.seed);
        }}
        className="mu-btn-gold mt-3 w-full px-4 py-2.5 text-sm"
      >
        Enter the hunt →
      </button>
    </section>
  );
}

/* ── Weekly ──────────────────────────────────────────────────────────────── */

function WeeklyTab({ board }: { board: ActivityBoard | null }) {
  if (!board) return <Skeleton />;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <section className="mu-panel p-3.5 lg:col-span-2 sm:p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold sm:text-base" style={{ color: 'var(--mu-ivory)' }}>
            Weekly Ladder · {board.weekKey}
          </h2>
          <span className="text-xs" style={{ color: 'var(--mu-faint)' }}>
            resets in {formatDuration(board.resetInMs)}
          </span>
        </div>

        {board.ladder.length === 0 ? (
          <Empty>Nobody has posted a score this week. Be first.</Empty>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {board.ladder.map((row) => (
              <Row
                key={row.telegram_id}
                rank={row.rank}
                name={row.name}
                value={row.best_score.toLocaleString()}
                note={`${row.games} ${row.games === 1 ? 'run' : 'runs'}`}
              />
            ))}
          </ol>
        )}
      </section>

      <section className="mu-panel p-3.5 sm:p-4">
        <h2 className="mb-3 text-sm font-bold sm:text-base" style={{ color: 'var(--mu-ivory)' }}>
          Hall of Champions
        </h2>
        {board.champions.length === 0 ? (
          <Empty>No week has been settled yet.</Empty>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {board.champions.map((c) => (
              <li
                key={c.week_key}
                className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2"
                style={{ background: 'rgba(255,255,255,0.035)' }}
              >
                <span className="truncate text-xs font-semibold" style={{ color: 'var(--mu-text)' }}>
                  👑 {c.name}
                </span>
                <span className="shrink-0 text-[0.68rem]" style={{ color: 'var(--mu-faint)' }}>
                  {c.week_key}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ── Season ──────────────────────────────────────────────────────────────── */

function SeasonTab({ board }: { board: ActivityBoard | null }) {
  if (!board) return <Skeleton />;
  const { season } = board;

  return (
    <section className="mu-panel p-3.5 sm:p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="mu-eyebrow">Season {season.key}</span>
          <h2 className="font-display text-xl" style={{ color: 'var(--mu-ivory)' }}>
            {season.name}
          </h2>
        </div>
        <span className="mu-chip">
          Week {season.week} of 6 · ends {new Date(season.endsAt).toLocaleDateString()}
        </span>
      </div>

      <p className="mb-3 text-xs" style={{ color: 'var(--mu-faint)' }}>
        Season points are flatter than raw score, so a new curator can still climb. Every verified
        run adds to your total.
      </p>

      {season.board.length === 0 ? (
        <Empty>The season is open and nobody has scored yet.</Empty>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {season.board.map((row) => (
            <Row
              key={row.telegram_id}
              rank={row.rank}
              name={row.name}
              value={`${row.points.toLocaleString()} pts`}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

/* ── Duels ───────────────────────────────────────────────────────────────── */

function DuelsTab({
  board,
  myId,
  busy,
  onAccept,
  onPlay,
}: {
  board: ActivityBoard | null;
  myId?: number;
  busy: boolean;
  onAccept: (id: string) => void;
  onPlay: (duel: DuelRow) => void;
}) {
  const [code, setCode] = useState('');
  if (!board) return <Skeleton />;

  const open = board.duels.filter((d) => d.outcome === 'pending');
  const done = board.duels.filter((d) => d.outcome !== 'pending');

  return (
    <div className="flex flex-col gap-3">
      <section className="mu-panel p-3.5 sm:p-4">
        <h2 className="mb-1 text-sm font-bold sm:text-base" style={{ color: 'var(--mu-ivory)' }}>
          Join a duel
        </h2>
        <p className="mb-3 text-xs" style={{ color: 'var(--mu-faint)' }}>
          Same board, 24 hours to beat their score. Paste the code a friend sent you.
        </p>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
            aria-label="Duel code"
            className="mu-field px-3 py-2.5 font-mono text-sm tracking-widest"
          />
          <button
            onClick={() => code.trim() && onAccept(code.trim())}
            disabled={busy || code.trim().length < 4}
            className="mu-btn-gold shrink-0 px-4 py-2.5 text-sm"
          >
            Join
          </button>
        </div>
      </section>

      {open.length > 0 && (
        <section className="mu-panel p-3.5 sm:p-4">
          <h2 className="mb-3 text-sm font-bold sm:text-base" style={{ color: 'var(--mu-ivory)' }}>
            Open duels
          </h2>
          <div className="flex flex-col gap-2">
            {open.map((d) => (
              <DuelCard key={d.id} duel={d} myId={myId} onPlay={onPlay} />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className="mu-panel p-3.5 sm:p-4">
          <h2 className="mb-3 text-sm font-bold sm:text-base" style={{ color: 'var(--mu-ivory)' }}>
            Settled
          </h2>
          <div className="flex flex-col gap-2">
            {done.map((d) => (
              <DuelCard key={d.id} duel={d} myId={myId} onPlay={onPlay} />
            ))}
          </div>
        </section>
      )}

      {board.duels.length === 0 && (
        <Empty>
          No duels yet. Finish a level and tap “Challenge” on the win screen to start one.
        </Empty>
      )}
    </div>
  );
}

function DuelCard({
  duel,
  myId,
  onPlay,
}: {
  duel: DuelRow;
  myId?: number;
  onPlay: (duel: DuelRow) => void;
}) {
  const meta = getDifficultyMeta(duel.era as Difficulty);
  const left = useCountdown(duel.expiresAt);
  const iPlayed = duel.me?.score != null;

  const verdict =
    duel.outcome === 'pending' ? (iPlayed ? 'Waiting for them' : 'Your turn')
    : duel.outcome === 'drawn' ? 'Drawn'
    : duel.outcome === 'expired' ? 'Expired'
    : duel.iWon ? 'You won' : 'You lost';

  const verdictColor =
    duel.outcome === 'pending' ? 'var(--mu-muted)'
    : duel.outcome === 'drawn' || duel.outcome === 'expired' ? 'var(--mu-faint)'
    : duel.iWon ? 'var(--mu-good)' : 'var(--mu-bad)';

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid var(--mu-line-soft)' }}
    >
      <span className="text-xl">{meta.icon}</span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold" style={{ color: 'var(--mu-text)' }}>
          {meta.shortLabel} · Level {duel.level}
          <span className="ml-1.5 font-mono opacity-50">{duel.id}</span>
        </div>
        <div className="truncate text-[0.68rem]" style={{ color: 'var(--mu-faint)' }}>
          {duel.opponent ? `vs ${duel.opponent.name}` : 'Waiting for an opponent'}
          {duel.me?.score != null && ` · you ${duel.me.score.toLocaleString()}`}
          {duel.opponent?.score != null && ` · them ${duel.opponent.score.toLocaleString()}`}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[0.68rem] font-bold" style={{ color: verdictColor }}>
          {verdict}
        </div>
        {duel.outcome === 'pending' && (
          <div className="text-[0.62rem]" style={{ color: 'var(--mu-faint)' }}>
            {left}
          </div>
        )}
      </div>

      {duel.outcome === 'pending' && !iPlayed && (
        <button onClick={() => onPlay(duel)} className="mu-btn-gold shrink-0 px-3 py-1.5 text-xs">
          Play
        </button>
      )}
    </div>
  );
}

/* ── Guilds ──────────────────────────────────────────────────────────────── */

function GuildsTab({
  board,
  guilds,
  busy,
  onAction,
}: {
  board: ActivityBoard | null;
  guilds: GuildRow[];
  busy: boolean;
  onAction: (fn: () => Promise<unknown>) => void;
}) {
  const { telegramUser } = useGameStore();
  const [name, setName] = useState('');
  const mine = board?.guild ?? null;

  if (!board) return <Skeleton />;

  return (
    <div className="flex flex-col gap-3">
      <section className="mu-panel p-3.5 sm:p-4">
        {mine ? (
          <>
            <h2 className="mb-1 text-sm font-bold sm:text-base" style={{ color: 'var(--mu-ivory)' }}>
              {mine.emblem} {mine.name}
            </h2>
            <p className="mb-3 text-xs" style={{ color: 'var(--mu-faint)' }}>
              You are {mine.role === 'owner' ? 'the owner' : 'a member'}. Your weekly score feeds the
              guild total. Share the code <span className="font-mono">{mine.id}</span> to recruit.
            </p>
            <button
              onClick={() => telegramUser && onAction(() => leaveGuild({ telegramUser }))}
              disabled={busy}
              className="mu-btn-ghost px-4 py-2 text-sm"
            >
              Leave guild
            </button>
          </>
        ) : (
          <>
            <h2 className="mb-1 text-sm font-bold sm:text-base" style={{ color: 'var(--mu-ivory)' }}>
              Start a guild
            </h2>
            <p className="mb-3 text-xs" style={{ color: 'var(--mu-faint)' }}>
              Up to 12 curators pooling a weekly score. Or paste a guild code to join one.
            </p>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Guild name or code"
                maxLength={32}
                aria-label="Guild name or code"
                className="mu-field px-3 py-2.5 text-sm"
              />
              <button
                onClick={() =>
                  telegramUser &&
                  onAction(() => createGuild({ telegramUser, name: name.trim() }))
                }
                disabled={busy || name.trim().length < 3}
                className="mu-btn-gold shrink-0 px-4 py-2.5 text-sm"
              >
                Create
              </button>
              <button
                onClick={() =>
                  telegramUser &&
                  onAction(() => joinGuild({ telegramUser, guildId: name.trim().toUpperCase() }))
                }
                disabled={busy || name.trim().length < 4}
                className="mu-btn-ghost shrink-0 px-3 py-2.5 text-sm"
              >
                Join
              </button>
            </div>
          </>
        )}
      </section>

      <section className="mu-panel p-3.5 sm:p-4">
        <h2 className="mb-3 text-sm font-bold sm:text-base" style={{ color: 'var(--mu-ivory)' }}>
          Guild table · {board.weekKey}
        </h2>
        {guilds.length === 0 ? (
          <Empty>No guilds yet. The first one gets the pick of the names.</Empty>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {guilds.map((g) => (
              <Row
                key={g.id}
                rank={g.rank}
                name={`${g.emblem} ${g.name}`}
                value={g.weekTotal.toLocaleString()}
                note={`${g.members} ${g.members === 1 ? 'curator' : 'curators'}`}
                highlight={g.id === board.guild?.id}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/* ── shared pieces ───────────────────────────────────────────────────────── */

function Row({
  rank,
  name,
  value,
  note,
  highlight,
}: {
  rank: number;
  name: string;
  value: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <li
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
      style={{
        background: highlight ? 'rgba(232,180,74,0.12)' : 'rgba(255,255,255,0.035)',
        border: `1px solid ${highlight ? 'var(--mu-line-strong)' : 'transparent'}`,
      }}
    >
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.66rem] font-bold"
        style={{
          color: rank <= 3 ? '#2a1e06' : 'var(--mu-muted)',
          background:
            rank <= 3
              ? 'linear-gradient(160deg, var(--mu-gold-bright), var(--mu-gold-deep))'
              : 'rgba(255,255,255,0.06)',
        }}
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ color: 'var(--mu-text)' }}>
        {name}
      </span>
      {note && (
        <span className="shrink-0 text-[0.62rem]" style={{ color: 'var(--mu-faint)' }}>
          {note}
        </span>
      )}
      <span className="shrink-0 text-xs font-bold" style={{ color: 'var(--mu-gold)' }}>
        {value}
      </span>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-3 text-center text-xs" style={{ color: 'var(--mu-faint)' }}>
      {children}
    </p>
  );
}

function Skeleton() {
  return (
    <div className="mu-panel p-6 text-center text-xs" style={{ color: 'var(--mu-faint)' }}>
      Loading the hall…
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Live countdown to an ISO timestamp, ticking once a minute. */
function useCountdown(iso: string): string {
  const target = useMemo(() => new Date(iso).getTime(), [iso]);
  const [label, setLabel] = useState(() => formatDuration(target - Date.now()));

  useEffect(() => {
    const tick = () => setLabel(formatDuration(target - Date.now()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [target]);

  return label;
}
