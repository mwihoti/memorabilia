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
import GameBoard from './components/GameBoard';
import WinModal from './components/WinModal';
import AppShell, { NavKey } from './components/AppShell';
import TelegramRequired from './components/TelegramRequired';
import UserDashboard from './components/UserDashboard';
import Activities from './components/Activities';
import Collection from './components/Collection';
import FarewellScreen from './components/FarewellScreen';
import MuseumBackground from './components/MuseumBackground';
import LevelSelector from './components/LevelSelector';
import AchievementToast from './components/AchievementToast';
import GhostReplayModal from './components/GhostReplayModal';
import IntroCinematic from './components/IntroCinematic';
import ChallengeRoom from './components/ChallengeRoom';
import { ChallengeRoom as ChallengeRoomData, createChallengeRoom } from './lib/api';
import { debug } from './lib/log';

type Screen = 'loading' | 'name-entry' | 'level-select' | 'challenge-room' | 'game' | 'activities' | 'collection' | 'dashboard' | 'farewell';

function buildCleanRoomUrl(roomId: string): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('room', roomId.toUpperCase());
  return url.toString();
}

function buildCleanAppUrl(): string {
  return window.location.origin + window.location.pathname;
}

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
        debug('Initializing Memorabilia...');

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
          debug('Running in DEMO MODE (no blockchain required)');
          setIsInitializing(false);
          const savedName = localStorage.getItem('memorabilia_player_name');
          setScreen(savedName ? (pendingRoomId ? 'challenge-room' : 'level-select') : 'name-entry');
        } else {
          debug('Running in BLOCKCHAIN MODE');

          // Setup Dojo
          await setupDojo();

          // Create burner account for session
          const burnerAccount = await createBurnerAccount();
          setAccount(burnerAccount);

          // Create game controller
          const controller = createGameController(burnerAccount);
          setGameController(controller);

          debug('Blockchain initialization complete!');
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

    window.history.replaceState({}, '', buildCleanRoomUrl(room.id));
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
    window.history.replaceState({}, '', buildCleanAppUrl());
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

  const navActive: NavKey =
    screen === 'dashboard' ? 'dashboard'
    : screen === 'activities' ? 'activities'
    : screen === 'collection' ? 'collection'
    : 'museum';

  const handleNavigate = (key: NavKey) => {
    if (key === 'dashboard') return setScreen('dashboard');
    if (key === 'activities') return setScreen('activities');
    if (key === 'collection') return setScreen('collection');
    // "Enter Museum" from inside a game confirms before discarding the run.
    return handleBackToDifficulty();
  };

  const handlePlayBoss = async (era: Difficulty, level: number) => {
    await startLevelGame(era, level, false);
    setScreen('game');
  };

  const handlePlayDuel = async (duel: { id: string; era: number; level: number; seed: number }) => {
    await startChallengeRoomGame({
      id: duel.id,
      difficulty: duel.era as Difficulty,
      level: duel.level,
      seed: duel.seed,
    });
    setScreen('game');
  };

  // Name entry owns the whole viewport — no chrome, no nav.
  if (screen === 'name-entry') {
    return (
      <div className={`theme-${theme} mu-vignette relative min-h-dvh`} style={{ color: 'var(--mu-text)' }}>
        <MuseumBackground era={null} />
        <NameEntry onContinue={() => setScreen(pendingRoomId ? 'challenge-room' : 'level-select')} />
        <IntroCinematic
          mode="opening"
          open={showOpeningIntro}
          onComplete={() => { setShowOpeningIntro(false); setShowSplashIntro(true); }}
        />
        <IntroCinematic
          mode="splash"
          open={showSplashIntro}
          onComplete={() => { setShowSplashIntro(false); setStartupIntroResolved(true); }}
        />
      </div>
    );
  }

  return (
    <div className={`theme-${theme} mu-vignette relative min-h-dvh`} style={{ color: 'var(--mu-text)' }}>
      {/* Ambience takes the era of whatever is being played */}
      <MuseumBackground era={screen === 'game' ? currentEra : null} level={currentLevel} />

      <AppShell
        active={navActive}
        onNavigate={handleNavigate}
        topSlot={
          screen === 'game' && currentGame ? (
            <button onClick={handleLeaveGame} className="mu-btn-ghost px-3 py-1.5 text-sm">
              ← Leave run
            </button>
          ) : null
        }
      >
        {screen === 'level-select' && (
          <LevelSelector
            onStart={handleLevelStart}
            onStartWeekly={async () => { await startWeeklyChallenge(); setScreen('game'); }}
            onCreateChallenge={handleCreateChallenge}
          />
        )}

        {screen === 'challenge-room' && activeRoomId && (
          <ChallengeRoom roomId={activeRoomId} onBack={handleLeaveRoom} onPlay={handleOpenRoom} />
        )}

        {screen === 'game' && currentGame && !showLevelIntro && <GameBoard />}

        {screen === 'activities' && (
          <Activities onPlayBoss={handlePlayBoss} onPlayDuel={handlePlayDuel} />
        )}

        {screen === 'collection' && <Collection />}

        {screen === 'dashboard' && <UserDashboard />}
      </AppShell>

      {showWinModal && (
        <WinModal
          onClose={handleWinModalClose}
          onNextLevel={currentEra !== null && challengeMode !== 'room' ? handleNextLevel : undefined}
          onShowGhostReplay={handleShowGhostReplay}
        />
      )}

      {showGhostReplay && ghostReplayData && (
        <GhostReplayModal replay={ghostReplayData} onClose={handleGhostReplayClose} />
      )}

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
