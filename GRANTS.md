# Grants Tracker — Memorabilia

> Tracking grant opportunities, application status, and what needs to be done before applying.

---

## Status Overview

| Grant Program | Ecosystem | Amount | Status | Priority |
|---|---|---|---|---|
| Starknet Foundation | Starknet | $5k–$50k | Not applied | High |
| Cartridge / Dojo | Dojo engine | Varies | Not applied | High |
| Immutable X | Gaming NFTs | Up to $100k | Needs work | Medium |
| Ronin Network | Web3 Gaming | Varies | Needs work | Low |
| Optimism RetroPGF | OP Stack | Varies | Not eligible yet | Low |
| Arbitrum DAO | Arbitrum | Varies | Not eligible yet | Low |

---

## High Priority

### 1. Starknet Foundation Grants

**Why we qualify:**
- Fully on-chain game using Cairo smart contracts
- Account Abstraction with session keys for gasless gameplay
- Dojo ECS framework + Torii indexer
- Telegram Mini App reaching non-crypto users (Starknet onboarding story)
- Open source, MIT licensed

**Apply at:** https://www.starknet.io/grants

**What they fund:**
- Tools and infrastructure built on Starknet
- Games and consumer apps that demonstrate Starknet's unique features (AA, ZK, Cairo)
- Projects that grow the Starknet developer or user ecosystem

**Required before applying:**
- [ ] Deploy contracts to Starknet Sepolia (`sozo migrate apply --profile sepolia`)
- [ ] Update `VITE_WORLD_ADDRESS` in production env with deployed address
- [ ] Record 2–3 min video walkthrough of the game + on-chain transactions
- [ ] 50+ real game sessions on Sepolia (shows live usage)
- [ ] Public GitHub repo

**Application materials needed:**
- Project summary (use README.md project summary section)
- Team bios (6 members listed in README)
- On-chain activity link (Starkscan explorer link to world contract)
- Live demo URL: https://memorabilia-game.vercel.app
- Telegram bot: https://t.me/enter_memorabilia_musem_bot
- Roadmap with milestones and dates
- Requested amount and budget breakdown

**Key talking points for the application:**
- Session keys + Account Abstraction = zero-friction onboarding (no wallet popup, no gas)
- Dojo Telegram SDK we built is reusable by any game team (ecosystem contribution)
- Distribution via Telegram reaches users who have never touched Web3
- 15 levels, ghost replay, daily challenges, NFT minting — full game, not a prototype

---

### 2. Cartridge / Dojo Ecosystem

**Why we qualify:**
- Using Dojo 1.8.0 ECS framework for all game logic
- Using `@cartridge/controller` for wallet connection and NFT minting
- Using `@dojoengine/create-burner` for session key management
- Built a reusable `dojo-telegram-sdk` that benefits the broader Dojo ecosystem

**Apply / reach out at:** https://discord.gg/dojoengine  
Tag the project in `#showcase` and `#grants` channels.

**What they fund:**
- Games built with Dojo that showcase the engine's capabilities
- Developer tooling and SDKs that extend the Dojo ecosystem
- Projects that drive Cartridge Controller adoption

**Required before applying:**
- [ ] Deploy contracts to Sepolia
- [ ] Publish `dojo-telegram-sdk` as a standalone npm package
- [ ] Write a short dev blog post about the SDK (Medium or Mirror.xyz)
- [ ] Post in Dojo Discord `#showcase` first to build visibility

**Key talking points:**
- `dojo-telegram-sdk` is a first-of-its-kind Telegram + Dojo integration layer
- Demonstrates Cartridge Controller's NFT minting flow end-to-end
- Session key + burner account pattern documented and reusable

---

## Medium Priority

### 3. Immutable X Gaming Grants

**Why this is relevant:**
- Immutable X specializes in gaming NFTs with zero gas fees
- They actively fund games that mint NFTs on their chain
- Larger NFT secondary market (IMX marketplace) than Starknet currently

**Apply at:** https://www.immutable.com/grants

**What needs to be built:**
- Integrate `@imtbl/sdk` alongside existing Starknet NFT minting
- Deploy an ERC-721 contract on Immutable X testnet
- Add "Mint on Immutable X" as an alternative in the Win Modal
- The game logic stays on Starknet — only the NFT mint destination changes

