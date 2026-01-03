// PrivacyShield Max - Popup Script
// User interface and controls

// Use browser API for Firefox, chrome for Chrome
const browserAPI = (typeof browser !== 'undefined')
  ? browser
  : (typeof chrome !== 'undefined' ? chrome : null);

if (!browserAPI) {
  throw new Error('PrivacyShield Max popup: No extension API (browser/chrome) found');
}

class PrivacyShieldPopup {
  constructor() {
    this.settings = {};
    this.stats = {};
    this.customFilters = [];
    
    this.initialize();
  }

  async initialize() {
    console.log('PrivacyShield Max - Popup initialized');
    
    // Load settings and stats
    await this.loadSettings();
    await this.loadStats();
    await this.loadCustomFilters();
    
    // Setup UI elements
    this.setupUI();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Update UI
    this.updateUI();

    // Load filter list status
    this.loadFilterStatus();
    
    // Update whitelist button state
    this.updateWhitelistButton();
    
    // Request current stats from background
    this.requestStats();
  }

  // Load settings from storage
  async loadSettings() {
    const defaultSettings = {
      enabled: true,
      blockAds: true,
      blockTracking: true,
      blockMalware: true,
      blockMiners: true,
      cnameUncloaking: true,
      fingerprintingProtection: true,
      blockCookieBanners: true,
      showStats: true
    };

    const stored = await browserAPI.storage.local.get(defaultSettings);
    this.settings = stored;
  }

  // Load statistics from storage
  async loadStats() {
    const defaultStats = {
      blocked: 0,
      tracked: 0,
      cnameUncloaked: 0
    };

    const stored = await browserAPI.storage.local.get(defaultStats);
    this.stats = stored;
  }

  // Load custom filters from storage
  async loadCustomFilters() {
    // UI simplified: custom filters are managed in Settings, not in the popup.
    this.customFilters = [];
  }

  // Setup UI elements
  setupUI() {
    // Get control elements
    this.elements = {
      // Status
      statusIndicator: document.querySelector('.status-indicator'),
      statusText: document.querySelector('.status-text'),
      
      // Stats
      blockedCount: document.getElementById('blocked-count'),
      trackedCount: document.getElementById('tracked-count'),
      cnameCount: document.getElementById('cname-count'),
      
      // Controls
      enabled: document.getElementById('enabled'),
      blockAds: document.getElementById('block-ads'),
      blockTracking: document.getElementById('block-tracking'),
      blockMalware: document.getElementById('block-malware'),
      blockMiners: document.getElementById('block-miners'),
      cnameUncloaking: document.getElementById('cname-uncloaking'),
      fingerprintingProtection: document.getElementById('fingerprinting-protection'),
      blockCookieBanners: document.getElementById('block-cookie-banners'),
      
      // Footer
      settingsLink: document.getElementById('settings-link'),
      helpLink: document.getElementById('help-link'),
      aboutLink: document.getElementById('about-link'),
      aboutModal: document.getElementById('about-modal'),
      aboutClose: document.getElementById('about-close'),
      aboutOpenSettings: document.getElementById('about-open-settings'),
      
      // Footer actions
      blockElementBtn: document.getElementById('block-element-btn'),
      whitelistSiteBtn: document.getElementById('whitelist-site-btn')
    };
  }

