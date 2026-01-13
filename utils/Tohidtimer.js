/**
 * Tohid AI Timer Manager
 * Created by Tohid
 * Handles all quiz timers with Heroku optimization
 */

class TohidTimer {
  constructor() {
    this.timers = new Map(); // sessionId -> timer data
    this.activeTimers = new Set(); // For monitoring
    this.totalTimersCreated = 0;
    this.totalTimersExpired = 0;
  }

  /**
   * Start a timer for a quiz session
   * @param {string} sessionId - Unique session identifier
   * @param {number} timeLimit - Time limit in seconds
   * @param {Function} callback - Function to call when timer expires
   * @returns {NodeJS.Timeout} Timer ID
   */
  startTimer(sessionId, timeLimit, callback) {
    console.log(`⏱️ [Timer] Starting timer for ${sessionId}: ${timeLimit} seconds`);
    
    // Clear any existing timer for this session
    this.stopTimer(sessionId);
    
    const startTime = Date.now();
    const timeoutMs = timeLimit * 1000;
    
    const timerId = setTimeout(() => {
      console.log(`⏰ [Timer] Expired for ${sessionId}`);
      this.totalTimersExpired++;
      
      try {
        callback(sessionId);
      } catch (error) {
        console.error(`❌ [Timer] Callback error for ${sessionId}:`, error);
      }
      
      // Cleanup
      this.timers.delete(sessionId);
      this.activeTimers.delete(sessionId);
      
    }, timeoutMs);

    // Store timer data
    const timerData = {
      timerId,
      sessionId,
      startTime,
      endTime: startTime + timeoutMs,
      timeLimit: timeLimit,
      timeoutMs,
      status: 'active',
      createdAt: new Date()
    };
    
    this.timers.set(sessionId, timerData);
    this.activeTimers.add(sessionId);
    this.totalTimersCreated++;
    
    // Log for monitoring
    this.logTimerEvent('start', sessionId, timeLimit);
    
    return timerId;
  }

  /**
   * Stop a timer
   * @param {string} sessionId - Session ID to stop timer for
   */
  stopTimer(sessionId) {
    const timer = this.timers.get(sessionId);
    
    if (timer) {
      console.log(`🛑 [Timer] Stopping timer for ${sessionId}`);
      
      clearTimeout(timer.timerId);
      timer.status = 'stopped';
      timer.stoppedAt = Date.now();
      timer.duration = timer.stoppedAt - timer.startTime;
      
      this.timers.set(sessionId, timer);
      this.activeTimers.delete(sessionId);
      
      this.logTimerEvent('stop', sessionId, timer.duration / 1000);
    }
  }

  /**
   * Pause a timer (pause/resume functionality)
   * @param {string} sessionId - Session ID to pause
   * @returns {number} Remaining time in seconds
   */
  pauseTimer(sessionId) {
    const timer = this.timers.get(sessionId);
    
    if (timer && timer.status === 'active') {
      console.log(`⏸️ [Timer] Pausing timer for ${sessionId}`);
      
      clearTimeout(timer.timerId);
      timer.status = 'paused';
      timer.pausedAt = Date.now();
      timer.elapsed = timer.pausedAt - timer.startTime;
      timer.remaining = timer.timeoutMs - timer.elapsed;
      
      this.timers.set(sessionId, timer);
      this.activeTimers.delete(sessionId);
      
      this.logTimerEvent('pause', sessionId, timer.remaining / 1000);
      
      return Math.max(0, timer.remaining / 1000);
    }
    
    return 0;
  }

  /**
   * Resume a paused timer
   * @param {string} sessionId - Session ID to resume
   * @param {Function} callback - Callback function
   */
  resumeTimer(sessionId, callback) {
    const timer = this.timers.get(sessionId);
    
    if (timer && timer.status === 'paused' && timer.remaining > 0) {
      console.log(`▶️ [Timer] Resuming timer for ${sessionId}: ${timer.remaining/1000}s remaining`);
      
      const remainingMs = timer.remaining;
      
      const newTimerId = setTimeout(() => {
        console.log(`⏰ [Timer] Resumed timer expired for ${sessionId}`);
        
        try {
          callback(sessionId);
        } catch (error) {
          console.error(`❌ [Timer] Callback error on resume for ${sessionId}:`, error);
        }
        
        this.timers.delete(sessionId);
        this.activeTimers.delete(sessionId);
        
      }, remainingMs);

      timer.timerId = newTimerId;
      timer.status = 'active';
      timer.startTime = Date.now() - (timer.timeoutMs - remainingMs);
      timer.endTime = timer.startTime + timer.timeoutMs;
      
      delete timer.pausedAt;
      delete timer.remaining;
      
      this.timers.set(sessionId, timer);
      this.activeTimers.add(sessionId);
      
      this.logTimerEvent('resume', sessionId, remainingMs / 1000);
    }
  }

