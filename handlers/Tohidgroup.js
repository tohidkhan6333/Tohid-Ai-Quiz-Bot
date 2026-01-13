/**
 * Tohid AI Group Quiz Handler
 * Created by Tohid
 */
const config = require('../config');
const TohidOpenTDB = require('../utils/Tohidopentdb');
const TohidKeyboards = require('../utils/Tohidkeyboard');
const { TohidUser, TohidQuizSession } = require('../db/Tohidmongo');

class TohidGroupHandler {
  constructor() {
    this.activeGroupQuizzes = new Map(); // chatId -> group quiz data
    this.groupChallenges = new Map(); // challengeId -> challenge data
    this.groupAnswers = new Map(); // sessionId -> Map(userId -> answer)
    this.groupTimers = new Map(); // timerId -> timeout
    this.dailyChallengeCount = new Map(); // userId -> count
  }

  // ========== GROUP QUIZ MODE ==========

  async startGroupQuiz(ctx) {
    // Check if in group
    if (!ctx.chat || ctx.chat.type === 'private') {
      return ctx.reply('❌ This command only works in groups!\nAdd me to a group and use /groupquiz');
    }

    // Check admin permissions
    if (!await this.isGroupAdmin(ctx)) {
      return ctx.reply('❌ Only group admins can start group quizzes!');
    }

    const chatId = ctx.chat.id;
    
    // Check if group is allowed
    if (!this.isGroupAllowed(chatId)) {
      return ctx.reply('❌ This group is not authorized to use the bot!');
    }

    // Check if quiz is already active
    if (this.activeGroupQuizzes.has(chatId)) {
      return ctx.reply('❌ A group quiz is already in progress!\nUse /stopgroupquiz to stop it.');
    }

    // Get group members count
    try {
      const chatMembers = await ctx.telegram.getChatMembersCount(chatId);
      if (chatMembers < config.GROUP_SETTINGS.MIN_GROUP_SIZE) {
        return ctx.reply(`❌ Need at least ${config.GROUP_SETTINGS.MIN_GROUP_SIZE} members to start group quiz!`);
      }
    } catch (error) {
      console.error('Error getting chat members:', error);
    }

    // Create group quiz session
    const quizId = `group_${chatId}_${Date.now()}`;
    const groupQuiz = {
      quizId,
      chatId,
      chatTitle: ctx.chat.title,
      adminId: ctx.from.id,
      adminName: ctx.from.first_name,
      status: 'selecting_category',
      participants: new Map(), // userId -> userData
      scores: new Map(), // userId -> score
      questionNumber: 0,
      totalQuestions: 5,
      category: null,
      difficulty: 'Medium',
      questions: [],
      startTime: null,
      currentQuestionStart: null,
      messageId: null,
      questionMessageId: null,
      leaderboardMessageId: null
    };

    this.activeGroupQuizzes.set(chatId, groupQuiz);
    this.groupAnswers.set(quizId, new Map());

    // Send category selection
    const categoryKeyboard = this.getGroupCategoryKeyboard();
    
    const message = await ctx.reply(
      '🎮 *GROUP QUIZ STARTING!*\n' +
      `👑 Started by: *${ctx.from.first_name}*\n\n` +
      '👥 *Same question for everyone!*\n' +
      '⏱️ *30 seconds per question*\n' +
      '🏆 *Live ranking after each question*\n' +
      '💰 *Group Rewards: 1.5x Points*\n\n' +
      '📚 *Choose a category:*',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: categoryKeyboard
        }
      }
    );

    groupQuiz.messageId = message.message_id;
  }

  async handleGroupCategory(ctx, category) {
    const chatId = ctx.chat.id;
    const groupQuiz = this.activeGroupQuizzes.get(chatId);

    if (!groupQuiz || groupQuiz.status !== 'selecting_category') {
      return ctx.answerCbQuery('❌ No active group quiz or invalid state.');
    }

    // Check if user is admin who started quiz
    if (groupQuiz.adminId !== ctx.from.id) {
      return ctx.answerCbQuery('❌ Only the quiz starter can select category!');
    }

    groupQuiz.category = category;
    groupQuiz.status = 'starting';

    // Get questions
    try {
      const questions = await TohidOpenTDB.getQuestions(category, groupQuiz.difficulty, groupQuiz.totalQuestions);
      
      if (questions.length === 0) {
        await ctx.editMessageText('❌ No questions available for this category. Please try another.');
        this.activeGroupQuizzes.delete(chatId);
        return;
      }

      groupQuiz.questions = questions.map(q => ({
        question: q.question,
        correctAnswer: q.correctAnswer,
        options: TohidOpenTDB.shuffleOptions([q.correctAnswer, ...q.incorrectAnswers]),
        answeredBy: new Set(),
        answers: new Map() // userId -> {username, answer, isCorrect, time}
      }));

      await ctx.editMessageText(
        `✅ *Category Selected: ${category}*\n\n` +
        `🎮 *Group Quiz Starting Now!*\n` +
        `📚 Category: *${category}*\n` +
        `⚡ Difficulty: *${groupQuiz.difficulty}*\n` +
        `❓ Questions: *${groupQuiz.totalQuestions}*\n` +
        `⏱️ Time per question: *30 seconds*\n\n` +
        `*Get ready... The first question is coming in 3 seconds!*`,
        { parse_mode: 'Markdown' }
      );

      // Start first question after delay
      setTimeout(() => {
        this.sendGroupQuestion(ctx, chatId, 0);
      }, 3000);

    } catch (error) {
      console.error('Group quiz error:', error);
      await ctx.editMessageText('❌ Error starting group quiz. Please try again.');
      this.activeGroupQuizzes.delete(chatId);
    }
  }

  async sendGroupQuestion(ctx, chatId, questionIndex) {
    const groupQuiz = this.activeGroupQuizzes.get(chatId);
    if (!groupQuiz || questionIndex >= groupQuiz.questions.length) return;

    const question = groupQuiz.questions[questionIndex];
    groupQuiz.questionNumber = questionIndex + 1;
    groupQuiz.currentQuestionStart = Date.now();

    // Format question text
    const questionText = 
      `🎮 *GROUP QUIZ - Question ${groupQuiz.questionNumber}/${groupQuiz.totalQuestions}*\n\n` +
      `📚 Category: ${groupQuiz.category}\n` +
      `⚡ Difficulty: ${groupQuiz.difficulty}\n` +
      `⏱️ Time: 30 seconds\n\n` +
      `❓ *${question.question}*\n\n` +
      `*Choose your answer:*`;

    // Create answer buttons (2 per row)
    const answerButtons = [];
    for (let i = 0; i < question.options.length; i += 2) {
      const row = [];
      row.push({ 
        text: `A) ${question.options[i]}`, 
        callback_data: `group_answer_${questionIndex}_0` 
      });
      if (question.options[i + 1]) {
        row.push({ 
          text: `B) ${question.options[i + 1]}`, 
          callback_data: `group_answer_${questionIndex}_1` 
        });
      }
      answerButtons.push(row);
    }

    // Add participant count
    const participantsCount = groupQuiz.participants.size;
    answerButtons.push([
      { text: `👥 Participants: ${participantsCount}`, callback_data: 'group_participants' },
      { text: '⏰ Time: 30s', callback_data: 'group_time' }
    ]);

    try {
      const message = await ctx.telegram.sendMessage(
        chatId,
        questionText,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: answerButtons
          }
        }
      );

      // Store message ID for editing
      if (groupQuiz.questionMessageId) {
        try {
          await ctx.telegram.deleteMessage(chatId, groupQuiz.questionMessageId);
        } catch (e) {}
      }
      groupQuiz.questionMessageId = message.message_id;

      // Start timer for this question
      this.startGroupQuestionTimer(ctx, chatId, questionIndex);

    } catch (error) {
      console.error('Error sending group question:', error);
    }
  }

  async handleGroupAnswer(ctx, questionIndex, answerIndex) {
    const chatId = ctx.chat.id;
    const groupQuiz = this.activeGroupQuizzes.get(chatId);
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;

    if (!groupQuiz) {
      return ctx.answerCbQuery('❌ No active group quiz!');
    }

    const question = groupQuiz.questions[questionIndex];
    
    // Check if already answered
    if (question.answeredBy.has(userId)) {
      return ctx.answerCbQuery('⚠️ You already answered this question!');
    }

    // Record answer
    const userAnswer = question.options[answerIndex];
    const isCorrect = userAnswer === question.correctAnswer;
    const answerTime = Date.now() - groupQuiz.currentQuestionStart;
    
    question.answeredBy.add(userId);
    question.answers.set(userId, {
      username,
      answer: userAnswer,
      isCorrect,
      time: answerTime
    });

    // Add to participants if not already
    if (!groupQuiz.participants.has(userId)) {
      groupQuiz.participants.set(userId, {
        username,
        firstName: ctx.from.first_name,
        totalScore: 0,
        correctAnswers: 0,
        responseTimes: []
      });
    }

    // Update scores with group multiplier
    let userData = groupQuiz.participants.get(userId);
    if (isCorrect) {
      // Base points with group multiplier
      let points = config.SETTINGS.POINTS_PER_CORRECT * config.GROUP_SETTINGS.GROUP_REWARD_MULTIPLIER;
      
      // Time bonus (faster = more points)
      const timeBonus = Math.max(1, Math.floor((30000 - answerTime) / 2000));
      points += timeBonus;
      
      userData.totalScore += Math.round(points);
      userData.correctAnswers++;
      userData.responseTimes.push(answerTime);
      
      // Update group scores map
      groupQuiz.scores.set(userId, userData.totalScore);
      
      await ctx.answerCbQuery(`✅ Correct! +${Math.round(points)} points`);
    } else {
      await ctx.answerCbQuery(`❌ Wrong!`);
    }

    // Update participant count in message
    this.updateParticipantCount(ctx, chatId);
  }

  async updateParticipantCount(ctx, chatId) {
    const groupQuiz = this.activeGroupQuizzes.get(chatId);
    if (!groupQuiz || !groupQuiz.questionMessageId) return;

    const participantsCount = groupQuiz.participants.size;
    const questionIndex = groupQuiz.questionNumber - 1;
    const question = groupQuiz.questions[questionIndex];
    
    try {
      await ctx.telegram.editMessageReplyMarkup(
        chatId,
        groupQuiz.questionMessageId,
        null,
        {
          inline_keyboard: [
            ...question.options.map((option, index) => [
              { 
                text: `${String.fromCharCode(65 + index)}) ${option}`, 
                callback_data: `group_answer_${questionIndex}_${index}` 
              }
            ]),
            [
              { text: `👥 Participants: ${participantsCount}`, callback_data: 'group_participants' },
              { text: '⏰ Time: 30s', callback_data: 'group_time' }
            ]
          ]
        }
      );
    } catch (error) {
      // Message might be too old to edit
    }
  }

  startGroupQuestionTimer(ctx, chatId, questionIndex) {
    const timerId = setTimeout(async () => {
      await this.endGroupQuestion(ctx, chatId, questionIndex);
    }, config.GROUP_SETTINGS.GROUP_QUIZ_TIMEOUT * 1000);

    this.groupTimers.set(`${chatId}_${questionIndex}`, timerId);
  }

  async endGroupQuestion(ctx, chatId, questionIndex) {
    const groupQuiz = this.activeGroupQuizzes.get(chatId);
    if (!groupQuiz) return;

    const question = groupQuiz.questions[questionIndex];
    
    // Show results for this question
    const correctCount = Array.from(question.answers.values()).filter(a => a.isCorrect).length;
    const totalAnswers = question.answeredBy.size;
    
    let resultsText = 
      `⏰ *TIME'S UP!*\n\n` +
      `✅ *Correct Answer:* ${question.correctAnswer}\n` +
      `📊 *Results:* ${correctCount}/${totalAnswers} got it right\n\n`;

    // Show top 3 fastest correct answers
    const correctAnswers = Array.from(question.answers.values())
      .filter(a => a.isCorrect)
      .sort((a, b) => a.time - b.time)
      .slice(0, 3);

    if (correctAnswers.length > 0) {
      resultsText += `⚡ *Fastest Correct Answers:*\n`;
      correctAnswers.forEach((answer, index) => {
        const timeSec = (answer.time / 1000).toFixed(1);
        const emoji = index === 0 ? '🚀' : index === 1 ? '⚡' : '🏃';
        resultsText += `${emoji} ${answer.username} - ${timeSec}s\n`;
      });
      resultsText += '\n';
    }

    // Send results
    const resultsMessage = await ctx.reply(resultsText, { parse_mode: 'Markdown' });

    // Show current leaderboard
    await this.showGroupLeaderboard(ctx, chatId, false);

    // Move to next question or end quiz
    if (questionIndex < groupQuiz.questions.length - 1) {
      setTimeout(() => {
        this.sendGroupQuestion(ctx, chatId, questionIndex + 1);
      }, 5000);
    } else {
      setTimeout(() => {
        this.endGroupQuiz(ctx, chatId);
      }, 5000);
    }

    // Delete results message after delay
    setTimeout(() => {
      try {
        ctx.telegram.deleteMessage(chatId, resultsMessage.message_id);
      } catch (e) {}
    }, 4000);
  }

  async showGroupLeaderboard(ctx, chatId, isFinal = false) {
    const groupQuiz = this.activeGroupQuizzes.get(chatId);
    if (!groupQuiz) return;

    // Convert participants map to array and sort by score
    const sortedParticipants = Array.from(groupQuiz.participants.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);

    let leaderboardText = isFinal 
      ? '🏆 *FINAL GROUP QUIZ RESULTS* 🏆\n\n'
      : '📊 *CURRENT STANDINGS*\n\n';

    if (sortedParticipants.length === 0) {
      leaderboardText += 'No participants yet!\n';
    } else {
      // Emojis for positions
      const positionEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      
      sortedParticipants.forEach((participant, index) => {
        const emoji = positionEmojis[index] || `${index + 1}.`;
        const accuracy = participant.correctAnswers > 0 
          ? `${Math.round((participant.correctAnswers / groupQuiz.questionNumber) * 100)}%`
          : '0%';
        
        leaderboardText += 
          `${emoji} *${participant.username}*\n` +
          `   ⭐ Score: ${Math.round(participant.totalScore)}\n` +
          `   ✅ Correct: ${participant.correctAnswers}/${groupQuiz.questionNumber}\n` +
          `   🎯 Accuracy: ${accuracy}\n\n`;
      });

      // Add participant count
      leaderboardText += `👥 Total Participants: ${groupQuiz.participants.size}\n`;
    }

    // Send or update leaderboard message
    if (groupQuiz.leaderboardMessageId && !isFinal) {
      try {
        await ctx.telegram.editMessageText(
          chatId,
          groupQuiz.leaderboardMessageId,
          null,
          leaderboardText,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        const message = await ctx.reply(leaderboardText, { parse_mode: 'Markdown' });
        groupQuiz.leaderboardMessageId = message.message_id;
      }
    } else {
      const message = await ctx.reply(leaderboardText, { parse_mode: 'Markdown' });
      groupQuiz.leaderboardMessageId = message.message_id;
    }
  }

  async endGroupQuiz(ctx, chatId) {
    const groupQuiz = this.activeGroupQuizzes.get(chatId);
    if (!groupQuiz) return;

    // Show final results
    await this.showGroupLeaderboard(ctx, chatId, true);

    // Award bonus points to top 3
    const sortedParticipants = Array.from(groupQuiz.participants.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3);

    const bonuses = [100, 60, 40];
    
    if (sortedParticipants.length > 0) {
      let bonusText = '🎁 *BONUS REWARDS* 🎁\n\n';
      const winnerEmojis = ['🏆', '🥈', '🥉'];
      
      for (let i = 0; i < Math.min(sortedParticipants.length, 3); i++) {
        const participant = sortedParticipants[i];
        const bonus = bonuses[i];
        const totalScore = Math.round(participant.totalScore + bonus);
        
        bonusText += 
          `${winnerEmojis[i]} *${participant.username}*\n` +
          `   🎖️ Position: ${i + 1}\n` +
          `   💰 Bonus: +${bonus} points\n` +
          `   🏅 Total: ${totalScore} points\n\n`;
        
        // Update user's total score in database
        try {
          await TohidUser.findOneAndUpdate(
            { userId: this.getUserIdByUsername(groupQuiz, participant.username) },
            { $inc: { 
              totalScore: Math.round(participant.totalScore + bonus),
              totalQuizzes: 1,
              correctAnswers: participant.correctAnswers 
            } },
            { upsert: true, new: true }
          );
        } catch (error) {
          console.error('Error updating user score:', error);
        }
      }
      
      await ctx.reply(bonusText, { parse_mode: 'Markdown' });
    }

    // Save group quiz session to database
    try {
      const dbSession = new TohidQuizSession({
        sessionId: groupQuiz.quizId,
        userId: groupQuiz.adminId,
        chatId: groupQuiz.chatId,
        chatTitle: groupQuiz.chatTitle,
        category: groupQuiz.category,
        difficulty: groupQuiz.difficulty,
        totalQuestions: groupQuiz.totalQuestions,
        score: Array.from(groupQuiz.participants.values())
          .reduce((sum, p) => sum + p.totalScore, 0),
        correctAnswers: Array.from(groupQuiz.participants.values())
          .reduce((sum, p) => sum + p.correctAnswers, 0),
        participantsCount: groupQuiz.participants.size,
        isGroupQuiz: true,
        completed: true,
        completedAt: new Date()
      });
      await dbSession.save();
    } catch (error) {
      console.error('Error saving group quiz session:', error);
    }

    // Cleanup
    this.activeGroupQuizzes.delete(chatId);
    this.groupAnswers.delete(groupQuiz.quizId);
    
    // Clear any remaining timers
    for (let i = 0; i < groupQuiz.totalQuestions; i++) {
      const timerKey = `${chatId}_${i}`;
      if (this.groupTimers.has(timerKey)) {
        clearTimeout(this.groupTimers.get(timerKey));
        this.groupTimers.delete(timerKey);
      }
    }

    await ctx.reply(
      '🎉 *Group Quiz Ended!*\n\n' +
      'Thanks for participating! 🚀\n' +
      'Use /groupquiz to start another group quiz!\n\n' +
      '🔥 Try /challenge to challenge a friend!',
      { parse_mode: 'Markdown' }
    );
  }

  // ========== GROUP CHALLENGE ==========

  async startChallenge(ctx) {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    
    // Check daily challenge limit
    const today = new Date().toDateString();
    const userKey = `${userId}_${today}`;
    const userCount = this.dailyChallengeCount.get(userKey) || 0;
    
    if (userCount >= config.GROUP_SETTINGS.MAX_CHALLENGES_PER_DAY) {
      return ctx.reply(
        `❌ You've reached your daily challenge limit (${config.GROUP_SETTINGS.MAX_CHALLENGES_PER_DAY}).\n` +
        'Try again tomorrow!'
      );
    }

    // Check if user mentioned someone
    const replyToMessage = ctx.message.reply_to_message;
    let opponentId = null;
    let opponentName = null;

    if (replyToMessage) {
      opponentId = replyToMessage.from.id;
      opponentName = replyToMessage.from.first_name;
    } else if (ctx.message.text.includes('@')) {
      // Extract username from message
      const mentionMatch = ctx.message.text.match(/@(\w+)/);
      if (mentionMatch) {
        // In real implementation, you'd need to get user ID from username
        // For now, we'll use placeholder
        opponentId = 'mentioned_user';
        opponentName = mentionMatch[1];
      }
    }

    if (!opponentId) {
      return ctx.reply(
        '🎯 *Start a Challenge*\n\n' +
        'To challenge someone:\n' +
        '1. Reply to their message with /challenge\n' +
        '2. Or type /challenge @username\n\n' +
        'Example: /challenge @Tohidkhan6332',
        { parse_mode: 'Markdown' }
      );
    }

    // Check if challenging self
    if (opponentId === userId) {
      return ctx.reply('❌ You cannot challenge yourself!');
    }

    // Create challenge
    const challengeId = `challenge_${userId}_${opponentId}_${Date.now()}`;
    const challenge = {
      challengeId,
      challengerId: userId,
      challengerName: username,
      opponentId,
      opponentName,
      status: 'pending',
      category: null,
      difficulty: 'Medium',
      questions: 5,
      questionsData: [],
      challengerScore: 0,
      opponentScore: 0,
      challengerAnswers: [],
      opponentAnswers: [],
      startTime: null,
      endTime: null,
      chatId: ctx.chat?.id,
      messageId: null
    };

    this.groupChallenges.set(challengeId, challenge);
    this.dailyChallengeCount.set(userKey, userCount + 1);

    // Send challenge request
    const message = await ctx.reply(
      `⚔️ *CHALLENGE REQUEST!*\n\n` +
      `👑 Challenger: *${username}*\n` +
      `🎯 Challenged: *${opponentName}*\n\n` +
      `🏆 *Best of 5 questions*\n` +
      `⏱️ *24 hours to accept*\n\n` +
      `Will you accept the challenge?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Accept Challenge', callback_data: `challenge_accept_${challengeId}` },
              { text: '❌ Decline', callback_data: `challenge_decline_${challengeId}` }
            ]
          ]
        }
      }
    );

    challenge.messageId = message.message_id;

    // Auto-decline after 24 hours
    setTimeout(() => {
      if (this.groupChallenges.has(challengeId)) {
        const expiredChallenge = this.groupChallenges.get(challengeId);
        if (expiredChallenge.status === 'pending') {
          ctx.telegram.editMessageText(
            ctx.chat?.id,
            expiredChallenge.messageId,
            null,
            `⏰ *CHALLENGE EXPIRED*\n\n` +
            `Challenge from *${expiredChallenge.challengerName}* to *${expiredChallenge.opponentName}* has expired.\n` +
            `(24 hours passed without acceptance)`,
            { parse_mode: 'Markdown' }
          );
          this.groupChallenges.delete(challengeId);
        }
      }
    }, config.GROUP_SETTINGS.GROUP_CHALLENGE_DURATION);
  }

  async handleChallengeAccept(ctx, challengeId) {
    const challenge = this.groupChallenges.get(challengeId);
    if (!challenge) {
      return ctx.answerCbQuery('❌ Challenge not found or expired!');
    }

    // Check if user is the opponent
    if (ctx.from.id !== challenge.opponentId && ctx.from.id !== 'mentioned_user') {
      return ctx.answerCbQuery('❌ This challenge is not for you!');
    }

    challenge.status = 'accepted';
    challenge.acceptedTime = new Date();

    // Send category selection
    const categoryKeyboard = this.getChallengeCategoryKeyboard(challengeId);
    
    await ctx.editMessageText(
      `🎉 *CHALLENGE ACCEPTED!*\n\n` +
      `⚔️ ${challenge.challengerName} vs ${challenge.opponentName}\n\n` +
      `🏆 Best of 5 questions\n` +
      `💰 Winner gets 100 bonus points!\n\n` +
      `📚 *Choose a category:*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: categoryKeyboard
        }
      }
    );

    await ctx.answerCbQuery('✅ Challenge accepted!');
  }

  async handleChallengeDecline(ctx, challengeId) {
    const challenge = this.groupChallenges.get(challengeId);
    if (!challenge) {
      return ctx.answerCbQuery('❌ Challenge not found!');
    }

    await ctx.editMessageText(
      `❌ *CHALLENGE DECLINED*\n\n` +
      `${challenge.opponentName} declined the challenge from ${challenge.challengerName}.`,
      { parse_mode: 'Markdown' }
    );

    this.groupChallenges.delete(challengeId);
    await ctx.answerCbQuery('Challenge declined');
  }

  async handleChallengeCategory(ctx, challengeId, category) {
    const challenge = this.groupChallenges.get(challengeId);
    if (!challenge) {
      return ctx.answerCbQuery('❌ Challenge not found!');
    }

    challenge.category = category;
    
    // Get questions for challenge
    try {
      const questions = await TohidOpenTDB.getQuestions(category, challenge.difficulty, challenge.questions);
      
      if (questions.length === 0) {
        await ctx.editMessageText('❌ No questions available. Challenge cancelled.');
        this.groupChallenges.delete(challengeId);
        return;
      }

      challenge.questionsData = questions.map(q => ({
        question: q.question,
        correctAnswer: q.correctAnswer,
        options: TohidOpenTDB.shuffleOptions([q.correctAnswer, ...q.incorrectAnswers]),
        questionNumber: 0
      }));

      // Send first question to challenger privately
      await this.sendChallengeQuestion(ctx, challenge, 0, challenge.challengerId);
      
      // Send first question to opponent privately
      await this.sendChallengeQuestion(ctx, challenge, 0, challenge.opponentId);

      // Update challenge message
      await ctx.editMessageText(
        `🎮 *CHALLENGE STARTED!*\n\n` +
        `⚔️ ${challenge.challengerName} vs ${challenge.opponentName}\n` +
        `📚 Category: ${category}\n` +
        `❓ Questions: ${challenge.questions}\n\n` +
        `📨 Questions have been sent privately to both players!\n` +
        `⏱️ 30 seconds per question\n\n` +
        `🏆 *May the best win!*`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('Challenge error:', error);
      await ctx.editMessageText('❌ Error starting challenge. Please try again.');
      this.groupChallenges.delete(challengeId);
    }
  }

  async sendChallengeQuestion(ctx, challenge, questionIndex, userId) {
    if (questionIndex >= challenge.questionsData.length) return;

    const question = challenge.questionsData[questionIndex];
    question.questionNumber = questionIndex + 1;

    const questionText = 
      `⚔️ *CHALLENGE - Question ${question.questionNumber}/${challenge.questions}*\n\n` +
      `📚 Category: ${challenge.category}\n` +
      `⏱️ Time: 30 seconds\n\n` +
      `❓ *${question.question}*\n\n` +
      `*Choose your answer:*`;

    // Create answer buttons
    const answerButtons = question.options.map((option, index) => [
      { text: `${String.fromCharCode(65 + index)}) ${option}`, callback_data: `challenge_answer_${challenge.challengeId}_${questionIndex}_${index}_${userId}` }
    ]);

    try {
      await ctx.telegram.sendMessage(
        userId,
        questionText,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: answerButtons
          }
        }
      );

      // Start timer for this question
      setTimeout(() => {
        this.endChallengeQuestion(ctx, challenge, questionIndex, userId);
      }, 30000);

    } catch (error) {
      console.error('Error sending challenge question:', error);
      // If user has blocked bot, mark as forfeit
      if (error.response && error.response.error_code === 403) {
        if (userId === challenge.challengerId) {
          challenge.challengerScore = 0;
          challenge.opponentScore = challenge.questions;
        } else {
          challenge.opponentScore = 0;
          challenge.challengerScore = challenge.questions;
        }
        this.endChallenge(ctx, challenge);
      }
    }
  }

  async handleChallengeAnswer(ctx, challengeId, questionIndex, answerIndex, userId) {
    const challenge = this.groupChallenges.get(challengeId);
    if (!challenge) {
      return ctx.answerCbQuery('❌ Challenge not found!');
    }

    const question = challenge.questionsData[questionIndex];
    const userAnswer = question.options[answerIndex];
    const isCorrect = userAnswer === question.correctAnswer;

    // Record answer
    if (userId === challenge.challengerId) {
      challenge.challengerAnswers[questionIndex] = {
        answer: userAnswer,
        isCorrect,
        time: new Date()
      };
      if (isCorrect) challenge.challengerScore++;
    } else {
      challenge.opponentAnswers[questionIndex] = {
        answer: userAnswer,
        isCorrect,
        time: new Date()
      };
      if (isCorrect) challenge.opponentScore++;
    }

    // Send next question or end challenge
    if (questionIndex < challenge.questionsData.length - 1) {
      await this.sendChallengeQuestion(ctx, challenge, questionIndex + 1, userId);
      await ctx.answerCbQuery(isCorrect ? '✅ Correct!' : '❌ Wrong!');
    } else {
      // All questions answered by this user
      await ctx.answerCbQuery(isCorrect ? '✅ Correct! Last question.' : '❌ Wrong! Last question.');
      
      // Check if both players have answered all questions
      if (challenge.challengerAnswers.length === challenge.questions && 
          challenge.opponentAnswers.length === challenge.questions) {
        await this.endChallenge(ctx, challenge);
      }
    }
  }

  async endChallengeQuestion(ctx, challenge, questionIndex, userId) {
    // Mark question as unanswered (timeout)
    if (userId === challenge.challengerId && !challenge.challengerAnswers[questionIndex]) {
      challenge.challengerAnswers[questionIndex] = {
        answer: null,
        isCorrect: false,
        time: new Date(),
        timeout: true
      };
    } else if (userId === challenge.opponentId && !challenge.opponentAnswers[questionIndex]) {
      challenge.opponentAnswers[questionIndex] = {
        answer: null,
        isCorrect: false,
        time: new Date(),
        timeout: true
      };
    }

    // Send timeout message
    try {
      await ctx.telegram.sendMessage(
        userId,
        `⏰ *TIME'S UP!*\n\n` +
        `Question ${questionIndex + 1} timed out.\n` +
        `Correct answer was: ${challenge.questionsData[questionIndex].correctAnswer}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error sending timeout message:', error);
    }

    // Send next question if available
    if (questionIndex < challenge.questionsData.length - 1) {
      await this.sendChallengeQuestion(ctx, challenge, questionIndex + 1, userId);
    } else {
      // Check if challenge should end
      if (challenge.challengerAnswers.length === challenge.questions && 
          challenge.opponentAnswers.length === challenge.questions) {
        await this.endChallenge(ctx, challenge);
      }
    }
  }

  async endChallenge(ctx, challenge) {
    // Determine winner
    let winner = null;
    let winnerName = null;
    let loserName = null;
    
    if (challenge.challengerScore > challenge.opponentScore) {
      winner = 'challenger';
      winnerName = challenge.challengerName;
      loserName = challenge.opponentName;
    } else if (challenge.opponentScore > challenge.challengerScore) {
      winner = 'opponent';
      winnerName = challenge.opponentName;
      loserName = challenge.challengerName;
    } else {
      // Tie
      winner = 'tie';
    }

    // Calculate stats
    const challengerAccuracy = challenge.challengerScore > 0 
      ? Math.round((challenge.challengerScore / challenge.questions) * 100)
      : 0;
    
    const opponentAccuracy = challenge.opponentScore > 0
      ? Math.round((challenge.opponentScore / challenge.questions) * 100)
      : 0;

    // Send results
    let resultsText = `🏆 *CHALLENGE RESULTS* 🏆\n\n`;
    
    if (winner === 'tie') {
      resultsText += `🤝 *IT'S A TIE!*\n\n`;
    } else {
      resultsText += `🎖️ *WINNER: ${winnerName}*\n\n`;
    }
    
    resultsText += 
      `👑 ${challenge.challengerName}\n` +
      `   ✅ Score: ${challenge.challengerScore}/${challenge.questions}\n` +
      `   🎯 Accuracy: ${challengerAccuracy}%\n\n` +
      
      `🎯 ${challenge.opponentName}\n` +
      `   ✅ Score: ${challenge.opponentScore}/${challenge.questions}\n` +
      `   🎯 Accuracy: ${opponentAccuracy}%\n\n`;
    
    if (winner !== 'tie') {
      resultsText += `💰 *${winnerName} wins 100 bonus points!*`;
      
      // Award bonus points to winner
      const winnerId = winner === 'challenger' ? challenge.challengerId : challenge.opponentId;
      try {
        await TohidUser.findOneAndUpdate(
          { userId: winnerId },
          { $inc: { totalScore: 100 } },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error('Error awarding bonus points:', error);
      }
    }

    // Update challenge message in group
    if (challenge.chatId && challenge.messageId) {
      try {
        await ctx.telegram.editMessageText(
          challenge.chatId,
          challenge.messageId,
          null,
          resultsText,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error updating challenge message:', error);
      }
    }

    // Send results to both players privately
    try {
      await ctx.telegram.sendMessage(challenge.challengerId, resultsText, { parse_mode: 'Markdown' });
      await ctx.telegram.sendMessage(challenge.opponentId, resultsText, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error sending private results:', error);
    }

    // Cleanup
    this.groupChallenges.delete(challenge.challengeId);
  }

  // ========== ADMIN CONTROLS ==========

  async stopGroupQuiz(ctx) {
    if (!ctx.chat || ctx.chat.type === 'private') {
      return ctx.reply('❌ This command only works in groups!');
    }

    if (!await this.isGroupAdmin(ctx)) {
      return ctx.reply('❌ Only group admins can stop group quizzes!');
    }

    const chatId = ctx.chat.id;
    const groupQuiz = this.activeGroupQuizzes.get(chatId);

    if (!groupQuiz) {
      return ctx.reply('❌ No active group quiz to stop!');
    }

    // Cleanup
    this.activeGroupQuizzes.delete(chatId);
    this.groupAnswers.delete(groupQuiz.quizId);
    
    // Clear timers
    for (let i = 0; i < groupQuiz.totalQuestions; i++) {
      const timerKey = `${chatId}_${i}`;
      if (this.groupTimers.has(timerKey)) {
        clearTimeout(this.groupTimers.get(timerKey));
        this.groupTimers.delete(timerKey);
      }
    }

    await ctx.reply('🛑 *Group quiz stopped by admin!*', { parse_mode: 'Markdown' });
  }

  async showGroupRank(ctx) {
    if (!ctx.chat || ctx.chat.type === 'private') {
      return ctx.reply('❌ This command only works in groups!');
    }

    const chatId = ctx.chat.id;
    
    // Get group quiz history
    try {
      const groupQuizzes = await TohidQuizSession.find({
        chatId,
        isGroupQuiz: true,
        completed: true
      })
      .sort({ completedAt: -1 })
      .limit(10);

      if (groupQuizzes.length === 0) {
        return ctx.reply('📭 No group quiz history found for this group.');
      }

      let rankText = '🏆 *GROUP QUIZ RANKINGS* 🏆\n\n';
      
      // Group by date and show results
      groupQuizzes.forEach((quiz, index) => {
        const date = quiz.completedAt.toLocaleDateString();
        const time = quiz.completedAt.toLocaleTimeString();
        
        rankText += 
          `*Quiz ${index + 1}:*\n` +
          `📅 ${date} ${time}\n` +
          `📚 ${quiz.category || 'General'}\n` +
          `👥 Participants: ${quiz.participantsCount || 0}\n` +
          `🏆 Total Score: ${quiz.score || 0}\n` +
          `✅ Correct Answers: ${quiz.correctAnswers || 0}\n\n`;
      });

      await ctx.reply(rankText, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error getting group rank:', error);
      await ctx.reply('❌ Error loading group rankings.');
    }
  }

  // ========== HELPER METHODS ==========

  getGroupCategoryKeyboard() {
    const categories = config.CATEGORIES.slice(0, 6); // First 6 categories for group quiz
    const keyboard = [];
    
    for (let i = 0; i < categories.length; i += 2) {
      const row = [];
      row.push({
        text: `${categories[i].icon} ${categories[i].name}`,
        callback_data: `group_category_${categories[i].name}`
      });
      if (categories[i + 1]) {
        row.push({
          text: `${categories[i + 1].icon} ${categories[i + 1].name}`,
          callback_data: `group_category_${categories[i + 1].name}`
        });
      }
      keyboard.push(row);
    }
    
    keyboard.push([
      { text: '❌ Cancel', callback_data: 'group_cancel' }
    ]);
    
    return keyboard;
  }

  getChallengeCategoryKeyboard(challengeId) {
    const categories = config.CATEGORIES.slice(0, 8); // First 8 categories for challenge
    const keyboard = [];
    
    for (let i = 0; i < categories.length; i += 2) {
      const row = [];
      row.push({
        text: `${categories[i].icon} ${categories[i].name}`,
        callback_data: `challenge_category_${challengeId}_${categories[i].name}`
      });
      if (categories[i + 1]) {
        row.push({
          text: `${categories[i + 1].icon} ${categories[i + 1].name}`,
          callback_data: `challenge_category_${challengeId}_${categories[i + 1].name}`
        });
      }
      keyboard.push(row);
    }
    
    keyboard.push([
      { text: '❌ Cancel Challenge', callback_data: `challenge_cancel_${challengeId}` }
    ]);
    
    return keyboard;
  }

  async isGroupAdmin(ctx) {
    const userId = ctx.from.id;
    
    // Check if user is in admin list from config
    if (config.GROUP_SETTINGS.ADMIN_USER_IDS.includes(userId)) {
      return true;
    }

    // Check if user is group admin
    try {
      if (ctx.chat && ctx.chat.type !== 'private') {
        const member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
        return ['creator', 'administrator'].includes(member.status);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
    
    return false;
  }

  isGroupAllowed(chatId) {
    return config.ADMIN_SETTINGS.ALLOWED_GROUPS.includes(chatId);
  }

  getUserIdByUsername(groupQuiz, username) {
    for (const [userId, userData] of groupQuiz.participants) {
      if (userData.username === username) {
        return userId;
      }
    }
    return null;
  }
}

module.exports = new TohidGroupHandler();