import { Account, RpcProvider, Contract } from 'starknet';
import { BurnerManager } from '@dojoengine/create-burner';
import { dojoConfig, getKatanaAccount } from './config';
import { debug } from '../lib/log';

export interface DojoContext {
  provider: RpcProvider;
  masterAccount: Account;
  burnerManager: BurnerManager;
}

let dojoContext: DojoContext | null = null;

export async function setupDojo(): Promise<DojoContext> {
  if (dojoContext) {
    return dojoContext;
  }

  debug('Setting up Dojo...');
  debug('RPC URL:', dojoConfig.rpcUrl);
  debug('World Address:', dojoConfig.worldAddress);

  // Initialize RPC provider
  const provider = new RpcProvider({
    nodeUrl: dojoConfig.rpcUrl,
  });

  // Get master account (for development)
  const katanaAccount = getKatanaAccount(0);
  const masterAccount = new Account(
    provider,
    katanaAccount.address,
    katanaAccount.privateKey,
    '1' // Cairo version
  );

  // Initialize burner manager for session keys
  const burnerManager = new BurnerManager({
    masterAccount,
    accountClassHash: '0x05400e90f7e0ae78bd02c77cd75527280470e2fe19c54970dd79dc37a9d3645c', // Standard account class hash
    rpcProvider: provider,
    feeTokenAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH token address
  } as any);

  dojoContext = {
    provider,
    masterAccount,
    burnerManager,
  };

  debug('Dojo setup complete!');
  return dojoContext;
}

export function getDojoContext(): DojoContext {
  if (!dojoContext) {
    throw new Error('Dojo not initialized. Call setupDojo() first.');
  }
  return dojoContext;
}

export async function createBurnerAccount(): Promise<Account> {
  const { burnerManager } = getDojoContext();

  debug('Creating burner account...');
  const burner = await burnerManager.create();
  debug('Burner account created:', burner.address);

  return burner as any;
}

export async function getBurnerAccounts(): Promise<Account[]> {
  const { burnerManager } = getDojoContext();
  return burnerManager.list() as any;
}

export async function clearBurnerAccounts(): Promise<void> {
  const { burnerManager } = getDojoContext();
  await burnerManager.clear();
  debug('Burner accounts cleared');
}

