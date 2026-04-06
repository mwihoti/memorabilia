/**
 * DojoTelegramSDK — facade that wires Telegram auth + Dojo client together.
 *
 * Usage:
 *   const sdk = new DojoTelegramSDK({ telegramBotToken, dojoWorldAddress, rpcUrl });
 *   const { user, account, dojo } = await sdk.initialize(initData);
 *   const tx = await sdk.startGame(account, 1);
 */

import type { Account } from 'starknet';
import { parseInitData, TelegramAuthenticator } from './auth';
import { DojoClient } from './dojoClient';
import type { SDKConfig, TelegramUser, DojoConfig } from './types';

export interface InitResult {
  /** Parsed Telegram user from initData. Null when running outside Telegram. */
  user: TelegramUser | null;
  /** A mock / burner account for prototype use. Replace with real burner in prod. */
  account: MockAccount;
  /** Underlying DojoClient instance. */
  dojo: DojoClient;
}

/**
 * Lightweight mock account for prototype / local demo use.
 * Swap this for a real @dojoengine/create-burner account in production.
 */
export class MockAccount {
  address: string;
  private _executeFn: (tx: any) => Promise<any>;

  constructor(address: string) {
    this.address = address;
    this._executeFn = async (tx: any) => ({
      transaction_hash: `0xMOCK_${Date.now().toString(16)}`,
    });
  }

  async execute(tx: { contractAddress: string; entrypoint: string; calldata?: any[] }): Promise<any> {
    return this._executeFn(tx);
  }

  /** Inject a custom executor — useful for real account integration. */
  setExecutor(fn: (tx: any) => Promise<any>) {
    this._executeFn = fn;
  }
}

export class DojoTelegramSDK {
  private config: SDKConfig;
  private auth: TelegramAuthenticator;
  private _dojo: DojoClient | null = null;

  constructor(config: SDKConfig) {
    this.config = config;
    this.auth = new TelegramAuthenticator(config.telegramBotToken);
  }

  /**
   * Initialize the SDK.
   * @param initData  Telegram WebApp.initData string (pass undefined when testing outside Telegram).
   */
  async initialize(initData?: string): Promise<InitResult> {
    // Parse Telegram user from initData
    let user: TelegramUser | null = null;
    if (initData) {
      user = parseInitData(initData);
    }

    // Build Dojo client
    const dojoConfig: DojoConfig = {
      worldAddress: this.config.dojoWorldAddress,
      rpcUrl: this.config.rpcUrl,
      toriiUrl: this.config.toriiUrl,
    };
    this._dojo = new DojoClient(dojoConfig);

    // Create a deterministic mock address from the telegram user id (or random for demo)
    const seed = user?.id ?? Math.floor(Math.random() * 0xfffff);
    const mockAddress = `0x${seed.toString(16).padStart(64, '0')}`;
    const account = new MockAccount(mockAddress);

    return { user, account, dojo: this._dojo };
  }

  /** Get the underlying DojoClient (must call initialize first). */
  get dojo(): DojoClient {
    if (!this._dojo) throw new Error('SDK not initialized. Call initialize() first.');
    return this._dojo;
  }

  // ── Convenience game methods (delegates to DojoClient) ─────────────────────

  async startGame(account: MockAccount | Account, difficulty = 1) {
    return this.dojo.startGame(account as Account, difficulty);
  }

  async flipCard(account: MockAccount | Account, gameId: number, cardIndex: number) {
    return this.dojo.flipCard(account as Account, gameId, cardIndex);
  }

  async checkMatch(account: MockAccount | Account, gameId: number) {
    return this.dojo.checkMatch(account as Account, gameId);
  }

  async getGameState(gameId: number) {
    return this.dojo.getGameState(gameId);
  }

  /**
   * Subscribe to game events via Torii (requires toriiUrl in config).
   */
  subscribeGameEvents(gameId: number, handler: (ev: any) => void) {
    return this.dojo.subscribeGameEvents(gameId, handler);
  }
}

export default DojoTelegramSDK;
