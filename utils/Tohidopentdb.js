const axios = require('axios');
const config = require('../config');
const { TohidQuestion } = require('../db/Tohidmongo');

class TohidOpenTDB {
  constructor() {
    this.apiUrl = config.API_LINK;
  }

  async getQuestions(category, difficulty, amount = 10) {
    try {
      const apiCategoryId = config.CATEGORY_MAPPING[category];
      
      // If category doesn't exist in API mapping, use local DB
      if (!apiCategoryId) {
        return await this.getLocalQuestions(category, difficulty, amount);
      }
      
      // Map difficulty
      const difficultyMap = {
        'Easy': 'easy',
        'Medium': 'medium',
        'Hard': 'hard'
      };
      
      const url = `${this.apiUrl}?amount=${amount}&category=${apiCategoryId}&difficulty=${difficultyMap[difficulty]}&type=multiple&encode=url3986`;
      
      const response = await axios.get(url);
      
      if (response.data.response_code === 0) {
        return this.formatQuestions(response.data.results, category);
      } else {
        // If API fails, use local questions
        return await this.getLocalQuestions(category, difficulty, amount);
      }
    } catch (error) {
      console.error('❌ Tohid OpenTDB Error:', error.message);
      return await this.getLocalQuestions(category, difficulty, amount);
    }
  }

  async getLocalQuestions(category, difficulty, amount) {
    try {
      const difficultyLower = difficulty.toLowerCase();
      
      // Find questions from local database
      const questions = await TohidQuestion.find({
        category: category,
        difficulty: difficultyLower
      }).limit(amount * 2);
      
      if (questions.length === 0) {
        // If no questions found with exact difficulty, get any from category
        const fallbackQuestions = await TohidQuestion.find({
          category: category
        }).limit(amount * 2);
        
        if (fallbackQuestions.length === 0) {
          // Return default questions if none found
          return this.getDefaultQuestions(category, amount);
        }
        
        // Shuffle and slice
        const shuffled = this.shuffleArray(fallbackQuestions);
        return this.formatLocalQuestions(shuffled.slice(0, amount));
      }
      
      // Shuffle and slice
      const shuffled = this.shuffleArray(questions);
      const selectedQuestions = shuffled.slice(0, amount);
      
      // Update usage count
      await Promise.all(
        selectedQuestions.map(q =>
          TohidQuestion.updateOne(
            { _id: q._id },
            { $inc: { usedCount: 1 } }
          )
        )
      );
      
      return this.formatLocalQuestions(selectedQuestions);
    } catch (error) {
      console.error('❌ Tohid Local Questions Error:', error.message);
      return this.getDefaultQuestions(category, amount);
    }
  }

  formatQuestions(apiQuestions, category) {
    return apiQuestions.map(q => ({
      category: category,
      question: decodeURIComponent(q.question),
      correctAnswer: decodeURIComponent(q.correct_answer),
      incorrectAnswers: q.incorrect_answers.map(a => decodeURIComponent(a)),
      difficulty: q.difficulty,
      type: q.type,
      source: 'opentdb'
    }));
  }

  formatLocalQuestions(localQuestions) {
    return localQuestions.map(q => ({
      category: q.category,
      question: q.question,
      correctAnswer: q.correctAnswer,
      incorrectAnswers: q.incorrectAnswers,
      difficulty: q.difficulty,
      type: 'multiple',
      source: 'tohid_local'
    }));
  }

  getDefaultQuestions(category, amount) {
    const defaultQuestions = [
      {
        category: category,
        question: `Tohid AI Quiz: Sample question about ${category}`,
        correctAnswer: 'Correct Answer',
        incorrectAnswers: ['Wrong Answer 1', 'Wrong Answer 2', 'Wrong Answer 3'],
        difficulty: 'easy',
        type: 'multiple',
        source: 'tohid_default'
      }
    ];
    
    return defaultQuestions.slice(0, Math.min(amount, defaultQuestions.length));
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  shuffleOptions(options) {
    return this.shuffleArray(options);
  }
}

module.exports = new TohidOpenTDB();