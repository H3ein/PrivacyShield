// PrivacyShield - Popup Logic

import { MESSAGE_TYPES } from '../core/constants.js';
import { formatNumber, extractDomain, extractHostname } from '../core/utils.js';

let currentTab = null;

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
    // Update stat displays
    document.getElementById('trackers-blocked').textContent =
      formatNumber(stats.trackersBlocked || 0);

    document.getElementById('ads-blocked').textContent =
      formatNumber(stats.adsBlocked || 0);

    document.getElementById('fingerprints-blocked').textContent =
      formatNumber(stats.fingerprintsBlocked || 0);

    document.getElementById('privacy-score').textContent =
      stats.privacyScore || 100;
  }
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

// Initialize on load
initialize();
