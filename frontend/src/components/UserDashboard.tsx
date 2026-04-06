import { useState, useEffect } from 'react';
import { getAllPlayers, getLeaderboard, getLeaderboardStats, LocalPlayerData, LocalLeaderboardEntry, clearAllData, createTestPlayer } from '../store/playerStorage';
import { fetchLeaderboard, LeaderboardRow } from '../lib/api';
import './UserDashboard.css';

type DashboardTab = 'users' | 'leaderboard' | 'stats' | 'advanced';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'games' | 'active' | 'joined'>('games');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const [advancedTaps, setAdvancedTaps] = useState(0);
  const [advancedUnlocked, setAdvancedUnlocked] = useState(false);
  const [allPlayers, setAllPlayers] = useState<LocalPlayerData[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LocalLeaderboardEntry[]>([]);
  const [statsData, setStatsData] = useState<any>(null);
  const [neonLeaderboard, setNeonLeaderboard] = useState<LeaderboardRow[]>([]);
  const [neonTotal, setNeonTotal] = useState(0);
  const [neonLoading, setNeonLoading] = useState(false);

  const loadData = () => {
    const players = getAllPlayers();
    const leaderboard = getLeaderboard();
    const stats = getLeaderboardStats();
    setAllPlayers(players);
    setLeaderboardData(leaderboard);
    setStatsData(stats);
  };

  const loadNeonLeaderboard = async () => {
    setNeonLoading(true);
    try {
      const data = await fetchLeaderboard(100);
      setNeonLeaderboard(data.entries);
      setNeonTotal(data.total);
    } catch {
      // silently fall back to localStorage leaderboard
    } finally {
      setNeonLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadNeonLeaderboard();
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadData();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter and sort users
  const filteredUsers = allPlayers
    .filter((user) =>
      searchQuery === ''
        ? true
        : String(user.telegramId).includes(searchQuery) ||
          user.playerName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'games':
          return b.totalGames - a.totalGames;
        case 'active':
          return b.lastPlayed - a.lastPlayed;
        case 'joined':
          return b.joinedAt - a.joinedAt;
        default:
          return 0;
      }
    });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(timestamp);
  };

  const handleHeaderTap = () => {
    const next = advancedTaps + 1;
    setAdvancedTaps(next);
    if (next >= 7 && !advancedUnlocked) {
      setAdvancedUnlocked(true);
    }
  };

  return (
    <div className="user-dashboard">
      <div className="dashboard-header" onClick={handleHeaderTap} style={{ cursor: 'default' }}>
        <h1>🎮 Player Dashboard</h1>
        <p>Track all players and their scores</p>
        {advancedTaps > 0 && advancedTaps < 7 && (
          <p style={{ fontSize: '10px', opacity: 0.4, marginTop: 2 }}>
            {7 - advancedTaps} more to unlock advanced mode
          </p>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 All Users ({allPlayers.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => { setActiveTab('leaderboard'); loadNeonLeaderboard(); }}
        >
          🏆 Leaderboard ({neonTotal || leaderboardData.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Analytics
        </button>
        {advancedUnlocked && (
          <button
            className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
            style={{ borderColor: '#ef4444' }}
          >
            🔐 Advanced
          </button>
        )}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="tab-content">
          <div className="content-header">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by name or Telegram ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="controls">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="sort-select">
                <option value="games">Sort by: Most Games</option>
                <option value="active">Sort by: Most Active</option>
                <option value="joined">Sort by: Newest</option>
              </select>
              <button onClick={loadData} className="refresh-btn">
                🔄 Refresh
              </button>
              <label className="auto-refresh">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh
              </label>
            </div>
          </div>

          <div className="table-container">
            {filteredUsers.length === 0 ? (
              <div className="empty-state">
                <p>📭 No players yet. Start playing to appear here!</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Telegram ID</th>
                    <th>Total Games</th>
                    <th>Wins</th>
                    <th>Best Score</th>
                    <th>Average</th>
                    <th>Last Played</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.telegramId}>
                      <td className="player-name">{user.playerName}</td>
                      <td>{user.telegramId}</td>
                      <td>
                        <span className="badge">{user.totalGames}</span>
                      </td>
                      <td>
                        <span className="badge success">{user.totalWins}</span>
                      </td>
                      <td>
                        <span className="score">{user.bestScore.toLocaleString()}</span>
                      </td>
                      <td>
                        <span className="score">{user.averageScore.toLocaleString()}</span>
                      </td>
                      <td className="time">{formatTime(user.lastPlayed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Tab — pulls from Neon DB */}
      {activeTab === 'leaderboard' && (
        <div className="tab-content">
          <div className="content-header">
            <h2>🏆 Hall of Fame {neonTotal > 0 && <span style={{ fontSize: '0.7em', color: '#999' }}>({neonTotal} players)</span>}</h2>
            <button onClick={loadNeonLeaderboard} disabled={neonLoading} className="refresh-btn">
              {neonLoading ? '⏳' : '🔄'} Refresh
            </button>
          </div>

          <div className="leaderboard-container">
            {neonLoading && neonLeaderboard.length === 0 ? (
              <div className="empty-state"><p>⏳ Loading live leaderboard...</p></div>
            ) : neonLeaderboard.length > 0 ? (
              <div className="leaderboard-list">
                {neonLeaderboard.map((entry) => {
                  const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
                  return (
                    <div key={entry.telegram_id} className="leaderboard-entry">
                      <div className="rank-medal">{medal}</div>
                      <div className="entry-info">
                        <div className="player-info">
                          <h3>{entry.display_name}</h3>
                          {entry.first_name && entry.username && (
                            <p className="difficulty-badge">{entry.first_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="entry-stats">
                        <div className="stat">
                          <span className="label">Best Score</span>
                          <span className="value">{entry.best_score.toLocaleString()}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Games</span>
                          <span className="value">{entry.total_games}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Wins</span>
                          <span className="value">{entry.total_wins}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Last Active</span>
                          <span className="value">{formatTime(new Date(entry.last_active).getTime())}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>🏅 No scores yet. Complete a game to join the leaderboard!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'stats' && (
        <div className="tab-content">
          <div className="content-header">
            <h2>📊 Analytics</h2>
            <button onClick={loadData} className="refresh-btn">
              🔄 Refresh
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <p className="stat-label">Total Players</p>
                <p className="stat-value">{statsData?.totalPlayers || 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🎮</div>
              <div className="stat-content">
                <p className="stat-label">Games Played</p>
                <p className="stat-value">{statsData?.totalGames || 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <p className="stat-label">Average Score</p>
                <p className="stat-value">{statsData?.averageScore?.toLocaleString() || '0'}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-content">
                <p className="stat-label">Highest Score</p>
                <p className="stat-value">{statsData?.highestScore?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>ℹ️ About This Dashboard</h3>
            <p>
              This dashboard displays all player scores and statistics stored locally. Scores are automatically recorded when you complete a game and appear in the Hall of Fame instantly!
            </p>
            <p>
              <strong>Data stored locally:</strong> No blockchain required for basic tracking. When you deploy contracts and enable Torii indexing, this data will sync to the blockchain.
            </p>
          </div>

          {/* Debug Section */}
          <div className="info-section">
            <h3>🔍 Debug Info</h3>
            <button 
              onClick={() => {
                const playerData = localStorage.getItem('memorabilia_player_data');
                const leaderboardData = localStorage.getItem('memorabilia_leaderboard');
                console.log('📦 Player Data in LocalStorage:', playerData ? JSON.parse(playerData) : 'EMPTY');
                console.log('📦 Leaderboard Data in LocalStorage:', leaderboardData ? JSON.parse(leaderboardData) : 'EMPTY');
                alert('Check browser console (F12) for raw localStorage data');
              }}
              className="debug-btn"
            >
              📦 Check LocalStorage (see console)
            </button>
            <button 
              onClick={() => {
                createTestPlayer();
                loadData();
                alert('✅ Test player "Dan🐾" created! Dashboard should now show the player.');
              }}
              className="debug-btn"
              style={{ background: 'linear-gradient(135deg, #00c853, #64dd17)' }}
            >
              ✅ Create Test Player
            </button>
            <button 
              onClick={() => {
                if (window.confirm('Are you sure? This will delete all player data.')) {
                  clearAllData();
                  loadData();
                  alert('✅ All data cleared');
                }
              }}
              className="debug-btn"
              style={{ background: 'linear-gradient(135deg, #d32f2f, #ff1744)' }}
            >
              🗑️ Clear All Data
            </button>
            <p style={{ fontSize: '0.9em', color: '#999' }}>
              Use these buttons to test or reset player data. Results will appear above.
            </p>
          </div>
        </div>
      )}

      {/* Advanced Tab — hidden from normal users, unlocked by tapping header 7× */}
      {activeTab === 'advanced' && advancedUnlocked && (
        <div className="tab-content">
          <div style={{ padding: '16px', background: '#1e1e2e', borderRadius: '12px', border: '1px solid #ef4444', marginBottom: '16px' }}>
            <p style={{ color: '#ef4444', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '8px' }}>
              🔐 ADVANCED · FOR DEVELOPERS ONLY
            </p>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
              Blockchain Security Reference
            </h2>
            <p style={{ color: '#999', fontSize: '12px' }}>
              Educational content about on-chain game security. Not visible to regular players.
            </p>
          </div>

          <div style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', lineHeight: 1.7 }}>
            <h3 style={{ color: '#f87171', fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
              §5 — 51% Attack: What an Attacker Can (and Cannot) Do
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px' }}>
              A 51% attacker controls the majority of hashpower on a proof-of-work chain.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#4ade80', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                ✅ Realistic actions:
              </p>
              <ul style={{ color: '#cbd5e1', fontSize: '13px', paddingLeft: '16px' }}>
                <li style={{ marginBottom: '4px' }}>Reorganise (re-mine) recent blocks → double-spend their own transactions.</li>
                <li style={{ marginBottom: '4px' }}>Censor specific transactions or miners by ignoring their blocks.</li>
                <li style={{ marginBottom: '4px' }}>Build a longer private chain and broadcast it at the right moment.</li>
              </ul>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#f87171', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                ❌ What they CANNOT do:
              </p>
              <ul style={{ color: '#cbd5e1', fontSize: '13px', paddingLeft: '16px' }}>
                <li style={{ marginBottom: '4px' }}>Arbitrarily break consensus rules (e.g. print extra tokens, change supply cap).</li>
                <li style={{ marginBottom: '4px' }}>Steal UTXOs/assets that don't belong to them.</li>
                <li style={{ marginBottom: '4px' }}>Create invalid signatures or bypass cryptographic proofs.</li>
              </ul>
            </div>

            <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
              <p style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                <strong style={{ color: '#e2e8f0' }}>Why?</strong> Full nodes (not just miners) enforce consensus rules.
                An invalid block is rejected by the entire network regardless of hashpower.
                The attacker can only rewrite history they themselves created or recent blocks.
                Economic cost is enormous — lost honest revenue plus severe market reaction.
              </p>
            </div>

            <div style={{ marginTop: '16px', padding: '12px', background: '#0c1a3a', borderRadius: '8px', border: '1px solid #1e3a5f' }}>
              <p style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                🔷 Starknet / Layer-2 Note
              </p>
              <p style={{ color: '#94a3b8', fontSize: '12px' }}>
                Starknet uses ZK-STARKs for validity proofs. State transitions are proven correct
                before being accepted by L1 Ethereum. A 51% attack on Ethereum L1 would not
                allow fabrication of invalid Starknet state transitions — the proof system prevents it.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
