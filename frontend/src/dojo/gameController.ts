import { Account, CallData, hash } from 'starknet';
import { getDojoContext } from './setup';
import { CONTRACTS, METHODS } from './config';
import { GameState, Difficulty, Card } from '../types';
import { debug } from '../lib/log';

export class GameController {
  private account: Account;
  private worldAddress: string;

  constructor(account: Account, worldAddress: string) {
    this.account = account;
    this.worldAddress = worldAddress;
  }

  /**
   * Start a new game
   */
  async startGame(difficulty: Difficulty): Promise<number> {
    debug(`Starting ${Difficulty[difficulty]} game...`);

    try {
      const tx = await this.account.execute({
        contractAddress: this.worldAddress,
        entrypoint: METHODS.START_GAME,
        calldata: CallData.compile([difficulty]),
      });

      debug('Transaction hash:', tx.transaction_hash);
      
      const receipt = await this.account.waitForTransaction(tx.transaction_hash);
      debug('Game started!', receipt);

      // Extract game_id from events
      const gameId = this.extractGameIdFromReceipt(receipt);
      debug('Game ID:', gameId);

      return gameId;
    } catch (error) {
      console.error('❌ Failed to start game:', error);
      throw error;
    }
  }

  /**
   * Flip a card
   */
  async flipCard(gameId: number, cardIndex: number): Promise<void> {
    debug(`🃏 Flipping card ${cardIndex} in game ${gameId}...`);

    try {
      const tx = await this.account.execute({
        contractAddress: this.worldAddress,
        entrypoint: METHODS.FLIP_CARD,
        calldata: CallData.compile([gameId, cardIndex]),
      });

      await this.account.waitForTransaction(tx.transaction_hash);
      debug('Card flipped!');
    } catch (error) {
      console.error('❌ Failed to flip card:', error);
      throw error;
    }
  }

  /**
   * Check if two flipped cards match
   */
  async checkMatch(gameId: number): Promise<boolean> {
    debug(`Checking match for game ${gameId}...`);

    try {
      const tx = await this.account.execute({
        contractAddress: this.worldAddress,
        entrypoint: METHODS.CHECK_MATCH,
        calldata: CallData.compile([gameId]),
      });

      const receipt = await this.account.waitForTransaction(tx.transaction_hash);
      debug('Match checked!');

      // Extract match result from events
      const isMatch = this.extractMatchResultFromReceipt(receipt);
      debug('Is match:', isMatch);

      return isMatch;
    } catch (error) {
      console.error('❌ Failed to check match:', error);
      throw error;
    }
  }

  /**
   * Abandon current game
   */
  async abandonGame(gameId: number): Promise<void> {
    debug(`Abandoning game ${gameId}...`);

    try {
      const tx = await this.account.execute({
        contractAddress: this.worldAddress,
        entrypoint: METHODS.ABANDON_GAME,
        calldata: CallData.compile([gameId]),
      });

      await this.account.waitForTransaction(tx.transaction_hash);
      debug('Game abandoned!');
    } catch (error) {
      console.error('❌ Failed to abandon game:', error);
      throw error;
    }
  }

  /**
   * Get game state (this would typically query Torii indexer)
   */
  async getGameState(gameId: number): Promise<GameState | null> {
    debug(`Getting game state for ${gameId}...`);

    try {
      // In a real implementation, this would query the Torii indexer
      // For now, we'll call the contract directly
      const result = await this.account.callContract({
        contractAddress: this.worldAddress,
        entrypoint: METHODS.GET_GAME,
        calldata: CallData.compile([gameId]),
      });

      // Parse the result into GameState
      const gameState = this.parseGameState(result);
      return gameState;
    } catch (error) {
      console.error('❌ Failed to get game state:', error);
      return null;
    }
  }

  /**
   * Helper: Extract game ID from transaction receipt
   */
  private extractGameIdFromReceipt(receipt: any): number {
    // Look for GameStarted event
    const events = receipt.events || [];
    
    for (const event of events) {
      // Check if this is a GameStarted event
      const eventName = event.keys?.[0];
      if (eventName && eventName.includes('GameStarted')) {
        // Game ID is typically in the event data
        const gameId = event.data?.[0];
        if (gameId) {
          return parseInt(gameId, 16);
        }
      }
    }

    // Fallback: generate from transaction hash
    const txHash = receipt.transaction_hash;
    const gameId = parseInt(txHash.slice(-8), 16) % 1000000;
    return gameId;
  }

  /**
   * Helper: Extract match result from transaction receipt
   */
  private extractMatchResultFromReceipt(receipt: any): boolean {
    const events = receipt.events || [];
    
    for (const event of events) {
      const eventName = event.keys?.[0];
      
      // Check for CardsMatched event
      if (eventName && eventName.includes('CardsMatched')) {
        return true;
      }
      
      // Check for CardsMismatched event
      if (eventName && eventName.includes('CardsMismatched')) {
        return false;
      }
    }

    return false;
  }

  /**
   * Helper: Parse contract result into GameState
   */
  private parseGameState(result: any): GameState {
    // This is a simplified parser - adjust based on actual contract response
    return {
      game_id: parseInt(result[0], 16),
      player: result[1],
      difficulty: parseInt(result[2], 16),
      cards: this.parseCards(result[3]),
      flipped_indices: this.parseArray(result[4]),
      matched_count: parseInt(result[5], 16),
      total_pairs: parseInt(result[6], 16),
      moves: parseInt(result[7], 16),
      score: parseInt(result[8], 16),
      started_at: parseInt(result[9], 16),
      completed_at: parseInt(result[10], 16),
      status: parseInt(result[11], 16),
      elapsed_time: parseInt(result[12], 16),
    };
  }

  /**
   * Helper: Parse cards array
   */
  private parseCards(data: any): Card[] {
    // Simplified parser
    const cards: Card[] = [];
    // Parse based on actual contract response format
    return cards;
  }

  /**
   * Helper: Parse generic array
   */
  private parseArray(data: any): number[] {
    if (!data || !Array.isArray(data)) return [];
    return data.map((item: any) => parseInt(item, 16));
  }
}

/**
 * Create a game controller instance
 */
export function createGameController(account: Account): GameController {
  const { provider } = getDojoContext();
  const worldAddress = import.meta.env.VITE_WORLD_ADDRESS;
  
  return new GameController(account, worldAddress);
}

