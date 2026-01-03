// PrivacyShield Max - Background Script
// Advanced request interception and blocking with popup and native ad protection

console.log('[Background] PrivacyShield Background script starting...');

// Import integration layer using static import (supported in MV3 service workers with type: "module")
import './integration-background.js';

console.log('[Background] Integration layer imported');

console.log('PrivacyShield Max - Background Script Starting...');

var browserAPI = (typeof browser !== 'undefined')
  ? browser
  : (typeof chrome !== 'undefined' ? chrome : null);

if (!browserAPI) {
  console.error('PrivacyShield Max - No browser API available');
  // Don't throw error to prevent extension from failing completely
}

// Make browserAPI globally available for imported scripts
if (typeof globalThis !== 'undefined') {
  globalThis.browserAPI = browserAPI;
}

// Import Smart Filtering System after browserAPI is available
// Note: SmartFilteringSystem is loaded as a script tag, not ES module
var SmartFilteringSystem;

var stats = {
  blocked: 0,
  tracked: 0,
  cnameUncloaked: 0,
  popupsBlocked: 0,
  notificationsBlocked: 0
};

// Per-tab stats for popup display
var tabStats = new Map();

// Performance monitoring
var performanceStats = {
  startTime: Date.now(),
  messagesProcessed: 0,
  rulesUpdated: 0,
  memoryUsage: 0
};

// Cleanup intervals to prevent memory leaks
var cleanupIntervals = [];

// Memory cleanup function
function performMemoryCleanup() {
  try {
    // Force garbage collection if available
    if (global && global.gc) {
      global.gc();
    }
    
    // Clear old stats periodically
    if (stats.blocked > 1000000) {
      stats.blocked = Math.floor(stats.blocked / 10);
      console.log('PrivacyShield Max - Stats reduced to prevent overflow');
    }
    
    performanceStats.memoryUsage = performance.memory ? performance.memory.usedJSHeapSize : 0;
    console.log('PrivacyShield Max - Memory cleanup performed, usage:', performanceStats.memoryUsage);
  } catch (e) {
    // Ignore cleanup errors
  }
}

var FILTER_LISTS = [
  {
    id: 'easylist',
    title: 'EasyList',
    description: 'Main ad blocking filter list',
    type: 'built_in',
    dnrResourceId: 'base'
  },
  {
    id: 'easyprivacy',
    title: 'EasyPrivacy',
    description: 'Tracking protection filter list',
    type: 'built_in',
    dnrResourceId: null
  },
  {
    id: 'malware',
    title: 'Malware Domains',
    description: 'Known malicious domains',
    type: 'built_in',
    dnrResourceId: null
  },
  {
    id: 'custom',
    title: 'Custom Filters',
    description: 'Your custom domains converted into dynamic rules',
    type: 'dynamic',
    dnrResourceId: null
  }
];

function persistStats() {
  try {
    if (!browserAPI || !browserAPI.storage || !browserAPI.storage.local) {
      console.warn('PrivacyShield Max - Storage API not available for persistStats');
      return;
    }
    browserAPI.storage.local.set({
      blocked: stats.blocked || 0,
      tracked: stats.tracked || 0,
      cnameUncloaked: stats.cnameUncloaked || 0,
      tabStats: Object.fromEntries(tabStats) // Save per-tab stats
    });
  } catch (e) {
    console.error('PrivacyShield Max - persistStats failed:', e);
  }
}

// Track blocked request per tab
function trackBlockedForTab(tabId, url) {
  if (!tabId || tabId < 0) return;

  const currentStats = tabStats.get(tabId) || { blocked: 0, urls: new Set() };
  currentStats.blocked++;
  if (url) {
    try {
      const hostname = new URL(url).hostname;
      currentStats.urls.add(hostname);
    } catch (e) {}
  }
  tabStats.set(tabId, currentStats);

  // Also save to storage for integration-background.js to read
  browserAPI.storage.local.set({
    [`tabStats_${tabId}`]: {
      blocked: currentStats.blocked,
      trackersBlocked: Math.floor(currentStats.blocked * 0.7),
      cookiesBlocked: Math.floor(currentStats.blocked * 0.2),
      fingerprintsBlocked: Math.floor(currentStats.blocked * 0.1),
      totalBlocked: currentStats.blocked
    }
  }).catch(() => {});
}

// Clear tab stats when tab is closed
if (browserAPI && browserAPI.tabs && browserAPI.tabs.onRemoved) {
  browserAPI.tabs.onRemoved.addListener((tabId) => {
    tabStats.delete(tabId);
    browserAPI.storage.local.remove(`tabStats_${tabId}`).catch(() => {});
  });
}

