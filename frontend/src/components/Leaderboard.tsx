import { useEffect, useState, useCallback } from 'react';
import { fetchLeaderboard, LeaderboardRow } from '../lib/api';

interface LeaderboardProps {
  onBack: () => void;
}

export default function Leaderboard({ onBack }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 1 | 2 | 3>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard(100);
      setEntries(data.entries);
      setTotal(data.total);
      setLastUpdated(data.updatedAt);
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 30s
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const difficultyLabel = (d: number) => {
    if (d === 1) return { label: 'Ancient', cls: 'bg-museum-bronze-600' };
    if (d === 2) return { label: 'Medieval', cls: 'bg-museum-stone-600' };
    return { label: 'Modern', cls: 'bg-museum-blue-600' };
  };

  // Neon leaderboard is by best_score across all difficulties
  // Filter tabs are informational only (show difficulty breakdown from recent games)
  const displayed = entries;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-museum-gold-400 to-museum-bronze-500 bg-clip-text text-transparent mb-2">
            🏆 Hall of Fame
          </h2>
          <p className="text-museum-stone-400">
            {total > 0 ? `${total} collectors competing` : 'Top collectors and their finest exhibitions'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-museum-blue-600 hover:bg-museum-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
            title="Refresh leaderboard"
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-museum-stone-700 hover:bg-museum-stone-600 rounded-xl font-medium transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-museum-stone-500 mb-4">
          Last updated {formatTime(lastUpdated)} · auto-refreshes every 30s
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-600/50 rounded-lg text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && entries.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-museum-stone-800/50 rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Leaderboard Table */}
      {entries.length > 0 && (
        <div className="bg-museum-stone-800/50 backdrop-blur-lg rounded-2xl overflow-hidden border border-museum-bronze-400/20">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-museum-stone-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-museum-stone-400">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-museum-stone-400">Collector</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-museum-stone-400">Best Score</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-museum-stone-400">Games</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-museum-stone-400">Wins</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-museum-stone-400">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-museum-stone-700">
                {displayed.map((entry) => (
                  <tr
                    key={entry.telegram_id}
                    className={`hover:bg-museum-stone-700/30 transition-colors ${
                      entry.rank <= 3 ? 'bg-museum-gold-500/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="text-2xl font-bold">{getRankEmoji(entry.rank)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">
                        {entry.display_name}
                      </div>
                      {entry.username && entry.first_name && (
                        <div className="text-xs text-museum-stone-500">{entry.first_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xl font-bold text-museum-gold-400">
                        {entry.best_score.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{entry.total_games}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-green-400">{entry.total_wins}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-museum-stone-400">
                        {formatTime(entry.last_active)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && entries.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏛️</div>
          <h3 className="text-2xl font-bold mb-2">No Exhibitions Yet</h3>
          <p className="text-museum-stone-400">
            Be the first to complete a collection and claim the top spot!
          </p>
        </div>
      )}
    </div>
  );
}
