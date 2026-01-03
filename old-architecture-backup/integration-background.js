// PrivacyShield Max - Integration Layer
// Bridges new learning modules with existing background.js

console.log('[Integration-BG] Starting integration layer initialization...');

// Browser API
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Static imports (required for MV3 service workers)
try {
  console.log('[Integration-BG] Importing learning modules...');
} catch (e) {
  console.error('[Integration-BG] Pre-import error:', e);
}

import trustedSitesManagerDefault from './smart-filtering/trusted-sites-manager.js';
import falsePositiveTrackerDefault from './smart-filtering/false-positive-tracker.js';
import protectionLevelManagerDefault from './smart-filtering/protection-level-manager.js';
import performanceTrackerDefault from './background/performance-tracker.js';
import learningEngineDefault from './smart-filtering/learning-engine.js';
import patternAnalyzerDefault from './smart-filtering/pattern-analyzer.js';
import threatDetectorDefault from './smart-filtering/threat-detector.js';

console.log('[Integration-BG] Modules imported successfully');

// Module instances
let trustedSitesManager = trustedSitesManagerDefault;
let falsePositiveTracker = falsePositiveTrackerDefault;
let protectionLevelManager = protectionLevelManagerDefault;
let performanceTracker = performanceTrackerDefault;
let learningEngine = learningEngineDefault;
let patternAnalyzer = patternAnalyzerDefault;
let threatDetector = threatDetectorDefault;

// Initialize state
let isInitialized = false;
let currentTabStats = new Map(); // tabId → stats

/**
 * Initialize all learning modules
 */
async function initializeLearningModules() {
  if (isInitialized) return;

  try {
    console.log('PrivacyShield: Initializing learning modules...');

    // Initialize each module
    await Promise.all([
      trustedSitesManager.initialize(),
      falsePositiveTracker.initialize(),
      protectionLevelManager.initialize(),
      performanceTracker.initialize(),
      learningEngine.initialize(),
      threatDetector.initialize()
    ]);

    isInitialized = true;
    console.log('PrivacyShield: Learning modules initialized successfully');

    // Set up periodic updates
    setInterval(() => {
      protectionLevelManager.updateProgression('time_used', { duration: 60000 }); // 1 minute
    }, 60000);

  } catch (error) {
    console.error('PrivacyShield: Failed to initialize learning modules:', error);
  }
}

/**
 * Handle new message types from UI
 */
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle new message types
  if (!request || !request.type) {
    return false; // Let old handler deal with it (return false = we're not handling it)
  }

  console.log('[Integration-BG] Handling message type:', request.type);

  handleNewMessage(request, sender)
    .then(response => {
      console.log('[Integration-BG] Sending response for', request.type, ':', response);
      sendResponse(response);
    })
    .catch(error => {
      console.error('PrivacyShield: Message handler error:', error);
      sendResponse({ error: error.message });
    });

  return true; // CRITICAL: Keep message channel open for async response
});

/**
 * Route new message types
 */
async function handleNewMessage(request, sender) {
  const { type } = request;

  switch (type) {
    // Popup requests
    case 'GET_STATS':
      return await getPopupStats(request.url);

    case 'TOGGLE_ENABLED':
      return await toggleEnabled(request.enabled);

    case 'WHITELIST_DOMAIN':
      return await whitelistDomain(request.domain);

    case 'START_ELEMENT_PICKER':
      return await startElementPicker(sender.tab.id);

    // Settings requests
    case 'GET_SETTINGS':
      return await getSettings();

    case 'UPDATE_SETTINGS':
      return await updateSettings(request.settings);

    case 'SET_PROTECTION_LEVEL':
      return await setProtectionLevel(request.level, request.manual);

    case 'GET_TRUSTED_SITES':
      return await getTrustedSites();

    case 'ADD_TRUSTED_SITE':
      return await addTrustedSite(request.domain);

    case 'REMOVE_TRUSTED_SITE':
      return await removeTrustedSite(request.domain);

    case 'GET_LEARNING_STATS':
      return await getLearningStats();

    case 'RESET_LEARNING':
      return await resetLearning();

    case 'RESET_ALL':
      return await resetAll();

    case 'EXPORT_DATA':
      return await exportData();

    case 'IMPORT_DATA':
      return await importData(request.data);

    case 'GET_DETAILED_STATS':
      return await getDetailedStats();

    // Content script messages
    case 'TRACK_VISIT':
      return await trackVisit(request.domain, request.timeSpent);

    case 'BREAKAGE_DETECTED':
      return await handleBreakage(request.domain, request.report);

    case 'GET_LEARNING_NOTIFICATIONS':
      return await getLearningNotifications();

    case 'UPDATE_PAGE_STATS':
      return await updatePageStats(request.url, request.stats, sender.tab?.id);

    default:
      return { error: `Unknown message type: ${type}` };
  }
}

