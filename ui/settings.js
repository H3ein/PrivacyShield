// PrivacyShield Max - Settings Script
// Handles settings UI and data management

// Browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// DOM elements
const elements = {
  // Protection Level
  levelConservative: document.getElementById('level-conservative'),
  levelModerate: document.getElementById('level-moderate'),
  levelAggressive: document.getElementById('level-aggressive'),
  autoProgression: document.getElementById('auto-progression'),
  currentLevelDisplay: document.getElementById('current-level-display'),
  daysInstalled: document.getElementById('days-installed'),
  levelProgress: document.getElementById('level-progress'),

  // Learning
  learningEnabled: document.getElementById('learning-enabled'),
  trustedSitesCount: document.getElementById('trusted-sites-count'),
  newTechniquesCount: document.getElementById('new-techniques-count'),
  autoFixedCount: document.getElementById('auto-fixed-count'),
  threatsLearned: document.getElementById('threats-learned'),
  resetLearningBtn: document.getElementById('reset-learning-btn'),

  // Trusted Sites
  siteInput: document.getElementById('site-input'),
  addSiteBtn: document.getElementById('add-site-btn'),
  trustedSitesList: document.getElementById('trusted-sites-list'),
  emptySites: document.getElementById('empty-sites'),

  // Privacy Priority
  blockAds: document.getElementById('block-ads'),
  blockSocialWidgets: document.getElementById('block-social-widgets'),
  blockCookieBanners: document.getElementById('block-cookie-banners'),

  // Advanced
  debugMode: document.getElementById('debug-mode'),
  viewStatsBtn: document.getElementById('view-stats-btn'),
  resetAllBtn: document.getElementById('reset-all-btn'),

  // Header
  exportBtn: document.getElementById('export-btn'),
  importBtn: document.getElementById('import-btn'),
  importFile: document.getElementById('import-file'),

  // Footer
  saveMessage: document.getElementById('save-message')
};

// State
let settings = null;
let trustedSites = [];

/**
 * Initialize settings page
 */
async function initialize() {
  try {
    await loadSettings();
    await loadTrustedSites();
    await loadLearningStats();
    updateUI();
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize settings:', error);
  }
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const response = await browserAPI.runtime.sendMessage({
      type: 'GET_SETTINGS'
    });

    settings = response || getDefaultSettings();
  } catch (error) {
    console.error('Failed to load settings:', error);
    settings = getDefaultSettings();
  }
}

/**
 * Get default settings
 */
function getDefaultSettings() {
  return {
    protectionLevel: 'moderate',
    autoProgression: true,
    learning: {
      enabled: true
    },
    blockAds: true,
    blockSocialWidgets: false,
    blockCookieBanners: true,
    debugMode: false
  };
}

/**
 * Load trusted sites list
 */
async function loadTrustedSites() {
  try {
    const response = await browserAPI.runtime.sendMessage({
      type: 'GET_TRUSTED_SITES'
    });

    trustedSites = response?.sites || [];
  } catch (error) {
    console.error('Failed to load trusted sites:', error);
    trustedSites = [];
  }
}

/**
 * Load learning statistics
 */
async function loadLearningStats() {
  try {
    console.log('[Settings] Requesting learning stats...');
    const response = await browserAPI.runtime.sendMessage({
      type: 'GET_LEARNING_STATS'
    });

    console.log('[Settings] GET_LEARNING_STATS response:', response);

    if (response) {
      console.log('[Settings] Updating UI with stats:', {
        trustedSitesCount: response.trustedSitesCount,
        newTechniquesDetected: response.newTechniquesDetected,
        autoFixedSites: response.autoFixedSites,
        threatPatternsLearned: response.threatPatternsLearned
      });
      updateLearningStats(response);
    } else {
      console.warn('[Settings] No response received from GET_LEARNING_STATS');
    }
  } catch (error) {
    console.error('Failed to load learning stats:', error);
  }
}

/**
 * Update UI with current settings
 */
function updateUI() {
  if (!settings) return;

  // Protection Level
  const level = settings.protectionLevel || 'moderate';
  if (level === 'conservative') elements.levelConservative.checked = true;
  else if (level === 'moderate') elements.levelModerate.checked = true;
  else if (level === 'aggressive') elements.levelAggressive.checked = true;

  elements.autoProgression.checked = settings.autoProgression !== false;

  // Learning
  elements.learningEnabled.checked = settings.learning?.enabled !== false;

  // Privacy Priority
  elements.blockAds.checked = settings.blockAds !== false;
  elements.blockSocialWidgets.checked = settings.blockSocialWidgets === true;
  elements.blockCookieBanners.checked = settings.blockCookieBanners !== false;

  // Advanced
  elements.debugMode.checked = settings.debugMode === true;

  // Update trusted sites list
  updateTrustedSitesList();
}

