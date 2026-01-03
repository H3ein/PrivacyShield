// PrivacyShield Max - Request Analyzer
// Analyze and make blocking decisions for web requests

import { getBrowserAPI, extractHostname, extractDomain } from '../core/utils.js';
import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';
import dnrEngine from './dnr-engine.js';
import cnameResolver from './cname-resolver.js';
import statsTracker from './stats-tracker.js';

class RequestAnalyzer {
  constructor() {
    this.browserAPI = getBrowserAPI();
    this.requestCache = new Map();
    this.cacheSize = 10000;
    this.cacheTTL = 3600000; // 1 hour
    this.isFirefox = false;
  }

  /**
   * Initialize request analyzer
   */
  async initialize() {
    // Detect browser
    this.isFirefox = navigator.userAgent.includes('Firefox');

    if (this.isFirefox) {
      // Firefox uses webRequest API
      this.setupWebRequestListener();
    } else {
      // Chrome uses DNR (already handled by dnr-engine)
      logger.info('Using DNR for request blocking (Chrome)');
    }

    // Start cache cleanup
    this.startCacheCleanup();

    logger.info('Request analyzer initialized', {
      browser: this.isFirefox ? 'Firefox' : 'Chrome'
    });
  }

  /**
   * Setup webRequest listener (Firefox only)
   */
  setupWebRequestListener() {
    if (!this.browserAPI || !this.browserAPI.webRequest) {
      logger.warn('webRequest API not available');
      return;
    }

    this.browserAPI.webRequest.onBeforeRequest.addListener(
      (details) => this.onBeforeRequest(details),
      { urls: ['<all_urls>'] },
      ['blocking']
    );

    logger.info('webRequest listener configured (Firefox)');
  }

  /**
   * Handle incoming request (Firefox)
   * @param {Object} details - Request details
   * @returns {Object} - { cancel: boolean }
   */
  async onBeforeRequest(details) {
    const result = await this.analyzeRequest(details);

    if (result.shouldBlock) {
      logger.debug('Blocking request:', details.url);
      statsTracker.recordBlock(
        result.type || 'ad',
        details.url,
        extractHostname(details.url),
        result.reason
      );
      return { cancel: true };
    }

    return { cancel: false };
  }

  /**
   * Analyze request and determine if it should be blocked
   * @param {Object} details - Request details
   * @returns {Promise<Object>} - { shouldBlock, reason, type }
   */
  async analyzeRequest(details) {
    const url = details.url;
    const hostname = extractHostname(url);
    const domain = extractDomain(hostname);

    if (!hostname || !domain) {
      return { shouldBlock: false };
    }

    // Check cache first
    const cached = this.getCachedResult(url);
    if (cached !== null) {
      return cached;
    }

    const result = await this.performAnalysis(url, hostname, domain, details);

    // Cache result
    this.cacheResult(url, result);

    return result;
  }

  /**
   * Perform comprehensive analysis
   * @param {string} url - Request URL
   * @param {string} hostname - Hostname
   * @param {string} domain - Base domain
   * @param {Object} details - Request details
   * @returns {Promise<Object>} - Analysis result
   */
  async performAnalysis(url, hostname, domain, details) {
    const settings = await storageManager.getSettings();

    // Check if extension is enabled
    if (!settings.enabled) {
      return { shouldBlock: false };
    }

    // Check whitelist first
    if (await this.isWhitelisted(domain, details)) {
      return { shouldBlock: false, reason: 'whitelisted' };
    }

    // Check temporary whitelist
    if (await storageManager.isTemporarilyWhitelisted(domain)) {
      return { shouldBlock: false, reason: 'temporary_whitelist' };
    }

    // Check if first-party request
    if (this.isFirstParty(url, details)) {
      return { shouldBlock: false, reason: 'first_party' };
    }

    // Check DNR rules (Chrome) or internal rules (Firefox)
    const dnrCheck = await dnrEngine.shouldBlock(url);
    if (dnrCheck) {
      return {
        shouldBlock: true,
        reason: 'dnr_rule',
        type: 'ad'
      };
    }

    // CNAME uncloaking check (third-party only)
    if (settings.cnameUncloaking && details.type !== 'main_frame') {
      const cnameCheck = await cnameResolver.detectTracking(hostname);
      if (cnameCheck.isTracker) {
        statsTracker.recordCNAME(domain, cnameCheck.trackerCNAME);
        return {
          shouldBlock: true,
          reason: 'cname_tracker',
          type: 'tracker',
          details: cnameCheck
        };
      }
    }

    // Check known tracking domains
    if (this.isKnownTracker(hostname)) {
      return {
        shouldBlock: true,
        reason: 'known_tracker',
        type: 'tracker'
      };
    }

    // Check for crypto mining
    if (this.isCryptoMiner(url, hostname)) {
      return {
        shouldBlock: true,
        reason: 'crypto_miner',
        type: 'malware'
      };
    }

    // Check for suspicious patterns
    const suspiciousCheck = this.checkSuspiciousPatterns(url);
    if (suspiciousCheck.suspicious) {
      return {
        shouldBlock: true,
        reason: suspiciousCheck.reason,
        type: 'privacy'
      };
    }

    return { shouldBlock: false };
  }

