// PrivacyShield Max - Performance Tracker
// Track page load speed improvements and bandwidth savings

import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';

class PerformanceTracker {
  constructor() {
    this.pageLoads = new Map();        // url → { loadTime, blockedCount, timestamp }
    this.blockedRequests = new Map();  // url → [blocked request data]
    this.performanceHistory = [];      // Last 100 page loads
    this.maxHistorySize = 100;

    // Cumulative stats
    this.totalBandwidthSaved = 0;      // Bytes
    this.totalTimeSaved = 0;           // Milliseconds
    this.totalRequestsBlocked = 0;
  }

  /**
   * Initialize performance tracker
   */
  async initialize() {
    const stored = await storageManager.get('performanceData');

    if (stored) {
      this.performanceHistory = stored.performanceHistory || [];
      this.totalBandwidthSaved = stored.totalBandwidthSaved || 0;
      this.totalTimeSaved = stored.totalTimeSaved || 0;
      this.totalRequestsBlocked = stored.totalRequestsBlocked || 0;
    }

    logger.info('Performance Tracker initialized', {
      historySize: this.performanceHistory.length,
      totalBandwidthSaved: this.formatBytes(this.totalBandwidthSaved),
      totalTimeSaved: this.totalTimeSaved + 'ms'
    });
  }

  /**
   * Track a page load
   * @param {string} url - Page URL
   * @param {number} loadTime - Page load time in milliseconds
   * @param {number} blockedCount - Number of requests blocked
   */
  async trackPageLoad(url, loadTime, blockedCount) {
    const domain = this.extractDomain(url);

    const pageData = {
      url,
      domain,
      loadTime,
      blockedCount,
      timestamp: Date.now()
    };

    this.pageLoads.set(url, pageData);

    // Add to history
    this.performanceHistory.push(pageData);

    // Keep only last 100
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }

    logger.debug('Page load tracked:', {
      domain,
      loadTime: loadTime + 'ms',
      blockedCount
    });

