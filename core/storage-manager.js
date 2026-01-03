// PrivacyShield Max - Storage Manager
// Centralized storage operations with migration handling

import { DEFAULT_SETTINGS, VERSION } from './constants.js';
import { getBrowserAPI, deepClone } from './utils.js';

class StorageManager {
  constructor() {
    this.browserAPI = getBrowserAPI();
    this.cache = new Map();
    this.listeners = new Map();
  }

  /**
   * Initialize storage with default settings
   */
  async initialize() {
    const stored = await this.get('version');

    if (!stored || stored.version !== VERSION) {
      await this.migrate(stored ? stored.version : null);
    }

    console.log('PrivacyShield Max - Storage initialized (version:', VERSION, ')');
  }

  /**
   * Get value(s) from storage
   * @param {string|string[]|null} keys - Key(s) to retrieve
   * @returns {Promise<any>} - Stored value(s)
   */
  async get(keys = null) {
    if (!this.browserAPI || !this.browserAPI.storage) {
      console.warn('Storage API not available');
      return {};
    }

    try {
      const result = await this.browserAPI.storage.local.get(keys);
      return keys && typeof keys === 'string' ? result[keys] : result;
    } catch (error) {
      console.error('Storage get error:', error);
      return keys && typeof keys === 'string' ? undefined : {};
    }
  }

  /**
   * Set value(s) in storage
   * @param {Object} items - Key-value pairs to store
   * @returns {Promise<void>}
   */
  async set(items) {
    if (!this.browserAPI || !this.browserAPI.storage) {
      console.warn('Storage API not available');
      return;
    }

    try {
      await this.browserAPI.storage.local.set(items);

      // Update cache
      Object.keys(items).forEach(key => {
        this.cache.set(key, items[key]);
      });

      // Notify listeners
      this.notifyListeners(items);

    } catch (error) {
      console.error('Storage set error:', error);
    }
  }

