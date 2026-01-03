// PrivacyShield Max - Trusted Sites Manager
// Automatically whitelist frequently visited sites based on user behavior

import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';

class TrustedSitesManager {
  constructor() {
    this.visitHistory = new Map(); // domain → { visits, lastVisit, avgTime, totalTime }
    this.autoWhitelist = new Set();
    this.manualWhitelist = new Set();

    // Thresholds for auto-whitelisting
    this.thresholds = {
      minVisits: 10,           // Visit 10+ times
      minAvgTime: 30000,       // Spend 30+ seconds on average (ms)
      minTotalTime: 600000,    // Total 10+ minutes (ms)
      withinDays: 30           // Within 30 days
    };
  }

  /**
   * Initialize trusted sites manager
   */
  async initialize() {
    const stored = await storageManager.get('trustedSites');

    if (stored) {
      this.visitHistory = new Map(stored.visitHistory || []);
      this.autoWhitelist = new Set(stored.autoWhitelist || []);
      this.manualWhitelist = new Set(stored.manualWhitelist || []);
    }

    logger.info('Trusted Sites Manager initialized', {
      visitHistory: this.visitHistory.size,
      autoWhitelist: this.autoWhitelist.size,
      manualWhitelist: this.manualWhitelist.size
    });

    // Cleanup old visit data on startup
    await this.cleanup();
  }

  /**
   * Track a visit to a domain
   * @param {string} domain - Domain visited
   * @param {number} timeSpent - Time spent in milliseconds
   */
  async trackVisit(domain, timeSpent) {
    // Skip if already manually whitelisted
    if (this.manualWhitelist.has(domain)) {
      return;
    }

    // Skip if already auto-whitelisted (but keep tracking for stats)
    const wasAutoWhitelisted = this.autoWhitelist.has(domain);

    // Get or create visit data
    const visitData = this.visitHistory.get(domain) || {
      visits: 0,
      lastVisit: Date.now(),
      totalTime: 0,
      firstVisit: Date.now()
    };

    // Update visit data
    visitData.visits += 1;
    visitData.lastVisit = Date.now();
    visitData.totalTime += timeSpent;
    visitData.avgTime = visitData.totalTime / visitData.visits;

    this.visitHistory.set(domain, visitData);

    logger.debug('Visit tracked for', domain, visitData);

    // Check if should auto-whitelist
    if (!wasAutoWhitelisted && this.shouldAutoWhitelist(domain, visitData)) {
      await this.autoWhitelist_domain(domain);
    }

    // Save periodically (every visit)
    await this.save();
  }

  /**
   * Check if domain should be auto-whitelisted
   * @param {string} domain - Domain to check
   * @param {Object} visitData - Visit data
   * @returns {boolean} - True if should whitelist
   */
  shouldAutoWhitelist(domain, visitData) {
    const daysSinceFirstVisit = (Date.now() - visitData.firstVisit) / (1000 * 60 * 60 * 24);

    // Must be within time window
    if (daysSinceFirstVisit > this.thresholds.withinDays) {
      return false;
    }

    // Check all thresholds
    const meetsVisitCount = visitData.visits >= this.thresholds.minVisits;
    const meetsAvgTime = visitData.avgTime >= this.thresholds.minAvgTime;
    const meetsTotalTime = visitData.totalTime >= this.thresholds.minTotalTime;

    return meetsVisitCount && meetsAvgTime && meetsTotalTime;
  }

  /**
   * Auto-whitelist a domain
   * @param {string} domain - Domain to whitelist
   */
  async autoWhitelist_domain(domain) {
    this.autoWhitelist.add(domain);

    logger.info('Domain auto-whitelisted:', domain);

    // Show notification to user
    await this.showNotification(domain);

    await this.save();
  }

  /**
   * Manually whitelist a domain
   * @param {string} domain - Domain to whitelist
   */
  async manualWhitelist_domain(domain) {
    this.manualWhitelist.add(domain);

    // Remove from auto-whitelist if present (manual takes precedence)
    this.autoWhitelist.delete(domain);

    logger.info('Domain manually whitelisted:', domain);

    await this.save();
  }

  /**
   * Remove domain from whitelist
   * @param {string} domain - Domain to remove
   */
  async removeFromWhitelist(domain) {
    const wasAuto = this.autoWhitelist.has(domain);
    const wasManual = this.manualWhitelist.has(domain);

    this.autoWhitelist.delete(domain);
    this.manualWhitelist.delete(domain);

    if (wasAuto || wasManual) {
      logger.info('Domain removed from whitelist:', domain);
      await this.save();
    }
  }

  /**
   * Check if domain is trusted
   * @param {string} domain - Domain to check
   * @returns {boolean} - True if trusted
   */
  isTrusted(domain) {
    return this.autoWhitelist.has(domain) || this.manualWhitelist.has(domain);
  }

  /**
   * Check if domain is auto-whitelisted
   * @param {string} domain - Domain to check
   * @returns {boolean} - True if auto-whitelisted
   */
  isAutoTrusted(domain) {
    return this.autoWhitelist.has(domain);
  }

  /**
   * Check if domain is manually whitelisted
   * @param {string} domain - Domain to check
   * @returns {boolean} - True if manually whitelisted
   */
  isManuallyTrusted(domain) {
    return this.manualWhitelist.has(domain);
  }

