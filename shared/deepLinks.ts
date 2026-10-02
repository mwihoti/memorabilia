/**
 * Deep links into the game.
 *
 * Every invite goes through the bot, as `t.me/<bot>?start=<payload>`, because
 * that form works for every bot without extra BotFather setup and it lets the
 * bot register the player before the game opens. When the bot has a Main Mini
 * App configured, the same payload can also arrive as `start_param` on a
 * `?startapp=` link, so the game parses both with the same rules.
 */

export const DEFAULT_BOT_USERNAME = 'enter_memorabilia_musem_bot';

/** Room codes are six characters from [A-Z0-9], as issued by the API. */
const ROOM_CODE = /^[A-Z0-9]{6}$/;

export type StartPayload =
  | { kind: 'room'; roomId: string }
  | { kind: 'ref'; inviterId: number }
  | { kind: 'theme'; theme: string }
  | { kind: 'none' };

export function normalizeRoomCode(raw: string | null | undefined): string | null {
  const code = String(raw ?? '').trim().toUpperCase();
  return ROOM_CODE.test(code) ? code : null;
}

/** Read what a `/start` payload or a Mini App `start_param` asks for. */
export function parseStartPayload(raw: string | null | undefined): StartPayload {
  const payload = String(raw ?? '').trim();

  if (payload.toLowerCase().startsWith('room_')) {
    const roomId = normalizeRoomCode(payload.slice(5));
    return roomId ? { kind: 'room', roomId } : { kind: 'none' };
  }

  if (payload.startsWith('ref_')) {
    const inviterId = Number(payload.slice(4));
    return Number.isSafeInteger(inviterId) && inviterId > 0 ? { kind: 'ref', inviterId } : { kind: 'none' };
  }

  if (payload.startsWith('theme_')) {
    return { kind: 'theme', theme: payload.slice(6) };
  }

  return { kind: 'none' };
}

/** `https://t.me/<bot>?start=<payload>`, or the bare bot link without one. */
export function buildBotLink(botUsername: string, payload?: string): string {
  const base = `https://t.me/${botUsername.replace(/^@/, '')}`;
  return payload ? `${base}?start=${encodeURIComponent(payload)}` : base;
}

export function buildRoomInviteLink(botUsername: string, roomId: string): string {
  return buildBotLink(botUsername, `room_${roomId.toUpperCase()}`);
}

export function buildReferralLink(botUsername: string, inviterId: number | null | undefined): string {
  return buildBotLink(botUsername, inviterId ? `ref_${inviterId}` : undefined);
}

/** Telegram's share sheet: pick a chat, and the link and text are sent there. */
export function buildTelegramShareUrl(link: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
}
