/**
 * Tohid AI Admin Control Handler
 * Created by Tohid
 */
const config = require('../config');
const { TohidUser, TohidQuizSession } = require('../db/Tohidmongo');

// Admin controls storage
const adminControls = {
  isEnabled: config.ADMIN_SETTINGS.ENABLE_QUIZ,
  maintenanceMode: config.ADMIN_SETTINGS.MAINTENANCE_MODE,
  maintenanceMessage: config.ADMIN_SETTINGS.MAINTENANCE_MESSAGE,
  userDailyQuizzes: new Map(), // userId -> {date: string, count: number}
  lastCommandTime: new Map(),  // userId -> timestamp for spam protection
  blockedUsers: new Set(),     // userIds of blocked users
  allowedGroups: new Set(config.ADMIN_SETTINGS.ALLOWED_GROUPS)
};

class TohidAdminHandler {
  // ========== ACCESS CONTROL MIDDLEWARE ==========

  async checkAccess(ctx, next) {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    
    if (!userId) return next();
    
    // Check if user is blocked
    if (adminControls.blockedUsers.has(userId)) {
      return ctx.reply('❌ You have been blocked from using this bot.');
    }
    
    // Check maintenance mode
    if (adminControls.maintenanceMode) {
      return ctx.reply(adminControls.maintenanceMessage);
    }
    
    // Check if bot is enabled
    if (!adminControls.isEnabled && !this.isAdmin(userId)) {
      return ctx.reply('❌ Bot is currently disabled by admin.');
    }
    
    // Check if in allowed group (for group commands)
    if (chatId && chatId < 0) { // Negative chat IDs are groups
      if (!adminControls.allowedGroups.has(chatId) && !this.isAdmin(userId)) {
        return ctx.reply('❌ This group is not authorized to use the bot.');
      }
    }
    
    // Spam protection (skip for admins)
    if (!this.isAdmin(userId)) {
      const now = Date.now();
      const lastTime = adminControls.lastCommandTime.get(userId) || 0;
      
      if (now - lastTime < config.ADMIN_SETTINGS.SPAM_PROTECTION_DELAY * 1000) {
        return ctx.reply(`⏳ Please wait ${config.ADMIN_SETTINGS.SPAM_PROTECTION_DELAY} seconds between commands.`);
      }
      
      adminControls.lastCommandTime.set(userId, now);
    }
    
    // Check daily quiz limit (skip for admins if bypass enabled)
    if (!this.isAdmin(userId) || !config.ADMIN_SETTINGS.ADMIN_BYPASS_LIMITS) {
      if (!await this.checkDailyQuizLimit(userId)) {
        return ctx.reply(
          `❌ Daily quiz limit reached (${config.ADMIN_SETTINGS.MAX_QUIZZES_PER_USER_DAY}).\n` +
          'Try again tomorrow!'
        );
      }
    }
    
    return next();
  }
  
  // Check daily quiz limit
  async checkDailyQuizLimit(userId) {
    const today = new Date().toDateString();
    const userKey = `${userId}_${today}`;
    let userData = adminControls.userDailyQuizzes.get(userKey);
    
    // Initialize or check date
    if (!userData || userData.date !== today) {
      userData = { date: today, count: 0 };
      adminControls.userDailyQuizzes.set(userKey, userData);
    }
    
    // Check limit
    if (userData.count >= config.ADMIN_SETTINGS.MAX_QUIZZES_PER_USER_DAY) {
      return false;
    }
    
    return true;
  }
  
  // Increment daily quiz count
  async incrementDailyQuizCount(userId) {
    const today = new Date().toDateString();
    const userKey = `${userId}_${today}`;
    let userData = adminControls.userDailyQuizzes.get(userKey);
    
    if (!userData || userData.date !== today) {
      userData = { date: today, count: 1 };
    } else {
      userData.count++;
    }
    
    adminControls.userDailyQuizzes.set(userKey, userData);
  }
  
  // ========== ADMIN COMMANDS ==========

