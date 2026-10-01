import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { fetchActivities, RelicRow } from '../lib/api';
import { Difficulty, DIFFICULTY_ORDER, getDifficultyMeta } from '../types';
import { getEraSkin } from '../theme/cardSkins';

/**
 * The relic shelf.
 *
 * Shows every relic in the game including the ones not yet earned — the empty
 * slots are the whole mechanic, so an unearned relic is rendered as a labelled
 * silhouette with its unlock hint, never hidden.
 */
export default function Collection() {
  const { telegramUser } = useGameStore();
  const [relics, setRelics] = useState<RelicRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchActivities(telegramUser?.id)
      .then((board) => alive && setRelics(board.collection.relics))
      .catch((e) => alive && setError(e.message ?? 'Could not load the collection'));
    return () => {
      alive = false;
    };
  }, [telegramUser?.id]);

  const byEra = useMemo(() => {
    const groups = new Map<number, RelicRow[]>();
    for (const relic of relics ?? []) {
      if (!groups.has(relic.era)) groups.set(relic.era, []);
      groups.get(relic.era)!.push(relic);
    }
    return groups;
  }, [relics]);

  const earned = relics?.filter((r) => r.earned).length ?? 0;
  const total = relics?.length ?? 0;
  const pct = total ? Math.round((earned / total) * 100) : 0;

  return (
    <div className="mu-rise">
      <header className="mb-4">
        <span className="mu-eyebrow">The Vault</span>
        <h1
          className="font-display mt-1 text-3xl leading-none sm:text-4xl lg:text-5xl"
          style={{ color: 'var(--mu-ivory)' }}
        >
          Collection
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--mu-muted)' }}>
          {total > 0 ? `${earned} of ${total} relics recovered` : 'Loading the vault…'}
        </p>
        {total > 0 && (
          <div className="mu-track mt-2 h-1.5 max-w-sm">
            <div className="mu-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
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

      <div className="flex flex-col gap-4">
        {DIFFICULTY_ORDER.map((era) => {
          const group = byEra.get(era) ?? [];
          if (!group.length) return null;

          const meta = getDifficultyMeta(era as Difficulty);
          const skin = getEraSkin(era as Difficulty);
          const got = group.filter((r) => r.earned).length;

          return (
            <section key={era} className="mu-panel p-3.5 sm:p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base"
                  style={{
                    background: `linear-gradient(150deg, ${skin.backFrom}, ${skin.backTo})`,
                    border: `1px solid ${skin.accent}44`,
                  }}
                >
                  {meta.icon}
                </span>
                <h2 className="flex-1 text-sm font-bold sm:text-base" style={{ color: 'var(--mu-ivory)' }}>
                  {meta.label}
                </h2>
                <span className="shrink-0 text-xs font-bold" style={{ color: skin.accent }}>
                  {got}/{group.length}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                {group.map((relic, i) => (
                  <RelicSlot key={relic.id} relic={relic} accent={skin.accent} index={i} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function RelicSlot({
  relic,
  accent,
  index,
}: {
  relic: RelicRow;
  accent: string;
  index: number;
}) {
  const hint =
    relic.source === 'referral' ? 'Invite a curator'
    : relic.source === 'streak' ? 'Keep a daily streak'
    : relic.source === 'boss' ? `Clear level ${relic.level}`
    : `Clear level ${relic.level}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.3 }}
      className="flex flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 text-center"
      style={{
        background: relic.earned ? `${accent}14` : 'rgba(255,255,255,0.025)',
        border: `1px solid ${relic.earned ? `${accent}55` : 'var(--mu-line-soft)'}`,
      }}
      title={relic.earned ? relic.name : `Locked — ${hint}`}
    >
      <span
        className="text-2xl"
        style={
          relic.earned
            ? { filter: `drop-shadow(0 0 10px ${accent}88)` }
            : { filter: 'grayscale(1) brightness(0.4)', opacity: 0.55 }
        }
        aria-hidden="true"
      >
        {relic.icon}
      </span>
      <span
        className="line-clamp-2 text-[0.6rem] font-semibold leading-tight"
        style={{ color: relic.earned ? 'var(--mu-text)' : 'var(--mu-faint)' }}
      >
        {relic.earned ? relic.name : hint}
      </span>
    </motion.div>
  );
}