  /**
   * Get confidence score for domain trustworthiness
   * @param {string} domain - Domain to score
   * @returns {number} - Confidence score 0-1
   */
  getConfidenceScore(domain) {
    // Manual whitelist = 1.0 confidence
    if (this.manualWhitelist.has(domain)) {
      return 1.0;
    }

    // Auto whitelist = 0.9 confidence
    if (this.autoWhitelist.has(domain)) {
      return 0.9;
    }

    // Not whitelisted - calculate based on visit data
    const visitData = this.visitHistory.get(domain);
    if (!visitData) {
      return 0.0;
    }

    // Calculate partial confidence based on how close to thresholds
    const visitProgress = Math.min(visitData.visits / this.thresholds.minVisits, 1.0);
    const avgTimeProgress = Math.min(visitData.avgTime / this.thresholds.minAvgTime, 1.0);
    const totalTimeProgress = Math.min(visitData.totalTime / this.thresholds.minTotalTime, 1.0);

    // Average of all progress metrics (0-0.8 range, 0.9+ reserved for whitelisted)
    const confidence = ((visitProgress + avgTimeProgress + totalTimeProgress) / 3) * 0.8;

    return confidence;
  }

  /**
   * Get all trusted sites
   * @returns {Array} - Array of { domain, type, confidence, visitData }
   */
  getAllTrustedSites() {
    const trusted = [];

    // Add manual whitelist
    for (const domain of this.manualWhitelist) {
      trusted.push({
        domain,
        type: 'manual',
        confidence: 1.0,
        visitData: this.visitHistory.get(domain) || null
      });
    }

    // Add auto whitelist
    for (const domain of this.autoWhitelist) {
      if (!this.manualWhitelist.has(domain)) { // Avoid duplicates
        trusted.push({
          domain,
          type: 'auto',
          confidence: 0.9,
          visitData: this.visitHistory.get(domain) || null
        });
      }
    }

    return trusted.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get statistics for UI display
   * @returns {Object} - Stats object
   */
  getStats() {
    return {
      totalTrustedSites: this.autoWhitelist.size + this.manualWhitelist.size,
      autoWhitelisted: this.autoWhitelist.size,
      manualWhitelisted: this.manualWhitelist.size,
      sitesTracked: this.visitHistory.size,
      closestToTrust: this.getClosestToTrust()
    };
  }

  /**
   * Get site closest to being auto-whitelisted
   * @returns {Object|null} - { domain, progress, visits, timeLeft }
   */
  getClosestToTrust() {
    let closest = null;
    let highestProgress = 0;

    for (const [domain, visitData] of this.visitHistory.entries()) {
      // Skip already whitelisted
      if (this.isTrusted(domain)) continue;

      const visitProgress = visitData.visits / this.thresholds.minVisits;
      const avgTimeProgress = visitData.avgTime / this.thresholds.minAvgTime;
      const totalTimeProgress = visitData.totalTime / this.thresholds.minTotalTime;

      const overallProgress = (visitProgress + avgTimeProgress + totalTimeProgress) / 3;

      if (overallProgress > highestProgress) {
        highestProgress = overallProgress;
        closest = {
          domain,
          progress: Math.round(overallProgress * 100),
          visits: visitData.visits,
          visitsNeeded: Math.max(0, this.thresholds.minVisits - visitData.visits),
          timeNeeded: Math.max(0, this.thresholds.minTotalTime - visitData.totalTime)
        };
      }
    }

    return closest;
  }

  /**
   * Show notification when domain is auto-whitelisted
   * @param {string} domain - Domain that was whitelisted
   */
  async showNotification(domain) {
    // Send message to background/popup to show notification
    try {
      await browser.runtime.sendMessage({
        type: 'TRUSTED_SITE_ADDED',
        domain: domain,
        message: `Added ${domain} to trusted sites`
      });
    } catch (error) {
      logger.debug('Could not send notification:', error.message);
    }
  }

  /**
   * Cleanup old visit data (older than 30 days)
   */
  async cleanup() {
    const thirtyDaysAgo = Date.now() - (this.thresholds.withinDays * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [domain, visitData] of this.visitHistory.entries()) {
      // Keep if recently visited
      if (visitData.lastVisit > thirtyDaysAgo) {
        continue;
      }

      // Keep if whitelisted
      if (this.isTrusted(domain)) {
        continue;
      }

      // Remove old data
      this.visitHistory.delete(domain);
      cleaned++;
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old visit records`);
      await this.save();
    }
  }

  /**
   * Save to storage
   */
  async save() {
    await storageManager.set({
      trustedSites: {
        visitHistory: Array.from(this.visitHistory.entries()),
        autoWhitelist: Array.from(this.autoWhitelist),
        manualWhitelist: Array.from(this.manualWhitelist)
      }
    });
  }

  /**
   * Reset all trusted sites data
   */
  async reset() {
    this.visitHistory.clear();
    this.autoWhitelist.clear();
    this.manualWhitelist.clear();

    await this.save();

    logger.info('Trusted sites data reset');
  }

  /**
   * Export data for backup
   * @returns {Object} - Export data
   */
  exportData() {
    return {
      visitHistory: Array.from(this.visitHistory.entries()),
      autoWhitelist: Array.from(this.autoWhitelist),
      manualWhitelist: Array.from(this.manualWhitelist),
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import data from backup
   * @param {Object} data - Import data
   */
  async importData(data) {
    this.visitHistory = new Map(data.visitHistory || []);
    this.autoWhitelist = new Set(data.autoWhitelist || []);
    this.manualWhitelist = new Set(data.manualWhitelist || []);

    await this.save();

    logger.info('Trusted sites data imported');
  }
}

// Export singleton instance
const trustedSitesManager = new TrustedSitesManager();
export default trustedSitesManager;
export { TrustedSitesManager };
