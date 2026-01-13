/**
 * Tohid AI MongoDB Database - Heroku Optimized
 * Created by Tohid
 */
const mongoose = require('mongoose');
const config = require('../config');

// MongoDB Connection with retry logic for Heroku
let isConnected = false;
let connectionRetries = 0;
const MAX_RETRIES = config.MAX_DB_RETRIES || 5;

const TohidConnectDB = async () => {
  try {
    if (isConnected) {
      console.log('📊 Using existing MongoDB connection');
      return mongoose.connection;
    }
    
    console.log('🔗 Connecting to MongoDB...');
    
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      w: 'majority'
    };
    
    await mongoose.connect(config.MONGODB_URI, options);
    
    isConnected = true;
    connectionRetries = 0;
    
    console.log('✅ Tohid MongoDB Connected Successfully!');
    
    // Connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected');
      isConnected = true;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
      
      // Attempt reconnect for Heroku
      if (config.IS_HEROKU) {
        console.log('🔄 Attempting to reconnect in 5 seconds...');
        setTimeout(TohidConnectDB, 5000);
      }
    });
    
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error.message);
      isConnected = false;
      
      // Retry logic for Heroku
      if (config.IS_HEROKU && connectionRetries < MAX_RETRIES) {
        connectionRetries++;
        console.log(`🔄 Retry ${connectionRetries}/${MAX_RETRIES} in ${config.DB_RETRY_DELAY/1000} seconds...`);
        setTimeout(TohidConnectDB, config.DB_RETRY_DELAY);
      } else if (connectionRetries >= MAX_RETRIES) {
        console.error('❌ Max retries reached. Please check MongoDB connection.');
      }
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
      connectionRetries = 0;
    });
    
    return mongoose.connection;
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // Retry for Heroku
    if (config.IS_HEROKU && connectionRetries < MAX_RETRIES) {
      connectionRetries++;
      console.log(`🔄 Retry ${connectionRetries}/${MAX_RETRIES} in ${config.DB_RETRY_DELAY/1000} seconds...`);
      setTimeout(TohidConnectDB, config.DB_RETRY_DELAY);
    } else {
      console.error('❌ MongoDB connection failed permanently');
      if (!config.IS_HEROKU) {
        process.exit(1);
      }
    }
    
    throw error;
  }
};

