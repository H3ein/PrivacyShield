// PrivacyShield Max - Filter Updater
// Auto-update filter lists from trusted sources

import { FILTER_SOURCES } from '../core/constants.js';
import { getBrowserAPI, calculateSHA256 } from '../core/utils.js';
import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';
import dnrEngine from './dnr-engine.js';

class FilterUpdater {
  constructor() {
    this.browserAPI = getBrowserAPI();
    this.updating = false;
    this.lastUpdate = null;
    this.updateInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.updateTimer = null;
  }

  /**
   * Initialize filter updater
   */
  async initialize() {
    const settings = await storageManager.getSettings();
    const stored = await storageManager.get('lastFilterUpdate');

    this.lastUpdate = stored ? new Date(stored) : null;

    if (settings.autoUpdateFilters) {
      logger.info('Filter auto-update enabled');
      await this.scheduleUpdates();

      // Check if update is needed on startup
      if (this.shouldUpdate()) {
        await this.updateFilters();
      }
    } else {
      logger.info('Filter auto-update disabled');
    }
  }

  /**
   * Check if filter update is needed
   * @returns {boolean} - True if update needed
   */
  shouldUpdate() {
    if (!this.lastUpdate) return true;

    const timeSinceUpdate = Date.now() - this.lastUpdate.getTime();
    return timeSinceUpdate >= this.updateInterval;
  }

  /**
   * Schedule automatic filter updates
   */
  async scheduleUpdates() {
    // Clear existing timer
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    // Check for updates every hour
    this.updateTimer = setInterval(async () => {
      if (this.shouldUpdate()) {
        await this.updateFilters();
      }
    }, 60 * 60 * 1000); // Check every hour

    logger.debug('Filter update scheduler started');
  }

