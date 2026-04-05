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
      score        INT NOT NULL,
      difficulty   SMALLINT NOT NULL,
      moves        INT NOT NULL,
      time_seconds INT NOT NULL,
      stars        SMALLINT DEFAULT 1,
      played_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_telegram ON game_sessions(telegram_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_played_at ON game_sessions(played_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_best_score ON users(best_score DESC)`;

  initialized = true;
}

export { sql };
