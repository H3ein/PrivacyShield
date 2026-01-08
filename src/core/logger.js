// PrivacyShield - Production Logger
// Comprehensive error logging for production monitoring

export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.currentLevel = LOG_LEVELS.ERROR; // Production: only errors
    this.maxLogSize = 1000; // Prevent memory leaks
    this.logs = [];
    this.sessionId = this.generateSessionId();
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  shouldLog(level) {
    return level <= this.currentLevel;
  }

  formatMessage(level, context, message, data = null) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS)[level];
    
    const logEntry = {
      timestamp,
      level: levelName,
      context,
      message,
      data,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : 'background'
    };

    // Add to memory logs (circular buffer)
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }

    return logEntry;
  }

  error(context, message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.ERROR)) return;
    
    const logEntry = this.formatMessage(LOG_LEVELS.ERROR, context, message, data);
    
    // Console output
    console.error(`[PrivacyShield ERROR] [${context}] ${message}`, data);
    
    // Store for debugging
    this.persistCriticalError(logEntry);
  }

  warn(context, message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.WARN)) return;
    
    const logEntry = this.formatMessage(LOG_LEVELS.WARN, context, message, data);
    console.warn(`[PrivacyShield WARN] [${context}] ${message}`, data);
  }

  info(context, message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;
    
    const logEntry = this.formatMessage(LOG_LEVELS.INFO, context, message, data);
    console.info(`[PrivacyShield INFO] [${context}] ${message}`, data);
  }

  debug(context, message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    
    const logEntry = this.formatMessage(LOG_LEVELS.DEBUG, context, message, data);
    console.debug(`[PrivacyShield DEBUG] [${context}] ${message}`, data);
  }

  async persistCriticalError(logEntry) {
    try {
      // Store critical errors in chrome.storage for debugging
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const existing = await chrome.storage.local.get(['criticalErrors']) || {};
        const errors = existing.criticalErrors || [];
        
        errors.push(logEntry);
        
        // Keep only last 50 critical errors
        if (errors.length > 50) {
          errors.splice(0, errors.length - 50);
        }
        
        await chrome.storage.local.set({ criticalErrors: errors });
      }
    } catch (error) {
      // Fallback: just log to console
      console.error('Failed to persist critical error:', error);
    }
  }

  async getCriticalErrors() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['criticalErrors']);
        return result.criticalErrors || [];
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async clearCriticalErrors() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['criticalErrors']);
      }
    } catch (error) {
      console.error('Failed to clear critical errors:', error);
    }
  }

  // Performance monitoring
  startTimer(label) {
    this.timers = this.timers || {};
    this.timers[label] = performance.now();
  }

  endTimer(label, context = 'performance') {
    if (!this.timers || !this.timers[label]) return;
    
    const duration = performance.now() - this.timers[label];
    this.debug(context, `Timer ${label}: ${duration.toFixed(2)}ms`);
    
    delete this.timers[label];
    return duration;
  }

  // Memory usage monitoring
  logMemoryUsage(context = 'memory') {
    if (typeof performance !== 'undefined' && performance.memory) {
      const memory = performance.memory;
      this.debug(context, 'Memory usage', {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      });
    }
  }

  // Extension health check
  async healthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      memory: null,
      storage: null,
      errors: 0
    };

    // Memory check
    if (typeof performance !== 'undefined' && performance.memory) {
      const memory = performance.memory;
      health.memory = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }

    // Storage check
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const testKey = 'health_check_' + Date.now();
        await chrome.storage.local.set({ [testKey]: 'test' });
        await chrome.storage.local.remove(testKey);
        health.storage = 'ok';
      }
    } catch (error) {
      health.storage = 'error';
      this.error('health', 'Storage check failed', error);
    }

    // Error count
    const criticalErrors = await this.getCriticalErrors();
    health.errors = criticalErrors.length;

    return health;
  }

  // Set log level (for debugging)
  setLevel(level) {
    this.currentLevel = level;
    this.info('logger', `Log level set to ${Object.keys(LOG_LEVELS)[level]}`);
  }

  // Export logs for debugging
  exportLogs() {
    return {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      logs: this.logs,
      criticalErrors: this.getCriticalErrors()
    };
  }
}

// Create singleton instance
export const logger = new Logger();

// Export convenience functions
export const logError = (context, message, data) => logger.error(context, message, data);
export const logWarn = (context, message, data) => logger.warn(context, message, data);
export const logInfo = (context, message, data) => logger.info(context, message, data);
export const logDebug = (context, message, data) => logger.debug(context, message, data);

export default logger;
