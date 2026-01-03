// PrivacyShield - Storage Manager (Simplified)

import { DEFAULT_SETTINGS } from './constants.js';

const storage = chrome.storage.local;

/**
 * Get value from storage
 * @param {string|string[]|null} keys - Key(s) to retrieve
 * @returns {Promise<any>} - Stored value(s)
 */
export async function get(keys = null) {
  try {
    const result = await storage.get(keys);
    return keys && typeof keys === 'string' ? result[keys] : result;
  } catch (error) {
    console.error('Storage get error:', error);
    return keys && typeof keys === 'string' ? undefined : {};
  }
}

/**
 * Set value in storage
 * @param {Object} items - Key-value pairs to store
 * @returns {Promise<void>}
 */
export async function set(items) {
  try {
    await storage.set(items);
  } catch (error) {
    console.error('Storage set error:', error);
  }
}

/**
 * Remove keys from storage
 * @param {string|string[]} keys - Key(s) to remove
 * @returns {Promise<void>}
 */
export async function remove(keys) {
  try {
    await storage.remove(keys);
  } catch (error) {
    console.error('Storage remove error:', error);
  }
}

/**
 * Clear all storage
 * @returns {Promise<void>}
 */
export async function clear() {
  try {
    await storage.clear();
  } catch (error) {
    console.error('Storage clear error:', error);
  }
}

/**
 * Get settings with defaults
 * @returns {Promise<Object>} - Settings object
 */
export async function getSettings() {
  const stored = await get();
  return { ...DEFAULT_SETTINGS, ...stored };
}

/**
 * Update specific settings
 * @param {Object} updates - Settings to update
 * @returns {Promise<void>}
 */
export async function updateSettings(updates) {
  const current = await getSettings();
  const merged = { ...current, ...updates };
  await set(merged);
}

/**
 * Get whitelist
 * @returns {Promise<string[]>} - Array of whitelisted domains
 */
export async function getWhitelist() {
  const settings = await getSettings();
  return settings.whitelistedDomains || [];
}

/**
 * Add domain to whitelist
 * @param {string} domain - Domain to whitelist
 * @returns {Promise<void>}
 */
export async function addToWhitelist(domain) {
  const whitelist = await getWhitelist();
  if (!whitelist.includes(domain)) {
    whitelist.push(domain);
    await updateSettings({ whitelistedDomains: whitelist });
  }
}

/**
 * Remove domain from whitelist
 * @param {string} domain - Domain to remove
 * @returns {Promise<void>}
 */
export async function removeFromWhitelist(domain) {
  const whitelist = await getWhitelist();
  const filtered = whitelist.filter(d => d !== domain);
  await updateSettings({ whitelistedDomains: filtered });
}

/**
 * Check if domain is whitelisted
 * @param {string} domain - Domain to check
 * @returns {Promise<boolean>} - True if whitelisted
 */
export async function isWhitelisted(domain) {
  const whitelist = await getWhitelist();
  return whitelist.includes(domain);
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
