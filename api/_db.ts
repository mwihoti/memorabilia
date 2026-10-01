import { neon } from '@neondatabase/serverless';
import { MIGRATIONS, MIGRATION_TABLE, LATEST_MIGRATION } from './_schema';

const sql = neon(process.env.DATABASE_URL!);

/** Per-instance latch — a warm lambda checks the schema at most once. */
let schemaReady = false;

/**
 * Apply any migrations this database has not seen.
 *
 * Safe to call concurrently: each migration is wrapped in an advisory lock, so
 * two cold starts racing will not both run the same DDL.
 */
export async function runMigrations(): Promise<number[]> {
  await sql(MIGRATION_TABLE);

  const rows = (await sql`SELECT id FROM schema_migrations`) as Array<{ id: number }>;
  const applied = new Set(rows.map((r) => Number(r.id)));
  const ran: number[] = [];

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;

    // 0x4d454d is 'MEM' — an arbitrary namespace for this app's locks.
    await sql`SELECT pg_advisory_lock(5065037, ${migration.id})`;
    try {
      const recheck = (await sql`
        SELECT id FROM schema_migrations WHERE id = ${migration.id}
      `) as Array<{ id: number }>;
      if (recheck.length > 0) continue;

      for (const statement of migration.statements) {
        await sql(statement);
      }
      await sql`
        INSERT INTO schema_migrations (id, name)
        VALUES (${migration.id}, ${migration.name})
        ON CONFLICT (id) DO NOTHING
      `;
      ran.push(migration.id);
    } finally {
      await sql`SELECT pg_advisory_unlock(5065037, ${migration.id})`;
    }
  }

  return ran;
}

/**
 * Called by every endpoint. Normally one cheap SELECT; only migrates when the
 * database is genuinely behind, which on a deployed system is never, because
 * `scripts/migrate.mjs` has already run.
 */
export async function ensureDb() {
  if (schemaReady) return;

  try {
    const rows = (await sql`
      SELECT COALESCE(MAX(id), 0) AS version FROM schema_migrations
    `) as Array<{ version: number }>;

    if (Number(rows[0]?.version ?? 0) >= LATEST_MIGRATION) {
      schemaReady = true;
      return;
    }
  } catch {
    // schema_migrations itself is missing — fall through and build everything.
  }

  await runMigrations();
  schemaReady = true;
}

export { sql };