/**
 * Update learning statistics display
 */
function updateLearningStats(stats) {
  console.log('[Settings] updateLearningStats called with:', stats);

  const trustedCount = stats.trustedSitesCount || 0;
  const newTechCount = stats.newTechniquesDetected || 0;
  const autoFixedCount = stats.autoFixedSites || 0;
  const threatsCount = stats.threatPatternsLearned || 0;

  console.log('[Settings] Setting UI values:', {
    trustedCount,
    newTechCount,
    autoFixedCount,
    threatsCount
  });

  elements.trustedSitesCount.textContent = trustedCount;
  elements.newTechniquesCount.textContent = newTechCount;
  elements.autoFixedCount.textContent = autoFixedCount;
  elements.threatsLearned.textContent = threatsCount;

  // Update protection status
  if (stats.daysInstalled !== undefined) {
    elements.daysInstalled.textContent = Math.floor(stats.daysInstalled);
  }

  if (stats.levelProgress !== undefined) {
    elements.levelProgress.textContent = Math.round(stats.levelProgress) + '%';
  }

  if (stats.currentLevel) {
    const levelNames = {
      conservative: 'Conservative',
      moderate: 'Moderate',
      aggressive: 'Aggressive'
    };
    elements.currentLevelDisplay.textContent = levelNames[stats.currentLevel] || 'Moderate';
  }
}

/**
 * Update trusted sites list display
 */
function updateTrustedSitesList() {
  if (trustedSites.length === 0) {
    elements.emptySites.style.display = 'block';
    return;
  }

  elements.emptySites.style.display = 'none';

  // Clear existing items (except empty state)
  const existingItems = elements.trustedSitesList.querySelectorAll('.site-item');
  existingItems.forEach(item => item.remove());

  // Add each site
  trustedSites.forEach(site => {
    const siteElement = createSiteElement(site);
    elements.trustedSitesList.appendChild(siteElement);
  });
}

/**
 * Create site list element
 */
function createSiteElement(site) {
  const div = document.createElement('div');
  div.className = 'site-item';
  div.innerHTML = `
    <div class="site-info">
      <span class="site-domain">${escapeHtml(site.domain)}</span>
      <span class="site-badge ${site.type === 'manual' ? 'manual' : ''}">${site.type === 'manual' ? 'Manual' : 'Auto-learned'}</span>
    </div>
    <button class="remove-btn" data-domain="${escapeHtml(site.domain)}">Remove</button>
  `;

  // Add remove button listener
  const removeBtn = div.querySelector('.remove-btn');
  removeBtn.addEventListener('click', () => removeTrustedSite(site.domain));

  return div;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Protection Level
  elements.levelConservative.addEventListener('change', () => saveProtectionLevel('conservative'));
  elements.levelModerate.addEventListener('change', () => saveProtectionLevel('moderate'));
  elements.levelAggressive.addEventListener('change', () => saveProtectionLevel('aggressive'));
  elements.autoProgression.addEventListener('change', saveSetting);

  // Learning
  elements.learningEnabled.addEventListener('change', saveSetting);
  elements.resetLearningBtn.addEventListener('click', resetLearning);

  // Trusted Sites
  elements.addSiteBtn.addEventListener('click', addTrustedSite);
  elements.siteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTrustedSite();
  });

  // Privacy Priority
  elements.blockAds.addEventListener('change', saveSetting);
  elements.blockSocialWidgets.addEventListener('change', saveSetting);
  elements.blockCookieBanners.addEventListener('change', saveSetting);

  // Advanced
  elements.debugMode.addEventListener('change', saveSetting);
  elements.viewStatsBtn.addEventListener('click', viewDetailedStats);
  elements.resetAllBtn.addEventListener('click', resetAll);

  // Header
  elements.exportBtn.addEventListener('click', exportData);
  elements.importBtn.addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', importData);
}

/**
 * Save protection level
 */
async function saveProtectionLevel(level) {
  try {
    await browserAPI.runtime.sendMessage({
      type: 'SET_PROTECTION_LEVEL',
      level: level,
      manual: true
    });

    showSaveMessage();
  } catch (error) {
    console.error('Failed to save protection level:', error);
  }
}

/**
 * Save general setting
 */
async function saveSetting() {
  const updatedSettings = {
    protectionLevel: getSelectedLevel(),
    autoProgression: elements.autoProgression.checked,
    learning: {
      enabled: elements.learningEnabled.checked
    },
    blockAds: elements.blockAds.checked,
    blockSocialWidgets: elements.blockSocialWidgets.checked,
    blockCookieBanners: elements.blockCookieBanners.checked,
    debugMode: elements.debugMode.checked
  };

  try {
    await browserAPI.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: updatedSettings
    });

    settings = updatedSettings;
    showSaveMessage();
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Get selected protection level
 */
