#!/usr/bin/env node
/**
 * Apply database migrations at deploy time.
 *
 *   DATABASE_URL=postgres://... node scripts/migrate.mjs
 *
 * `ensureDb()` will also migrate on a cold start, but running it here keeps DDL
 * off the request path and turns a bad migration into a failed deploy rather
 * than a failed user request.
 *
 * Requires Node 22.6+ (type stripping) — the repo already targets Node 18+ for
 * the functions, so check `node --version` if the import below fails.
 */

import { neon } from '@neondatabase/serverless';
import { MIGRATIONS, MIGRATION_TABLE } from '../api/_schema.ts';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql(MIGRATION_TABLE);

const rows = await sql`SELECT id FROM schema_migrations`;
const applied = new Set(rows.map((r) => Number(r.id)));

let ran = 0;
for (const migration of MIGRATIONS) {
  if (applied.has(migration.id)) {
    console.log(`  skip   ${migration.id}  ${migration.name}`);
    continue;
  }

  process.stdout.write(`  apply  ${migration.id}  ${migration.name} …`);
  for (const statement of migration.statements) {
    await sql(statement);
  }
  await sql`
    INSERT INTO schema_migrations (id, name) VALUES (${migration.id}, ${migration.name})
    ON CONFLICT (id) DO NOTHING
  `;
  console.log(' done');
  ran++;
}

console.log(ran === 0 ? 'Schema already up to date.' : `Applied ${ran} migration(s).`);
