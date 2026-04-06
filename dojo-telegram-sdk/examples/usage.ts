/**
 * Dojo Telegram SDK — usage example.
 *
 * Run against a local Katana world:
 *   npx ts-node examples/usage.ts
 *
 * Set environment variables or rely on the demo defaults below.
 */
import DojoTelegramSDK from '../src/DojoTelegramSDK';

async function main() {
  // ── 1. Create SDK instance ─────────────────────────────────────────────────
  const sdk = new DojoTelegramSDK({
    telegramBotToken: process.env.BOT_TOKEN || 'demo-token',
    dojoWorldAddress: process.env.WORLD_ADDRESS || '0xDEMO_WORLD',
    rpcUrl: process.env.VITE_RPC_URL || 'http://localhost:5050',
    toriiUrl: process.env.TORII_URL || 'http://localhost:8080',
    network: 'katana',
  });

  // ── 2. Initialize (parse Telegram initData + create DojoClient) ────────────
  // In a real Telegram Mini App, pass window.Telegram.WebApp.initData here.
  const mockInitData = new URLSearchParams({
    user: JSON.stringify({ id: 123456, first_name: 'Alice', username: 'alice' }),
    auth_date: String(Math.floor(Date.now() / 1000)),
    hash: 'demo',
  }).toString();

  const { user, account, dojo } = await sdk.initialize(mockInitData);

  console.log('Telegram user:', user);
  console.log('Burner address:', account.address);
  console.log('Dojo client ready (provider may be undefined in demo env).');

  // ── 3. Start a game ────────────────────────────────────────────────────────
  try {
    const tx = await sdk.startGame(account, /* difficulty */ 1);
    console.log('start_game tx:', tx.transaction_hash);
  } catch (err: any) {
    // Expected in demo: no real world deployed
    console.log('start_game (demo — no real world):', err.message ?? err);
  }

  // ── 4. Direct DojoClient access ────────────────────────────────────────────
  // dojo.flipCard(account, gameId, cardIndex)
  // dojo.checkMatch(account, gameId)
  // dojo.getGameState(gameId)
  // dojo.subscribeGameEvents(gameId, ev => console.log(ev))  // requires toriiUrl
  console.log('SDK example complete.');
}

main().catch(console.error);
