Tohid-AI Quiz Bot 🤖

<div align="center">

https://img.shields.io/badge/Tohid-AI%20Quiz%20Bot-blue
https://img.shields.io/badge/Version-3.0.0-green
https://img.shields.io/badge/Node.js-18.x-brightgreen
https://img.shields.io/badge/MongoDB-6.x-green
https://img.shields.io/badge/License-MIT-yellow

An AI-powered Telegram Quiz Bot created by Tohid

🚀 Deploy Now | 📖 Documentation | 🤖 Try Bot

</div>

---

📋 Table of Contents

· ✨ Features
· 🎯 Demo
· 🚀 Quick Start
· 🛠 Installation
· ⚙️ Configuration
· 📁 Project Structure
· 🤖 Bot Commands
· 🎮 How to Play
· 🏆 Scoring System
· 📊 Database Schema
· 🌐 API Integration
· 🚀 Deployment
· 🤝 Contributing
· 📞 Support
· 📄 License

---

✨ Features

🎯 Core Features

· 11+ Quiz Categories (Science, History, Geography, Sports, Movies, Music, Literature, Art, Technology, Animals, Space)
· 3 Difficulty Levels (Easy, Medium, Hard)
· Interactive Buttons - No typing required
· Real-time Scoring with bonus points system
· Global Leaderboards (Daily, Weekly, Monthly, All-time)
· Quiz History Tracking - Review your past performances
· Personal Statistics - Track your progress and accuracy
· Daily Streaks - Earn rewards for daily participation

🤖 AI-Powered Features

· Intelligent Question Selection from OpenTDB API
· Local Question Database as fallback
· Smart Timer System with timeout handling
· Adaptive Difficulty (coming soon)
· Performance Analytics - Get insights on your weak areas

💾 Database Features

· MongoDB Integration for reliable data storage
· User Management with profile tracking
· Quiz Session Recording for detailed analytics
· Local Question Bank with 100+ curated questions
· Leaderboard Caching for fast performance

🔗 Social Features

· Promotion System with all Tohid's social links
· Referral System - Invite friends and earn rewards
· Connect with Tohid - Direct WhatsApp contact
· Community Groups - Join Tohid's Telegram communities

---

🎯 Demo

📸 Screenshots

Main Menu Quiz Session Leaderboard
https://via.placeholder.com/300x200/3498db/ffffff?text=Main+Menu https://via.placeholder.com/300x200/2ecc71/ffffff?text=Quiz+Session https://via.placeholder.com/300x200/e74c3c/ffffff?text=Leaderboard

Categories Results Stats
https://via.placeholder.com/300x200/9b59b6/ffffff?text=Categories https://via.placeholder.com/300x200/f1c40f/000000?text=Results https://via.placeholder.com/300x200/1abc9c/ffffff?text=Stats

🎥 Video Demo

https://img.youtube.com/vi/VIDEO_ID/0.jpg

---

🚀 Quick Start

Prerequisites

· Node.js 18.x or higher
· MongoDB 6.x or higher
· Telegram Bot Token from @BotFather

One-Click Deployment


# Tohid AI Quiz Bot - Heroku Deployment

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/Tohidkhan6332/Tohid-Ai-Quiz-Bot)

## 🚀 Quick Heroku Deployment

### Method 1: One-Click Deploy (Recommended)
Click the "Deploy to Heroku" button above and fill in:
1. **App Name**: `tohid-ai-quiz-bot` (or choose your own)
2. **BOT_TOKEN**: Your Telegram bot token from @BotFather
3. **MONGODB_URI**: MongoDB Atlas connection string

### Method 2: Manual Deployment using Heroku CLI

```bash
# 1. Clone the repository
git clone https://github.com/Tohidkhan6332/Tohid-Ai-Quiz-Bot.git
cd Tohid-AI-Quiz-Bot

# 2. Login to Heroku
heroku login

# 3. Create Heroku app
heroku create tohid-ai-quiz-bot

# 4. Set environment variables
heroku config:set BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
heroku config:set MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/tohid_ai_quiz"

# 5. Deploy to Heroku
git push heroku main

# 6. Check logs
heroku logs --tail

https://railway.app/button.svg
https://render.com/images/deploy-to-render-button.svg
https://www.herokucdn.com/deploy/button.svg

---

🛠 Installation

Method 1: Local Installation

```bash
# 1. Clone the repository
git clone https://github.com/Tohidkhan6322/Tohid-Ai-Quiz-Bot.git
cd Tohid-AI-Quiz-Bot

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Edit .env file with your credentials
nano .env

# 5. Start MongoDB (if not running)
sudo systemctl start mongodb

# 6. Start the bot
npm start

# For development with auto-restart
npm run dev
```

Method 2: Docker Installation

```bash
# 1. Clone the repository
git clone https://github.com/Tohidkhan6332/Tohid-Ai-Quiz-Bot.git
cd Tohid-AI-Quiz-Bot

# 2. Build and run with Docker Compose
docker-compose up -d

