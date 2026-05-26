"use strict";
/**
 * NFT Minter
 *
 * Handles NFT minting for high scores using Cartridge Controller
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintScoreNFT = mintScoreNFT;
exports.getNFT = getNFT;
exports.getTotalMinted = getTotalMinted;
const CartridgeController_1 = require("./CartridgeController");
const config_1 = require("./config");
const starknet_1 = require("starknet");
/**
 * Mint NFT for high score
 */
async function mintScoreNFT(params) {
    try {
        // Validate score eligibility
        if (!(0, config_1.isScoreEligibleForNFT)(params.score)) {
            return {
                success: false,
                error: `Score must be at least ${config_1.NFT_CONFIG.minScore} to mint NFT`,
            };
        }
        // Validate and format recipient
        if (!params.recipient || params.recipient === '0x0') {
            return {
                success: false,
                error: 'Invalid recipient address',
            };
        }
        // Ensure recipient is properly formatted (0x prefixed hex string)
        let formattedRecipient = params.recipient;
        if (!formattedRecipient.startsWith('0x')) {
            formattedRecipient = '0x' + formattedRecipient;
        }
        // Get account from Cartridge Controller
        const account = CartridgeController_1.cartridgeController.getAccount();
        if (!account) {
            return {
                success: false,
                error: 'Wallet not connected',
            };
        }
        console.log('🎨 Minting NFT...', {
            recipient: formattedRecipient,
            score: params.score,
            timestamp: params.timestamp,
            gameId: params.gameId,
            difficulty: params.difficulty,
        });
        // Create contract instance
        const contract = new starknet_1.Contract(NFT_ABI, config_1.NFT_CONFIG.contractAddress, account);
        // Call mint_score_nft entrypoint with properly formatted parameters
        const result = await contract.mint_score_nft(formattedRecipient, // recipient as ContractAddress
        params.score, // score as u32
        params.timestamp, // timestamp as u64
        params.gameId, // game_id as u32
        params.difficulty // difficulty as u8
        );
        // Wait for transaction confirmation
        console.log('⏳ Waiting for transaction confirmation...');
        await account.waitForTransaction(result.transaction_hash);
        console.log('✅ NFT minted successfully!', result.transaction_hash);
        return {
            success: true,
            transactionHash: result.transaction_hash,
            tokenId: result.token_id?.toString(),
        };
    }
    catch (error) {
        console.error('❌ Failed to mint NFT:', error);
        return {
            success: false,
            error: error.message || 'Failed to mint NFT',
        };
    }
}
/**
 * Get NFT data
 */
async function getNFT(tokenId) {
    try {
        const account = CartridgeController_1.cartridgeController.getAccount();
        if (!account) {
            throw new Error('Wallet not connected');
        }
        const contract = new starknet_1.Contract(NFT_ABI, config_1.NFT_CONFIG.contractAddress, account);
        const result = await contract.get_nft(tokenId);
        return {
            recipient: result.recipient,
            score: result.score.toString(),
            timestamp: result.timestamp.toString(),
            gameId: result.game_id.toString(),
            difficulty: result.difficulty.toString(),
        };
    }
    catch (error) {
        console.error('❌ Failed to get NFT:', error);
        throw error;
    }
}
/**
 * Get total NFTs minted
 */
async function getTotalMinted() {
    try {
        const account = CartridgeController_1.cartridgeController.getAccount();
        if (!account) {
            throw new Error('Wallet not connected');
        }
        const contract = new starknet_1.Contract(NFT_ABI, config_1.NFT_CONFIG.contractAddress, account);
        const result = await contract.get_total_minted();
        return parseInt(result.toString());
    }
    catch (error) {
        console.error('❌ Failed to get total minted:', error);
        throw error;
    }
}
/**
 * NFT Contract ABI
 *
 * Minimal ABI for NFT minting
 */
const NFT_ABI = [
    {
        name: 'mint_score_nft',
        type: 'function',
        inputs: [
            { name: 'recipient', type: 'ContractAddress' },
            { name: 'score', type: 'u32' },
            { name: 'timestamp', type: 'u64' },
            { name: 'game_id', type: 'u32' },
            { name: 'difficulty', type: 'u8' },
        ],
        outputs: [
            { name: 'token_id', type: 'u32' },
        ],
        state_mutability: 'external',
    },
    {
        name: 'get_nft',
        type: 'function',
        inputs: [
            { name: 'token_id', type: 'u32' },
        ],
        outputs: [
            { name: 'recipient', type: 'ContractAddress' },
            { name: 'score', type: 'u32' },
            { name: 'timestamp', type: 'u64' },
            { name: 'game_id', type: 'u32' },
            { name: 'difficulty', type: 'u8' },
        ],
        state_mutability: 'view',
    },
    {
        name: 'get_total_minted',
        type: 'function',
        inputs: [],
        outputs: [
            { name: 'total', type: 'u32' },
        ],
        state_mutability: 'view',
    },
];