  async handleAdminCommand(ctx) {
    if (!this.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ Admin access required!');
    }
    
    const command = ctx.message.text.split(' ')[0];
    
    switch (command) {
      case '/enablebot':
        return this.enableBot(ctx);
      case '/disablebot':
        return this.disableBot(ctx);
      case '/maintenance':
        return this.toggleMaintenance(ctx);
      case '/adminstats':
        return this.showAdminStats(ctx);
      case '/resetlimits':
        return this.resetUserLimits(ctx);
      case '/broadcast':
        return this.broadcastMessage(ctx);
      case '/listusers':
        return this.listUsers(ctx);
      case '/blockuser':
        return this.blockUser(ctx);
      case '/unblockuser':
        return this.unblockUser(ctx);
      case '/addgroup':
        return this.addGroup(ctx);
      case '/removegroup':
        return this.removeGroup(ctx);
      case '/clearcache':
        return this.clearCache(ctx);
      case '/helpadmin':
        return this.showAdminHelp(ctx);
      default:
        return ctx.reply('❌ Unknown admin command. Use /helpadmin for available commands.');
    }
  }
  
  // Enable bot
  async enableBot(ctx) {
    adminControls.isEnabled = true;
    await ctx.reply('✅ Bot enabled successfully!\nAll users can now use the bot.');
  }
  
  // Disable bot
  async disableBot(ctx) {
    adminControls.isEnabled = false;
    await ctx.reply('✅ Bot disabled successfully!\nOnly admins can use the bot now.');
  }
  
  // Toggle maintenance mode
  async toggleMaintenance(ctx) {
    const args = ctx.message.text.split(' ');
    
    if (args.length > 1) {
      adminControls.maintenanceMessage = args.slice(1).join(' ');
    }
    
    adminControls.maintenanceMode = !adminControls.maintenanceMode;
    const status = adminControls.maintenanceMode ? 'enabled' : 'disabled';
    
    await ctx.reply(
      `✅ Maintenance mode ${status}!\n` +
      `Message: ${adminControls.maintenanceMessage}`
    );
  }
  
