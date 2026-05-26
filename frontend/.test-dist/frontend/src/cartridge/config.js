"use strict";
/**
 * Cartridge Controller Configuration
 *
 * Configuration for Cartridge Controller wallet connection and session policies
 * for Starknet Sepolia testnet.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NFT_CONFIG = exports.CARTRIDGE_CDN = exports.CARTRIDGE_CONFIG = exports.WORLD_ADDRESS = exports.NFT_CONTRACT_ADDRESS = void 0;
exports.isNFTContractConfigured = isNFTContractConfigured;
exports.isScoreEligibleForNFT = isScoreEligibleForNFT;
exports.shortenAddress = shortenAddress;
// NFT Contract Address (update after deployment)
// Using placeholder address until contracts are deployed
exports.NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS || '0x1';
// World Contract Address
exports.WORLD_ADDRESS = import.meta.env.VITE_WORLD_ADDRESS || '0x1';
/**
 * Cartridge Controller Configuration
 */
exports.CARTRIDGE_CONFIG = {
    // Network configuration
    network: 'sepolia',
    rpcUrl: 'https://api.cartridge.gg/x/starknet/sepolia',
    chainId: 'SN_SEPOLIA',
    // App configuration
    appId: 'memorabilia',
    appName: 'Memorabilia',
    appIcon: '🎮',
    // Session policies for gasless transactions
    policies: [
        {
            target: exports.NFT_CONTRACT_ADDRESS,
            method: 'mint_score_nft',
            description: 'Mint NFT for high scores (score >= 10)',
        },
    ],
    // Session configuration
    session: {
        expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
        publicKey: '', // Will be generated
    },
};
/**
 * Cartridge Controller CDN URLs
 */
exports.CARTRIDGE_CDN = {
    controller: 'https://unpkg.com/@cartridge/controller@latest',
    starknet: 'https://unpkg.com/starknet@latest',
};
/**
 * NFT Minting Configuration
 */
exports.NFT_CONFIG = {
    minScore: 10, // Minimum score required to mint NFT
    contractAddress: exports.NFT_CONTRACT_ADDRESS,
    entrypoint: 'mint_score_nft',
};
/**
 * Helper function to check if NFT contract is configured
 */
function isNFTContractConfigured() {
    return exports.NFT_CONTRACT_ADDRESS !== '0x0' && exports.NFT_CONTRACT_ADDRESS !== '0x1' && exports.NFT_CONTRACT_ADDRESS !== '';
}
/**
 * Helper function to check if score is eligible for NFT
 */
function isScoreEligibleForNFT(score) {
    return score >= exports.NFT_CONFIG.minScore;
}
/**
 * Helper function to shorten wallet address
 */
function shortenAddress(address) {
    if (!address)
        return '';
    if (address.length < 10)
        return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
