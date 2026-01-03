// PrivacyShield Max - Background Script (Refactored)
// Modular architecture with ES6 imports

console.log('PrivacyShield Max - Background Script Starting (Modular)...');

// Import core modules
import { VERSION, MESSAGE_TYPES, DEFAULT_SETTINGS } from './core/constants.js';
import { getBrowserAPI } from './core/utils.js';
import storageManager from './core/storage-manager.js';
import messagingHub from './core/messaging-hub.js';
import logger from './core/logger.js';

// Import background modules
import dnrEngine from './background/dnr-engine.js';
import statsTracker from './background/stats-tracker.js';
import filterUpdater from './background/filter-updater.js';
import cnameResolver from './background/cname-resolver.js';
import requestAnalyzer from './background/request-analyzer.js';

// Global state
const browserAPI = getBrowserAPI();
let isInitialized = false;

/**
 * Initialize extension
 */
async function initialize() {
  if (isInitialized) {
    logger.warn('Extension already initialized');
    return;
  }

  try {
    logger.info('Initializing PrivacyShield Max', VERSION);

    // Initialize core systems
    await storageManager.initialize();
    messagingHub.initialize();
    await logger.initialize();

    // Initialize background modules
    await dnrEngine.initialize();
    await statsTracker.initialize();
    await filterUpdater.initialize();
    await cnameResolver.initialize();
    await requestAnalyzer.initialize();

    // Setup message handlers
    setupMessageHandlers();

    // Setup listeners
    setupListeners();

    // Start periodic tasks
    startPeriodicTasks();

    isInitialized = true;
    logger.info('PrivacyShield Max initialized successfully');

  } catch (error) {
    logger.error('Initialization failed:', error);
  }
}

/**
 * Setup message handlers
 */
function setupMessageHandlers() {
  // Get settings
  messagingHub.on(MESSAGE_TYPES.GET_SETTINGS, async () => {
    return await storageManager.getSettings();
  });

  // Update settings
  messagingHub.on(MESSAGE_TYPES.UPDATE_SETTINGS, async (data) => {
    await storageManager.updateSettings(data);
    return { success: true };
  });

  // Get stats
  messagingHub.on(MESSAGE_TYPES.GET_STATS, async () => {
    return statsTracker.getStats();
  });

  // Reset stats
  messagingHub.on(MESSAGE_TYPES.RESET_STATS, async () => {
    await statsTracker.reset();
    return { success: true };
  });

  // Toggle enabled
  messagingHub.on(MESSAGE_TYPES.TOGGLE_ENABLED, async () => {
    const settings = await storageManager.getSettings();
    await storageManager.updateSettings({ enabled: !settings.enabled });
    return { enabled: !settings.enabled };
  });

  // Change privacy mode
  messagingHub.on(MESSAGE_TYPES.CHANGE_MODE, async (data) => {
    await storageManager.updateSettings({ mode: data.mode });
    return { success: true };
  });

  // Whitelist domain
  messagingHub.on(MESSAGE_TYPES.WHITELIST_DOMAIN, async (data) => {
    await storageManager.addToWhitelist(data.domain);
    return { success: true };
  });

  // Temporary whitelist
  messagingHub.on(MESSAGE_TYPES.TEMPORARY_WHITELIST, async (data) => {
    await storageManager.addToTemporaryWhitelist(data.domain, data.duration);
    return { success: true };
  });

  // Update filters
  messagingHub.on(MESSAGE_TYPES.UPDATE_FILTERS, async () => {
    const result = await filterUpdater.forceUpdate();
    return result;
  });

  // Block element
  messagingHub.on(MESSAGE_TYPES.BLOCK_ELEMENT, async (data) => {
    // This will be handled by content script
    // Just store in custom blocked elements
    const blockedElements = await storageManager.get('blockedElements') || [];
    blockedElements.push({
      selector: data.selector,
      domain: data.domain
    });
    await storageManager.set({ blockedElements });
    return { success: true };
  });

  // Show notification
  messagingHub.on(MESSAGE_TYPES.SHOW_NOTIFICATION, async (data) => {
    await showNotification(data.title, data.message, data.options);
    return { success: true };
  });

  // Breakage notification
  messagingHub.on('SHOW_BREAKAGE_NOTIFICATION', async (data) => {
    await showBreakageNotification(data);
    return { success: true };
  });

  // Fingerprint detected
  messagingHub.on('FINGERPRINT_DETECTED', async (data) => {
    logger.info('Fingerprinting detected:', data);
    statsTracker.increment('fingerprintingAttempts');
    return { success: true };
  });

  // Get privacy score
  messagingHub.on(MESSAGE_TYPES.GET_PRIVACY_SCORE, async (data) => {
    const score = await calculatePrivacyScore(data.domain);
    return score;
  });
}

/**
 * Setup browser listeners
 */
function setupListeners() {
  // Extension installation/update
  if (browserAPI && browserAPI.runtime && browserAPI.runtime.onInstalled) {
    browserAPI.runtime.onInstalled.addListener((details) => {
      onInstalled(details);
    });
  }

  // Tab updates
  if (browserAPI && browserAPI.tabs && browserAPI.tabs.onUpdated) {
    browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      onTabUpdated(tabId, changeInfo, tab);
    });
  }

  // Alarm for scheduled tasks
  if (browserAPI && browserAPI.alarms) {
    browserAPI.alarms.onAlarm.addListener((alarm) => {
      onAlarm(alarm);
    });
  }
}

