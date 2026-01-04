const TohidOpenTDB = require('../utils/Tohidopentdb');
const TohidKeyboards = require('../utils/Tohidkeyboard');
const TohidTimer = require('../utils/Tohidtimer');
const { TohidUser, TohidQuizSession } = require('../db/Tohidmongo');
const config = require('../config');

// Active sessions
const activeSessions = new Map();

class TohidQuizHandler {
  async startQuizSelection(ctx) {
    await ctx.reply(
      '📚 *Choose a category for your Tohid AI Quiz:*',
      { 
        parse_mode: 'Markdown',
        ...TohidKeyboards.categories()
      }
    );
  }

  async handleCategory(ctx, category) {
    ctx.session = ctx.session || {};
    ctx.session.quizConfig = ctx.session.quizConfig || {};
    ctx.session.quizConfig.category = category;
    
    await ctx.editMessageText(
      `Selected: *${category}*\n\n🎯 *Choose difficulty level:*`,
      {
        parse_mode: 'Markdown',
        ...TohidKeyboards.difficulties()
      }
    );
  }

  async handleDifficulty(ctx, difficulty) {
    ctx.session.quizConfig.difficulty = difficulty;
    
    await ctx.editMessageText(
      `Category: *${ctx.session.quizConfig.category}*\nDifficulty: *${difficulty}*\n\n📝 *How many questions?*`,
      {
        parse_mode: 'Markdown',
        ...TohidKeyboards.questionCounts()
      }
    );
  }

  async handleQuestionCount(ctx, count) {
    ctx.session.quizConfig.count = count;
    
    await ctx.editMessageText(
      `🎮 *Starting Tohid AI Quiz!*\n\n` +
      `*Category:* ${ctx.session.quizConfig.category}\n` +
      `*Difficulty:* ${ctx.session.quizConfig.difficulty}\n` +
      `*Questions:* ${count}\n\n` +
      `⌛ *Time Limit:* 5 minutes\n` +
      `⏳ *Tohid AI is preparing questions...*`,
      { parse_mode: 'Markdown' }
    );
    
    await this.beginQuiz(ctx);
  }

  async beginQuiz(ctx) {
    const userId = ctx.from.id;
    const { category, difficulty, count } = ctx.session.quizConfig;
    
    try {
      // Get questions
      const questions = await TohidOpenTDB.getQuestions(category, difficulty, count);
      
      if (questions.length === 0) {
        await ctx.reply('❌ No questions available. Please try another category.');
        return;
      }
      
      // Create session
      const sessionId = `${userId}_${Date.now()}`;
      const quizSession = {
        sessionId,
        userId,
        category,
        difficulty,
        totalQuestions: count,
        score: 0,
        correctAnswers: 0,
        currentQuestion: 0,
        questions: questions.map(q => ({
          question: q.question,
          correctAnswer: q.correctAnswer,
          options: TohidOpenTDB.shuffleOptions([q.correctAnswer, ...q.incorrectAnswers]),
          userAnswer: null,
          isCorrect: null,
          pointsEarned: 0
        })),
        startedAt: new Date()
      };
      
      // Store session
      activeSessions.set(sessionId, quizSession);
      
      // Save to database
      const dbSession = new TohidQuizSession({
        sessionId,
        userId,
        category,
        difficulty,
        totalQuestions: count,
        score: 0,
        correctAnswers: 0,
        questions: [],
        startedAt: new Date()
      });
      await dbSession.save();
      
      // Store session ID
      ctx.session.sessionId = sessionId;
      
      // Start timer
      TohidTimer.startTimer(sessionId, config.SETTINGS.MAX_QUIZ_TIME, async () => {
        await this.handleTimeout(ctx, sessionId);
      });
      
      // Send first question
      await this.sendQuestion(ctx, sessionId, 0);
      
    } catch (error) {
      console.error('❌ Tohid Quiz Error:', error);
      await ctx.reply('❌ Error starting quiz. Please try again.');
    }
  }