  // Setup event listeners
  setupEventListeners() {
    // Control checkboxes
    Object.keys(this.elements).forEach(key => {
      const element = this.elements[key];
      if (element && element.type === 'checkbox') {
        element.addEventListener('change', (e) => {
          this.updateSetting(key, e.target.checked);
        });
      }
    });

    // Footer links
    if (this.elements.settingsLink) {
      this.elements.settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.openSettings();
      });
    }

    if (this.elements.helpLink) {
      this.elements.helpLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.openHelp();
      });
    }
    
    if (this.elements.aboutLink) {
      this.elements.aboutLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.openAbout();
      });
    }

    if (this.elements.aboutClose) {
      this.elements.aboutClose.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeAbout();
      });
    }

    if (this.elements.aboutModal) {
      this.elements.aboutModal.addEventListener('click', (e) => {
        if (e.target === this.elements.aboutModal) {
          this.closeAbout();
        }
      });
    }

    if (this.elements.aboutOpenSettings) {
      this.elements.aboutOpenSettings.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeAbout();
        this.openSettings();
      });
    }

    // Footer action buttons
    if (this.elements.blockElementBtn) {
      this.elements.blockElementBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.startElementPicker();
      });
    }

    if (this.elements.whitelistSiteBtn) {
      this.elements.whitelistSiteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.whitelistCurrentSite();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAbout();
      }
    });
  }

  async loadFilterStatus() {
    // UI simplified: filter list status is shown in Settings instead of popup.
    return;
  }

  // Update whitelist button state
  async updateWhitelistButton() {
    try {
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && this.elements.whitelistSiteBtn) {
        const url = new URL(tab.url);
        const domain = url.hostname;
        
        const stored = await browserAPI.storage.local.get({ whitelist: [] });
        const whitelist = stored.whitelist || [];
        
        if (whitelist.includes(domain)) {
          this.elements.whitelistSiteBtn.querySelector('.footer-btn-text').textContent = 'Remove from Whitelist';
        } else {
          this.elements.whitelistSiteBtn.querySelector('.footer-btn-text').textContent = 'Whitelist Site';
        }
      }
    } catch (error) {
      // Ignore errors during initialization
    }
  }

  formatTime(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch (e) {
      return '—';
    }
  }

  async applyCustomFilterLists() {
    try {
      const btn = this.elements.applyCustomFilters || this.elements.applyCustomFilters2;
      if (btn) {
        btn.textContent = 'Applying...';
        btn.disabled = true;
      }
      const response = await browserAPI.runtime.sendMessage({ action: 'applyCustomFilters' });
      if (btn) {
        btn.textContent = 'Apply Custom Filters';
        btn.disabled = false;
      }
      if (response && response.success) {
        const applied = response.result && typeof response.result.applied === 'number'
          ? response.result.applied
          : null;
        this.showNotification(applied === null ? 'Custom filters applied' : `Custom filters applied (${applied} rules)`);
        await this.loadFilterStatus();
      } else {
        this.showNotification(response && response.error ? response.error : 'Failed to apply custom filters');
      }
    } catch (error) {
      const btn = this.elements.applyCustomFilters || this.elements.applyCustomFilters2;
      if (btn) {
        btn.textContent = 'Apply Custom Filters';
        btn.disabled = false;
      }
      this.showNotification('Failed to apply custom filters');
    }
  }

  openAbout() {
    if (!this.elements.aboutModal) return;
    this.elements.aboutModal.classList.add('open');
    this.elements.aboutModal.setAttribute('aria-hidden', 'false');
  }

  closeAbout() {
    if (!this.elements.aboutModal) return;
    this.elements.aboutModal.classList.remove('open');
    this.elements.aboutModal.setAttribute('aria-hidden', 'true');
  }

  // Update UI with current settings and stats
  updateUI() {
    // Update status
    this.elements.statusIndicator.classList.toggle('active', this.settings.enabled);
    this.elements.statusText.textContent = this.settings.enabled ? 'Active' : 'Disabled';

    // Update controls
    Object.keys(this.settings).forEach(key => {
      if (this.elements[key] && this.elements[key].type === 'checkbox') {
        this.elements[key].checked = this.settings[key];
      }
    });

    // Update stats
    this.elements.blockedCount.textContent = this.formatNumber(this.stats.blocked);
    this.elements.trackedCount.textContent = this.formatNumber(this.stats.tracked);
    this.elements.cnameCount.textContent = this.formatNumber(this.stats.cnameUncloaked);
  }

  // Update setting
  async updateSetting(key, value) {
    this.settings[key] = value;
    await browserAPI.storage.local.set({ [key]: value });
    
    // Notify background script
    browserAPI.runtime.sendMessage({
      action: 'updateSetting',
      key: key,
      value: value
    });
  }

  // Request current stats from background
  async requestStats() {
    try {
      const response = await browserAPI.runtime.sendMessage({ action: 'getStats' });
      if (response) {
        this.stats = response;
        this.updateUI();
      }
    } catch (error) {
      console.log('Failed to get stats:', error);
    }
  }

  // Start element picker (duplicate method - removing this one)
  // This method is already defined below with better error handling

  // Whitelist current site
  async whitelistCurrentSite() {
    try {
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      const domain = new URL(tab.url).hostname;
      
      // Add to whitelist
      const whitelist = await browserAPI.storage.local.get('whitelist');
      const sites = whitelist.whitelist || [];
      
      if (!sites.includes(domain)) {
        sites.push(domain);
        await browserAPI.storage.local.set({ whitelist: sites });
        
        // Show success message
        this.showNotification(`Added ${domain} to whitelist`);
      } else {
        this.showNotification(`${domain} is already whitelisted`);
      }
    } catch (error) {
      console.log('Failed to whitelist site:', error);
    }
  }

  // Clear statistics (duplicate method - removing this one)
  // This method is already defined below with better implementation

  // Update filter lists (method not used - removing)
  // Filter updates are handled in options.js

  // Add custom filter (method not used - removing)
  // Custom filters are handled in options.js

  // Remove custom filter (method not used - removing)
  // Custom filters are handled in options.js

  // Update filter list UI (method not used - removing)
  // Filter list UI is handled in options.js

  // Validate filter format (method not used - removing)
  // Filter validation is handled in options.js

  // Show notification
  showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #007bff;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Open settings
  openSettings() {
    browserAPI.runtime.openOptionsPage();
    window.close();
  }

  // Open help
  openHelp() {
    browserAPI.tabs.create({
      url: 'https://github.com/your-repo/privacyshield-max/wiki'
    });
    window.close();
  }

  // Show about dialog (method not used - removing)
  // About dialog is handled by openAbout() method

  // Start element picker
  async startElementPicker() {
    try {
      // Check if we can access tabs
      if (!browserAPI || !browserAPI.tabs) {
        throw new Error('Browser tabs API not available');
      }
      
      const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        throw new Error('No active tab found');
      }
      
      const tab = tabs[0];
      
      // Validate tab
      if (!tab.id) {
        throw new Error('Invalid tab ID');
      }
      
      // Check if tab is accessible (not chrome:// or about: pages)
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('moz-extension://'))) {
        throw new Error('Cannot run on protected pages');
      }
      
      // Try to send message with timeout
      const messagePromise = browserAPI.tabs.sendMessage(tab.id, { action: 'startElementPicker' });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Content script not responding')), 3000)
      );
      
      await Promise.race([messagePromise, timeoutPromise]);
      
      this.showNotification('Element picker started');
      window.close();
    } catch (error) {
      console.error('Failed to start element picker:', error);
      let errorMessage = 'Failed to start element picker';
      
      // Provide user-friendly error messages
      if (error.message.includes('Content script not responding')) {
        errorMessage = 'Please refresh the page and try again';
      } else if (error.message.includes('protected pages')) {
        errorMessage = 'Cannot use on this page';
      } else if (error.message.includes('not available')) {
        errorMessage = 'Extension permission required';
      }
      
      this.showNotification(errorMessage);
    }
  }

  // Whitelist current site (duplicate method - removing this one)
  // This method is already defined above with better implementation

  // Utility functions
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PrivacyShieldPopup();
});

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
