import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://memorabilia-game-6gmm06lfd-mwihotis-projects.vercel.app';
const API_URL = process.env.API_URL || WEB_APP_URL;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not set');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getLiveLeaderboard(limit = 5) {
  try {
    const res = await fetch(`${API_URL}/api/leaderboard?limit=${limit}`);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// Escape special chars for MarkdownV2
function esc(text) {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// Format live leaderboard text (MarkdownV2)
async function buildLeaderboardText() {
  const data = await getLiveLeaderboard();
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  if (!data?.entries?.length) {
    return '🏆 *Hall of Fame*\n\nNo scores yet\\! Be the first to play 🎮';
  }
  let text = '🏆 *Hall of Fame — Top 5*\n\n';
  data.entries.forEach((e, i) => {
    text += `${medals[i]} ${esc(e.display_name)} — \`${e.best_score.toLocaleString()}\` pts\n`;
    text += `   _${e.total_games} game${e.total_games !== 1 ? 's' : ''} · ${esc(e.difficulty || 'Mixed')}_\n\n`;
  });
  text += `_${esc(data.total)} players competing worldwide_ 🌍`;
  return text;
}

// ── Keyboards ─────────────────────────────────────────────────────────────────

const KB_MAIN = {
  inline_keyboard: [
    [{ text: '🎮  Play Now', web_app: { url: WEB_APP_URL } }],
    [
      { text: '📖 How It Works', callback_data: 'onboard:how' },
      { text: '🏆 Top Players',  callback_data: 'onboard:lb' },
    ],
    [{ text: '🌍 About Memorabilia', callback_data: 'onboard:about' }],
  ],
};

const KB_THEME_PICK = {
  inline_keyboard: [
    [
      { text: '🏛️ Museum',  callback_data: 'theme:museum' },
      { text: '🌿 Nature',  callback_data: 'theme:nature' },
      { text: '🎨 Urban',   callback_data: 'theme:urban' },
    ],
    [{ text: '« Back', callback_data: 'onboard:main' }],
  ],
};

const KB_PLAY = {
  inline_keyboard: [
    [{ text: '🎮  Enter the Game', web_app: { url: WEB_APP_URL } }],
    [{ text: '« Main Menu', callback_data: 'onboard:main' }],
  ],
};

const KB_LB = (hasEntries) => ({
  inline_keyboard: [
    [{ text: '🎮  Play & Climb the Ranks', web_app: { url: WEB_APP_URL } }],
    ...(hasEntries ? [] : []),
    [{ text: '« Main Menu', callback_data: 'onboard:main' }],
  ],
});

// ── /start ────────────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  const name = ctx.from?.first_name || 'Explorer';
  const ref = ctx.startPayload; // deep link param e.g. /start=theme_urban

  // Handle deep links
  if (ref === 'theme_museum' || ref === 'theme_nature' || ref === 'theme_urban') {
    const t = ref.replace('theme_', '');
    return sendThemeDetails(ctx, t);
  }

  await ctx.reply(
    `🏛️ *Hey ${esc(name)}\\! Welcome to Memorabilia\\!*\n\n` +
    `I'm your guide to the on\\-chain memory card game built on Starknet\\.  ` +
    `Flip cards, find matching pairs, and chase the top of the *Hall of Fame*\\!\n\n` +
    `What would you like to do? 👇`,
    { parse_mode: 'MarkdownV2', reply_markup: KB_MAIN }
  );
});

// ── Commands ──────────────────────────────────────────────────────────────────

bot.command('play', (ctx) => ctx.reply(
  '🚀 *Let\'s go\\!*\n\nTap below to launch the game\\.',
  { parse_mode: 'MarkdownV2', reply_markup: KB_PLAY }
));

bot.command('help', (ctx) => ctx.reply(
  '📖 *How to Play Memorabilia*\n\n' +
  '1️⃣ *Choose difficulty* — 3 eras await you\\:\n' +
  '   🏺 Ancient Era — 12 cards, 6 pairs\n' +
  '   ⚔️ Medieval Times — 20 cards, 10 pairs\n' +
  '   🚀 Modern Era — 30 cards, 15 pairs\n\n' +
  '2️⃣ *Preview phase* — Study the cards for 3 seconds\\.\n\n' +
  '3️⃣ *Flip & match* — Tap two cards\\. If they match, they stay face\\-up\\.\n\n' +
  '4️⃣ *Scoring* — Fewer moves = higher score\\. Get ⭐⭐⭐ for perfection\\!\n\n' +
  '💡 _Tip: You can earn stars and an S\\-rank in fewer than the optimal moves\\._',
  { parse_mode: 'MarkdownV2', reply_markup: KB_PLAY }
));