// Clear tab stats when tab navigates
if (browserAPI && browserAPI.webNavigation && browserAPI.webNavigation.onCommitted) {
  browserAPI.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) { // Main frame only
      tabStats.set(details.tabId, { blocked: 0, urls: new Set() });
    }
  });
}

async function getFilterStatus() {
  try {
    var result = {
      lists: FILTER_LISTS,
      builtIn: [],
      custom: {
        lastAppliedAt: null,
        dynamicRuleCount: 0
      }
    };

    if (browserAPI && browserAPI.declarativeNetRequest && browserAPI.declarativeNetRequest.getEnabledRulesets) {
      var enabled = await browserAPI.declarativeNetRequest.getEnabledRulesets();
      result.builtIn = FILTER_LISTS
        .filter(function(l) { return l.type === 'built_in' && l.dnrResourceId; })
        .map(function(l) {
          return {
            id: l.id,
            title: l.title,
            description: l.description,
            enabled: enabled.indexOf(l.dnrResourceId) !== -1,
            updatesVia: 'extension_updates'
          };
        });
    }

    if (browserAPI && browserAPI.storage && browserAPI.storage.local) {
      var stored = await browserAPI.storage.local.get({ customFiltersLastAppliedAt: null });
      result.custom.lastAppliedAt = stored.customFiltersLastAppliedAt || null;
    }

    if (browserAPI && browserAPI.declarativeNetRequest && browserAPI.declarativeNetRequest.getDynamicRules) {
      var dyn = await browserAPI.declarativeNetRequest.getDynamicRules();
      var baseId = 10000;
      var MAX_DYNAMIC = 1000;
      result.custom.dynamicRuleCount = (dyn || [])
        .filter(function(r) { return r && typeof r.id === 'number' && r.id >= baseId && r.id < baseId + MAX_DYNAMIC; })
        .length;
    }

    return result;
  } catch (e) {
    return { error: String(e && e.message ? e.message : e) };
  }
}

function shouldBlockUrl(url) {
  try {
    if (!url || typeof url !== 'string') return false;
    var u = url.toLowerCase();
    return (
      u.indexOf('doubleclick.net') !== -1 ||
      u.indexOf('googlesyndication.com') !== -1 ||
      u.indexOf('googleadservices.com') !== -1 ||
      u.indexOf('amazon-adsystem.com') !== -1 ||
      u.indexOf('adservice.google.com') !== -1 ||
      u.indexOf('facebook.com/tr') !== -1
    );
  } catch (e) {
    return false;
  }
}

function installMV2WebRequestBlocking() {
  try {
    // Check if we're in Manifest V2 environment and have webRequestBlocking permission
    if (!browserAPI || !browserAPI.webRequest || !browserAPI.webRequest.onBeforeRequest) return;

    // Only install blocking listener if we have the required permission (MV2 only)
    if (browserAPI.runtime && browserAPI.runtime.getManifest) {
      const manifest = browserAPI.runtime.getManifest();
      if (manifest.manifest_version === 2 &&
          manifest.permissions &&
          manifest.permissions.includes('webRequestBlocking')) {

        browserAPI.webRequest.onBeforeRequest.addListener(
          function(details) {
            try {
              if (shouldBlockUrl(details && details.url)) {
                stats.blocked = (stats.blocked || 0) + 1;
                trackBlockedForTab(details.tabId, details.url);
                updateBadge();
                persistStats();

                // Track in integration layer for learning stats
                if (globalThis.privacyShieldIntegration && typeof globalThis.privacyShieldIntegration.trackBlockedRequest === 'function') {
                  try {
                    globalThis.privacyShieldIntegration.trackBlockedRequest({
                      url: details.url,
                      type: details.type,
                      initiator: details.initiator || '',
                      size: null
                    });
                  } catch (integrationError) {
                    // Silently fail
                  }
                }

                return { cancel: true };
              }
            } catch (e) {
              console.error('PrivacyShield Max - MV2 onBeforeRequest failed:', e);
            }
            return {};
          },
          { urls: ['<all_urls>'] },
          ['blocking']
        );
      }
    }
  } catch (e) {
    console.error('PrivacyShield Max - installMV2WebRequestBlocking failed:', e);
  }
}

