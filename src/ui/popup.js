        // PrivacyShield - Popup Controller (Production Ready)

import { MESSAGE_TYPES } from '../core/constants.js';
import * as storage from '../core/storage.js';


class PrivacyShieldPopup {
  constructor() {
    this.elements = {};
    this.currentSettings = null;
    this.currentStats = null;
    this.isInitialized = false;
    
    this.init();
  }

  async init() {
    try {
      console.log('PrivacyShield: Initializing popup...');
      
      // Cache DOM elements
      this.cacheElements();
      
      // Load current data
      await this.loadData();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Update UI
      this.updateUI();
      
      // Initialize whitelist button state
      await this.updateWhitelistButton();
      
      // Setup auto-refresh for real-time stats
      this.setupAutoRefresh();
      
      this.isInitialized = true;
      console.log('PrivacyShield: Popup initialized successfully');
      
    } catch (error) {
      console.error('PrivacyShield: Failed to initialize popup:', error);
      this.showError('Failed to load PrivacyShield');
    }
  }

  cacheElements() {
    this.elements = {
      // Toggle
      enabledToggle: document.getElementById('enabled'),
      powerBtn: document.getElementById('power-btn'),

      // Privacy Score
      privacyScore: document.getElementById('privacy-score'),
      scoreArc: document.getElementById('score-arc'),
      scoreStatus: document.getElementById('score-status'),

      // Stats
      algorithmToggle: document.getElementById('algorithm-toggle'),
      algorithmSection: document.getElementById('algorithm-section'),
      algChevron: document.getElementById('alg-chevron'),
      statTotalBlocked: document.getElementById('stat-total-blocked'),
      statDomainsSeen: document.getElementById('stat-domains-seen'),
      statBlockRate: document.getElementById('stat-block-rate'),

      // Stats detail elements
      statDomainsDetail: document.getElementById('stat-domains-detail'),
      statBlockedDetail: document.getElementById('stat-blocked-detail'),
      statRateDetail: document.getElementById('stat-rate-detail'),
      statRequestsDetail: document.getElementById('stat-requests-detail'),
      domainsBar: document.getElementById('domains-bar'),
      blockedBar: document.getElementById('blocked-bar'),
      rateBar: document.getElementById('rate-bar'),
      requestsBar: document.getElementById('requests-bar'),

      // Threat Counts
      trackersBlocked: document.getElementById('trackers-blocked'),
      adsBlocked: document.getElementById('ads-blocked'),
      fingerprintsBlocked: document.getElementById('fingerprints-blocked'),

      // Buttons
      whitelistBtn: document.getElementById('whitelist-btn'),
      settingsBtn: document.getElementById('settings-btn')
    };
  }

