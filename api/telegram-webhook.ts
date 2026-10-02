import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { parseStartPayload } from '../shared/deepLinks';
import { sql, ensureDb } from './_db';

const TOKEN    = process.env.BOT_TOKEN!;
const WEB_APP  = process.env.WEB_APP_URL || 'https://memorabilia-game.vercel.app';
const API_URL  = process.env.API_URL || WEB_APP;
const TG       = `https://api.telegram.org/bot${TOKEN}`;

// ── Telegram API helpers ──────────────────────────────────────────────────────

async function tg(method: string, body: object) {
  const res = await fetch(`${TG}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function sendMessage(chatId: number, text: string, extra: object = {}) {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
}

function editMessage(chatId: number, messageId: number, text: string, extra: object = {}) {
  return tg('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', ...extra });
}

function answerCallback(callbackQueryId: string) {
  return tg('answerCallbackQuery', { callback_query_id: callbackQueryId });
}

function h(s: string | number) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Keyboards ─────────────────────────────────────────────────────────────────

const KB_MAIN = {
  inline_keyboard: [
    [{ text: '🎮  Play Now', web_app: { url: WEB_APP } }],
    [
      { text: '📖 How It Works', callback_data: 'how'    },
      { text: '🏆 Top Players',  callback_data: 'lb'     },
    ],
    [
      { text: '🎨 Themes',       callback_data: 'themes' },
      { text: '🌍 About',        callback_data: 'about'  },
    ],
  ],
};

const KB_THEME_PICK = {
  inline_keyboard: [
    [
      { text: '🏺 Ancient',  callback_data: 'theme:ancient'  },
      { text: '⚔️ Medieval', callback_data: 'theme:medieval' },
      { text: '🚀 Modern',   callback_data: 'theme:modern'   },
    ],
    [
      { text: '🛸 Future', callback_data: 'theme:future' },
      { text: '🐲 Mythic', callback_data: 'theme:mythic' },
    ],
    [{ text: '« Back to Menu', callback_data: 'main' }],
  ],
};

const KB_PLAY = {
  inline_keyboard: [
    [{ text: '🎮  Enter the Game', web_app: { url: WEB_APP } }],
    [{ text: '« Back to Menu', callback_data: 'main' }],
  ],
};

const KB_BACK = {
  inline_keyboard: [
    [{ text: '🎮  Play Now', web_app: { url: WEB_APP } }],
    [{ text: '« Back to Menu', callback_data: 'main' }],
  ],
};

// ── Content ───────────────────────────────────────────────────────────────────

function welcomeText(name: string) {
  return (
    `🏛️ <b>Hey ${name}! Welcome to Memorabilia!</b>\n\n` +
    `I'm your guide to the Time-Travel Museum — a memory game with verified scores.\n\n` +
    `Flip cards, find matching pairs, and climb the <b>Hall of Fame</b>!\n\n` +
    `👇 What would you like to do?`
  );
}

const HOW_TEXT =
  '📖 <b>How Memorabilia Works</b>\n\n' +
  '🃏 A grid of face-down cards is shown for <b>3 seconds</b> — study them carefully!\n\n' +
  '👆 <b>Tap two cards</b> to flip them. If they match, they stay open. ' +
  'If not, they flip back — remember where each card was!\n\n' +
  '🏆 <b>Match all pairs</b> to finish. Fewer moves + faster time = higher score + more ⭐.\n\n' +
  '🎨 There are 3 visual themes to play in — pick one 👇';

const THEMES_TEXT =
  '🗺️ <b>The Five Eras</b>\n\n' +
  '🏺 <b>Ancient</b> — clay, ochre and the first written things\n' +
  '⚔️ <b>Medieval</b> — iron, heraldry and siege\n' +
  '🚀 <b>Modern</b> — steel, signal and the century in motion\n' +
  '🛸 <b>Future</b> — plasma and artifacts not yet made\n' +
  '🐲 <b>Mythic</b> — the sealed vault\n\n' +
  'Each era has its own board, its own relics and its own look. Tap one 👇';

