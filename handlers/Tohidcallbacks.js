const TohidQuiz = require('./Tohidquiz');
const TohidLeaderboard = require('./Tohidleaderboard');
const TohidStart = require('./Tohidstart');
const TohidKeyboards = require('../utils/Tohidkeyboard');

class TohidCallbackHandler {
  async handleCallback(ctx) {
    const callbackData = ctx.callbackQuery.data;
    
    try {
      console.log(`📱 Tohid Callback: ${callbackData}`);
      
      // Category selection
      if (callbackData.startsWith('category_')) {
        const category = callbackData.replace('category_', '');
        await TohidQuiz.handleCategory(ctx, category);
      }
      
      // Difficulty selection
      else if (callbackData.startsWith('difficulty_')) {
        const difficulty = callbackData.replace('difficulty_', '');
        await TohidQuiz.handleDifficulty(ctx, difficulty);
      }
      
      // Question count selection
      else if (callbackData.startsWith('count_')) {
        const count = parseInt(callbackData.replace('count_', ''));
        await TohidQuiz.handleQuestionCount(ctx, count);
      }
      
      // Answer selection
      else if (callbackData.startsWith('answer_')) {
        const answerIndex = parseInt(callbackData.replace('answer_', ''));
        await TohidQuiz.handleAnswer(ctx, answerIndex);
      }
      
      // Next question
      else if (callbackData === 'next_question') {
        await TohidQuiz.handleNextQuestion(ctx);
      }
      
      // Finish quiz
      else if (callbackData === 'finish_quiz') {
        await TohidQuiz.finishQuiz(ctx, ctx.session.sessionId);
      }
      
      // Cancel quiz
      else if (callbackData === 'cancel_quiz') {
        await TohidQuiz.cancelQuiz(ctx);
      }
      
      // Score info
      else if (callbackData === 'score_info') {
        await ctx.answerCbQuery('Current quiz score');
      }
      
      // Leaderboard
      else if (callbackData.startsWith('leaderboard_')) {
        const period = callbackData.replace('leaderboard_', '');
        await TohidLeaderboard.showLeaderboard(ctx, period);
      }
      
      // Back buttons
      else if (callbackData === 'back_main') {
        await ctx.editMessageText('🏠 Returning to main menu...');
        await ctx.reply('🤖 *Tohid AI Main Menu:*', {
          parse_mode: 'Markdown',
          ...TohidKeyboards.mainMenu()
        });
      }
      else if (callbackData === 'back_categories') {
        await ctx.editMessageText('📚 Choose category:', TohidKeyboards.categories());
      }
      else if (callbackData === 'back_difficulty') {
        await ctx.editMessageText('🎯 Choose difficulty:', TohidKeyboards.difficulties());
      }
      
      // Answer callback query
      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('❌ Tohid Callback Error:', error);
      await ctx.answerCbQuery('❌ Error occurred. Please try again.');
    }
  }
}

module.exports = new TohidCallbackHandler();