  async sendQuestion(ctx, sessionId, questionIndex) {
    const session = activeSessions.get(sessionId);
    
    if (!session || questionIndex >= session.questions.length) {
      await ctx.reply('❌ Quiz session not found or completed.');
      return;
    }
    
    const question = session.questions[questionIndex];
    const questionNumber = questionIndex + 1;
    const remainingTime = TohidTimer.getRemainingTime(sessionId);
    
    const questionText = 
      `*Question ${questionNumber}/${session.totalQuestions}*\n` +
      `⏰ Time Left: ${TohidTimer.formatTime(remainingTime)}\n` +
      `⭐ Score: ${session.score}\n\n` +
      `❓ *${question.question}*\n\n` +
      `*Choose your answer:*`;
    
    await ctx.reply(questionText, {
      parse_mode: 'Markdown',
      ...TohidKeyboards.quizAnswers(question.options)
    });
  }

  async handleAnswer(ctx, answerIndex) {
    const sessionId = ctx.session.sessionId;
    
    if (!sessionId || !activeSessions.has(sessionId)) {
      await ctx.answerCbQuery('❌ Session expired. Start new quiz.');
      return;
    }
    
    const session = activeSessions.get(sessionId);
    const currentQIndex = session.currentQuestion;
    const question = session.questions[currentQIndex];
    
    // Record answer
    question.userAnswer = question.options[answerIndex];
    question.isCorrect = question.userAnswer === question.correctAnswer;
    
    // Calculate points
    let points = 0;
    if (question.isCorrect) {
      points = config.SETTINGS.POINTS_PER_CORRECT;
      
      // Streak bonus
      if (currentQIndex > 0 && session.questions[currentQIndex - 1].isCorrect) {
        points += config.SETTINGS.STREAK_BONUS;
      }
      
      session.correctAnswers++;
      
      await ctx.answerCbQuery('✅ Correct!');
    } else {
      await ctx.answerCbQuery(`❌ Wrong! Correct: ${question.correctAnswer}`);
    }
    
    // Update score
    question.pointsEarned = points;
    session.score += points;
    
    // Move to next question
    session.currentQuestion++;
    
    // Update session
    activeSessions.set(sessionId, session);
    
    // Send result
    const resultText = question.isCorrect 
      ? `✅ *Correct!*\n➕ ${points} points`
      : `❌ *Wrong!*\nCorrect answer: *${question.correctAnswer}*`;
    
    await ctx.editMessageText(
      `${resultText}\n\n📊 Your score: *${session.score}*\n` +
      `Correct: ${session.correctAnswers}/${session.totalQuestions}`,
      {
        parse_mode: 'Markdown',
        ...TohidKeyboards.quizNavigation(currentQIndex + 1, session.totalQuestions, session.score)
      }
    );
  }

  async handleNextQuestion(ctx) {
    const sessionId = ctx.session.sessionId;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      await ctx.answerCbQuery('❌ Session expired.');
      return;
    }
    
