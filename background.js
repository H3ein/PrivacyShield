// PrivacyShield - Background Service Worker (MV3)

import { MESSAGE_TYPES } from './src/core/constants.js';
import * as storage from './src/core/storage.js';
import { extractDomain, extractHostname } from './src/core/utils.js';
import * as trackerBlocker from './src/privacy/tracker-blocker.js';
import * as stats from './src/privacy/stats.js';

/**
 * Initialize extension
 */
async function initialize() {
  console.log('PrivacyShield: Initializing...');

  // Initialize modules
  await trackerBlocker.initialize();
  await stats.initialize();

  // Load settings and apply
  const settings = await storage.getSettings();
  await applySettings(settings);

  console.log('PrivacyShield: Ready');
}

/**
 * Apply settings (enable/disable features)
 */
async function applySettings(settings) {
  // Enable/disable DNR rulesets based on settings
  if (settings.blockAds) {
    await trackerBlocker.enableRuleset('ads');
  } else {
    await trackerBlocker.disableRuleset('ads');
  }

  if (settings.blockTrackers) {
    await trackerBlocker.enableRuleset('trackers');
  } else {
    await trackerBlocker.disableRuleset('trackers');
  }

  // Malware protection is always on
  await trackerBlocker.enableRuleset('malware');
}

/**
 * Handle messages from popup and content scripts
 */
function setupMessageHandlers() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true; // Async response
  });
}

/**
 * Handle message
 */
async function handleMessage(message, sender) {
  const { type, data } = message;

  switch (type) {
    case MESSAGE_TYPES.GET_SETTINGS:
      return await storage.getSettings();

    case MESSAGE_TYPES.UPDATE_SETTINGS:
      await storage.updateSettings(data);
      await applySettings({ ...await storage.getSettings(), ...data });
      return { success: true };

    case MESSAGE_TYPES.GET_STATS:
      return stats.getStats();

    case MESSAGE_TYPES.RESET_STATS:
      await stats.resetStats();
      return { success: true };

    case MESSAGE_TYPES.UPDATE_STATS:
      // Content scripts can update stats (e.g., fingerprint blocks)
      if (data.stat && data.amount) {
        stats.incrementStat(data.stat, data.amount);
      }
      return { success: true };

    case MESSAGE_TYPES.TOGGLE_ENABLED:
      const settings = await storage.getSettings();
      const newEnabled = !settings.enabled;
      await storage.updateSettings({ enabled: newEnabled });
      await applySettings({ ...settings, enabled: newEnabled });
      return { enabled: newEnabled };

    case MESSAGE_TYPES.WHITELIST_DOMAIN:
      if (data.domain) {
        await storage.addToWhitelist(data.domain);
        return { success: true };
      }
      return { success: false, error: 'No domain provided' };

    case MESSAGE_TYPES.REMOVE_WHITELIST:
      if (data.domain) {
        await storage.removeFromWhitelist(data.domain);
        return { success: true };
      }
      return { success: false, error: 'No domain provided' };

    default:
      console.warn('Unknown message type:', type);
      return { success: false, error: 'Unknown message type' };
  }
}

/**
 * Track DNR blocks
 */
function setupDNRTracking() {
  // Listen for web requests to count blocks
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      // This fires for all requests, but DNR blocks them before they complete
      // We track successful blocks via DNR matched rules
    },
    { urls: ['<all_urls>'] }
  );

  // Note: In MV3, we can't directly intercept DNR blocks
  // Stats will be approximate based on rule matches
}

/**
 * Handle tab updates
 */
function setupTabHandlers() {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      handlePageLoad(tab.url, tabId);
    }
  });
}

/**
 * Handle page load (check whitelist, etc.)
 */
async function handlePageLoad(url, tabId) {
  try {
    const hostname = extractHostname(url);
    const domain = extractDomain(hostname);

    const whitelist = await storage.getWhitelist();
    const isWhitelisted = whitelist.includes(domain);

    // Send message to content script about whitelist status
    chrome.tabs.sendMessage(tabId, {
      type: 'PAGE_STATUS',
      data: { isWhitelisted, domain }
    }).catch(() => {
      // Content script may not be ready yet
    });

  } catch (error) {
    // Invalid URL or tab closed
  }
}

/**
 * Extension installed/updated
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('PrivacyShield: Installed');
    // Open welcome page or settings
    chrome.tabs.create({ url: 'ui/settings.html' });
  } else if (details.reason === 'update') {
    console.log('PrivacyShield: Updated');
  }
});

// Initialize on startup
initialize();
setupMessageHandlers();
setupTabHandlers();
