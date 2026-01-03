// PrivacyShield Max - Popup Script
// Handles UI interactions and data display

// Browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// DOM elements
const elements = {
  enabled: document.getElementById('enabled'),
  protectionLevel: document.getElementById('protection-level'),
  levelProgress: document.getElementById('level-progress'),
  shieldPulse: document.getElementById('shield-pulse'),
  scoreNumber: document.getElementById('score-number'),
  scoreArc: document.getElementById('score-arc'),
  trackersBlocked: document.getElementById('trackers-blocked'),
  cookiesBlocked: document.getElementById('cookies-blocked'),
  fingerprintsBlocked: document.getElementById('fingerprints-blocked'),
  speedSaved: document.getElementById('speed-saved'),
  dataSaved: document.getElementById('data-saved'),
  learningNotification: document.getElementById('learning-notification'),
  learningTitle: document.getElementById('learning-title'),
  learningMessage: document.getElementById('learning-message'),
  dismissLearning: document.getElementById('dismiss-learning'),
  whitelistBtn: document.getElementById('whitelist-btn'),
  blockElementBtn: document.getElementById('block-element-btn'),
  settingsBtn: document.getElementById('settings-btn')
};

// State
let currentTab = null;
let stats = null;

/**
 * Initialize popup
 */
async function initialize() {
  try {
    // Get current tab
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];

    // Load stats and update UI
    await loadStats();
    await updateUI();

    // Set up event listeners
    setupEventListeners();

    // Check for learning notifications
    checkLearningNotifications();

  } catch (error) {
    console.error('Failed to initialize popup:', error);
  }
}

/**
 * Load statistics from background
 */
async function loadStats() {
  try {
    const response = await browserAPI.runtime.sendMessage({
      type: 'GET_STATS',
      url: currentTab?.url
    });

    stats = response || {
      currentPage: {
        trackersBlocked: 0,
        cookiesBlocked: 0,
        fingerprintsBlocked: 0
      },
      performance: {
        timeSaved: 0,
        bandwidthSaved: 0
      },
      protectionLevel: {
        currentLevel: 'conservative',
        progress: 0,
        daysUntilNext: 7
      },
      privacyScore: 0,
      enabled: true
    };
  } catch (error) {
    console.error('Failed to load stats:', error);
    stats = getDefaultStats();
  }
}

/**
 * Get default stats
 */
function getDefaultStats() {
  return {
    currentPage: { trackersBlocked: 0, cookiesBlocked: 0, fingerprintsBlocked: 0 },
    performance: { timeSaved: 0, bandwidthSaved: 0 },
    protectionLevel: { currentLevel: 'conservative', progress: 0, daysUntilNext: 7 },
    privacyScore: 0,
    enabled: true
  };
}

/**
 * Update UI with current stats
 */
async function updateUI() {
  if (!stats) return;

  // Update enabled state
  elements.enabled.checked = stats.enabled !== false;

  // Update protection level
  updateProtectionLevel(stats.protectionLevel);

  // Update privacy score
  updatePrivacyScore(stats.privacyScore || 0);

  // Update blocked counts
  elements.trackersBlocked.textContent = stats.currentPage?.trackersBlocked || 0;
  elements.cookiesBlocked.textContent = stats.currentPage?.cookiesBlocked || 0;
  elements.fingerprintsBlocked.textContent = stats.currentPage?.fingerprintsBlocked || 0;

  // Update performance metrics
  updatePerformanceMetrics(stats.performance);

  // Update shield pulse animation
  if (stats.enabled && (stats.currentPage?.trackersBlocked > 0)) {
    elements.shieldPulse.classList.add('active');
  } else {
    elements.shieldPulse.classList.remove('active');
  }
}

/**
 * Update protection level display
 */
function updateProtectionLevel(levelData) {
  if (!levelData) return;

  const level = levelData.currentLevel || 'conservative';
  const levelNames = {
    conservative: 'Conservative',
    moderate: 'Moderate',
    aggressive: 'Aggressive'
  };

  elements.protectionLevel.textContent = levelNames[level] || 'Conservative';

  // Update progress text
  if (level === 'aggressive') {
    elements.levelProgress.textContent = 'Maximum Protection';
  } else {
    const nextLevel = level === 'conservative' ? 'Moderate' : 'Aggressive';
    const days = levelData.daysUntilNext || 0;

    if (days > 0) {
      elements.levelProgress.textContent = `→ ${nextLevel} (${Math.ceil(days)} days)`;
    } else {
      elements.levelProgress.textContent = `→ ${nextLevel} (soon)`;
    }
  }

  // Update badge color based on level
  if (level === 'aggressive') {
    elements.protectionLevel.style.color = '#ef4444'; // Red
  } else if (level === 'moderate') {
    elements.protectionLevel.style.color = '#f59e0b'; // Amber
  } else {
    elements.protectionLevel.style.color = '#10b981'; // Green
  }
}

