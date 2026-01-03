// PrivacyShield - Settings Logic

import { MESSAGE_TYPES } from '../core/constants.js';
import { formatNumber } from '../core/utils.js';

/**
 * Initialize settings page
 */
async function initialize() {
  await loadSettings();
  await loadWhitelist();
  await loadStats();
  setupEventListeners();

  // Auto-refresh stats every 5 seconds
  setInterval(loadStats, 5000);
}

/**
 * Load settings
 */
async function loadSettings() {
  const settings = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.GET_SETTINGS
  });

  if (settings) {
    document.getElementById('block-ads').checked = settings.blockAds;
    document.getElementById('block-trackers').checked = settings.blockTrackers;
    document.getElementById('fingerprint-protection').checked = settings.fingerprintProtection;
    document.getElementById('block-third-party-cookies').checked = settings.blockThirdPartyCookies;
    document.getElementById('strip-tracking-params').checked = settings.stripTrackingParams;
    document.getElementById('block-social-widgets').checked = settings.blockSocialWidgets || false;
  }
}

/**
 * Load whitelist
 */
async function loadWhitelist() {
  const settings = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.GET_SETTINGS
  });

  if (settings && settings.whitelistedDomains) {
    document.getElementById('whitelist').value = settings.whitelistedDomains.join('\n');
  }
}

/**
 * Load stats (all-time global stats)
 */
async function loadStats() {
  const stats = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.GET_STATS
  });

  if (stats) {
    // Display global all-time stats
    document.getElementById('total-trackers').textContent =
      formatNumber(stats.trackersBlocked || 0);
    document.getElementById('total-ads').textContent =
      formatNumber(stats.adsBlocked || 0);
    document.getElementById('total-fingerprints').textContent =
      formatNumber(stats.fingerprintsBlocked || 0);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Update settings when checkboxes change
  document.getElementById('block-ads').addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { blockAds: e.target.checked }
    });
  });

  document.getElementById('block-trackers').addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { blockTrackers: e.target.checked }
    });
  });

  document.getElementById('fingerprint-protection').addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { fingerprintProtection: e.target.checked }
    });
  });

  document.getElementById('block-third-party-cookies').addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { blockThirdPartyCookies: e.target.checked }
    });
  });

  document.getElementById('strip-tracking-params').addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { stripTrackingParams: e.target.checked }
    });
  });

  document.getElementById('block-social-widgets').addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { blockSocialWidgets: e.target.checked }
    });
  });

  // Save whitelist
  document.getElementById('save-whitelist').addEventListener('click', async () => {
    const whitelistText = document.getElementById('whitelist').value;
    const domains = whitelistText.split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { whitelistedDomains: domains }
    });

    alert('Whitelist saved');
  });

  // Reset stats
  document.getElementById('reset-stats').addEventListener('click', async () => {
    if (confirm('Reset all statistics?')) {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.RESET_STATS
      });

      await loadStats();
      alert('Statistics reset');
    }
  });
}

// Initialize on load
initialize();
