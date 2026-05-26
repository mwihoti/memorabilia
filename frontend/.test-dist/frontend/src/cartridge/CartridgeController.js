"use strict";
/**
 * Cartridge Controller Wrapper
 *
 * Uses locally installed @cartridge/controller package for
 * wallet connection and session management functionality.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartridgeController = void 0;
const config_1 = require("./config");
// Import Cartridge Controller from npm package
// Note: This will be dynamically imported to avoid build issues
let CartridgeControllerClass = null;
/**
 * Load Cartridge Controller class
 */
async function loadCartridgeController() {
    if (CartridgeControllerClass) {
        return;
    }
    try {
        // Try to import from npm package
        const module = await Promise.resolve().then(() => require('@cartridge/controller'));
        CartridgeControllerClass = module.CartridgeController || module.default;
        console.log('✅ Cartridge Controller loaded from npm package');
    }
    catch (error) {
        console.error('❌ Failed to load Cartridge Controller:', error);
        console.log('💡 Make sure @cartridge/controller is installed: npm install @cartridge/controller');
        throw new Error('Cartridge Controller package not found. Please install it with: npm install @cartridge/controller');
    }
}
/**
 * Cartridge Controller Manager
 */
class CartridgeControllerManager {
    controller = null;
    isLoading = false;
    /**
     * Initialize Cartridge Controller
     */
    async initialize() {
        if (this.controller) {
            return;
        }
        if (this.isLoading) {
            // Wait for loading to complete
            while (this.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }
        try {
            this.isLoading = true;
            // Load Cartridge Controller class
            await loadCartridgeController();
            // Create controller instance
            if (!CartridgeControllerClass) {
                throw new Error('CartridgeController class not available');
            }
            this.controller = new CartridgeControllerClass({
                rpc: config_1.CARTRIDGE_CONFIG.rpcUrl,
                policies: config_1.CARTRIDGE_CONFIG.policies,
                theme: 'dope',
                colorMode: 'dark',
            });
            console.log('✅ Cartridge Controller initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize Cartridge Controller:', error);
            throw error;
        }
        finally {
            this.isLoading = false;
        }
    }
    /**
     * Connect wallet
     */
    async connect() {
        await this.initialize();
        if (!this.controller) {
            throw new Error('Controller not initialized');
        }
        try {
            console.log('🔌 Connecting wallet...');
            const result = await this.controller.connect();
            console.log('✅ Wallet connected:', result.address);
            return {
                address: result.address,
                username: this.controller.username || null,
            };
        }
        catch (error) {
            console.error('❌ Failed to connect wallet:', error);
            throw error;
        }
    }
    /**
     * Disconnect wallet
     */
    async disconnect() {
        if (!this.controller) {
            return;
        }
        try {
            console.log('🔌 Disconnecting wallet...');
            await this.controller.disconnect();
            console.log('✅ Wallet disconnected');
        }
        catch (error) {
            console.error('❌ Failed to disconnect wallet:', error);
            throw error;
        }
    }
    /**
     * Get account
     */
    getAccount() {
        if (!this.controller) {
            throw new Error('Controller not initialized');
        }
        return this.controller.account;
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.controller !== null && this.controller.account !== null;
    }
    /**
     * Get username
     */
    getUsername() {
        if (!this.controller) {
            return null;
        }
        return this.controller.username || null;
    }
}
// Singleton instance
exports.cartridgeController = new CartridgeControllerManager();
