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

/**
 * Verify Telegram WebApp initData using HMAC-SHA256.
 * Falls back to trusting the request body in dev mode (no BOT_TOKEN).
 */
export function verifyTelegramAuth(initData: string, botToken: string): AuthResult {
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

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (hmac !== hash) return { valid: false, reason: 'Hash mismatch' };

    const userParam = urlParams.get('user');
    const user: TelegramAuthUser | undefined = userParam
      ? JSON.parse(decodeURIComponent(userParam))
      : undefined;

    return { valid: true, user };
  } catch (err: any) {
    return { valid: false, reason: err.message };
  }
}