# 3. Check logs
docker-compose logs -f bot
```

Method 3: PM2 for Production

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Start the bot with PM2
pm2 start index.js --name "tohid-ai-bot"

# 3. Enable auto-start on boot
pm2 startup
pm2 save

# 4. Monitor the bot
pm2 monit
```

---

⚙️ Configuration

Environment Variables (.env)

```env
# Required
BOT_TOKEN=your_telegram_bot_token_here
MONGODB_URI=mongodb://localhost:27017/tohid_ai_quiz

# Optional (for production)
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Advanced
API_TIMEOUT=5000
MAX_QUESTIONS=20
DAILY_QUIZ_LIMIT=25
```

Bot Configuration (config.js)

```javascript
// Main Configuration
{
  BOT_NAME: "Tohid-Ai Quiz Bot",
  BOT_TOKEN: "your_bot_token",
  OWNER_NAME: "Mr Tohid",
  OWNER_USERNAME: "@Tohidkhan6332",
  OWNER_ID: 1975572115,
  
  // Social Links
  GROUP_LINK: "https://t.me/Tohid_Tech",
  CHANNEL_LINK: "https://t.me/marvelmoviehin",
  QUIZ_WEB_LINK: "https://tohidgame.vercel.app",
  DEVELOPER_WHATSAPP: "https://wa.me/917849917350",
  
  
  // Scoring System
  SETTINGS: {
    POINTS_PER_CORRECT: 10,
    STREAK_BONUS: 5,
    TIME_BONUS: 2,
    PERFECT_QUIZ_BONUS: 50
  }
}
```

---

🤖 Bot Commands

Main Commands

Command Description Usage
/start Start the bot and show main menu /start
/help Show help information /help
/quiz Start a new quiz /quiz
/leaderboard Show global leaderboard /leaderboard
/stats Show your personal statistics /stats
/history Show your quiz history /history
/about About Tohid AI Bot /about

Interactive Buttons

```
🎮 Start Tohid Quiz   - Start a new quiz session
🏆 Leaderboard       - View top players
📜 My History        - Check your quiz history
📊 My Stats          - View your statistics
⭐ About Tohid AI     - Learn about the bot
🔗 Connect           - Connect with Tohid
```

---

🎮 How to Play

Step-by-Step Guide

1. Start the Bot: Send /start or click "Start Tohid Quiz"
2. Choose Category: Select from 11+ categories (Science, History, etc.)
3. Select Difficulty: Choose Easy, Medium, or Hard
4. Set Question Count: Choose 5, 10, or 15 questions
5. Answer Questions: Click on the correct answer
6. View Results: See your score, accuracy, and time
7. Check Leaderboard: Compare with other players

Game Rules

· ⏰ 30 seconds per question
· ⏱️ 5 minutes total quiz time
· ✅ 10 points for correct answer
· 🔥 +5 bonus for consecutive correct answers
· 🏆 +50 bonus for perfect quiz (100% correct)
· 📊 Leaderboard updates in real-time

---

🏆 Scoring System

Points Calculation

```javascript
// Base Points
Correct Answer = 10 points

// Bonuses
Streak Bonus = 5 points per consecutive correct answer
Time Bonus = 2 points for answering within 15 seconds
Perfect Quiz Bonus = 50 points for 100% accuracy

// Example Calculation
Correct Answers: 8/10
Streak: 3 consecutive correct
Time: Answered 7 questions within 15 seconds
Perfect: No (didn't get 100%)

Total Score = (8 × 10) + (3 × 5) + (7 × 2) = 80 + 15 + 14 = 109 points
```

Leaderboard Categories

· 🏆 All Time: Overall highest scores
· 📅 Monthly: Top performers this month
· 📊 Weekly: Best scores this week
· 🔥 Daily: Today's top players

Achievement System

· 🎯 First Quiz: Complete your first quiz
· ⭐ Perfect Score: Score 100% in any quiz
· 📚 Category Master: Play all categories
· 🔥 Streak King: 7-day consecutive streak
· 🚀 Speed Demon: Complete quiz in under 2 minutes

---

📊 Database Schema

Users Collection

```javascript
{
  userId: Number,           // Telegram user ID
  username: String,         // Telegram username
  firstName: String,        // User's first name
  totalScore: Number,       // Total accumulated points
  totalQuizzes: Number,     // Number of quizzes completed
  correctAnswers: Number,   // Total correct answers
  wrongAnswers: Number,     // Total wrong answers
  dailyStreak: Number,      // Consecutive days played
  lastPlayed: Date,         // Last quiz date
  referralCode: String,     // Unique referral code
  createdAt: Date          // Account creation date
}
```

Quiz Sessions Collection

```javascript
{
  sessionId: String,        // Unique session identifier
  userId: Number,           // User who played
  category: String,         // Quiz category
  difficulty: String,       // Difficulty level
  score: Number,           // Session score
  correctAnswers: Number,  // Correct answers in session
  timeTaken: Number,       // Time taken in seconds
  questions: Array,        // Questions and answers
  completed: Boolean,      // Whether quiz was completed
  startedAt: Date,         // Session start time
  completedAt: Date        // Session completion time
}
```

Questions Collection