bot.command('leaderboard', async (ctx) => {
  const text = await buildLeaderboardText();
  const data = await getLiveLeaderboard();
  return ctx.reply(text, {
    parse_mode: 'MarkdownV2',
    reply_markup: KB_LB(!!data?.entries?.length),
  });
});

bot.command('about', (ctx) => ctx.reply(
  '🏛️ *About Memorabilia*\n\n' +
  'An on\\-chain memory card game where every move is recorded on *Starknet*\\.\n\n' +
  '⚡ *Dojo Engine* — Provable game logic\n' +
  '🔷 *Starknet* — Layer 2 blockchain\n' +
  '🎨 *3 Visual Themes* — Museum, Nature, Urban\n' +
  '📊 *Real leaderboard* — Powered by Neon PostgreSQL\n' +
  '📱 *Telegram Mini App* — Plays directly inside Telegram\n\n' +
  'Built during a game jam by a 6\\-person team\\ 🚀',
  { parse_mode: 'MarkdownV2', reply_markup: KB_PLAY }
));

bot.command('themes', (ctx) => ctx.reply(
  '🎨 *Choose Your Visual Theme*\n\n' +
  '🏛️ *Museum* — Golden amber tones, ornamental card backs, classical artifacts\n' +
  '🌿 *Nature* — Deep forest greens, leaf patterns, earthen textures\n' +
  '🎨 *Urban* — Neon graffiti, spray\\-paint cards, electric glow effects\n\n' +
  'Tap one to learn more 👇',
  { parse_mode: 'MarkdownV2', reply_markup: KB_THEME_PICK }
));

// ── Theme detail sender ───────────────────────────────────────────────────────

async function sendThemeDetails(ctx, theme) {
  const details = {
    museum: {
      icon: '🏛️',
      name: 'The Museum',
      desc:
        'Step into the golden halls of history\\!\n\n' +
        '✨ Ornamental amber card backs with classical patterns\n' +
        '🏺 Artifacts from Ancient, Medieval & Modern eras\n' +
        '🥇 Hall of Fame leaderboard in gold & bronze\n\n' +
        '_Perfect for fans of history and elegance\\._',
    },
    nature: {
      icon: '🌿',
      name: 'Nature Trails',
      desc:
        'Venture into the living forest\\!\n\n' +
        '🍃 Leaf\\-pattern card backs in deep forest green\n' +
        '🦋 Nature\\-themed emoji artifacts across all eras\n' +
        '🌲 Earthy textures and soft glow effects\n\n' +
        '_Perfect for those who love the outdoors\\._',
    },
    urban: {
      icon: '🎨',
      name: 'Urban Gallery',
      desc:
        'Hit the neon\\-lit streets\\!\n\n' +
        '💥 Spray\\-paint card backs with neon \\#00ff88 glow\n' +
        '🏙️ Graffiti typography and electric color pops\n' +
        '⚡ Scanline overlay and pink\\+cyan accent effects\n\n' +
        '_Perfect for fans of street art and urban culture\\._',
    },
  };
  const t = details[theme] || details.museum;
  await ctx.reply(
    `${t.icon} *${esc(t.name)}*\n\n${t.desc}\n\n` +
    `Ready to jump in? The theme is selected inside the game 👇`,
    { parse_mode: 'MarkdownV2', reply_markup: KB_PLAY }
  );
}

// ── Callback queries ──────────────────────────────────────────────────────────