function getSelectedLevel() {
  if (elements.levelConservative.checked) return 'conservative';
  if (elements.levelModerate.checked) return 'moderate';
  if (elements.levelAggressive.checked) return 'aggressive';
  return 'moderate';
}

/**
 * Add trusted site
 */
async function addTrustedSite() {
  const domain = elements.siteInput.value.trim();

  if (!domain) return;

  // Basic domain validation
  if (!isValidDomain(domain)) {
    alert('Please enter a valid domain (e.g., example.com)');
    return;
  }

  try {
    await browserAPI.runtime.sendMessage({
      type: 'ADD_TRUSTED_SITE',
      domain: domain
    });

    // Add to local list
    trustedSites.push({
      domain: domain,
      type: 'manual',
      confidence: 1.0
    });

    // Clear input
    elements.siteInput.value = '';

    // Update display
    updateTrustedSitesList();
    showSaveMessage();
  } catch (error) {
    console.error('Failed to add trusted site:', error);
  }
}

/**
 * Remove trusted site
 */
async function removeTrustedSite(domain) {
  if (!confirm(`Remove ${domain} from trusted sites?`)) {
    return;
  }

  try {
    await browserAPI.runtime.sendMessage({
      type: 'REMOVE_TRUSTED_SITE',
      domain: domain
    });

    // Remove from local list
    trustedSites = trustedSites.filter(site => site.domain !== domain);

    // Update display
    updateTrustedSitesList();
    showSaveMessage();
  } catch (error) {
    console.error('Failed to remove trusted site:', error);
  }
}

/**
 * Validate domain
 */
function isValidDomain(domain) {
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
  return domainRegex.test(domain);
}

/**
 * Reset learning data
 */
async function resetLearning() {
  if (!confirm('Reset all learning data? This will clear trusted sites, learned patterns, and statistics.')) {
    return;
  }

  try {
    await browserAPI.runtime.sendMessage({
      type: 'RESET_LEARNING'
    });

    // Reload stats
    await loadLearningStats();
    await loadTrustedSites();
    updateTrustedSitesList();

    alert('Learning data has been reset.');
  } catch (error) {
    console.error('Failed to reset learning:', error);
  }
}

/**
 * View detailed statistics
 */
async function viewDetailedStats() {
  try {
    const response = await browserAPI.runtime.sendMessage({
      type: 'GET_DETAILED_STATS'
    });

    // Create a simple stats display
    const statsText = JSON.stringify(response, null, 2);
    const statsWindow = window.open('', 'Statistics', 'width=600,height=400');
    statsWindow.document.write(`
      <html>
        <head>
          <title>Detailed Statistics</title>
          <style>
            body { font-family: monospace; padding: 20px; background: #1e293b; color: #f1f5f9; }
            pre { background: #0f172a; padding: 20px; border-radius: 8px; overflow: auto; }
          </style>
        </head>
        <body>
          <h1>PrivacyShield Max - Detailed Statistics</h1>
          <pre>${escapeHtml(statsText)}</pre>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Failed to get detailed stats:', error);
  }
}

/**
 * Reset everything
 */
async function resetAll() {
  if (!confirm('Reset EVERYTHING? This will restore all settings to defaults and clear all data. This action cannot be undone.')) {
    return;
  }

  try {
    await browserAPI.runtime.sendMessage({
      type: 'RESET_ALL'
    });

    // Reload page
    setTimeout(() => {
      window.location.reload();
    }, 500);
  } catch (error) {
    console.error('Failed to reset all:', error);
  }
}

/**
 * Export all data
 */
async function exportData() {
  try {
    const response = await browserAPI.runtime.sendMessage({
      type: 'EXPORT_DATA'
    });

    const dataStr = JSON.stringify(response, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `privacyshield-backup-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export data:', error);
  }
}

/**
 * Import data
 */
async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);

      await browserAPI.runtime.sendMessage({
        type: 'IMPORT_DATA',
        data: data
      });

      // Reload page
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Failed to import data:', error);
      alert('Failed to import data. Please check the file format.');
    }
  };

  reader.readAsText(file);

  // Reset file input
  e.target.value = '';
}

/**
 * Show save message
 */
function showSaveMessage() {
  elements.saveMessage.style.display = 'block';

  setTimeout(() => {
    elements.saveMessage.style.display = 'none';
  }, 2000);
}

/**
 * Listen for updates from background
 */
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATE') {
    settings = message.data;
    updateUI();
  } else if (message.type === 'LEARNING_STATS_UPDATE') {
    updateLearningStats(message.data);
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
