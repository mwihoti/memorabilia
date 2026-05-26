import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { setupDojo, createBurnerAccount } from './dojo/setup';
import { createGameController } from './dojo/gameController';
import { initTelegramApp, getTelegramUser, getThemeColors, isTelegramWebApp } from './telegram/telegram';
import { GhostReplay, Difficulty, getMaxLevelForEra } from './types';
import { loadGhostReplay } from './store/ghostReplay';
import { resolveStartupIntroState } from '../../shared/startupIntro.js';

// Components
import LoadingScreen from './components/LoadingScreen';
import NameEntry from './components/NameEntry';
import DifficultySelector from './components/DifficultySelector';
import GameBoard from './components/GameBoard';
import WinModal from './components/WinModal';
import Header from './components/Header';
import Leaderboard from './components/Leaderboard';
import TelegramRequired from './components/TelegramRequired';
import UserDashboard from './components/UserDashboard';
import FarewellScreen from './components/FarewellScreen';
import Waves from './components/Waves';
import LevelSelector from './components/LevelSelector';
import AchievementToast from './components/AchievementToast';
import GhostReplayModal from './components/GhostReplayModal';
import IntroCinematic from './components/IntroCinematic';
import ChallengeRoom from './components/ChallengeRoom';
import { ChallengeRoom as ChallengeRoomData, createChallengeRoom } from './lib/api';

type Screen = 'loading' | 'name-entry' | 'difficulty' | 'level-select' | 'challenge-room' | 'game' | 'leaderboard' | 'dashboard' | 'farewell';

