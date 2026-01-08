// PrivacyShield - Settings Logic with Global Learning

import { MESSAGE_TYPES } from '../core/constants.js';
import { formatNumber } from '../core/utils.js';
import { globalLearning } from '../ai/global-browser-learning.js';

// Previous stats and formatted values for animation control
let previousStats = { trackersBlocked: 0, adsBlocked: 0, fingerprintsBlocked: 0 };
let previousFormattedStats = { trackers: '0', ads: '0', fingerprints: '0' };

/**
 * Initialize settings page
 */
async function initialize() {
  await loadSettings();
  await loadWhitelist();
  await loadStats();
  await loadLearningState();
  setupEventListeners();
  initializeChart();

  // Auto-refresh stats and learning state every 2 seconds
  setInterval(async () => {
    await loadStats();
    await loadLearningState();
    updateProgressBar();
  }, 2000);
}

/**
 * Load settings
 */
async function loadSettings() {
  try {
    const settings = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_SETTINGS
    });

    if (settings) {
      document.getElementById('block-ads').checked = settings.blockAds !== false;
      document.getElementById('block-trackers').checked = settings.blockTrackers !== false;
      document.getElementById('fingerprint-protection').checked = settings.fingerprintProtection !== false;
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
    const settings = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_SETTINGS
    });

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
 * Load learning state (now using global learning)
 */
async function loadLearningState() {
  try {
    // Get learning data from global system
    const learningData = globalLearning.getLearningData();

    if (learningData) {
      // Update learning stats with global data
      document.getElementById('safe-domains').textContent = learningData.domains || 0;
      document.getElementById('total-requests').textContent = formatNumber(learningData.sitesAnalyzed || 0);
      
      // Update progress text
      const progressText = document.querySelector('.progress-text');
      
      if (learningData.accuracy > 0.4) {
        progressText.textContent = 'Learning active';
      } else {
        progressText.textContent = 'Learning initializing';
      }
      
      // Update progress bar based on accuracy
      updateProgressBar(learningData);
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
    const stats = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_STATS
    });

    if (stats) {
      // Get current values
      const newTrackers = stats.trackersBlocked || 0;
      const newAds = stats.adsBlocked || 0;
      const newFingerprints = stats.fingerprintsBlocked || 0;
      
      // Format values for display
      const formattedTrackers = formatNumber(newTrackers);
      const formattedAds = formatNumber(newAds);
      const formattedFingerprints = formatNumber(newFingerprints);
      
      // Only update AND animate if formatted value actually changed
      if (formattedTrackers !== previousFormattedStats.trackers) {
        animateValue('trackers-blocked', newTrackers);
        previousFormattedStats.trackers = formattedTrackers;
      }
      
      if (formattedAds !== previousFormattedStats.ads) {
        animateValue('ads-blocked', newAds);
        previousFormattedStats.ads = formattedAds;
      }
      
      if (formattedFingerprints !== previousFormattedStats.fingerprints) {
        animateValue('fingerprints-blocked', newFingerprints);
        previousFormattedStats.fingerprints = formattedFingerprints;
      }
      
      // Calculate and update privacy score
      const privacyScore = calculatePrivacyScore(stats);
      const currentScore = parseInt(document.getElementById('privacy-score').textContent) || 100;
      if (privacyScore !== currentScore) {
        animateValue('privacy-score', privacyScore);
      }
      
      // Store previous raw stats
      previousStats = { trackersBlocked: newTrackers, adsBlocked: newAds, fingerprintsBlocked: newFingerprints };
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

/**
 * Calculate privacy score based on blocked items
 */
function calculatePrivacyScore(stats) {
  const trackers = stats.trackersBlocked || 0;
  const ads = stats.adsBlocked || 0;
  const fingerprints = stats.fingerprintsBlocked || 0;
  
  // Simple scoring algorithm (max 100)
  let score = 50; // Base score
  
  if (trackers > 0) score += Math.min(20, trackers / 10);
  if (ads > 0) score += Math.min(20, ads / 50);
  if (fingerprints > 0) score += Math.min(10, fingerprints / 5);
  
  return Math.min(100, Math.round(score));
}

/**
 * Animate number changes (only format at start and end)
 */
function animateValue(elementId, endValue) {
  const element = document.getElementById(elementId);
  const startValue = parseInt(element.textContent) || 0;
  const duration = 500;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const currentValue = Math.round(startValue + (endValue - startValue) * progress);
    
    // Only format at the end to prevent character-by-character animation
    if (progress === 1) {
      element.textContent = formatNumber(currentValue);
    } else {
      element.textContent = currentValue.toString();
    }
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

/**
 * Update progress bar (now using global learning data)
 */
function updateProgressBar(learningData) {
  const progressFill = document.getElementById('learning-progress');
  if (!progressFill) return;
  
  // Calculate progress based on accuracy improvement
  const accuracy = learningData.accuracy || 0.4;
  const accuracyImprovement = (accuracy - 0.4) / 0.55; // 0.4 to 0.95 is max improvement
  const progress = Math.min(100, accuracyImprovement * 100);
  
  progressFill.style.width = `${progress}%`;
}

/**
 * Initialize chart
 */
function initializeChart() {
  const canvas = document.getElementById('trends-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = canvas.offsetHeight;
  
  // Simple line chart drawing
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  // Generate sample data points
  const points = 7; // 7 days
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * width;
    const y = height - (Math.random() * height * 0.8 + height * 0.1);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
  
  // Add grid lines
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = (i / 4) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

/**
 * Update domain count
 */
function updateDomainCount(count) {
  const element = document.getElementById('domain-count');
  if (element) {
    element.textContent = `${count} DOMAIN${count !== 1 ? 'S' : ''}`;
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

  // Reset learning button (now uses global learning)
  document.getElementById('reset-learning').addEventListener('click', async () => {
    if (confirm('Reset all global learning data? This will clear all learned patterns and reset accuracy to 40%.')) {
      await globalLearning.resetData();
      
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
    const domains = whitelistText.split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { whitelistedDomains: domains }
    });

    updateDomainCount(domains.length);
    
    // Visual feedback
    const button = document.getElementById('save-whitelist');
    const originalText = button.textContent;
    button.textContent = 'SAVED';
    button.style.background = '#00ff00';
    button.style.color = '#000000';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
      button.style.color = '';
    }, 1500);
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
      if (!file) return;
      
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
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initialize);
