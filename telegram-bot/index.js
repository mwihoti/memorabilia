import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://memorabilia-game.vercel.app';
const API_URL = process.env.API_URL || WEB_APP_URL;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not set');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ── Helpers ───────────────────────────────────────────────────────────────────

// Escape HTML special chars
function h(text) {
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

async function buildLeaderboardText() {
  const data = await getLiveLeaderboard();
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  if (!data?.entries?.length) {
    return '🏆 <b>Hall of Fame</b>\n\nNo scores yet! Be the first to play 🎮';
  }
  let text = '🏆 <b>Hall of Fame — Top 5</b>\n\n';
  data.entries.forEach((e, i) => {
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
      { text: '📖 How It Works', callback_data: 'how' },
      { text: '🏆 Top Players',  callback_data: 'lb'  },
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
      { text: '🏛️ Museum',  callback_data: 'theme:museum' },
      { text: '🌿 Nature',  callback_data: 'theme:nature' },
      { text: '🎨 Urban',   callback_data: 'theme:urban'  },
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

// ── /start ────────────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  const name = h(ctx.from?.first_name || 'Explorer');
  const ref  = ctx.startPayload || '';

  if (ref.startsWith('theme_')) {
    return replyTheme(ctx, ref.replace('theme_', ''));
  }

  // room_<code> — a challenge-room invite; mirrors api/telegram-webhook.ts.
  const room = /^room_([A-Za-z0-9]{6})$/.exec(ref);
  if (room) {
    const roomId = room[1].toUpperCase();
    return ctx.reply(
      `⚔️ <b>${name}, you've been challenged!</b>\n\n` +
      `Room <b>${roomId}</b> is waiting — same board for everyone, fastest verified clear wins.`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: `⚔️  Join room ${roomId}`, web_app: { url: `${WEB_APP_URL}?room=${roomId}` } }],
            [{ text: '« Main Menu', callback_data: 'main' }],
          ],
        },
      }
    );
  }

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
  '🚀 <b>Let\'s go!</b>\n\nTap the button below to launch the game.',
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
  '<i>Tip: Pay close attention during the preview — it\'s your only chance to memorise the board!</i>',
  { parse_mode: 'HTML', reply_markup: KB_PLAY }
));

bot.command('leaderboard', async (ctx) => {
  const text = await buildLeaderboardText();
  return ctx.reply(text, { parse_mode: 'HTML', reply_markup: KB_BACK });
});

bot.command('themes', (ctx) => ctx.reply(
  '🎨 <b>Choose Your Visual Theme</b>\n\n' +
  '🏛️ <b>Museum</b> — Golden amber tones, ornamental card backs, classical artifacts\n\n' +
  '🌿 <b>Nature</b> — Deep forest greens, leaf patterns, earthen textures\n\n' +
  '🎨 <b>Urban</b> — Neon graffiti, spray-paint cards, electric glow effects\n\n' +
  'Tap one to learn more 👇',
  { parse_mode: 'HTML', reply_markup: KB_THEME_PICK }
));

bot.command('about', (ctx) => ctx.reply(
  '🏛️ <b>About Memorabilia</b>\n\n' +
  'An on-chain memory card game where every move is recorded on <b>Starknet</b>.\n\n' +
  '⚡ <b>Dojo Engine</b> — Provable game logic\n' +
  '🔷 <b>Starknet</b> — Layer 2 blockchain\n' +
  '🎨 <b>3 Visual Themes</b> — Museum, Nature, Urban\n' +
  '📊 <b>Live leaderboard</b> — Powered by Neon PostgreSQL\n' +
  '📱 <b>Telegram Mini App</b> — No install needed\n\n' +
  '🚀 Built by a 6-person team for Starknet Game Jam',
  { parse_mode: 'HTML', reply_markup: KB_PLAY }
));

// ── Theme reply helper ────────────────────────────────────────────────────────

