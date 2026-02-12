// PrivacyShield - Settings Logic

import { MESSAGE_TYPES } from '../core/constants.js';

// Format numbers for display
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Initialize settings page
 */
async function initialize() {
  await loadSettings();
  await loadWhitelist();
  await loadStats();
  await loadLearningState();
  setupEventListeners();

  // Auto-refresh stats and learning state every 2 seconds
  setInterval(async () => {
    await loadStats();
    await loadLearningState();
  }, 2000);
}

/**
 * Load settings
 */
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_SETTINGS
    });

    const settings = response?.success ? response.data : response;

    if (settings) {
      document.getElementById('block-ads').checked = settings.blockAds !== false;
      document.getElementById('block-trackers').checked = settings.blockTrackers !== false;
      document.getElementById('fingerprint-protection').checked = settings.fingerprintProtection !== false;
      document.getElementById('block-video-ads').checked = settings.blockVideoAds !== false;
      document.getElementById('block-interstitials').checked = settings.blockInterstitialAds !== false;
      document.getElementById('block-push-notifications').checked = settings.blockPushNotifications !== false;
      document.getElementById('block-popups').checked = settings.blockPopups !== false;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Load whitelist
 */
async function loadWhitelist() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_SETTINGS
    });

    const settings = response?.success ? response.data : response;

    if (settings && settings.whitelistedDomains) {
      const whitelistText = settings.whitelistedDomains.join('\n');
      document.getElementById('whitelist').value = whitelistText;
      updateDomainCount(settings.whitelistedDomains.length);
    }
  } catch (error) {
    console.error('Failed to load whitelist:', error);
  }
}

/**
 * Load learning state (now using algorithm data)
 */
async function loadLearningState() {
  try {
    // Get learning data and settings from background script in parallel
    const [learningResponse, settingsResponse] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'getLearningData' }),
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_SETTINGS })
    ]);

    if (learningResponse.success && learningResponse.data) {
      const learningData = learningResponse.data;

      // Show actual unique blocked domains count (not category count)
      const patternsElement = document.getElementById('patterns-learned-count');
      if (patternsElement) {
        patternsElement.textContent = formatNumber(learningData.domainPatternsCount || 0);
      }

      const totalRequestsElement = document.getElementById('total-requests-count');
      if (totalRequestsElement) {
        totalRequestsElement.textContent = formatNumber(learningData.totalRequests || 0);
      }
    }

    // Read actual learningEnabled setting from storage
    if (settingsResponse?.success && settingsResponse.data) {
      const learningCheckbox = document.getElementById('learning-enabled');
      if (learningCheckbox) {
        learningCheckbox.checked = settingsResponse.data.learningEnabled !== false;
      }
    }
  } catch (error) {
    console.error('Failed to load learning state:', error);
  }
}

/**
 * Load stats
 */
async function loadStats() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_STATS
    });

    if (response.success && response.data) {
      const stats = response.data;
      
      // Update stats display with correct element IDs
      const trackersElement = document.getElementById('total-trackers');
      if (trackersElement) {
        trackersElement.textContent = formatNumber(stats.trackersBlocked || 0);
      }
      
      const adsElement = document.getElementById('total-ads');
      if (adsElement) {
        adsElement.textContent = formatNumber(stats.adsBlocked || 0);
      }
      
      const fingerprintsElement = document.getElementById('total-fingerprints');
      if (fingerprintsElement) {
        fingerprintsElement.textContent = formatNumber(stats.fingerprintsBlocked || 0);
      }
      
      const threatsElement = document.getElementById('threats-prevented');
      if (threatsElement) {
        const totalThreats = (stats.trackersBlocked || 0) +
                           (stats.adsBlocked || 0) +
                           (stats.fingerprintsBlocked || 0);
        threatsElement.textContent = formatNumber(totalThreats);
      }

      // New enhanced ad blocking stats
      const videoAdsElement = document.getElementById('total-video-ads');
      if (videoAdsElement) {
        videoAdsElement.textContent = formatNumber(stats.videoAdsBlocked || 0);
      }

      const interstitialsElement = document.getElementById('total-interstitials');
      if (interstitialsElement) {
        interstitialsElement.textContent = formatNumber(stats.interstitialsBlocked || 0);
      }

      const popupsElement = document.getElementById('total-popups');
      if (popupsElement) {
        popupsElement.textContent = formatNumber(stats.popupsBlocked || 0);
      }

      const pushNotificationsElement = document.getElementById('total-push-notifications');
      if (pushNotificationsElement) {
        pushNotificationsElement.textContent = formatNumber(stats.pushNotificationsBlocked || 0);
      }
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}


/**
 * Update domain count display
 */
