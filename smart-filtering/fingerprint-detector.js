// PrivacyShield Max - Fingerprint Detector
// Detect active fingerprinting attempts in real-time

import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';

class FingerprintDetector {
  constructor() {
    this.enabled = true;
    this.attempts = [];
    this.apiCallCounts = new Map();
    this.thresholds = {
      canvas: 3,
      webgl: 3,
      audio: 2,
      fonts: 5
    };
  }

  /**
   * Initialize fingerprint detector
   */
  async initialize() {
    const settings = await storageManager.getSettings();
    this.enabled = settings.smartFiltering?.enabled !== false;

    if (!this.enabled) {
      logger.info('Fingerprint detection disabled');
      return;
    }

    // Monitor API calls
    this.monitorCanvasAPI();
    this.monitorWebGLAPI();
    this.monitorAudioAPI();
    this.monitorFontAPI();

    logger.info('Fingerprint detector initialized');
  }

  /**
   * Monitor Canvas API usage
   */
  monitorCanvasAPI() {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      this.trackAPICall('canvas', 'toDataURL');
      return originalToDataURL.apply(this, args);
    }.bind(this);

    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      this.trackAPICall('canvas', 'getImageData');
      return originalGetImageData.apply(this, args);
    }.bind(this);
  }

  /**
   * Monitor WebGL API usage
   */
  monitorWebGLAPI() {
    const getParameter = WebGLRenderingContext.prototype.getParameter;

    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // Track vendor/renderer queries (fingerprinting indicators)
      if (parameter === 37445 || parameter === 37446) {
        this.trackAPICall('webgl', 'getParameter (vendor/renderer)');
      }

      return getParameter.apply(this, arguments);
    }.bind(this);

    // Also monitor getSupportedExtensions
    const getSupportedExtensions = WebGLRenderingContext.prototype.getSupportedExtensions;

    WebGLRenderingContext.prototype.getSupportedExtensions = function() {
      this.trackAPICall('webgl', 'getSupportedExtensions');
      return getSupportedExtensions.apply(this, arguments);
    }.bind(this);
  }

  /**
   * Monitor Audio API usage
   */
  monitorAudioAPI() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const originalCreateOscillator = AudioContext.prototype.createOscillator;
    const originalCreateAnalyser = AudioContext.prototype.createAnalyser;

    AudioContext.prototype.createOscillator = function() {
      this.trackAPICall('audio', 'createOscillator');
      return originalCreateOscillator.apply(this, arguments);
    }.bind(this);

    AudioContext.prototype.createAnalyser = function() {
      this.trackAPICall('audio', 'createAnalyser');
      return originalCreateAnalyser.apply(this, arguments);
    }.bind(this);
  }

  /**
   * Monitor Font API usage
   */
  monitorFontAPI() {
    const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;

    CanvasRenderingContext2D.prototype.measureText = function(...args) {
      this.trackAPICall('fonts', 'measureText');
      return originalMeasureText.apply(this, args);
    }.bind(this);
  }

  /**
   * Track API call and detect fingerprinting
   * @param {string} category - API category
   * @param {string} method - Method name
   */
  trackAPICall(category, method) {
    const key = `${category}:${method}`;
    const count = (this.apiCallCounts.get(key) || 0) + 1;
    this.apiCallCounts.set(key, count);

    // Count total calls for this category
    let categoryTotal = 0;
    for (const [apiKey, apiCount] of this.apiCallCounts.entries()) {
      if (apiKey.startsWith(category + ':')) {
        categoryTotal += apiCount;
      }
    }

    // Check if threshold exceeded
    const threshold = this.thresholds[category] || 5;

    if (categoryTotal >= threshold) {
      this.recordFingerprintAttempt(category, method, categoryTotal);
    }
  }

  /**
   * Record fingerprinting attempt
   * @param {string} category - API category
   * @param {string} method - Method name
   * @param {number} count - Call count
   */
  recordFingerprintAttempt(category, method, count) {
    const domain = window.location.hostname;

    // Check if already recorded for this page
    const existing = this.attempts.find(
      a => a.domain === domain && a.category === category
    );

    if (existing) {
      existing.count = count;
      existing.lastDetected = Date.now();
      return;
    }

    const attempt = {
      domain,
      category,
      method,
      count,
      url: window.location.href,
      detected: Date.now(),
      lastDetected: Date.now()
    };

    this.attempts.push(attempt);

    logger.warn('Fingerprinting attempt detected:', {
      domain,
      category,
      count
    });

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'FINGERPRINT_DETECTED',
      data: attempt
    });
  }

  /**
   * Get fingerprinting statistics for current page
   * @returns {Object} - Fingerprinting stats
   */
  getPageStats() {
    const domain = window.location.hostname;
    const pageAttempts = this.attempts.filter(a => a.domain === domain);

    const stats = {
      domain,
      totalAttempts: pageAttempts.length,
      categories: {},
      severity: 'none'
    };

    // Group by category
    for (const attempt of pageAttempts) {
      if (!stats.categories[attempt.category]) {
        stats.categories[attempt.category] = {
          count: 0,
          calls: 0
        };
      }

      stats.categories[attempt.category].count++;
      stats.categories[attempt.category].calls += attempt.count;
    }

    // Determine severity
    const vectorCount = Object.keys(stats.categories).length;

    if (vectorCount >= 4) {
      stats.severity = 'high';
    } else if (vectorCount >= 2) {
      stats.severity = 'medium';
    } else if (vectorCount >= 1) {
      stats.severity = 'low';
    }

    return stats;
  }

  /**
   * Get all fingerprinting attempts
   * @returns {Array} - Array of attempts
   */
  getAllAttempts() {
    return [...this.attempts];
  }

  /**
   * Clear fingerprinting history
   */
  clearHistory() {
    this.attempts = [];
    this.apiCallCounts.clear();
    logger.debug('Fingerprint detection history cleared');
  }

  /**
   * Get summary report
   * @returns {Object} - Summary report
   */
  getSummary() {
    const domainCounts = new Map();

    for (const attempt of this.attempts) {
      const count = domainCounts.get(attempt.domain) || 0;
      domainCounts.set(attempt.domain, count + 1);
    }

    const topDomains = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, attempts: count }));

    return {
      totalAttempts: this.attempts.length,
      uniqueDomains: domainCounts.size,
      topDomains,
      apiCallCounts: Object.fromEntries(this.apiCallCounts)
    };
  }

  /**
   * Check if domain is actively fingerprinting
   * @param {string} domain - Domain to check
   * @returns {boolean} - True if fingerprinting
   */
  isFingerprinting(domain = window.location.hostname) {
    const recent = this.attempts.filter(a =>
      a.domain === domain &&
      Date.now() - a.lastDetected < 60000 // Last minute
    );

    return recent.length >= 2;
  }
}

// Export singleton instance
const fingerprintDetector = new FingerprintDetector();
export default fingerprintDetector;
export { FingerprintDetector };
