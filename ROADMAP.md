# Roadmap

Replaces the previous `PROJECT_SUMMARY.md`, `SPRINT_NOW.md` and the four
dashboard/Torii documents, which described work that was never verified.

Nothing here is marked done until it has been run.

---

## Shipped

- 400 levels across five eras, with per-era card skins and an animated gallery background
- Server-side replay verification — no score enters the leaderboard unverified
- Telegram auth that **fails closed**; `TELEGRAM_BOT_TOKEN` missing in production is an error, not a bypass
- Activity layer: weekly ladder with reset, six-week seasons, 24-hour duels, 48-hour boss hunts, guilds, relic collection, referrals
- Scheduled jobs: daily push, weekly rollover and crowning, boss rotation, duel settlement
- Versioned SQL migrations (`api/_schema.ts`, `scripts/migrate.mjs`) — schema changes no longer run on the request path

---

## Next — product

Gated on retention. If day-7 retention stays under 5% after two iterations, fix the
core loop before building more activities.

- [ ] Instrument the funnel: bot start → mini app open → level start → level complete → return
- [ ] A dashboard for yesterday's numbers that does not need a SQL client
- [ ] Error reporting with alerting; a 500 in a Vercel function currently reaches nobody
- [ ] Replace emoji artifacts with drawn SVG art — emoji render differently per OS, which makes the same board look different to different players
- [ ] Co-op boards (two players, one board, alternating flips)

## Next — platform

- [ ] Move rate limiting out of the per-lambda `Map` in `api/_rateLimit.ts`; it resets on every cold start and each concurrent instance gets a full budget
- [ ] Device testing on low-end Android inside the Telegram in-app browser, which is the modal player

---

## Starknet

The world in `src/` has never been built or deployed. In order:

- [ ] Restore `src/utils/card_generator.cairo` (clean ancestor at commit `a31a9db`) and get `sozo build` green
- [ ] Add a Cairo CI workflow — `sozo build && sozo test` on every push
- [ ] Rewrite the game system around settlement: one `submit_verified_score` transaction per completed level, not one per card flip
- [ ] Access control — `mint_score_nft` and `submit_score` are currently callable by anyone
- [ ] Upgrade `@dojoengine/*` from 0.7 to the 1.x line matching Dojo 1.8; budget a week
- [ ] `gameController.ts` sends entrypoints to the world address; in Dojo 1.x systems are separate contracts, so every transaction would revert
- [ ] Real ERC-721 for score NFTs, or drop the NFT framing — a Dojo model with a `u32` id is not a token any wallet can show
- [ ] Deploy to Sepolia, stand up Torii, regenerate the queries in `toriiClient.ts` against the real schema

**Exit gate:** 50 games played by people outside the team, each settled in a Sepolia
transaction and visible on Starkscan.

---

## Bitcoin — optional, unblocked by the above

- [ ] Use a Bitcoin block hash as the daily/weekly seed. The current seed is derived from the date, so tomorrow's board is computable by anyone reading this repo
- [ ] Anchor each season's leaderboard with OpenTimestamps
- [ ] Lightning sats rewards — only after an independent review of the replay validator, and with legal advice for the jurisdictions served

---

## Deployment notes

```bash
# Apply migrations before or just after a deploy
DATABASE_URL=postgres://... node scripts/migrate.mjs
```

Required environment variables:

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | all API routes | Neon connection string |
| `TELEGRAM_BOT_TOKEN` | auth, bot, cron | **Required in production** — auth fails closed without it |
| `CRON_SECRET` | `api/cron.ts` | Bearer token Vercel sends; without it anyone could spam every player |
| `GAME_URL` | `api/cron.ts` | Deep link used in push messages |
| `ALLOW_UNVERIFIED_AUTH` | local only | Set to `1` to skip verification in development. Never set this in a deployed environment |
