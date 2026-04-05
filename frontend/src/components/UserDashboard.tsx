import { useState, useEffect } from 'react';
import { getAllPlayers, getLeaderboard, getLeaderboardStats, LocalPlayerData, LocalLeaderboardEntry, clearAllData, createTestPlayer } from '../store/playerStorage';
import { fetchLeaderboard, LeaderboardRow } from '../lib/api';
import './UserDashboard.css';

type DashboardTab = 'users' | 'leaderboard' | 'stats';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'games' | 'active' | 'joined'>('games');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
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

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <h1>🎮 Player Dashboard</h1>
        <p>Track all players and their scores</p>
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
    </div>
  );
}
