// PrivacyShield Max - False Positive Tracker
// Learn from site breakages and auto-adjust blocking patterns

import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';
import learningEngine from './learning-engine.js';

class FalsePositiveTracker {
  constructor() {
    this.breakageEvents = new Map(); // domain → [breakage reports]
    this.corrections = new Map();     // pattern → { adjustments, lastAdjusted }
    this.temporaryWhitelist = new Map(); // domain → expiryTimestamp
    this.autoFixedSites = new Set();  // Sites that were auto-fixed
    this.learningRate = 0.05;         // How fast to adjust (5% per adjustment)
  }

  /**
   * Initialize false positive tracker
   */
  async initialize() {
    const stored = await storageManager.get('falsePositiveData');

    if (stored) {
      this.breakageEvents = new Map(stored.breakageEvents || []);
      this.corrections = new Map(stored.corrections || []);
      this.autoFixedSites = new Set(stored.autoFixedSites || []);
    }

    logger.info('False Positive Tracker initialized', {
      breakageEvents: this.breakageEvents.size,
      corrections: this.corrections.size,
      autoFixedSites: this.autoFixedSites.size
    });

    // Cleanup expired temporary whitelists
    this.cleanupTemporaryWhitelist();
  }

  /**
   * Record a breakage event
   * @param {string} domain - Domain where breakage occurred
   * @param {Object} breakageReport - Breakage details from breakage-detector
   * @returns {Promise<Object>} - { autoFixed, action, pattern }
   */
  async recordBreakage(domain, breakageReport) {
    logger.warn('Breakage detected on', domain, breakageReport);

    // Store breakage event
    const events = this.breakageEvents.get(domain) || [];
    events.push({
      ...breakageReport,
      timestamp: Date.now()
    });
    this.breakageEvents.set(domain, events);

    // Get recent blocks for this domain
    const recentBlocks = await this.getRecentBlocks(domain);

    // Try to correlate breakage with specific block
    const likelyCause = this.correlateCause(breakageReport, recentBlocks);

    let result = {
      autoFixed: false,
      action: null,
      pattern: null
    };

    // If we're confident about the cause, auto-fix it
    if (likelyCause && likelyCause.confidence > 0.7) {
      // Adjust the pattern that caused the issue
      await this.adjustPattern(likelyCause.pattern, 'decrease');

      // Temporarily whitelist domain to fix immediately
      await this.temporaryWhitelistDomain(domain, 3600000); // 1 hour

      // Mark as auto-fixed
      this.autoFixedSites.add(domain);

      // Show notification
      await this.showNotification(domain, likelyCause.pattern);

      result = {
        autoFixed: true,
        action: 'pattern_adjusted',
        pattern: likelyCause.pattern
      };

      logger.info('Auto-fixed breakage on', domain, 'by adjusting', likelyCause.pattern);
    } else {
      // Not confident enough - just temporarily whitelist
      await this.temporaryWhitelistDomain(domain, 1800000); // 30 minutes

      result = {
        autoFixed: false,
        action: 'temporary_whitelist',
        pattern: null
      };

      logger.info('Temporarily whitelisted', domain, 'due to breakage');
    }

    // Record in learning engine
    await learningEngine.recordFeedback(domain, 'false_positive', {
      breakageReport,
      likelyCause,
      autoFixed: result.autoFixed
    });

    await this.save();

    return result;
  }

  /**
   * Get recent blocks for a domain
   * @param {string} domain - Domain to check
   * @returns {Promise<Array>} - Recent block events
   */
  async getRecentBlocks(domain) {
    // Get blocked requests from stats tracker or storage
    const stats = await storageManager.get('blockedRequests');
    if (!stats || !stats[domain]) {
      return [];
    }

    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    // Return blocks from last 5 minutes
    return (stats[domain] || []).filter(block =>
      block.timestamp > fiveMinutesAgo
    );
  }

  /**
   * Correlate breakage with likely blocking cause
   * @param {Object} breakageReport - Breakage details
   * @param {Array} recentBlocks - Recent blocked requests
   * @returns {Object|null} - { pattern, confidence, reason }
   */
  correlateCause(breakageReport, recentBlocks) {
    if (!recentBlocks || recentBlocks.length === 0) {
      return null;
    }

    const causes = [];

    for (const block of recentBlocks) {
      let confidence = 0.5; // Base confidence
      let reason = '';

      // Check if blocked script/resource
      if (block.type === 'script') {
        confidence += 0.2;
        reason = 'Blocked script likely needed for functionality';
      }

      // Check if blocked XHR/fetch (API call)
      if (block.type === 'xmlhttprequest' || block.type === 'fetch') {
        confidence += 0.25;
        reason = 'Blocked API call likely needed for functionality';
      }

      // Check if blocked from same domain
      if (block.url && block.url.includes(breakageReport.domain)) {
        confidence += 0.15;
        reason += ' (same domain)';
      }

      // Check breakage type correlation
      if (breakageReport.type === 'click_without_effect' && block.type === 'script') {
        confidence += 0.1;
      }

      if (breakageReport.type === 'missing_content' && block.type === 'xmlhttprequest') {
        confidence += 0.15;
      }

      causes.push({
        pattern: block.pattern || block.rule || 'unknown',
        url: block.url,
        type: block.type,
        confidence: Math.min(confidence, 1.0),
        reason
      });
    }

    // Return most confident cause
    if (causes.length > 0) {
      causes.sort((a, b) => b.confidence - a.confidence);
      return causes[0];
    }

    return null;
  }

