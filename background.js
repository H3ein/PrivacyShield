// PrivacyShield - Background Service Worker (MV3) - Optimized for Production

import { MESSAGE_TYPES, ESSENTIAL_DOMAINS, CONSERVATIVE_TRACKER_PATTERNS, CONSERVATIVE_AD_PATTERNS, ADDITIONAL_TRACKING_PATTERNS } from './src/core/constants.js';
import * as storage from './src/core/storage.js';
import { extractDomain, extractHostname } from './src/core/utils.js';
import * as stats from './src/privacy/stats.js';
import { AILearningMonitor } from './src/ai/ai-learning-monitor.js';

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

// Initialize AI Learning Monitor
const aiLearningMonitor = new AILearningMonitor();

// Request tracking for honest stats
let learningData = {
  patternsLearned: new Map(),
  lastUpdate: Date.now(),
  totalRequests: 0,
  blockedRequests: 0,
  domainPatterns: new Map()
};

// Initialize learning system
async function initializeLearning() {
  try {
    const stored = await chrome.storage.local.get(['learningData']);
    if (stored.learningData) {
      learningData = { ...learningData, ...stored.learningData };
      // Convert arrays back to Maps
      if (Array.isArray(stored.learningData.patternsLearned)) {
        learningData.patternsLearned = new Map(stored.learningData.patternsLearned);
      }
      if (Array.isArray(stored.learningData.domainPatterns)) {
        learningData.domainPatterns = new Map(stored.learningData.domainPatterns);
      }
    }
    console.log('PrivacyShield: Learning system initialized', learningData);
  } catch (error) {
    console.error('PrivacyShield: Failed to initialize learning:', error);
  }
}

// Update tracking data based on blocking activity
async function updateLearning(domain, blocked, category) {
  try {
    learningData.totalRequests++;

    if (blocked) {
      learningData.blockedRequests++;

      // Track blocked domains
      if (!learningData.domainPatterns.has(domain)) {
        learningData.domainPatterns.set(domain, { blocks: 0, total: 0 });
      }
      const domainData = learningData.domainPatterns.get(domain);
      domainData.blocks++;
      domainData.total++;

      // Track by category
      if (!learningData.patternsLearned.has(category)) {
        learningData.patternsLearned.set(category, { blocks: 0 });
      }
      learningData.patternsLearned.get(category).blocks++;
    }

    // Save periodically
    if (learningData.totalRequests % 100 === 0) {
      await saveLearningData();
    }

  } catch (error) {
    console.error('PrivacyShield: Failed to update learning:', error);
  }
}

// Save learning data to storage
async function saveLearningData() {
  try {
    const dataToSave = {
      ...learningData,
      patternsLearned: Array.from(learningData.patternsLearned.entries()),
      domainPatterns: Array.from(learningData.domainPatterns.entries()),
      lastUpdate: Date.now()
    };
    await chrome.storage.local.set({ learningData: dataToSave });
  } catch (error) {
    console.error('PrivacyShield: Failed to save learning data:', error);
  }
}

// Get tracking data for UI
function getLearningData() {
  return {
    domainPatternsCount: learningData.domainPatterns.size,
    categoriesActive: learningData.patternsLearned.size,
    totalRequests: learningData.totalRequests,
    blockedRequests: learningData.blockedRequests,
    lastUpdate: learningData.lastUpdate
  };
}

// Extension initialization
chrome.runtime.onInstalled.addListener(async (details) => {
  await ErrorHandler.safeExecute('onInstalled', async () => {
    console.log('PrivacyShield: Extension installed/updated');
    
    // Initialize stats first
    await stats.initialize();
    
    // Initialize learning system
    await initializeLearning();
    
    // Initialize default settings
    const settings = await storage.getSettings();
    console.log('PrivacyShield: Settings loaded:', settings);
    
    // Set up declarative rules
    await setupDeclarativeRules();
  });
});

