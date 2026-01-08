// PrivacyShield - Storage Manager (Simplified)

import { DEFAULT_SETTINGS } from './constants.js';

const storage = chrome.storage.local;

// Error handling utilities for storage
const StorageErrorHandler = {
  log: (context, error, fallback = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] PrivacyShield Storage Error [${context}]:`, error);
    if (fallback) {
      console.warn(`[${timestamp}] PrivacyShield Storage Fallback [${context}]:`, fallback);
    }
    return fallback;
  },
  
  safeExecute: async (context, fn, fallback = null) => {
    try {
      return await fn();
    } catch (error) {
      return StorageErrorHandler.log(context, error, fallback);
    }
  },
  
  validateInput: (context, input, validator, fallback = null) => {
    try {
      if (!validator(input)) {
        throw new Error(`Invalid input: ${JSON.stringify(input)}`);
      }
      return input;
    } catch (error) {
      return StorageErrorHandler.log(context, error, fallback);
    }
  },
  
  checkStorageAPI: () => {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      throw new Error('Chrome storage API not available');
    }
    return true;
  },
  
  getSafeDefaults: (key = null) => {
    const safeDefaults = {
      'enabled': null, // Don't default to true, preserve user choice
      'fingerprintProtection': true,
      'blockThirdPartyCookies': false,
      'learningEnabled': null, // Don't default to true, preserve user choice
      'whitelistedDomains': [],
      'trackersBlocked': 0,
      'adsBlocked': 0,
      'fingerprintsBlocked': 0
    };
    
    if (key && typeof key === 'string') {
      return safeDefaults[key] !== undefined ? safeDefaults[key] : undefined;
    }
    return safeDefaults;
  }
};

/**
 * Get value from storage
 * @param {string|string[]|null} keys - Key(s) to retrieve
 * @returns {Promise<any>} - Stored value(s)
 */
export async function get(keys = null) {
  return StorageErrorHandler.safeExecute('storage.get', async () => {
    StorageErrorHandler.checkStorageAPI();
    
    const result = await storage.get(keys);
    return keys && typeof keys === 'string' ? result[keys] : result;
  }, StorageErrorHandler.getSafeDefaults(keys)).then(fallback => {
    if (fallback === StorageErrorHandler.getSafeDefaults(keys)) {
      // Storage API not available or error occurred
      return fallback;
    }
    return fallback;
  });
}

/**
 * Set value in storage
 * @param {Object} items - Key-value pairs to store
 * @returns {Promise<void>}
 */
export async function set(items) {
  return StorageErrorHandler.safeExecute('storage.set', async () => {
    StorageErrorHandler.checkStorageAPI();
    
    const validItems = StorageErrorHandler.validateInput('storage.set.items', items,
      (items) => items && typeof items === 'object', {});
    
    // Validate items before storing
    const validatedItems = {};
    for (const [key, value] of Object.entries(validItems)) {
      if (StorageErrorHandler.validateInput('storage.set.key', key,
          (key) => typeof key === 'string' && key.length > 0 && key.length <= 255)) {
        validatedItems[key] = value;
      }
    }
    
    if (Object.keys(validatedItems).length > 0) {
      await storage.set(validatedItems);
      return true;
    }
    
    return false;
  }, false);
}

/**
 * Remove keys from storage
 * @param {string|string[]} keys - Key(s) to remove
 * @returns {Promise<void>}
 */
export async function remove(keys) {
  return StorageErrorHandler.safeExecute('storage.remove', async () => {
    StorageErrorHandler.checkStorageAPI();
    
    const validKeys = StorageErrorHandler.validateInput('storage.remove.keys', keys,
      (keys) => keys && (typeof keys === 'string' || (Array.isArray(keys) && keys.length > 0)), []);
    
    await storage.remove(validKeys);
    return true;
  }, false);
}

/**
 * Clear all storage
 * @returns {Promise<void>}
 */
export async function clear() {
  return StorageErrorHandler.safeExecute('storage.clear', async () => {
    StorageErrorHandler.checkStorageAPI();
    
    await storage.clear();
    console.log('PrivacyShield: All storage cleared');
    return true;
  }, false);
}

/**
 * Get settings with defaults
 * @returns {Promise<Object>} - Settings object
 */
export async function getSettings() {
  return StorageErrorHandler.safeExecute('storage.getSettings', async () => {
    const stored = await get();
    
    // Only use defaults for missing settings, not to override existing ones
    const settings = { ...DEFAULT_SETTINGS };
    
    // Copy stored settings, but preserve user choice for enabled
    if (stored && typeof stored === 'object') {
      for (const [key, value] of Object.entries(stored)) {
        if (key === 'enabled') {
          // Only set enabled if it's explicitly stored as boolean
          if (typeof value === 'boolean') {
            settings.enabled = value;
          }
          // If enabled is not stored or not boolean, keep current state
        } else {
          // For other settings, use stored value or default
          settings[key] = value !== undefined ? value : DEFAULT_SETTINGS[key];
        }
      }
    }
    
    // Validate critical settings (except enabled which we handle specially)
    if (typeof settings.fingerprintProtection !== 'boolean') {
      settings.fingerprintProtection = DEFAULT_SETTINGS.fingerprintProtection;
    }
    if (!Array.isArray(settings.whitelistedDomains)) {
      settings.whitelistedDomains = DEFAULT_SETTINGS.whitelistedDomains;
    }
    
    console.log('PrivacyShield: Final settings:', settings);
    return settings;
  }, DEFAULT_SETTINGS);
}

/**
 * Update specific settings
 * @param {Object} updates - Settings to update
 * @returns {Promise<void>}
 */
export async function updateSettings(updates) {
  return StorageErrorHandler.safeExecute('storage.updateSettings', async () => {
    const validUpdates = StorageErrorHandler.validateInput('storage.updateSettings.updates', updates,
      (updates) => updates && typeof updates === 'object', {});
    
    const current = await getSettings();
    const merged = { ...current, ...validUpdates };
    
    // Validate the merged settings before saving
    const validated = {};
    for (const [key, value] of Object.entries(merged)) {
      if (key in DEFAULT_SETTINGS) {
        // Type validation based on defaults
        if (typeof DEFAULT_SETTINGS[key] === typeof value || value === undefined) {
          validated[key] = value;
        } else {
          console.warn('PrivacyShield: Invalid type for setting', key, 'using default');
          validated[key] = DEFAULT_SETTINGS[key];
        }
      } else {
        console.warn('PrivacyShield: Unknown setting key', key, 'skipping');
      }
    }
    
    const success = await set(validated);
    return success;
  }, false);
}

/**
 * Get whitelist
 * @returns {Promise<string[]>} - Array of whitelisted domains
 */
export async function getWhitelist() {
  return StorageErrorHandler.safeExecute('storage.getWhitelist', async () => {
    const settings = await getSettings();
    const whitelist = settings.whitelistedDomains || [];
    
    // Validate whitelist format
    if (!Array.isArray(whitelist)) {
      console.warn('PrivacyShield: Invalid whitelist format, using empty array');
      return [];
    }
    
    // Filter out invalid entries
    const validWhitelist = whitelist.filter(domain => {
      return StorageErrorHandler.validateInput('whitelist.domain', domain,
        (domain) => typeof domain === 'string' && domain.length > 0 && domain.length <= 255, false);
    });
    
    if (validWhitelist.length !== whitelist.length) {
      console.warn('PrivacyShield: Removed invalid whitelist entries');
      // Update storage with cleaned whitelist
      await updateSettings({ whitelistedDomains: validWhitelist });
    }
    
    return validWhitelist;
  }, []);
}

/**
 * Add domain to whitelist
 * @param {string} domain - Domain to whitelist
 * @returns {Promise<void>}
 */
export async function addToWhitelist(domain) {
  return StorageErrorHandler.safeExecute('storage.addToWhitelist', async () => {
    const validDomain = StorageErrorHandler.validateInput('storage.addToWhitelist.domain', domain,
      (domain) => domain && typeof domain === 'string', null);
    
    if (!validDomain) {
      throw new Error('Invalid domain provided to addToWhitelist');
    }
    
    // Clean and validate domain
    const cleanDomain = validDomain.trim().toLowerCase();
    if (cleanDomain.length === 0 || cleanDomain.length > 255) {
      throw new Error(`Domain length invalid: ${cleanDomain}`);
    }
    
    const whitelist = await getWhitelist();
    if (!whitelist.includes(cleanDomain)) {
      whitelist.push(cleanDomain);
      const success = await updateSettings({ whitelistedDomains: whitelist });
      if (success) {
        console.log('PrivacyShield: Added to whitelist:', cleanDomain);
      }
      return success;
    }
    
    return true; // Already in whitelist
  }, false);
}

/**
 * Remove domain from whitelist
 * @param {string} domain - Domain to remove
 * @returns {Promise<void>}
 */
export async function removeFromWhitelist(domain) {
  return StorageErrorHandler.safeExecute('storage.removeFromWhitelist', async () => {
    const validDomain = StorageErrorHandler.validateInput('storage.removeFromWhitelist.domain', domain,
      (domain) => domain && typeof domain === 'string', null);
    
    if (!validDomain) {
      throw new Error('Invalid domain provided to removeFromWhitelist');
    }
    
    const cleanDomain = validDomain.trim().toLowerCase();
    const whitelist = await getWhitelist();
    const filtered = whitelist.filter(d => d !== cleanDomain);
    
    if (filtered.length !== whitelist.length) {
      const success = await updateSettings({ whitelistedDomains: filtered });
      if (success) {
        console.log('PrivacyShield: Removed from whitelist:', cleanDomain);
      }
      return success;
    }
    
    return true; // Domain not in whitelist
  }, false);
}

/**
 * Check if domain is whitelisted
 * @param {string} domain - Domain to check
 * @returns {Promise<boolean>} - True if whitelisted
 */
export async function isWhitelisted(domain) {
  return StorageErrorHandler.safeExecute('storage.isWhitelisted', async () => {
    const validDomain = StorageErrorHandler.validateInput('storage.isWhitelisted.domain', domain,
      (domain) => domain && typeof domain === 'string', null);
    
    if (!validDomain) {
      return false; // Safe default: not whitelisted
    }
    
    const cleanDomain = validDomain.trim().toLowerCase();
    const whitelist = await getWhitelist();
    return whitelist.includes(cleanDomain);
  }, false);
}

export default {
  get,
  set,
  remove,
  clear,
  getSettings,
  updateSettings,
  getWhitelist,
  addToWhitelist,
  removeFromWhitelist,
  isWhitelisted
};
