import { sql } from './_db';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

/**
 * Per-instance fallback, used only when the database cannot be reached. Better
 * a limit that is too generous for a few seconds than an API that 500s.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Per-instance limit with no database round trip. Only for endpoints where a
 * looser limit is acceptable and latency is not, such as fire-and-forget
 * telemetry.
 */
export function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

/**
 * Fixed-window rate limit shared across every function instance.
 *
 * One atomic upsert per request: it either opens a fresh window or bumps the
 * live one, and returns the count, so two instances racing on the same key
 * cannot both slip under the limit.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  try {
    const rows = (await sql`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, NOW() + (${windowMs}::int * INTERVAL '1 millisecond'))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= NOW() THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= NOW() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
      RETURNING count, EXTRACT(EPOCH FROM (reset_at - NOW())) AS seconds_left
    `) as Array<{ count: number; seconds_left: number | string }>;

    const count = Number(rows[0]?.count ?? 1);
    if (count > limit) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil(Number(rows[0]?.seconds_left ?? 1))) };
    }
    return { allowed: true, retryAfter: 0 };
  } catch {
    // The table may not exist yet on a database that has not migrated.
    return memoryRateLimit(key, limit, windowMs);
  }
}

/** Expired windows are dead weight; the daily cron sweeps them. */
export async function pruneRateLimits(): Promise<number> {
  const rows = (await sql`
    DELETE FROM rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour' RETURNING 1
  `) as unknown[];
  return rows.length;
}

export function getClientKey(req: { headers: Record<string, any> }): string {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return String(raw || 'unknown').split(',')[0].trim();
}
