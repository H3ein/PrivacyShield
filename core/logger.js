// PrivacyShield Max - Logger
// Minimal logging (stats only, privacy-focused)

import { getBrowserAPI } from './utils.js';
import storageManager from './storage-manager.js';

class Logger {
  constructor() {
    this.browserAPI = getBrowserAPI();
    this.debugMode = false;
    this.logBuffer = [];
    this.maxBufferSize = 100;
  }

  /**
   * Initialize logger
   */
  async initialize() {
    const settings = await storageManager.getSettings();
    this.debugMode = settings.debugMode || false;

    console.log('PrivacyShield Max - Logger initialized (debug:', this.debugMode, ')');
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Debug mode enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {any} data - Additional data
   */
  info(message, data = null) {
    if (this.debugMode) {
      console.log('[PrivacyShield]', message, data || '');
    }
  }

  /**
   * Log warning message
   * @param {string} message - Message to log
   * @param {any} data - Additional data
   */
  warn(message, data = null) {
    if (this.debugMode) {
      console.warn('[PrivacyShield]', message, data || '');
    }
  }

  /**
   * Log error message (always logged)
   * @param {string} message - Message to log
   * @param {Error} error - Error object
   */
  error(message, error = null) {
    console.error('[PrivacyShield]', message, error || '');

    // Store in buffer for debugging
    this.addToBuffer({
      type: 'error',
      message,
      error: error ? error.message : null,
      stack: error ? error.stack : null,
      timestamp: Date.now()
    });
  }

  /**
   * Log debug message
   * @param {string} message - Message to log
   * @param {any} data - Additional data
   */
  debug(message, data = null) {
    if (this.debugMode) {
      console.debug('[PrivacyShield]', message, data || '');
    }
  }

  /**
   * Log blocking event (stats only)
   * @param {string} type - Block type (ad, tracker, etc.)
   * @param {string} url - Blocked URL
   * @param {string} reason - Block reason
   */
  async logBlock(type, url, reason = null) {
    // Only increment stats, don't log URLs (privacy)
    const statKey = type === 'tracker' ? 'tracked' : 'blocked';
    await storageManager.incrementStat(statKey);

    if (this.debugMode) {
      this.debug(`Blocked ${type}:`, { url, reason });
    }
  }

  /**
   * Log CNAME uncloaking event
   * @param {string} domain - Original domain
   * @param {string} cname - Tracker CNAME
   */
  async logCNAME(domain, cname) {
    await storageManager.incrementStat('cnameUncloaked');

    if (this.debugMode) {
      this.debug('CNAME uncloaked:', { domain, cname });
    }
  }

  /**
   * Log AI detection event
   * @param {string} domain - Detected domain
   * @param {string} reason - Detection reason
   * @param {number} confidence - Confidence score
   */
  logAIDetection(domain, reason, confidence) {
    if (this.debugMode) {
      this.debug('AI detection:', { domain, reason, confidence });
    }

    this.addToBuffer({
      type: 'ai_detection',
      domain,
      reason,
      confidence,
      timestamp: Date.now()
    });
  }

  /**
   * Log performance metric
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   */
  logPerformance(metric, value) {
    if (this.debugMode) {
      this.debug(`Performance [${metric}]:`, value);
    }
  }

  /**
   * Add entry to log buffer
   * @param {Object} entry - Log entry
   */
  addToBuffer(entry) {
    this.logBuffer.push(entry);

    // Limit buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Get recent log entries
   * @param {number} count - Number of entries
   * @returns {Array} - Log entries
   */
  getRecentLogs(count = 50) {
    return this.logBuffer.slice(-count);
  }

  /**
   * Clear log buffer
   */
  clearLogs() {
    this.logBuffer = [];
  }

  /**
   * Export logs for debugging
   * @returns {Object} - Logs and stats
   */
  async exportLogs() {
    const stats = await storageManager.getStats();
    const settings = await storageManager.getSettings();

    return {
      version: settings.version,
      debugMode: this.debugMode,
      stats,
      recentLogs: this.logBuffer,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
export { Logger };
