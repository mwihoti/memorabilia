# Memorabilia

> An on-chain memory card matching game built on Starknet with the Dojo engine, playable as a Telegram Mini App — no wallet or gas fees required to start playing.

**Play now:** [t.me/enter_memorabilia_musem_bot](https://t.me/enter_memorabilia_musem_bot)  
**Web App:** [memorabilia-game.vercel.app](https://memorabilia-game.vercel.app)  
**Twitter:** [@memorabiliadojo](https://twitter.com/memorabiliadojo)

---

## Submission Track

Full Game + Dojo Telegram SDK

---

## Project Summary

Memorabilia is a fully on-chain memory card matching game built on Starknet using the Dojo framework. Players flip cards, find matching pairs, earn medals, unlock levels, and climb a global leaderboard — all inside Telegram with no blockchain knowledge required.

The game features a custom Dojo Telegram SDK enabling gasless transactions, Account Abstraction for seamless onboarding, and a rich progression system with 3 eras, 15 levels, daily challenges, ghost replays, combo multipliers, and NFT minting via Cartridge.

---

## Team

| Name | GitHub | Email |
|------|--------|-------|
| Ahmed | [@ahmedabdikadir914](https://github.com/ahmedabdikadir914) | ahmedabdikadir914@gmail.com |
| Leonard | [@tweenhaven35](https://github.com/tweenhaven35) | tweenhaven35@gmail.com |
| Daniel | [@mwihoti](https://github.com/mwihoti) | DanielMwihoti@gmail.com |
| Kelly | [@gakikelly](https://github.com/gakikelly) | gakikelly403@gmail.com |
| Peter | [@mainapeter](https://github.com/mainapeter) | mainapeterkanyuki@gmail.com |
| Rosemary | [@rozypopyl](https://github.com/rozypopyl)) | Rozypopyl6@gmail.com |

---

## Features

### Gameplay
- **3 Eras × 5 Levels** — Ancient (🏺), Medieval (⚔️), Modern (🚀); 15 levels total with sequential unlock (must complete level N before N+1)
- **Card counts** — 8, 12, 16, 20, 24 cards per level; grids always use even column counts (4 or 6)
- **Preview phase** — memorise the board before the clock starts (3s → 0s as levels increase)
- **Time medals** — Gold / Silver / Bronze based on completion speed
- **Combo multiplier** — consecutive matches build up to 3× score bonus
- **Daily challenges** — a new seeded level every day
- **Ghost replay** — record your best run and watch it back with accurate emoji layout
- **"Next Level" flow** — after completing a level, go straight to the next or browse levels
- **All levels complete** — celebratory popup when all 15 levels are mastered

### Progression & Meta
- **15 Achievements** — speed runs, perfect memory, streaks, era mastery, and more
- **Daily streak** — shields earned at day 3 and day 7 protect your streak; score multiplier up to +100% at 30-day streak
- **Star ratings** — 1–3 stars per level based on move efficiency
- **Global leaderboard** — powered by Neon PostgreSQL, updated live

### Visuals
- **3 themes** — Museum (amber), Nature (forest green), Urban (neon graffiti)
- **Responsive layout** — works on mobile, tablet, laptop, and large desktop screens
- **Smooth flip animations** — 3D card flip with correct backface-visibility on all screen sizes

### Blockchain
- **On-chain game logic** — Cairo smart contracts via Dojo engine
- **Account Abstraction** — gasless gameplay via session keys
- **NFT minting** — Cartridge wallet integration; mint score NFTs for high achievements
- **Torii indexer** — real-time on-chain state queries

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Cairo + Dojo Engine |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Animations | Framer Motion |
| Blockchain | Starknet (Katana for local dev) |
| Wallet | Cartridge Controller |
| Telegram | Mini Apps API + Telegraf bot |
| Database | Neon PostgreSQL (leaderboard) |
| Deployment | Vercel (frontend + API routes) |
| Indexing | Torii |

---

## Architecture

```
memorabilia/
├── frontend/                   # React + Vite web app
│   └── src/
│       ├── components/         # UI components
│       │   ├── GameBoard.tsx   # Card grid, timer, stats bar
│       │   ├── Card.tsx        # Individual card with 3D flip
│       │   ├── LevelSelector.tsx  # Era/level picker with unlock logic
│       │   ├── WinModal.tsx    # Post-game results, next-level, NFT mint
│       │   ├── GhostReplayModal.tsx  # Watch best run replay
│       │   ├── UserDashboard.tsx     # Admin dashboard
│       │   └── ...
│       ├── store/
│       │   ├── gameStore.ts    # Zustand global state
│       │   ├── achievementStore.ts
│       │   ├── ghostReplay.ts  # Best-run recording/playback
│       │   ├── streakStore.ts  # Daily streak + shields
│       │   ├── dailyChallenge.ts
│       │   └── demoGame.ts     # Demo mode game logic
│       ├── dojo/               # Starknet/Dojo integration
│       ├── cartridge/          # Cartridge wallet + NFT minting
│       └── telegram/           # Telegram WebApp SDK helpers
├── src/                        # Cairo smart contracts
│   ├── models/
│   │   ├── game_state.cairo
│   │   ├── user_account.cairo
│   │   ├── leaderboard.cairo
│   │   ├── score_nft.cairo
│   │   └── session_policy.cairo
│   ├── systems/
│   │   ├── game_system.cairo
│   │   ├── account_registry.cairo
│   │   ├── leaderboard_system.cairo
│   │   └── nft_system.cairo
│   └── utils/
│       ├── card_generator.cairo
│       ├── random.cairo
│       └── scoring.cairo
├── telegram-bot/               # Telegraf bot (@enter_memorabilia_musem_bot)
│   └── index.js
├── api/                        # Vercel serverless functions
│   ├── leaderboard.ts
│   ├── scores.ts
│   ├── player/[telegramId].ts
│   └── telegram-webhook.ts
├── dojo-telegram-sdk/          # Reusable SDK package
└── Scarb.toml
```

---

## Getting Started

### Prerequisites

```bash
# Dojo engine
curl -L https://install.dojoengine.org | bash && dojoup

# Scarb (Cairo package manager)
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
```

### Run in Demo Mode (no contracts needed)

```bash
git clone https://github.com/mwihoti/memorabilia.git
cd memorabilia/frontend
npm install
npm run dev
```

The app auto-detects demo mode when `VITE_WORLD_ADDRESS` is unset and runs entirely client-side.

### Run with Blockchain

1. Start a local Katana node:
   ```bash
   katana --disable-fee
   ```

2. Deploy contracts:
   ```bash
   sozo build
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh katana
   ```

3. Copy the world address into `frontend/.env`:
   ```env
   VITE_WORLD_ADDRESS=0x...
   VITE_RPC_URL=http://localhost:5050
   ```

4. Start the frontend:
   ```bash
   cd frontend && npm run dev
   ```

### Environment Variables

```env
# Frontend (frontend/.env)
VITE_WORLD_ADDRESS=       # Dojo world address (leave empty for demo mode)
VITE_RPC_URL=             # Starknet RPC endpoint
VITE_API_URL=             # Backend API base URL

# API / Bot (.env)
BOT_TOKEN=                # Telegram bot token
WEB_APP_URL=              # Vercel deployment URL
DATABASE_URL=             # Neon PostgreSQL connection string
TELEGRAM_BOT_SECRET=      # Webhook secret
```

---

## How to Play

1. Open the bot: [@enter_memorabilia_musem_bot](https://t.me/enter_memorabilia_musem_bot)
2. Tap **Play Now** to launch the Mini App
3. Enter your display name
4. Choose an era — start with **Ancient Era**
5. Complete **Level 1** to unlock Level 2, and so on
6. Study the cards during the preview window, then flip pairs to find matches
7. Match all pairs to win — faster and fewer moves = better medal and score
8. After each level you can jump directly to the next level or browse the level map
9. Complete all 15 levels to unlock the "More Games Coming" celebration

### Scoring

| Component | Detail |
|-----------|--------|
| Base score | Moves × difficulty multiplier |
| Time bonus | +500 pts Gold, +250 Silver, +100 Bronze |
| Combo bonus | Up to ×3 for consecutive matches |
| Streak bonus | Up to +100% for a 30-day daily streak |

### Medal times (Level 1 example)

| Medal | Time |
|-------|------|
| Gold | ≤ 60s |
| Silver | ≤ 90s |
| Bronze | ≤ 120s |

---

## Smart Contract Reference

### Game System

```cairo
start_game(difficulty: u8) -> u32        // Returns game_id
flip_card(game_id: u32, card_index: u8)
check_match(game_id: u32) -> bool
get_game(game_id: u32) -> GameState
abandon_game(game_id: u32)
```

### Account Registry

```cairo
register_account(telegram_id, owner_key, session_key) -> ContractAddress
update_session_key(telegram_id, new_key)
get_account(telegram_id) -> UserAccount
```

### Leaderboard System

```cairo
submit_score(game_id, telegram_id, score, difficulty, moves, time)
get_leaderboard_entry(rank: u32) -> LeaderboardEntry
get_player_stats(player: ContractAddress) -> PlayerStats
get_player_rank(player: ContractAddress) -> u32
```

### NFT System

```cairo
mint_score_nft(player, score, game_id) -> token_id
get_nft_metadata(token_id) -> ScoreNFT
```

---

## Testing

```bash
# Run all contract tests
sozo test

# Run specific suite
sozo test test_game_system
sozo test test_leaderboard
sozo test test_account_registry
```

**Coverage:**
- Game System: start, flip, match, win conditions, scoring
- Account Registry: registration, session key rotation, policies
- Leaderboard: submission, ranking, player stats
- NFT System: minting, metadata, eligibility

---

## Deployment

```bash
# Local (Katana)
./scripts/deploy.sh katana

# Testnet (Sepolia)
./scripts/deploy.sh sepolia

# Mainnet
./scripts/deploy.sh mainnet
```

Frontend is deployed automatically to Vercel on every push to `main`.

---

## Roadmap

- [x] Core memory game with Demo mode
- [x] 3 Eras × 5 Levels with sequential unlocking
- [x] Time medals (Gold / Silver / Bronze)
- [x] Combo multiplier system
- [x] Daily challenges
- [x] Ghost replay (watch your best run)
- [x] 15 Achievements
- [x] Daily streak with shields + score bonus
- [x] 3 visual themes (Museum / Nature / Urban)
- [x] NFT minting via Cartridge
- [x] Global leaderboard (Neon PostgreSQL)
- [x] Responsive layout for mobile, tablet, and desktop
- [x] Telegram bot (@enter_memorabilia_musem_bot)
- [ ] Telegram Stars payments for premium features
- [ ] Tournament mode with prize pools
- [ ] Avalanche / multi-chain support
- [ ] Season Pass with exclusive themes and bonus levels

---

## Cryptographic Foundations

Memorabilia's on-chain logic — key generation, transaction signing, account abstraction — is built on the same cryptographic primitives documented in the companion learning repository:

**[bitcoin_dojo-btcdeveloper](https://github.com/mwihoti/bitcoin_dojo-btcdeveloper)**

> Bitcoin Dojo — Cryptography Fundamentals Track  
> A hands-on implementation of elliptic curve cryptography from first principles, written in Rust.

### What Was Built (Module by Module)

| Module | Topic | What It Does |
|--------|-------|-------------|
| 1.1 | Hashing & Randomness | SHA-256 hashing and cryptographically secure random number generation |
| 1.2 | Field Element | Arithmetic over a finite field — numbers mod a prime `p` |
| 1.3 | Scalar | Arithmetic mod the curve order `n` — the space where private keys live |
| 1.4 | Curve Point | Elliptic curve point addition and the double-and-add scalar multiplication algorithm |
| 1.5 | Secp256k1 | The specific curve parameters used by Bitcoin (`p`, `n`, `G`) |
| 1.6 | Keys | Private key and public key generation (`Q = d × G`) |
| 1.7 | ECDSA | Elliptic Curve Digital Signature Algorithm — sign and verify messages |

### Key Concepts Covered

- Modular arithmetic and finite fields
- Fermat's Little Theorem
- Mathematical groups and elliptic curve structure
- Point addition and the double-and-add algorithm
- Public key cryptography (`Q = d × G`)
- ECDSA sign and verify

### How This Connects to Memorabilia

The same cryptographic stack powers this game:

- **Session keys** in `session_policy.cairo` are secp256k1 key pairs — a private scalar `d` and a public point `Q`
- **Transaction signing** by the Cartridge Controller uses ECDSA over secp256k1 (the same curve implemented in the Bitcoin Dojo track)
- **Account Abstraction** on Starknet validates signatures using the same verify logic — checking that a signature `(r, s)` was produced by the holder of a given public key
- **Starknet's native curve** (STARK curve) shares the same mathematical group structure — field elements, scalars, and point multiplication — just with different parameters than secp256k1

Understanding the cryptography from first principles (Bitcoin Dojo track) is what enabled building the account abstraction and session key system in this game with confidence.

---

## Resources

- [Dojo Book](https://book.dojoengine.org/)
- [Cairo Documentation](https://book.cairo-lang.org/)
- [Starknet Documentation](https://docs.starknet.io/)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Cartridge Controller](https://docs.cartridge.gg/)
- [Bitcoin Dojo — Crypto Fundamentals (Rust)](https://github.com/mwihoti/bitcoin_dojo-btcdeveloper)

---

## License

MIT

---

Built with ❤️ using Dojo on Starknet
