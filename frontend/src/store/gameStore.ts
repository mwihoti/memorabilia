import { create } from 'zustand';
import { Account } from 'starknet';
import {
  GameState, Difficulty, Card, PlayerStats, LeaderboardEntry, TelegramUser,
  GAME_CONFIGS, calculateStars, calculateStars as _calcStars,
  ComboState, LevelProgress, TimeMedal, ReplayMove, Achievement, DailyStreak,
  ERA_LEVEL_CONFIGS, EraLevel,
  getComboMultiplier, getTimeMedal, getTimeBonusScore, getStreakMultiplier, isEraUnlocked,
} from '../types';
import { GameController } from '../dojo/gameController';
import {
  createDemoGame, checkCardsMatch, calculateScore, getEmojisForDifficulty,
  createLevelGame, calculateLevelScore,
} from './demoGame';
import { playFlipSound, playMatchSound, playMismatchSound, playVictorySound } from '../utils/sounds';
import { cartridgeController } from '../cartridge/CartridgeController';
import { mintScoreNFT } from '../cartridge/nftMinter';
import { addGameScore, saveLevelProgress, getAllLevelProgress } from './playerStorage';
import { submitScore } from '../lib/api';
import { checkAndUnlockAchievements } from './achievementStore';
import { loadStreak, recordGamePlayed } from './streakStore';
import { saveDailyChallenge } from './dailyChallenge';
import { buildReplay, saveGhostReplayIfBest } from './ghostReplay';

export type Theme = 'museum' | 'nature' | 'urban';

interface GameStore {
  // User & Account
  telegramUser: TelegramUser | null;
  playerName: string | null;
  theme: Theme;
  account: Account | null;
  isAccountLoading: boolean;

  // Wallet State (Cartridge Controller)
  walletAddress: string | null;
  isWalletConnected: boolean;
  isWalletConnecting: boolean;
  walletUsername: string | null;

  // NFT Minting State
  isMinting: boolean;
  mintTxHash: string | null;
  mintError: string | null;

  // Game State
  currentGame: GameState | null;
  gameController: GameController | null;
  isGameLoading: boolean;

  // UI State
  selectedDifficulty: Difficulty | null;
  flippedCards: number[];
  isChecking: boolean;
  showWinModal: boolean;

  // Stats & Leaderboard
  playerStats: PlayerStats | null;
  leaderboard: LeaderboardEntry[];

  // ── Level System State ─────────────────────────────────────────────────────
  currentEra: Difficulty | null;
  currentLevel: number;
  combo: ComboState;
  mismatches: number;
  maxCombo: number;
  replayMoves: ReplayMove[];
  gameStartMs: number;
  isDailyChallenge: boolean;
  levelProgress: LevelProgress[];
  streak: DailyStreak;
  newlyUnlockedAchievements: Achievement[];

  // Actions
  setTelegramUser: (user: TelegramUser | null) => void;
  setPlayerName: (name: string) => void;
  setTheme: (theme: Theme) => void;
  setAccount: (account: Account | null) => void;
  setGameController: (controller: GameController | null) => void;

  // Wallet Actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;

  // NFT Actions
  mintNFT: () => Promise<void>;
  clearMintError: () => void;

  // Game Actions
  startNewGame: (difficulty: Difficulty) => Promise<void>;
  flipCard: (index: number) => Promise<void>;
  checkMatch: () => Promise<void>;
  abandonGame: () => Promise<void>;
  resetGame: () => void;

  // ── Level System Actions ───────────────────────────────────────────────────
  setCurrentLevel: (era: Difficulty, level: number) => void;
  startLevelGame: (era: Difficulty, level: number, isDailyChallenge?: boolean) => Promise<void>;
  clearNewAchievements: () => void;
  loadLevelProgress: () => void;

  // UI Actions
  setSelectedDifficulty: (difficulty: Difficulty | null) => void;
  setShowWinModal: (show: boolean) => void;

