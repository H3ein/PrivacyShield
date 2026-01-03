// PrivacyShield - Popup Logic

import { MESSAGE_TYPES } from '../core/constants.js';
import { formatNumber, extractDomain, extractHostname } from '../core/utils.js';

let currentTab = null;
let updateInterval = null;

/**
 * Initialize popup
 */
async function initialize() {
  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  // Load settings and stats
  await loadSettings();
  await loadStats();

  // Setup event listeners
  setupEventListeners();

  // Auto-refresh stats every 2 seconds
  updateInterval = setInterval(loadStats, 2000);
}

/**
 * Load settings
 */
async function loadSettings() {
  const settings = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.GET_SETTINGS
  });

  // Update toggle
  const enabledCheckbox = document.getElementById('enabled');
  const toggleText = document.getElementById('toggle-text');

  if (settings) {
    enabledCheckbox.checked = settings.enabled;
    toggleText.textContent = settings.enabled ? 'ON' : 'OFF';
  }
}

/**
 * Load statistics
 */
async function loadStats() {
  const stats = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.GET_STATS
  });

  if (stats) {
    // Use current tab stats for the popup display (real-time per page)
    const currentTab = stats.currentTab || { trackers: 0, ads: 0, fingerprints: 0 };

    // Update stat displays with current tab stats
    document.getElementById('trackers-blocked').textContent =
      formatNumber(currentTab.trackers);

    document.getElementById('ads-blocked').textContent =
      formatNumber(currentTab.ads);

    document.getElementById('fingerprints-blocked').textContent =
      formatNumber(currentTab.fingerprints);

    // Privacy score based on current tab threats
    const privacyScore = calculatePrivacyScore(currentTab);
    document.getElementById('privacy-score').textContent = privacyScore;
  }
}

/**
 * Calculate privacy score for current tab
 */
function calculatePrivacyScore(tabStats) {
  const { trackers, ads, fingerprints } = tabStats;

  let score = 100;

  // Deduct for threats detected on this page
  score -= Math.min(trackers * 2, 30);       // Max -30 for trackers
  score -= Math.min(ads * 1, 20);            // Max -20 for ads
  score -= Math.min(fingerprints * 3, 50);   // Max -50 for fingerprinting

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Toggle enabled/disabled
  document.getElementById('enabled').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    const toggleText = document.getElementById('toggle-text');

    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.TOGGLE_ENABLED
    });

    toggleText.textContent = enabled ? 'ON' : 'OFF';
  });

  // Whitelist current site
  document.getElementById('whitelist-btn').addEventListener('click', async () => {
    if (!currentTab || !currentTab.url) return;

    const hostname = extractHostname(currentTab.url);
    const domain = extractDomain(hostname);

    if (domain) {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.WHITELIST_DOMAIN,
        data: { domain }
      });

      alert(`Added ${domain} to whitelist`);
    }
  });

  // Open settings
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// Clean up on unload
window.addEventListener('unload', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});

// Initialize on load
initialize();
