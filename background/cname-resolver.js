// PrivacyShield Max - CNAME Resolver
// DNS-over-HTTPS resolver for CNAME uncloaking

import { getBrowserAPI } from '../core/utils.js';
import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';

class CNAMEResolver {
  constructor() {
    this.browserAPI = getBrowserAPI();
    this.dohProvider = 'https://cloudflare-dns.com/dns-query';
    this.cache = new Map(); // 24-hour TTL
    this.enabled = true;

    // Known tracker CNAME patterns
    this.knownTrackerCNAMEs = [
      /2o7\.net$/,           // Adobe Analytics
      /omtrdc\.net$/,        // Adobe Marketing Cloud
      /demdex\.net$/,        // Adobe Audience Manager
      /adsrvr\.org$/,        // The Trade Desk
      /doubleclick\.net$/,   // Google DoubleClick
      /googleadservices\.com$/, // Google Ads
      /facebook\.net$/,      // Facebook tracking
      /fbcdn\.net$/,         // Facebook CDN
      /analytics\.google\.com$/, // Google Analytics
      /googlesyndication\.com$/, // Google Ad Syndication
      /amazon-adsystem\.com$/, // Amazon Ads
      /serving-sys\.com$/,   // Sizmek
      /adnxs\.com$/,         // AppNexus
      /pubmatic\.com$/,      // PubMatic
      /rubiconproject\.com$/, // Rubicon
      /chartbeat\.com$/,     // Chartbeat
      /newrelic\.com$/,      // New Relic (sometimes used for tracking)
      /scorecardresearch\.com$/, // comScore
      /quantserve\.com$/,    // Quantcast
      /krxd\.net$/,          // Salesforce DMP
      /turn\.com$/,          // Turn (Amobee)
      /mathtag\.com$/,       // MediaMath
      /rlcdn\.com$/,         // LiveRamp
      /bluekai\.com$/        // Oracle BlueKai
    ];
  }

  /**
   * Initialize CNAME resolver
   */
  async initialize() {
    const settings = await storageManager.getSettings();
    this.enabled = settings.cnameUncloaking || false;

    logger.info('CNAME Resolver initialized', { enabled: this.enabled });
  }

  /**
   * Enable/disable CNAME uncloaking
   * @param {boolean} enabled - Enable CNAME uncloaking
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    logger.info('CNAME uncloaking', enabled ? 'enabled' : 'disabled');
  }

  /**
   * Resolve CNAME records for a domain
   * @param {string} domain - Domain to resolve
   * @returns {Promise<string[]>} - Array of CNAME records
   */
  async resolveCNAME(domain) {
    if (!this.enabled) {
      return [];
    }

    // Check cache first
    if (this.cache.has(domain)) {
      const cached = this.cache.get(domain);
      if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        logger.debug('CNAME cache hit:', domain);
        return cached.cnames;
      } else {
        // Expired cache entry
        this.cache.delete(domain);
      }
    }

    try {
      // Query DNS-over-HTTPS
      const response = await fetch(
        `${this.dohProvider}?name=${encodeURIComponent(domain)}&type=CNAME`,
        {
          headers: { 'Accept': 'application/dns-json' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }
      );

      if (!response.ok) {
        logger.warn('CNAME resolution failed:', response.status);
        return [];
      }

      const data = await response.json();

      // Extract CNAME records (type 5 in DNS)
      const cnames = data.Answer
        ? data.Answer
            .filter(answer => answer.type === 5)
            .map(answer => answer.data.replace(/\.$/, '')) // Remove trailing dot
        : [];

      // Cache result
      this.cache.set(domain, {
        cnames,
        timestamp: Date.now()
      });

      logger.debug('CNAME resolved:', { domain, cnames });
      return cnames;

    } catch (error) {
      logger.error('CNAME resolution error:', error);

      // Cache empty result to avoid repeated failures
      this.cache.set(domain, {
        cnames: [],
        timestamp: Date.now()
      });

      return [];
    }
  }

  /**
   * Check if domain is a tracker via CNAME
   * @param {string} domain - Domain to check
   * @returns {Promise<Object>} - { isTracker, trackerCNAME, confidence }
   */
  async detectTracking(domain) {
    if (!this.enabled) {
      return { isTracker: false };
    }

    try {
      const cnames = await this.resolveCNAME(domain);

      if (!cnames || cnames.length === 0) {
        return { isTracker: false };
      }

      // Check each CNAME against known tracker patterns
      for (const cname of cnames) {
        for (const pattern of this.knownTrackerCNAMEs) {
          if (pattern.test(cname)) {
            logger.info('CNAME tracker detected:', {
              domain,
              trackerCNAME: cname
            });

            return {
              isTracker: true,
              trackerCNAME: cname,
              confidence: 0.95,
              reason: 'Known tracker CNAME pattern'
            };
          }
        }
      }

      // Check for suspicious patterns (first-party subdomain pointing to third-party)
      const domainParts = domain.split('.');
      const baseDomain = domainParts.slice(-2).join('.');

      for (const cname of cnames) {
        const cnameParts = cname.split('.');
        const cnameBaseDomain = cnameParts.slice(-2).join('.');

        // If CNAME points to different domain, might be tracking
        if (baseDomain !== cnameBaseDomain) {
          logger.info('Suspicious CNAME detected:', {
            domain,
            trackerCNAME: cname,
            reason: 'Cross-domain CNAME'
          });

          return {
            isTracker: true,
            trackerCNAME: cname,
            confidence: 0.7,
            reason: 'Cross-domain CNAME (possible tracker)'
          };
        }
      }

      return { isTracker: false };

    } catch (error) {
      logger.error('CNAME tracking detection error:', error);
      return { isTracker: false };
    }
  }

  /**
   * Batch resolve multiple domains
   * @param {string[]} domains - Array of domains
   * @returns {Promise<Map>} - Map of domain -> CNAME results
   */
  async batchResolve(domains) {
    const results = new Map();

    // Process in batches of 10 to avoid overwhelming DoH provider
    const batchSize = 10;
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      const promises = batch.map(async domain => {
        const result = await this.detectTracking(domain);
        results.set(domain, result);
      });

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Clear CNAME cache
   */
  clearCache() {
    this.cache.clear();
    logger.debug('CNAME cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([domain, data]) => ({
        domain,
        cnames: data.cnames,
        age: Date.now() - data.timestamp
      }))
    };
  }

  /**
   * Add custom tracker CNAME pattern
   * @param {string|RegExp} pattern - Pattern to add
   */
  addTrackerPattern(pattern) {
    if (typeof pattern === 'string') {
      pattern = new RegExp(pattern.replace(/\./g, '\\.') + '$');
    }

    this.knownTrackerCNAMEs.push(pattern);
    logger.info('Custom tracker pattern added:', pattern);
  }

  /**
   * Perform cache cleanup (remove expired entries)
   */
  performCleanup() {
    const now = Date.now();
    const ttl = 24 * 60 * 60 * 1000; // 24 hours
    let removed = 0;

    for (const [domain, data] of this.cache.entries()) {
      if (now - data.timestamp > ttl) {
        this.cache.delete(domain);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug(`CNAME cache cleanup: ${removed} expired entries removed`);
    }

    // Limit cache size to 5000 entries
    if (this.cache.size > 5000) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, this.cache.size - 5000);
      toRemove.forEach(([domain]) => this.cache.delete(domain));

      logger.info(`CNAME cache size limited: ${toRemove.length} old entries removed`);
    }
  }
}

// Export singleton instance
const cnameResolver = new CNAMEResolver();
export default cnameResolver;
export { CNAMEResolver };