  // Stats Actions
  setPlayerStats: (stats: PlayerStats | null) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial State
  telegramUser: null,
  playerName: localStorage.getItem('memorabilia_player_name') || null,
  theme: (localStorage.getItem('memorabilia_theme') as Theme) || 'museum',
  account: null,
  isAccountLoading: false,

  // Wallet State
  walletAddress: null,
  isWalletConnected: false,
  isWalletConnecting: false,
  walletUsername: null,

  // NFT Minting State
  isMinting: false,
  mintTxHash: null,
  mintError: null,

  currentGame: null,
  gameController: null,
  isGameLoading: false,

  selectedDifficulty: null,
  flippedCards: [],
  isChecking: false,
  showWinModal: false,

  playerStats: null,
  leaderboard: [],

  // Level System initial state
  currentEra: null,
  currentLevel: 1,
  combo: { count: 0, multiplier: 1 },
  mismatches: 0,
  maxCombo: 0,
  replayMoves: [],
  gameStartMs: 0,
  isDailyChallenge: false,
  levelProgress: getAllLevelProgress(),
  streak: loadStreak(),
  newlyUnlockedAchievements: [],

  // Setters
  setTelegramUser: (user) => set({ telegramUser: user }),
  setPlayerName: (name) => set({ playerName: name }),
  setTheme: (theme) => { localStorage.setItem('memorabilia_theme', theme); set({ theme }); },
  setAccount: (account) => set({ account }),
  setGameController: (controller) => set({ gameController: controller }),

  // Wallet Actions
  connectWallet: async () => {
    set({ isWalletConnecting: true });

    try {
      console.log('🔌 Connecting wallet...');
      const result = await cartridgeController.connect();

      set({
        walletAddress: result.address,
        walletUsername: result.username,
        isWalletConnected: true,
        isWalletConnecting: false,
      });

      console.log('✅ Wallet connected:', result.address);
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      set({ isWalletConnecting: false });
      throw error;
    }
  },

  disconnectWallet: async () => {
    try {
      console.log('🔌 Disconnecting wallet...');
      await cartridgeController.disconnect();

      set({
        walletAddress: null,
        walletUsername: null,
        isWalletConnected: false,
        mintTxHash: null,
        mintError: null,
      });

      console.log('✅ Wallet disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect wallet:', error);
      throw error;
    }
  },

  // NFT Actions
  mintNFT: async () => {
    const { currentGame, walletAddress } = get();

    if (!currentGame) {
      console.error('No active game');
      return;
    }

    if (!walletAddress) {
      set({ mintError: 'Wallet not connected' });
      return;
    }

    set({ isMinting: true, mintError: null, mintTxHash: null });

    try {
      console.log('🎨 Minting NFT for score:', currentGame.score);

      const result = await mintScoreNFT({
        recipient: walletAddress,
        score: currentGame.score,
        timestamp: Math.floor(Date.now() / 1000),
        gameId: currentGame.game_id,
        difficulty: currentGame.difficulty,
      });

      if (result.success) {
        set({
          isMinting: false,
          mintTxHash: result.transactionHash || null,
          mintError: null,
        });
        console.log('✅ NFT minted successfully!', result.transactionHash);
      } else {
        set({
          isMinting: false,
          mintError: result.error || 'Failed to mint NFT',
        });
        console.error('❌ Failed to mint NFT:', result.error);
      }
    } catch (error: any) {
      console.error('❌ Failed to mint NFT:', error);
      set({
        isMinting: false,
        mintError: error.message || 'Failed to mint NFT',
      });
    }
  },

  clearMintError: () => set({ mintError: null }),

