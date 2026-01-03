// PrivacyShield Max - Stats Tracker
// Track blocking statistics and performance metrics

import storageManager from '../core/storage-manager.js';
import logger from '../core/logger.js';
import { getBrowserAPI } from '../core/utils.js';

class StatsTracker {
  constructor() {
    this.browserAPI = getBrowserAPI();
    this.stats = {
      blocked: 0,
      tracked: 0,
      cnameUncloaked: 0,
      popupsBlocked: 0,
      notificationsBlocked: 0
    };

    this.performanceStats = {
      startTime: Date.now(),
      messagesProcessed: 0,
      rulesUpdated: 0,
      memoryUsage: 0,
      requestsAnalyzed: 0
    };

    this.domainStats = new Map(); // Per-domain statistics
  }

  /**
   * Initialize stats tracker
   */
  async initialize() {
    // Load saved stats
    const saved = await storageManager.getStats();
    this.stats = { ...this.stats, ...saved };

    // Start periodic save
    this.startPeriodicSave();

    // Start memory monitoring
    this.startMemoryMonitoring();

    logger.info('Stats tracker initialized', this.stats);
  }

  /**
   * Get current statistics
   * @returns {Object} - Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      performance: this.performanceStats
    };
  }

  /**
   * Get statistics for specific domain
   * @param {string} domain - Domain to get stats for
   * @returns {Object} - Domain statistics
   */
  getDomainStats(domain) {
    if (!this.domainStats.has(domain)) {
      this.domainStats.set(domain, {
        blocked: 0,
        tracked: 0,
        cnameUncloaked: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      });
    }

    return this.domainStats.get(domain);
  }

  /**
   * Increment stat counter
   * @param {string} stat - Stat name
   * @param {number} amount - Amount to increment
   */
  increment(stat, amount = 1) {
    if (this.stats.hasOwnProperty(stat)) {
      this.stats[stat] += amount;

      // Update badge
      this.updateBadge();

      logger.debug(`Stat incremented: ${stat} = ${this.stats[stat]}`);
    }
  }

  /**
   * Increment domain-specific stat
   * @param {string} domain - Domain name
   * @param {string} stat - Stat name
   * @param {number} amount - Amount to increment
   */
  incrementDomain(domain, stat, amount = 1) {
    const domainStats = this.getDomainStats(domain);
    domainStats[stat] = (domainStats[stat] || 0) + amount;
    domainStats.lastSeen = Date.now();
  }

  /**
   * Record blocking event
   * @param {string} type - Block type (ad, tracker, malware, etc.)
   * @param {string} url - Blocked URL
   * @param {string} domain - Domain
   * @param {string} reason - Block reason
   */
  async recordBlock(type, url, domain, reason = null) {
    // Increment global counter
    if (type === 'tracker' || type === 'privacy') {
      this.increment('tracked');
    } else {
      this.increment('blocked');
    }

    // Increment domain counter
    if (domain) {
      this.incrementDomain(domain, type === 'tracker' ? 'tracked' : 'blocked');
    }

    // Log the event
    await logger.logBlock(type, url, reason);

    this.performanceStats.requestsAnalyzed++;
  }

  /**
   * Record CNAME uncloaking
   * @param {string} domain - Original domain
   * @param {string} cname - Tracker CNAME
   */
  async recordCNAME(domain, cname) {
    this.increment('cnameUncloaked');
    this.incrementDomain(domain, 'cnameUncloaked');

    await logger.logCNAME(domain, cname);
  }

  /**
   * Record popup blocked
   */
  recordPopup() {
    this.increment('popupsBlocked');
  }

  /**
   * Update browser badge
   */
  async updateBadge() {
    if (!this.browserAPI || !this.browserAPI.action) {
      return;
    }

    const settings = await storageManager.getSettings();

    if (!settings.showBadgeCounter) {
      // Clear badge
      this.browserAPI.action.setBadgeText({ text: '' });
      return;
    }

    const total = this.stats.blocked + this.stats.tracked;

    // Format number for badge (999+ for large numbers)
    let badgeText = total.toString();
    if (total > 999) {
      badgeText = '999+';
    }

    // Set badge
    this.browserAPI.action.setBadgeText({ text: badgeText });
    this.browserAPI.action.setBadgeBackgroundColor({ color: '#dc2626' }); // Red
  }

  /**
   * Reset statistics
   */
  async reset() {
    this.stats = {
      blocked: 0,
      tracked: 0,
      cnameUncloaked: 0,
      popupsBlocked: 0,
      notificationsBlocked: 0
    };

    this.domainStats.clear();

    await storageManager.set(this.stats);
    this.updateBadge();

    logger.info('Statistics reset');
  }

  /**
   * Save statistics to storage
   */
  async save() {
    await storageManager.set(this.stats);
  }

  /**
   * Start periodic save (every 30 seconds)
   */
  startPeriodicSave() {
    setInterval(async () => {
      await this.save();
    }, 30000);
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    setInterval(() => {
      if (performance.memory) {
        this.performanceStats.memoryUsage = performance.memory.usedJSHeapSize;

        // Warn if memory usage is high
        if (this.performanceStats.memoryUsage > 150 * 1024 * 1024) {
          logger.warn('High memory usage:', this.performanceStats.memoryUsage);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Perform memory cleanup
   */
  performCleanup() {
    // Reduce stats if they're too large (prevent overflow)
    const maxValue = 1000000;

    Object.keys(this.stats).forEach(key => {
      if (this.stats[key] > maxValue) {
        this.stats[key] = Math.floor(this.stats[key] / 10);
        logger.info(`Stat ${key} reduced to prevent overflow`);
      }
    });

    // Clean up old domain stats (keep only last 1000)
    if (this.domainStats.size > 1000) {
      // Sort by lastSeen, keep most recent
      const sorted = Array.from(this.domainStats.entries())
        .sort((a, b) => b[1].lastSeen - a[1].lastSeen);

      this.domainStats.clear();
      sorted.slice(0, 1000).forEach(([domain, stats]) => {
        this.domainStats.set(domain, stats);
      });

      logger.info('Domain stats cleaned up');
    }

    // Force garbage collection if available
    if (typeof gc === 'function') {
      try {
        gc();
        logger.debug('Garbage collection performed');
      } catch (e) {
        // Ignore
      }
    }
  }

  /**
   * Get statistics report
   * @returns {Object} - Detailed statistics report
   */
  getReport() {
    const uptime = Date.now() - this.performanceStats.startTime;

    return {
      stats: this.stats,
      performance: {
        ...this.performanceStats,
        uptime,
        uptimeFormatted: this.formatUptime(uptime)
      },
      topBlockedDomains: this.getTopBlockedDomains(10)
    };
  }

  /**
   * Get top blocked domains
   * @param {number} limit - Number of domains to return
   * @returns {Array} - Array of {domain, blocked, tracked}
   */
  getTopBlockedDomains(limit = 10) {
    const domains = Array.from(this.domainStats.entries())
      .map(([domain, stats]) => ({
        domain,
        blocked: stats.blocked || 0,
        tracked: stats.tracked || 0,
        total: (stats.blocked || 0) + (stats.tracked || 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    return domains;
  }

  /**
   * Format uptime as human readable string
   * @param {number} ms - Uptime in milliseconds
   * @returns {string} - Formatted uptime
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Export singleton instance
const statsTracker = new StatsTracker();
export default statsTracker;
export { StatsTracker };