    await this.save();
  }

  /**
   * Track a blocked request
   * @param {Object} request - Request details
   */
  async trackBlockedRequest(request) {
    const {url, type, size, initiator, timestamp} = request;

    // Estimate size if not provided
    const estimatedSize = size || this.estimateRequestSize(type);

    // Estimate time saved (based on size and average connection speed)
    const timeSaved = this.estimateTimeSaved(estimatedSize);

    // Store blocked request
    const blockedData = {
      url,
      type,
      size: estimatedSize,
      timeSaved,
      initiator,
      timestamp: timestamp || Date.now()
    };

    const initiatorDomain = this.extractDomain(initiator);
    if (!this.blockedRequests.has(initiatorDomain)) {
      this.blockedRequests.set(initiatorDomain, []);
    }
    this.blockedRequests.get(initiatorDomain).push(blockedData);

    // Update cumulative stats
    this.totalBandwidthSaved += estimatedSize;
    this.totalTimeSaved += timeSaved;
    this.totalRequestsBlocked++;

    logger.debug('Blocked request tracked:', {
      type,
      size: this.formatBytes(estimatedSize),
      timeSaved: timeSaved + 'ms'
    });

    // Save periodically (every 10 blocks)
    if (this.totalRequestsBlocked % 10 === 0) {
      await this.save();
    }
  }

  /**
   * Estimate request size based on type
   * @param {string} type - Request type
   * @returns {number} - Estimated size in bytes
   */
  estimateRequestSize(type) {
    const estimates = {
      script: 50000,           // 50KB average
      stylesheet: 30000,       // 30KB
      image: 100000,           // 100KB
      media: 1000000,          // 1MB
      font: 80000,             // 80KB
      xmlhttprequest: 5000,    // 5KB
      fetch: 5000,             // 5KB
      document: 100000,        // 100KB
      subdocument: 100000,     // 100KB
      ping: 500,               // 500B
      beacon: 500,             // 500B
      other: 10000             // 10KB
    };

    return estimates[type] || estimates.other;
  }

  /**
   * Estimate time saved by blocking request
   * @param {number} size - Size in bytes
   * @returns {number} - Estimated time in milliseconds
   */
  estimateTimeSaved(size) {
    // Assume average connection speed of 10 Mbps (1.25 MB/s)
    const bytesPerMs = 1250; // 1.25 MB/s = 1250 bytes/ms
    const downloadTime = size / bytesPerMs;

    // Add ~50ms for DNS/connection overhead
    const overhead = 50;

    return Math.round(downloadTime + overhead);
  }

  /**
   * Get performance stats for a specific page
   * @param {string} url - Page URL
   * @returns {Object|null} - Performance stats
   */
  getPageStats(url) {
    const pageData = this.pageLoads.get(url);
    if (!pageData) return null;

    const domain = this.extractDomain(url);
    const blockedRequests = this.blockedRequests.get(domain) || [];

    // Calculate savings for this page
    const bandwidthSaved = blockedRequests.reduce((sum, req) => sum + req.size, 0);
    const timeSaved = blockedRequests.reduce((sum, req) => sum + req.timeSaved, 0);

    return {
      url,
      domain,
      loadTime: pageData.loadTime,
      blockedCount: blockedRequests.length,
      bandwidthSaved,
      timeSaved,
      bandwidthSavedFormatted: this.formatBytes(bandwidthSaved),
      timeSavedFormatted: this.formatTime(timeSaved),
      timestamp: pageData.timestamp
    };
  }

  /**
   * Get current page stats (most recent page load)
   * @returns {Object|null} - Current page stats
   */
  getCurrentPageStats() {
    if (this.performanceHistory.length === 0) {
      return null;
    }

    const latest = this.performanceHistory[this.performanceHistory.length - 1];
    return this.getPageStats(latest.url);
  }

  /**
   * Get overall performance stats
   * @returns {Object} - Overall stats
   */
  getPerformanceStats() {
    return {
      totalBandwidthSaved: this.totalBandwidthSaved,
      totalTimeSaved: this.totalTimeSaved,
      totalRequestsBlocked: this.totalRequestsBlocked,
      totalPagesTracked: this.performanceHistory.length,

      // Formatted versions
      bandwidthSavedFormatted: this.formatBytes(this.totalBandwidthSaved),
      timeSavedFormatted: this.formatTime(this.totalTimeSaved),

      // Averages
      avgBandwidthPerPage: this.performanceHistory.length > 0
        ? this.totalBandwidthSaved / this.performanceHistory.length
        : 0,
      avgTimePerPage: this.performanceHistory.length > 0
        ? this.totalTimeSaved / this.performanceHistory.length
        : 0,
      avgBlockedPerPage: this.performanceHistory.length > 0
        ? this.totalRequestsBlocked / this.performanceHistory.length
        : 0,

      // Recent performance (last 10 pages)
      recentPerformance: this.getRecentPerformance(10)
    };
  }

  /**
   * Get recent performance data
   * @param {number} count - Number of recent pages
   * @returns {Array} - Recent page performance
   */
  getRecentPerformance(count = 10) {
    const recent = this.performanceHistory.slice(-count);

    return recent.map(page => {
      const blockedRequests = this.blockedRequests.get(page.domain) || [];
      const bandwidthSaved = blockedRequests.reduce((sum, req) => sum + req.size, 0);
      const timeSaved = blockedRequests.reduce((sum, req) => sum + req.timeSaved, 0);

      return {
        domain: page.domain,
        loadTime: page.loadTime,
        blockedCount: page.blockedCount,
        bandwidthSaved,
        timeSaved,
        timestamp: page.timestamp
      };
    });
  }

  /**
   * Get performance comparison (with vs without blocking)
   * @param {string} url - Page URL
   * @returns {Object} - Comparison data
   */
  getPerformanceComparison(url) {
    const stats = this.getPageStats(url);
    if (!stats) return null;

    // Estimate load time without blocking
    const loadTimeWithoutBlocking = stats.loadTime + stats.timeSaved;

    return {
      withBlocking: {
        loadTime: stats.loadTime,
        bandwidth: 0, // Requests were blocked
        requests: 0
      },
      withoutBlocking: {
        loadTime: loadTimeWithoutBlocking,
        bandwidth: stats.bandwidthSaved,
        requests: stats.blockedCount
      },
      improvement: {
        timeFaster: stats.timeSaved,
        timeFasterPercent: (stats.timeSaved / loadTimeWithoutBlocking * 100).toFixed(1),
        bandwidthSaved: stats.bandwidthSaved,
        requestsBlocked: stats.blockedCount
      }
    };
  }

  /**
   * Format bytes to human-readable format
   * @param {number} bytes - Bytes
   * @returns {string} - Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Format time to human-readable format
   * @param {number} ms - Milliseconds
   * @returns {string} - Formatted string
   */
  formatTime(ms) {
    if (ms < 1000) {
      return Math.round(ms) + 'ms';
    }

    const seconds = ms / 1000;
    if (seconds < 60) {
      return seconds.toFixed(1) + 's';
    }

    const minutes = seconds / 60;
    return minutes.toFixed(1) + 'm';
  }

  /**
   * Extract domain from URL
   * @param {string} url - URL
   * @returns {string} - Domain
   */
  extractDomain(url) {
    if (!url) return '';

    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return url;
    }
  }

  /**
   * Clear blocked requests for a domain (when page unloads)
   * @param {string} domain - Domain to clear
   */
  clearDomainData(domain) {
    this.blockedRequests.delete(domain);
    this.pageLoads.delete(domain);
  }

  /**
   * Save to storage
   */
  async save() {
    // Only save cumulative stats and recent history (not all blocked requests)
    await storageManager.set({
      performanceData: {
        performanceHistory: this.performanceHistory,
        totalBandwidthSaved: this.totalBandwidthSaved,
        totalTimeSaved: this.totalTimeSaved,
        totalRequestsBlocked: this.totalRequestsBlocked
      }
    });
  }

  /**
   * Reset all performance data
   */
  async reset() {
    this.pageLoads.clear();
    this.blockedRequests.clear();
    this.performanceHistory = [];
    this.totalBandwidthSaved = 0;
    this.totalTimeSaved = 0;
    this.totalRequestsBlocked = 0;

    await this.save();

    logger.info('Performance data reset');
  }

  /**
   * Export data for backup
   * @returns {Object} - Export data
   */
  exportData() {
    return {
      performanceHistory: this.performanceHistory,
      totalBandwidthSaved: this.totalBandwidthSaved,
      totalTimeSaved: this.totalTimeSaved,
      totalRequestsBlocked: this.totalRequestsBlocked,
      stats: this.getPerformanceStats(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import data from backup
   * @param {Object} data - Import data
   */
  async importData(data) {
    this.performanceHistory = data.performanceHistory || [];
    this.totalBandwidthSaved = data.totalBandwidthSaved || 0;
    this.totalTimeSaved = data.totalTimeSaved || 0;
    this.totalRequestsBlocked = data.totalRequestsBlocked || 0;

    await this.save();

    logger.info('Performance data imported');
  }
}

// Export singleton instance
const performanceTracker = new PerformanceTracker();
export default performanceTracker;
export { PerformanceTracker };
