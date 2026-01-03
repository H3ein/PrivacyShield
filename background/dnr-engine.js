// PrivacyShield Max - DNR Engine
// Declarative Net Request rule management

import { RULE_ID_RANGES } from '../core/constants.js';
import { getBrowserAPI, matchesDomainPattern } from '../core/utils.js';
import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';

class DNREngine {
  constructor() {
    this.browserAPI = getBrowserAPI();
    this.enabledRulesets = new Set();
    this.dynamicRules = [];
    this.ruleCache = new Map();
  }

  /**
   * Initialize DNR engine
   */
  async initialize() {
    // Get enabled rulesets
    if (this.browserAPI && this.browserAPI.declarativeNetRequest) {
      try {
        const rulesets = await this.browserAPI.declarativeNetRequest.getEnabledRulesets();
        this.enabledRulesets = new Set(rulesets);

        // Get dynamic rules
        this.dynamicRules = await this.browserAPI.declarativeNetRequest.getDynamicRules();

        logger.info('DNR Engine initialized', {
          rulesets: rulesets.length,
          dynamicRules: this.dynamicRules.length
        });

        // Apply custom filters
        await this.applyCustomFilters();

      } catch (error) {
        logger.error('DNR initialization failed:', error);
      }
    } else {
      logger.warn('declarativeNetRequest API not available');
    }
  }

  /**
   * Enable ruleset
   * @param {string} rulesetId - Ruleset ID
   */
  async enableRuleset(rulesetId) {
    if (!this.browserAPI || !this.browserAPI.declarativeNetRequest) {
      logger.warn('declarativeNetRequest API not available');
      return;
    }

    try {
      await this.browserAPI.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: [rulesetId]
      });