// Also initialize on startup (for existing installations)
chrome.runtime.onStartup.addListener(async () => {
  await ErrorHandler.safeExecute('onStartup', async () => {
    console.log('PrivacyShield: Extension startup');
    
    // Initialize stats
    await stats.initialize();
    
    // Initialize learning system
    await initializeLearning();
    
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
      const allTrackerPatterns = [...CONSERVATIVE_TRACKER_PATTERNS, ...ADDITIONAL_TRACKING_PATTERNS];
      allTrackerPatterns.forEach((pattern, index) => {
        rules.push({
          id: 1000 + index,
          priority: 2,
          action: { type: 'block' },
          condition: { urlFilter: `||${pattern}^`, resourceTypes: ['script', 'sub_frame', 'image', 'xmlhttprequest'] }
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
          condition: { urlFilter: `||${pattern}^`, resourceTypes: ['script', 'sub_frame', 'image', 'xmlhttprequest', 'media', 'object'] }
        });
      });
    }

    // Update rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from({ length: 5000 }, (_, i) => i), // Remove all existing rules
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
      const hostname = extractHostname(url);
      const domain = extractDomain(hostname);
      const tabId = details.tabId;
      
      // Debug logging for first few requests
      if (learningData.totalRequests < 10) {
        console.log(`PrivacyShield: Request #${learningData.totalRequests + 1}: ${domain}`);
      }
      
      // Check whitelist
      if (await storage.isWhitelisted(domain)) {
        return { cancel: false };
      }
      
      // Check against essential domains
      if (ESSENTIAL_DOMAINS.some(essential => hostname === essential || hostname.endsWith('.' + essential))) {
        return { cancel: false };
      }
      
      // Conservative blocking logic - match against hostname, not full URL
      const isTracker = CONSERVATIVE_TRACKER_PATTERNS.some(pattern =>
        hostname === pattern || hostname.endsWith('.' + pattern)
      );
      const isAd = CONSERVATIVE_AD_PATTERNS.some(pattern =>
        hostname === pattern || hostname.endsWith('.' + pattern)
      );
      // Only match known fingerprinting library paths, not generic words
      const urlPath = url.toLowerCase();
      const isFingerprint = details.type === 'script' && (
        hostname === 'fingerprintjs.com' || hostname.endsWith('.fingerprintjs.com') ||
        hostname === 'fpjs.io' || hostname.endsWith('.fpjs.io') ||
        urlPath.includes('/fingerprint2') || urlPath.includes('/fingerprintjs') ||
        urlPath.includes('/fp.min.js') || urlPath.includes('/fp.js')
      );
      
      if (isTracker || isAd || isFingerprint) {
        console.log(`PrivacyShield: Blocking ${isTracker ? 'tracker' : isAd ? 'ad' : 'fingerprint'}: ${domain}`);
        
        // Track statistics
        let category = 'unknown';
        if (isTracker) {
          await stats.incrementStat('trackersBlocked');
          category = 'tracker';
        } else if (isAd) {
          await stats.incrementStat('adsBlocked');
          category = 'ad';
        } else if (isFingerprint) {
          await stats.incrementStat('fingerprintsBlocked');
          category = 'fingerprint';
        }
        
        // Update learning system
        await updateLearning(domain, true, category);
        
        // Track blocking action in AI Learning Monitor
        aiLearningMonitor.trackBlockingAction(domain, url, 'dynamic_rule', category);
        
        // Update tab stats and badge in real-time
        if (tabId >= 0) {
          if (!tabStats.has(tabId)) {
            tabStats.set(tabId, { blocked: 0, domains: new Set() });
          }
          const tabStat = tabStats.get(tabId);
          tabStat.blocked++;
          tabStat.domains.add(domain);

          // Update badge in real-time on each block
          chrome.action.setBadgeText({ text: tabStat.blocked.toString(), tabId });
          chrome.action.setBadgeBackgroundColor({ color: '#ff9900', tabId });
          chrome.action.setTitle({
            title: `PrivacyShield: ${tabStat.blocked} threat${tabStat.blocked !== 1 ? 's' : ''} blocked on this tab`,
            tabId
          });
        }

        return { cancel: true };
      } else {
        // Still update learning for allowed requests
        await updateLearning(domain, false, 'allowed');
      }
      
      return { cancel: false };
    }, { cancel: false });
  },
  { urls: ['<all_urls>'] }
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
        
      case 'getLearningData':
        const learningInfo = getLearningData();
        sendResponse({ success: true, data: learningInfo });
        break;
        
      case 'getAILearningData':
        const aiLearningInfo = aiLearningMonitor.getTransparencyReport();
        sendResponse({ success: true, data: aiLearningInfo });
        break;
        
      case 'resetLearning':
        learningData = {
          patternsLearned: new Map(),
          lastUpdate: Date.now(),
          totalRequests: 0,
          blockedRequests: 0,
          domainPatterns: new Map()
        };
        await saveLearningData();
        sendResponse({ success: true, message: 'Learning data reset' });
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
        
      case MESSAGE_TYPES.WHITELIST_DOMAIN:
        if (data.action === 'add') {
          await storage.addToWhitelist(data.domain);
        } else if (data.action === 'remove') {
          await storage.removeFromWhitelist(data.domain);
        }
        await setupDeclarativeRules(); // Reapply rules
        sendResponse({ success: true });
        break;
        
      case MESSAGE_TYPES.GET_TAB_STATS:
        const tabData = tabStats.get(sender.tab?.id) || { blocked: 0, domains: new Set() };
        sendResponse({ success: true, data: { blocked: tabData.blocked, domains: [...tabData.domains] } });
        break;
        
      case MESSAGE_TYPES.RESET_STATS:
        await stats.resetStats();
        sendResponse({ success: true });
        break;
        
      case 'resetStat':
        if (data.stat) {
          await stats.resetStat(data.stat);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No stat specified' });
        }
        break;
        
      case 'debugIncrementStats':
        await stats.incrementStat('trackersBlocked');
        await stats.incrementStat('adsBlocked');
        await stats.incrementStat('fingerprintsBlocked');
        sendResponse({ success: true });
        break;

      case 'testBlocking':
        await stats.incrementStat('trackersBlocked');
        await stats.incrementStat('adsBlocked');
        sendResponse({ success: true, message: 'Test blocking triggered' });
        break;

      case MESSAGE_TYPES.RESET_ALL:
        await storage.clear();
        await stats.resetStats();
        await setupDeclarativeRules();
        sendResponse({ success: true });
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