```javascript
{
  category: String,         // Question category
  question: String,         // The question text
  correctAnswer: String,    // Correct answer
  incorrectAnswers: Array,  // Wrong answers
  difficulty: String,       // Difficulty level
  source: String,          // Source (opentdb/tohid_local)
  usedCount: Number,       // Number of times used
  rating: Number,          // User rating (1-5)
  createdAt: Date          // Creation date
}
```

---

🌐 API Integration

OpenTDB API Integration

The bot uses the Open Trivia Database API to fetch questions.

```javascript
  amount=10&
  category=17&          // Category ID
  difficulty=easy&      // Difficulty level
  type=multiple&        // Multiple choice
  encode=url3986        // URL encoding

// Category Mapping
Science: 17
History: 23
Geography: 22
Sports: 21
Movies: 11
Music: 12
Literature: 10
Art: 25
Technology: 18
Animals: 27
Space: 17
```

Local Fallback System

When the API fails or has no questions, the bot uses its local database with 100+ curated questions.

Error Handling

1. API Timeout: Fallback to local questions after 5 seconds
2. No Questions: Use Tohid's curated questions
3. Network Issues: Retry with exponential backoff

---

🚀 Deployment

Option 1: Railway.app (Recommended)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Deploy
railway up
```

Option 2: Render.com

1. Connect your GitHub repository
2. Set environment variables
3. Deploy with Node.js environment
4. Add MongoDB database service

Option 3: Heroku

```bash
# 1. Install Heroku CLI
brew tap heroku/brew && brew install heroku

# 2. Login
heroku login

# 3. Create app
heroku create tohid-ai-bot

# 4. Add MongoDB
heroku addons:create mongolab

# 5. Deploy
git push heroku main
```

Option 4: VPS (DigitalOcean, AWS, etc.)

```bash
# 1. Connect to your VPS
ssh user@your-server-ip

# 2. Install dependencies
sudo apt update
sudo apt install nodejs npm mongodb

# 3. Clone repository
git clone https://github.com/Tohidkhan6332/Tohid-Ai-Quiz-Bot.git
cd Tohid-AI-Quiz-Bot

# 4. Install dependencies
npm install

# 5. Configure environment
cp .env.example .env
nano .env

# 6. Use PM2 for process management
npm install -g pm2
pm2 start index.js --name "tohid-ai-bot"
pm2 startup
pm2 save

# 7. Setup Nginx as reverse proxy (optional)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/tohid-bot
```

---

🤝 Contributing

How to Contribute

1. Fork the repository
2. Create a feature branch (git checkout -b feature/AmazingFeature)
3. Commit your changes (git commit -m 'Add some AmazingFeature')
4. Push to the branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

Development Setup

```bash
# 1. Clone your fork
git clone https://github.com/Tohidkhan6332/Tohid-Ai-Quiz-Bot.git

# 2. Install dependencies
npm install

# 3. Create development branch
git checkout -b dev

# 4. Start development server
npm run dev

# 5. Run tests (when available)
npm test
```

Code Style Guidelines

· Use ES6+ JavaScript features
· Follow camelCase naming convention
· Add JSDoc comments for functions
· Write clean, readable code
· Add error handling for all async operations

Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Tested locally
- [ ] Added unit tests
- [ ] Updated documentation

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code
- [ ] My changes generate no new warnings
```

---

📞 Support

Contact Information

· 👨💻 Developer: Tohid
· 📱 WhatsApp: +91 7849917350
· 📧 Email: tohid@example.com
· 💬 Telegram: @Tohidkhan6332

Community Links

· 🌐 Website: tohidgame.vercel.app
· 📢 Telegram Group: Tohid Tech
· 🎬 Telegram Channel: Marvel Movies
· 📱 WhatsApp Group: Join Group
· 📢 WhatsApp Channel: Join Channel

Reporting Issues

Found a bug or have a feature request? Open an Issue

FAQ

Q: How do I get a bot token?
A: Talk to @BotFather on Telegram and create a new bot.

Q: The bot isn't responding, what should I do?
A: Check if MongoDB is running and your bot token is correct in the .env file.

Q: Can I add custom questions?
A: Yes! Add them to data/TohidData.js following the existing format.

Q: How do I change the bot name?
A: Update the BOT_NAME in config.js and restart the bot.

Q: Is there a limit to how many quizzes I can take?
A: There's a daily limit of 25 quizzes to prevent abuse, but this can be configured.

---

📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

```
MIT License

Copyright (c) 2024 Tohid

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

🙏 Acknowledgments

· OpenTDB for providing the trivia API
· Telegraf.js for the Telegram bot framework
· MongoDB for database services
· All contributors and users of Tohid AI Quiz Bot

---

<div align="center">

⭐ Star this repository if you found it helpful!

Built with ❤️ by Tohid

https://img.shields.io/badge/Follow-Tohid-blue?style=for-the-badge&logo=telegram
https://img.shields.io/badge/Website-tohidgame.vercel.app-green?style=for-the-badge
https://img.shields.io/badge/WhatsApp-Contact%20Tohid-brightgreen?style=for-the-badge&logo=whatsapp

</div>