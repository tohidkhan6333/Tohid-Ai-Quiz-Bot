class TohidTimer {
  constructor() {
    this.timers = new Map();
  }

  startTimer(sessionId, timeLimit, callback) {
    const timerId = setTimeout(() => {
      callback(sessionId);
      this.timers.delete(sessionId);
    }, timeLimit * 1000);

    this.timers.set(sessionId, {
      timerId,
      startTime: Date.now(),
      timeLimit: timeLimit * 1000
    });

    return timerId;
  }

  stopTimer(sessionId) {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer.timerId);
      this.timers.delete(sessionId);
    }
  }

  getRemainingTime(sessionId) {
    const timer = this.timers.get(sessionId);
    if (!timer) return 0;

    const elapsed = Date.now() - timer.startTime;
    const remaining = timer.timeLimit - elapsed;
    return Math.max(0, Math.floor(remaining / 1000));
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

module.exports = new TohidTimer();