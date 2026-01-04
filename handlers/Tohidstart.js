const TohidKeyboards = require('../utils/Tohidkeyboard');
const config = require('../config');
const { TohidUser } = require('../db/Tohidmongo');

const TohidStartHandler = {
  async handleStart(ctx) {
    const userId = ctx.from.id;
    const username = ctx.from.username;
    const firstName = ctx.from.first_name;
    const lastName = ctx.from.last_name || '';

    // Register or update user
    try {
      let user = await TohidUser.findOne({ userId });
      
      if (!user) {
        user = new TohidUser({
          userId,
          username,
          firstName,
          lastName,
          referralCode: `TOHID${userId}${Date.now().toString().slice(-4)}`
        });
        await user.save();
        console.log(`✅ Tohid: New user registered - ${username || firstName}`);
      } else {
        user.username = username;
        user.firstName = firstName;
        user.lastName = lastName;
        user.updatedAt = new Date();
        await user.save();
      }
    } catch (error) {
      console.error('❌ Tohid User Save Error:', error);
    }

    const welcomeMessage = `
🤖 *Welcome to ${config.BOT_NAME}!*

👋 *Hello ${firstName}!* I'm *Tohid AI*, your intelligent quiz companion created by *${config.OWNER_NAME}*.

🎯 *Features:*
• 11+ Categories with AI-powered questions
• Multiple difficulty levels
• Real-time scoring system
• Global leaderboard
• Daily streaks & rewards
• Performance analytics

📚 *Available Categories:*
${config.CATEGORIES.map(c => `${c.icon} ${c.name}`).join(' | ')}

⚡ *Quick Start:*
1. Tap *"🎮 Start Tohid Quiz"*
2. Choose your category
3. Select difficulty
4. Start answering!

*Let's test your knowledge!* 🚀
`;

    await ctx.replyWithMarkdown(welcomeMessage, TohidKeyboards.mainMenu());
  },

  async handleAbout(ctx) {
    const aboutMessage = `
⭐ *About ${config.BOT_NAME}*

🤖 *Bot Name:* ${config.BOT_NAME}
👨💻 *Creator:* ${config.OWNER_NAME} (${config.OWNER_USERNAME})
📱 *WhatsApp:* ${config.OWNER_WHATSAPP_NUMBER}
🌐 *Website:* ${config.QUIZ_WEB_LINK}
📅 *Version:* 3.0.0

🎯 *Mission:*
To make learning fun and engaging through intelligent quizzes powered by AI technology.

✨ *Technology Stack:*
• Node.js with Telegraf framework
• MongoDB for data storage
• OpenTDB API integration
• Custom AI algorithms by Tohid

📊 *Statistics:*
• 500+ questions in database
• 11 diverse categories
• Real-time performance tracking
• Smart question selection

🔗 *Connect with Tohid:*
`;

    await ctx.replyWithMarkdown(aboutMessage, TohidKeyboards.promotion());
  },

  async handleStats(ctx) {
    const userId = ctx.from.id;
    
    try {
      const user = await TohidUser.findOne({ userId });
      
      if (!user) {
        await ctx.reply('❌ No stats found. Please start your first quiz!');
        return;
      }

      const totalAnswers = user.correctAnswers + user.wrongAnswers;
      const accuracy = totalAnswers > 0 
        ? ((user.correctAnswers / totalAnswers) * 100).toFixed(1)
        : 0;

      const statsMessage = `
📊 *Your Tohid AI Stats*

👤 *Profile:*
• Name: ${user.firstName}${user.username ? ` (@${user.username})` : ''}
• User ID: ${user.userId}

🏆 *Performance:*
• Total Score: ${user.totalScore}
• Quizzes Played: ${user.totalQuizzes}
• Correct Answers: ${user.correctAnswers}
• Wrong Answers: ${user.wrongAnswers}
• Accuracy: ${accuracy}%

📈 *Progress:*
• Daily Streak: ${user.dailyStreak} days
• Quizzes Today: ${user.quizzesToday}
• Categories Played: ${user.categoriesPlayed?.length || 0}/11
• Last Played: ${user.lastPlayed ? user.lastPlayed.toLocaleDateString() : 'Never'}

🔗 *Referral:*
• Your Code: \`${user.referralCode}\`
• Referrals: ${user.referralCount}

*Keep playing to improve your stats!* 🚀
`;

      await ctx.replyWithMarkdown(statsMessage, TohidKeyboards.mainMenu());
    } catch (error) {
      console.error('❌ Tohid Stats Error:', error);
      await ctx.reply('❌ Error fetching stats. Please try again.');
    }
  }
};

module.exports = TohidStartHandler;