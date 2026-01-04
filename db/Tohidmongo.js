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

// User Schema
const TohidUserSchema = new mongoose.Schema({
  userId: { 
    type: Number, 
    required: true, 
    unique: true,
    index: true 
  },
  username: {
    type: String,
    index: true
  },
  firstName: String,
  lastName: String,
  
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
  
  // Categories
  categoriesPlayed: [String],
  categoryScores: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Daily Stats
  dailyStreak: { 
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
  
  // Referral
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: Number,
  referralCount: { 
    type: Number, 
    default: 0 
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
  }
}, {
  timestamps: true
});

// Quiz Session Schema
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
  category: {
    type: String,
    index: true
  },
  difficulty: String,
  totalQuestions: Number,
  
  // Results
  score: {
    type: Number,
    index: true
  },
  correctAnswers: Number,
  timeTaken: Number,
  
  // Questions
  questions: [{
    question: String,
    correctAnswer: String,
    userAnswer: String,
    isCorrect: Boolean,
    options: [String],
    timeSpent: Number,
    pointsEarned: Number
  }],
  
  // Session Status
  completed: { 
    type: Boolean, 
    default: false 
  },
  startedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  completedAt: {
    type: Date,
    index: true
  },
  cancelled: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

// Local Questions Schema
const TohidQuestionSchema = new mongoose.Schema({
  category: { 
    type: String, 
    required: true,
    index: true 
  },
  question: { 
    type: String, 
    required: true, 
    unique: true 
  },
  correctAnswer: { 
    type: String, 
    required: true 
  },
  incorrectAnswers: { 
    type: [String], 
    required: true 
  },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'],
    index: true 
  },
  
  // Metadata
  source: { 
    type: String, 
    default: 'tohid_local' 
  },
  usedCount: { 
    type: Number, 
    default: 0 
  },
  rating: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Leaderboard Schema
const TohidLeaderboardSchema = new mongoose.Schema({
  userId: {
    type: Number,
    index: true
  },
  username: String,
  firstName: String,
  totalScore: {
    type: Number,
    index: true
  },
  totalQuizzes: Number,
  category: {
    type: String,
    index: true
  },
  period: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly', 'alltime'],
    index: true 
  },
  rank: Number,
  updatedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  }
}, {
  timestamps: true
});

// Create indexes for better performance
TohidUserSchema.index({ totalScore: -1 });
TohidUserSchema.index({ lastPlayed: -1 });
TohidQuizSessionSchema.index({ completedAt: -1 });
TohidQuizSessionSchema.index({ score: -1 });
TohidQuestionSchema.index({ category: 1, difficulty: 1 });
TohidQuestionSchema.index({ usedCount: 1 });
TohidLeaderboardSchema.index({ period: 1, category: 1, totalScore: -1 });

// Models
const TohidUser = mongoose.model('TohidUser', TohidUserSchema);
const TohidQuizSession = mongoose.model('TohidQuizSession', TohidQuizSessionSchema);
const TohidQuestion = mongoose.model('TohidQuestion', TohidQuestionSchema);
const TohidLeaderboard = mongoose.model('TohidLeaderboard', TohidLeaderboardSchema);

// Export with connection status check
module.exports = {
  TohidConnectDB,
  TohidUser,
  TohidQuizSession,
  TohidQuestion,
  TohidLeaderboard,
  isConnected: () => isConnected,
  getConnectionStatus: () => mongoose.connection.readyState
};