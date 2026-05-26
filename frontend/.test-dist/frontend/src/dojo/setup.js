"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDojo = setupDojo;
exports.getDojoContext = getDojoContext;
exports.createBurnerAccount = createBurnerAccount;
exports.getBurnerAccounts = getBurnerAccounts;
exports.clearBurnerAccounts = clearBurnerAccounts;
const starknet_1 = require("starknet");
const create_burner_1 = require("@dojoengine/create-burner");
const config_1 = require("./config");
let dojoContext = null;
async function setupDojo() {
    if (dojoContext) {
        return dojoContext;
    }
    console.log('🎮 Setting up Dojo...');
    console.log('RPC URL:', config_1.dojoConfig.rpcUrl);
    console.log('World Address:', config_1.dojoConfig.worldAddress);
    // Initialize RPC provider
    const provider = new starknet_1.RpcProvider({
        nodeUrl: config_1.dojoConfig.rpcUrl,
    });
    // Get master account (for development)
    const katanaAccount = (0, config_1.getKatanaAccount)(0);
    const masterAccount = new starknet_1.Account(provider, katanaAccount.address, katanaAccount.privateKey, '1' // Cairo version
    );
    // Initialize burner manager for session keys
    const burnerManager = new create_burner_1.BurnerManager({
        masterAccount,
        accountClassHash: '0x05400e90f7e0ae78bd02c77cd75527280470e2fe19c54970dd79dc37a9d3645c', // Standard account class hash
        rpcProvider: provider,
        feeTokenAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH token address
    });
    dojoContext = {
        provider,
        masterAccount,
        burnerManager,
    };
    console.log('✅ Dojo setup complete!');
    return dojoContext;
}
function getDojoContext() {
    if (!dojoContext) {
        throw new Error('Dojo not initialized. Call setupDojo() first.');
    }
    return dojoContext;
}
async function createBurnerAccount() {
    const { burnerManager } = getDojoContext();
    console.log('🔥 Creating burner account...');
    const burner = await burnerManager.create();
    console.log('✅ Burner account created:', burner.address);
    return burner;
}
async function getBurnerAccounts() {
    const { burnerManager } = getDojoContext();
    return burnerManager.list();
}
async function clearBurnerAccounts() {
    const { burnerManager } = getDojoContext();
    await burnerManager.clear();
    console.log('🗑️ Burner accounts cleared');
}
