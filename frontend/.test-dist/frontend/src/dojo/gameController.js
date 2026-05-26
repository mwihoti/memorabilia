"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameController = void 0;
exports.createGameController = createGameController;
const starknet_1 = require("starknet");
const setup_1 = require("./setup");
const config_1 = require("./config");
const types_1 = require("../types");
class GameController {
    account;
    worldAddress;
    constructor(account, worldAddress) {
        this.account = account;
        this.worldAddress = worldAddress;
    }
    /**
     * Start a new game
     */
    async startGame(difficulty) {
        console.log(`🎮 Starting ${types_1.Difficulty[difficulty]} game...`);
        try {
            const tx = await this.account.execute({
                contractAddress: this.worldAddress,
                entrypoint: config_1.METHODS.START_GAME,
                calldata: starknet_1.CallData.compile([difficulty]),
            });
            console.log('Transaction hash:', tx.transaction_hash);
            const receipt = await this.account.waitForTransaction(tx.transaction_hash);
            console.log('✅ Game started!', receipt);
            // Extract game_id from events
            const gameId = this.extractGameIdFromReceipt(receipt);
            console.log('Game ID:', gameId);
            return gameId;
        }
        catch (error) {
            console.error('❌ Failed to start game:', error);
            throw error;
        }
    }
    /**
     * Flip a card
     */
    async flipCard(gameId, cardIndex) {
        console.log(`🃏 Flipping card ${cardIndex} in game ${gameId}...`);
        try {
            const tx = await this.account.execute({
                contractAddress: this.worldAddress,
                entrypoint: config_1.METHODS.FLIP_CARD,
                calldata: starknet_1.CallData.compile([gameId, cardIndex]),
            });
            await this.account.waitForTransaction(tx.transaction_hash);
            console.log('✅ Card flipped!');
        }
        catch (error) {
            console.error('❌ Failed to flip card:', error);
            throw error;
        }
    }
    /**
     * Check if two flipped cards match
     */
    async checkMatch(gameId) {
        console.log(`🔍 Checking match for game ${gameId}...`);
        try {
            const tx = await this.account.execute({
                contractAddress: this.worldAddress,
                entrypoint: config_1.METHODS.CHECK_MATCH,
                calldata: starknet_1.CallData.compile([gameId]),
            });
            const receipt = await this.account.waitForTransaction(tx.transaction_hash);
            console.log('✅ Match checked!');
            // Extract match result from events
            const isMatch = this.extractMatchResultFromReceipt(receipt);
            console.log('Is match:', isMatch);
            return isMatch;
        }
        catch (error) {
            console.error('❌ Failed to check match:', error);
            throw error;
        }
    }
    /**
     * Abandon current game
     */
    async abandonGame(gameId) {
        console.log(`🚪 Abandoning game ${gameId}...`);
        try {
            const tx = await this.account.execute({
                contractAddress: this.worldAddress,
                entrypoint: config_1.METHODS.ABANDON_GAME,
                calldata: starknet_1.CallData.compile([gameId]),
            });
            await this.account.waitForTransaction(tx.transaction_hash);
            console.log('✅ Game abandoned!');
        }
        catch (error) {
            console.error('❌ Failed to abandon game:', error);
            throw error;
        }
    }
    /**
     * Get game state (this would typically query Torii indexer)
     */
    async getGameState(gameId) {
        console.log(`📊 Getting game state for ${gameId}...`);
        try {
            // In a real implementation, this would query the Torii indexer
            // For now, we'll call the contract directly
            const result = await this.account.callContract({
                contractAddress: this.worldAddress,
                entrypoint: config_1.METHODS.GET_GAME,
                calldata: starknet_1.CallData.compile([gameId]),
            });
            // Parse the result into GameState
            const gameState = this.parseGameState(result);
            return gameState;
        }
        catch (error) {
            console.error('❌ Failed to get game state:', error);
            return null;
        }
    }
    /**
     * Helper: Extract game ID from transaction receipt
     */
    extractGameIdFromReceipt(receipt) {
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
    extractMatchResultFromReceipt(receipt) {
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
    parseGameState(result) {
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
    parseCards(data) {
        // Simplified parser
        const cards = [];
        // Parse based on actual contract response format
        return cards;
    }
    /**
     * Helper: Parse generic array
     */
    parseArray(data) {
        if (!data || !Array.isArray(data))
            return [];
        return data.map((item) => parseInt(item, 16));
    }
}
exports.GameController = GameController;
/**
 * Create a game controller instance
 */
function createGameController(account) {
    const { provider } = (0, setup_1.getDojoContext)();
    const worldAddress = import.meta.env.VITE_WORLD_ADDRESS;
    return new GameController(account, worldAddress);
}