/**
 * Get stats for popup
 */
async function getPopupStats(url) {
  if (!isInitialized) await initializeLearningModules();

  let domain = '';
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname;
  } catch (e) {
    domain = '';
  }

  // Get current tab ID
  let currentTabId = null;
  try {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    currentTabId = tabs[0]?.id;
  } catch (e) {}

  // Get per-tab stats from storage (set by background.js)
  let networkStats = { blocked: 0, trackersBlocked: 0, cookiesBlocked: 0, fingerprintsBlocked: 0, totalBlocked: 0 };
  if (currentTabId) {
    const storageResult = await browserAPI.storage.local.get([`tabStats_${currentTabId}`]);
    networkStats = storageResult[`tabStats_${currentTabId}`] || networkStats;
  }

  // Get DOM blocking stats from content script (stored in currentTabStats)
  const domStats = currentTabStats.get(url) || {
    trackersBlocked: 0,
    cookiesBlocked: 0,
    fingerprintsBlocked: 0,
    totalBlocked: 0
  };

  // Combine network and DOM blocking stats
  const pageStats = {
    trackersBlocked: (domStats.trackersBlocked || 0) + (networkStats.trackersBlocked || 0),
    cookiesBlocked: (domStats.cookiesBlocked || 0) + (networkStats.cookiesBlocked || 0),
    fingerprintsBlocked: (domStats.fingerprintsBlocked || 0) + (networkStats.fingerprintsBlocked || 0),
    totalBlocked: (domStats.totalBlocked || 0) + (networkStats.totalBlocked || 0)
  };

  // Get performance metrics
  const perfStats = performanceTracker.getCurrentPageStats() || {
    timeSaved: 0,
    bandwidthSaved: 0
  };

  // Get protection level
  const levelStats = protectionLevelManager.getStats();

  // Calculate privacy score (simple algorithm)
  const privacyScore = calculatePrivacyScore(pageStats, domain);

  // Check if enabled
  const storage = await browserAPI.storage.local.get('enabled');
  const enabled = storage.enabled !== false;

  return {
    enabled,
    currentPage: {
      trackersBlocked: pageStats.trackersBlocked || 0,
      cookiesBlocked: pageStats.cookiesBlocked || 0,
      fingerprintsBlocked: pageStats.fingerprintsBlocked || 0
    },
    performance: {
      timeSaved: perfStats.timeSaved || 0,
      bandwidthSaved: perfStats.bandwidthSaved || 0
    },
    protectionLevel: {
      currentLevel: levelStats.currentLevel,
      progress: levelStats.progress,
      daysUntilNext: levelStats.daysUntilNext
    },
    privacyScore
  };
}

/**
 * Calculate privacy score (0-100)
 */