  /**
   * Remove key(s) from storage
   * @param {string|string[]} keys - Key(s) to remove
   * @returns {Promise<void>}
   */
  async remove(keys) {
    if (!this.browserAPI || !this.browserAPI.storage) {
      console.warn('Storage API not available');
      return;
    }

    try {
      await this.browserAPI.storage.local.remove(keys);

      // Update cache
      const keyArray = Array.isArray(keys) ? keys : [keys];
      keyArray.forEach(key => this.cache.delete(key));

    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }

  /**
   * Clear all storage
   * @returns {Promise<void>}
   */
  async clear() {
    if (!this.browserAPI || !this.browserAPI.storage) {
      console.warn('Storage API not available');
      return;
    }

    try {
      await this.browserAPI.storage.local.clear();
      this.cache.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  /**
   * Get settings with defaults
   * @returns {Promise<Object>} - Settings object
   */
  async getSettings() {
    const stored = await this.get();
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  /**
   * Update specific settings
   * @param {Object} updates - Settings to update
   * @returns {Promise<void>}
   */
  async updateSettings(updates) {
    const current = await this.getSettings();
    const merged = { ...current, ...updates };
    await this.set(merged);
  }

  /**
   * Get statistics
   * @returns {Promise<Object>} - Statistics object
   */
  async getStats() {
    const stats = await this.get(['blocked', 'tracked', 'cnameUncloaked', 'popupsBlocked']);
    return {
      blocked: stats.blocked || 0,
      tracked: stats.tracked || 0,
      cnameUncloaked: stats.cnameUncloaked || 0,
      popupsBlocked: stats.popupsBlocked || 0
    };
  }

  /**
   * Update statistics
   * @param {Object} updates - Stats to update
   * @returns {Promise<void>}
   */
  async updateStats(updates) {
    const current = await this.getStats();
    const merged = { ...current, ...updates };
    await this.set(merged);
  }

  /**
   * Increment stat counter
   * @param {string} stat - Stat name
   * @param {number} amount - Amount to increment
   * @returns {Promise<void>}
   */
  async incrementStat(stat, amount = 1) {
    const current = await this.getStats();
    current[stat] = (current[stat] || 0) + amount;
    await this.set({ [stat]: current[stat] });
  }

  /**
   * Get whitelist
   * @returns {Promise<string[]>} - Array of whitelisted domains
   */
  async getWhitelist() {
    const result = await this.get('whitelist');
    return result || [];
  }

  /**
   * Add domain to whitelist
   * @param {string} domain - Domain to whitelist
   * @returns {Promise<void>}
   */
  async addToWhitelist(domain) {
    const whitelist = await this.getWhitelist();
    if (!whitelist.includes(domain)) {
      whitelist.push(domain);
      await this.set({ whitelist });
    }
  }

  /**
   * Remove domain from whitelist
   * @param {string} domain - Domain to remove
   * @returns {Promise<void>}
   */
  async removeFromWhitelist(domain) {
    const whitelist = await this.getWhitelist();
    const filtered = whitelist.filter(d => d !== domain);
    await this.set({ whitelist: filtered });
  }

  /**
   * Check if domain is whitelisted
   * @param {string} domain - Domain to check
   * @returns {Promise<boolean>} - True if whitelisted
   */
  async isWhitelisted(domain) {
    const whitelist = await this.getWhitelist();
    return whitelist.some(pattern => {
      if (pattern === domain) return true;
      if (pattern.startsWith('*.')) {
        return domain.endsWith(pattern.slice(1));
      }
      return false;
    });
  }

  /**
   * Get temporary whitelist entries
   * @returns {Promise<Object>} - Map of domain -> expiry timestamp
   */
  async getTemporaryWhitelist() {
    const result = await this.get('temporaryWhitelist');
    return result || {};
  }

  /**
   * Add domain to temporary whitelist
   * @param {string} domain - Domain to whitelist
   * @param {number} duration - Duration in ms
   * @returns {Promise<void>}
   */
  async addToTemporaryWhitelist(domain, duration = 3600000) {
    const temp = await this.getTemporaryWhitelist();
    temp[domain] = Date.now() + duration;
    await this.set({ temporaryWhitelist: temp });
  }

  /**
   * Check if domain is temporarily whitelisted
   * @param {string} domain - Domain to check
   * @returns {Promise<boolean>} - True if temporarily whitelisted
   */
  async isTemporarilyWhitelisted(domain) {
    const temp = await this.getTemporaryWhitelist();

    if (temp[domain]) {
      if (Date.now() < temp[domain]) {
        return true;
      } else {
        // Expired, remove it
        delete temp[domain];
        await this.set({ temporaryWhitelist: temp });
      }
    }

    return false;
  }

  /**
   * Clean up expired temporary whitelist entries
   * @returns {Promise<void>}
   */
  async cleanupTemporaryWhitelist() {
    const temp = await this.getTemporaryWhitelist();
    const now = Date.now();
    let changed = false;

    Object.keys(temp).forEach(domain => {
      if (temp[domain] < now) {
        delete temp[domain];
        changed = true;
      }
    });

    if (changed) {
      await this.set({ temporaryWhitelist: temp });
    }
  }

  /**
   * Export all data
   * @returns {Promise<Object>} - All stored data
   */
  async exportData() {
    const data = await this.get();
    return deepClone(data);
  }

  /**
   * Import data (with validation)
   * @param {Object} data - Data to import
   * @returns {Promise<void>}
   */
  async importData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid import data');
    }

    // Validate critical fields
    if (data.whitelist && !Array.isArray(data.whitelist)) {
      throw new Error('Invalid whitelist data');
    }

    if (data.customFilters && !Array.isArray(data.customFilters)) {
      throw new Error('Invalid custom filters data');
    }

    // Merge with current data (preserve version)
    const current = await this.get();
    const merged = {
      ...current,
      ...data,
      version: VERSION // Always use current version
    };

    await this.set(merged);
  }

  /**
   * Migrate from old version
   * @param {string|null} oldVersion - Old version string
   * @returns {Promise<void>}
   */
  async migrate(oldVersion) {
    console.log('PrivacyShield Max - Migrating from version:', oldVersion || 'none');

    const stored = await this.get();

    // Apply default settings
    const migrated = { ...DEFAULT_SETTINGS, ...stored };

    // Version-specific migrations
    if (!oldVersion || oldVersion.startsWith('1.')) {
      // Migrate from 1.x to 2.0

      // Rename old settings if they exist
      if (stored.fingerprintingProtection !== undefined) {
        migrated.fingerprintingProtection = stored.fingerprintingProtection;
      }

      // Initialize new features with defaults
      migrated.cnameUncloaking = true;
      migrated.trackingParamStripping = true;

      console.log('Migrated from 1.x to 2.0');
    }

    // Always update version
    migrated.version = VERSION;

    // Save migrated data
    await this.set(migrated);

    console.log('Migration complete');
  }

  /**
   * Add change listener
   * @param {string} key - Key to listen for
   * @param {Function} callback - Callback function
   */
  addListener(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  /**
   * Remove change listener
   * @param {string} key - Key to remove listener from
   * @param {Function} callback - Callback function
   */
  removeListener(key, callback) {
    if (this.listeners.has(key)) {
      const callbacks = this.listeners.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify listeners of changes
   * @param {Object} changes - Changed items
   */
  notifyListeners(changes) {
    Object.keys(changes).forEach(key => {
      if (this.listeners.has(key)) {
        this.listeners.get(key).forEach(callback => {
          try {
            callback(changes[key]);
          } catch (error) {
            console.error('Listener error:', error);
          }
        });
      }
    });
  }
}

// Export singleton instance
const storageManager = new StorageManager();
export default storageManager;
export { StorageManager };
