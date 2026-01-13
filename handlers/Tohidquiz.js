/**
 * Tohid AI Quiz Handler
 * Created by Tohid
 */
const TohidOpenTDB = require('../utils/Tohidopentdb');
const TohidKeyboards = require('../utils/Tohidkeyboard');
const TohidTimer = require('../utils/Tohidtimer');
const { TohidUser, TohidQuizSession } = require('../db/Tohidmongo');
const config = require('../config');

// Active sessions
const activeSessions = new Map();

class TohidQuizHandler {
  async startQuizSelection(ctx) {
    console.log(`🎮 Start quiz requested by ${ctx.from.id} - ${ctx.from.first_name}`);
    await ctx.reply(
      '📚 *Choose a category for your Tohid AI Quiz:*',
      { 
        parse_mode: 'Markdown',
        ...TohidKeyboards.categories()
      }
    );
  }

  async handleCategory(ctx, category) {
    console.log(`📁 Category selected: ${category} by ${ctx.from.first_name}`);
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
    console.log(`⚡ Difficulty selected: ${difficulty}`);
    
    // Convert to lowercase for database schema compatibility
    const dbDifficulty = difficulty.toLowerCase(); // 'Easy' -> 'easy'
    
    ctx.session.quizConfig = ctx.session.quizConfig || {};
    ctx.session.quizConfig.difficulty = dbDifficulty;
    ctx.session.quizConfig.displayDifficulty = difficulty; // Keep original for display
    
    await ctx.editMessageText(
      `Category: *${ctx.session.quizConfig.category}*\nDifficulty: *${difficulty}*\n\n📝 *How many questions?*`,
      {
        parse_mode: 'Markdown',
        ...TohidKeyboards.questionCounts()
      }
    );
  }

  async handleQuestionCount(ctx, count) {
    console.log(`📊 Question count selected: ${count}`);
    ctx.session.quizConfig.count = count;
    
    await ctx.editMessageText(
      `🎮 *Starting Tohid AI Quiz!*\n\n` +
      `*Category:* ${ctx.session.quizConfig.category}\n` +
      `*Difficulty:* ${ctx.session.quizConfig.displayDifficulty}\n` +
      `*Questions:* ${count}\n\n` +
      `⌛ *Time Limit:* 5 minutes\n` +
      `⏳ *Tohid AI is preparing questions...*`,
      { parse_mode: 'Markdown' }
    );
    
    await this.beginQuiz(ctx);
  }

