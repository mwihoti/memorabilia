import { sql } from './_db';

export async function logApiError(source: string, error: unknown, metadata?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${source}]`, error);

  try {
    await sql`
      INSERT INTO telemetry_events (type, source, message, metadata)
      VALUES ('error', ${source}, ${message}, ${JSON.stringify(metadata ?? {})}::jsonb)
    `;
  } catch (telemetryError) {
    console.error('[telemetry] Failed to persist API error', telemetryError);
  }
}