bot.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery();
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  // Main menu
  if (data === 'onboard:main') {
    const name = ctx.from?.first_name || 'Explorer';
    return ctx.editMessageText(
      `🏛️ *Memorabilia — Main Menu*\n\nHey ${esc(name)}\\! What would you like to do?`,
      { parse_mode: 'MarkdownV2', reply_markup: KB_MAIN }
    );
  }

  // How it works → show steps + theme picker
  if (data === 'onboard:how') {
    return ctx.editMessageText(
      '📖 *How Memorabilia Works*\n\n' +
      '🃏 A grid of face\\-down cards is revealed for *3 seconds*\\.  ' +
      'After the preview, they flip back\\.\n\n' +
      '👆 *Tap two cards* to reveal them\\.  ' +
      'If they match, they stay open\\!  ' +
      'If not, they flip back — remember where you saw them\\.\n\n' +
      '🏆 *Match all pairs* to complete the exhibition and earn a score based on moves and speed\\.\n\n' +
      '🎨 Pick a visual theme that suits your style 👇',
      { parse_mode: 'MarkdownV2', reply_markup: KB_THEME_PICK }
    );
  }

  // Live leaderboard
  if (data === 'onboard:lb') {
    const text = await buildLeaderboardText();
    const data2 = await getLiveLeaderboard();
    return ctx.editMessageText(text, {
      parse_mode: 'MarkdownV2',
      reply_markup: KB_LB(!!data2?.entries?.length),
    });
  }

  // About
  if (data === 'onboard:about') {
    return ctx.editMessageText(
      '🏛️ *About Memorabilia*\n\n' +
      'An on\\-chain memory card game where every move is recorded on *Starknet*\\.\n\n' +
      '⚡ *Dojo Engine* — Provable game logic\n' +
      '🔷 *Starknet* — Layer 2 blockchain\n' +
      '🎨 *3 Visual Themes* — Museum, Nature, Urban\n' +
      '📊 *Live leaderboard* — Powered by Neon PostgreSQL\n' +
      '📱 *Telegram Mini App* — No install needed\n\n' +
      '🚀 Built by a 6\\-person team for Starknet Game Jam',
      { parse_mode: 'MarkdownV2', reply_markup: KB_PLAY }
    );
  }

  // Theme picker
  if (data?.startsWith('theme:')) {
    const theme = data.replace('theme:', '');
    return sendThemeDetails(ctx, theme);
  }
});

// ── Free-text fallback ────────────────────────────────────────────────────────

const KEYWORDS_PLAY   = ['play', 'game', 'start', 'begin', 'launch', 'open'];
const KEYWORDS_LB     = ['leaderboard', 'ranking', 'rank', 'top', 'score', 'high score'];
const KEYWORDS_HELP   = ['help', 'how', 'rules', 'guide', 'tutorial', 'instructions'];
const KEYWORDS_ABOUT  = ['about', 'what is', 'starknet', 'dojo', 'blockchain', 'nft'];
const KEYWORDS_THEMES = ['theme', 'museum', 'nature', 'urban', 'graffiti', 'skin'];

bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;
  const t = ctx.message.text.toLowerCase();

  if (KEYWORDS_PLAY.some(k => t.includes(k))) {
    return ctx.reply('🎮 Tap below to play\\!', { parse_mode: 'MarkdownV2', reply_markup: KB_PLAY });
  }
  if (KEYWORDS_LB.some(k => t.includes(k))) {
    const text = await buildLeaderboardText();
    const data = await getLiveLeaderboard();
    return ctx.reply(text, { parse_mode: 'MarkdownV2', reply_markup: KB_LB(!!data?.entries?.length) });
  }
  if (KEYWORDS_HELP.some(k => t.includes(k))) {
    return ctx.reply(
      '📖 Use /help to see the full guide, or tap one of the options below 👇',
      { reply_markup: KB_MAIN }
    );
  }
  if (KEYWORDS_ABOUT.some(k => t.includes(k))) {
    return ctx.reply(
      '🏛️ Memorabilia is an on\\-chain memory game on Starknet\\.  Use /about for more info\\.',
      { parse_mode: 'MarkdownV2', reply_markup: KB_MAIN }
    );
  }
  if (KEYWORDS_THEMES.some(k => t.includes(k))) {
    return ctx.reply(
      '🎨 Tap a theme to learn more 👇',
      { reply_markup: KB_THEME_PICK }
    );
  }

  // Default
  const name = ctx.from?.first_name || 'Explorer';
  return ctx.reply(
    `👋 Hi ${esc(name)}\\!  I'm the Memorabilia bot\\.\n\n` +
    'Try one of these:\n' +
    '/play — Launch the game\n' +
    '/help — How to play\n' +
    '/leaderboard — Top scores\n' +
    '/themes — Visual themes\n' +
    '/about — About the project',
    { parse_mode: 'MarkdownV2', reply_markup: KB_MAIN }
  );
});

// ── Error handling ────────────────────────────────────────────────────────────

bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
  try { ctx.reply('⚠️ Something went wrong. Please try again!'); } catch {}
});

// ── Launch ────────────────────────────────────────────────────────────────────

bot.launch().then(() => {
  console.log('✅ Memorabilia bot running');
  console.log(`🎮 Web App: ${WEB_APP_URL}`);
});

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
