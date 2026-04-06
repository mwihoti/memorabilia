import type { VercelRequest, VercelResponse } from '@vercel/node';

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
      { text: '🏛️ Museum', callback_data: 'theme:museum' },
      { text: '🌿 Nature', callback_data: 'theme:nature' },
      { text: '🎨 Urban',  callback_data: 'theme:urban'  },
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
    `I'm your guide to the on-chain memory card game built on Starknet.\n\n` +
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
  '🎨 <b>Visual Themes</b>\n\n' +
  '🏛️ <b>Museum</b> — Golden amber tones &amp; classical artifacts\n' +
  '🌿 <b>Nature</b> — Forest greens &amp; leaf patterns\n' +
  '🎨 <b>Urban</b> — Neon graffiti &amp; spray-paint effects\n\n' +
  'Tap one to learn more 👇';

const ABOUT_TEXT =
  '🏛️ <b>About Memorabilia</b>\n\n' +
  'An on-chain memory card game built on <b>Starknet</b>.\n\n' +
  '⚡ <b>Dojo Engine</b> — Provable game logic\n' +
  '🔷 <b>Starknet</b> — Layer 2 blockchain\n' +
  '🎨 <b>3 Visual Themes</b> — Museum, Nature, Urban\n' +
  '📊 <b>Live leaderboard</b> — Neon PostgreSQL\n' +
  '📱 <b>Telegram Mini App</b> — No install needed\n\n' +
  '🚀 Built by a 6-person team for Starknet Game Jam';

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
  museum: {
    icon: '🏛️', name: 'The Museum',
    body:
      '✨ Ornamental amber card backs with classical patterns\n' +
      '🏺 Artifacts from Ancient, Medieval &amp; Modern eras\n' +
      '🥇 Hall of Fame leaderboard in gold &amp; bronze\n\n' +
      '<i>Perfect for fans of history and elegance.</i>',
  },
  nature: {
    icon: '🌿', name: 'Nature Trails',
    body:
      '🍃 Leaf-pattern card backs in deep forest green\n' +
      '🦋 Nature-themed emoji artifacts across all eras\n' +
      '🌲 Earthy textures and soft glow effects\n\n' +
      '<i>Perfect for those who love the outdoors.</i>',
  },
  urban: {
    icon: '🎨', name: 'Urban Gallery',
    body:
      '💥 Spray-paint card backs with neon green glow\n' +
      '🏙️ Graffiti typography and electric colour pops\n' +
      '⚡ Scanline overlay and pink + cyan accent effects\n\n' +
      '<i>Perfect for fans of street art and urban culture.</i>',
  },
};

function themeText(theme: string) {
  const t = THEME_DETAILS[theme] || THEME_DETAILS.museum;
  return `${t.icon} <b>${t.name}</b>\n\n${t.body}\n\nThe theme is selected inside the game 👇`;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

async function leaderboardText() {
  try {
    const res = await fetch(`${API_URL}/api/leaderboard?limit=5`);
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
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
  const name = h(msg.from?.first_name || 'Explorer');
  const lower = text.toLowerCase();

  // /start
  if (text.startsWith('/start')) {
    const ref = text.replace('/start', '').trim();
    if (ref.startsWith('theme_')) {
      return sendMessage(chatId, themeText(ref.replace('theme_', '')), { reply_markup: KB_PLAY });
    }
    return sendMessage(chatId, welcomeText(name), { reply_markup: KB_MAIN });
  }

  // Commands
  if (text === '/play')        return sendMessage(chatId, '🚀 <b>Let\'s go!</b>\n\nTap below to launch the game.', { reply_markup: KB_PLAY });
  if (text === '/help')        return sendMessage(chatId, HELP_TEXT, { reply_markup: KB_PLAY });
  if (text === '/about')       return sendMessage(chatId, ABOUT_TEXT, { reply_markup: KB_PLAY });
  if (text === '/themes')      return sendMessage(chatId, THEMES_TEXT, { reply_markup: KB_THEME_PICK });
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Health check
  if (req.method === 'GET') {
    return res.json({ ok: true, status: 'Memorabilia webhook active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