  async loadData() {
    try {
      // Load settings, stats, and learning data from background script in parallel
      const [settingsResponse, statsResponse, learningResponse] = await Promise.all([
        this.sendMessage(MESSAGE_TYPES.GET_SETTINGS),
        this.sendMessage(MESSAGE_TYPES.GET_STATS),
        this.sendMessage('getLearningData')
      ]);

      this.currentSettings = settingsResponse.success ? settingsResponse.data : null;
      this.currentStats = statsResponse.success ? statsResponse.data : null;
      this.learningData = learningResponse?.success ? learningResponse.data : null;

      console.log('PrivacyShield: Data loaded:', {
        settings: this.currentSettings,
        stats: this.currentStats,
        learning: this.learningData
      });

    } catch (error) {
      console.error('PrivacyShield: Failed to load data:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Power button toggles enabled state
    if (this.elements.powerBtn) {
      this.elements.powerBtn.addEventListener('click', async () => {
        const newState = !this.elements.enabledToggle.checked;
        this.elements.enabledToggle.checked = newState;
        await this.handleToggleChange(newState);
      });
    }

    // Hidden checkbox change (for programmatic use)
    if (this.elements.enabledToggle) {
      this.elements.enabledToggle.addEventListener('change', async (e) => {
        await this.handleToggleChange(e.target.checked);
      });
    }

    // Algorithm toggle
    if (this.elements.algorithmToggle) {
      this.elements.algorithmToggle.addEventListener('click', () => {
        this.toggleAlgorithmSection();
      });
    }

    // Whitelist button
    if (this.elements.whitelistBtn) {
      this.elements.whitelistBtn.addEventListener('click', async () => {
        if (this.elements.whitelistBtn.classList.contains('disabled')) {
          return;
        }
        await this.handleWhitelistToggle();
      });
    }

    // Settings button with debug functionality
    if (this.elements.settingsBtn) {
      this.elements.settingsBtn.addEventListener('click', async (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          await this.testStats();
          return;
        }
        if (e.shiftKey) {
          e.preventDefault();
          await this.testBlocking();
          return;
        }
        chrome.runtime.openOptionsPage();
      });
    }

    // Threat items - click to reset individual stats
    ['trackersBlocked', 'adsBlocked', 'fingerprintsBlocked'].forEach(statId => {
      const element = this.elements[statId];
      if (element) {
        element.addEventListener('click', async (e) => {
          if (e.shiftKey) { // Hold shift + click to reset
            await this.resetStat(statId);
          }
        });
      }
    });
  }

  updateUI() {
    if (!this.currentSettings || !this.currentStats) {
      console.warn('PrivacyShield: No data available for UI update');
      return;
    }

    // Update toggle state
    this.updateToggle();
    
    // Update privacy score and stats
    this.updatePrivacyScore();
    this.updateThreatCounts();
    this.updateAlgorithmMetrics();
    
    // Update body class for disabled state
    document.body.classList.toggle('disabled', !this.currentSettings.enabled);
  }

  updateToggle() {
    if (this.elements.enabledToggle) {
      // Set the toggle state based on stored settings
      this.elements.enabledToggle.checked = this.currentSettings.enabled;
      console.log('PrivacyShield: Toggle state set to:', this.currentSettings.enabled);
    }
  }

  updatePrivacyScore() {
    const stats = this.currentStats;
    const privacyScore = this.calculatePrivacyScore(stats);

    if (this.elements.privacyScore) {
      this.elements.privacyScore.textContent = privacyScore;
    }

    // Update the SVG arc gauge (total arc length is ~157)
    if (this.elements.scoreArc) {
      const arcLength = 157;
      const offset = arcLength - (arcLength * privacyScore / 100);
      this.elements.scoreArc.setAttribute('stroke-dashoffset', offset);

      // Update arc color based on score
      let color = '#00ff00';
      if (privacyScore < 50) {
        color = '#ff0000';
      } else if (privacyScore < 70) {
        color = '#ff9900';
      } else if (privacyScore < 90) {
        color = '#00ff00';
      }
      this.elements.scoreArc.style.stroke = color;
      document.documentElement.style.setProperty('--score-color', color);
    }

    if (this.elements.scoreStatus) {
      let status = 'PROTECTION ACTIVE';
      if (privacyScore >= 90) {
        status = 'MAXIMUM PROTECTION';
      } else if (privacyScore >= 70) {
        status = 'HIGH PROTECTION';
      } else if (privacyScore >= 50) {
        status = 'MODERATE PROTECTION';
      } else {
        status = 'BASIC PROTECTION';
      }
      this.elements.scoreStatus.textContent = status;
    }
  }

  updateThreatCounts() {
    const stats = this.currentStats;
    
    if (this.elements.trackersBlocked) {
      this.elements.trackersBlocked.textContent = this.formatNumber(stats.trackersBlocked || 0);
    }
    
    if (this.elements.adsBlocked) {
      this.elements.adsBlocked.textContent = this.formatNumber(stats.adsBlocked || 0);
    }
    
    if (this.elements.fingerprintsBlocked) {
      this.elements.fingerprintsBlocked.textContent = this.formatNumber(stats.fingerprintsBlocked || 0);
    }
  }

  updateAlgorithmMetrics() {
    const learning = this.learningData;
    if (!learning) return;

    const stats = this.currentStats || {};
    const totalBlocked = (stats.trackersBlocked || 0) + (stats.adsBlocked || 0) + (stats.fingerprintsBlocked || 0);
    const totalRequests = learning.totalRequests || 0;
    const domainsSeen = learning.domainPatternsCount || 0;
    const blockRate = totalRequests > 0 ? Math.round((totalBlocked / totalRequests) * 100) : 0;

    // Inline preview stats
    if (this.elements.statTotalBlocked) {
      this.elements.statTotalBlocked.textContent = this.formatNumber(totalBlocked);
    }
    if (this.elements.statDomainsSeen) {
      this.elements.statDomainsSeen.textContent = this.formatNumber(domainsSeen);
    }
    if (this.elements.statBlockRate) {
      this.elements.statBlockRate.textContent = blockRate;
    }

    // Detail section
    if (this.elements.statDomainsDetail) {
      this.elements.statDomainsDetail.textContent = this.formatNumber(domainsSeen);
    }
    if (this.elements.domainsBar) {
      this.elements.domainsBar.style.width = `${Math.min(100, domainsSeen)}%`;
    }

    if (this.elements.statBlockedDetail) {
      this.elements.statBlockedDetail.textContent = this.formatNumber(totalBlocked);
    }
    if (this.elements.blockedBar) {
      this.elements.blockedBar.style.width = `${Math.min(100, totalBlocked / Math.max(1, totalRequests) * 100)}%`;
    }

    if (this.elements.statRateDetail) {
      this.elements.statRateDetail.textContent = `${blockRate}%`;
    }
    if (this.elements.rateBar) {
      this.elements.rateBar.style.width = `${blockRate}%`;
    }

    if (this.elements.statRequestsDetail) {
      this.elements.statRequestsDetail.textContent = this.formatNumber(totalRequests);
    }
    if (this.elements.requestsBar) {
      this.elements.requestsBar.style.width = `${Math.min(100, totalRequests > 0 ? 100 : 0)}%`;
    }
  }

  toggleAlgorithmSection() {
    if (this.elements.algorithmSection) {
      const isVisible = this.elements.algorithmSection.style.display !== 'none';
      this.elements.algorithmSection.style.display = isVisible ? 'none' : 'block';

      // Update chevron indicator
      if (this.elements.algChevron) {
        this.elements.algChevron.textContent = isVisible ? '+' : '-';
      }
    }
  }
  
  
  async handleToggleChange(isEnabled) {
    try {
      console.log('PrivacyShield: Toggle changed to:', isEnabled);
      
      // Update settings
      await storage.updateSettings({ enabled: isEnabled });
      this.currentSettings.enabled = isEnabled;
      
      // Update UI
      this.updateUI();
      
      // Send message to background script
      const response = await this.sendMessage(MESSAGE_TYPES.UPDATE_SETTINGS, { enabled: isEnabled });
      
      if (response?.success) {
        console.log('PrivacyShield: Settings updated successfully');
      } else {
        throw new Error('Failed to update background script');
      }
      
    } catch (error) {
      console.error('PrivacyShield: Failed to handle toggle change:', error);
      
      // Revert toggle on error
      if (this.elements.enabledToggle) {
        this.elements.enabledToggle.checked = !isEnabled;
      }
      
      this.showError('Failed to update settings');
    }
  }

  async handleWhitelistToggle() {
    try {
      // Get current tab domain
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) {
        console.warn('PrivacyShield: No active tab found, using fallback');
        this.showError('No active tab found');
        return;
      }
      
      // Handle chrome:// and other restricted URLs
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
        console.warn('PrivacyShield: Cannot whitelist extension pages');
        this.showError('Cannot whitelist this page');
        return;
      }
      
      const domain = new URL(tab.url).hostname;
      
      if (!domain) {
        console.warn('PrivacyShield: Could not extract domain from URL:', tab.url);
        this.showError('Invalid domain');
        return;
      }
      
      console.log('PrivacyShield: Toggling whitelist for domain:', domain);
      
      // Check if domain is whitelisted via background script
      const settingsResponse = await this.sendMessage(MESSAGE_TYPES.GET_SETTINGS);
      const whitelist = settingsResponse.success ? (settingsResponse.data.whitelistedDomains || []) : [];
      const isWhitelisted = whitelist.includes(domain);
      
      if (isWhitelisted) {
        await this.sendMessage(MESSAGE_TYPES.REMOVE_FROM_WHITELIST, { domain });
        this.elements.whitelistBtn.innerHTML = '<span class="btn-text">TRUST SITE</span><div class="btn-indicator"></div>';
        this.elements.whitelistBtn.classList.remove('whitelisted');
        console.log('PrivacyShield: Removed from whitelist:', domain);
      } else {
        await this.sendMessage(MESSAGE_TYPES.ADD_TO_WHITELIST, { domain });
        this.elements.whitelistBtn.innerHTML = '<span class="btn-text">TRUSTED</span><div class="btn-indicator"></div>';
        this.elements.whitelistBtn.classList.add('whitelisted');
        console.log('PrivacyShield: Added to whitelist:', domain);
      }
      
    } catch (error) {
      console.error('PrivacyShield: Failed to toggle whitelist:', error);
      this.showError('Failed to update whitelist');
    }
  }

  async updateWhitelistButton() {
    try {
      // Get current tab domain
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !this.elements.whitelistBtn) {
        return;
      }
      
      // Handle restricted URLs
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
        this.elements.whitelistBtn.innerHTML = '<span class="btn-text">PROTECTED</span><div class="btn-indicator"></div>';
        this.elements.whitelistBtn.classList.add('disabled');
        return;
      }
      
      const domain = new URL(tab.url).hostname;
      
      if (!domain) {
        return;
      }
      
      // Check if domain is whitelisted via background script
      const settingsResponse = await this.sendMessage(MESSAGE_TYPES.GET_SETTINGS);
      const whitelist = settingsResponse.success ? (settingsResponse.data.whitelistedDomains || []) : [];
      const isWhitelisted = whitelist.includes(domain);
      
      if (isWhitelisted) {
        this.elements.whitelistBtn.innerHTML = '<span class="btn-text">TRUSTED</span><div class="btn-indicator"></div>';
        this.elements.whitelistBtn.classList.add('whitelisted');
        this.elements.whitelistBtn.classList.remove('disabled');
      } else {
        this.elements.whitelistBtn.innerHTML = '<span class="btn-text">TRUST SITE</span><div class="btn-indicator"></div>';
        this.elements.whitelistBtn.classList.remove('whitelisted', 'disabled');
      }
      
    } catch (error) {
      console.error('PrivacyShield: Failed to update whitelist button:', error);
    }
  }

  async resetStat(statId) {
    try {
      const statKey = statId.replace('Blocked', 'Blocked').toLowerCase();
      await this.sendMessage('resetStat', { stat: statKey });
      await this.loadData(); // Reload stats
      this.updateThreatCounts();
      console.log('PrivacyShield: Reset stat:', statId);
    } catch (error) {
      console.error('PrivacyShield: Failed to reset stat:', error);
    }
  }

  calculatePrivacyScore(stats) {
    // Higher score = more protection enabled and active
    const { trackersBlocked = 0, adsBlocked = 0, fingerprintsBlocked = 0, paramsStripped = 0 } = stats;
    const totalBlocked = trackersBlocked + adsBlocked + fingerprintsBlocked + paramsStripped;

    // Feature enablement score (0-40)
    let featureScore = 0;
    if (this.currentSettings) {
      const features = [
        this.currentSettings.blockAds !== false,
        this.currentSettings.blockTrackers !== false,
        this.currentSettings.fingerprintProtection !== false,
        this.currentSettings.stripTrackingParams !== false,
        this.currentSettings.blockThirdPartyCookies !== false
      ];
      featureScore = Math.round((features.filter(Boolean).length / features.length) * 40);
    } else {
      featureScore = 40;
    }

    // Blocking activity score (0-35): log scale
    let activityScore = 0;
    if (totalBlocked > 0) {
      activityScore = Math.min(35, Math.round(Math.log10(totalBlocked + 1) * 12));
    }

    // Category breadth score (0-25)
    const activeCategories = [
      trackersBlocked > 0, adsBlocked > 0, fingerprintsBlocked > 0, paramsStripped > 0
    ].filter(Boolean).length;
    const breadthScore = Math.round((activeCategories / 4) * 25);

    return Math.max(0, Math.min(100, featureScore + activityScore + breadthScore));
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  async sendMessage(type, data = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, data }, resolve);
    });
  }

  showError(message) {
    console.error('PrivacyShield:', message);
    // You could add a toast notification here if needed
  }

  async testStats() {
    try {
      console.log('PrivacyShield: Testing stats increment...');
      const response = await this.sendMessage('debugIncrementStats');
      if (response.success) {
        console.log('PrivacyShield: Stats test successful');
        // Reload stats to show the increment
        await this.loadData();
        this.updatePrivacyScore();
        this.updateThreatCounts();
        this.updateAlgorithmMetrics();
      }
    } catch (error) {
      console.error('PrivacyShield: Failed to test stats:', error);
    }
  }

  async testBlocking() {
    try {
      console.log('PrivacyShield: Testing blocking patterns...');
      const response = await this.sendMessage('testBlocking');
      if (response.success) {
        console.log('PrivacyShield: Blocking patterns test successful');
        // Reload stats to show results
        await this.loadData();
        this.updatePrivacyScore();
        this.updateThreatCounts();
        this.updateAlgorithmMetrics();
      }
    } catch (error) {
      console.error('PrivacyShield: Failed to test blocking:', error);
    }
  }

  setupAutoRefresh() {
    // Refresh stats every 2 seconds when popup is open
    this.refreshInterval = setInterval(async () => {
      try {
        const [statsResponse, learningResponse] = await Promise.all([
          this.sendMessage(MESSAGE_TYPES.GET_STATS),
          this.sendMessage('getLearningData')
        ]);

        if (statsResponse.success && statsResponse.data) {
          this.currentStats = statsResponse.data;
          this.updatePrivacyScore();
          this.updateThreatCounts();
        }
        if (learningResponse?.success && learningResponse.data) {
          this.learningData = learningResponse.data;
        }
        this.updateAlgorithmMetrics();
      } catch (error) {
        console.error('PrivacyShield: Failed to refresh data:', error);
      }
    }, 2000);
  }

  // Public method to refresh data
  async refresh() {
    if (!this.isInitialized) return;
    
    try {
      await this.loadData();
      this.updateUI();
      await this.updateWhitelistButton();
    } catch (error) {
      console.error('PrivacyShield: Failed to refresh:', error);
    }
  }
}

// Handle popup close
window.addEventListener('beforeunload', () => {
  console.log('PrivacyShield: Popup closing');
  // Clean up refresh interval
  if (window.privacyShieldPopup && window.privacyShieldPopup.refreshInterval) {
    clearInterval(window.privacyShieldPopup.refreshInterval);
  }
});

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.privacyShieldPopup = new PrivacyShieldPopup();
});

// Export for testing
window.PrivacyShieldPopup = PrivacyShieldPopup;
