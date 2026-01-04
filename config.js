/**
 * Tohid AI Quiz Bot Mr Tohid Configuration
 * Optimized for Heroku Deployment
 */
require('dotenv').config();

const TohidConfig = {
  // Bot Information
  BOT_NAME: "Tohid-Ai Quiz Bot",
  BOT_TOKEN: process.env.BOT_TOKEN || "5812648906:AAH3dlK3nL36sxpN7_8xcpmwlk-Dg1IJpkg",
  
  // Owner Information
  OWNER_NAME: "Mr Tohid",
  OWNER_USERNAME: "@Tohidkhan6332",
  OWNER_ID: 1975572115,
  OWNER_WHATSAPP_NUMBER: "+91 7849917350",
  
  // Group/Channel Information
  GROUP_ID: -1001821969607,
  CHANNEL_ID: -1001821969607,
  GROUP_LINK: "https://t.me/Tohid_Tech",
  CHANNEL_LINK: "https://t.me/marvelmoviehin",
  
  // Website and API
  QUIZ_WEB_LINK: "https://tohidgame.vercel.app",
  API_LINK: "https://opentdb.com/api.php",
  
  // MongoDB Configuration
MONGODB_URI: process.env.MONGODB_URI || "mongodb+srv://tohid-ai-quiz-bot:tohid-ai-quiz-bot@cluster0.idbzeke.mongodb.net/tohid_ai_quiz?retryWrites=true&w=majority&appName=Cluster0",
  
  // Heroku Settings
  IS_HEROKU: process.env.NODE_ENV === 'production',
  PORT: process.env.PORT || 3000,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Category Mapping for OpenTDB API
  CATEGORY_MAPPING: {
    'Science': 17,
    'History': 23,
    'Geography': 22,
    'Sports': 21,
    'Movies': 11,
    'Music': 12,
    'Literature': 10,
    'Art': 25,
    'Technology': 18,
    'Animals': 27,
    'Space': 17
  },
  
  // Categories with Icons
  CATEGORIES: [
    { name: 'Science', icon: '🔬', id: 17 },
    { name: 'History', icon: '📜', id: 23 },
    { name: 'Geography', icon: '🌍', id: 22 },
    { name: 'Sports', icon: '⚽', id: 21 },
    { name: 'Movies', icon: '🎬', id: 11 },
    { name: 'Music', icon: '🎵', id: 12 },
    { name: 'Literature', icon: '📖', id: 10 },
    { name: 'Art', icon: '🎨', id: 25 },
    { name: 'Technology', icon: '💻', id: 18 },
    { name: 'Animals', icon: '🦁', id: 27 },
    { name: 'Space', icon: '🚀', id: 17 }
  ],
  
  // Difficulty Levels
  DIFFICULTIES: [
    { name: 'Easy', emoji: '😊' },
    { name: 'Medium', emoji: '😐' },
    { name: 'Hard', emoji: '😈' }
  ],
  
  // Question Count Options
  QUESTION_COUNTS: [5, 10, 15],
  
  // Bot Settings
  SETTINGS: {
    MAX_QUIZ_TIME: process.env.MAX_QUIZ_TIME ? parseInt(process.env.MAX_QUIZ_TIME) : 300,
    QUESTION_TIMEOUT: process.env.QUESTION_TIMEOUT ? parseInt(process.env.QUESTION_TIMEOUT) : 30,
    MAX_QUIZZES_PER_DAY: process.env.MAX_QUIZZES_PER_DAY ? parseInt(process.env.MAX_QUIZZES_PER_DAY) : 25,
    POINTS_PER_CORRECT: 10,
    STREAK_BONUS: 5,
    TIME_BONUS: 2,
    PERFECT_QUIZ_BONUS: 50
  },
  
  // Promotion Links
  PROMOTION: {
    WHATSAPP_GROUP: 'https://chat.whatsapp.com/HUEyTVIQ7Ij1gFs6aZkbMk',
    WHATSAPP_CHANNEL: 'https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T',
    DEVELOPER_WHATSAPP: 'https://wa.me/917849917350?text=Hello%20Mr%20Tohid'
  },
  
  // Heroku Memory Limits (Free Tier: 512MB)
  MEMORY_LIMIT: 512,
  
  // Error Handling
  MAX_DB_RETRIES: 5,
  DB_RETRY_DELAY: 3000
};

// Heroku Specific Signature
TohidConfig.SIGNATURE = `
╔═══════════════════════════●●►
┃◈├•──────────●●►
┃◈├ ╔═╦═╗───╔══╗╔╗╔╗╔╗
┃◈├ ║║║║╠╦╦═╩╗╔╩╣╚╬╬╝║
┃◈├ ║║║║║╔╩══╣║╬║║║║╬║
┃◈├ ╚╩═╩╩╝───╚╩═╩╩╩╩═╝
┃◈├───★─☆──♪♪──❍
┃◈├• TOHID AI QUIZ BOT v3.0
┃◈├───★─☆──♪♪─❍
┃◈├• 🤖 Heroku Edition
┃◈├• 👨💻 Created by: Tohid
┃◈├• 🌐 tohidgame.vercel.app
┃◈├• 🚀 Deployed on: Heroku
┃◈├•──────────●●►
╚═══════════════════════════●●►
`;

module.exports = TohidConfig;