/**
 * Handle extension installation/update
 * @param {Object} details - Installation details
 */
async function onInstalled(details) {
  if (details.reason === 'install') {
    logger.info('Extension installed');

    // Set default settings
    await storageManager.set(DEFAULT_SETTINGS);

    // Open welcome page (optional)
    // browserAPI.tabs.create({ url: 'options.html' });

  } else if (details.reason === 'update') {
    logger.info('Extension updated to', VERSION);

    // Perform migration if needed
    await storageManager.migrate(details.previousVersion);
  }
}

/**
 * Handle tab updates
 * @param {number} tabId - Tab ID
 * @param {Object} changeInfo - Change info
 * @param {Object} tab - Tab object
 */
async function onTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    // Update badge for this tab
    const domain = new URL(tab.url).hostname;
    const isWhitelisted = await storageManager.isWhitelisted(domain);

    if (isWhitelisted) {
      // Show green badge for whitelisted sites
      browserAPI.action.setBadgeBackgroundColor({ tabId, color: '#4CAF50' });
    }
  }
}

/**
 * Handle alarms
 * @param {Object} alarm - Alarm object
 */
function onAlarm(alarm) {
  if (alarm.name === 'cleanup') {
    performCleanup();
  } else if (alarm.name === 'filterUpdate') {
    filterUpdater.updateFilters();
  }
}

/**
 * Start periodic tasks
 */
function startPeriodicTasks() {
  // Memory cleanup every 5 minutes
  if (browserAPI && browserAPI.alarms) {
    browserAPI.alarms.create('cleanup', {
      periodInMinutes: 5
    });
  }

  // Filter update check every hour
  if (browserAPI && browserAPI.alarms) {
    browserAPI.alarms.create('filterUpdate', {
      periodInMinutes: 60
    });
  }
}

/**
 * Perform memory cleanup
 */
async function performCleanup() {
  logger.debug('Performing cleanup...');

  // Cleanup stats tracker
  statsTracker.performCleanup();

  // Cleanup CNAME resolver cache
  cnameResolver.performCleanup();

  // Cleanup request analyzer cache
  requestAnalyzer.cleanupCache();

  // Clear DNR cache
  dnrEngine.clearCache();

  logger.debug('Cleanup complete');
}

/**
 * Show notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} options - Additional options
 */
async function showNotification(title, message, options = {}) {
  if (!browserAPI || !browserAPI.notifications) {
    return;
  }

  const settings = await storageManager.getSettings();

  // Check if notifications are enabled
  if (settings.silentMode) {
    // Silent mode - only update badge, no notification
    return;
  }

  browserAPI.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: options.priority || 1,
    ...options
  });
}

/**
 * Show breakage notification
 * @param {Object} data - Breakage data
 */
async function showBreakageNotification(data) {
  const settings = await storageManager.getSettings();

  if (settings.silentMode) {
    return;
  }

  if (browserAPI && browserAPI.notifications) {
    browserAPI.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Site May Be Broken',
      message: `${data.domain} appears broken. Blocking temporarily disabled for 1 hour.`,
      buttons: [
        { title: 'Whitelist Permanently' },
        { title: 'Review Settings' }
      ],
      priority: 2
    });

    // Handle button clicks
    browserAPI.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      if (buttonIndex === 0) {
        // Whitelist permanently
        storageManager.addToWhitelist(data.domain);
      } else if (buttonIndex === 1) {
        // Open options page
        browserAPI.tabs.create({ url: 'options.html' });
      }

      browserAPI.notifications.clear(notificationId);
    });
  }
}

/**
 * Calculate privacy score for domain
 * @param {string} domain - Domain to score
 * @returns {Object} - Privacy score
 */
async function calculatePrivacyScore(domain) {
  const domainStats = statsTracker.getDomainStats(domain);

  let score = 100; // Start at perfect score

  // Deduct points for privacy violations
  score -= (domainStats.tracked || 0) * 2;
  score -= (domainStats.blocked || 0) * 1;
  score -= (domainStats.cnameUncloaked || 0) * 3;
  score -= (domainStats.fingerprintingAttempts || 0) * 5;

  // Bonus for good practices (if we detect them)
  // TODO: Add HTTPS detection, no third-party requests, etc.

  score = Math.max(0, Math.min(100, score));

  // Determine grade
  let grade, color;
  if (score >= 90) {
    grade = 'A';
    color = 'green';
  } else if (score >= 75) {
    grade = 'B';
    color = 'lightgreen';
  } else if (score >= 60) {
    grade = 'C';
    color = 'yellow';
  } else if (score >= 40) {
    grade = 'D';
    color = 'orange';
  } else {
    grade = 'F';
    color = 'red';
  }

  return {
    domain,
    score,
    grade,
    color,
    stats: domainStats
  };
}

// Initialize when background script loads
initialize();

// Export for debugging (accessible via chrome.extension.getBackgroundPage())
if (typeof window !== 'undefined') {
  window.PrivacyShieldMax = {
    VERSION,
    dnrEngine,
    statsTracker,
    filterUpdater,
    cnameResolver,
    requestAnalyzer,
    storageManager,
    logger,
    getStats: () => statsTracker.getStats(),
    resetStats: () => statsTracker.reset(),
    updateFilters: () => filterUpdater.forceUpdate(),
    performCleanup
  };
}
