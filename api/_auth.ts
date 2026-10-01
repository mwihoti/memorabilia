import crypto from 'crypto';

export interface TelegramAuthUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResult {
  valid: boolean;
  user?: TelegramAuthUser;
  reason?: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Max age of a Telegram initData payload. A captured string must not work forever. */
const MAX_AUTH_AGE_SECONDS = 24 * 3600;

/**
 * Verify Telegram WebApp initData using HMAC-SHA256, then check its freshness.
 *
 * Returns a verdict; it never decides policy. `requireTelegramUser` does that.
 */
export function verifyTelegramAuth(
  initData: string,
  botToken: string,
  now: Date = new Date(),
): AuthResult {
  try {
    if (!botToken) return { valid: false, reason: 'No bot token configured' };
    if (!initData) return { valid: false, reason: 'No initData provided' };

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return { valid: false, reason: 'No hash in initData' };

    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // Constant-time compare — a plain !== leaks the hash a byte at a time.
    const expected = Buffer.from(hmac, 'hex');
    const actual = Buffer.from(hash, 'hex');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      return { valid: false, reason: 'Hash mismatch' };
    }

    // Freshness. Without this, one captured initData string is a permanent key.
    const authDate = Number(urlParams.get('auth_date') ?? 0);
    if (!authDate) return { valid: false, reason: 'No auth_date in initData' };
    const ageSeconds = Math.floor(now.getTime() / 1000) - authDate;
    if (ageSeconds > MAX_AUTH_AGE_SECONDS) {
      return { valid: false, reason: 'Session expired, reopen the game' };
    }

    const userParam = urlParams.get('user');
    const user: TelegramAuthUser | undefined = userParam
      ? JSON.parse(decodeURIComponent(userParam))
      : undefined;

    return { valid: true, user };
  } catch (err: any) {
    return { valid: false, reason: err.message };
  }
}

/**
 * The single gate every write endpoint goes through.
 *
 * Fails closed: a missing `TELEGRAM_BOT_TOKEN` is a hard error in production,
 * not a silent bypass. Local development opts out explicitly by setting
 * `ALLOW_UNVERIFIED_AUTH=1`, which must never be set in a deployed environment.
 */
export async function requireTelegramUser(body: any): Promise<TelegramAuthUser> {
  const claimed = body?.telegramUser;
  if (!claimed?.id) throw new AuthError('Missing Telegram user');

  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

  if (!botToken) {
    if (process.env.ALLOW_UNVERIFIED_AUTH === '1') {
      return claimed as TelegramAuthUser;
    }
    throw new AuthError('Server is not configured to verify Telegram users');
  }

  const auth = verifyTelegramAuth(body?.initData ?? '', botToken);
  if (!auth.valid || !auth.user) {
    throw new AuthError(`Unauthorized: ${auth.reason ?? 'verification failed'}`);
  }
  if (auth.user.id !== claimed.id) {
    throw new AuthError('Unauthorized: identity mismatch');
  }

  return {
    id: auth.user.id,
    username: auth.user.username,
    first_name: auth.user.first_name || claimed.first_name,
    last_name: auth.user.last_name,
  };
}
