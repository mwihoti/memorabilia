import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://memorabilia-game-6gmm06lfd-mwihotis-projects.vercel.app';
const API_URL = process.env.API_URL || WEB_APP_URL;

async function getLiveLeaderboard() {
  try {
    const res = await fetch(`${API_URL}/api/leaderboard?limit=5`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

console.log('🤖 Starting Memorabilia Telegram Bot...');
console.log(`🎮 Web App URL: ${WEB_APP_URL}`);

if (!BOT_TOKEN) {
  console.error('❌ Error: BOT_TOKEN is not set in .env file');
  process.exit(1);
}

console.log('✅ Bot token loaded');

// Create bot instance
const bot = new Telegraf(BOT_TOKEN);
console.log('✅ Bot instance created');

// Welcome message with game button
bot.start((ctx) => {
  const firstName = ctx.from.first_name || 'Player';
  
  return ctx.reply(
    `🎮 Welcome to Memorabilia, ${firstName}!\n\n` +
    `🧠 Test your memory with our on-chain card matching game built on Starknet.\n\n` +
    `✨ Features:\n` +
    `• 3 difficulty levels (Easy, Medium, Hard)\n` +
    `• Beautiful animations & sound effects\n` +
    `• Compete on the leaderboard\n` +
    `• Built with Dojo on Starknet\n\n` +
    `👇 Tap below to start playing!`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎮 Play Memorabilia',
              web_app: {
                url: WEB_APP_URL
              }
            }
          ],
          [
            {
              text: '📖 How to Play',
              callback_data: 'help'
            },
            {
              text: '🏆 Leaderboard',
              callback_data: 'leaderboard'
            }
          ]
        ]
      }
    }
  );
});

// /play command - Launch the game
bot.command('play', (ctx) => {
  return ctx.reply(
    '🚀 Ready to test your memory?\n\n' +
    'Tap the button below to launch Memorabilia!',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎮 Play Now',
              web_app: {
                url: WEB_APP_URL
              }
            }
          ]
        ]
      }
    }
  );
});

// /help command - Game instructions
bot.command('help', (ctx) => {
  return ctx.reply(
    '📖 *How to Play Memorabilia*\n\n' +
    '1️⃣ Choose your difficulty:\n' +
    '   • Easy: 8 cards (4 pairs)\n' +
    '   • Medium: 16 cards (8 pairs)\n' +
    '   • Hard: 24 cards (12 pairs)\n\n' +
    '2️⃣ Memorize the cards during the preview\n\n' +
    '3️⃣ Flip cards to find matching pairs\n\n' +
    '4️⃣ Match all pairs to win!\n\n' +
    '🎯 *Scoring:*\n' +
    '• Fewer moves = Higher score\n' +
    '• Faster time = Bonus points\n' +
    '• Harder difficulty = More points\n\n' +
    '💡 *Tip:* Pay attention during the preview!',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎮 Play Now',
              web_app: {
                url: WEB_APP_URL
              }
            }
          ]
        ]
      }
    }
  );
});

// /leaderboard command — shows live top 5 from Neon DB
bot.command('leaderboard', async (ctx) => {
  const data = await getLiveLeaderboard();

  let text = '🏆 *Hall of Fame*\n\n';

  if (data && data.entries && data.entries.length > 0) {
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    data.entries.forEach((entry, i) => {
      const medal = medals[i] || `${i + 1}.`;
      const name = entry.display_name.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
      text += `${medal} *${name}*\n`;
      text += `   Score: \`${entry.best_score.toLocaleString()}\` · ${entry.total_games} games\n\n`;
    });
    text += `_${data.total} players competing worldwide_ 🌍`;
  } else {
    text += 'No scores yet — be the first to play! 🎮';
  }

  return ctx.reply(text, {
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Play & Compete', web_app: { url: WEB_APP_URL } }],
        [{ text: '🏆 Full Leaderboard', web_app: { url: WEB_APP_URL } }],
      ],
    },
  });
});

// /about command
bot.command('about', (ctx) => {
  return ctx.reply(
    '🎮 *About Memorabilia*\n\n' +
    'Memorabilia is an on-chain memory card matching game built with:\n\n' +
    '⚡ *Dojo Framework* - Provable game engine\n' +
    '🔷 *Starknet* - Layer 2 blockchain\n' +
    '📱 *Telegram Mini Apps* - Seamless integration\n\n' +
    'All game logic runs on-chain, ensuring fairness and transparency!\n\n' +
    '🔗 Built by the Memorabilia team',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎮 Play Game',
              web_app: {
                url: WEB_APP_URL
              }
            }
          ]
        ]
      }
    }
  );
});

// Handle callback queries (button clicks)
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  if (data === 'help') {
    await ctx.answerCbQuery();
    return ctx.reply(
      '📖 *How to Play Memorabilia*\n\n' +
      '1️⃣ Choose your difficulty\n' +
      '2️⃣ Memorize the cards during preview\n' +
      '3️⃣ Flip cards to find matching pairs\n' +
      '4️⃣ Match all pairs to win!\n\n' +
      '🎯 Fewer moves and faster time = Higher score!',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🎮 Play Now',
                web_app: {
                  url: WEB_APP_URL
                }
              }
            ]
          ]
        }
      }
    );
  } else if (data === 'leaderboard') {
    await ctx.answerCbQuery();
    // Fetch live leaderboard
    const lbData = await getLiveLeaderboard();
    let text = '🏆 *Hall of Fame*\n\n';
    if (lbData && lbData.entries && lbData.entries.length > 0) {
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      lbData.entries.forEach((entry, i) => {
        const medal = medals[i] || `${i + 1}.`;
        const name = entry.display_name.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
        text += `${medal} *${name}* — \`${entry.best_score.toLocaleString()}\`\n`;
      });
    } else {
      text += 'No scores yet\\! Be the first 🎮';
    }
    return ctx.reply(text, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Play & Compete', web_app: { url: WEB_APP_URL } }],
        ],
      },
    });
  }
});

// Handle unknown commands
bot.on('text', (ctx) => {
  const text = ctx.message.text.toLowerCase();
  
  // Ignore if it's a command we already handle
  if (text.startsWith('/')) return;
  
  // Respond to common queries
  if (text.includes('play') || text.includes('game') || text.includes('start')) {
    return ctx.reply(
      '🎮 Ready to play? Tap the button below!',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🎮 Play Memorabilia',
                web_app: {
                  url: WEB_APP_URL
                }
              }
            ]
          ]
        }
      }
    );
  }
  
  // Default response
  return ctx.reply(
    '👋 Hi! I\'m the Memorabilia game bot.\n\n' +
    'Use /play to start the game or /help for instructions!',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎮 Play Now',
              web_app: {
                url: WEB_APP_URL
              }
            }
          ]
        ]
      }
    }
  );
});

// Error handling
bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
  ctx.reply('⚠️ Something went wrong. Please try again!');
});

// Start the bot
bot.launch()
  .then(() => {
    console.log('✅ Memorabilia bot is running!');
    console.log(`🎮 Web App URL: ${WEB_APP_URL}`);
    console.log('📱 Bot is ready to receive commands');
  })
  .catch((err) => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

