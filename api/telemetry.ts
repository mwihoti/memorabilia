import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDb, sql } from './_db';
import { getClientKey, memoryRateLimit } from './_rateLimit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  // Telemetry is fire-and-forget and already sheds load with a 202, so it
  // keeps the cheap per-instance limiter instead of a database write.
  const limit = memoryRateLimit(`telemetry:${getClientKey(req)}`, 80, 60_000);
  if (!limit.allowed) return res.status(202).json({ success: false });

  try {
    await ensureDb();
    const { type, source, message, metadata } = req.body as {
      type: 'event' | 'error';
      source: string;
      message: string;
      metadata?: Record<string, unknown>;
    };

    if (!type || !source || !message) return res.status(400).json({ message: 'Missing telemetry fields' });

    await sql`
      INSERT INTO telemetry_events (type, source, message, metadata)
      VALUES (${type}, ${source}, ${message}, ${JSON.stringify(metadata ?? {})}::jsonb)
    `;

    return res.status(200).json({ success: true });
  } catch {
    return res.status(202).json({ success: false });
  }
}