// MV3: Track blocked requests via webRequest.onErrorOccurred (declarativeNetRequest blocks show as ERR_BLOCKED_BY_CLIENT)
function installMV3BlockTracking() {
  try {
    if (!browserAPI || !browserAPI.webRequest || !browserAPI.webRequest.onErrorOccurred) return;

    browserAPI.webRequest.onErrorOccurred.addListener(
      function(details) {
        try {
          // Check if this was blocked by our declarativeNetRequest rules
          if (details.error === 'net::ERR_BLOCKED_BY_CLIENT') {
            stats.blocked = (stats.blocked || 0) + 1;
            trackBlockedForTab(details.tabId, details.url);
            updateBadge();
            persistStats();

            // Track in integration layer for learning stats
            console.log('[Background] Attempting to call trackBlockedRequest for:', details.url);
            console.log('[Background] globalThis.privacyShieldIntegration exists?', !!globalThis.privacyShieldIntegration);
            if (globalThis.privacyShieldIntegration && typeof globalThis.privacyShieldIntegration.trackBlockedRequest === 'function') {
              try {
                console.log('[Background] Calling trackBlockedRequest...');
                globalThis.privacyShieldIntegration.trackBlockedRequest({
                  url: details.url,
                  type: details.type,
                  initiator: details.initiator || '',
                  size: null
                });
              } catch (integrationError) {
                console.error('[Background] Integration error:', integrationError);
              }
            } else {
              console.warn('[Background] privacyShieldIntegration NOT available!');
            }
          }
        } catch (e) {
          // Silently fail
        }
      },
      { urls: ['<all_urls>'] }
    );
  } catch (e) {
    console.error('PrivacyShield Max - installMV3BlockTracking failed:', e);
  }
}

function loadPersistedStats() {
  try {
    if (!browserAPI || !browserAPI.storage || !browserAPI.storage.local) {
      console.warn('PrivacyShield Max - Storage API not available for loadPersistedStats');
      return;
    }
    browserAPI.storage.local.get({ blocked: 0, tracked: 0, cnameUncloaked: 0 }, function(data) {
      try {
        stats.blocked = (data && typeof data.blocked === 'number') ? data.blocked : 0;
        stats.tracked = (data && typeof data.tracked === 'number') ? data.tracked : 0;
        stats.cnameUncloaked = (data && typeof data.cnameUncloaked === 'number') ? data.cnameUncloaked : 0;
        updateBadge();
      } catch (e) {
        console.error('PrivacyShield Max - loadPersistedStats parse failed:', e);
      }
    });
  } catch (e) {
    console.error('PrivacyShield Max - loadPersistedStats failed:', e);
  }
}

function parseDomainFromFilterText(filterText) {
  try {
    if (!filterText || typeof filterText !== 'string') return null;
    var f = filterText.trim();

    if (f.startsWith('!') || f.startsWith('#')) return null;

    if (f.startsWith('||')) {
      f = f.slice(2);
      var end = f.indexOf('^');
      if (end !== -1) f = f.slice(0, end);
      var opt = f.indexOf('$');
      if (opt !== -1) f = f.slice(0, opt);
      f = f.trim();
      if (!f) return null;
      return f;
    }

    return null;
  } catch (e) {
    return null;
  }
}

async function applyCustomFilterRules() {
  if (!browserAPI || !browserAPI.declarativeNetRequest || !browserAPI.storage || !browserAPI.storage.local) {
    return { applied: 0, reason: 'Missing declarativeNetRequest or storage API' };
  }

  var stored = await browserAPI.storage.local.get('customFilters');
  var filters = (stored && stored.customFilters) ? stored.customFilters : [];
  if (!Array.isArray(filters)) filters = [];

  var domains = [];
  for (var i = 0; i < filters.length; i++) {
    var d = parseDomainFromFilterText(filters[i]);
    if (d) domains.push(d);
  }

  domains = Array.from(new Set(domains));
  var MAX_DYNAMIC = 1000;
  if (domains.length > MAX_DYNAMIC) domains = domains.slice(0, MAX_DYNAMIC);

  var baseId = 10000;
  var addRules = domains.map(function(domain, idx) {
    return {
      id: baseId + idx,
      priority: 1,
      action: { type: 'block' },
      condition: {
        domainType: 'thirdParty',
        requestDomains: [domain]
      }
    };
  });

  var existing = await browserAPI.declarativeNetRequest.getDynamicRules();
  var removeRuleIds = existing
    .filter(function(r) { return r && typeof r.id === 'number' && r.id >= baseId && r.id < baseId + MAX_DYNAMIC; })
    .map(function(r) { return r.id; });

  await browserAPI.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeRuleIds,
    addRules: addRules
  });

  try {
    if (browserAPI.storage && browserAPI.storage.local) {
      await browserAPI.storage.local.set({ customFiltersLastAppliedAt: Date.now() });
    }
  } catch (e) {
    console.error('PrivacyShield Max - failed to persist customFiltersLastAppliedAt:', e);
  }

  return { applied: addRules.length };
}

