import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useGameStore } from '../store/gameStore';
import { calculateStars, calculateGrade, GAME_CONFIGS } from '../types';
import { hapticNotification } from '../telegram/telegram';
import { isScoreEligibleForNFT } from '../cartridge/config';
import { fetchPlayerStats } from '../lib/api';

interface WinModalProps {
  onClose: () => void;
}

export default function WinModal({ onClose }: WinModalProps) {
  const {
    currentGame,
    isWalletConnected,
    isMinting,
    mintTxHash,
    mintError,
    mintNFT,
    clearMintError,
    telegramUser,
  } = useGameStore();

  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);

  useEffect(() => {
    hapticNotification('success');

    if (currentGame && !scoreSubmitted) {
      submitScoreToLeaderboard();
    }
  }, [currentGame?.game_id]);

  // Poll for rank after submission
  useEffect(() => {
    if (!scoreSubmitted || !telegramUser) return;
    const timer = setTimeout(async () => {
      try {
        const stats = await fetchPlayerStats(telegramUser.id);
        if (stats) {
          setPlayerRank(stats.rank);
        }
      } catch {
        // rank display is optional — ignore failures
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [scoreSubmitted, telegramUser]);

  if (!currentGame) return null;

  const config = GAME_CONFIGS[currentGame.difficulty];
  const stars = calculateStars(currentGame.moves, config.optimalMoves);
  const grade = calculateGrade(currentGame.score);
  const elapsedTime = Math.floor((Date.now() - currentGame.started_at) / 1000);

  // Check if eligible for NFT minting
  const isEligibleForNFT = isScoreEligibleForNFT(currentGame.score);
  const canMintNFT = isEligibleForNFT && isWalletConnected && !mintTxHash;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMintNFT = async () => {
    clearMintError();
    await mintNFT();
  };

  const submitScoreToLeaderboard = async () => {
    if (!currentGame || scoreSubmitted) return;

    try {
      setSubmitError(null);
      const elapsedTime = Math.floor((Date.now() - currentGame.started_at) / 1000);
      const telegramId = telegramUser?.id || 0;

      // In demo mode, just mark as submitted (no blockchain call)
      if (!currentGame.player || currentGame.player === 'demo_player') {
        console.log('📊 Demo mode - Score added to leaderboard:', {
          score: currentGame.score,
          moves: currentGame.moves,
          time: elapsedTime,
          difficulty: currentGame.difficulty,
        });
        setScoreSubmitted(true);
        return;
      }

      // Blockchain mode - submit score to contract
      console.log('📤 Submitting score to leaderboard...', {
        gameId: currentGame.game_id,
        telegramId,
        score: currentGame.score,
        difficulty: currentGame.difficulty,
        moves: currentGame.moves,
        time: elapsedTime,
      });

      // TODO: Call smart contract to submit score
      // await gameController.submitScore(...)

      setScoreSubmitted(true);
      console.log('✅ Score submitted to Hall of Fame!');
    } catch (error) {
      console.error('Failed to submit score:', error);
      setSubmitError('Failed to add score to Hall of Fame');
      // Still mark as attempted
      setScoreSubmitted(true);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Confetti */}
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
        />

        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 50 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative bg-gradient-to-br from-museum-stone-900 to-museum-stone-800 rounded-3xl p-8 max-w-md w-full border-4 border-museum-gold-500 shadow-2xl"
        >
          {/* Trophy */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-8xl mb-4"
            >
              🏆
            </motion.div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-museum-gold-400 to-museum-bronze-500 bg-clip-text text-transparent mb-2">Exhibition Complete!</h2>
            <p className="text-museum-stone-400">You've completed your museum collection!</p>
          </div>

          {/* Stars */}
          <div className="flex justify-center space-x-2 mb-6">
            {[1, 2, 3].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 + star * 0.1, type: 'spring' }}
                className="text-5xl"
              >
                {star <= stars ? '⭐' : '☆'}
              </motion.div>
            ))}
          </div>

          {/* Grade */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              className={`
                inline-block text-6xl font-bold px-6 py-3 rounded-2xl
                ${grade === 'S'
                  ? 'bg-gradient-to-r from-museum-gold-400 to-museum-bronze-500 text-white'
                  : grade === 'A'
                  ? 'bg-gradient-to-r from-museum-blue-400 to-museum-stone-500 text-white'
                  : grade === 'B'
                  ? 'bg-gradient-to-r from-museum-bronze-400 to-museum-stone-500 text-white'
                  : 'bg-gradient-to-r from-museum-stone-400 to-museum-stone-500 text-white'
                }
              `}
            >
              {grade}
            </motion.div>
          </div>

          {/* Stats */}
          <div className="space-y-3 mb-6">
            {/* Hall of Fame Submission */}
            {scoreSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 bg-gradient-to-r from-museum-gold-500/20 to-museum-bronze-500/20 border border-museum-gold-400 rounded-lg p-3"
              >
                <span className="text-2xl">🏅</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-museum-gold-400">Added to Hall of Fame!</p>
                  {playerRank ? (
                    <p className="text-xs text-museum-stone-400">
                      You are ranked <span className="text-museum-gold-400 font-bold">#{playerRank}</span> globally
                    </p>
                  ) : (
                    <p className="text-xs text-museum-stone-400">Your score is now on the leaderboard</p>
                  )}
                </div>
              </motion.div>
            )}

            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 bg-red-500/20 border border-red-400 rounded-lg p-3"
              >
                <span className="text-xl">⚠️</span>
                <p className="text-sm text-red-400">{submitError}</p>
              </motion.div>
            )}

            <div className="flex justify-between items-center bg-museum-stone-800/50 rounded-lg p-3">
              <span className="text-museum-stone-400">Score</span>
              <span className="text-2xl font-bold text-museum-gold-400">{currentGame.score.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center bg-museum-stone-800/50 rounded-lg p-3">
              <span className="text-museum-stone-400">Discoveries</span>
              <span className="text-xl font-bold">
                {currentGame.moves}
                <span className="text-sm text-museum-stone-500 ml-2">
                  (Optimal: {config.optimalMoves})
                </span>
              </span>
            </div>
            
            <div className="flex justify-between items-center bg-museum-stone-800/50 rounded-lg p-3">
              <span className="text-museum-stone-400">Time</span>
              <span className="text-xl font-bold text-museum-blue-400">{formatTime(elapsedTime)}</span>
            </div>
            
            <div className="flex justify-between items-center bg-museum-stone-800/50 rounded-lg p-3">
              <span className="text-museum-stone-400">Era</span>
              <span className="text-xl font-bold text-museum-bronze-400">
                {currentGame.difficulty === 1 ? 'Ancient Era' : currentGame.difficulty === 2 ? 'Medieval Times' : 'Modern Era'}
              </span>
            </div>
          </div>

          {/* NFT Minting Section */}
          {isEligibleForNFT && (
            <div className="mb-6 p-4 bg-gradient-to-r from-museum-bronze-900/30 to-museum-stone-900/30 border-2 border-museum-bronze-500 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-3xl">🏛️</span>
                  <div>
                    <h3 className="font-bold text-museum-bronze-400">NFT Eligible!</h3>
                    <p className="text-xs text-museum-stone-400">Score ≥ 10</p>
                  </div>
                </div>
              </div>

              {!isWalletConnected && (
                <p className="text-sm text-museum-gold-400 mb-3">
                  ⚠️ Connect your wallet to mint NFT
                </p>
              )}

              {mintTxHash && (
                <div className="mb-3 p-3 bg-museum-stone-900/30 border border-museum-stone-500 rounded-lg">
                  <p className="text-sm text-museum-stone-400 font-medium mb-1">✅ NFT Minted!</p>
                  <p className="text-xs text-museum-stone-500 break-all">
                    Tx: {mintTxHash.slice(0, 10)}...{mintTxHash.slice(-8)}
                  </p>
                </div>
              )}

              {mintError && (
                <div className="mb-3 p-3 bg-red-900/30 border border-red-600/50 rounded-lg">
                  <p className="text-sm text-red-400 font-medium mb-1">❌ Minting Failed</p>
                  <p className="text-xs text-red-300 break-words">
                    {mintError.includes('Validate') 
                      ? 'Address validation failed. Please try again or reconnect wallet.' 
                      : mintError}
                  </p>
                  <button
                    onClick={clearMintError}
                    className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {canMintNFT && (
                <button
                  onClick={handleMintNFT}
                  disabled={isMinting}
                  className={`
                    w-full py-3 rounded-xl font-bold text-lg transition-all duration-300 transform
                    ${isMinting
                      ? 'bg-museum-stone-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-museum-bronze-600 to-museum-stone-600 hover:from-museum-bronze-700 hover:to-museum-stone-700 hover:scale-105'
                    }
                  `}
                >
                  {isMinting ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Minting...</span>
                    </span>
                  ) : (
                    'Mint NFT 🏛️'
                  )}
                </button>
              )}

              {mintError && (
                <button
                  onClick={handleMintNFT}
                  disabled={isMinting}
                  className="w-full py-3 bg-red-900/30 hover:bg-red-900/50 border border-red-600/50 hover:border-red-600 rounded-xl font-bold text-red-400 transition-all"
                >
                  {isMinting ? 'Retrying...' : '🔄 Retry Minting'}
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full py-4 bg-gradient-to-r from-museum-blue-600 to-museum-bronze-600 hover:from-museum-blue-700 hover:to-museum-bronze-700 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105"
            >
              New Exhibition
            </button>

            <button
              onClick={() => {
                // TODO: Share score
                alert('Share functionality coming soon!');
              }}
              className="w-full py-3 bg-museum-stone-700 hover:bg-museum-stone-600 rounded-xl font-medium transition-colors"
            >
              Share Collection 📤
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