const ABOUT_TEXT =
  '🏛️ <b>About Memorabilia</b>\n\n' +
  'A memory game set in a museum of five eras, played inside Telegram.\n\n' +
  '🏺 <b>400 levels</b> across Ancient, Medieval, Modern, Future and Mythic\n' +
  '✅ <b>Verified scores</b> — every run is replayed server-side before it counts\n' +
  '⚔️ <b>Duels, ladders and boss hunts</b> — weekly resets, nobody is locked out\n' +
  '📱 <b>No install, no wallet</b> — it runs in this chat\n\n' +
  'Settlement on <b>Starknet</b> is in progress; scores are verified today and ' +
  'will be anchored on-chain once the world is deployed.';

const HELP_TEXT =
  '📖 <b>How to Play Memorabilia</b>\n\n' +
  '1️⃣ <b>Choose your era:</b>\n' +
  '   🏺 Ancient Era — 12 cards, 6 pairs\n' +
  '   ⚔️ Medieval Times — 20 cards, 10 pairs\n' +
  '   🚀 Modern Era — 30 cards, 15 pairs\n\n' +
  '2️⃣ <b>Preview phase</b> — Study all cards for 3 seconds.\n\n' +
  '3️⃣ <b>Flip &amp; match</b> — Tap two cards. Matching pairs stay open!\n\n' +
  '4️⃣ <b>Scoring</b> — Fewer moves = higher score. Get ⭐⭐⭐ for perfection!\n\n' +
  '<i>Tip: Pay close attention during the preview!</i>';

const THEME_DETAILS: Record<string, { icon: string; name: string; body: string }> = {
  ancient:  { icon: '🏺', name: 'Ancient Era',    body: '50 levels. Clay, ochre and a Greek key running under every card.' },
  medieval: { icon: '⚔️', name: 'Medieval Times', body: '50 levels. Cold iron and a heraldic lattice. Unlocked by finishing Ancient.' },
  modern:   { icon: '🚀', name: 'Modern Era',     body: '100 levels. Brushed steel and circuit traces.' },
  future:   { icon: '🛸', name: 'Future Nexus',   body: '100 levels. Violet plasma and a hex mesh.' },
  mythic:   { icon: '🐲', name: 'Mythic Vault',   body: '100 levels. Obsidian and dragonfire. The last era.' },
};