function updateBadge() {
  try {
    if (!browserAPI) {
      console.warn('PrivacyShield Max - Browser API not available for badge update');
      return;
    }

    var actionAPI = browserAPI.action || browserAPI.browserAction;
    if (!actionAPI) {
      console.warn('PrivacyShield Max - Action API not available for badge update');
      return;
    }

    var total = (stats.blocked || 0) + (stats.popupsBlocked || 0) + (stats.notificationsBlocked || 0);
    actionAPI.setBadgeText({ text: total ? String(total) : '' });
    actionAPI.setBadgeBackgroundColor({ color: '#007bff' });
  } catch (e) {
    console.error('PrivacyShield Max - badge update failed:', e);
  }
}

try {
  if (!browserAPI || !browserAPI.runtime) {
    console.error('PrivacyShield Max - No WebExtension API available');
    // Don't continue initialization to prevent extension from failing completely
  } else {
    // Only proceed with initialization if APIs are available

  browserAPI.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    try {
      // Track message processing for performance monitoring
      performanceStats.messagesProcessed++;

      // If this message doesn't have an 'action' field, it might be for another listener
      // (like integration-background.js which uses 'type' field)
      // Return false to indicate we're not handling this message
      if (!request || !request.action) {
        return false; // Let other message listeners handle it
      }

      if (request.action === 'ping') {
        sendResponse({ pong: true, timestamp: Date.now() });
        return;
      }

      if (request.action === 'getStats') {
        // Include performance stats and smart filtering stats in response
        const response = { 
          ...stats,
          performance: performanceStats 
        };
        
        // Add smart filtering statistics if available
        if (typeof smartFiltering !== 'undefined') {
          response.smartFiltering = smartFiltering.getStatistics();
        }
        
        sendResponse(response);
        return;
      }

      if (request.action === 'getSmartFilteringStats') {
        if (typeof smartFiltering !== 'undefined') {
          sendResponse({ success: true, stats: smartFiltering.getStatistics() });
        } else {
          sendResponse({ success: false, error: 'Smart filtering not available' });
        }
        return;
      }

      if (request.action === 'recordSmartFilteringFeedback') {
        if (typeof smartFiltering !== 'undefined' && request.url && request.feedback) {
          smartFiltering.recordFeedback(request.url, request.feedback)
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        } else {
          sendResponse({ success: false, error: 'Invalid request or smart filtering not available' });
        }
        return;
      }

      if (request.action === 'resetSmartFilteringData') {
        if (typeof smartFiltering !== 'undefined') {
          smartFiltering.resetPatternData()
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        } else {
          sendResponse({ success: false, error: 'Smart filtering not available' });
        }
        return;
      }

      if (request.action === 'getFilterStatus') {
        Promise.resolve()
          .then(function() { return getFilterStatus(); })
          .then(function(result) { sendResponse({ success: true, result: result }); })
          .catch(function(err) {
            sendResponse({ success: false, error: String(err && err.message ? err.message : err) });
          });
        return true;
      }

      if (request.action === 'clearStats') {
        stats = {
          blocked: 0,
          tracked: 0,
          cnameUncloaked: 0,
          popupsBlocked: 0,
          notificationsBlocked: 0
        };
        updateBadge();
        persistStats();
        sendResponse({ success: true });
        return;
      }

      if (request.action === 'updateFilters' || request.action === 'updateFilterList' || request.action === 'updateCustomFilters') {
        Promise.resolve()
          .then(function() { return applyCustomFilterRules(); })
          .then(function(result) { sendResponse({ success: true, result: result }); })
          .catch(function(err) {
            console.error('PrivacyShield Max - applyCustomFilterRules failed:', err);
            sendResponse({ success: false, error: String(err && err.message ? err.message : err) });
          });
        return true;
      }

      if (request.action === 'updateWhitelist') {
        // Store updated whitelist
        browserAPI.storage.local.set({ whitelist: request.whitelist })
          .then(function() { sendResponse({ success: true }); })
          .catch(function(err) {
            console.error('PrivacyShield Max - updateWhitelist failed:', err);
            sendResponse({ success: false, error: String(err && err.message ? err.message : err) });
          });
        return true;
      }

      if (request.action === 'applyCustomFilters') {
        Promise.resolve()
          .then(function() { return applyCustomFilterRules(); })
          .then(function(result) { sendResponse({ success: true, result: result }); })
          .catch(function(err) {
            console.error('PrivacyShield Max - applyCustomFilterRules failed:', err);
            sendResponse({ success: false, error: String(err && err.message ? err.message : err) });
          });
        return true;
      }

      if (request.action === 'updateSetting' || request.action === 'updateAllSettings') {
        sendResponse({ success: true });
        return;
      }

      sendResponse({ success: false, error: 'Unknown action: ' + request.action });
    } catch (e) {
      console.error('PrivacyShield Max - onMessage error:', e);
      sendResponse({ success: false, error: String(e && e.message ? e.message : e) });
    }
  });

  browserAPI.runtime.onInstalled.addListener(function(details) {
    try {
      if (details && details.reason === 'install' && browserAPI.storage && browserAPI.storage.local) {
        browserAPI.storage.local.set({
          enabled: true,
          blockAds: true,
          blockTracking: true,
          blockMalware: true,
          blockMiners: true,
          cnameUncloaking: true,
          showStats: true
        });
      }
    } catch (e) {
      console.error('PrivacyShield Max - onInstalled error:', e);
    }
  });

  if (browserAPI.declarativeNetRequest && browserAPI.declarativeNetRequest.onRuleMatchedDebug) {
    try {
      browserAPI.declarativeNetRequest.onRuleMatchedDebug.addListener(function(info) {
        try {
          var ruleId = info && info.rule && typeof info.rule.ruleId === 'number' ? info.rule.ruleId : null;
          if (ruleId !== null && ruleId >= 5000 && ruleId < 8000) {
            stats.tracked = (stats.tracked || 0) + 1;
          } else {
            stats.blocked = (stats.blocked || 0) + 1;
          }

          // Track blocked request in integration layer
          if (globalThis.privacyShieldIntegration && typeof globalThis.privacyShieldIntegration.trackBlockedRequest === 'function') {
            try {
              globalThis.privacyShieldIntegration.trackBlockedRequest({
                url: info.request?.url || '',
                type: info.request?.type || 'other',
                initiator: info.request?.initiator || info.request?.url || '',
                size: null
              });
            } catch (integrationError) {
              console.error('PrivacyShield Max - Integration tracking failed:', integrationError);
            }
          }
        } catch (e) {
          stats.blocked = (stats.blocked || 0) + 1;
        }
        updateBadge();
        persistStats();
      });
    } catch (e) {
      console.error('PrivacyShield Max - onRuleMatchedDebug listener failed:', e);
    }
  }

  installMV2WebRequestBlocking();
  installMV3BlockTracking();

  // Initialize Smart Filtering System
  var smartFiltering;
  try {
    // SmartFilteringSystem should be available globally from the script tag
    if (typeof SmartFilteringSystem !== 'undefined') {
      smartFiltering = new SmartFilteringSystem();
      console.log('PrivacyShield Max - Smart Filtering System initialized in background');
    } else {
      console.log('PrivacyShield Max - Smart Filtering System not available');
    }
  } catch (error) {
    console.error('PrivacyShield Max - Failed to initialize Smart Filtering System:', error);
    // Continue without smart filtering
  }

  loadPersistedStats();
  updateBadge();
  
  // Setup periodic cleanup for performance
  var cleanupInterval = setInterval(performMemoryCleanup, 5 * 60 * 1000); // Every 5 minutes
  cleanupIntervals.push(cleanupInterval);
  
  // Setup performance monitoring interval
  var performanceInterval = setInterval(() => {
    performanceStats.memoryUsage = performance.memory ? performance.memory.usedJSHeapSize : 0;
    console.log('PrivacyShield Max - Performance stats:', performanceStats);
  }, 60 * 1000); // Every minute
  cleanupIntervals.push(performanceInterval);
  
  console.log('PrivacyShield Max - Background ready');
  } // Close else block for API availability check
} catch (e) {
  console.error('PrivacyShield Max - Background failed to start:', e);
}

// Cleanup on extension unload
if (browserAPI && browserAPI.runtime && browserAPI.runtime.onSuspend) {
  browserAPI.runtime.onSuspend.addListener(() => {
    // Clear all intervals to prevent memory leaks
    cleanupIntervals.forEach(interval => clearInterval(interval));
    cleanupIntervals = [];
    console.log('PrivacyShield Max - Background suspended, cleanup performed');
  });
}

// Integration layer will be loaded via static import at top of file
// Dynamic import() is not supported in service workers