// ========== USER SCHEMA ==========
const TohidUserSchema = new mongoose.Schema({
  userId: { 
    type: Number, 
    required: true, 
    unique: true,
    index: true 
  },
  username: {
    type: String,
    index: true,
    sparse: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: String,
  languageCode: String,
  
  // Stats
  totalScore: { 
    type: Number, 
    default: 0,
    index: true 
  },
  totalQuizzes: { 
    type: Number, 
    default: 0 
  },
  correctAnswers: { 
    type: Number, 
    default: 0 
  },
  wrongAnswers: { 
    type: Number, 
    default: 0 
  },
  totalQuestionsAttempted: {
    type: Number,
    default: 0
  },
  
  // Categories
  categoriesPlayed: [{
    category: String,
    playCount: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 }
  }],
  favoriteCategory: String,
  
  // Difficulty Performance
  difficultyStats: {
    easy: {
      played: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      score: { type: Number, default: 0 }
    },
    medium: {
      played: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      score: { type: Number, default: 0 }
    },
    hard: {
      played: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      score: { type: Number, default: 0 }
    }
  },
  
  // Group & Challenge Stats
  groupQuizzesPlayed: {
    type: Number,
    default: 0
  },
  groupQuizScore: {
    type: Number,
    default: 0
  },
  challengesPlayed: {
    type: Number,
    default: 0
  },
  challengesWon: {
    type: Number,
    default: 0
  },
  challengesLost: {
    type: Number,
    default: 0
  },
  challengeScore: {
    type: Number,
    default: 0
  },
  
  // Daily Stats
  dailyStreak: { 
    type: Number, 
    default: 0 
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastPlayed: {
    type: Date,
    index: true
  },
  quizzesToday: { 
    type: Number, 
    default: 0 
  },
  scoreToday: {
    type: Number,
    default: 0
  },
  
  // Achievements
  achievements: [{
    name: String,
    earnedAt: Date,
    description: String
  }],
  achievementPoints: {
    type: Number,
    default: 0
  },
  
  // Referral System
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: Number,
    index: true
  },
  referralCount: { 
    type: Number, 
    default: 0 
  },
  referralReward: {
    type: Number,
    default: 0
  },
  
  // User Status
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: String,
  blockedAt: Date,
  blockedBy: Number,
  
  // Admin Settings
  isAdmin: {
    type: Boolean,
    default: false
  },
  adminLevel: {
    type: String,
    enum: ['owner', 'admin', 'moderator', null],
    default: null
  },
  permissions: [String],
  
  // Settings
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  showLeaderboard: {
    type: Boolean,
    default: true
  },
  language: {
    type: String,
    default: 'en'
  },
  
  // Metadata
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  joinSource: {
    type: String,
    enum: ['start_command', 'group', 'referral', 'unknown'],
    default: 'unknown'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for accuracy percentage
TohidUserSchema.virtual('accuracy').get(function() {
  if (this.totalQuestionsAttempted === 0) return 0;
  return Math.round((this.correctAnswers / this.totalQuestionsAttempted) * 100);
});

// Virtual for average score per quiz
TohidUserSchema.virtual('averageScore').get(function() {
  if (this.totalQuizzes === 0) return 0;
  return Math.round(this.totalScore / this.totalQuizzes);
});

// Virtual for win rate in challenges
TohidUserSchema.virtual('challengeWinRate').get(function() {
  if (this.challengesPlayed === 0) return 0;
  return Math.round((this.challengesWon / this.challengesPlayed) * 100);
});

// ========== QUIZ SESSION SCHEMA ==========
const TohidQuizSessionSchema = new mongoose.Schema({
  sessionId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  userId: { 
    type: Number, 
    required: true,
    index: true 
  },
  username: String,
  userFirstName: String,
  
  // Quiz Configuration
  category: {
    type: String,
    required: true,
    index: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
    index: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  
  // Results
  score: {
    type: Number,
    default: 0,
    index: true
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  wrongAnswers: {
    type: Number,
    default: 0
  },
  timeTaken: {
    type: Number, // in seconds
    default: 0
  },
  averageTimePerQuestion: {
    type: Number,
    default: 0
  },
  
  // Questions
  questions: [{
    question: {
      type: String,
      required: true
    },
    correctAnswer: {
      type: String,
      required: true
    },
    userAnswer: String,
    isCorrect: Boolean,
    options: [String],
    timeSpent: Number, // in milliseconds
    pointsEarned: Number,
    questionNumber: Number,
    difficulty: String
  }],
  
  // Group Quiz Fields
  isGroupQuiz: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  chatId: { 
    type: Number,
    index: true 
  },
  chatTitle: String,
  participantsCount: {
    type: Number,
    default: 0
  },
  groupScores: {
    type: Map,
    of: Number,
    default: {}
  },
  groupRank: Number,
  
  // Challenge Fields
  isChallenge: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  opponentId: {
    type: Number,
    index: true
  },
  opponentName: String,
  opponentScore: {
    type: Number,
    default: 0
  },
  challengeWinner: {
    type: String,
    enum: ['user', 'opponent', 'draw', null],
    default: null
  },
  challengeReward: {
    type: Number,
    default: 0
  },
  
  // Session Status
  completed: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  cancelled: { 
    type: Boolean, 
    default: false 
  },
  forfeited: {
    type: Boolean,
    default: false
  },
  timedOut: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  startedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  completedAt: {
    type: Date,
    index: true
  },
  cancelledAt: Date,
  
  // Performance Metrics
  streak: {
    type: Number,
    default: 0
  },
  perfectQuiz: {
    type: Boolean,
    default: false
  },
  bonusPoints: {
    type: Number,
    default: 0
  },
  
  // Analytics
  deviceInfo: String,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for accuracy percentage
TohidQuizSessionSchema.virtual('accuracy').get(function() {
  if (this.totalQuestions === 0) return 0;
  return Math.round((this.correctAnswers / this.totalQuestions) * 100);
});

// Virtual for score per minute
TohidQuizSessionSchema.virtual('scorePerMinute').get(function() {
  if (this.timeTaken === 0) return 0;
  const minutes = this.timeTaken / 60;
  return Math.round(this.score / minutes);
});

// ========== QUESTION SCHEMA ==========
const TohidQuestionSchema = new mongoose.Schema({
  // Basic Info
  questionId: {
    type: String,
    unique: true,
    sparse: true
  },
  category: { 
    type: String, 
    required: true,
    index: true 
  },
  subCategory: String,
  question: { 
    type: String, 
    required: true,
    index: 'text'
  },
  correctAnswer: { 
    type: String, 
    required: true 
  },
  incorrectAnswers: { 
    type: [String], 
    required: true,
    validate: [arrayLimit, '{PATH} must have exactly 3 items']
  },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'],
    required: true,
    index: true 
  },
  
  // Question Metadata
  type: {
    type: String,
    enum: ['multiple', 'boolean', 'text'],
    default: 'multiple'
  },
  language: {
    type: String,
    default: 'en'
  },
  tags: [String],
  
  // Source Information
  source: { 
    type: String, 
    enum: ['opentdb', 'tohid_local', 'user_submitted', 'ai_generated'],
    default: 'tohid_local' 
  },
  sourceId: String,
  contributor: {
    type: Number, // User ID who contributed
    index: true
  },
  
  // Usage Statistics
  usedCount: { 
    type: Number, 
    default: 0,
    index: true 
  },
  correctCount: {
    type: Number,
    default: 0
  },
  incorrectCount: {
    type: Number,
    default: 0
  },
  
  // Rating & Feedback
  rating: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  reports: [{
    userId: Number,
    reason: String,
    reportedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'resolved', 'rejected'],
      default: 'pending'
    }
  }],
  reportCount: {
    type: Number,
    default: 0
  },
  
  // Difficulty Calibration
  calculatedDifficulty: {
    type: Number,
    min: 0,
    max: 1
  },
  successRate: {
    type: Number,
    min: 0,
    max: 1
  },
  averageTime: {
    type: Number, // in seconds
    default: 0
  },
  
  // Verification
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: Number,
  verifiedAt: Date,
  
  // Metadata
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Helper function for array validation
function arrayLimit(val) {
  return val.length === 3;
}

// ========== LEADERBOARD SCHEMA ==========
const TohidLeaderboardSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  username: String,
  firstName: String,
  
  // Scores
  totalScore: {
    type: Number,
    required: true,
    index: true
  },
  weeklyScore: {
    type: Number,
    default: 0,
    index: true
  },
  monthlyScore: {
    type: Number,
    default: 0,
    index: true
  },
  dailyScore: {
    type: Number,
    default: 0,
    index: true
  },
  
  // Category Scores
  categoryScores: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Stats
  totalQuizzes: Number,
  correctAnswers: Number,
  accuracy: Number,
  streak: Number,
  
  // Group & Challenge Stats
  groupQuizScore: {
    type: Number,
    default: 0
  },
  challengeScore: {
    type: Number,
    default: 0
  },
  challengeWins: {
    type: Number,
    default: 0
  },
  
  // Period
  period: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly', 'alltime', 'category'],
    required: true,
    index: true 
  },
  category: {
    type: String,
    index: true
  },
  
  // Ranking
  rank: {
    type: Number,
    index: true
  },
  previousRank: Number,
  rankChange: Number,
  
  // Time Period
  periodStart: {
    type: Date,
    required: true,
    index: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  
  // Metadata
  updatedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  calculatedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========== GROUP STATS SCHEMA ==========
const TohidGroupStatsSchema = new mongoose.Schema({
  chatId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  chatTitle: String,
  
  // Group Statistics
  totalQuizzes: {
    type: Number,
    default: 0
  },
  totalParticipants: {
    type: Number,
    default: 0
  },
  totalScore: {
    type: Number,
    default: 0
  },
  
  // Active Members
  activeMembers: [{
    userId: Number,
    username: String,
    firstName: String,
    participationCount: Number,
    lastParticipated: Date
  }],
  
  // Top Performers
  topPerformers: [{
    userId: Number,
    username: String,
    firstName: String,
    totalScore: Number,
    quizCount: Number,
    lastActive: Date
  }],
  
  // Quiz History
  recentQuizzes: [{
    sessionId: String,
    category: String,
    participantCount: Number,
    totalScore: Number,
    completedAt: Date
  }],
  
  // Group Settings
  isActive: {
    type: Boolean,
    default: true
  },
  quizSettings: {
    defaultCategory: String,
    defaultDifficulty: String,
    questionCount: {
      type: Number,
      default: 10
    },
    timePerQuestion: {
      type: Number,
      default: 30
    }
  },
  
  // Admin Settings
  adminIds: [Number],
  moderatorIds: [Number],
  quizStarters: [Number],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastQuizAt: Date
}, {
  timestamps: true
});

// ========== CHALLENGE SCHEMA ==========
const TohidChallengeSchema = new mongoose.Schema({
  challengeId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Players
  challengerId: {
    type: Number,
    required: true,
    index: true
  },
  challengerName: String,
  opponentId: {
    type: Number,
    required: true,
    index: true
  },
  opponentName: String,
  
  // Challenge Details
  category: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  questionCount: {
    type: Number,
    default: 5
  },
  
  // Questions
  questions: [{
    question: String,
    correctAnswer: String,
    options: [String],
    questionNumber: Number
  }],
  
  // Results
  challengerAnswers: [{
    questionNumber: Number,
    answer: String,
    isCorrect: Boolean,
    timeSpent: Number
  }],
  opponentAnswers: [{
    questionNumber: Number,
    answer: String,
    isCorrect: Boolean,
    timeSpent: Number
  }],
  
  challengerScore: {
    type: Number,
    default: 0
  },
  opponentScore: {
    type: Number,
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired', 'forfeited'],
    default: 'pending',
    index: true
  },
  
  winner: {
    type: String,
    enum: ['challenger', 'opponent', 'draw', null],
    default: null
  },
  
  // Rewards
  stakeAmount: {
    type: Number,
    default: 0
  },
  winnerReward: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: Date,
  startedAt: Date,
  completedAt: {
    type: Date,
    index: true
  },
  cancelledAt: Date,
  expiredAt: Date,
  
  // Chat/Group Info
  chatId: Number,
  chatTitle: String,
  challengeMessageId: Number,
  
  // Additional Info
  notes: String,
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ========== ADMIN LOG SCHEMA ==========
const TohidAdminLogSchema = new mongoose.Schema({
  adminId: {
    type: Number,
    required: true,
    index: true
  },
  adminName: String,
  
  // Action Details
  action: {
    type: String,
    required: true,
    enum: [
      'enable_bot', 'disable_bot', 'maintenance_mode',
      'block_user', 'unblock_user', 'reset_limits',
      'add_group', 'remove_group', 'clear_cache',
      'broadcast', 'update_settings', 'delete_quiz'
    ]
  },
  targetId: Number,
  targetName: String,
  
  // Details
  details: String,
  ipAddress: String,
  userAgent: String,
  
  // Timestamps
  performedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// ========== DAILY STATS SCHEMA ==========
const TohidDailyStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  
  // User Stats
  newUsers: {
    type: Number,
    default: 0
  },
  activeUsers: {
    type: Number,
    default: 0
  },
  returningUsers: {
    type: Number,
    default: 0
  },
  
  // Quiz Stats
  quizzesPlayed: {
    type: Number,
    default: 0
  },
  groupQuizzes: {
    type: Number,
    default: 0
  },
  challenges: {
    type: Number,
    default: 0
  },
  
  // Performance Stats
  totalQuestions: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  totalScore: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  
  // Category Stats
  popularCategories: [{
    category: String,
    playCount: Number,
    averageScore: Number
  }],
  
  // Group Stats
  activeGroups: {
    type: Number,
    default: 0
  },
  groupParticipants: {
    type: Number,
    default: 0
  },
  
  // Calculated At
  calculatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ========== ACHIEVEMENT SCHEMA ==========
const TohidAchievementSchema = new mongoose.Schema({
  achievementId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  icon: String,
  
  // Requirements
  type: {
    type: String,
    enum: ['score', 'quizzes', 'streak', 'category', 'challenge', 'group', 'special'],
    required: true
  },
  requirement: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  points: {
    type: Number,
    default: 0
  },
  
  // Stats
  earnedCount: {
    type: Number,
    default: 0
  },
  firstEarned: Date,
  lastEarned: Date,
  
  // Visibility
  isActive: {
    type: Boolean,
    default: true
  },
  isSecret: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ========== NOTIFICATION SCHEMA ==========
const TohidNotificationSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  
  // Notification Details
  type: {
    type: String,
    enum: ['challenge', 'group_quiz', 'achievement', 'leaderboard', 'announcement', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: mongoose.Schema.Types.Mixed,
  
  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  isSent: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  sentAt: Date,
  readAt: Date,
  expiresAt: Date,
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// ========== CREATE INDEXES FOR BETTER PERFORMANCE ==========

// User indexes
TohidUserSchema.index({ totalScore: -1 });
TohidUserSchema.index({ lastPlayed: -1 });
TohidUserSchema.index({ dailyStreak: -1 });
TohidUserSchema.index({ createdAt: -1 });
TohidUserSchema.index({ isBlocked: 1 });
TohidUserSchema.index({ isAdmin: 1 });
TohidUserSchema.index({ referralCode: 1 }, { sparse: true });

// Quiz Session indexes
TohidQuizSessionSchema.index({ completedAt: -1 });
TohidQuizSessionSchema.index({ score: -1 });
TohidQuizSessionSchema.index({ userId: 1, completedAt: -1 });
TohidQuizSessionSchema.index({ category: 1, completedAt: -1 });
TohidQuizSessionSchema.index({ difficulty: 1, completedAt: -1 });
TohidQuizSessionSchema.index({ isGroupQuiz: 1, completedAt: -1 });
TohidQuizSessionSchema.index({ isChallenge: 1, completedAt: -1 });
TohidQuizSessionSchema.index({ chatId: 1, completedAt: -1 });

// Question indexes
TohidQuestionSchema.index({ category: 1, difficulty: 1 });
TohidQuestionSchema.index({ usedCount: -1 });
TohidQuestionSchema.index({ rating: -1 });
TohidQuestionSchema.index({ verified: 1 });
TohidQuestionSchema.index({ isActive: 1 });
TohidQuestionSchema.index({ tags: 1 });

// Leaderboard indexes
TohidLeaderboardSchema.index({ period: 1, totalScore: -1 });
TohidLeaderboardSchema.index({ period: 1, category: 1, totalScore: -1 });
TohidLeaderboardSchema.index({ periodStart: -1 });
TohidLeaderboardSchema.index({ userId: 1, period: 1 });

// Group Stats indexes
TohidGroupStatsSchema.index({ chatId: 1 });
TohidGroupStatsSchema.index({ totalQuizzes: -1 });
TohidGroupStatsSchema.index({ lastQuizAt: -1 });

// Challenge indexes
TohidChallengeSchema.index({ challengerId: 1, status: 1 });
TohidChallengeSchema.index({ opponentId: 1, status: 1 });
TohidChallengeSchema.index({ status: 1, createdAt: -1 });
TohidChallengeSchema.index({ completedAt: -1 });

// Admin Log indexes
TohidAdminLogSchema.index({ adminId: 1, performedAt: -1 });
TohidAdminLogSchema.index({ action: 1, performedAt: -1 });

// Daily Stats indexes
TohidDailyStatsSchema.index({ date: -1 });

// Achievement indexes
TohidAchievementSchema.index({ achievementId: 1 });
TohidAchievementSchema.index({ type: 1, isActive: 1 });

// Notification indexes
TohidNotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
TohidNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ========== CREATE MODELS ==========

const TohidUser = mongoose.model('TohidUser', TohidUserSchema);
const TohidQuizSession = mongoose.model('TohidQuizSession', TohidQuizSessionSchema);
const TohidQuestion = mongoose.model('TohidQuestion', TohidQuestionSchema);
const TohidLeaderboard = mongoose.model('TohidLeaderboard', TohidLeaderboardSchema);
const TohidGroupStats = mongoose.model('TohidGroupStats', TohidGroupStatsSchema);
const TohidChallenge = mongoose.model('TohidChallenge', TohidChallengeSchema);
const TohidAdminLog = mongoose.model('TohidAdminLog', TohidAdminLogSchema);
const TohidDailyStats = mongoose.model('TohidDailyStats', TohidDailyStatsSchema);
const TohidAchievement = mongoose.model('TohidAchievement', TohidAchievementSchema);
const TohidNotification = mongoose.model('TohidNotification', TohidNotificationSchema);

// ========== HELPER FUNCTIONS ==========

// Function to update user stats after quiz
const updateUserStats = async (userId, quizData) => {
  try {
    const update = {
      $inc: {
        totalScore: quizData.score || 0,
        totalQuizzes: 1,
        correctAnswers: quizData.correctAnswers || 0,
        wrongAnswers: (quizData.totalQuestions || 0) - (quizData.correctAnswers || 0),
        totalQuestionsAttempted: quizData.totalQuestions || 0,
        quizzesToday: 1,
        scoreToday: quizData.score || 0
      },
      $set: {
        lastPlayed: new Date(),
        lastActive: new Date()
      }
    };

    // Update category stats
    if (quizData.category) {
      update.$addToSet = { categoriesPlayed: { $each: [quizData.category] } };
    }

    // Update difficulty stats
    if (quizData.difficulty) {
      const difficultyField = `difficultyStats.${quizData.difficulty}`;
      update.$inc[`${difficultyField}.played`] = 1;
      update.$inc[`${difficultyField}.correct`] = quizData.correctAnswers || 0;
      update.$inc[`${difficultyField}.score`] = quizData.score || 0;
    }

    // Update group or challenge stats
    if (quizData.isGroupQuiz) {
      update.$inc.groupQuizzesPlayed = 1;
      update.$inc.groupQuizScore = quizData.score || 0;
    }

    if (quizData.isChallenge) {
      update.$inc.challengesPlayed = 1;
      if (quizData.challengeWinner === 'user') {
        update.$inc.challengesWon = 1;
        update.$inc.challengeScore = quizData.challengeReward || 0;
      } else if (quizData.challengeWinner === 'opponent') {
        update.$inc.challengesLost = 1;
      }
    }

    // Update daily streak
    const user = await TohidUser.findOne({ userId });
    if (user) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (!user.lastPlayed || user.lastPlayed < yesterday) {
        // Streak broken or first time
        update.$set.dailyStreak = 1;
      } else if (user.lastPlayed.getDate() === yesterday.getDate()) {
        // Consecutive day
        update.$inc.dailyStreak = 1;
        if (user.dailyStreak + 1 > user.longestStreak) {
          update.$set.longestStreak = user.dailyStreak + 1;
        }
      }
      // Same day, don't update streak
    }

    await TohidUser.findOneAndUpdate(
      { userId },
      update,
      { upsert: true, new: true }
    );

    // Update leaderboard
    await updateLeaderboard(userId, quizData);

  } catch (error) {
    console.error('Error updating user stats:', error);
  }
};

// Function to update leaderboard
const updateLeaderboard = async (userId, quizData) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Update daily leaderboard
    await TohidLeaderboard.findOneAndUpdate(
      { userId, period: 'daily', periodStart: today },
      {
        $inc: {
          totalScore: quizData.score || 0,
          totalQuizzes: 1,
          correctAnswers: quizData.correctAnswers || 0,
          dailyScore: quizData.score || 0
        },
        $set: {
          periodStart: today,
          periodEnd: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // Update weekly leaderboard
    await TohidLeaderboard.findOneAndUpdate(
      { userId, period: 'weekly', periodStart: weekStart },
      {
        $inc: {
          totalScore: quizData.score || 0,
          totalQuizzes: 1,
          correctAnswers: quizData.correctAnswers || 0,
          weeklyScore: quizData.score || 0
        },
        $set: {
          periodStart: weekStart,
          periodEnd: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // Update monthly leaderboard
    await TohidLeaderboard.findOneAndUpdate(
      { userId, period: 'monthly', periodStart: monthStart },
      {
        $inc: {
          totalScore: quizData.score || 0,
          totalQuizzes: 1,
          correctAnswers: quizData.correctAnswers || 0,
          monthlyScore: quizData.score || 0
        },
        $set: {
          periodStart: monthStart,
          periodEnd: new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0),
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // Update all-time leaderboard
    await TohidLeaderboard.findOneAndUpdate(
      { userId, period: 'alltime' },
      {
        $inc: {
          totalScore: quizData.score || 0,
          totalQuizzes: 1,
          correctAnswers: quizData.correctAnswers || 0
        },
        $set: {
          periodStart: new Date(0),
          periodEnd: new Date(8640000000000000), // Far future
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // Update category leaderboard if category is specified
    if (quizData.category) {
      await TohidLeaderboard.findOneAndUpdate(
        { userId, period: 'category', category: quizData.category },
        {
          $inc: {
            totalScore: quizData.score || 0,
            totalQuizzes: 1,
            correctAnswers: quizData.correctAnswers || 0
          },
          $set: {
            periodStart: new Date(0),
            periodEnd: new Date(8640000000000000),
            category: quizData.category,
            updatedAt: new Date()
          }
        },
        { upsert: true, new: true }
      );
    }

  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
};

// Function to get leaderboard rankings
const getLeaderboard = async (period = 'alltime', category = null, limit = 10) => {
  try {
    const query = { period };
    if (category) {
      query.category = category;
    }

    const leaderboard = await TohidLeaderboard.find(query)
      .sort({ totalScore: -1 })
      .limit(limit)
      .lean();

    // Add rank numbers
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
};

// Function to reset daily stats
const resetDailyStats = async () => {
  try {
    // Reset user daily stats
    await TohidUser.updateMany(
      {},
      {
        $set: {
          quizzesToday: 0,
          scoreToday: 0
        }
      }
    );

    // Create daily stats entry
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate yesterday's stats
    const users = await TohidUser.find({
      lastPlayed: { $gte: yesterday, $lt: today }
    }).lean();

    const newUsers = await TohidUser.countDocuments({
      createdAt: { $gte: yesterday, $lt: today }
    });

    const quizzes = await TohidQuizSession.find({
      completedAt: { $gte: yesterday, $lt: today },
      completed: true
    }).lean();

    const dailyStats = {
      date: yesterday,
      newUsers,
      activeUsers: users.length,
      returningUsers: users.filter(u => u.createdAt < yesterday).length,
      quizzesPlayed: quizzes.length,
      groupQuizzes: quizzes.filter(q => q.isGroupQuiz).length,
      challenges: quizzes.filter(q => q.isChallenge).length,
      totalQuestions: quizzes.reduce((sum, q) => sum + (q.totalQuestions || 0), 0),
      correctAnswers: quizzes.reduce((sum, q) => sum + (q.correctAnswers || 0), 0),
      totalScore: quizzes.reduce((sum, q) => sum + (q.score || 0), 0),
      averageScore: quizzes.length > 0 
        ? Math.round(quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length)
        : 0,
      calculatedAt: new Date()
    };

    // Calculate popular categories
    const categoryMap = {};
    quizzes.forEach(quiz => {
      if (quiz.category) {
        if (!categoryMap[quiz.category]) {
          categoryMap[quiz.category] = { playCount: 0, totalScore: 0 };
        }
        categoryMap[quiz.category].playCount++;
        categoryMap[quiz.category].totalScore += quiz.score || 0;
      }
    });

    dailyStats.popularCategories = Object.entries(categoryMap)
      .map(([category, stats]) => ({
        category,
        playCount: stats.playCount,
        averageScore: Math.round(stats.totalScore / stats.playCount)
      }))
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 5);

    // Save daily stats
    await TohidDailyStats.create(dailyStats);

    console.log('✅ Daily stats reset and saved for:', yesterday.toDateString());

  } catch (error) {
    console.error('Error resetting daily stats:', error);
  }
};

// ========== EXPORT ==========

module.exports = {
  TohidConnectDB,
  TohidUser,
  TohidQuizSession,
  TohidQuestion,
  TohidLeaderboard,
  TohidGroupStats,
  TohidChallenge,
  TohidAdminLog,
  TohidDailyStats,
  TohidAchievement,
  TohidNotification,
  
  // Helper functions
  updateUserStats,
  updateLeaderboard,
  getLeaderboard,
  resetDailyStats,
  
  // Connection status
  isConnected: () => isConnected,
  getConnectionStatus: () => mongoose.connection.readyState
};