import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf } from 'telegraf';

const BOT_TOKEN  = process.env.BOT_TOKEN!;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://memorabilia-game-6gmm06lfd-mwihotis-projects.vercel.app';
const API_URL     = process.env.API_URL || WEB_APP_URL;

if (!BOT_TOKEN) throw new Error('BOT_TOKEN env var is required');

const bot = new Telegraf(BOT_TOKEN);

// ── Helpers ───────────────────────────────────────────────────────────────────

function h(text: string | number): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function getLiveLeaderboard(limit = 5) {
  try {
    const res = await fetch(`${API_URL}/api/leaderboard?limit=${limit}`);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function buildLeaderboardText(): Promise<string> {
  const data = await getLiveLeaderboard();
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
}

// ── Keyboards ─────────────────────────────────────────────────────────────────

const KB_MAIN = {
  inline_keyboard: [
    [{ text: '🎮  Play Now', web_app: { url: WEB_APP_URL } }],
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
    [{ text: '🎮  Enter the Game', web_app: { url: WEB_APP_URL } }],
    [{ text: '« Back to Menu', callback_data: 'main' }],
  ],
};

const KB_BACK = {
  inline_keyboard: [
    [{ text: '🎮  Play Now', web_app: { url: WEB_APP_URL } }],
    [{ text: '« Back to Menu', callback_data: 'main' }],
  ],
};

// ── Theme helper ──────────────────────────────────────────────────────────────

const THEMES: Record<string, { icon: string; name: string; text: string }> = {
  museum: {
    icon: '🏛️', name: 'The Museum',
    text:
      '✨ Ornamental amber card backs with classical patterns\n' +
      '🏺 Artifacts from Ancient, Medieval &amp; Modern eras\n' +
      '🥇 Hall of Fame leaderboard in gold &amp; bronze\n\n' +
      '<i>Perfect for fans of history and elegance.</i>',
  },
  nature: {
    icon: '🌿', name: 'Nature Trails',
    text:
      '🍃 Leaf-pattern card backs in deep forest green\n' +
      '🦋 Nature-themed emoji artifacts across all eras\n' +
      '🌲 Earthy textures and soft glow effects\n\n' +
      '<i>Perfect for those who love the outdoors.</i>',
  },
  urban: {
    icon: '🎨', name: 'Urban Gallery',
    text:
      '💥 Spray-paint card backs with neon green glow\n' +
      '🏙️ Graffiti typography and electric colour pops\n' +
      '⚡ Scanline overlay and pink + cyan accent effects\n\n' +
      '<i>Perfect for fans of street art and urban culture.</i>',
  },
};

async function replyTheme(ctx: any, theme: string) {
  const t = THEMES[theme] || THEMES.museum;
  const msg =
    `${t.icon} <b>${t.name}</b>\n\n${t.text}\n\n` +
    `The theme is selected inside the game 👇`;
  if (ctx.callbackQuery) {
    return ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: KB_PLAY });
  }
  return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: KB_PLAY });
}

// ── /start ────────────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  const name = h(ctx.from?.first_name || 'Explorer');
  const ref  = ctx.startPayload || '';

  if (ref.startsWith('theme_')) return replyTheme(ctx, ref.replace('theme_', ''));

  return ctx.reply(
    `🏛️ <b>Hey ${name}! Welcome to Memorabilia!</b>\n\n` +
    `I'm your guide to the on-chain memory card game built on Starknet.\n\n` +
    `Flip cards, find matching pairs, and climb the <b>Hall of Fame</b>!\n\n` +
    `👇 What would you like to do?`,
    { parse_mode: 'HTML', reply_markup: KB_MAIN }
  );
});

// ── Commands ──────────────────────────────────────────────────────────────────

bot.command('play', (ctx) => ctx.reply(
  '🚀 <b>Let\'s go!</b>\n\nTap below to launch the game.',
  { parse_mode: 'HTML', reply_markup: KB_PLAY }
));

bot.command('help', (ctx) => ctx.reply(
  '📖 <b>How to Play Memorabilia</b>\n\n' +
  '1️⃣ <b>Choose your era:</b>\n' +
  '   🏺 Ancient Era — 12 cards, 6 pairs\n' +
  '   ⚔️ Medieval Times — 20 cards, 10 pairs\n' +
  '   🚀 Modern Era — 30 cards, 15 pairs\n\n' +
  '2️⃣ <b>Preview phase</b> — Study all cards for 3 seconds.\n\n' +
  '3️⃣ <b>Flip &amp; match</b> — Tap two cards. If they match, they stay open!\n\n' +
  '4️⃣ <b>Scoring</b> — Fewer moves = higher score. Get ⭐⭐⭐ for perfection!\n\n' +
  '<i>Tip: Pay close attention during the preview — your only chance to memorise the board!</i>',
  { parse_mode: 'HTML', reply_markup: KB_PLAY }
));

bot.command('leaderboard', async (ctx) => {
  const text = await buildLeaderboardText();
  return ctx.reply(text, { parse_mode: 'HTML', reply_markup: KB_BACK });
});

bot.command('themes', (ctx) => ctx.reply(
  '🎨 <b>Visual Themes</b>\n\n' +
  '🏛️ <b>Museum</b> — Golden amber tones &amp; classical artifacts\n' +
  '🌿 <b>Nature</b> — Forest greens &amp; leaf patterns\n' +
  '🎨 <b>Urban</b> — Neon graffiti &amp; spray-paint effects\n\n' +
  'Tap one to learn more 👇',
  { parse_mode: 'HTML', reply_markup: KB_THEME_PICK }
));

