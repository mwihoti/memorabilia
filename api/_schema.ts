/**
 * The database schema, as an ordered list of idempotent migrations.
 *
 * Run at deploy time by `scripts/migrate.mjs`. `ensureDb()` also runs it once
 * per cold start as a safety net, but it short-circuits on a version check so
 * the request path pays one cheap SELECT rather than thirty DDL round-trips.
 *
 * Append-only: never edit a shipped migration, add a new one.
 */

export interface Migration {
  id: number;
  name: string;
  /** Each statement runs separately — Neon's driver takes one per call. */
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'core',
    statements: [
      `CREATE TABLE IF NOT EXISTS users (
        telegram_id    BIGINT PRIMARY KEY,
        username       VARCHAR(255),
        first_name     VARCHAR(255),
        last_name      VARCHAR(255),
        wallet_address VARCHAR(255),
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        last_active    TIMESTAMPTZ DEFAULT NOW(),
        total_games    INT DEFAULT 0,
        total_wins     INT DEFAULT 0,
        best_score     INT DEFAULT 0,
        average_score  INT DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS game_sessions (
        id           SERIAL PRIMARY KEY,
        telegram_id  BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        run_id       INT,
        score        INT NOT NULL,
        difficulty   SMALLINT NOT NULL,
        level        INT NOT NULL DEFAULT 1,
        moves        INT NOT NULL,
        time_seconds INT NOT NULL,
        stars        SMALLINT DEFAULT 1,
        verified     BOOLEAN NOT NULL DEFAULT FALSE,
        played_at    TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS player_progress (
        telegram_id  BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        era          SMALLINT NOT NULL,
        level        INT NOT NULL,
        completed    BOOLEAN NOT NULL DEFAULT FALSE,
        best_score   INT NOT NULL DEFAULT 0,
        best_time    INT NOT NULL DEFAULT 0,
        best_medal   VARCHAR(16) NOT NULL DEFAULT 'none',
        stars        SMALLINT NOT NULL DEFAULT 0,
        completed_at TIMESTAMPTZ,
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (telegram_id, era, level)
      )`,
      `CREATE TABLE IF NOT EXISTS run_sessions (
        id             SERIAL PRIMARY KEY,
        telegram_id    BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        difficulty     SMALLINT NOT NULL,
        level          INT NOT NULL,
        challenge_mode VARCHAR(16) NOT NULL DEFAULT 'standard',
        seed           INT NOT NULL,
        started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at   TIMESTAMPTZ,
        verification_status VARCHAR(16) NOT NULL DEFAULT 'pending'
      )`,
      `CREATE TABLE IF NOT EXISTS telemetry_events (
        id         SERIAL PRIMARY KEY,
        type       VARCHAR(16) NOT NULL,
        source     VARCHAR(64) NOT NULL,
        message    TEXT NOT NULL,
        metadata   JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS challenge_rooms (
        id               VARCHAR(24) PRIMARY KEY,
        host_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        difficulty       SMALLINT NOT NULL,
        level            INT NOT NULL,
        seed             INT NOT NULL,
        status           VARCHAR(16) NOT NULL DEFAULT 'lobby',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at       TIMESTAMPTZ,
        completed_at     TIMESTAMPTZ
      )`,
      `CREATE TABLE IF NOT EXISTS challenge_room_participants (
        room_id           VARCHAR(24) NOT NULL REFERENCES challenge_rooms(id) ON DELETE CASCADE,
        telegram_id       BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        display_name      VARCHAR(255) NOT NULL,
        status            VARCHAR(16) NOT NULL DEFAULT 'joined',
        joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at       TIMESTAMPTZ,
        best_time_seconds INT,
        best_moves        INT,
        best_score        INT,
        verified          BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY (room_id, telegram_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_telegram ON game_sessions(telegram_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_played_at ON game_sessions(played_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_users_best_score ON users(best_score DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_progress_telegram ON player_progress(telegram_id)`,
      `CREATE INDEX IF NOT EXISTS idx_run_sessions_telegram ON run_sessions(telegram_id, started_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_challenge_room_participants_room ON challenge_room_participants(room_id)`,
    ],
  },

  {
    id: 2,
    name: 'progression',
    statements: [
      // Streaks and granted power-up charges move off localStorage so they
      // survive a device change and can be referenced in a push message.
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_current INT NOT NULL DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_longest INT NOT NULL DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_last_date DATE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS power_hint INT NOT NULL DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS power_freeze INT NOT NULL DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS power_boost INT NOT NULL DEFAULT 0`,
      `CREATE TABLE IF NOT EXISTS player_achievements (
        telegram_id    BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        achievement_id VARCHAR(64) NOT NULL,
        unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (telegram_id, achievement_id)
      )`,
      `CREATE TABLE IF NOT EXISTS player_relics (
        telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        relic_id    VARCHAR(64) NOT NULL,
        era         SMALLINT NOT NULL,
        level       INT NOT NULL,
        earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (telegram_id, relic_id)
      )`,
    ],
  },

  {
    id: 3,
    name: 'push-and-referrals',
    statements: [
      // chat_id is what the bot needs to reach a player; it is only known from
      // a webhook update, so it stays null until they talk to the bot.
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_id BIGINT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT TRUE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_push_at TIMESTAMPTZ`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by BIGINT`,
      `CREATE TABLE IF NOT EXISTS referrals (
        inviter_telegram_id BIGINT NOT NULL,
        invitee_telegram_id BIGINT NOT NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        rewarded            BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY (invitee_telegram_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_telegram_id)`,
      `CREATE INDEX IF NOT EXISTS idx_users_push ON users(push_enabled, last_active DESC)`,
    ],
  },

  {
    id: 4,
    name: 'duels',
    statements: [
      // A duel is a challenge room with two seats and a deadline.
      `ALTER TABLE challenge_rooms ADD COLUMN IF NOT EXISTS mode VARCHAR(16) NOT NULL DEFAULT 'room'`,
      `ALTER TABLE challenge_rooms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`,
      `CREATE INDEX IF NOT EXISTS idx_rooms_mode_expiry ON challenge_rooms(mode, expires_at)`,
    ],
  },

  {
    id: 5,
    name: 'weekly-ladder',
    statements: [
      `CREATE TABLE IF NOT EXISTS weekly_scores (
        week_key    VARCHAR(12) NOT NULL,
        telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        best_score  INT NOT NULL DEFAULT 0,
        games       INT NOT NULL DEFAULT 0,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (week_key, telegram_id)
      )`,
      `CREATE TABLE IF NOT EXISTS weekly_champions (
        week_key    VARCHAR(12) PRIMARY KEY,
        telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        score       INT NOT NULL,
        crowned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_weekly_scores_board ON weekly_scores(week_key, best_score DESC)`,
    ],
  },

  {
    id: 6,
    name: 'boss-events',
    statements: [
      `CREATE TABLE IF NOT EXISTS boss_events (
        id        SERIAL PRIMARY KEY,
        era       SMALLINT NOT NULL,
        level     INT NOT NULL,
        seed      INT NOT NULL,
        relic_id  VARCHAR(64) NOT NULL,
        title     VARCHAR(64) NOT NULL,
        opens_at  TIMESTAMPTZ NOT NULL,
        closes_at TIMESTAMPTZ NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS boss_clears (
        event_id     INT NOT NULL REFERENCES boss_events(id) ON DELETE CASCADE,
        telegram_id  BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        score        INT NOT NULL,
        time_seconds INT NOT NULL,
        cleared_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (event_id, telegram_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_boss_window ON boss_events(opens_at, closes_at)`,
    ],
  },

  {
    id: 7,
    name: 'guilds-and-seasons',
    statements: [
      `CREATE TABLE IF NOT EXISTS guilds (
        id               VARCHAR(24) PRIMARY KEY,
        name             VARCHAR(48) NOT NULL UNIQUE,
        emblem           VARCHAR(8) NOT NULL DEFAULT '🏛️',
        owner_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      // One guild per player — the primary key enforces it.
      `CREATE TABLE IF NOT EXISTS guild_members (
        telegram_id BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
        guild_id    VARCHAR(24) NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
        role        VARCHAR(16) NOT NULL DEFAULT 'member',
        joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id)`,
      `CREATE TABLE IF NOT EXISTS seasons (
        season_key VARCHAR(16) PRIMARY KEY,
        name       VARCHAR(64) NOT NULL,
        starts_at  TIMESTAMPTZ NOT NULL,
        ends_at    TIMESTAMPTZ NOT NULL,
        archived   BOOLEAN NOT NULL DEFAULT FALSE
      )`,
      `CREATE TABLE IF NOT EXISTS season_scores (
        season_key  VARCHAR(16) NOT NULL REFERENCES seasons(season_key) ON DELETE CASCADE,
        telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        points      INT NOT NULL DEFAULT 0,
        games       INT NOT NULL DEFAULT 0,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (season_key, telegram_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_season_scores_board ON season_scores(season_key, points DESC)`,
    ],
  },

  {
    id: 8,
    name: 'quit-strikes',
    statements: [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS consecutive_quits INT NOT NULL DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS total_quits INT NOT NULL DEFAULT 0`,
    ],
  },

  {
    id: 9,
    name: 'shared-rate-limits-and-room-runs',
    statements: [
      // One counter per key, shared by every function instance. The in-memory
      // map it replaces was per instance, so N warm lambdas allowed N times
      // the limit.
      `CREATE TABLE IF NOT EXISTS rate_limits (
        key      VARCHAR(160) PRIMARY KEY,
        count    INT NOT NULL,
        reset_at TIMESTAMPTZ NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at)`,
      // Ties a verified run to the room it was played in, so a room result is
      // read from the verified run rather than taken from the client.
      `ALTER TABLE run_sessions ADD COLUMN IF NOT EXISTS room_id VARCHAR(8)`,
      // Power-up balances become a spendable bank in this release. Until now
      // grants were added here but never spent here — the client used them
      // within one level and forgot them — so the stored totals count charges
      // already used. Start every bank from zero rather than refund those.
      `UPDATE users SET power_hint = 0, power_freeze = 0, power_boost = 0`,
    ],
  },
];

/** Bookkeeping table the runner uses to know what has already applied. */
export const MIGRATION_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id         INT PRIMARY KEY,
    name       VARCHAR(64) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

export const LATEST_MIGRATION = MIGRATIONS[MIGRATIONS.length - 1].id;
