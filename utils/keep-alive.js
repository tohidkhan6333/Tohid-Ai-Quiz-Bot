/**
 * Keep Heroku Dyno Alive
 * Prevents free dyno from sleeping
 */
const http = require('http');

class KeepAlive {
  constructor() {
    this.interval = null;
    this.isRunning = false;
  }

  start() {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔄 Keep-alive not needed in development');
      return;
    }

    const appName = process.env.HEROKU_APP_NAME;
    if (!appName) {
      console.log('❌ HEROKU_APP_NAME not set, keep-alive disabled');
      return;
    }

    this.isRunning = true;
    const url = `https://${appName}.herokuapp.com/health`;
    
    console.log(`🚀 Starting keep-alive for: ${appName}.herokuapp.com`);
    
    this.interval = setInterval(() => {
      this.ping(url);
    }, 20 * 60 * 1000); // Every 20 minutes
    
    // Initial ping
    this.ping(url);
  }

  ping(url) {
    http.get(url, (res) => {
      const { statusCode } = res;
      console.log(`✅ Keep-alive ping successful: ${statusCode} at ${new Date().toLocaleTimeString()}`);
    }).on('error', (err) => {
      console.error(`❌ Keep-alive ping failed: ${err.message}`);
    });
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.isRunning = false;
      console.log('🛑 Keep-alive stopped');
    }
  }
}

// Singleton instance
const keepAlive = new KeepAlive();

// Auto-start in production
if (process.env.NODE_ENV === 'production' && process.env.HEROKU_APP_NAME) {
  setTimeout(() => {
    keepAlive.start();
  }, 30000); // Start 30 seconds after boot
}

module.exports = keepAlive;