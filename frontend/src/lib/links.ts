import {
  DEFAULT_BOT_USERNAME,
  buildReferralLink,
  buildRoomInviteLink,
  buildTelegramShareUrl,
  normalizeRoomCode,
  parseStartPayload,
} from '../../../shared/deepLinks.js';
import { getTelegramWebApp } from '../telegram/telegram';

export const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || DEFAULT_BOT_USERNAME;

export function roomInviteLink(roomId: string): string {
  return buildRoomInviteLink(BOT_USERNAME, roomId);
}

export function referralLink(inviterId?: number | null): string {
  return buildReferralLink(BOT_USERNAME, inviterId);
}

/**
 * The room this launch should open, if any.
 *
 * Checked in order: the Mini App `start_param` (a `?startapp=room_X` link, when
 * the bot has a Main Mini App), Telegram's `tgWebAppStartParam` URL fallback,
 * and the plain `?room=X` the bot's join button uses.
 */
export function getLaunchRoomId(): string | null {
  const startParam = getTelegramWebApp()?.initDataUnsafe?.start_param;
  const search = new URLSearchParams(window.location.search);

  for (const raw of [startParam, search.get('tgWebAppStartParam')]) {
    const payload = parseStartPayload(raw);
    if (payload.kind === 'room') return payload.roomId;
  }
  return normalizeRoomCode(search.get('room'));
}

/**
 * Share a message with a link, using the best channel the client has.
 *
 * Inside Telegram the share sheet keeps the player in the app and lets them
 * pick a chat; elsewhere the system share sheet, then the clipboard. Resolves
 * to how it was shared so the caller can say "copied" when that is what
 * happened.
 */
export async function shareLink(link: string, text: string): Promise<'telegram' | 'native' | 'copied' | 'failed'> {
  const shareUrl = buildTelegramShareUrl(link, text);
  const webApp = getTelegramWebApp();

  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(shareUrl);
    return 'telegram';
  }

  if (navigator.share) {
    try {
      await navigator.share({ text, url: link });
      return 'native';
    } catch {
      // Cancelled or unsupported; fall through to the clipboard.
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${link}`);
    return 'copied';
  } catch {
    window.open(shareUrl, '_blank');
    return 'failed';
  }
}