  /**
   * Check if domain is whitelisted
   * @param {string} domain - Domain to check
   * @param {Object} details - Request details
   * @returns {Promise<boolean>} - True if whitelisted
   */
  async isWhitelisted(domain, details) {
    // Check global whitelist
    if (await storageManager.isWhitelisted(domain)) {
      return true;
    }

    // Check top 100 sites whitelist (banking, etc.)
    const settings = await storageManager.getSettings();
    if (settings.whitelistTop100) {
      const top100 = [
        'chase.com', 'bankofamerica.com', 'wellsfargo.com',
        'paypal.com', 'amazon.com', 'apple.com', 'microsoft.com',
        'netflix.com', 'spotify.com', 'youtube.com'
        // ... add more
      ];

      if (top100.some(d => domain.endsWith(d))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if request is first-party
   * @param {string} url - Request URL
   * @param {Object} details - Request details
   * @returns {boolean} - True if first-party
   */
  isFirstParty(url, details) {
    const requestDomain = extractDomain(extractHostname(url));

    // Extract initiator/documentUrl domain
    const initiator = details.initiator || details.documentUrl;
    if (!initiator) return false;

    const initiatorDomain = extractDomain(extractHostname(initiator));

    return requestDomain === initiatorDomain;
  }

  /**
   * Check if hostname is a known tracker
   * @param {string} hostname - Hostname to check
   * @returns {boolean} - True if known tracker
   */
  isKnownTracker(hostname) {
    const knownTrackers = [
      'doubleclick.net',
      'google-analytics.com',
      'googletagmanager.com',
      'facebook.net',
      'connect.facebook.net',
      'scorecardresearch.com',
      'quantserve.com',
      'chartbeat.com',
      'newrelic.com',
      'hotjar.com',
      'mouseflow.com',
      'crazyegg.com',
      'mixpanel.com',
      'segment.com',
      'amplitude.com'
    ];

    return knownTrackers.some(tracker => hostname.includes(tracker));
  }

  /**
   * Check if URL is a crypto miner
   * @param {string} url - URL to check
   * @param {string} hostname - Hostname
   * @returns {boolean} - True if crypto miner
   */
  isCryptoMiner(url, hostname) {
    const minerDomains = [
      'coinhive.com',
      'coin-hive.com',
      'crypto-loot.com',
      'cryptoloot.pro',
      'webminerpool.com',
      'webminepool.com',
      'minero.cc',
      'jsecoin.com',
      'ppoi.org',
      'reasedoper.pw',
      'mataharirama.xyz',
      'listat.biz',
      'lmodr.biz',
      'monerominer.rocks',
      'cryptonight.wasm'
    ];

    return minerDomains.some(miner => hostname.includes(miner)) ||
           url.includes('crypto') && url.includes('mine');
  }

  /**
   * Check for suspicious URL patterns
   * @param {string} url - URL to check
   * @returns {Object} - { suspicious, reason }
   */
  checkSuspiciousPatterns(url) {
    // Check for tracking parameters
    const trackingParams = [
      'fbclid', 'gclid', 'msclkid', 'yclid',
      'utm_source', 'utm_medium', 'utm_campaign'
    ];

    for (const param of trackingParams) {
      if (url.includes(`${param}=`)) {
        return {
          suspicious: false, // Don't block, just strip (handled by DNR)
          reason: 'tracking_parameter'
        };
      }
    }

    // Check for fingerprinting scripts
    if (url.includes('fingerprint') || url.includes('device-id')) {
      return {
        suspicious: true,
        reason: 'fingerprinting_script'
      };
    }

    // Check for pixel trackers
    if (url.match(/\.(gif|png|jpg)\?.*track/i)) {
      return {
        suspicious: true,
        reason: 'tracking_pixel'
      };
    }

    return { suspicious: false };
  }

  /**
   * Get cached analysis result
   * @param {string} url - URL to check
   * @returns {Object|null} - Cached result or null
   */
  getCachedResult(url) {
    const cached = this.requestCache.get(url);

    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.requestCache.delete(url);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache analysis result
   * @param {string} url - URL
   * @param {Object} result - Analysis result
   */
  cacheResult(url, result) {
    // Limit cache size
    if (this.requestCache.size >= this.cacheSize) {
      // Remove oldest entry
      const firstKey = this.requestCache.keys().next().value;
      this.requestCache.delete(firstKey);
    }

    this.requestCache.set(url, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Start cache cleanup timer
   */
  startCacheCleanup() {
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    let removed = 0;

    for (const [url, data] of this.requestCache.entries()) {
      if (now - data.timestamp > this.cacheTTL) {
        this.requestCache.delete(url);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug(`Request cache cleanup: ${removed} expired entries removed`);
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.requestCache.clear();
    logger.debug('Request cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    return {
      size: this.requestCache.size,
      maxSize: this.cacheSize,
      ttl: this.cacheTTL
    };
  }

  /**
   * Analyze multiple requests in batch
   * @param {Array} requests - Array of request details
   * @returns {Promise<Array>} - Array of analysis results
   */
  async analyzeBatch(requests) {
    const promises = requests.map(req => this.analyzeRequest(req));
    return await Promise.all(promises);
  }
}

// Export singleton instance
const requestAnalyzer = new RequestAnalyzer();
export default requestAnalyzer;
export { RequestAnalyzer };