/**
 * Update privacy score circle
 */
function updatePrivacyScore(score) {
  // Ensure score is between 0-100
  score = Math.max(0, Math.min(100, score));

  elements.scoreNumber.textContent = Math.round(score);

  // Calculate arc dashoffset (339.292 = full circle circumference)
  const circumference = 339.292;
  const offset = circumference - (score / 100) * circumference;

  elements.scoreArc.style.strokeDashoffset = offset;

  // Change color based on score
  if (score >= 90) {
    elements.scoreArc.style.stroke = '#10b981'; // Green
  } else if (score >= 70) {
    elements.scoreArc.style.stroke = '#f59e0b'; // Amber
  } else {
    elements.scoreArc.style.stroke = '#ef4444'; // Red
  }
}

/**
 * Update performance metrics
 */
function updatePerformanceMetrics(performance) {
  if (!performance) return;

  // Format time saved
  const timeSaved = performance.timeSaved || 0;
  if (timeSaved > 0) {
    elements.speedSaved.textContent = `+${timeSaved}ms`;
  } else {
    elements.speedSaved.textContent = '+0ms';
  }

  // Format bandwidth saved
  const bandwidthSaved = performance.bandwidthSaved || 0;
  elements.dataSaved.textContent = formatBytes(bandwidthSaved);
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Check for learning notifications
 */
async function checkLearningNotifications() {
  try {
    const response = await browserAPI.runtime.sendMessage({
      type: 'GET_LEARNING_NOTIFICATIONS'
    });

    if (response && response.notification) {
      showLearningNotification(response.notification);
    }
  } catch (error) {
    // No notifications or error
  }
}

/**
 * Show learning notification
 */
function showLearningNotification(notification) {
  elements.learningTitle.textContent = notification.title || 'Learning Update';
  elements.learningMessage.textContent = notification.message || '';
  elements.learningNotification.style.display = 'flex';

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    dismissLearningNotification();
  }, 10000);
}

/**
 * Dismiss learning notification
 */
function dismissLearningNotification() {
  elements.learningNotification.style.display = 'none';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Enable/disable toggle
  elements.enabled.addEventListener('change', async (e) => {
    try {
      await browserAPI.runtime.sendMessage({
        type: 'TOGGLE_ENABLED',
        enabled: e.target.checked
      });

      // Reload stats
      await loadStats();
      await updateUI();
    } catch (error) {
      console.error('Failed to toggle protection:', error);
    }
  });

  // Whitelist button
  elements.whitelistBtn.addEventListener('click', async () => {
    if (!currentTab?.url) return;

    try {
      const url = new URL(currentTab.url);
      const domain = url.hostname;

      await browserAPI.runtime.sendMessage({
        type: 'WHITELIST_DOMAIN',
        domain: domain
      });

      // Show feedback
      showTemporaryFeedback(elements.whitelistBtn, '✓ Added');

      // Reload stats
      setTimeout(async () => {
        await loadStats();
        await updateUI();
      }, 500);
    } catch (error) {
      console.error('Failed to whitelist domain:', error);
      showTemporaryFeedback(elements.whitelistBtn, '✗ Error');
    }
  });

  // Block element button
  elements.blockElementBtn.addEventListener('click', async () => {
    try {
      // Send message to content script to start element picker
      await browserAPI.tabs.sendMessage(currentTab.id, {
        type: 'START_ELEMENT_PICKER'
      });

      // Close popup
      window.close();
    } catch (error) {
      console.error('Failed to start element picker:', error);
    }
  });

  // Settings button
  elements.settingsBtn.addEventListener('click', () => {
    browserAPI.runtime.openOptionsPage();
    window.close();
  });

  // Dismiss learning notification
  elements.dismissLearning.addEventListener('click', dismissLearningNotification);
}

/**
 * Show temporary feedback on button
 */
function showTemporaryFeedback(button, text) {
  const originalText = button.querySelector('.btn-text')?.textContent || '';
  const textElement = button.querySelector('.btn-text');

  if (textElement) {
    textElement.textContent = text;

    setTimeout(() => {
      textElement.textContent = originalText;
    }, 2000);
  }
}

/**
 * Listen for updates from background
 */
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATS_UPDATE') {
    stats = message.data;
    updateUI();
  } else if (message.type === 'LEARNING_NOTIFICATION') {
    showLearningNotification({
      title: message.title,
      message: message.message
    });
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