async function replyTheme(ctx, theme) {
  const details = {
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
  const t = details[theme] || details.museum;
  const msg =
    `${t.icon} <b>${t.name}</b>\n\n` +
    `${t.text}\n\n` +
    `Ready to play? The theme is selected inside the game 👇`;

  if (ctx.callbackQuery) {
    return ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: KB_PLAY });
  }
  return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: KB_PLAY });
}

// ── Callback queries ──────────────────────────────────────────────────────────

bot.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  // Back to main menu
  if (data === 'main') {
    const name = h(ctx.from?.first_name || 'Explorer');
    return ctx.editMessageText(
      `🏛️ <b>Memorabilia — Main Menu</b>\n\nHey ${name}! What would you like to do?`,
      { parse_mode: 'HTML', reply_markup: KB_MAIN }
    );
  }

  // How it works
  if (data === 'how') {
    return ctx.editMessageText(
      '📖 <b>How Memorabilia Works</b>\n\n' +
      '🃏 A grid of face-down cards is shown for <b>3 seconds</b> — study them carefully!\n\n' +
      '👆 <b>Tap two cards</b> to flip them over. If they match, they stay open. If not, they flip back — you need to remember where each one was!\n\n' +
      '🏆 <b>Match all pairs</b> to finish. Fewer moves and faster time = higher score and more ⭐.\n\n' +
      '🎨 There are 3 visual themes to play in — pick the one you like 👇',
      { parse_mode: 'HTML', reply_markup: KB_THEME_PICK }
    );
  }

  // Live leaderboard
  if (data === 'lb') {
    const text = await buildLeaderboardText();
    return ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: KB_BACK });
  }

  // Themes picker
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

  // About
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

  // Theme detail pages
  if (data.startsWith('theme:')) {
    return replyTheme(ctx, data.replace('theme:', ''));
  }
});

// ── Free-text fallback ────────────────────────────────────────────────────────

bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;
  const t = ctx.message.text.toLowerCase();

  if (['play', 'game', 'start', 'begin', 'launch', 'open'].some(k => t.includes(k))) {
    return ctx.reply('🎮 Tap below to play!', { reply_markup: KB_PLAY });
  }
  if (['leaderboard', 'ranking', 'top', 'score', 'high score'].some(k => t.includes(k))) {
    const text = await buildLeaderboardText();
    return ctx.reply(text, { parse_mode: 'HTML', reply_markup: KB_BACK });
  }
  if (['help', 'how', 'rules', 'guide', 'instructions'].some(k => t.includes(k))) {
    return ctx.reply('📖 Use /help for the full guide, or pick an option below 👇', { reply_markup: KB_MAIN });
  }
  if (['theme', 'museum', 'nature', 'urban', 'graffiti'].some(k => t.includes(k))) {
    return ctx.reply('🎨 Pick a theme 👇', { reply_markup: KB_THEME_PICK });
  }
  if (['about', 'starknet', 'dojo', 'blockchain'].some(k => t.includes(k))) {
    return ctx.reply('Use /about for the full story 👇', { reply_markup: KB_MAIN });
  }

  const name = h(ctx.from?.first_name || 'Explorer');
  return ctx.reply(
    `👋 Hi ${name}! I'm the Memorabilia bot.\n\n` +
    'Commands:\n' +
    '/play — Launch the game\n' +
    '/help — How to play\n' +
    '/leaderboard — Top scores\n' +
    '/themes — Visual themes\n' +
    '/about — About the project',
    { parse_mode: 'HTML', reply_markup: KB_MAIN }
  );
});

// ── Error handling ────────────────────────────────────────────────────────────

bot.catch((err, ctx) => {
  console.error('Bot error:', err?.message || err);
  try { ctx.reply('⚠️ Something went wrong. Please try again!'); } catch {}
});

// ── Launch ────────────────────────────────────────────────────────────────────

console.log('⏳ Starting Memorabilia bot...');
console.log(`🎮 Web App: ${WEB_APP_URL}`);

bot.launch().then(() => {
  console.log('✅ Memorabilia bot is running!');
  console.log('📱 Bot is ready to receive commands');
}).catch((err) => {
  console.error('❌ Failed to launch bot:', err?.message || err);
  process.exit(1);
});

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