  /**
   * Adjust pattern weight
   * @param {string} pattern - Pattern to adjust
   * @param {string} direction - 'increase' or 'decrease'
   */
  async adjustPattern(pattern, direction) {
    // Get current weight from learning engine
    let currentWeight = learningEngine.getPatternWeight(pattern);

    // Get our correction history
    const correction = this.corrections.get(pattern) || {
      adjustments: 0,
      lastAdjusted: null
    };

    // Calculate adjustment
    const adjustment = direction === 'decrease'
      ? -this.learningRate
      : this.learningRate;

    // Apply adjustment
    const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + adjustment));

    // Update learning engine
    await learningEngine.updatePatternWeight(pattern, newWeight);

    // Record our correction
    correction.adjustments++;
    correction.lastAdjusted = Date.now();
    correction.direction = direction;
    this.corrections.set(pattern, correction);

    logger.info(`Adjusted pattern "${pattern}" from ${currentWeight.toFixed(2)} to ${newWeight.toFixed(2)}`);

    await this.save();
  }

  /**
   * Temporarily whitelist a domain
   * @param {string} domain - Domain to whitelist
   * @param {number} duration - Duration in milliseconds
   */
  async temporaryWhitelistDomain(domain, duration) {
    const expiryTime = Date.now() + duration;
    this.temporaryWhitelist.set(domain, expiryTime);

    logger.info(`Temporarily whitelisted ${domain} for ${duration / 1000}s`);

    // Send message to background to update whitelist
    try {
      await browser.runtime.sendMessage({
        type: 'TEMPORARY_WHITELIST',
        domain: domain,
        expiry: expiryTime
      });
    } catch (error) {
      logger.debug('Could not send temporary whitelist message:', error.message);
    }
  }

  /**
   * Check if domain is temporarily whitelisted
   * @param {string} domain - Domain to check
   * @returns {boolean} - True if temporarily whitelisted
   */
  isTemporarilyWhitelisted(domain) {
    const expiry = this.temporaryWhitelist.get(domain);
    if (!expiry) return false;

    // Check if expired
    if (Date.now() > expiry) {
      this.temporaryWhitelist.delete(domain);
      return false;
    }

    return true;
  }

  /**
   * Cleanup expired temporary whitelists
   */
  cleanupTemporaryWhitelist() {
    const now = Date.now();
    for (const [domain, expiry] of this.temporaryWhitelist.entries()) {
      if (now > expiry) {
        this.temporaryWhitelist.delete(domain);
        logger.debug('Removed expired temporary whitelist for', domain);
      }
    }
  }

  /**
   * Get false positive rate
   * @returns {number} - False positive rate (0-1)
   */
  getFalsePositiveRate() {
    if (this.breakageEvents.size === 0) {
      return 0;
    }

    const totalBreakages = Array.from(this.breakageEvents.values())
      .reduce((sum, events) => sum + events.length, 0);

    // Get total blocks from learning engine
    const learningStats = learningEngine.getStats();
    const totalBlocks = learningStats.feedbackCount || 1;

    return totalBreakages / totalBlocks;
  }

  /**
   * Get count of auto-fixed sites
   * @returns {number} - Number of sites auto-fixed
   */
  getFixedCount() {
    return this.autoFixedSites.size;
  }

  /**
   * Get statistics for UI
   * @returns {Object} - Stats
   */
  getStats() {
    return {
      totalBreakages: Array.from(this.breakageEvents.values())
        .reduce((sum, events) => sum + events.length, 0),
      affectedDomains: this.breakageEvents.size,
      autoFixedSites: this.autoFixedSites.size,
      patternsAdjusted: this.corrections.size,
      falsePositiveRate: this.getFalsePositiveRate(),
      temporarilyWhitelisted: Array.from(this.temporaryWhitelist.entries())
        .filter(([_, expiry]) => Date.now() < expiry).length
    };
  }

  /**
   * Get breakage history for a domain
   * @param {string} domain - Domain to check
   * @returns {Array} - Breakage events
   */
  getBreakageHistory(domain) {
    return this.breakageEvents.get(domain) || [];
  }

  /**
   * Show notification about auto-fix
   * @param {string} domain - Domain that was fixed
   * @param {string} pattern - Pattern that was adjusted
   */
  async showNotification(domain, pattern) {
    try {
      await browser.runtime.sendMessage({
        type: 'AUTO_FIXED_BREAKAGE',
        domain: domain,
        pattern: pattern,
        message: `Auto-fixed ${domain} by adjusting blocking`
      });
    } catch (error) {
      logger.debug('Could not send auto-fix notification:', error.message);
    }
  }

  /**
   * Save to storage
   */
  async save() {
    await storageManager.set({
      falsePositiveData: {
        breakageEvents: Array.from(this.breakageEvents.entries()),
        corrections: Array.from(this.corrections.entries()),
        autoFixedSites: Array.from(this.autoFixedSites)
      }
    });
  }

  /**
   * Reset all data
   */
  async reset() {
    this.breakageEvents.clear();
    this.corrections.clear();
    this.temporaryWhitelist.clear();
    this.autoFixedSites.clear();

    await this.save();

    logger.info('False positive data reset');
  }

  /**
   * Export data for backup
   * @returns {Object} - Export data
   */
  exportData() {
    return {
      breakageEvents: Array.from(this.breakageEvents.entries()),
      corrections: Array.from(this.corrections.entries()),
      autoFixedSites: Array.from(this.autoFixedSites),
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import data from backup
   * @param {Object} data - Import data
   */
  async importData(data) {
    this.breakageEvents = new Map(data.breakageEvents || []);
    this.corrections = new Map(data.corrections || []);
    this.autoFixedSites = new Set(data.autoFixedSites || []);

    await this.save();

    logger.info('False positive data imported');
  }
}

// Export singleton instance
const falsePositiveTracker = new FalsePositiveTracker();
export default falsePositiveTracker;
export { FalsePositiveTracker };
