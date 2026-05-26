"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const gameStore_1 = require("./store/gameStore");
const setup_1 = require("./dojo/setup");
const gameController_1 = require("./dojo/gameController");
const telegram_1 = require("./telegram/telegram");
const types_1 = require("./types");
const ghostReplay_1 = require("./store/ghostReplay");
const startupIntro_1 = require("../../shared/startupIntro");
// Components
const LoadingScreen_1 = require("./components/LoadingScreen");
const NameEntry_1 = require("./components/NameEntry");
const DifficultySelector_1 = require("./components/DifficultySelector");
const GameBoard_1 = require("./components/GameBoard");
const WinModal_1 = require("./components/WinModal");
const Header_1 = require("./components/Header");
const Leaderboard_1 = require("./components/Leaderboard");
const TelegramRequired_1 = require("./components/TelegramRequired");
const UserDashboard_1 = require("./components/UserDashboard");
const FarewellScreen_1 = require("./components/FarewellScreen");
const Waves_1 = require("./components/Waves");
const LevelSelector_1 = require("./components/LevelSelector");
const AchievementToast_1 = require("./components/AchievementToast");
const GhostReplayModal_1 = require("./components/GhostReplayModal");
const IntroCinematic_1 = require("./components/IntroCinematic");
function App() {
    const [screen, setScreen] = (0, react_1.useState)('loading');
    const [isInitializing, setIsInitializing] = (0, react_1.useState)(true);
    const [showGhostReplay, setShowGhostReplay] = (0, react_1.useState)(false);
    const [ghostReplayData, setGhostReplayData] = (0, react_1.useState)(null);
    const [showOpeningIntro, setShowOpeningIntro] = (0, react_1.useState)(false);
    const [showSplashIntro, setShowSplashIntro] = (0, react_1.useState)(false);
    const [showLevelIntro, setShowLevelIntro] = (0, react_1.useState)(false);
    const [startupIntroResolved, setStartupIntroResolved] = (0, react_1.useState)(false);
    const { telegramUser, setTelegramUser, setAccount, setGameController, playerName, currentGame, showWinModal, resetGame, theme, startLevelGame, startWeeklyChallenge, currentEra, currentLevel, newlyUnlockedAchievements, clearNewAchievements, hydratePlayerProgress, } = (0, gameStore_1.useGameStore)();
    (0, react_1.useEffect)(() => {
        const hasSeenOpening = localStorage.getItem('memorabilia_seen_opening_intro') === '1';
        const introState = (0, startupIntro_1.resolveStartupIntroState)(hasSeenOpening);
        setShowOpeningIntro(introState.showOpeningIntro);
        setShowSplashIntro(introState.showSplashIntro);
        if (!hasSeenOpening)
            localStorage.setItem('memorabilia_seen_opening_intro', '1');
        setStartupIntroResolved(true);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!currentGame || screen !== 'game')
            return;
        setShowLevelIntro(true);
    }, [currentGame?.game_id, screen]);
    // Initialize app
    (0, react_1.useEffect)(() => {
        async function initialize() {
            try {
                console.log('🚀 Initializing Memorabilia...');
                // Initialize Telegram — get real user, no fallback
                const user = (0, telegram_1.initTelegramApp)() ?? (0, telegram_1.getTelegramUser)();
                setTelegramUser(user);
                // Apply Telegram theme
                const themeColors = (0, telegram_1.getThemeColors)();
                document.documentElement.style.setProperty('--tg-bg-color', themeColors.bgColor);
                document.documentElement.style.setProperty('--tg-text-color', themeColors.textColor);
                // Check if we have a world address (blockchain mode) or demo mode
                const worldAddress = import.meta.env.VITE_WORLD_ADDRESS;
                const isDemoMode = !worldAddress || worldAddress === '0x' || worldAddress === '';
                if (isDemoMode) {
                    console.log('🎮 Running in DEMO MODE (no blockchain required)');
                    setIsInitializing(false);
                    const savedName = localStorage.getItem('memorabilia_player_name');
                    // Go to level-select (new main menu) if name is saved, else name-entry
                    setScreen(savedName ? 'level-select' : 'name-entry');
                }
                else {
                    console.log('⛓️ Running in BLOCKCHAIN MODE');
                    // Setup Dojo
                    await (0, setup_1.setupDojo)();
                    // Create burner account for session
                    const burnerAccount = await (0, setup_1.createBurnerAccount)();
                    setAccount(burnerAccount);
                    // Create game controller
                    const controller = (0, gameController_1.createGameController)(burnerAccount);
                    setGameController(controller);
                    console.log('✅ Blockchain initialization complete!');
                    setIsInitializing(false);
                    const savedName = localStorage.getItem('memorabilia_player_name');
                    // Go to level-select if name saved, else name-entry
                    setScreen(savedName ? 'level-select' : 'name-entry');
                }
            }
            catch (error) {
                console.error('❌ Initialization failed:', error);
                setIsInitializing(false);
                const savedName = localStorage.getItem('memorabilia_player_name');
                setScreen(savedName ? 'level-select' : 'name-entry');
            }
        }
        initialize();
    }, [setTelegramUser, setAccount, setGameController]);
    (0, react_1.useEffect)(() => {
        if (telegramUser?.id) {
            hydratePlayerProgress();
        }
    }, [telegramUser?.id, hydratePlayerProgress]);
    // Handle game state changes
    (0, react_1.useEffect)(() => {
        if (currentGame && screen !== 'game') {
            setScreen('game');
        }
    }, [currentGame, screen]);
    const handleWinModalClose = () => {
        // Check if a ghost replay is available for the completed era/level
        if (currentEra !== null) {
            const replay = (0, ghostReplay_1.loadGhostReplay)(currentEra, currentLevel);
            if (replay) {
                setGhostReplayData(replay);
            }
        }
        resetGame();
        setScreen('level-select');
    };
    const handleNextLevel = async () => {
        if (currentEra === null)
            return;
        const nextLevel = currentLevel + 1;
        resetGame();
        if (nextLevel > (0, types_1.getMaxLevelForEra)(currentEra))
            return;
        await startLevelGame(currentEra, nextLevel, false);
        setScreen('game');
    };
    const handleShowGhostReplay = () => {
        // Load the latest best replay when triggered from WinModal
        if (currentEra !== null) {
            const replay = (0, ghostReplay_1.loadGhostReplay)(currentEra, currentLevel);
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
        }
        else {
            setScreen('level-select');
        }
    };
    const handleLeaveGame = () => {
        if (currentGame) {
            if (confirm('Quit and return to menu?')) {
                resetGame();
                setScreen('farewell');
            }
        }
        else {
            setScreen('farewell');
        }
    };
    const handleLevelStart = async (era, level, isDailyChallenge) => {
        await startLevelGame(era, level, isDailyChallenge);
        setScreen('game');
    };
    const handleSwitchToLevels = () => {
        setScreen('level-select');
    };
    const isStartupIntroVisible = showOpeningIntro || showSplashIntro;
    if ((isInitializing || !startupIntroResolved) && !isStartupIntroVisible) {
        return (0, jsx_runtime_1.jsx)(LoadingScreen_1.default, {});
    }
    // Gate 1 — must be inside Telegram WebApp
    if (!(0, telegram_1.isTelegramWebApp)()) {
        return (0, jsx_runtime_1.jsx)(TelegramRequired_1.default, {});
    }
    // Gate 2 — Telegram must have provided real user data
    if (!telegramUser || telegramUser.id === 0) {
        return (0, jsx_runtime_1.jsx)(TelegramRequired_1.default, {});
    }
    // Farewell screen
    if (screen === 'farewell') {
        return (0, jsx_runtime_1.jsx)(FarewellScreen_1.default, { onPlayAgain: () => setScreen('level-select') });
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: `min-h-screen theme-${theme} relative`, style: { backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }, children: [(0, jsx_runtime_1.jsx)(Waves_1.default, { lineColor: "rgba(255, 255, 255, 0.12)", backgroundColor: "transparent", waveSpeedX: 0.0125, waveSpeedY: 0.005, waveAmpX: 32, waveAmpY: 16, xGap: 10, yGap: 32, friction: 0.925, tension: 0.005, maxCursorMove: 100 }), (0, jsx_runtime_1.jsxs)("div", { className: "relative z-10", children: [screen !== 'name-entry' && ((0, jsx_runtime_1.jsx)(Header_1.default, { onShowLeaderboard: handleShowLeaderboard, onBackToDifficulty: handleBackToDifficulty, onShowDashboard: handleShowDashboard, onLeave: handleLeaveGame, currentScreen: screen })), (0, jsx_runtime_1.jsxs)("main", { className: "container mx-auto px-3 sm:px-4 py-4 sm:py-8", children: [screen === 'name-entry' && ((0, jsx_runtime_1.jsx)(NameEntry_1.default, { onContinue: () => setScreen('level-select') })), screen === 'level-select' && ((0, jsx_runtime_1.jsx)(LevelSelector_1.default, { onStart: handleLevelStart, onStartWeekly: async () => {
                                    await startWeeklyChallenge();
                                    setScreen('game');
                                } })), screen === 'difficulty' && ((0, jsx_runtime_1.jsx)(DifficultySelector_1.default, { onStart: () => setScreen('game'), onSwitchToLevels: handleSwitchToLevels })), screen === 'game' && currentGame && (!showLevelIntro ? (0, jsx_runtime_1.jsx)(GameBoard_1.default, {}) : null), screen === 'leaderboard' && ((0, jsx_runtime_1.jsx)(Leaderboard_1.default, { onBack: handleBackToDifficulty })), screen === 'dashboard' && ((0, jsx_runtime_1.jsx)(UserDashboard_1.default, {}))] }), showWinModal && ((0, jsx_runtime_1.jsx)(WinModal_1.default, { onClose: handleWinModalClose, onNextLevel: currentEra !== null ? handleNextLevel : undefined, onShowGhostReplay: handleShowGhostReplay })), showGhostReplay && ghostReplayData && ((0, jsx_runtime_1.jsx)(GhostReplayModal_1.default, { replay: ghostReplayData, onClose: handleGhostReplayClose }))] }), (0, jsx_runtime_1.jsx)(AchievementToast_1.default, { achievements: newlyUnlockedAchievements, onDismiss: clearNewAchievements }), (0, jsx_runtime_1.jsx)(IntroCinematic_1.default, { mode: "opening", open: showOpeningIntro, onComplete: () => {
                    setShowOpeningIntro(false);
                    setShowSplashIntro(true);
                } }), (0, jsx_runtime_1.jsx)(IntroCinematic_1.default, { mode: "splash", open: showSplashIntro, onComplete: () => {
                    setShowSplashIntro(false);
                    setStartupIntroResolved(true);
                } }), (0, jsx_runtime_1.jsx)(IntroCinematic_1.default, { mode: "level", open: showLevelIntro && !!currentGame && screen === 'game', era: currentEra, level: currentLevel, onComplete: () => setShowLevelIntro(false) })] }));
}
exports.default = App;
