/**
 * Tohid AI Quiz Bot - Main Entry Point
 * Heroku Optimized Version
 */
const { Telegraf, session } = require('telegraf');
const config = require('./config');
const { TohidConnectDB, TohidQuestion } = require('./db/Tohidmongo');
const TohidQuestions = require('./Tohiddata/TohidData');

// Import handlers
const TohidStart = require('./handlers/Tohidstart');
const TohidQuiz = require('./handlers/Tohidquiz');
const TohidLeaderboard = require('./handlers/Tohidleaderboard');
const TohidHistory = require('./handlers/Tohidhistory');
const TohidCallbacks = require('./handlers/Tohidcallbacks');
const TohidGroup = require('./handlers/Tohidgroup');
const TohidAdmin = require('./handlers/Tohidadmin');

const TohidKeyboards = require('./utils/Tohidkeyboard');

// Initialize bot
const bot = new Telegraf(config.BOT_TOKEN);

// Use session middleware
bot.use(session());

// Add admin access control middleware
bot.use((ctx, next) => TohidAdmin.checkAccess(ctx, next));

// Express app setup - Heroku Health Check Endpoint
const express = require('express');
const app = express();
const PORT = config.PORT || 3000;

// Root endpoint
app.get('/', (req, res) => res.send('Tohid AI Quiz Bot is running!'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    bot: 'Tohid AI Quiz Bot',
    version: '3.0.0',
    features: ['Group Quiz', 'Challenge Mode', 'Admin Controls'],
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Bot status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    bot: config.BOT_NAME,
    version: '3.0.0',
    owner: config.OWNER_NAME,
    features: {
      group_quiz: config.GROUP_SETTINGS.ENABLE_GROUP_QUIZ,
      admin_controls: true,
      challenge_mode: true
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Initialize database
async function initializeDatabase() {
  try {
    console.log(config.SIGNATURE);
    console.log('🚀 Initializing Tohid AI Quiz Bot v3.0...');
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 MongoDB: ${config.MONGODB_URI.includes('mongodb+srv') ? 'Atlas' : 'Local'}`);
    console.log(`👥 Group Features: ${config.GROUP_SETTINGS.ENABLE_GROUP_QUIZ ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`🛠️ Admin Controls: ✅ Enabled`);
    
    await TohidConnectDB();
    
    // Seed questions if empty
    const count = await TohidQuestion.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding Tohid AI questions...');
      await TohidQuestion.insertMany(TohidQuestions);
      console.log(`✅ Seeded ${TohidQuestions.length} questions`);
    }
    
    console.log('✅ Database initialized successfully!');
    console.log(`🤖 Bot Name: ${config.BOT_NAME}`);
    console.log(`👨💻 Owner: ${config.OWNER_NAME}`);
    console.log(`🔧 Port: ${PORT}`);
    console.log(`👥 Allowed Groups: ${config.ADMIN_SETTINGS.ALLOWED_GROUPS.length}`);
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    // Don't exit immediately on Heroku, retry
    setTimeout(initializeDatabase, 5000);
  }
}

// Error Handling for Heroku
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash on Heroku
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Graceful shutdown for Heroku
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Heroku Keep Alive (Prevent dyno sleeping)
function setupKeepAlive() {
  if (config.IS_HEROKU) {
    setInterval(() => {
      const http = require('http');
      const options = {
        hostname: process.env.HEROKU_APP_NAME ? `${process.env.HEROKU_APP_NAME}.herokuapp.com` : 'localhost',
        port: PORT,
        path: '/health',
        method: 'GET',
        timeout: 5000
      };
      
      const req = http.request(options, (res) => {
        console.log(`🔄 Keep-alive ping: ${res.statusCode} at ${new Date().toLocaleTimeString()}`);
      });
      
      req.on('error', (err) => {
        console.error('❌ Keep-alive error:', err.message);
      });
      
      req.end();
    }, 20 * 60 * 1000); // Every 20 minutes
  }
}

// Memory Monitoring for Heroku
function setupMemoryMonitoring() {
  if (config.IS_HEROKU) {
    setInterval(() => {
      const used = process.memoryUsage();
      const heapUsed = Math.round(used.heapUsed / 1024 / 1024);
      const heapTotal = Math.round(used.heapTotal / 1024 / 1024);
      const rss = Math.round(used.rss / 1024 / 1024);
      
      console.log(`🧠 Memory Usage - Heap: ${heapUsed}MB/${heapTotal}MB, RSS: ${rss}MB`);
      
      // Warning at 80% of Heroku's 512MB limit
      if (rss > config.MEMORY_LIMIT * 0.8) {
        console.warn(`⚠️ High memory usage: ${rss}MB (${Math.round((rss/config.MEMORY_LIMIT)*100)}% of limit)`);
        if (global.gc) {
          console.log('🧹 Running garbage collection...');
          global.gc();
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}

// Bot Commands Setup
function setupBotCommands() {
  // ========== START COMMAND ==========
  bot.start(TohidStart.handleStart);
  bot.command('help', TohidStart.handleStart);

  // ========== MAIN MENU COMMANDS ==========
  bot.hears('🎮 Start Tohid Quiz', (ctx) => TohidQuiz.startQuizSelection(ctx));
  bot.hears('🏆 Leaderboard', (ctx) => TohidLeaderboard.showLeaderboard(ctx, 'all'));
  bot.hears('📜 My History', (ctx) => TohidHistory.showHistory(ctx));
  bot.hears('📊 My Stats', (ctx) => TohidStart.handleStats(ctx));
  bot.hears('⭐ About Tohid AI', (ctx) => TohidStart.handleAbout(ctx));
  bot.hears('🔗 Connect', (ctx) => ctx.replyWithMarkdown('🔗 *Connect with Tohid:*', TohidKeyboards.promotion()));

  // ========== GROUP QUIZ COMMANDS ==========
  bot.command('groupquiz', (ctx) => TohidGroup.startGroupQuiz(ctx));
  bot.command('stopgroupquiz', (ctx) => TohidGroup.stopGroupQuiz(ctx));
  bot.command('grouprank', (ctx) => TohidGroup.showGroupRank(ctx));
  
  // ========== CHALLENGE COMMANDS ==========
  bot.command('challenge', (ctx) => TohidGroup.startChallenge(ctx));
  bot.command('challengerank', (ctx) => TohidGroup.showGroupRank(ctx));

  // ========== ADMIN COMMANDS ==========
  bot.command('enablebot', (ctx) => TohidAdmin.handleAdminCommand(ctx));
  bot.command('disablebot', (ctx) => TohidAdmin.handleAdminCommand(ctx));
  bot.command('maintenance', (ctx) => TohidAdmin.handleAdminCommand(ctx));
  bot.command('adminstats', (ctx) => TohidAdmin.handleAdminCommand(ctx));
  bot.command('resetlimits', (ctx) => TohidAdmin.handleAdminCommand(ctx));
  bot.command('broadcast', (ctx) => TohidAdmin.handleAdminCommand(ctx));
  bot.command('listusers', (ctx) => TohidAdmin.handleAdminCommand(ctx));
  bot.command('blockuser', (ctx) => TohidAdmin.handleAdminCommand(ctx));
  bot.command('unblockuser', (ctx) => TohidAdmin.handleAdminCommand(ctx));
  bot.command('addgroup', (ctx) => TohidAdmin.handleAdminCommand(ctx));
  bot.command('removegroup', (ctx) => TohidAdmin.handleAdminCommand(ctx));
  bot.command('clearcache', (ctx) => TohidAdmin.handleAdminCommand(ctx));
  bot.command('helpadmin', (ctx) => TohidAdmin.handleAdminCommand(ctx));

  // ========== TEXT COMMANDS ==========
  bot.command('start', TohidStart.handleStart);
  bot.command('stats', TohidStart.handleStats);
  bot.command('leaderboard', (ctx) => TohidLeaderboard.showLeaderboard(ctx, 'all'));
  bot.command('history', TohidHistory.showHistory);
  bot.command('about', TohidStart.handleAbout);
  
  bot.command('ping', (ctx) => ctx.reply('🏓 Pong! Tohid AI Bot is alive!'));
  
  bot.command('status', (ctx) => {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const features = `
🤖 *Tohid AI Bot Status Report*

🔄 *Uptime:* ${hours}h ${minutes}m ${seconds}s
🧠 *Memory:* ${Math.round(memory.rss / 1024 / 1024)}MB / ${config.MEMORY_LIMIT}MB
👥 *Version:* 3.0.0
🌍 *Environment:* ${process.env.NODE_ENV || 'development'}

✅ *Features:*
• Group Quiz: ${config.GROUP_SETTINGS.ENABLE_GROUP_QUIZ ? '✅' : '❌'}
• Challenge Mode: ✅
• Admin Controls: ✅
• Daily Limits: ✅

📊 *Bot Status:* ${config.ADMIN_SETTINGS.ENABLE_QUIZ ? '✅ Operational' : '❌ Disabled'}
🔧 *Maintenance:* ${config.ADMIN_SETTINGS.MAINTENANCE_MODE ? '✅ On' : '❌ Off'}

*Use /help for commands list*
    `;
    
    ctx.replyWithMarkdown(features);
  });

  // ========== CALLBACK QUERIES ==========
  bot.on('callback_query', (ctx) => TohidCallbacks.handleCallback(ctx));

  // ========== TEXT MESSAGES ==========
  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    
    // If not a command or menu button, show main menu
    if (!text.startsWith('/') && ![
      '🎮 Start Tohid Quiz', '🏆 Leaderboard', '📜 My History',
      '📊 My Stats', '⭐ About Tohid AI', '🔗 Connect'
    ].includes(text)) {
      await ctx.reply('🤖 *Tohid AI Main Menu:*', {
        parse_mode: 'Markdown',
        ...TohidKeyboards.mainMenu()
      });
    }
  });

  // ========== ERROR HANDLING ==========
  bot.catch((err, ctx) => {
    console.error(`❌ Bot Error for ${ctx.updateType}:`, err);
    try {
      ctx.reply('❌ An error occurred. Please try again or use /start');
    } catch (e) {
      console.error('Failed to send error message:', e);
    }
  });
}

// Start bot
async function startBot() {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Setup bot commands
    setupBotCommands();
    
    // Start web server for Heroku health checks
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Web server listening on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Status page: http://localhost:${PORT}/status`);
    });
    
    // Setup Heroku features
    setupKeepAlive();
    setupMemoryMonitoring();
    
    // Launch bot (using polling for Heroku simplicity)
    console.log('🚀 Launching Telegram Bot...');
    await bot.launch({
      dropPendingUpdates: true,
      allowedUpdates: ['message', 'callback_query', 'chat_member']
    });
    
    console.log('✅ Tohid AI Bot v3.0 is now running!');
    console.log('📱 Bot is ready to receive messages...');
    console.log('👥 Group Features: ✅ Active');
    console.log('🛠️ Admin Controls: ✅ Active');
    console.log('⚔️ Challenge Mode: ✅ Active');
    
    // Enable graceful stop
    const stopBot = () => {
      console.log('🛑 Stopping bot gracefully...');
      bot.stop();
      process.exit(0);
    };
    
    process.once('SIGINT', stopBot);
    process.once('SIGTERM', stopBot);
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    
    // Retry after delay for Heroku
    if (config.IS_HEROKU) {
      console.log('🔄 Retrying in 10 seconds...');
      setTimeout(startBot, 10000);
    } else {
      process.exit(1);
    }
  }
}

// Start the bot
startBot();

// Export for testing
module.exports = {
  bot,
  app,
  config
};