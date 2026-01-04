const { TohidQuizSession } = require('../db/Tohidmongo');
const TohidKeyboards = require('../utils/Tohidkeyboard');

class TohidHistoryHandler {
  async showHistory(ctx) {
    const userId = ctx.from.id;
    
    try {
      const quizzes = await TohidQuizSession.find({ 
        userId, 
        completed: true 
      })
      .sort({ completedAt: -1 })
      .limit(10);
      
      if (quizzes.length === 0) {
        await ctx.reply(
          '📭 *No quiz history found.*\n\n' +
          'Complete your first quiz to start building history!',
          {
            parse_mode: 'Markdown',
            ...TohidKeyboards.mainMenu()
          }
        );
        return;
      }
      
      let historyText = '📜 *Your Tohid AI Quiz History*\n\n';
      
      quizzes.forEach((quiz, index) => {
        const date = quiz.completedAt.toLocaleDateString();
        const accuracy = ((quiz.correctAnswers / quiz.totalQuestions) * 100).toFixed(1);
        
        historyText += 
          `*Quiz ${index + 1}:*\n` +
          `📚 ${quiz.category}\n` +
          `⚡ ${quiz.difficulty}\n` +
          `⭐ Score: ${quiz.score}\n` +
          `✅ ${quiz.correctAnswers}/${quiz.totalQuestions} (${accuracy}%)\n` +
          `⏱️ ${Math.floor(quiz.timeTaken / 60)}m ${quiz.timeTaken % 60}s\n` +
          `📅 ${date}\n\n`;
      });
      
      // Add summary
      const totalQuizzes = await TohidQuizSession.countDocuments({ 
        userId, 
        completed: true 
      });
      
      const totalScore = await TohidQuizSession.aggregate([
        { $match: { userId, completed: true } },
        { $group: { _id: null, total: { $sum: '$score' } } }
      ]);
      
      const avgScore = await TohidQuizSession.aggregate([
        { $match: { userId, completed: true } },
        { $group: { _id: null, avg: { $avg: '$score' } } }
      ]);
      
      historyText += 
        `*Summary:*\n` +
        `📈 Total Quizzes: ${totalQuizzes}\n` +
        `🏆 Total Score: ${totalScore[0]?.total || 0}\n` +
        `📊 Average Score: ${Math.round(avgScore[0]?.avg || 0)}`;
      
      await ctx.replyWithMarkdown(historyText, TohidKeyboards.mainMenu());
      
    } catch (error) {
      console.error('❌ Tohid History Error:', error);
      await ctx.reply('❌ Error loading history. Please try again.');
    }
  }
}

module.exports = new TohidHistoryHandler();