  // Show admin stats
  async showAdminStats(ctx) {
    try {
      const totalUsers = await TohidUser.countDocuments();
      const activeToday = await TohidUser.countDocuments({
        lastPlayed: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      
      const totalQuizzes = await TohidQuizSession.countDocuments({ completed: true });
      const groupQuizzes = await TohidQuizSession.countDocuments({ isGroupQuiz: true, completed: true });
      
      const topUsers = await TohidUser.find()
        .sort({ totalScore: -1 })
        .limit(5)
        .select('userId username firstName totalScore totalQuizzes lastPlayed');
      
      let statsText = 
        '📊 *ADMIN STATISTICS*\n\n' +
        `🤖 *Bot Status:* ${adminControls.isEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `🔧 *Maintenance:* ${adminControls.maintenanceMode ? '✅ On' : '❌ Off'}\n` +
        `🚫 *Blocked Users:* ${adminControls.blockedUsers.size}\n` +
        `👥 *Allowed Groups:* ${adminControls.allowedGroups.size}\n\n` +
        
        `📈 *Database Stats:*\n` +
        `👤 Total Users: ${totalUsers}\n` +
        `🔥 Active Today: ${activeToday}\n` +
        `🎮 Total Quizzes: ${totalQuizzes}\n` +
        `👥 Group Quizzes: ${groupQuizzes}\n\n`;
      
      // Daily quiz counts
      const today = new Date().toDateString();
      let todayQuizzes = 0;
      adminControls.userDailyQuizzes.forEach(data => {
        if (data.date === today) todayQuizzes += data.count;
      });
      
      statsText += `📅 Quizzes Today: ${todayQuizzes}\n\n`;
      
      // Top users
      statsText += `🏆 *Top 5 Users:*\n`;
      topUsers.forEach((user, index) => {
        const lastPlayed = user.lastPlayed 
          ? new Date(user.lastPlayed).toLocaleDateString() 
          : 'Never';
        
        statsText += 
          `${index + 1}. ${user.username || user.firstName || 'Anonymous'}\n` +
          `   🆔 ${user.userId}\n` +
          `   ⭐ ${user.totalScore} points\n` +
          `   🎮 ${user.totalQuizzes} quizzes\n` +
          `   📅 Last: ${lastPlayed}\n\n`;
      });
      
      // Memory usage
      const memory = process.memoryUsage();
      const heapUsed = Math.round(memory.heapUsed / 1024 / 1024);
      const heapTotal = Math.round(memory.heapTotal / 1024 / 1024);
      const rss = Math.round(memory.rss / 1024 / 1024);
      
      statsText += 
        `🧠 *Memory Usage:*\n` +
        `   Heap: ${heapUsed}MB/${heapTotal}MB\n` +
        `   RSS: ${rss}MB\n` +
        `   Limit: ${config.MEMORY_LIMIT}MB (${Math.round((rss/config.MEMORY_LIMIT)*100)}%)\n\n` +
        
        `📊 *Config Limits:*\n` +
        `   Max Quizzes/Day: ${config.ADMIN_SETTINGS.MAX_QUIZZES_PER_USER_DAY}\n` +
        `   Spam Delay: ${config.ADMIN_SETTINGS.SPAM_PROTECTION_DELAY}s\n` +
        `   Admin Bypass: ${config.ADMIN_SETTINGS.ADMIN_BYPASS_LIMITS ? '✅' : '❌'}`;
      
      await ctx.reply(statsText, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Admin stats error:', error);
      await ctx.reply('❌ Error loading admin statistics.');
    }
  }
  
  // Reset user limits
  async resetUserLimits(ctx) {
    const args = ctx.message.text.split(' ');
    
    if (args.length > 1 && args[1] === 'all') {
      adminControls.userDailyQuizzes.clear();
      await ctx.reply('✅ All user daily limits have been reset!');
    } else if (args.length > 1) {
      const userId = parseInt(args[1]);
      if (userId) {
        // Remove all entries for this user
        const keysToDelete = [];
        adminControls.userDailyQuizzes.forEach((value, key) => {
          if (key.startsWith(`${userId}_`)) {
            keysToDelete.push(key);
          }
        });
        
        keysToDelete.forEach(key => {
          adminControls.userDailyQuizzes.delete(key);
        });
        
        await ctx.reply(`✅ Daily limits reset for user ${userId}!`);
      } else {
        await ctx.reply('❌ Invalid user ID!\nUsage: /resetlimits [user_id] or /resetlimits all');
      }
    } else {
      await ctx.reply('Usage: /resetlimits [user_id] or /resetlimits all');
    }
  }
  
  // Broadcast message to all users
  async broadcastMessage(ctx) {
    const message = ctx.message.text.replace('/broadcast ', '');
    
    if (!message || message === '/broadcast') {
      return ctx.reply(
        '📢 *Broadcast Message*\n\n' +
        'Usage: /broadcast your message here\n\n' +
        'Example: /broadcast New features added! Check out /help',
        { parse_mode: 'Markdown' }
      );
    }
    
    const confirmMessage = await ctx.reply(
      `📢 *Confirm Broadcast*\n\n` +
      `Message: ${message}\n\n` +
      `This will be sent to all users. Are you sure?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Yes, Send to All', callback_data: 'broadcast_confirm_all' },
              { text: '📋 Preview Only', callback_data: 'broadcast_preview' }
            ],
            [
              { text: '❌ Cancel', callback_data: 'broadcast_cancel' }
            ]
          ]
        }
      }
    );
    
    // Store broadcast data temporarily
    ctx.session.broadcastData = {
      message,
      confirmMessageId: confirmMessage.message_id
    };
  }
  
  async handleBroadcastCallback(ctx, action) {
    const broadcastData = ctx.session.broadcastData;
    if (!broadcastData) {
      return ctx.answerCbQuery('❌ No broadcast data found.');
    }
    
    switch (action) {
      case 'confirm_all':
        await ctx.editMessageText('📤 Broadcasting to all users... This may take a while.');
        
        try {
          const users = await TohidUser.find().select('userId');
          let sentCount = 0;
          let failedCount = 0;
          let blockedCount = 0;
          
          const broadcastText = 
            `📢 *BROADCAST MESSAGE*\n\n` +
            `${broadcastData.message}\n\n` +
            `- ${config.BOT_NAME} Admin`;
          
          for (const user of users) {
            // Skip if user is blocked
            if (adminControls.blockedUsers.has(user.userId)) {
              blockedCount++;
              continue;
            }
            
            try {
              await ctx.telegram.sendMessage(
                user.userId, 
                broadcastText,
                { parse_mode: 'Markdown' }
              );
              sentCount++;
              
              // Delay to avoid rate limits (50 messages per second limit)
              await new Promise(resolve => setTimeout(resolve, 50));
              
            } catch (error) {
              failedCount++;
              
              // If user blocked the bot, add to blocked list
              if (error.response && error.response.error_code === 403) {
                adminControls.blockedUsers.add(user.userId);
              }
            }
          }
          
          const resultText = 
            `✅ *Broadcast Completed!*\n\n` +
            `📤 Sent: ${sentCount}\n` +
            `❌ Failed: ${failedCount}\n` +
            `🚫 Blocked: ${blockedCount}\n` +
            `👥 Total: ${users.length}`;
          
          await ctx.editMessageText(resultText, { parse_mode: 'Markdown' });
          
        } catch (error) {
          console.error('Broadcast error:', error);
          await ctx.editMessageText('❌ Error broadcasting message!');
        }
        break;
        
      case 'preview':
        await ctx.editMessageText(
          `📋 *Broadcast Preview*\n\n` +
          `Message: ${broadcastData.message}\n\n` +
          `This is how it will appear to users.`,
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'cancel':
        await ctx.editMessageText('❌ Broadcast cancelled.');
        break;
    }
    
    delete ctx.session.broadcastData;
    await ctx.answerCbQuery();
  }
  
  // List users
  async listUsers(ctx) {
    const args = ctx.message.text.split(' ');
    const page = parseInt(args[1]) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    try {
      const users = await TohidUser.find()
        .sort({ totalScore: -1 })
        .skip(skip)
        .limit(limit)
        .select('userId username firstName totalScore totalQuizzes correctAnswers createdAt lastPlayed');
      
      const totalUsers = await TohidUser.countDocuments();
      
      let listText = `📋 *USER LIST - Page ${page}/${Math.ceil(totalUsers / limit)}*\n\n`;
      
      users.forEach((user, index) => {
        const accuracy = user.correctAnswers > 0 && user.totalQuizzes > 0
          ? Math.round((user.correctAnswers / (user.totalQuizzes * 5)) * 100) // Approximate
          : 0;
        
        const lastPlayed = user.lastPlayed 
          ? new Date(user.lastPlayed).toLocaleDateString() 
          : 'Never';
        
        const isBlocked = adminControls.blockedUsers.has(user.userId) ? '🚫 ' : '';
        
        listText += 
          `${isBlocked}${skip + index + 1}. *${user.firstName || 'Anonymous'}*\n` +
          `   🆔 ${user.userId}\n` +
          `   👤 ${user.username ? '@' + user.username : 'No username'}\n` +
          `   🏆 ${user.totalScore} points\n` +
          `   🎮 ${user.totalQuizzes} quizzes\n` +
          `   🎯 ${accuracy}% accuracy\n` +
          `   📅 Joined: ${user.createdAt.toLocaleDateString()}\n` +
          `   📍 Last: ${lastPlayed}\n\n`;
      });
      
      // Add navigation buttons if there are multiple pages
      const keyboard = [];
      if (page > 1) {
        keyboard.push({ text: '⬅️ Previous', callback_data: `admin_listusers_${page - 1}` });
      }
      if (page < Math.ceil(totalUsers / limit)) {
        if (keyboard.length > 0) {
          keyboard.push({ text: 'Next ➡️', callback_data: `admin_listusers_${page + 1}` });
        } else {
          keyboard.push({ text: 'Next ➡️', callback_data: `admin_listusers_${page + 1}` });
        }
      }
      
      const replyMarkup = keyboard.length > 0 ? {
        reply_markup: { inline_keyboard: [keyboard] }
      } : {};
      
      await ctx.reply(listText, { 
        parse_mode: 'Markdown',
        ...replyMarkup
      });
      
    } catch (error) {
      console.error('List users error:', error);
      await ctx.reply('❌ Error loading user list.');
    }
  }
  
  // Block user
  async blockUser(ctx) {
    const args = ctx.message.text.split(' ');
    
    if (args.length < 2) {
      return ctx.reply(
        '🚫 *Block User*\n\n' +
        'Usage: /blockuser [user_id] [reason]\n\n' +
        'Example: /blockuser 12345678 Spamming',
        { parse_mode: 'Markdown' }
      );
    }
    
    const userId = parseInt(args[1]);
    const reason = args.slice(2).join(' ') || 'No reason provided';
    
    if (!userId) {
      return ctx.reply('❌ Invalid user ID!');
    }
    
    // Check if already blocked
    if (adminControls.blockedUsers.has(userId)) {
      return ctx.reply('⚠️ User is already blocked!');
    }
    
    // Check if trying to block admin
    if (this.isAdmin(userId)) {
      return ctx.reply('❌ Cannot block an admin!');
    }
    
    adminControls.blockedUsers.add(userId);
    
    // Try to notify the user
    try {
      await ctx.telegram.sendMessage(
        userId,
        `🚫 *YOU HAVE BEEN BLOCKED*\n\n` +
        `Reason: ${reason}\n\n` +
        `You can no longer use ${config.BOT_NAME}.\n` +
        `Contact admin if you think this is a mistake.`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error notifying blocked user:', error);
    }
    
    await ctx.reply(
      `✅ User ${userId} has been blocked!\n` +
      `Reason: ${reason}`
    );
  }
  
  // Unblock user
  async unblockUser(ctx) {
    const args = ctx.message.text.split(' ');
    
    if (args.length < 2) {
      return ctx.reply(
        '🔓 *Unblock User*\n\n' +
        'Usage: /unblockuser [user_id]\n\n' +
        'Example: /unblockuser 12345678',
        { parse_mode: 'Markdown' }
      );
    }
    
    const userId = parseInt(args[1]);
    
    if (!userId) {
      return ctx.reply('❌ Invalid user ID!');
    }
    
    if (!adminControls.blockedUsers.has(userId)) {
      return ctx.reply('⚠️ User is not blocked!');
    }
    
    adminControls.blockedUsers.delete(userId);
    
    // Try to notify the user
    try {
      await ctx.telegram.sendMessage(
        userId,
        `✅ *YOU HAVE BEEN UNBLOCKED*\n\n` +
        `You can now use ${config.BOT_NAME} again.\n` +
        `Welcome back!`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error notifying unblocked user:', error);
    }
    
    await ctx.reply(`✅ User ${userId} has been unblocked!`);
  }
  
  // Add group to allowed list
  async addGroup(ctx) {
    let groupId = ctx.chat?.id;
    const args = ctx.message.text.split(' ');
    
    if (args.length > 1) {
      groupId = parseInt(args[1]);
    }
    
    if (!groupId || groupId >= 0) {
      return ctx.reply(
        '👥 *Add Group*\n\n' +
        'Usage in group: /addgroup\n' +
        'Usage anywhere: /addgroup [group_id]\n\n' +
        'Group IDs are negative numbers.\n' +
        'Example: /addgroup -1001234567890',
        { parse_mode: 'Markdown' }
      );
    }
    
    if (adminControls.allowedGroups.has(groupId)) {
      return ctx.reply('⚠️ This group is already allowed!');
    }
    
    adminControls.allowedGroups.add(groupId);
    
    await ctx.reply(
      `✅ Group ${groupId} has been added to allowed list!\n\n` +
      `Now this group can use:\n` +
      `• /groupquiz - Start group quiz\n` +
      `• /challenge - Challenge other members\n` +
      `• /grouprank - View group rankings`
    );
  }
  
  // Remove group from allowed list
  async removeGroup(ctx) {
    const args = ctx.message.text.split(' ');
    
    if (args.length < 2) {
      return ctx.reply(
        '🚫 *Remove Group*\n\n' +
        'Usage: /removegroup [group_id]\n\n' +
        'Example: /removegroup -1001234567890',
        { parse_mode: 'Markdown' }
      );
    }
    
    const groupId = parseInt(args[1]);
    
    if (!groupId || groupId >= 0) {
      return ctx.reply('❌ Invalid group ID! Group IDs are negative numbers.');
    }
    
    if (!adminControls.allowedGroups.has(groupId)) {
      return ctx.reply('⚠️ This group is not in the allowed list!');
    }
    
    adminControls.allowedGroups.delete(groupId);
    
    await ctx.reply(`✅ Group ${groupId} has been removed from allowed list!`);
  }
  
  // Clear cache
  async clearCache(ctx) {
    const args = ctx.message.text.split(' ');
    
    if (args.length > 1 && args[1] === 'all') {
      adminControls.userDailyQuizzes.clear();
      adminControls.lastCommandTime.clear();
      await ctx.reply('✅ All cache cleared!');
    } else if (args.length > 1 && args[1] === 'daily') {
      adminControls.userDailyQuizzes.clear();
      await ctx.reply('✅ Daily quiz limits cache cleared!');
    } else if (args.length > 1 && args[1] === 'spam') {
      adminControls.lastCommandTime.clear();
      await ctx.reply('✅ Spam protection cache cleared!');
    } else {
      await ctx.reply(
        '🧹 *Clear Cache*\n\n' +
        'Usage:\n' +
        '/clearcache all - Clear all cache\n' +
        '/clearcache daily - Clear daily limits\n' +
        '/clearcache spam - Clear spam protection',
        { parse_mode: 'Markdown' }
      );
    }
  }
  
  // Show admin help
  async showAdminHelp(ctx) {
    const helpText = 
      `🛠️ *ADMIN COMMANDS HELP*\n\n` +
      
      `⚙️ *Bot Control:*\n` +
      `/enablebot - Enable bot for all users\n` +
      `/disablebot - Disable bot (admins only)\n` +
      `/maintenance [msg] - Toggle maintenance mode\n\n` +
      
      `📊 *Statistics:*\n` +
      `/adminstats - Show bot statistics\n` +
      `/listusers [page] - List all users\n` +
      `/broadcast [msg] - Send message to all users\n\n` +
      
      `👤 *User Management:*\n` +
      `/blockuser [id] [reason] - Block a user\n` +
      `/unblockuser [id] - Unblock a user\n` +
      `/resetlimits [id|all] - Reset daily limits\n\n` +
      
      `👥 *Group Management:*\n` +
      `/addgroup [id] - Add group to allowed list\n` +
      `/removegroup [id] - Remove group from allowed list\n\n` +
      
      `🧹 *Cache Management:*\n` +
      `/clearcache all - Clear all cache\n` +
      `/clearcache daily - Clear daily limits\n` +
      `/clearcache spam - Clear spam protection\n\n` +
      
      `❓ *Other:*\n` +
      `/helpadmin - Show this help message\n\n` +
      
      `📝 *Notes:*\n` +
      `• Admin IDs are set in config.js\n` +
      `• Group IDs are negative numbers\n` +
      `• Use /adminstats to see current settings`;
    
    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  }
  
  // ========== HELPER METHODS ==========
  
  isAdmin(userId) {
    return config.GROUP_SETTINGS.ADMIN_USER_IDS.includes(userId);
  }
  
  // Handle admin callback queries
  async handleAdminCallback(ctx, action, data) {
    if (!this.isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Admin access required!');
    }
    
    switch (action) {
      case 'listusers':
        const page = parseInt(data);
        ctx.message = { text: `/listusers ${page}` };
        await this.listUsers(ctx);
        await ctx.answerCbQuery(`Loading page ${page}...`);
        break;
        
      case 'broadcast_confirm_all':
      case 'broadcast_preview':
      case 'broadcast_cancel':
        await this.handleBroadcastCallback(ctx, action.replace('broadcast_', ''));
        break;
    }
  }
}

module.exports = new TohidAdminHandler();