// Reset tab stats on new navigation, update badge on tab update
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Reset stats when a new page starts loading
  if (changeInfo.status === 'loading' && changeInfo.url) {
    tabStats.set(tabId, { blocked: 0, domains: new Set() });
  }

  if (changeInfo.status === 'complete') {
    await ErrorHandler.safeExecute('updateBadge', async () => {
      const settings = await storage.getSettings();
      const tabStatsData = tabStats.get(tabId) || { blocked: 0 };

      const blockedCount = tabStatsData.blocked;
      chrome.action.setBadgeText({
        text: settings.enabled ? (blockedCount > 0 ? blockedCount.toString() : 'ON') : 'OFF',
        tabId
      });

      chrome.action.setBadgeBackgroundColor({
        color: settings.enabled ? (blockedCount > 0 ? '#ff9900' : '#00ff00') : '#ff0000',
        tabId
      });

      chrome.action.setTitle({
        title: settings.enabled
          ? (blockedCount > 0
            ? `PrivacyShield: ${blockedCount} threat${blockedCount !== 1 ? 's' : ''} blocked on this tab`
            : 'PrivacyShield: Protection active')
          : 'PrivacyShield: Protection disabled',
        tabId
      });
    });
  }
});

// Performance optimization - clean up stale tab data periodically
setInterval(async () => {
  await ErrorHandler.safeExecute('periodicCleanup', async () => {
    // Remove entries for tabs that no longer exist
    const openTabs = await chrome.tabs.query({});
    const openTabIds = new Set(openTabs.map(t => t.id));

    for (const tabId of tabStats.keys()) {
      if (!openTabIds.has(tabId)) {
        tabStats.delete(tabId);
      }
    }
    for (const tabId of blockedResources.keys()) {
      if (!openTabIds.has(tabId)) {
        blockedResources.delete(tabId);
      }
    }
  });
}, 30 * 60 * 1000); // Run every 30 minutes

console.log('PrivacyShield: Background script loaded - Production Optimized');
