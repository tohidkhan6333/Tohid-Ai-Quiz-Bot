const { TohidUser, TohidLeaderboard } = require('../db/Tohidmongo');
const TohidKeyboards = require('../utils/Tohidkeyboard');

class TohidLeaderboardHandler {
  async showLeaderboard(ctx, period = 'all') {
    await ctx.reply(
      `🏆 *Tohid AI ${this.getPeriodName(period)} Leaderboard*\n\n` +
      'Loading top players...',
      {
        parse_mode: 'Markdown',
        ...TohidKeyboards.leaderboard()
      }
    );
    
    try {
      const leaderboard = await this.getLeaderboard(period);
      await this.displayLeaderboard(ctx, leaderboard, period);
    } catch (error) {
      console.error('❌ Tohid Leaderboard Error:', error);
      await ctx.editMessageText('❌ Error loading leaderboard. Please try again.');
    }
  }

  async getLeaderboard(period) {
    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = null;
    }
    
    let query = {};
    if (startDate) {
      query.lastPlayed = { $gte: startDate };
    }
    
    const users = await TohidUser.find(query)
      .sort({ totalScore: -1 })
      .limit(10)
      .select('userId username firstName totalScore totalQuizzes correctAnswers lastPlayed');
    
    return users.map((user, index) => ({
      rank: index + 1,
      username: user.username || user.firstName || 'Anonymous',
      score: user.totalScore,
      quizzes: user.totalQuizzes,
      correct: user.correctAnswers,
      lastPlayed: user.lastPlayed
    }));
  }

  async displayLeaderboard(ctx, leaderboard, period) {
    if (leaderboard.length === 0) {
      await ctx.editMessageText(
        '📭 *No players found for this period.*\n\nBe the first to appear on the leaderboard!',
        {
          parse_mode: 'Markdown',
          ...TohidKeyboards.leaderboard()
        }
      );
      return;
    }
    
    let leaderboardText = `🏆 *Tohid AI ${this.getPeriodName(period)} Leaderboard*\n\n`;
    
    // Emojis for positions
    const positionEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    leaderboard.forEach((user, index) => {
      const emoji = positionEmojis[index] || `${index + 1}.`;
      leaderboardText += 
        `${emoji} *${user.username}*\n` +
        `   ⭐ Score: ${user.score}\n` +
        `   🎮 Quizzes: ${user.quizzes}\n` +
        `   ✅ Correct: ${user.correct}\n\n`;
    });
    
    // Add current user position
    const currentUser = await TohidUser.findOne({ userId: ctx.from.id });
    if (currentUser) {
      const allUsers = await TohidUser.countDocuments({ 
        totalScore: { $gt: currentUser.totalScore } 
      });
      leaderboardText += `\n*Your Position:* #${allUsers + 1}\n`;
      leaderboardText += `*Your Score:* ${currentUser.totalScore}`;
    }
    
    await ctx.editMessageText(leaderboardText, {
      parse_mode: 'Markdown',
      ...TohidKeyboards.leaderboard()
    });
  }

  getPeriodName(period) {
    const names = {
      'all': 'All Time',
      'today': 'Today',
      'week': 'Weekly',
      'month': 'Monthly'
    };
    return names[period] || 'All Time';
  }
}

module.exports = new TohidLeaderboardHandler();