  // Game Actions
  startNewGame: async (difficulty: Difficulty) => {
    const { gameController } = get();

    set({ isGameLoading: true });

    try {
      // Check if we're in demo mode (no game controller)
      if (!gameController) {
        console.log('🎮 Starting game in DEMO MODE');

        // Create demo game
        const newGame = createDemoGame(difficulty);

        set({
          currentGame: newGame,
          selectedDifficulty: difficulty,
          flippedCards: [],
          isGameLoading: false,
          showWinModal: false,
        });

        return;
      }

      // Blockchain mode
      console.log('⛓️ Starting game on blockchain');
      const gameId = await gameController.startGame(difficulty);
      
      // Get era-specific emojis for this game
      const eraEmojis = getEmojisForDifficulty(difficulty);
      const totalPairs = difficulty === Difficulty.Easy ? 4 : difficulty === Difficulty.Medium ? 8 : 12;
      const selectedEmojis = eraEmojis.slice(0, totalPairs);
      
      // Create initial game state
      const newGame: GameState = {
        game_id: gameId,
        player: get().account?.address || '',
        difficulty,
        cards: [],
        emojis: selectedEmojis, // Add era-specific emojis
        flipped_indices: [],
        matched_count: 0,
        total_pairs: totalPairs,
        moves: 0,
        score: 0,
        started_at: Date.now(),
        completed_at: 0,
        status: 0, // Active
        elapsed_time: 0,
      };

      set({
        currentGame: newGame,
        selectedDifficulty: difficulty,
        flippedCards: [],
        isGameLoading: false,
        showWinModal: false,
      });
    } catch (error) {
      console.error('Failed to start game:', error);
      set({ isGameLoading: false });
    }
  },
  
  flipCard: async (index: number) => {
    const { currentGame, gameController, flippedCards, isChecking } = get();

    if (!currentGame || isChecking) {
      return;
    }

    // Can't flip more than 2 cards
    if (flippedCards.length >= 2) {
      return;
    }

    // Can't flip already flipped card
    if (flippedCards.includes(index)) {
      return;
    }

    // Can't flip matched card
    const card = currentGame.cards[index];
    if (card?.is_matched) {
      return;
    }

    try {
      // Play flip sound
      playFlipSound();

      // Demo mode - just update local state
      if (!gameController) {
        const newFlippedCards = [...flippedCards, index];
        set({ flippedCards: newFlippedCards });

        // If 2 cards are flipped, check for match after a short delay
        if (newFlippedCards.length === 2) {
          setTimeout(() => {
            get().checkMatch();
          }, 350);
        }
        return;
      }

      // Blockchain mode
      await gameController.flipCard(currentGame.game_id, index);

      const newFlippedCards = [...flippedCards, index];
      set({ flippedCards: newFlippedCards });

      // If 2 cards are flipped, check for match
      if (newFlippedCards.length === 2) {
        setTimeout(() => {
          get().checkMatch();
        }, 350);
      }
    } catch (error) {
      console.error('Failed to flip card:', error);
    }
  },
  