function updateDomainCount(count) {
  const domainsText = count === 1 ? 'DOMAIN' : 'DOMAINS';
  const countDisplay = `${count} ${domainsText}`;

  const countElement = document.getElementById('domain-count');
  if (countElement) {
    countElement.textContent = countDisplay;
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Protection toggles
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

  document.getElementById('block-video-ads').addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { blockVideoAds: e.target.checked }
    });
  });

  document.getElementById('block-interstitials').addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { blockInterstitialAds: e.target.checked }
    });
  });

  document.getElementById('block-push-notifications').addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { blockPushNotifications: e.target.checked }
    });
  });

  document.getElementById('block-popups').addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { blockPopups: e.target.checked }
    });
  });

  // Learning enabled toggle
  document.getElementById('learning-enabled').addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { learningEnabled: e.target.checked }
    });
  });

  // Reset learning button
  document.getElementById('reset-learning').addEventListener('click', async () => {
    if (confirm('Reset all pattern data? This will clear learned patterns and reset algorithm.')) {
      await chrome.runtime.sendMessage({
        type: 'resetLearning'
      });
      
      // Refresh learning state display
      await loadLearningState();
      
      // Visual feedback
      const button = document.getElementById('reset-learning');
      const originalText = button.textContent;
      button.textContent = 'RESET';
      button.style.background = '#00ff00';
      button.style.color = '#000000';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
        button.style.color = '';
      }, 1500);
    }
  });

  // Save whitelist
  document.getElementById('save-whitelist').addEventListener('click', async () => {
    const whitelistText = document.getElementById('whitelist').value;
    
    // Parse and validate domains
    const domains = whitelistText.split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0)
      .map(d => {
        // Clean domain format
        if (d.startsWith('http://') || d.startsWith('https://')) {
          try {
            return new URL(d).hostname;
          } catch {
            return d;
          }
        }
        return d;
      })
      .filter(d => d && d.length > 0); // Remove invalid entries

    console.log('PrivacyShield: Saving whitelist domains:', domains);

    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        data: { whitelistedDomains: domains }
      });

      if (response.success) {
        updateDomainCount(domains.length);
        
        // Visual feedback
        const button = document.getElementById('save-whitelist');
        const originalText = button.textContent;
        button.textContent = `SAVED (${domains.length})`;
        button.style.background = '#00ff00';
        button.style.color = '#000000';
        
        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = '';
          button.style.color = '';
        }, 2000);
      } else {
        throw new Error('Failed to save whitelist');
      }
    } catch (error) {
      console.error('Failed to save whitelist:', error);
      alert('Failed to save whitelist. Please check your domain formats.');
      
      // Visual feedback for error
      const button = document.getElementById('save-whitelist');
      const originalText = button.textContent;
      button.textContent = 'ERROR';
      button.style.background = '#ff0000';
      button.style.color = '#ffffff';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
        button.style.color = '';
      }, 2000);
    }
  });

  // Management buttons
  document.getElementById('export-settings').addEventListener('click', async () => {
    try {
      const settings = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_SETTINGS
      });
      
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'privacyshield-settings.json';
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export settings:', error);
      alert('Failed to export settings');
    }
  });

  document.getElementById('import-settings').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) {return;}
      
      try {
        const text = await file.text();
        const settings = JSON.parse(text);
        
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.UPDATE_SETTINGS,
          data: settings
        });
        
        // Reload all data
        await loadSettings();
        await loadWhitelist();
        
        alert('Settings imported successfully');
      } catch (error) {
        console.error('Failed to import settings:', error);
        alert('Failed to import settings. Please check the file format.');
      }
    };
    
    input.click();
  });

  document.getElementById('reset-all').addEventListener('click', async () => {
    if (confirm('Reset ALL settings and data? This action cannot be undone.')) {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.RESET_ALL
      });
      
      // Reload all data
      await loadSettings();
      await loadWhitelist();
      await loadStats();
      await loadLearningState();
      
      alert('All settings and data have been reset');
    }
  });

  // Reset stats
  document.getElementById('reset-stats').addEventListener('click', async () => {
    if (confirm('Reset all statistics?')) {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.RESET_STATS
      });

      await loadStats();
      
      // Visual feedback
      const button = document.getElementById('reset-stats');
      const originalText = button.textContent;
      button.textContent = 'RESET';
      button.style.background = '#00ff00';
      button.style.color = '#000000';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
        button.style.color = '';
      }, 1500);
    }
  });

  // Whitelist textarea - update domain count on input
  document.getElementById('whitelist').addEventListener('input', (e) => {
    const domains = e.target.value.split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0);
    updateDomainCount(domains.length);
  });

  // Format whitelist on paste
  document.getElementById('whitelist').addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Clean and format the pasted text
    const domains = pastedText
      .split(/[,\s\n]+/) // Split on commas, spaces, or newlines
      .map(d => d.trim())
      .filter(d => d.length > 0)
      .map(d => {
        // Remove http/https if present
        if (d.startsWith('http://') || d.startsWith('https://')) {
          try {
            return new URL(d).hostname;
          } catch {
            return d.replace(/^https?:\/\//, '');
          }
        }
        return d;
      });
    
    // Insert formatted domains
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    
    const newValue = currentValue.substring(0, start) + 
                    domains.join('\n') + 
                    currentValue.substring(end);
    
    textarea.value = newValue;
    textarea.selectionStart = textarea.selectionEnd = start + domains.join('\n').length;
    
    // Update domain count
    const allDomains = textarea.value.split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0);
    updateDomainCount(allDomains.length);
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initialize);
