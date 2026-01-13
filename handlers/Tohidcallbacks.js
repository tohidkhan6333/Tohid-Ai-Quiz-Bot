const TohidQuiz = require('./Tohidquiz');
const TohidLeaderboard = require('./Tohidleaderboard');
const TohidStart = require('./Tohidstart');
const TohidGroup = require('./Tohidgroup');
const TohidAdmin = require('./Tohidadmin');
const TohidKeyboards = require('../utils/Tohidkeyboard');

class TohidCallbackHandler {
  async handleCallback(ctx) {
    const callbackData = ctx.callbackQuery.data;
    
    try {
      console.log(`📱 Tohid Callback: ${callbackData}`);
      
      // ========== GROUP QUIZ CALLBACKS ==========
      if (callbackData.startsWith('group_category_')) {
        const category = callbackData.replace('group_category_', '');
        await TohidGroup.handleGroupCategory(ctx, category);
      }
      
      else if (callbackData.startsWith('group_answer_')) {
        const parts = callbackData.replace('group_answer_', '').split('_');
        const questionIndex = parseInt(parts[0]);
        const answerIndex = parseInt(parts[1]);
        await TohidGroup.handleGroupAnswer(ctx, questionIndex, answerIndex);
      }
      
      else if (callbackData === 'group_participants') {
        await ctx.answerCbQuery('👥 Check the updated participant count!');
      }
      
      else if (callbackData === 'group_time') {
        await ctx.answerCbQuery('⏰ 30 seconds per question!');
      }
      
      else if (callbackData === 'group_cancel') {
        const chatId = ctx.chat?.id;
        if (chatId && TohidGroup.activeGroupQuizzes.has(chatId)) {
          TohidGroup.activeGroupQuizzes.delete(chatId);
          await ctx.editMessageText('❌ Group quiz cancelled by admin!');
        }
        await ctx.answerCbQuery();
      }
      
      // ========== CHALLENGE CALLBACKS ==========
      else if (callbackData.startsWith('challenge_accept_')) {
        const challengeId = callbackData.replace('challenge_accept_', '');
        await TohidGroup.handleChallengeAccept(ctx, challengeId);
      }
      
      else if (callbackData.startsWith('challenge_decline_')) {
        const challengeId = callbackData.replace('challenge_decline_', '');
        await TohidGroup.handleChallengeDecline(ctx, challengeId);
      }
      
      else if (callbackData.startsWith('challenge_category_')) {
        const parts = callbackData.replace('challenge_category_', '').split('_');
        const challengeId = parts[0];
        const category = parts.slice(1).join('_');
        await TohidGroup.handleChallengeCategory(ctx, challengeId, category);
      }
      
      else if (callbackData.startsWith('challenge_cancel_')) {
        const challengeId = callbackData.replace('challenge_cancel_', '');
        await TohidGroup.handleChallengeDecline(ctx, challengeId);
      }
      
      else if (callbackData.startsWith('challenge_answer_')) {
        const parts = callbackData.replace('challenge_answer_', '').split('_');
        const challengeId = parts[0];
        const questionIndex = parseInt(parts[1]);
        const answerIndex = parseInt(parts[2]);
        const userId = parseInt(parts[3]);
        await TohidGroup.handleChallengeAnswer(ctx, challengeId, questionIndex, answerIndex, userId);
      }
      
      // ========== ADMIN CALLBACKS ==========
      else if (callbackData.startsWith('admin_listusers_')) {
        const page = callbackData.replace('admin_listusers_', '');
        await TohidAdmin.handleAdminCallback(ctx, 'listusers', page);
      }
      
      else if (callbackData.startsWith('broadcast_')) {
        const action = callbackData;
        await TohidAdmin.handleAdminCallback(ctx, action, null);
      }
      
      // ========== EXISTING QUIZ CALLBACKS ==========
      else if (callbackData.startsWith('category_')) {
        const category = callbackData.replace('category_', '');
        await TohidQuiz.handleCategory(ctx, category);
      }
      
      else if (callbackData.startsWith('difficulty_')) {
        const difficulty = callbackData.replace('difficulty_', '');
        await TohidQuiz.handleDifficulty(ctx, difficulty);
      }
      
      else if (callbackData.startsWith('count_')) {
        const count = parseInt(callbackData.replace('count_', ''));
        await TohidQuiz.handleQuestionCount(ctx, count);
      }
      
      else if (callbackData.startsWith('answer_')) {
        const answerIndex = parseInt(callbackData.replace('answer_', ''));
        await TohidQuiz.handleAnswer(ctx, answerIndex);
      }
      
      else if (callbackData === 'next_question') {
        await TohidQuiz.handleNextQuestion(ctx);
      }
      
      else if (callbackData === 'finish_quiz') {
        await TohidQuiz.finishQuiz(ctx, ctx.session.sessionId);
      }
      
      else if (callbackData === 'cancel_quiz') {
        await TohidQuiz.cancelQuiz(ctx);
      }
      
      else if (callbackData === 'score_info') {
        await ctx.answerCbQuery('📊 Current quiz score');
      }
      
      // ========== LEADERBOARD CALLBACKS ==========
      else if (callbackData.startsWith('leaderboard_')) {
        const period = callbackData.replace('leaderboard_', '');
        await TohidLeaderboard.showLeaderboard(ctx, period);
      }
      
      // ========== BACK BUTTONS ==========
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
      
      // ========== PROMOTION ==========
      else if (callbackData === 'promotion_whatsapp') {
        await ctx.answerCbQuery('Opening WhatsApp...');
      }
      else if (callbackData === 'promotion_website') {
        await ctx.answerCbQuery('Opening website...');
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