  checkMatch: async () => {
    const { currentGame, gameController, flippedCards } = get();

    if (!currentGame || flippedCards.length !== 2) {
      return;
    }

    set({ isChecking: true });

    try {
      let isMatch = false;

      // Demo mode - check match locally
      if (!gameController) {
        isMatch = checkCardsMatch(currentGame, flippedCards[0], flippedCards[1]);
      } else {
        // Blockchain mode
        isMatch = await gameController.checkMatch(currentGame.game_id);
      }

      if (isMatch) {
        // Play match sound
        playMatchSound();

        // Update cards to mark as matched
        const updatedCards = currentGame.cards.map((card, idx) => {
          if (flippedCards.includes(idx)) {
            return { ...card, is_matched: true, is_flipped: true };
          }
          return card;
        });

        // Update matched count
        const newMatchedCount = currentGame.matched_count + 1;
        const newMoves = currentGame.moves + 1;

        // ── Combo tracking (demo mode only) ───────────────────────────────
        const { combo, maxCombo: prevMaxCombo, replayMoves, gameStartMs, currentEra, currentLevel } = get();
        const newComboCount  = !gameController ? combo.count + 1 : combo.count;
        const newMultiplier  = !gameController ? getComboMultiplier(newComboCount) : combo.multiplier;
        const newMaxCombo    = Math.max(prevMaxCombo, newComboCount);

        // Record replay moves
        const nowMs = Date.now();
        const newReplayMoves: ReplayMove[] = !gameController
          ? [
              ...replayMoves,
              { cardIndex: flippedCards[0], timestamp: nowMs - gameStartMs },
              { cardIndex: flippedCards[1], timestamp: nowMs - gameStartMs + 1 },
            ]
          : replayMoves;

        if (!gameController) {
          set({ combo: { count: newComboCount, multiplier: newMultiplier }, maxCombo: newMaxCombo, replayMoves: newReplayMoves });
        }

        // Calculate score
        const score = calculateScore({
          ...currentGame,
          moves: newMoves,
          matched_count: newMatchedCount,
        });

        const updatedGame = {
          ...currentGame,
          cards: updatedCards,
          matched_count: newMatchedCount,
          moves: newMoves,
          score,
        };

        set({
          currentGame: updatedGame,
          flippedCards: [],
          isChecking: false,
        });

        // Check if game is won
        if (newMatchedCount === currentGame.total_pairs) {
          const completedAt = Date.now();
          const finalGame = {
            ...updatedGame,
            completed_at: completedAt,
            status: 1, // Completed
          };

          set({ currentGame: finalGame });

          // ── Level-aware completion (demo mode) ─────────────────────────
          if (!gameController && currentEra !== null) {
            const elapsedSeconds = Math.floor((completedAt - currentGame.started_at) / 1000);
            const levelConfig: EraLevel = ERA_LEVEL_CONFIGS[currentEra][currentLevel - 1];
            const medal    = getTimeMedal(elapsedSeconds, levelConfig);
            const timeBonus = getTimeBonusScore(elapsedSeconds, levelConfig);
            const finalMaxCombo  = newMaxCombo;
            const levelScore = calculateLevelScore(finalGame, finalMaxCombo, timeBonus);
            const stars      = calculateStars(finalGame.moves, levelConfig.optimalMoves);

            // Update streak
            const updatedStreak = recordGamePlayed();

            // Save level progress
            const progress: LevelProgress = {
              era:         currentEra,
              level:       currentLevel,
              completed:   true,
              bestScore:   levelScore,
              bestTime:    elapsedSeconds,
              bestMedal:   medal,
              stars,
              completedAt: completedAt,
            };
            saveLevelProgress(progress);
            const updatedLevelProgress = getAllLevelProgress();

            // Daily challenge
            const { isDailyChallenge } = get();
            if (isDailyChallenge) {
              saveDailyChallenge(levelScore, medal);
            }

            // Ghost replay
            const { replayMoves: finalReplayMoves } = get();
            const replay = buildReplay(
              finalGame.game_id,
              currentEra,
              currentLevel,
              finalReplayMoves,
              completedAt - currentGame.started_at,
              levelScore,
              finalGame.emojis,
            );
            saveGhostReplayIfBest(replay);

            // Achievements
            const newAchievements = checkAndUnlockAchievements({
              gameCompleted:   true,
              elapsedSeconds,
              mismatches:      get().mismatches,
              maxCombo:        finalMaxCombo,
              medal,
              era:             currentEra,
              level:           currentLevel,
              levelProgress:   updatedLevelProgress,
              streak:          updatedStreak,
              isDailyChallenge,
            });

            set({
              levelProgress:              updatedLevelProgress,
              streak:                     updatedStreak,
              newlyUnlockedAchievements:  newAchievements,
            });
          }

          // Save score to local storage
          const { telegramUser, playerName: storedName } = get();
          if (telegramUser) {
            const elapsedTime = Math.floor((completedAt - currentGame.started_at) / 1000);
            const playerName = storedName || telegramUser.first_name || 'Anonymous Player';

            console.log('🎯 Game Completed - Saving Score:', {
              telegramId: telegramUser.id,
              playerName: playerName,
              score: finalGame.score,
              difficulty: finalGame.difficulty,
              moves: finalGame.moves,
              time: elapsedTime,
            });

            addGameScore(
              telegramUser.id,
              playerName,
              finalGame.score,
              finalGame.difficulty,
              finalGame.moves,
              elapsedTime,
              true // isWin
            );

            // Submit to Neon DB (non-blocking — don't await so game flow continues)
            const config = GAME_CONFIGS[finalGame.difficulty];
            const stars = calculateStars(finalGame.moves, config.optimalMoves);

            submitScore({
              telegramUser: {
                id: telegramUser.id,
                username: telegramUser.username,
                first_name: telegramUser.first_name,
                last_name: telegramUser.last_name,
              },
              score: finalGame.score,
              difficulty: finalGame.difficulty,
              moves: finalGame.moves,
              timeSeconds: elapsedTime,
              stars,
            })
              .then((result) => {
                console.log(`✅ Score saved to Neon — Rank #${result.rank} of ${result.totalPlayers}${result.isNewBest ? ' (new personal best!)' : ''}`);
              })
              .catch((err) => {
                console.warn('⚠️ Neon score submit failed (localStorage still saved):', err.message);
              });

            console.log('✅ Score saved to player dashboard');
          } else {
            console.warn('⚠️ No telegram user found, score not saved');
          }

          // Play victory sound
          setTimeout(() => {
            playVictorySound();
            set({ showWinModal: true });
          }, 500);
        }
      } else {
        // Play mismatch sound
        playMismatchSound();

        // Combo reset and mismatch tracking (demo mode only)
        if (!gameController) {
          const { mismatches } = get();
          set({
            combo:      { count: 0, multiplier: 1 },
            mismatches: mismatches + 1,
          });
        }

        // Not a match - flip cards back after delay
        setTimeout(() => {
          set({
            flippedCards: [],
            isChecking: false,
            currentGame: {
              ...currentGame,
              moves: currentGame.moves + 1,
            },
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to check match:', error);
      set({ isChecking: false, flippedCards: [] });
    }
  },
  
  abandonGame: async () => {
    const { currentGame, gameController } = get();

    if (!currentGame) {
      return;
    }

    try {
      // Only call blockchain if we have a controller
      if (gameController) {
        await gameController.abandonGame(currentGame.game_id);
      }

      set({
        currentGame: null,
        flippedCards: [],
        selectedDifficulty: null,
      });
    } catch (error) {
      console.error('Failed to abandon game:', error);
    }
  },
  
  resetGame: () => {
    set({
      currentGame: null,
      flippedCards: [],
      selectedDifficulty: null,
      showWinModal: false,
      isChecking: false,
    });
  },
  
  // ── Level System Actions ───────────────────────────────────────────────────

  setCurrentLevel: (era: Difficulty, level: number) => {
    set({ currentEra: era, currentLevel: level });
  },

  startLevelGame: async (era: Difficulty, level: number, isDailyChallenge = false) => {
    set({ isGameLoading: true });
    try {
      const newGame = createLevelGame(era, level);
      set({
        currentGame:               newGame,
        selectedDifficulty:        era,
        flippedCards:              [],
        isGameLoading:             false,
        showWinModal:              false,
        currentEra:                era,
        currentLevel:              level,
        combo:                     { count: 0, multiplier: 1 },
        mismatches:                0,
        maxCombo:                  0,
        replayMoves:               [],
        gameStartMs:               Date.now(),
        isDailyChallenge,
        newlyUnlockedAchievements: [],
      });
    } catch (error) {
      console.error('Failed to start level game:', error);
      set({ isGameLoading: false });
    }
  },

  clearNewAchievements: () => set({ newlyUnlockedAchievements: [] }),

  loadLevelProgress: () => {
    set({ levelProgress: getAllLevelProgress(), streak: loadStreak() });
  },

  // UI Actions
  setSelectedDifficulty: (difficulty) => set({ selectedDifficulty: difficulty }),
  setShowWinModal: (show) => set({ showWinModal: show }),
  
  // Stats Actions
  setPlayerStats: (stats) => set({ playerStats: stats }),
  setLeaderboard: (entries) => set({ leaderboard: entries }),
}));