**Estimated work:** 2–3 weeks

**Required before applying:**
- [ ] Build Immutable X NFT mint flow (parallel to existing Cartridge mint)
- [ ] Deploy test NFT contract on IMX testnet
- [ ] Show at least 10 NFTs minted on IMX testnet
- [ ] Record demo of the dual-mint flow

---

## Low Priority (Not Eligible Yet)

### 4. Ronin Network

**Why it's not ready:**
- Ronin is a separate EVM chain (Axie Infinity's chain)
- Would require porting Cairo contracts to Solidity
- No equivalent of Dojo on Ronin
- Significant migration: 4–8 weeks minimum

**Revisit when:** You want to target the Axie/Sky Mavis audience specifically.

---

### 5. Optimism RetroPGF

**Why it's not ready:**
- RetroPGF is retroactive — rewards past public goods contributions
- Requires being on Optimism or demonstrably serving the OP ecosystem
- Current stack is Starknet-only

**Path to eligibility:**
- Deploy a version on Optimism using Solidity contracts
- OR contribute developer tooling that the OP ecosystem uses
- Apply after 6+ months of on-chain activity

---

### 6. Arbitrum DAO

**Why it's not ready:**
- Same blocker as Optimism — need to be building on Arbitrum
- DAO grant process is slow (governance votes, multi-week cycles)

**Path to eligibility:**
- Port or bridge to Arbitrum
- Build out an Arbitrum-native version

---

## Universal Application Checklist

These materials are needed for every grant application regardless of program:

### Technical
- [ ] Contracts deployed to testnet (Sepolia minimum)
- [ ] Live demo playable without wallet: https://memorabilia-game.vercel.app
- [ ] Public GitHub repo with MIT LICENSE (done)
- [ ] `/api/stats` endpoint live with real usage numbers
- [ ] Telegram bot active: https://t.me/enter_memorabilia_musem_bot

### Documentation
- [ ] 2–3 min demo video (Loom or YouTube)
- [ ] Architecture diagram (in README)
- [ ] Roadmap with concrete dates (update README roadmap section)
- [ ] Team bios with LinkedIn or prior project links

### Metrics (collect before applying)
- [ ] Total unique players
- [ ] Total games played
- [ ] Daily active users (from `/api/stats`)
- [ ] On-chain transaction count (from Starkscan after deployment)
- [ ] NFTs minted

### Narrative
- [ ] One-paragraph "why Starknet/Dojo specifically" (not generic blockchain)
- [ ] Budget breakdown for requested funds
- [ ] Specific milestones the grant would fund

---

## NFT Strategy

The current NFT implementation uses Cartridge Controller on Starknet Sepolia.

**To maximize NFT grant eligibility:**

1. **Starknet / Cartridge** — already integrated, deploy to activate
2. **Immutable X** — add as second mint option (medium effort, new grant pool)
3. **Ordinals / Bitcoin** — not recommended; tooling immature for game achievement NFTs

NFT mint threshold is currently configurable in `frontend/src/cartridge/config.ts`.
Minimum score to mint: check `isScoreEligibleForNFT()`.

---

## Deployment Steps (Blocker for All Grants)

```bash
# 1. Get Sepolia ETH
#    Faucet: https://starknet-faucet.vercel.app

# 2. Create a deployer account on Sepolia
#    Use Argent X or Braavos on Sepolia testnet

# 3. Fill in Scarb.toml [profile.sepolia]
#    account_address = "0x..."
#    private_key     = "0x..."

# 4. Deploy
sozo migrate apply --profile sepolia

# 5. Note the world address from output, set in .env.sepolia
#    VITE_WORLD_ADDRESS=0x<world-address>
#    VITE_NFT_CONTRACT_ADDRESS=0x<nft-contract-address>

# 6. Redeploy frontend on Vercel with updated env vars
```

---

## Resources

- Starknet grants info: https://www.starknet.io/grants
- Dojo documentation: https://book.dojoengine.org
- Cartridge Controller docs: https://docs.cartridge.gg
- Immutable X grants: https://www.immutable.com/grants
- Dojo Discord: https://discord.gg/dojoengine
- Starknet Discord: https://discord.gg/starknet
- Starkscan explorer (Sepolia): https://sepolia.starkscan.co