function themeText(theme: string) {
  const t = THEME_DETAILS[theme] || THEME_DETAILS.ancient;
  return `${t.icon} <b>${t.name}</b>\n\n${t.body}\n\nOpen the museum to play it 👇`;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

async function leaderboardText() {
  try {
    const res = await fetch(`${API_URL}/api/leaderboard?limit=5`);
    if (!res.ok) throw new Error('fetch failed');
    const data: any = await res.json();
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    if (!data?.entries?.length) {
      return '🏆 <b>Hall of Fame</b>\n\nNo scores yet! Be the first to play 🎮';
    }
    let text = '🏆 <b>Hall of Fame — Top 5</b>\n\n';
    data.entries.forEach((e: any, i: number) => {
      text += `${medals[i]} <b>${h(e.display_name)}</b> — <code>${Number(e.best_score).toLocaleString()}</code> pts\n`;
      text += `   <i>${e.total_games} game${e.total_games !== 1 ? 's' : ''}</i>\n\n`;
    });
    text += `<i>${h(data.total)} players competing worldwide 🌍</i>`;
    return text;
  } catch {
    return '🏆 <b>Hall of Fame</b>\n\n<i>Could not load scores right now. Try again soon!</i>';
  }
}

// ── Update handlers ───────────────────────────────────────────────────────────

async function handleMessage(msg: any) {
  const chatId = msg.chat.id;
  const text: string = msg.text || '';

/**
 * Record the chat id so scheduled jobs can reach this player, and settle a
 * referral if they arrived through someone's link.
 *
 * Referral rules: you cannot invite yourself, you cannot be invited twice, and
 * the reward only pays out when the invitee actually finishes a level (handled
 * in `_rewards.ts`) — otherwise the link is a free power-up faucet.
 */
async function registerContact(
  from: { id: number; username?: string; first_name?: string; last_name?: string },
  chatId: number,
  inviterId: number | null,
) {
  await ensureDb();
  const tid = BigInt(from.id);

  await sql`
    INSERT INTO users (telegram_id, username, first_name, last_name, chat_id)
    VALUES (${tid}, ${from.username ?? null}, ${from.first_name ?? null}, ${from.last_name ?? null}, ${chatId})
    ON CONFLICT (telegram_id) DO UPDATE SET
      username = COALESCE(EXCLUDED.username, users.username),
      first_name = COALESCE(EXCLUDED.first_name, users.first_name),
      chat_id = EXCLUDED.chat_id,
      last_active = NOW()
  `;

  if (!inviterId || inviterId === from.id) return false;

  const existing = await sql`SELECT referred_by FROM users WHERE telegram_id = ${tid}`;
  if ((existing as any[])[0]?.referred_by) return false;

  const inviter = await sql`SELECT telegram_id FROM users WHERE telegram_id = ${BigInt(inviterId)}`;
  if (!(inviter as any[]).length) return false;

  await sql`UPDATE users SET referred_by = ${BigInt(inviterId)} WHERE telegram_id = ${tid}`;
  await sql`
    INSERT INTO referrals (inviter_telegram_id, invitee_telegram_id)
    VALUES (${BigInt(inviterId)}, ${tid})
    ON CONFLICT (invitee_telegram_id) DO NOTHING
  `;
  return true;
}

  const name = h(msg.from?.first_name || 'Explorer');
  const lower = text.toLowerCase();

  // /start
  if (text.startsWith('/start')) {
    const payload = parseStartPayload(text.replace(/^\/start(@\w+)?/, '').trim());

    if (payload.kind === 'theme') {
      return sendMessage(chatId, themeText(payload.theme), { reply_markup: KB_PLAY });
    }

    // ref_<telegramId> — the invite links the game hands out.
    const inviterId = payload.kind === 'ref' ? payload.inviterId : null;
    let referred = false;
    try {
      referred = await registerContact(msg.from ?? { id: chatId }, chatId, inviterId);
    } catch {
      // Never let a bookkeeping failure stop someone opening the game.
    }

    // room_<code> — a challenge-room invite. The button opens the game
    // straight into that room instead of the main menu.
    if (payload.kind === 'room') {
      const roomUrl = `${WEB_APP}?room=${payload.roomId}`;
      return sendMessage(
        chatId,
        `⚔️ <b>${name}, you've been challenged!</b>\n\nRoom <b>${payload.roomId}</b> is waiting — same board for everyone, fastest verified clear wins.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: `⚔️  Join room ${payload.roomId}`, web_app: { url: roomUrl } }],
              [{ text: '« Main Menu', callback_data: 'main' }],
            ],
          },
        },
      );
    }

    if (referred) {
      return sendMessage(
        chatId,
        `${welcomeText(name)}\n\n🎟️ <b>You were invited.</b> Clear your first level and you both get a hint, a freeze and a boost.`,
        { reply_markup: KB_MAIN },
      );
    }
    return sendMessage(chatId, welcomeText(name), { reply_markup: KB_MAIN });
  }

  if (text === '/stop' || text === '/mute') {
    try {
      await ensureDb();
      await sql`UPDATE users SET push_enabled = FALSE WHERE chat_id = ${chatId}`;
    } catch { /* fall through to the confirmation either way */ }
    return sendMessage(chatId, '🔕 Daily reminders are off. Send /resume to turn them back on.');
  }

  if (text === '/resume') {
    try {
      await ensureDb();
      await sql`UPDATE users SET push_enabled = TRUE WHERE chat_id = ${chatId}`;
    } catch { /* fall through */ }
    return sendMessage(chatId, '🔔 Daily reminders are back on.');
  }

  // Commands
  if (text === '/play')        return sendMessage(chatId, '🚀 <b>Let\'s go!</b>\n\nTap below to launch the game.', { reply_markup: KB_PLAY });
  if (text === '/help')        return sendMessage(chatId, HELP_TEXT, { reply_markup: KB_PLAY });
  if (text === '/about')       return sendMessage(chatId, ABOUT_TEXT, { reply_markup: KB_PLAY });
  if (text === '/themes' || text === '/eras')      return sendMessage(chatId, THEMES_TEXT, { reply_markup: KB_THEME_PICK });
  if (text === '/leaderboard') {
    const lb = await leaderboardText();
    return sendMessage(chatId, lb, { reply_markup: KB_BACK });
  }

  // Free-text keywords
  if (['play','game','start','begin','launch'].some(k => lower.includes(k)))
    return sendMessage(chatId, '🎮 Tap below to play!', { reply_markup: KB_PLAY });
  if (['leaderboard','ranking','top','score'].some(k => lower.includes(k))) {
    const lb = await leaderboardText();
    return sendMessage(chatId, lb, { reply_markup: KB_BACK });
  }
  if (['help','how','rules','guide'].some(k => lower.includes(k)))
    return sendMessage(chatId, HELP_TEXT, { reply_markup: KB_PLAY });
  if (['theme','museum','nature','urban','graffiti'].some(k => lower.includes(k)))
    return sendMessage(chatId, THEMES_TEXT, { reply_markup: KB_THEME_PICK });

  // Default
  return sendMessage(
    chatId,
    `👋 Hi ${name}! I'm the Memorabilia bot.\n\n` +
    '/play — Launch the game\n/help — How to play\n/leaderboard — Top scores\n/themes — Visual themes\n/about — About the project',
    { reply_markup: KB_MAIN }
  );
}

async function handleCallbackQuery(cq: any) {
  const chatId     = cq.message.chat.id;
  const messageId  = cq.message.message_id;
  const data       = cq.data as string;
  const name       = h(cq.from?.first_name || 'Explorer');

  await answerCallback(cq.id);

  if (data === 'main') return editMessage(chatId, messageId, `🏛️ <b>Memorabilia — Main Menu</b>\n\nHey ${name}! What would you like to do?`, { reply_markup: KB_MAIN });
  if (data === 'how')    return editMessage(chatId, messageId, HOW_TEXT,    { reply_markup: KB_THEME_PICK });
  if (data === 'themes') return editMessage(chatId, messageId, THEMES_TEXT, { reply_markup: KB_THEME_PICK });
  if (data === 'about')  return editMessage(chatId, messageId, ABOUT_TEXT,  { reply_markup: KB_PLAY });
  if (data === 'lb') {
    const lb = await leaderboardText();
    return editMessage(chatId, messageId, lb, { reply_markup: KB_BACK });
  }
  if (data.startsWith('theme:')) {
    return editMessage(chatId, messageId, themeText(data.replace('theme:', '')), { reply_markup: KB_PLAY });
  }
}

// ── Vercel handler ────────────────────────────────────────────────────────────

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Health check
  if (req.method === 'GET') {
    return res.json({ ok: true, status: 'Memorabilia webhook active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Telegram sends the secret given to setWebhook in this header on every
  // update. Without the check anyone could POST a forged update — a fake
  // `/start ref_<id>` for a real player's id would plant a referral and later
  // collect its reward. Set TELEGRAM_WEBHOOK_SECRET and pass the same value as
  // `secret_token` to setWebhook to turn it on.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && !safeEqual(String(req.headers['x-telegram-bot-api-secret-token'] ?? ''), secret)) {
    return res.status(401).json({ ok: false });
  }

  try {
    const update = req.body;

    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Webhook error:', err?.message);
    return res.status(200).json({ ok: true }); // always 200 so Telegram doesn't retry
  }
}