      this.enabledRulesets.add(rulesetId);
      logger.info('Ruleset enabled:', rulesetId);

    } catch (error) {
      logger.error('Failed to enable ruleset:', error);
    }
  }

  /**
   * Disable ruleset
   * @param {string} rulesetId - Ruleset ID
   */
  async disableRuleset(rulesetId) {
    if (!this.browserAPI || !this.browserAPI.declarativeNetRequest) {
      logger.warn('declarativeNetRequest API not available');
      return;
    }

    try {
      await this.browserAPI.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: [rulesetId]
      });

      this.enabledRulesets.delete(rulesetId);
      logger.info('Ruleset disabled:', rulesetId);

    } catch (error) {
      logger.error('Failed to disable ruleset:', error);
    }
  }

  /**
   * Update dynamic rules
   * @param {Object} options - {addRules, removeRuleIds}
   */
  async updateDynamicRules(options) {
    if (!this.browserAPI || !this.browserAPI.declarativeNetRequest) {
      logger.warn('declarativeNetRequest API not available');
      return;
    }

    try {
      await this.browserAPI.declarativeNetRequest.updateDynamicRules(options);

      // Update cache
      if (options.removeRuleIds) {
        this.dynamicRules = this.dynamicRules.filter(
          rule => !options.removeRuleIds.includes(rule.id)
        );
      }

      if (options.addRules) {
        this.dynamicRules.push(...options.addRules);
      }

      logger.info('Dynamic rules updated', {
        added: options.addRules?.length || 0,
        removed: options.removeRuleIds?.length || 0
      });

    } catch (error) {
      logger.error('Failed to update dynamic rules:', error);
      throw error;
    }
  }

  /**
   * Apply custom filters from storage
   */
  async applyCustomFilters() {
    const customFilters = await storageManager.get('customFilters');

    if (!customFilters || customFilters.length === 0) {
      logger.debug('No custom filters to apply');
      return;
    }

    // Parse custom filters and convert to DNR rules
    const rules = this.parseCustomFilters(customFilters);

    // Remove existing custom rules
    const existingCustomRules = this.dynamicRules
      .filter(rule => rule.id >= RULE_ID_RANGES.CUSTOM_DYNAMIC.start &&
                      rule.id <= RULE_ID_RANGES.CUSTOM_DYNAMIC.end)
      .map(rule => rule.id);

    // Update dynamic rules
    await this.updateDynamicRules({
      removeRuleIds: existingCustomRules,
      addRules: rules
    });

    logger.info('Custom filters applied', { count: rules.length });
  }

  /**
   * Parse custom filters to DNR rules
   * @param {string[]} filters - Array of filter strings
   * @returns {Array} - Array of DNR rules
   */
  parseCustomFilters(filters) {
    const rules = [];
    let ruleId = RULE_ID_RANGES.CUSTOM_DYNAMIC.start;

    // Extract unique domains from filters
    const domains = new Set();

    filters.forEach(filter => {
      if (!filter || filter.startsWith('!') || filter.startsWith('#')) {
        return; // Skip comments and element hiding
      }

      // Parse domain-based filter: ||example.com^
      if (filter.startsWith('||') && filter.includes('^')) {
        const domain = filter.slice(2, filter.indexOf('^'));
        if (domain) {
          domains.add(domain);
        }
      }
    });

    // Convert domains to DNR rules
    domains.forEach(domain => {
      if (ruleId > RULE_ID_RANGES.CUSTOM_DYNAMIC.end) {
        logger.warn('Custom filter limit reached');
        return;
      }

      rules.push({
        id: ruleId++,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: `||${domain}^`,
          resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame']
        }
      });
    });

    return rules;
  }

  /**
   * Add tracking parameter stripping rules
   */
  async addParamStrippingRules() {
    const settings = await storageManager.getSettings();

    if (!settings.trackingParamStripping) {
      logger.debug('Tracking parameter stripping disabled');
      return;
    }

    const trackingParams = [
      'fbclid', 'gclid', 'msclkid', 'yclid', 'twclid',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'mc_eid', 'mc_cid', '_hsenc', '_hsmi', 'mkt_tok',
      'ref', 'referrer', 'source', 'campaign_id', 'ad_id'
    ];

    const rule = {
      id: RULE_ID_RANGES.TRACKING_PARAMS.start,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          transform: {
            queryTransform: {
              removeParams: trackingParams
            }
          }
        }
      },
      condition: {
        urlFilter: '*',
        resourceTypes: ['main_frame']
      }
    };

    // Remove existing param stripping rule
    const existingParamRules = this.dynamicRules
      .filter(r => r.id >= RULE_ID_RANGES.TRACKING_PARAMS.start &&
                   r.id <= RULE_ID_RANGES.TRACKING_PARAMS.end)
      .map(r => r.id);

    await this.updateDynamicRules({
      removeRuleIds: existingParamRules,
      addRules: [rule]
    });

    logger.info('Tracking parameter stripping enabled');
  }

  /**
   * Add HTTPS upgrade rule
   */
  async addHTTPSUpgradeRule() {
    const settings = await storageManager.getSettings();

    if (!settings.httpsEnforcement) {
      logger.debug('HTTPS enforcement disabled');
      return;
    }

    const rule = {
      id: RULE_ID_RANGES.HTTPS_UPGRADE.start,
      priority: 1,
      action: {
        type: 'upgradeScheme'
      },
      condition: {
        urlFilter: 'http://*',
        resourceTypes: ['main_frame', 'sub_frame']
      }
    };

    // Remove existing HTTPS upgrade rule
    const existingHTTPSRules = this.dynamicRules
      .filter(r => r.id >= RULE_ID_RANGES.HTTPS_UPGRADE.start &&
                   r.id <= RULE_ID_RANGES.HTTPS_UPGRADE.end)
      .map(r => r.id);

    await this.updateDynamicRules({
      removeRuleIds: existingHTTPSRules,
      addRules: [rule]
    });

    logger.info('HTTPS enforcement enabled');
  }

  /**
   * Check if URL should be blocked (for non-DNR checks)
   * @param {string} url - URL to check
   * @returns {Promise<boolean>} - True if should block
   */
  async shouldBlock(url) {
    // Check whitelist first
    const hostname = new URL(url).hostname;
    const domain = hostname.split('.').slice(-2).join('.');

    if (await storageManager.isWhitelisted(domain)) {
      return false;
    }

    // Check temporary whitelist
    if (await storageManager.isTemporarilyWhitelisted(domain)) {
      return false;
    }

    // Check cache
    if (this.ruleCache.has(url)) {
      const cached = this.ruleCache.get(url);
      if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
        return cached.shouldBlock;
      }
    }

    // DNR handles the actual blocking via rules
    // This is just for additional checks
    return false;
  }

  /**
   * Get enabled rulesets
   * @returns {Array} - Array of ruleset IDs
   */
  getEnabledRulesets() {
    return Array.from(this.enabledRulesets);
  }

  /**
   * Get dynamic rules count
   * @returns {number} - Number of dynamic rules
   */
  getDynamicRulesCount() {
    return this.dynamicRules.length;
  }

  /**
   * Get rule statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    return {
      enabledRulesets: this.enabledRulesets.size,
      dynamicRules: this.dynamicRules.length,
      cacheSize: this.ruleCache.size
    };
  }

  /**
   * Clear rule cache
   */
  clearCache() {
    this.ruleCache.clear();
    logger.debug('Rule cache cleared');
  }
}

// Export singleton instance
const dnrEngine = new DNREngine();
export default dnrEngine;
export { DNREngine };
