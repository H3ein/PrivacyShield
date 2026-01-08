// PrivacyShield - Background Service Worker (MV3) - Optimized for Production

import { MESSAGE_TYPES, TRACKING_PARAMS, SOCIAL_WIDGET_DOMAINS, ESSENTIAL_DOMAINS, CONSERVATIVE_TRACKER_PATTERNS, CONSERVATIVE_AD_PATTERNS, ADDITIONAL_TRACKING_PATTERNS } from './src/core/constants.js';
import * as storage from './src/core/storage.js';
import { extractDomain, extractHostname } from './src/core/utils.js';
import * as trackerBlocker from './src/privacy/tracker-blocker.js';
import * as stats from './src/privacy/stats.js';

// Error handling utilities - simplified for performance
const ErrorHandler = {
  log: (context, error, fallback = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] PrivacyShield Error [${context}]:`, error);
    return fallback;
  },
  
  safeExecute: async (context, fn, fallback = null) => {
    try {
      return await fn();
    } catch (error) {
      return ErrorHandler.log(context, error, fallback);
    }
  }
};

// Minimal tracking for performance
const tabStats = new Map();
const blockedResources = new Map();

// Extension initialization
chrome.runtime.onInstalled.addListener(async (details) => {
  await ErrorHandler.safeExecute('onInstalled', async () => {
    console.log('PrivacyShield: Extension installed/updated');
    
    // Initialize default settings
    const settings = await storage.getSettings();
    console.log('PrivacyShield: Settings loaded:', settings);
    
    // Initialize stats
    await stats.initializeStats();
    
    // Set up declarative rules
    await setupDeclarativeRules();
  });
});

// Setup declarative network rules
async function setupDeclarativeRules() {
  return ErrorHandler.safeExecute('setupDeclarativeRules', async () => {
    const settings = await storage.getSettings();
    if (!settings.enabled) return;

    // Update dynamic rules based on current settings
    const rules = [];
    
    // Add tracker blocking rules
    if (settings.blockTrackers !== false) {
      CONSERVATIVE_TRACKER_PATTERNS.forEach((pattern, index) => {
        rules.push({
          id: 1000 + index,
          priority: 2,
          action: { type: 'block' },
          condition: { urlFilter: pattern, resourceTypes: ['script', 'sub_frame', 'image'] }
        });
      });
    }
    
    // Add ad blocking rules
    if (settings.blockAds !== false) {
      CONSERVATIVE_AD_PATTERNS.forEach((pattern, index) => {
        rules.push({
          id: 2000 + index,
          priority: 1,
          action: { type: 'block' },
          condition: { urlFilter: pattern, resourceTypes: ['script', 'sub_frame'] }
        });
      });
    }
    
    // Update rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from({ length: 3000 }, (_, i) => i), // Remove all existing rules
      addRules: rules
    });
    
    console.log(`PrivacyShield: Updated ${rules.length} declarative rules`);
  });
}

// Web request monitoring - simplified
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    return ErrorHandler.safeExecute('onBeforeRequest', async () => {
      const settings = await storage.getSettings();
      if (!settings.enabled) return { cancel: false };
      
      const url = details.url;
      const domain = extractDomain(url);
      const tabId = details.tabId;
      
      // Check whitelist
      if (await storage.isWhitelisted(domain)) {
        return { cancel: false };
      }
      
      // Check against essential domains
      if (ESSENTIAL_DOMAINS.some(essential => domain.includes(essential))) {
        return { cancel: false };
      }
      
      // Conservative blocking logic
      const isTracker = CONSERVATIVE_TRACKER_PATTERNS.some(pattern => url.includes(pattern));
      const isAd = CONSERVATIVE_AD_PATTERNS.some(pattern => url.includes(pattern));
      
      if (isTracker || isAd) {
        // Track statistics
        await stats.incrementBlockedCount();
        
        // Update tab stats
        if (tabId >= 0) {
          if (!tabStats.has(tabId)) {
            tabStats.set(tabId, { blocked: 0, domains: new Set() });
          }
          const stats = tabStats.get(tabId);
          stats.blocked++;
          stats.domains.add(domain);
        }
        
        return { cancel: true };
      }
      
      return { cancel: false };
    }, { cancel: false });
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

// Tab management - cleanup on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  tabStats.delete(tabId);
  blockedResources.delete(tabId);
});

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  ErrorHandler.safeExecute('onMessage', async () => {
    const { type, data } = message;
    
    switch (type) {
      case MESSAGE_TYPES.GET_STATS:
        const statistics = await stats.getStats();
        sendResponse({ success: true, data: statistics });
        break;
        
      case MESSAGE_TYPES.UPDATE_SETTINGS:
        await storage.updateSettings(data);
        await setupDeclarativeRules(); // Reapply rules with new settings
        sendResponse({ success: true });
        break;
        
      case MESSAGE_TYPES.GET_SETTINGS:
        const settings = await storage.getSettings();
        sendResponse({ success: true, data: settings });
        break;
        
      case MESSAGE_TYPES.ADD_TO_WHITELIST:
        await storage.addToWhitelist(data.domain);
        await setupDeclarativeRules(); // Reapply rules
        sendResponse({ success: true });
        break;
        
      case MESSAGE_TYPES.REMOVE_FROM_WHITELIST:
        await storage.removeFromWhitelist(data.domain);
        await setupDeclarativeRules(); // Reapply rules
        sendResponse({ success: true });
        break;
        
      case MESSAGE_TYPES.GET_TAB_STATS:
        const tabStatistics = tabStats.get(sender.tab?.id) || { blocked: 0, domains: [] };
        sendResponse({ success: true, data: tabStatistics });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  });
  
  return true; // Keep message channel open for async response
});

// Action button click
chrome.action.onClicked.addListener(async (tab) => {
  await ErrorHandler.safeExecute('actionClicked', async () => {
    // Toggle extension enabled state
    const settings = await storage.getSettings();
    const newEnabled = !settings.enabled;
    await storage.updateSettings({ enabled: newEnabled });
    
    // Update badge
    chrome.action.setBadgeText({
      text: newEnabled ? 'ON' : 'OFF',
      tabId: tab.id
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: newEnabled ? '#00ff00' : '#ff0000',
      tabId: tab.id
    });
    
    // Reapply rules
    await setupDeclarativeRules();
  });
});

// Update badge on tab update
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    await ErrorHandler.safeExecute('updateBadge', async () => {
      const settings = await storage.getSettings();
      const tabStatsData = tabStats.get(tabId) || { blocked: 0 };
      
      chrome.action.setBadgeText({
        text: settings.enabled ? (tabStatsData.blocked > 0 ? tabStatsData.blocked.toString() : 'ON') : 'OFF',
        tabId
      });
      
      chrome.action.setBadgeBackgroundColor({
        color: settings.enabled ? (tabStatsData.blocked > 0 ? '#ff9900' : '#00ff00') : '#ff0000',
        tabId
      });
    });
  }
});

// Performance optimization - cleanup old data periodically
setInterval(async () => {
  await ErrorHandler.safeExecute('periodicCleanup', async () => {
    // Clean up old tab stats (older than 1 hour)
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [tabId, stats] of tabStats.entries()) {
      if (now - stats.lastUpdated > oneHour) {
        tabStats.delete(tabId);
      }
    }
    
    // Clean up blocked resources
    for (const [tabId, resources] of blockedResources.entries()) {
      if (now - resources.lastUpdated > oneHour) {
        blockedResources.delete(tabId);
      }
    }
  });
}, 30 * 60 * 1000); // Run every 30 minutes

console.log('PrivacyShield: Background script loaded - Production Optimized');