  /**
   * Get remaining time for a timer
   * @param {string} sessionId - Session ID
   * @returns {number} Remaining time in seconds
   */
  getRemainingTime(sessionId) {
    const timer = this.timers.get(sessionId);
    
    if (!timer) {
      return 0;
    }

    if (timer.status === 'paused') {
      return Math.max(0, timer.remaining / 1000);
    }
    
    if (timer.status === 'active') {
      const elapsed = Date.now() - timer.startTime;
      const remaining = timer.timeoutMs - elapsed;
      return Math.max(0, Math.floor(remaining / 1000));
    }
    
    return 0;
  }

  /**
   * Get timer status
   * @param {string} sessionId - Session ID
   * @returns {string} Timer status
   */
  getTimerStatus(sessionId) {
    const timer = this.timers.get(sessionId);
    return timer ? timer.status : 'not_found';
  }

  /**
   * Format time from seconds to MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  formatTime(seconds) {
    if (seconds < 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format time with hours if needed
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time with hours
   */
  formatTimeWithHours(seconds) {
    if (seconds < 0) return '0:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get all active timer session IDs
   * @returns {Array} Array of active session IDs
   */
  getActiveTimers() {
    return Array.from(this.activeTimers);
  }

  /**
   * Get timer statistics
   * @returns {Object} Timer statistics
   */
  getStats() {
    return {
      totalCreated: this.totalTimersCreated,
      totalExpired: this.totalTimersExpired,
      activeCount: this.activeTimers.size,
      totalCount: this.timers.size,
      activeSessions: this.getActiveTimers()
    };
  }

  /**
   * Get detailed info about a timer
   * @param {string} sessionId - Session ID
   * @returns {Object} Timer details
   */
  getTimerDetails(sessionId) {
    const timer = this.timers.get(sessionId);
    
    if (!timer) {
      return null;
    }
    
    const now = Date.now();
    const elapsed = timer.status === 'paused' ? timer.elapsed : now - timer.startTime;
    const remaining = timer.status === 'paused' ? timer.remaining : timer.timeoutMs - elapsed;
    
    return {
      sessionId: timer.sessionId,
      status: timer.status,
      startTime: new Date(timer.startTime).toISOString(),
      createdAt: timer.createdAt.toISOString(),
      timeLimit: timer.timeLimit,
      elapsedSeconds: Math.floor(elapsed / 1000),
      remainingSeconds: Math.floor(remaining / 1000),
      formattedRemaining: this.formatTime(Math.floor(remaining / 1000)),
      progressPercentage: Math.min(100, Math.max(0, (elapsed / timer.timeoutMs) * 100))
    };
  }

  /**
   * Clean up expired/inactive timers (memory management)
   * @param {number} maxAgeHours - Max age in hours to keep
   */
  cleanupOldTimers(maxAgeHours = 24) {
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    let cleanedCount = 0;
    
    for (const [sessionId, timer] of this.timers.entries()) {
      if (now - timer.startTime > maxAgeMs) {
        this.timers.delete(sessionId);
        this.activeTimers.delete(sessionId);
        cleanedCount++;
        
        // Clear timeout if still active
        if (timer.status === 'active') {
          clearTimeout(timer.timerId);
        }
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 [Timer] Cleaned up ${cleanedCount} old timers (older than ${maxAgeHours} hours)`);
    }
    
    return cleanedCount;
  }

  /**
   * Reset all timers (for testing/emergency)
   */
  resetAllTimers() {
    console.log(`🔄 [Timer] Resetting all timers`);
    
    // Clear all timeouts
    for (const timer of this.timers.values()) {
      if (timer.status === 'active') {
        clearTimeout(timer.timerId);
      }
    }
    
    // Clear all data
    this.timers.clear();
    this.activeTimers.clear();
    
    // Reset counters
    this.totalTimersCreated = 0;
    this.totalTimersExpired = 0;
  }

  /**
   * Extend a timer
   * @param {string} sessionId - Session ID
   * @param {number} extraSeconds - Extra seconds to add
   * @returns {boolean} Success status
   */
  extendTimer(sessionId, extraSeconds) {
    const timer = this.timers.get(sessionId);
    
    if (timer && timer.status === 'active') {
      console.log(`➕ [Timer] Extending timer for ${sessionId} by ${extraSeconds} seconds`);
      
      // Get current remaining time
      const currentRemaining = this.getRemainingTime(sessionId) * 1000;
      const newRemaining = currentRemaining + (extraSeconds * 1000);
      
      // Clear current timer
      clearTimeout(timer.timerId);
      
      // Create new timer with extended time
      const newTimerId = setTimeout(() => {
        console.log(`⏰ [Timer] Extended timer expired for ${sessionId}`);
        
        // This should call the original callback
        // Note: We need to store the callback separately for this to work
        if (timer.callback) {
          try {
            timer.callback(sessionId);
          } catch (error) {
            console.error(`❌ [Timer] Extended timer callback error:`, error);
          }
        }
        
        this.timers.delete(sessionId);
        this.activeTimers.delete(sessionId);
        
      }, newRemaining);
      
      // Update timer data
      timer.timerId = newTimerId;
      timer.timeLimit += extraSeconds;
      timer.timeoutMs += (extraSeconds * 1000);
      timer.endTime = timer.startTime + timer.timeoutMs;
      
      this.timers.set(sessionId, timer);
      
      this.logTimerEvent('extend', sessionId, extraSeconds);
      
      return true;
    }
    
    return false;
  }

  /**
   * Log timer events for monitoring
   * @param {string} event - Event type
   * @param {string} sessionId - Session ID
   * @param {number} timeValue - Time value in seconds
   */
  logTimerEvent(event, sessionId, timeValue) {
    const events = {
      start: '🚀 Timer Started',
      stop: '🛑 Timer Stopped',
      pause: '⏸️ Timer Paused',
      resume: '▶️ Timer Resumed',
      extend: '➕ Timer Extended'
    };
    
    const emoji = events[event] || '📝 Timer Event';
    console.log(`${emoji}: ${sessionId} - ${timeValue}s`);
  }

  /**
   * Get timer summary for debugging
   * @returns {string} Timer summary
   */
  getSummary() {
    const stats = this.getStats();
    const activeTimers = this.getActiveTimers();
    
    let summary = `📊 Timer Manager Summary:\n`;
    summary += `├─ Total Created: ${stats.totalCreated}\n`;
    summary += `├─ Total Expired: ${stats.totalExpired}\n`;
    summary += `├─ Active Timers: ${stats.activeCount}\n`;
    summary += `└─ Total in Memory: ${stats.totalCount}\n`;
    
    if (activeTimers.length > 0) {
      summary += `\n🕐 Active Timers:\n`;
      activeTimers.forEach(sessionId => {
        const remaining = this.getRemainingTime(sessionId);
        summary += `├─ ${sessionId}: ${this.formatTime(remaining)} remaining\n`;
      });
    }
    
    return summary;
  }

  /**
   * Check if a timer exists
   * @param {string} sessionId - Session ID
   * @returns {boolean} Exists or not
   */
  hasTimer(sessionId) {
    return this.timers.has(sessionId);
  }

  /**
   * Get countdown progress (0 to 1)
   * @param {string} sessionId - Session ID
   * @returns {number} Progress from 0 to 1
   */
  getProgress(sessionId) {
    const timer = this.timers.get(sessionId);
    
    if (!timer || timer.status !== 'active') {
      return 0;
    }
    
    const elapsed = Date.now() - timer.startTime;
    return Math.min(1, Math.max(0, elapsed / timer.timeoutMs));
  }

  /**
   * Add callback reference to timer (for extend functionality)
   * @param {string} sessionId - Session ID
   * @param {Function} callback - Callback function
   */
  setCallback(sessionId, callback) {
    const timer = this.timers.get(sessionId);
    
    if (timer) {
      timer.callback = callback;
      this.timers.set(sessionId, timer);
    }
  }

  /**
   * Emergency stop all timers (for maintenance)
   */
  emergencyStopAll() {
    console.log(`🚨 [Timer] EMERGENCY STOP ALL TIMERS`);
    
    const activeCount = this.activeTimers.size;
    
    for (const [sessionId, timer] of this.timers.entries()) {
      if (timer.status === 'active') {
        clearTimeout(timer.timerId);
        timer.status = 'emergency_stopped';
        timer.stoppedAt = Date.now();
      }
    }
    
    this.activeTimers.clear();
    
    console.log(`✅ [Timer] Emergency stopped ${activeCount} active timers`);
  }

  /**
   * Create a visual progress bar for timer
   * @param {string} sessionId - Session ID
   * @param {number} width - Width of progress bar
   * @returns {string} Progress bar string
   */
  getProgressBar(sessionId, width = 20) {
    const progress = this.getProgress(sessionId);
    const filled = Math.floor(progress * width);
    const empty = width - filled;
    
    const filledChar = '█';
    const emptyChar = '░';
    const currentChar = '▶';
    
    let bar = '';
    
    for (let i = 0; i < width; i++) {
      if (i < filled) {
        bar += filledChar;
      } else if (i === filled) {
        bar += currentChar;
      } else {
        bar += emptyChar;
      }
    }
    
    const percentage = Math.floor(progress * 100);
    const remaining = this.getRemainingTime(sessionId);
    
    return `${bar} ${percentage}% (${this.formatTime(remaining)} left)`;
  }
}

// Create singleton instance
const tohidTimer = new TohidTimer();

// Setup periodic cleanup (every hour)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    tohidTimer.cleanupOldTimers(1); // Clean timers older than 1 hour
  }, 60 * 60 * 1000); // Every hour
}

// Log timer stats periodically (every 30 minutes for monitoring)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const stats = tohidTimer.getStats();
    if (stats.activeCount > 0) {
      console.log(`📈 [Timer Monitor] Active: ${stats.activeCount}, Total: ${stats.totalCount}`);
    }
  }, 30 * 60 * 1000); // Every 30 minutes
}

module.exports = tohidTimer;