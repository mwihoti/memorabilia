import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

let initialized = false;

export async function ensureDb() {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id   BIGINT PRIMARY KEY,
      username      VARCHAR(255),
      first_name    VARCHAR(255),
      last_name     VARCHAR(255),
      wallet_address VARCHAR(255),
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      last_active   TIMESTAMPTZ DEFAULT NOW(),
      total_games   INT DEFAULT 0,
      total_wins    INT DEFAULT 0,
      best_score    INT DEFAULT 0,
      average_score INT DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS game_sessions (
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS player_progress (
      telegram_id   BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
      era           SMALLINT NOT NULL,
      level         INT NOT NULL,
      completed     BOOLEAN NOT NULL DEFAULT FALSE,
      best_score    INT NOT NULL DEFAULT 0,
      best_time     INT NOT NULL DEFAULT 0,
      best_medal    VARCHAR(16) NOT NULL DEFAULT 'none',
      stars         SMALLINT NOT NULL DEFAULT 0,
      completed_at  TIMESTAMPTZ,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (telegram_id, era, level)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS run_sessions (
      id             SERIAL PRIMARY KEY,
      telegram_id    BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
      difficulty     SMALLINT NOT NULL,
      level          INT NOT NULL,
      challenge_mode VARCHAR(16) NOT NULL DEFAULT 'standard',
      seed           INT NOT NULL,
      started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at   TIMESTAMPTZ,
      verification_status VARCHAR(16) NOT NULL DEFAULT 'pending'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS telemetry_events (
      id          SERIAL PRIMARY KEY,
      type        VARCHAR(16) NOT NULL,
      source      VARCHAR(64) NOT NULL,
      message     TEXT NOT NULL,
      metadata    JSONB,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS challenge_rooms (
      id              VARCHAR(24) PRIMARY KEY,
      host_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
      difficulty      SMALLINT NOT NULL,
      level           INT NOT NULL,
      seed            INT NOT NULL,
      status          VARCHAR(16) NOT NULL DEFAULT 'lobby',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at      TIMESTAMPTZ,
      completed_at    TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS challenge_room_participants (
      room_id            VARCHAR(24) NOT NULL REFERENCES challenge_rooms(id) ON DELETE CASCADE,
      telegram_id        BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
      display_name       VARCHAR(255) NOT NULL,
      status             VARCHAR(16) NOT NULL DEFAULT 'joined',
      joined_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at        TIMESTAMPTZ,
      best_time_seconds  INT,
      best_moves         INT,
      best_score         INT,
      verified           BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (room_id, telegram_id)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_telegram ON game_sessions(telegram_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_played_at ON game_sessions(played_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_best_score ON users(best_score DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_progress_telegram ON player_progress(telegram_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_run_sessions_telegram ON run_sessions(telegram_id, started_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_challenge_room_participants_room ON challenge_room_participants(room_id)`;

  initialized = true;
}

export { sql };