function calculatePrivacyScore(pageStats, domain) {
  let score = 50; // Base score

  // Add points for blocks
  score += Math.min(pageStats.trackersBlocked * 5, 30);
  score += Math.min(pageStats.cookiesBlocked * 3, 15);
  score += Math.min(pageStats.fingerprintsBlocked * 5, 20);

  // Reduce score if on known tracking domain
  const trackingDomains = ['facebook.com', 'google-analytics.com', 'doubleclick.net'];
  if (trackingDomains.some(td => domain.includes(td))) {
    score -= 20;
  }

  // Check if trusted
  if (trustedSitesManager && trustedSitesManager.isTrusted(domain)) {
    score = Math.max(score, 85); // Trusted sites get good score
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Toggle protection on/off
 */
async function toggleEnabled(enabled) {
  await browserAPI.storage.local.set({ enabled });
  return { success: true, enabled };
}

/**
 * Whitelist a domain
 */
async function whitelistDomain(domain) {
  if (!isInitialized) await initializeLearningModules();

  await trustedSitesManager.manualWhitelist_domain(domain);
  await learningEngine.recordTrustedSite(domain);

  return { success: true };
}

/**
 * Start element picker (placeholder for now)
 */
async function startElementPicker(tabId) {
  // Send message to content script to start picker
  try {
    await browserAPI.tabs.sendMessage(tabId, {
      type: 'START_ELEMENT_PICKER'
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get current settings
 */
async function getSettings() {
  const storage = await browserAPI.storage.local.get(null);

  return {
    protectionLevel: storage.protectionLevel || 'moderate',
    autoProgression: storage.autoProgression !== false,
    learning: {
      enabled: storage.learningEnabled !== false
    },
    blockAds: storage.blockAds !== false,
    blockSocialWidgets: storage.blockSocialWidgets === true,
    blockCookieBanners: storage.blockCookieBanners !== false,
    debugMode: storage.debugMode === true
  };
}

/**
 * Update settings
 */
async function updateSettings(settings) {
  await browserAPI.storage.local.set(settings);
  return { success: true };
}

/**
 * Set protection level
 */
async function setProtectionLevel(level, manual = true) {
  if (!isInitialized) await initializeLearningModules();

  await protectionLevelManager.setLevel(level, manual);
  await browserAPI.storage.local.set({ protectionLevel: level });

  return { success: true };
}

/**
 * Get trusted sites list
 */
async function getTrustedSites() {
  if (!isInitialized) await initializeLearningModules();

  const sites = trustedSitesManager.getAllTrustedSites();

  return { sites };
}

/**
 * Add trusted site
 */
async function addTrustedSite(domain) {
  if (!isInitialized) await initializeLearningModules();

  await trustedSitesManager.manualWhitelist_domain(domain);
  await learningEngine.recordTrustedSite(domain);

  return { success: true };
}

/**
 * Remove trusted site
 */
async function removeTrustedSite(domain) {
  if (!isInitialized) await initializeLearningModules();

  await trustedSitesManager.removeFromWhitelist(domain);

  return { success: true };
}

/**
 * Get learning statistics
 */
async function getLearningStats() {
  console.log('[Integration] ===== getLearningStats called =====');
  console.log('[Integration] isInitialized:', isInitialized);

  if (!isInitialized) {
    console.log('[Integration] Not initialized, initializing now...');
    await initializeLearningModules();
  }

  console.log('[Integration] Getting learning summary...');
  const learningSummary = await learningEngine.getLearningSummary();
  console.log('[Integration] Learning summary received:', learningSummary);

  console.log('[Integration] Getting protection stats...');
  const protectionStats = protectionLevelManager.getStats();
  console.log('[Integration] Protection stats received:', protectionStats);

  const result = {
    ...learningSummary,
    currentLevel: protectionStats.currentLevel,
    daysInstalled: protectionStats.daysSinceInstall,
    levelProgress: protectionStats.progress
  };

  console.log('[Integration] ===== getLearningStats returning:', JSON.stringify(result, null, 2), '=====');
  return result;
}

/**
 * Reset learning data
 */
async function resetLearning() {
  if (!isInitialized) await initializeLearningModules();

  await Promise.all([
    learningEngine.reset(),
    trustedSitesManager.reset(),
    falsePositiveTracker.reset()
  ]);

  return { success: true };
}

/**
 * Reset everything
 */
async function resetAll() {
  if (!isInitialized) await initializeLearningModules();

  await Promise.all([
    learningEngine.reset(),
    trustedSitesManager.reset(),
    falsePositiveTracker.reset(),
    protectionLevelManager.reset(),
    performanceTracker.reset(),
    browserAPI.storage.local.clear()
  ]);

  return { success: true };
}

/**
 * Export all data
 */
async function exportData() {
  if (!isInitialized) await initializeLearningModules();

  return {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    learning: learningEngine.exportData(),
    trustedSites: trustedSitesManager.exportData(),
    falsePositives: falsePositiveTracker.exportData(),
    protectionLevel: protectionLevelManager.exportData(),
    performance: performanceTracker.exportData(),
    settings: await getSettings()
  };
}

/**
 * Import data
 */
async function importData(data) {
  if (!isInitialized) await initializeLearningModules();

  if (data.learning) await learningEngine.importData(data.learning);
  if (data.trustedSites) await trustedSitesManager.importData(data.trustedSites);
  if (data.falsePositives) await falsePositiveTracker.importData(data.falsePositives);
  if (data.protectionLevel) await protectionLevelManager.importData(data.protectionLevel);
  if (data.performance) await performanceTracker.importData(data.performance);
  if (data.settings) await updateSettings(data.settings);

  return { success: true };
}

/**
 * Get detailed statistics
 */
async function getDetailedStats() {
  if (!isInitialized) await initializeLearningModules();

  return {
    learning: learningEngine.getStats(),
    trustedSites: trustedSitesManager.getStats(),
    falsePositives: falsePositiveTracker.getStats(),
    protectionLevel: protectionLevelManager.getStats(),
    performance: performanceTracker.getPerformanceStats()
  };
}

/**
 * Track visit from content script
 */
async function trackVisit(domain, timeSpent) {
  if (!isInitialized) await initializeLearningModules();

  await trustedSitesManager.trackVisit(domain, timeSpent);

  return { success: true };
}

/**
 * Handle breakage from content script
 */
async function handleBreakage(domain, report) {
  if (!isInitialized) await initializeLearningModules();

  const result = await falsePositiveTracker.recordBreakage(domain, report);

  // Update protection level with false positive
  if (result.autoFixed) {
    await protectionLevelManager.updateProgression('false_positive');
  }

  return { success: true, autoFixed: result.autoFixed };
}

/**
 * Get pending learning notifications
 */
async function getLearningNotifications() {
  // Check for any pending notifications
  // This is a placeholder - in a full implementation, you'd queue notifications
  return { notification: null };
}

/**
 * Update page stats from content script
 */
async function updatePageStats(url, stats, tabId) {
  if (!url || !stats) return { success: false };

  // Store stats for this URL
  currentTabStats.set(url, stats);

  // Update badge count
  try {
    const totalBlocked = stats.totalBlocked || 0;
    await browserAPI.action.setBadgeText({
      text: totalBlocked > 0 ? String(totalBlocked) : '',
      tabId: tabId
    });
    await browserAPI.action.setBadgeBackgroundColor({
      color: '#10b981', // Green
      tabId: tabId
    });
  } catch (error) {
    // Silently fail if action API not available
  }

  return { success: true };
}

/**
 * Track blocked request
 */
function trackBlockedRequest(details) {
  console.log('[Integration] trackBlockedRequest called:', details.url);

  if (!isInitialized) {
    console.warn('[Integration] trackBlockedRequest - not initialized yet!');
    return;
  }

  // Update performance tracker
  performanceTracker.trackBlockedRequest({
    url: details.url,
    type: details.type,
    size: details.size || null,
    initiator: details.initiator || details.url,
    timestamp: Date.now()
  });

  // Update protection level with threat blocked
  protectionLevelManager.updateProgression('threat_blocked');

  // Analyze URL with pattern analyzer to record new techniques
  // This builds the "New Techniques Detected" counter
  try {
    if (details.url) {
      console.log('[Integration] Analyzing URL with pattern analyzer:', details.url);
      const result = patternAnalyzer.analyzeURL(details.url);
      console.log('[Integration] Pattern analysis result:', result);
    }
  } catch (error) {
    console.error('[Integration] Pattern analysis error:', error);
  }

  // Analyze domain with threat detector to record threat patterns
  // This builds the "Threat Patterns Learned" counter
  try {
    if (details.url) {
      const urlObj = new URL(details.url);
      const domain = urlObj.hostname;
      console.log('[Integration] Analyzing domain with threat detector:', domain);
      threatDetector.analyzeDomain(domain, { blockedUrl: details.url });
    }
  } catch (error) {
    console.error('[Integration] Threat detection error:', error);
  }
}

// Initialize modules on extension startup
initializeLearningModules();

// Export for use in other scripts
if (typeof globalThis !== 'undefined') {
  globalThis.privacyShieldIntegration = {
    trackBlockedRequest,
    isInitialized: () => isInitialized
  };
}

console.log('PrivacyShield: Integration layer loaded');
