import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchChallengeRoom, joinChallengeRoom, ChallengeRoom as ChallengeRoomData, rematchChallengeRoom, startChallengeRoom } from '../lib/api';
import { useGameStore } from '../store/gameStore';
import { getDifficultyMeta } from '../types';
import { roomInviteLink, shareLink } from '../lib/links';

interface ChallengeRoomProps {
  roomId: string;
  onBack: () => void;
  onPlay: (room: ChallengeRoomData) => void;
}

export default function ChallengeRoom({ roomId, onBack, onPlay }: ChallengeRoomProps) {
  const { telegramUser, playerName, theme } = useGameStore();
  const [room, setRoom] = useState<ChallengeRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const displayName = playerName || telegramUser?.first_name || 'Curator';
  const selfParticipant = useMemo(
    () => room?.participants.find((entry) => entry.telegramId === telegramUser?.id) ?? null,
    [room, telegramUser?.id],
  );

  const themeAccent = {
    museum: { border: 'border-amber-500/20', bg: 'from-slate-950 via-slate-900 to-amber-950/50', text: 'text-amber-300', button: 'from-amber-500 to-amber-700' },
    nature: { border: 'border-green-500/20', bg: 'from-slate-950 via-emerald-950/60 to-slate-900', text: 'text-green-300', button: 'from-green-500 to-green-700' },
    urban: { border: 'border-cyan-500/20', bg: 'from-zinc-950 via-zinc-900 to-cyan-950/50', text: 'text-cyan-300', button: 'from-cyan-500 to-sky-700' },
  }[theme];

  useEffect(() => {
    let cancelled = false;

    async function load(joinFirst: boolean) {
      if (!telegramUser) return;
      setError(null);
      try {
        const payload = joinFirst
          ? await joinChallengeRoom({
              telegramUser: {
                id: telegramUser.id,
                username: telegramUser.username,
                first_name: telegramUser.first_name,
                last_name: telegramUser.last_name,
              },
              roomId,
              displayName,
            })
          : await fetchChallengeRoom(roomId);

        if (!cancelled) setRoom(payload);
      } catch (loadError: any) {
        if (!cancelled) setError(loadError.message || 'Failed to load room');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load(true);
    const interval = window.setInterval(() => load(false), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [roomId, telegramUser?.id, displayName]);

  useEffect(() => {
    if (!room?.countdownEndsAt || room.status !== 'countdown') {
      setCountdown(null);
      return;
    }

    const tick = () => {
      const ms = new Date(room.countdownEndsAt as string).getTime() - Date.now();
      setCountdown(Math.max(0, Math.ceil(ms / 1000)));
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [room?.countdownEndsAt, room?.status]);

  const handleShare = async () => {
    // A bot link, not a web URL: it opens inside Telegram for the friend, and
    // the bot registers them before handing over a button into this room.
    const link = roomInviteLink(roomId);
    const difficulty = room ? getDifficultyMeta(room.difficulty as any) : null;
    const text = difficulty
      ? `⚔️ Join my Memorabilia duel: ${difficulty.icon} ${difficulty.label} Level ${room?.level}. Same board, fastest verified time wins. Room ${roomId}`
      : `⚔️ Join my Memorabilia duel room ${roomId}. Same board, fastest time wins.`;
    const how = await shareLink(link, text);
    if (how === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStart = async () => {
    if (!telegramUser) return;
    try {
      const updated = await startChallengeRoom({
        telegramUser: {
          id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
        },
        roomId,
      });
      setRoom(updated);
    } catch (startError: any) {
      setError(startError.message || 'Failed to start room');
    }
  };

  const handleRematch = async () => {
    if (!telegramUser) return;
    try {
      const updated = await rematchChallengeRoom({
        telegramUser: {
          id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
        },
        roomId,
      });
      setRoom(updated);
    } catch (rematchError: any) {
      setError(rematchError.message || 'Failed to start rematch');
    }
  };

  if (loading) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-white/70">Loading duel room…</div>;
  }

  if (!room) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
        {error || 'Room not found'}
      </div>
    );
  }

  const difficulty = getDifficultyMeta(room.difficulty as any);
  const canPlay = (room.status === 'live' || room.status === 'countdown') && selfParticipant?.status !== 'finished';

  return (
    <div className={`rounded-3xl border ${themeAccent.border} bg-gradient-to-br ${themeAccent.bg} p-4 sm:p-6 space-y-6`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] uppercase tracking-[0.28em] font-semibold ${themeAccent.text}`}>Challenge Room</p>
          <h2 className="mt-2 text-3xl font-black text-white">Room {room.id}</h2>
          <p className="mt-2 text-sm text-white/55">{difficulty.icon} {difficulty.label} · Level {room.level} · same board for everyone</p>
        </div>
        <button onClick={onBack} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white/75 hover:bg-white/15">Back</button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <p className="text-xs uppercase tracking-widest text-white/40">Status</p>
          <p className="mt-2 text-xl font-black text-white">
            {room.status === 'lobby' ? 'Waiting Room' : room.status === 'countdown' ? 'Countdown' : room.status === 'live' ? 'Live Duel' : 'Finished'}
          </p>
          {room.status === 'countdown' && countdown !== null && (
            <p className="mt-1 text-xs text-amber-200">Starts in {countdown}s</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <p className="text-xs uppercase tracking-widest text-white/40">Players</p>
          <p className="mt-2 text-xl font-black text-white">{room.participants.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <p className="text-xs uppercase tracking-widest text-white/40">Seed</p>
          <p className="mt-2 text-xl font-black text-white">{room.seed}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={handleShare} className={`rounded-xl bg-gradient-to-r ${themeAccent.button} px-4 py-3 text-sm font-bold text-white`}>
            {copied ? 'Link Copied' : 'Share Invite Link'}
          </button>
          {room.isHost && room.status === 'lobby' && (
            <button onClick={handleStart} className="rounded-xl bg-emerald-500/20 px-4 py-3 text-sm font-bold text-emerald-200 hover:bg-emerald-500/30">
              Start Duel
            </button>
          )}
          {room.isHost && room.status === 'completed' && (
            <button onClick={handleRematch} className="rounded-xl bg-violet-500/20 px-4 py-3 text-sm font-bold text-violet-200 hover:bg-violet-500/30">
              Rematch Same Room
            </button>
          )}
          {canPlay && (
            <button onClick={() => onPlay(room)} className="rounded-xl bg-sky-500/20 px-4 py-3 text-sm font-bold text-sky-200 hover:bg-sky-500/30">
              {room.status === 'countdown' ? 'Get Ready' : 'Play Now'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-[11px] uppercase tracking-[0.25em] font-semibold ${themeAccent.text}`}>Live Standings</p>
            <h3 className="mt-1 text-xl font-bold text-white">Fastest verified finish wins</h3>
          </div>
          <p className="text-xs text-white/40">updates every 3s</p>
        </div>

        <div className="mt-4 space-y-3">
          {room.participants.map((participant) => (
            <motion.div
              key={participant.telegramId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div>
                <p className="font-bold text-white">
                  {participant.rank ? `#${participant.rank} ` : ''}
                  {participant.displayName}
                  {participant.telegramId === telegramUser?.id ? ' (You)' : ''}
                </p>
                <p className="text-xs text-white/45">
                  {participant.status === 'finished'
                    ? `${participant.bestTimeSeconds}s · ${participant.bestMoves} moves`
                    : participant.status === 'joined' && room.status === 'countdown'
                    ? 'Ready for countdown…'
                    : participant.status === 'playing'
                    ? 'Playing now…'
                    : 'Waiting in lobby'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">{participant.bestScore?.toLocaleString() ?? '—'}</p>
                <p className="text-xs text-white/45">{participant.verified ? 'Verified' : participant.status === 'finished' ? 'Pending' : ''}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
