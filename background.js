// PrivacyShield - Background Service Worker (MV3)

import { MESSAGE_TYPES } from './src/core/constants.js';
import * as storage from './src/core/storage.js';
import { extractDomain, extractHostname } from './src/core/utils.js';
import * as trackerBlocker from './src/privacy/tracker-blocker.js';
import * as stats from './src/privacy/stats.js';

// Track blocks per tab
const tabStats = new Map();

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

  // Update badge with current stats
  await updateBadge();

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
 * Update badge with total blocks
 */
async function updateBadge() {
  const currentStats = stats.getStats();
  const total = currentStats.trackersBlocked + currentStats.adsBlocked + currentStats.fingerprintsBlocked;

  if (total === 0) {
    chrome.action.setBadgeText({ text: '' });
  } else {
    const badgeText = total > 999 ? '999+' : total.toString();
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: '#FFFFFF' });
    chrome.action.setBadgeTextColor({ color: '#000000' });
  }
}

/**
 * Track request and estimate blocks
 */
function trackRequest(details) {
  const url = details.url;
  const type = details.type;

  // Skip main_frame requests
  if (type === 'main_frame') return;

  // Heuristic: Check if URL matches common tracker/ad patterns
  const isTracker = /analytics|tracking|tracker|telemetry|metrics/i.test(url);
  const isAd = /doubleclick|adsystem|advertising|adservice|pagead/i.test(url);

  if (isTracker) {
    stats.incrementStat('trackersBlocked', 1);
    updateBadge();
  } else if (isAd) {
    stats.incrementStat('adsBlocked', 1);
    updateBadge();
  }

  // Update per-tab stats
  if (details.tabId >= 0) {
    if (!tabStats.has(details.tabId)) {
      tabStats.set(details.tabId, { trackers: 0, ads: 0, fingerprints: 0 });
    }
    const tab = tabStats.get(details.tabId);
    if (isTracker) tab.trackers++;
    if (isAd) tab.ads++;
  }
}

/**
 * Setup DNR tracking
 */
function setupDNRTracking() {
  // Listen to web requests to estimate blocks
  chrome.webRequest.onBeforeRequest.addListener(
    trackRequest,
    { urls: ['<all_urls>'], types: ['script', 'image', 'xmlhttprequest', 'sub_frame'] }
  );
}

/**
 * Get stats for specific tab
 */
function getTabStats(tabId) {
  return tabStats.get(tabId) || { trackers: 0, ads: 0, fingerprints: 0 };
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
      // Return both global and current tab stats
      const globalStats = stats.getStats();
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;
      const currentTabStats = tabId ? getTabStats(tabId) : { trackers: 0, ads: 0, fingerprints: 0 };

      return {
        ...globalStats,
        currentTab: currentTabStats
      };

    case MESSAGE_TYPES.RESET_STATS:
      await stats.resetStats();
      tabStats.clear();
      await updateBadge();
      return { success: true };

    case MESSAGE_TYPES.UPDATE_STATS:
      // Content scripts can update stats (e.g., fingerprint blocks)
      if (data.stat && data.amount) {
        stats.incrementStat(data.stat, data.amount);
        await updateBadge();

        // Update tab stats too
        if (sender.tab?.id >= 0) {
          if (!tabStats.has(sender.tab.id)) {
            tabStats.set(sender.tab.id, { trackers: 0, ads: 0, fingerprints: 0 });
          }
          const tab = tabStats.get(sender.tab.id);
          if (data.stat === 'fingerprintsBlocked') {
            tab.fingerprints += data.amount;
          }
        }
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
 * Handle tab updates
 */
function setupTabHandlers() {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && tab.url) {
      // Reset tab stats on new page load
      tabStats.set(tabId, { trackers: 0, ads: 0, fingerprints: 0 });
    }

    if (changeInfo.status === 'complete' && tab.url) {
      handlePageLoad(tab.url, tabId);
    }
  });

  // Clean up closed tabs
  chrome.tabs.onRemoved.addListener((tabId) => {
    tabStats.delete(tabId);
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
setupDNRTracking();
