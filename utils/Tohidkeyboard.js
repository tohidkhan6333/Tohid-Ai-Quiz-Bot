const config = require('../config');

const TohidKeyboards = {
  // Main Menu
  mainMenu: () => ({
    reply_markup: {
      keyboard: [
        ['🎮 Start Tohid Quiz', '🏆 Leaderboard'],
        ['📜 My History', '📊 My Stats'],
        ['⭐ About Tohid AI', '🔗 Connect']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  }),

  // Group Menu (for groups)
  groupMenu: () => ({
    reply_markup: {
      keyboard: [
        ['🎮 Start Quiz', '👥 Group Quiz'],
        ['⚔️ Challenge', '🏆 Group Rank'],
        ['📊 My Stats', '⭐ About']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  }),

  // Admin Menu
  adminMenu: () => ({
    reply_markup: {
      keyboard: [
        ['✅ Enable Bot', '❌ Disable Bot'],
        ['🔧 Maintenance', '📊 Admin Stats'],
        ['👥 Manage Groups', '👤 Manage Users'],
        ['📢 Broadcast', '🧹 Clear Cache'],
        ['🔙 Main Menu']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  }),

  // Categories
  categories: () => {
    const categories = config.CATEGORIES;
    const keyboard = [];
    
    // Create rows of 2 buttons each
    for (let i = 0; i < categories.length; i += 2) {
      const row = [];
      row.push({
        text: `${categories[i].icon} ${categories[i].name}`,
        callback_data: `category_${categories[i].name}`
      });
      if (categories[i + 1]) {
        row.push({
          text: `${categories[i + 1].icon} ${categories[i + 1].name}`,
          callback_data: `category_${categories[i + 1].name}`
        });
      }
      keyboard.push(row);
    }
    
    // Add back button
    keyboard.push([
      { text: '🔙 Back to Menu', callback_data: 'back_main' }
    ]);
    
    return {
      reply_markup: {
        inline_keyboard: keyboard
      }
    };
  },

  // Difficulties
  difficulties: () => ({
    reply_markup: {
      inline_keyboard: [
        [
          { text: '😊 Easy', callback_data: 'difficulty_Easy' },
          { text: '😐 Medium', callback_data: 'difficulty_Medium' },
          { text: '😈 Hard', callback_data: 'difficulty_Hard' }
        ],
        [
          { text: '🔙 Back to Categories', callback_data: 'back_categories' }
        ]
      ]
    }
  }),

  // Question Counts
  questionCounts: () => ({
    reply_markup: {
      inline_keyboard: [
        [
          { text: '5 Questions', callback_data: 'count_5' },
          { text: '10 Questions', callback_data: 'count_10' },
          { text: '15 Questions', callback_data: 'count_15' }
        ],
        [
          { text: '🔙 Back to Difficulty', callback_data: 'back_difficulty' }
        ]
      ]
    }
  }),

  // Quiz Answers
  quizAnswers: (answers) => {
    const buttons = answers.map((answer, index) => [
      { text: `${String.fromCharCode(65 + index)}) ${answer}`, callback_data: `answer_${index}` }
    ]);
    
    return {
      reply_markup: {
        inline_keyboard: buttons
      }
    };
  },

  // Quiz Navigation
  quizNavigation: (questionNumber, totalQuestions, score) => ({
    reply_markup: {
      inline_keyboard: [
        questionNumber < totalQuestions 
          ? [{ text: `➡️ Next (${questionNumber}/${totalQuestions})`, callback_data: 'next_question' }]
          : [{ text: '🏁 Finish Quiz', callback_data: 'finish_quiz' }],
        [
          { text: `⭐ Score: ${score}`, callback_data: 'score_info' },
          { text: '❌ Cancel', callback_data: 'cancel_quiz' }
        ]
      ]
    }
  }),

  // Promotion
  promotion: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: '📱 WhatsApp Group', url: config.PROMOTION.WHATSAPP_GROUP }],
        [{ text: '📢 WhatsApp Channel', url: config.PROMOTION.WHATSAPP_CHANNEL }],
        [{ text: '👨💻 Contact Tohid', url: config.PROMOTION.DEVELOPER_WHATSAPP }],
        [{ text: '🌐 Tohid Game Website', url: config.QUIZ_WEB_LINK }],
        [{ text: '📢 Tohid Tech Group', url: config.GROUP_LINK }],
        [{ text: '🎬 Marvel Movies', url: config.CHANNEL_LINK }],
        [{ text: '🔙 Back to Menu', callback_data: 'back_main' }]
      ]
    }
  }),

  // Leaderboard
  leaderboard: () => ({
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏆 All Time', callback_data: 'leaderboard_all' },
          { text: '📅 This Month', callback_data: 'leaderboard_month' }
        ],
        [
          { text: '📊 This Week', callback_data: 'leaderboard_week' },
          { text: '🔥 Today', callback_data: 'leaderboard_today' }
        ],
        [
          { text: '🔙 Back to Menu', callback_data: 'back_main' }
        ]
      ]
    }
  }),

  // Challenge Actions
  challengeActions: (challengeId) => ({
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Accept Challenge', callback_data: `challenge_accept_${challengeId}` },
          { text: '❌ Decline', callback_data: `challenge_decline_${challengeId}` }
        ]
      ]
    }
  }),

  // Admin Actions
  adminActions: () => ({
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 View Stats', callback_data: 'admin_stats' },
          { text: '👥 Manage Users', callback_data: 'admin_users' }
        ],
        [
          { text: '👥 Manage Groups', callback_data: 'admin_groups' },
          { text: '📢 Broadcast', callback_data: 'admin_broadcast' }
        ],
        [
          { text: '🔙 Main Menu', callback_data: 'back_main' }
        ]
      ]
    }
  }),

  // Remove Keyboard
  removeKeyboard: () => ({
    reply_markup: {
      remove_keyboard: true
    }
  })
};

module.exports = TohidKeyboards;