bot.command('about', (ctx) => ctx.reply(
  '🏛️ <b>About Memorabilia</b>\n\n' +
  'An on-chain memory card game built on <b>Starknet</b>.\n\n' +
  '⚡ <b>Dojo Engine</b> — Provable game logic\n' +
  '🔷 <b>Starknet</b> — Layer 2 blockchain\n' +
  '🎨 <b>3 Visual Themes</b> — Museum, Nature, Urban\n' +
  '📊 <b>Live leaderboard</b> — Neon PostgreSQL\n' +
  '📱 <b>Telegram Mini App</b> — No install needed\n\n' +
  '🚀 Built by a 6-person team for Starknet Game Jam',
  { parse_mode: 'HTML', reply_markup: KB_PLAY }
));

// ── Callback queries ──────────────────────────────────────────────────────────

bot.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const data = (ctx.callbackQuery as any)?.data as string;
  if (!data) return;

  if (data === 'main') {
    const name = h(ctx.from?.first_name || 'Explorer');
    return ctx.editMessageText(
      `🏛️ <b>Memorabilia — Main Menu</b>\n\nHey ${name}! What would you like to do?`,
      { parse_mode: 'HTML', reply_markup: KB_MAIN }
    );
  }

  if (data === 'how') {
    return ctx.editMessageText(
      '📖 <b>How Memorabilia Works</b>\n\n' +
      '🃏 A grid of face-down cards is shown for <b>3 seconds</b> — study them carefully!\n\n' +
      '👆 <b>Tap two cards</b> to flip them. If they match, they stay open. If not, they flip back — remember where each card was!\n\n' +
      '🏆 <b>Match all pairs</b> to finish. Fewer moves + faster time = higher score + more ⭐.\n\n' +
      '🎨 There are 3 visual themes to play in — pick one 👇',
      { parse_mode: 'HTML', reply_markup: KB_THEME_PICK }
    );
  }

  if (data === 'lb') {
    const text = await buildLeaderboardText();
    return ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: KB_BACK });
  }

  if (data === 'themes') {
    return ctx.editMessageText(
      '🎨 <b>Visual Themes</b>\n\n' +
      '🏛️ <b>Museum</b> — Golden amber tones &amp; classical artifacts\n' +
      '🌿 <b>Nature</b> — Forest greens &amp; leaf patterns\n' +
      '🎨 <b>Urban</b> — Neon graffiti &amp; spray-paint effects\n\n' +
      'Tap one to learn more 👇',
      { parse_mode: 'HTML', reply_markup: KB_THEME_PICK }
    );
  }

  if (data === 'about') {
    return ctx.editMessageText(
      '🏛️ <b>About Memorabilia</b>\n\n' +
      'An on-chain memory card game built on <b>Starknet</b>.\n\n' +
      '⚡ <b>Dojo Engine</b> — Provable game logic\n' +
      '🔷 <b>Starknet</b> — Layer 2 blockchain\n' +
      '🎨 <b>3 Visual Themes</b> — Museum, Nature, Urban\n' +
      '📊 <b>Live leaderboard</b> — Neon PostgreSQL\n' +
      '📱 <b>Telegram Mini App</b> — No install needed\n\n' +
      '🚀 Built by a 6-person team for Starknet Game Jam',
      { parse_mode: 'HTML', reply_markup: KB_PLAY }
    );
  }

  if (data.startsWith('theme:')) {
    return replyTheme(ctx, data.replace('theme:', ''));
  }
});

// ── Free-text fallback ────────────────────────────────────────────────────────

bot.on('text', async (ctx) => {
  if ((ctx.message as any).text?.startsWith('/')) return;
  const t = ((ctx.message as any).text || '').toLowerCase();

  if (['play', 'game', 'start', 'begin', 'launch'].some(k => t.includes(k))) {
    return ctx.reply('🎮 Tap below to play!', { reply_markup: KB_PLAY });
  }
  if (['leaderboard', 'ranking', 'top', 'score'].some(k => t.includes(k))) {
    const text = await buildLeaderboardText();
    return ctx.reply(text, { parse_mode: 'HTML', reply_markup: KB_BACK });
  }
  if (['help', 'how', 'rules', 'guide'].some(k => t.includes(k))) {
    return ctx.reply('📖 Use /help for the full guide 👇', { reply_markup: KB_MAIN });
  }
  if (['theme', 'museum', 'nature', 'urban', 'graffiti'].some(k => t.includes(k))) {
    return ctx.reply('🎨 Pick a theme 👇', { reply_markup: KB_THEME_PICK });
  }

  const name = h(ctx.from?.first_name || 'Explorer');
  return ctx.reply(
    `👋 Hi ${name}! I'm the Memorabilia bot.\n\n` +
    '/play — Launch the game\n' +
    '/help — How to play\n' +
    '/leaderboard — Top scores\n' +
    '/themes — Visual themes\n' +
    '/about — About the project',
    { parse_mode: 'HTML', reply_markup: KB_MAIN }
  );
});

// ── Vercel handler ────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.json({ ok: true, status: 'Memorabilia bot webhook active' });
  }
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  try {
    await bot.handleUpdate(req.body);
    res.status(200).end();
  } catch (err: any) {
    console.error('Webhook error:', err?.message);
    res.status(200).end(); // always 200 so Telegram doesn't retry
  }
}