  async beginQuiz(ctx) {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const { category, difficulty, count } = ctx.session.quizConfig;
    
    console.log(`🚀 Starting quiz for ${username}: ${category}, ${difficulty}, ${count} questions`);
    
    try {
      // Check if user exists
      let user = await TohidUser.findOne({ userId });
      if (!user) {
        console.log(`👤 Creating new user: ${username}`);
        user = new TohidUser({
          userId,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name || '',
          referralCode: `TOHID${userId}${Date.now().toString().slice(-4)}`
        });
        await user.save();
      }
      
      // Get display difficulty (original with capital letter)
      const displayDifficulty = ctx.session.quizConfig.displayDifficulty || 'Medium';
      
      // Get questions - pass display difficulty to API
      console.log(`📥 Fetching ${count} questions...`);
      const questions = await TohidOpenTDB.getQuestions(category, displayDifficulty, count);
      
      console.log(`✅ Received ${questions.length} questions`);
      
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
        difficulty: difficulty, // lowercase for DB
        displayDifficulty: displayDifficulty, // original for display
        totalQuestions: count,
        score: 0,
        correctAnswers: 0,
        currentQuestion: 0,
        questions: questions.map((q, index) => ({
          question: q.question,
          correctAnswer: q.correctAnswer,
          options: TohidOpenTDB.shuffleOptions([q.correctAnswer, ...q.incorrectAnswers]),
          userAnswer: null,
          isCorrect: null,
          pointsEarned: 0,
          questionNumber: index + 1,
          difficulty: q.difficulty || difficulty
        })),
        startedAt: new Date(),
        userFirstName: ctx.from.first_name,
        username: ctx.from.username
      };
      
      console.log(`📝 Created session: ${sessionId}, Difficulty (DB): ${difficulty}, Display: ${displayDifficulty}`);
      
      // Store session in memory
      activeSessions.set(sessionId, quizSession);
      
      // Save to database - use lowercase difficulty
      try {
        const dbSession = new TohidQuizSession({
          sessionId,
          userId,
          username: ctx.from.username,
          userFirstName: ctx.from.first_name,
          category,
          difficulty: difficulty, // lowercase for DB schema
          totalQuestions: count,
          score: 0,
          correctAnswers: 0,
          questions: quizSession.questions.map(q => ({
            question: q.question,
            correctAnswer: q.correctAnswer,
            userAnswer: q.userAnswer,
            isCorrect: q.isCorrect,
            options: q.options,
            timeSpent: q.timeSpent,
            pointsEarned: q.pointsEarned,
            questionNumber: q.questionNumber,
            difficulty: q.difficulty
          })),
          startedAt: new Date()
        });
        await dbSession.save();
        console.log(`💾 Saved session to database with difficulty: ${difficulty}`);
      } catch (dbError) {
        console.error('❌ Error saving session to DB:', dbError.message);
        if (dbError.errors) {
          console.error('DB Validation Errors:', Object.keys(dbError.errors));
        }
        // Continue even if DB save fails - user can still play
      }
      
      // Store session ID in user session
      ctx.session.sessionId = sessionId;
      
      // Start timer for quiz
      TohidTimer.startTimer(sessionId, config.SETTINGS.MAX_QUIZ_TIME, async () => {
        console.log(`⏰ Timer expired for session: ${sessionId}`);
        await this.handleTimeout(ctx, sessionId);
      });
      
      console.log(`⏱️ Timer started for ${config.SETTINGS.MAX_QUIZ_TIME} seconds`);
      
      // Send first question
      await this.sendQuestion(ctx, sessionId, 0);
      
    } catch (error) {
      console.error('❌ Tohid Quiz Error in beginQuiz:', error);
      console.error(error.stack);
      
      // More specific error message
      let errorMessage = '❌ Error starting quiz. Please try again.';
      
      if (error.name === 'ValidationError') {
        errorMessage = `❌ Database validation error: ${error.message}\nPlease try selecting a different difficulty or category.`;
      } else if (error.message.includes('Mongo') || error.message.includes('database')) {
        errorMessage = '❌ Database connection issue. Please try again in a moment.';
      } else if (error.message.includes('questions') || error.message.includes('No questions')) {
        errorMessage = '❌ No questions available for this category/difficulty. Please try another combination.';
      }
      
      await ctx.reply(errorMessage);
    }
  }

  async sendQuestion(ctx, sessionId, questionIndex) {
    console.log(`📤 Sending question ${questionIndex + 1} for session ${sessionId}`);
    
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      console.error(`❌ Session not found: ${sessionId}`);
      await ctx.reply('❌ Quiz session not found or expired.');
      return;
    }
    
    if (questionIndex >= session.questions.length) {
      console.error(`❌ Question index out of bounds: ${questionIndex}/${session.questions.length}`);
      await ctx.reply('❌ Quiz session completed or invalid.');
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
    
    console.log(`📝 Question ${questionNumber}: ${question.question.substring(0, 50)}...`);
    console.log(`✅ Options: ${question.options.length}`);
    
    try {
      await ctx.reply(questionText, {
        parse_mode: 'Markdown',
        ...TohidKeyboards.quizAnswers(question.options)
      });
      console.log(`✅ Question sent successfully`);
    } catch (error) {
      console.error('❌ Error sending question:', error.message);
      await ctx.reply('❌ Error displaying question. Please try /start again.');
    }
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
    
    if (!question) {
      await ctx.answerCbQuery('❌ Question not found.');
      return;
    }
    
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
      
      // Time bonus (calculate based on response time)
      const timeTaken = question.timeSpent || 0;
      if (timeTaken > 0 && timeTaken < 10000) { // Less than 10 seconds
        points += config.SETTINGS.TIME_BONUS;
      }
      
      session.correctAnswers++;
      
      await ctx.answerCbQuery(`✅ Correct! +${points} points`);
    } else {
      await ctx.answerCbQuery(`❌ Wrong! Correct: ${question.correctAnswer}`);
    }
    
    // Update score
    question.pointsEarned = points;
    session.score += points;
    
    // Record time spent
    question.timeSpent = question.timeSpent || 5000; // Default 5 seconds
    
    // Move to next question
    session.currentQuestion++;
    
    // Update session in memory
    activeSessions.set(sessionId, session);
    
    // Send result
    const resultText = question.isCorrect 
      ? `✅ *Correct!*\n➕ ${points} points added`
      : `❌ *Wrong!*\nCorrect answer: *${question.correctAnswer}*`;
    
    await ctx.editMessageText(
      `${resultText}\n\n📊 Your score: *${session.score}*\n` +
      `✅ Correct: ${session.correctAnswers}/${session.totalQuestions}`,
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
    
    // Update database session
    try {
      await TohidQuizSession.findOneAndUpdate(
        { sessionId },
        {
          score: session.score,
          correctAnswers: session.correctAnswers,
          wrongAnswers: session.totalQuestions - session.correctAnswers,
          timeTaken,
          questions: session.questions.map(q => ({
            question: q.question,
            correctAnswer: q.correctAnswer,
            userAnswer: q.userAnswer,
            isCorrect: q.isCorrect,
            options: q.options,
            timeSpent: q.timeSpent || 0,
            pointsEarned: q.pointsEarned || 0,
            questionNumber: q.questionNumber,
            difficulty: q.difficulty
          })),
          completed: true,
          completedAt: new Date(),
          perfectQuiz: session.correctAnswers === session.totalQuestions,
          bonusPoints: perfectBonus
        }
      );
      
      console.log(`💾 Updated session in DB: ${sessionId}, Score: ${session.score}`);
    } catch (dbError) {
      console.error('❌ Error updating session in DB:', dbError.message);
    }
    
    // Update user stats
    try {
      await TohidUser.findOneAndUpdate(
        { userId: session.userId },
        {
          $inc: {
            totalScore: session.score,
            totalQuizzes: 1,
            correctAnswers: session.correctAnswers,
            wrongAnswers: session.totalQuestions - session.correctAnswers,
            totalQuestionsAttempted: session.totalQuestions,
            quizzesToday: 1,
            scoreToday: session.score
          },
          $addToSet: {
            categoriesPlayed: session.category
          },
          $set: {
            lastPlayed: new Date(),
            lastActive: new Date()
          }
        },
        { upsert: true, new: true }
      );
      
      // Update category stats
      await this.updateCategoryStats(session.userId, session.category, session.score, session.correctAnswers);
      
      // Update difficulty stats
      await this.updateDifficultyStats(session.userId, session.difficulty, session.score, session.correctAnswers);
      
      console.log(`👤 Updated user stats: ${session.userId}, Total Score: ${session.score}`);
    } catch (userError) {
      console.error('❌ Error updating user stats:', userError.message);
    }
    
    // Check and update daily streak
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
      `⚡ *Difficulty:* ${session.displayDifficulty}\n` +
      `${perfectBonus > 0 ? `⭐ *Perfect Quiz Bonus:* +${perfectBonus} points\n\n` : '\n'}` +
      `*Thanks for playing with Tohid AI!* 🚀`;
    
    await ctx.replyWithMarkdown(resultsMessage, TohidKeyboards.mainMenu());
    
    // Cleanup
    activeSessions.delete(sessionId);
    delete ctx.session.sessionId;
    delete ctx.session.quizConfig;
  }

  async updateCategoryStats(userId, category, score, correctAnswers) {
    try {
      const user = await TohidUser.findOne({ userId });
      if (!user) return;
      
      // Find category in categoriesPlayed array
      const categoryIndex = user.categoriesPlayed.findIndex(c => c.category === category);
      
      if (categoryIndex >= 0) {
        // Update existing category
        user.categoriesPlayed[categoryIndex].playCount += 1;
        user.categoriesPlayed[categoryIndex].totalScore += score;
        user.categoriesPlayed[categoryIndex].correctAnswers += correctAnswers;
      } else {
        // Add new category
        user.categoriesPlayed.push({
          category,
          playCount: 1,
          totalScore: score,
          correctAnswers: correctAnswers
        });
      }
      
      await user.save();
    } catch (error) {
      console.error('Error updating category stats:', error);
    }
  }

  async updateDifficultyStats(userId, difficulty, score, correctAnswers) {
    try {
      const user = await TohidUser.findOne({ userId });
      if (!user) return;
      
      // Ensure difficultyStats exists
      user.difficultyStats = user.difficultyStats || {
        easy: { played: 0, correct: 0, score: 0 },
        medium: { played: 0, correct: 0, score: 0 },
        hard: { played: 0, correct: 0, score: 0 }
      };
      
      // Update stats for the difficulty
      if (user.difficultyStats[difficulty]) {
        user.difficultyStats[difficulty].played += 1;
        user.difficultyStats[difficulty].correct += correctAnswers;
        user.difficultyStats[difficulty].score += score;
      } else {
        // If difficulty doesn't exist, create it
        user.difficultyStats[difficulty] = {
          played: 1,
          correct: correctAnswers,
          score: score
        };
      }
      
      await user.save();
    } catch (error) {
      console.error('Error updating difficulty stats:', error);
    }
  }

  async updateDailyStreak(userId) {
    try {
      const user = await TohidUser.findOne({ userId });
      if (!user) return;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastPlayed = user.lastPlayed ? new Date(user.lastPlayed) : null;
      
      if (!lastPlayed) {
        // First time playing
        user.dailyStreak = 1;
      } else {
        const lastPlayedDate = new Date(lastPlayed);
        lastPlayedDate.setHours(0, 0, 0, 0);
        
        const diffTime = today - lastPlayedDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          // Played today already, maintain streak
          console.log(`📅 User ${userId} already played today, streak maintained`);
        } else if (diffDays === 1) {
          // Consecutive day
          user.dailyStreak += 1;
          console.log(`🔥 User ${userId} extended streak to ${user.dailyStreak} days`);
          
          // Update longest streak if needed
          if (user.dailyStreak > user.longestStreak) {
            user.longestStreak = user.dailyStreak;
          }
        } else {
          // Streak broken
          user.dailyStreak = 1;
          console.log(`💔 User ${userId} streak broken, reset to 1`);
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
    
    // Calculate current score
    const timeTaken = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
    
    await ctx.reply(
      `⏰ *Time's Up!*\n\n` +
      `Quiz ended because time limit was reached.\n` +
      `📊 Your score: *${session.score}*\n` +
      `✅ Correct: ${session.correctAnswers}/${session.totalQuestions}\n` +
      `⏱️ Time taken: ${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s`,
      { parse_mode: 'Markdown', ...TohidKeyboards.mainMenu() }
    );
    
    // Save partial results
    try {
      await TohidQuizSession.findOneAndUpdate(
        { sessionId },
        {
          score: session.score,
          correctAnswers: session.correctAnswers,
          wrongAnswers: session.totalQuestions - session.correctAnswers,
          timeTaken,
          questions: session.questions.slice(0, session.currentQuestion).map(q => ({
            question: q.question,
            correctAnswer: q.correctAnswer,
            userAnswer: q.userAnswer,
            isCorrect: q.isCorrect,
            options: q.options,
            timeSpent: q.timeSpent || 0,
            pointsEarned: q.pointsEarned || 0,
            questionNumber: q.questionNumber,
            difficulty: q.difficulty
          })),
          completed: true,
          completedAt: new Date(),
          timedOut: true
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
            totalQuestionsAttempted: session.currentQuestion
          },
          $set: {
            lastPlayed: new Date()
          }
        }
      );
    } catch (error) {
      console.error('Error saving timeout results:', error);
    }
    
    // Cleanup
    activeSessions.delete(sessionId);
    if (ctx.session) {
      delete ctx.session.sessionId;
      delete ctx.session.quizConfig;
    }
  }

  async cancelQuiz(ctx) {
    const sessionId = ctx.session.sessionId;
    
    if (sessionId && activeSessions.has(sessionId)) {
      TohidTimer.stopTimer(sessionId);
      
      // Save cancelled session
      const session = activeSessions.get(sessionId);
      if (session) {
        try {
          await TohidQuizSession.findOneAndUpdate(
            { sessionId },
            {
              cancelled: true,
              completedAt: new Date(),
              score: session.score,
              correctAnswers: session.correctAnswers,
              questions: session.questions.slice(0, session.currentQuestion).map(q => ({
                question: q.question,
                correctAnswer: q.correctAnswer,
                userAnswer: q.userAnswer,
                isCorrect: q.isCorrect,
                options: q.options,
                timeSpent: q.timeSpent,
                pointsEarned: q.pointsEarned,
                questionNumber: q.questionNumber,
                difficulty: q.difficulty
              }))
            }
          );
        } catch (error) {
          console.error('Error saving cancelled session:', error);
        }
      }
      
      activeSessions.delete(sessionId);
    }
    
    if (ctx.session) {
      delete ctx.session.sessionId;
      delete ctx.session.quizConfig;
    }
    
    await ctx.reply('❌ Quiz cancelled.', TohidKeyboards.mainMenu());
  }

  // Helper method to get quiz statistics
  async getQuizStats(userId) {
    try {
      const stats = await TohidQuizSession.aggregate([
        { $match: { userId, completed: true } },
        {
          $group: {
            _id: null,
            totalQuizzes: { $sum: 1 },
            totalScore: { $sum: '$score' },
            totalCorrect: { $sum: '$correctAnswers' },
            totalQuestions: { $sum: '$totalQuestions' },
            avgScore: { $avg: '$score' },
            avgAccuracy: { 
              $avg: { 
                $multiply: [
                  { $divide: ['$correctAnswers', '$totalQuestions'] },
                  100
                ]
              }
            }
          }
        }
      ]);
      
      return stats[0] || {
        totalQuizzes: 0,
        totalScore: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        avgScore: 0,
        avgAccuracy: 0
      };
    } catch (error) {
      console.error('Error getting quiz stats:', error);
      return null;
    }
  }

  // Method to resume interrupted quiz (optional feature)
  async resumeQuiz(ctx, sessionId) {
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      // Try to load from database
      const dbSession = await TohidQuizSession.findOne({ 
        sessionId, 
        completed: false,
        cancelled: false 
      });
      
      if (!dbSession) {
        await ctx.reply('❌ No active quiz found to resume.');
        return;
      }
      
      // Recreate session in memory
      const restoredSession = {
        sessionId: dbSession.sessionId,
        userId: dbSession.userId,
        category: dbSession.category,
        difficulty: dbSession.difficulty,
        displayDifficulty: dbSession.difficulty.charAt(0).toUpperCase() + dbSession.difficulty.slice(1),
        totalQuestions: dbSession.totalQuestions,
        score: dbSession.score || 0,
        correctAnswers: dbSession.correctAnswers || 0,
        currentQuestion: dbSession.questions?.length || 0,
        questions: dbSession.questions || [],
        startedAt: dbSession.startedAt,
        userFirstName: dbSession.userFirstName,
        username: dbSession.username
      };
      
      activeSessions.set(sessionId, restoredSession);
      ctx.session.sessionId = sessionId;
      
      // Restart timer
      const timeElapsed = Math.floor((Date.now() - new Date(dbSession.startedAt).getTime()) / 1000);
      const timeRemaining = Math.max(0, config.SETTINGS.MAX_QUIZ_TIME - timeElapsed);
      
      TohidTimer.startTimer(sessionId, timeRemaining, async () => {
        await this.handleTimeout(ctx, sessionId);
      });
      
      await ctx.reply(
        `🔄 *Quiz Resumed!*\n\n` +
        `Continuing from question ${restoredSession.currentQuestion + 1}/${restoredSession.totalQuestions}\n` +
        `Current score: ${restoredSession.score}`,
        { parse_mode: 'Markdown' }
      );
      
      await this.sendQuestion(ctx, sessionId, restoredSession.currentQuestion);
    } else {
      // Session already in memory
      await ctx.reply(
        `📊 *Active Quiz Found*\n\n` +
        `Question: ${session.currentQuestion + 1}/${session.totalQuestions}\n` +
        `Score: ${session.score}`,
        { parse_mode: 'Markdown' }
      );
      
      await this.sendQuestion(ctx, sessionId, session.currentQuestion);
    }
  }
}

module.exports = new TohidQuizHandler();