function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showGhostReplay, setShowGhostReplay] = useState(false);
  const [ghostReplayData, setGhostReplayData] = useState<GhostReplay | null>(null);
  const [showOpeningIntro, setShowOpeningIntro] = useState(false);
  const [showSplashIntro, setShowSplashIntro] = useState(false);
  const [showLevelIntro, setShowLevelIntro] = useState(false);
  const [startupIntroResolved, setStartupIntroResolved] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);

  const {
    telegramUser,
    setTelegramUser,
    setAccount,
    setGameController,
    playerName,
    currentGame,
    showWinModal,
    resetGame,
    theme,
    startLevelGame,
    startWeeklyChallenge,
    currentEra,
    currentLevel,
    challengeMode,
    activeChallengeRoomId,
    newlyUnlockedAchievements,
    clearNewAchievements,
    hydratePlayerProgress,
    startChallengeRoomGame,
  } = useGameStore();

  useEffect(() => {
    const hasSeenOpening = localStorage.getItem('memorabilia_seen_opening_intro') === '1';
    const introState = resolveStartupIntroState(hasSeenOpening);
    setShowOpeningIntro(introState.showOpeningIntro);
    setShowSplashIntro(introState.showSplashIntro);
    if (!hasSeenOpening) localStorage.setItem('memorabilia_seen_opening_intro', '1');
    setStartupIntroResolved(true);
  }, []);

  useEffect(() => {
    if (!currentGame || screen !== 'game') return;
    setShowLevelIntro(true);
  }, [currentGame?.game_id, screen]);

  // Initialize app
  useEffect(() => {
    async function initialize() {
      try {
        console.log('🚀 Initializing Memorabilia...');

        // Initialize Telegram — get real user, no fallback
        const user = initTelegramApp() ?? getTelegramUser();
        setTelegramUser(user);

        // Apply Telegram theme
        const themeColors = getThemeColors();
        document.documentElement.style.setProperty('--tg-bg-color', themeColors.bgColor);
        document.documentElement.style.setProperty('--tg-text-color', themeColors.textColor);

        // Check if we have a world address (blockchain mode) or demo mode
        const worldAddress = import.meta.env.VITE_WORLD_ADDRESS;
        const isDemoMode = !worldAddress || worldAddress === '0x' || worldAddress === '';

        if (isDemoMode) {
          console.log('🎮 Running in DEMO MODE (no blockchain required)');
          setIsInitializing(false);
          const savedName = localStorage.getItem('memorabilia_player_name');
          setScreen(savedName ? (pendingRoomId ? 'challenge-room' : 'level-select') : 'name-entry');
        } else {
          console.log('⛓️ Running in BLOCKCHAIN MODE');

          // Setup Dojo
          await setupDojo();

          // Create burner account for session
          const burnerAccount = await createBurnerAccount();
          setAccount(burnerAccount);

          // Create game controller
          const controller = createGameController(burnerAccount);
          setGameController(controller);

          console.log('✅ Blockchain initialization complete!');
          setIsInitializing(false);
          const savedName = localStorage.getItem('memorabilia_player_name');
          setScreen(savedName ? (pendingRoomId ? 'challenge-room' : 'level-select') : 'name-entry');
        }
      } catch (error) {
        console.error('❌ Initialization failed:', error);
        setIsInitializing(false);
        const savedName = localStorage.getItem('memorabilia_player_name');
        setScreen(savedName ? (pendingRoomId ? 'challenge-room' : 'level-select') : 'name-entry');
      }
    }

    initialize();
  }, [pendingRoomId, setTelegramUser, setAccount, setGameController]);

  useEffect(() => {
    if (telegramUser?.id) {
      hydratePlayerProgress();
    }
  }, [telegramUser?.id, hydratePlayerProgress]);

  useEffect(() => {
    const roomId = new URLSearchParams(window.location.search).get('room');
    if (roomId) {
      const normalized = roomId.toUpperCase();
      setActiveRoomId(normalized);
      setPendingRoomId(normalized);
    }
  }, []);

  // Handle game state changes
  useEffect(() => {
    if (currentGame && screen !== 'game') {
      setScreen('game');
    }
  }, [currentGame, screen]);

  const handleWinModalClose = () => {
    // Check if a ghost replay is available for the completed era/level
    if (currentEra !== null) {
      const replay = loadGhostReplay(currentEra, currentLevel);
      if (replay) {
        setGhostReplayData(replay);
      }
    }
    resetGame();
    setScreen(activeChallengeRoomId ? 'challenge-room' : 'level-select');
  };

  const handleNextLevel = async () => {
    if (currentEra === null) return;
    const nextLevel = currentLevel + 1;
    resetGame();
    if (nextLevel > getMaxLevelForEra(currentEra)) return;
    await startLevelGame(currentEra, nextLevel, false);
    setScreen('game');
  };

  const handleShowGhostReplay = () => {
    // Load the latest best replay when triggered from WinModal
    if (currentEra !== null) {
      const replay = loadGhostReplay(currentEra, currentLevel);
      if (replay) {
        setGhostReplayData(replay);
        setShowGhostReplay(true);
      }
    }
  };

  const handleGhostReplayClose = () => {
    setShowGhostReplay(false);
    setGhostReplayData(null);
  };

  const handleShowLeaderboard = () => setScreen('leaderboard');
  const handleShowDashboard = () => setScreen('dashboard');

  const handleBackToDifficulty = () => {
    if (currentGame) {
      if (confirm('Are you sure you want to quit the current game?')) {
        resetGame();
        setScreen('level-select');
      }
    } else {
      setScreen('level-select');
    }
  };

  const handleLeaveGame = () => {
    if (currentGame) {
      if (confirm('Quit and return to menu?')) {
        resetGame();
        setScreen('farewell');
      }
    } else {
      setScreen('farewell');
    }
  };

  const handleLevelStart = async (era: Difficulty, level: number, isDailyChallenge: boolean) => {
    await startLevelGame(era, level, isDailyChallenge);
    setScreen('game');
  };

  const handleSwitchToLevels = () => {
    setScreen('level-select');
  };

  const handleCreateChallenge = async (era: Difficulty, level: number) => {
    if (!telegramUser) return;
    const room = await createChallengeRoom({
      telegramUser: {
        id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
      },
      displayName: playerName || telegramUser.first_name || 'Curator',
      difficulty: era,
      level,
      seed: Math.floor(Math.random() * 2_000_000_000),
    });

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('room', room.id);
    window.history.replaceState({}, '', nextUrl.toString());
    setActiveRoomId(room.id);
    setPendingRoomId(room.id);
    setScreen('challenge-room');
  };

  const handleOpenRoom = (room: ChallengeRoomData) => {
    setActiveRoomId(room.id);
    startChallengeRoomGame({
      id: room.id,
      difficulty: room.difficulty as Difficulty,
      level: room.level,
      seed: room.seed,
    });
    setScreen('game');
  };

  const handleLeaveRoom = () => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('room');
    window.history.replaceState({}, '', nextUrl.toString());
    setActiveRoomId(null);
    setPendingRoomId(null);
    setScreen('level-select');
  };

  const isStartupIntroVisible = showOpeningIntro || showSplashIntro;

  if ((isInitializing || !startupIntroResolved) && !isStartupIntroVisible) {
    return <LoadingScreen />;
  }

  // Gate 1 — must be inside Telegram WebApp
  if (!isTelegramWebApp()) {
    return <TelegramRequired />;
  }

  // Gate 2 — Telegram must have provided real user data
  if (!telegramUser || telegramUser.id === 0) {
    return <TelegramRequired />;
  }

  // Farewell screen
  if (screen === 'farewell') {
    return <FarewellScreen onPlayAgain={() => setScreen('level-select')} />;
  }

  return (
    <div className={`min-h-screen theme-${theme} relative`}
      style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}
    >
      <Waves
        lineColor="rgba(255, 255, 255, 0.12)"
        backgroundColor="transparent"
        waveSpeedX={0.0125}
        waveSpeedY={0.005}
        waveAmpX={32}
        waveAmpY={16}
        xGap={10}
        yGap={32}
        friction={0.925}
        tension={0.005}
        maxCursorMove={100}
      />
      <div className="relative z-10">
        {screen !== 'name-entry' && (
          <Header
            onShowLeaderboard={handleShowLeaderboard}
            onBackToDifficulty={handleBackToDifficulty}
            onShowDashboard={handleShowDashboard}
            onLeave={handleLeaveGame}
            currentScreen={screen}
          />
        )}

        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {screen === 'name-entry' && (
            <NameEntry onContinue={() => setScreen(pendingRoomId ? 'challenge-room' : 'level-select')} />
          )}

          {/* New level-select screen — primary entry point */}
          {screen === 'level-select' && (
            <LevelSelector onStart={handleLevelStart} onStartWeekly={async () => {
              await startWeeklyChallenge();
              setScreen('game');
            }} onCreateChallenge={handleCreateChallenge} />
          )}

          {screen === 'challenge-room' && activeRoomId && (
            <ChallengeRoom roomId={activeRoomId} onBack={handleLeaveRoom} onPlay={handleOpenRoom} />
          )}

          {/* Legacy difficulty screen — kept for blockchain mode backward compat */}
          {screen === 'difficulty' && (
            <DifficultySelector
              onStart={() => setScreen('game')}
              onSwitchToLevels={handleSwitchToLevels}
            />
          )}

          {screen === 'game' && currentGame && (
            !showLevelIntro ? <GameBoard /> : null
          )}

          {screen === 'leaderboard' && (
            <Leaderboard onBack={handleBackToDifficulty} />
          )}

          {screen === 'dashboard' && (
            <UserDashboard />
          )}
        </main>

        {showWinModal && (
          <WinModal
            onClose={handleWinModalClose}
            onNextLevel={currentEra !== null && challengeMode !== 'room' ? handleNextLevel : undefined}
            onShowGhostReplay={handleShowGhostReplay}
          />
        )}

        {/* Ghost replay modal — shown after win modal closes if replay is available */}
        {showGhostReplay && ghostReplayData && (
          <GhostReplayModal
            replay={ghostReplayData}
            onClose={handleGhostReplayClose}
          />
        )}
      </div>

      {/* Achievement toast — always rendered, reads from store */}
      <AchievementToast
        achievements={newlyUnlockedAchievements}
        onDismiss={clearNewAchievements}
      />

      <IntroCinematic
        mode="opening"
        open={showOpeningIntro}
        onComplete={() => {
          setShowOpeningIntro(false);
          setShowSplashIntro(true);
        }}
      />

      <IntroCinematic
        mode="splash"
        open={showSplashIntro}
        onComplete={() => {
          setShowSplashIntro(false);
          setStartupIntroResolved(true);
        }}
      />

      <IntroCinematic
        mode="level"
        open={showLevelIntro && !!currentGame && screen === 'game'}
        era={currentEra}
        level={currentLevel}
        onComplete={() => setShowLevelIntro(false)}
      />
    </div>
  );
}

export default App;