    if (session.currentQuestion < session.totalQuestions) {
      await this.sendQuestion(ctx, sessionId, session.currentQuestion);
    } else {
      await this.finishQuiz(ctx, sessionId);
    }
  }

  async finishQuiz(ctx, sessionId) {
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      await ctx.reply('❌ Session not found.');
      return;
    }
    
    // Stop timer
    TohidTimer.stopTimer(sessionId);
    
    // Calculate time taken
    const timeTaken = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
    
    // Perfect quiz bonus
    let perfectBonus = 0;
    if (session.correctAnswers === session.totalQuestions) {
      perfectBonus = config.SETTINGS.PERFECT_QUIZ_BONUS;
      session.score += perfectBonus;
    }
    
    // Calculate accuracy
    const accuracy = ((session.correctAnswers / session.totalQuestions) * 100).toFixed(1);
    
    // Update database
    await TohidQuizSession.findOneAndUpdate(
      { sessionId },
      {
        score: session.score,
        correctAnswers: session.correctAnswers,
        timeTaken,
        questions: session.questions,
        completed: true,
        completedAt: new Date()
      }
    );
    
    // Update user stats
    await TohidUser.findOneAndUpdate(
      { userId: session.userId },
      {
        $inc: {
          totalScore: session.score,
          totalQuizzes: 1,
          correctAnswers: session.correctAnswers,
          wrongAnswers: session.totalQuestions - session.correctAnswers,
          quizzesToday: 1
        },
        $addToSet: {
          categoriesPlayed: session.category
        },
        $set: {
          lastPlayed: new Date()
        }
      }
    );
    
    // Check daily streak
    await this.updateDailyStreak(session.userId);
    
    // Results message
    const resultsMessage = 
      `🎉 *Tohid AI Quiz Completed!* 🎉\n\n` +
      `📊 *Your Results:*\n` +
      `🏆 Score: *${session.score}*\n` +
      `✅ Correct: ${session.correctAnswers}/${session.totalQuestions}\n` +
      `🎯 Accuracy: ${accuracy}%\n` +
      `⏱️ Time: ${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s\n\n` +
      `📚 *Category:* ${session.category}\n` +
      `⚡ *Difficulty:* ${session.difficulty}\n` +
      `${perfectBonus > 0 ? `⭐ *Perfect Quiz Bonus:* +${perfectBonus} points\n\n` : '\n'}` +
      `*Thanks for playing with Tohid AI!* 🚀`;
    
    await ctx.replyWithMarkdown(resultsMessage, TohidKeyboards.mainMenu());
    
    // Cleanup
    activeSessions.delete(sessionId);
    delete ctx.session.sessionId;
    delete ctx.session.quizConfig;
  }

  async updateDailyStreak(userId) {
    try {
      const user = await TohidUser.findOne({ userId });
      if (!user) return;
      
      const today = new Date();
      const lastPlayed = user.lastPlayed ? new Date(user.lastPlayed) : null;
      
      if (!lastPlayed) {
        user.dailyStreak = 1;
      } else {
        const diffDays = Math.floor((today - lastPlayed) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          // Same day, maintain streak
        } else if (diffDays === 1) {
          // Consecutive day
          user.dailyStreak += 1;
        } else {
          // Streak broken
          user.dailyStreak = 1;
        }
      }
      
      await user.save();
    } catch (error) {
      console.error('❌ Tohid Streak Update Error:', error);
    }
  }

  async handleTimeout(ctx, sessionId) {
    const session = activeSessions.get(sessionId);
    
    if (!session) return;
    
    await ctx.reply(
      `⏰ *Time's Up!*\n\n` +
      `Quiz ended because time limit was reached.\n` +
      `📊 Your score: *${session.score}*\n` +
      `✅ Correct: ${session.correctAnswers}/${session.totalQuestions}`,
      { parse_mode: 'Markdown', ...TohidKeyboards.mainMenu() }
    );
    
    // Save partial results
    await this.finishQuiz(ctx, sessionId);
  }

  async cancelQuiz(ctx) {
    const sessionId = ctx.session.sessionId;
    
    if (sessionId && activeSessions.has(sessionId)) {
      TohidTimer.stopTimer(sessionId);
      
      // Save cancelled session
      const session = activeSessions.get(sessionId);
      if (session) {
        await TohidQuizSession.findOneAndUpdate(
          { sessionId },
          {
            cancelled: true,
            completedAt: new Date()
          }
        );
      }
      
      activeSessions.delete(sessionId);
    }
    
    delete ctx.session.sessionId;
    delete ctx.session.quizConfig;
    
    await ctx.reply('❌ Quiz cancelled.', TohidKeyboards.mainMenu());
  }
}

module.exports = new TohidQuizHandler();