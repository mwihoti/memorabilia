/**
 * Cartridge Controller Wrapper
 *
 * Uses locally installed @cartridge/controller package for
 * wallet connection and session management functionality.
 */

import { CARTRIDGE_CONFIG } from './config';
import { debug } from '../lib/log';

// Import Cartridge Controller from npm package
// Note: This will be dynamically imported to avoid build issues
let CartridgeControllerClass: any = null;

// Type definitions for Cartridge Controller
interface CartridgeController {
  connect(): Promise<{ address: string }>;
  disconnect(): Promise<void>;
  account: any;
  username: string | null;
}

/**
 * Load Cartridge Controller class
 */
async function loadCartridgeController(): Promise<void> {
  if (CartridgeControllerClass) {
    return;
  }

  try {
    // Try to import from npm package
    const module = await import('@cartridge/controller');
    CartridgeControllerClass = (module as any).CartridgeController || module.default;
    debug('Cartridge Controller loaded from npm package');
  } catch (error) {
    console.error('❌ Failed to load Cartridge Controller:', error);
    debug('Make sure @cartridge/controller is installed: npm install @cartridge/controller');
    throw new Error('Cartridge Controller package not found. Please install it with: npm install @cartridge/controller');
  }
}

/**
 * Cartridge Controller Manager
 */
class CartridgeControllerManager {
  private controller: CartridgeController | null = null;
  private isLoading = false;

  /**
   * Initialize Cartridge Controller
   */
  async initialize(): Promise<void> {
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
        rpc: CARTRIDGE_CONFIG.rpcUrl,
        policies: CARTRIDGE_CONFIG.policies,
        theme: 'dope',
        colorMode: 'dark',
      });

      debug('Cartridge Controller initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Cartridge Controller:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Connect wallet
   */
  async connect(): Promise<{ address: string; username: string | null }> {
    await this.initialize();

    if (!this.controller) {
      throw new Error('Controller not initialized');
    }

    try {
      debug('Connecting wallet...');
      const result = await this.controller.connect();
      
      debug('Wallet connected:', result.address);
      
      return {
        address: result.address,
        username: this.controller.username || null,
      };
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    if (!this.controller) {
      return;
    }

    try {
      debug('Disconnecting wallet...');
      await this.controller.disconnect();
      debug('Wallet disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect wallet:', error);
      throw error;
    }
  }

  /**
   * Get account
   */
  getAccount(): any {
    if (!this.controller) {
      throw new Error('Controller not initialized');
    }
    return this.controller.account;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.controller !== null && this.controller.account !== null;
  }

  /**
   * Get username
   */
  getUsername(): string | null {
    if (!this.controller) {
      return null;
    }
    return this.controller.username || null;
  }
}

// Singleton instance
export const cartridgeController = new CartridgeControllerManager();

// Export types
export type { CartridgeController };