  /**
   * Update all filter lists
   */
  async updateFilters() {
    if (this.updating) {
      logger.warn('Filter update already in progress');
      return { success: false, reason: 'Update already in progress' };
    }

    this.updating = true;
    logger.info('Starting filter update...');

    try {
      const settings = await storageManager.getSettings();
      const results = {
        success: true,
        updated: [],
        failed: [],
        totalRules: 0,
        timestamp: new Date().toISOString()
      };

      // Fetch all enabled filter sources
      const sources = Object.entries(FILTER_SOURCES)
        .filter(([id, source]) => source.enabled !== false);

      for (const [id, source] of sources) {
        try {
          logger.info(`Fetching filter list: ${id}`);

          const filterContent = await this.fetchFilterList(source);
          const rules = this.parseFilterList(filterContent, id);

          // Save to dynamic cache
          await this.saveToDynamicCache(id, rules);

          results.updated.push({
            id,
            url: source.url,
            ruleCount: rules.length
          });

          results.totalRules += rules.length;

          logger.info(`Filter list ${id} updated: ${rules.length} rules`);

        } catch (error) {
          logger.error(`Failed to update filter list ${id}:`, error);
          results.failed.push({
            id,
            error: error.message
          });
        }
      }

      // Compile and optimize all rules
      if (results.updated.length > 0) {
        await this.compileAndApplyRules();
      }

      // Update last update timestamp
      this.lastUpdate = new Date();
      await storageManager.set({ lastFilterUpdate: this.lastUpdate.toISOString() });

      // Show notification (silent badge update)
      if (this.browserAPI && this.browserAPI.action) {
        this.browserAPI.action.setBadgeText({ text: '✓' });
        setTimeout(() => {
          this.browserAPI.action.setBadgeText({ text: '' });
        }, 3000);
      }

      logger.info('Filter update completed', results);
      return results;

    } catch (error) {
      logger.error('Filter update failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };

    } finally {
      this.updating = false;
    }
  }

  /**
   * Fetch filter list from URL
   * @param {Object} source - Filter source config
   * @returns {Promise<string>} - Filter content
   */
  async fetchFilterList(source) {
    // HTTPS only (security)
    if (!source.url.startsWith('https://')) {
      throw new Error('Filter source must use HTTPS');
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds

    try {
      const response = await fetch(source.url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'User-Agent': 'PrivacyShield Max (Filter Update)'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();

      // Verify checksum if provided
      if (source.checksum) {
        await this.verifyChecksum(content, source.checksum);
      }

      return content;

    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Verify checksum of downloaded content
   * @param {string} content - Content to verify
   * @param {string} checksumUrl - Checksum URL
   */
  async verifyChecksum(content, checksumUrl) {
    try {
      const response = await fetch(checksumUrl, {
        signal: AbortSignal.timeout(10000)
      });

      const expectedChecksum = (await response.text()).trim().split(/\s+/)[0];
      const actualChecksum = await calculateSHA256(content);

      if (actualChecksum !== expectedChecksum) {
        throw new Error('Checksum verification failed');
      }

      logger.debug('Checksum verified successfully');

    } catch (error) {
      logger.warn('Checksum verification failed:', error);
      // Don't throw - allow update to proceed with warning
    }
  }

  /**
   * Parse filter list content
   * @param {string} content - Filter list content
   * @param {string} sourceId - Source identifier
   * @returns {Array} - Parsed rules
   */
  parseFilterList(content, sourceId) {
    const lines = content.split('\n');
    const rules = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('!') || line.startsWith('[')) {
        continue;
      }

      // Skip element hiding rules (## syntax)
      if (line.includes('##') || line.includes('#@#')) {
        continue;
      }

      // Parse domain-based blocking rules
      if (line.startsWith('||') && line.includes('^')) {
        const domain = line.slice(2, line.indexOf('^'));

        // Skip invalid domains
        if (!domain || domain.includes('/')) {
          continue;
        }

        rules.push({
          type: 'block',
          domain: domain,
          source: sourceId,
          original: line
        });
      }

      // Parse exception rules (whitelist)
      else if (line.startsWith('@@')) {
        const rest = line.slice(2);
        if (rest.startsWith('||') && rest.includes('^')) {
          const domain = rest.slice(2, rest.indexOf('^'));

          if (domain && !domain.includes('/')) {
            rules.push({
              type: 'allow',
              domain: domain,
              source: sourceId,
              original: line
            });
          }
        }
      }

      // Parse simple URL patterns
      else if (line.startsWith('/') && line.endsWith('/')) {
        // Regex pattern - skip for now (complex to convert to DNR)
        continue;
      }
    }

    logger.debug(`Parsed ${rules.length} rules from ${sourceId}`);
    return rules;
  }

  /**
   * Save rules to dynamic cache
   * @param {string} sourceId - Source identifier
   * @param {Array} rules - Parsed rules
   */
  async saveToDynamicCache(sourceId, rules) {
    const cacheKey = `filter_cache_${sourceId}`;
    await storageManager.set({
      [cacheKey]: {
        rules,
        timestamp: Date.now(),
        count: rules.length
      }
    });
  }

  /**
   * Load rules from cache
   * @param {string} sourceId - Source identifier
   * @returns {Promise<Array>} - Cached rules
   */
  async loadFromCache(sourceId) {
    const cacheKey = `filter_cache_${sourceId}`;
    const cached = await storageManager.get(cacheKey);

    if (!cached || !cached.rules) {
      return [];
    }

    return cached.rules;
  }

  /**
   * Compile and apply all rules
   */
  async compileAndApplyRules() {
    logger.info('Compiling and optimizing rules...');

    const allRules = [];

    // Load all cached rules
    for (const sourceId of Object.keys(FILTER_SOURCES)) {
      const rules = await this.loadFromCache(sourceId);
      allRules.push(...rules);
    }

    logger.info(`Total rules loaded: ${allRules.length}`);

    // Deduplicate by domain
    const uniqueDomains = new Map();
    for (const rule of allRules) {
      const key = `${rule.type}:${rule.domain}`;
      if (!uniqueDomains.has(key)) {
        uniqueDomains.set(key, rule);
      }
    }

    const deduplicatedRules = Array.from(uniqueDomains.values());
    logger.info(`After deduplication: ${deduplicatedRules.length} rules`);

    // Prioritize rules (malware > tracking > ads)
    const prioritized = this.prioritizeRules(deduplicatedRules);

    // Limit to top 30,000 rules (Chrome MV3 limit)
    const topRules = prioritized.slice(0, 30000);

    logger.info(`Optimized to top ${topRules.length} rules`);

    // Convert to DNR format
    const dnrRules = this.convertToDNR(topRules);

    // Save compiled rules
    await storageManager.set({
      compiled_rules: {
        rules: dnrRules,
        count: dnrRules.length,
        timestamp: Date.now()
      }
    });

    logger.info('Rules compiled and saved');
  }

  /**
   * Prioritize rules by category and prevalence
   * @param {Array} rules - Rules to prioritize
   * @returns {Array} - Sorted rules
   */
  prioritizeRules(rules) {
    return rules
      .map(rule => {
        let score = 0;

        // Category scoring
        if (rule.source === 'malware') score += 1000;
        else if (rule.source === 'nocoin') score += 900;
        else if (rule.source.includes('privacy')) score += 500;
        else if (rule.source.includes('easy')) score += 100;

        // Known high-priority trackers
        const highPriorityDomains = [
          'doubleclick.net', 'facebook.com', 'google-analytics.com',
          'googlesyndication.com', 'googleadservices.com'
        ];

        if (highPriorityDomains.some(d => rule.domain.includes(d))) {
          score += 200;
        }

        return { ...rule, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Convert rules to DNR format
   * @param {Array} rules - Rules to convert
   * @returns {Array} - DNR rules
   */
  convertToDNR(rules) {
    const dnrRules = [];
    let ruleId = 10000; // Start from 10000 for auto-updated rules

    for (const rule of rules) {
      if (ruleId > 40000) break; // Reserve 40001+ for custom rules

      dnrRules.push({
        id: ruleId++,
        priority: rule.score || 1,
        action: {
          type: rule.type === 'allow' ? 'allow' : 'block'
        },
        condition: {
          urlFilter: `||${rule.domain}^`,
          resourceTypes: [
            'script',
            'image',
            'xmlhttprequest',
            'sub_frame',
            'stylesheet',
            'font',
            'media'
          ]
        }
      });
    }

    return dnrRules;
  }

  /**
   * Get update status
   * @returns {Object} - Update status
   */
  getStatus() {
    return {
      lastUpdate: this.lastUpdate,
      updating: this.updating,
      nextUpdate: this.lastUpdate
        ? new Date(this.lastUpdate.getTime() + this.updateInterval)
        : null
    };
  }

  /**
   * Force immediate update
   */
  async forceUpdate() {
    logger.info('Forcing immediate filter update');
    return await this.updateFilters();
  }

  /**
   * Stop auto-updates
   */
  stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      logger.info('Auto-update stopped');
    }
  }
}

// Export singleton instance
const filterUpdater = new FilterUpdater();
export default filterUpdater;
export { FilterUpdater };
