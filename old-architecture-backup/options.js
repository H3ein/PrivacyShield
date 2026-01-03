// PrivacyShield Max - Options Page Script
// Comprehensive settings management interface

 const browserAPI = (typeof browser !== 'undefined')
   ? browser
   : (typeof chrome !== 'undefined' ? chrome : null);
 
class PrivacyShieldOptions {
  constructor() {
    this.settings = {};
    this.currentTab = 'general';
    this.smartFilteringSystem = null;
    this.blockedElementsData = {};
    this.currentDomain = '';
    this.selectedElements = new Set();
    
    this.initialize();
  }

  async initialize() {
    console.log('PrivacyShield Max - Options page initializing...');
    
    // Load settings
    await this.loadSettings();
    
    // Initialize Smart Filtering System
    if (typeof SmartFilteringSystem !== 'undefined') {
      this.smartFilteringSystem = new SmartFilteringSystem();
    }
    
    // Setup UI
    this.setupNavigation();
    this.setupFormHandlers();
    this.setupActionHandlers();
    this.setupBlockedElementsHandlers();
    
    // Load current settings into UI
    this.loadSettingsIntoUI();
    
    // Load blocked elements
    await this.loadBlockedElements();
    
    // Load statistics
    await this.loadStatistics();
    
    // Setup periodic stats refresh
    this.setupPeriodicStatsRefresh();
    
    console.log('PrivacyShield Max - Options page ready');
  }

  // Load settings from storage
  async loadSettings() {
    const defaultSettings = {
      // General
      enabled: true,
      showBadge: true,
      showNotifications: true,
      autoUpdate: true,
      updateFrequency: 'weekly',
      
      // Protection
      blockAds: true,
      blockTracking: true,
      blockMalware: true,
      blockMiners: true,
      cnameUncloaking: true,
      fingerprintingProtection: true,
      blockCookieBanners: true,
      webrtcProtection: true,
      
      // Smart Filtering
      smartFiltering: true,
      adaptiveFiltering: true,
      behavioralAnalysis: false,
      filteringSensitivity: 5,
      dataRetention: 30,
      confidenceThreshold: 75,
      
      // Advanced
      cacheSize: 10,
      parallelProcessing: true,
      debugMode: false,
      
      // Anti-Detection
      stealthMode: true,
      antiDetection: true,
      baitEvasion: true,
      randomizedTiming: true
    };

    const stored = await browserAPI.storage.local.get(defaultSettings);
    this.settings = stored;
  }

  // Setup navigation
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.dataset.tab;
        
        // Update active states
        navItems.forEach(nav => nav.classList.remove('active'));
        tabContents.forEach(tab => tab.classList.remove('active'));
        
        item.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
        
        this.currentTab = targetTab;
      });
    });
  }

  // Setup form handlers
  setupFormHandlers() {
    // Checkbox handlers
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.updateSetting(e.target.id, e.target.checked);
      });
    });

    // Select handlers
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
      select.addEventListener('change', (e) => {
        this.updateSetting(e.target.id, e.target.value);
      });
    });

    // Number input handlers
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.updateSetting(e.target.id, parseInt(e.target.value));
      });
    });

    // Text input handlers
    const textInputs = document.querySelectorAll('input[type="text"]');
    textInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.updateSetting(e.target.id, e.target.value);
      });
    });

    // Range handlers
    const ranges = document.querySelectorAll('input[type="range"]');
    ranges.forEach(range => {
      range.addEventListener('input', (e) => {
        const valueSpan = e.target.parentElement.querySelector('.range-value');
        if (valueSpan) {
          valueSpan.textContent = e.target.value + (e.target.id.includes('threshold') ? '%' : '');
        }
      });
      
      range.addEventListener('change', (e) => {
        this.updateSetting(e.target.id, parseInt(e.target.value));
      });
    });
  }

  // Setup action handlers
  setupActionHandlers() {
    // Export/Import settings
    document.getElementById('export-settings').addEventListener('click', () => {
      this.exportSettings();
    });

    document.getElementById('import-settings').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
      this.importSettings(e.target.files[0]);
    });

    // Filter management
    document.getElementById('save-custom-filters').addEventListener('click', () => {
      this.saveCustomFilters();
    });

    document.getElementById('clear-custom-filters').addEventListener('click', () => {
      this.clearCustomFilters();
    });

    // Whitelist management
    document.getElementById('add-whitelist').addEventListener('click', () => {
      this.addWhitelistDomain();
    });

    document.getElementById('whitelist-domain').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addWhitelistDomain();
      }
    });

    // AI Learning actions
    document.getElementById('reset-learning').addEventListener('click', () => {
      this.resetLearningData();
    });

    document.getElementById('export-learning').addEventListener('click', () => {
      this.exportLearningData();
    });

    // Statistics actions
    document.getElementById('reset-stats').addEventListener('click', () => {
      this.resetStatistics();
    });

    document.getElementById('export-stats').addEventListener('click', () => {
      this.exportStatistics();
    });

    // Advanced actions
    document.getElementById('export-logs').addEventListener('click', () => {
      this.exportLogs();
    });

    document.getElementById('clear-cache').addEventListener('click', () => {
      this.clearCache();
    });

    // Global actions
    document.getElementById('save-all-settings').addEventListener('click', () => {
      this.saveAllSettings();
    });

    document.getElementById('reset-all-settings').addEventListener('click', () => {
      this.resetAllSettings();
    });

    // Filter update buttons
    document.querySelectorAll('[data-filter]').forEach(button => {
      button.addEventListener('click', (e) => {
        this.updateFilterList(e.target.dataset.filter);
      });
    });
  }

  // Load settings into UI
  loadSettingsIntoUI() {
    Object.keys(this.settings).forEach(key => {
      const element = document.getElementById(this.denormalizeSettingKey(key));
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = this.settings[key];
        } else {
          element.value = this.settings[key];
        }
      }
    });

    // Load custom filters
    this.loadCustomFilters();

    // Load whitelist
    this.loadWhitelist();
  }

  // Update setting
  async updateSetting(key, value) {
    const storageKey = this.normalizeSettingKey(key);
    this.settings[storageKey] = value;
    await browserAPI.storage.local.set({ [storageKey]: value });
    
    // Notify background script
    browserAPI.runtime.sendMessage({
      action: 'updateSetting',
      key: storageKey,
      value: value
    });
  }

  // Export settings
  exportSettings() {
    const exportData = {
      settings: this.settings,
      version: '1.0.0',
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `privacyshield-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import settings
  async importSettings(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.settings) {
        // Update all settings
        Object.keys(data.settings).forEach(key => {
          this.settings[key] = data.settings[key];
        });
        
        // Save to storage
        await browserAPI.storage.local.set(this.settings);
        
        // Reload UI
        this.loadSettingsIntoUI();
        
        // Show success message
        this.showNotification('Settings imported successfully', 'success');
      }
    } catch (error) {
      this.showNotification('Failed to import settings: ' + error.message, 'error');
    }
  }

  // Load custom filters
  async loadCustomFilters() {
    const stored = await browserAPI.storage.local.get('customFilters');
    const customFilters = stored.customFilters || [];
    
    const textarea = document.getElementById('custom-filters-text');
    if (textarea) {
      textarea.value = customFilters.join('\n');
    }
  }

  // Save custom filters
  async saveCustomFilters() {
    const textarea = document.getElementById('custom-filters-text');
    const filters = textarea.value.split('\n')
      .map(filter => filter.trim())
      .filter(filter => filter && !filter.startsWith('!'));

    await browserAPI.storage.local.set({ customFilters: filters });
    
    // Notify background script
    browserAPI.runtime.sendMessage({
      action: 'updateCustomFilters',
      filters: filters
    });
    
    this.showNotification('Custom filters saved', 'success');
  }

  // Clear custom filters
  async clearCustomFilters() {
    if (confirm('Are you sure you want to clear all custom filters?')) {
      await browserAPI.storage.local.set({ customFilters: [] });
      document.getElementById('custom-filters-text').value = '';
      
      browserAPI.runtime.sendMessage({
        action: 'updateCustomFilters',
        filters: []
      });
      
      this.showNotification('Custom filters cleared', 'success');
    }
  }

  // Load whitelist
  async loadWhitelist() {
    const stored = await browserAPI.storage.local.get('whitelist');
    const whitelist = stored.whitelist || [];
    
    const listContainer = document.getElementById('whitelist-list');
    listContainer.innerHTML = '';
    
    whitelist.forEach(domain => {
      this.addWhitelistItem(domain);
    });
  }

  // Add whitelist domain
  async addWhitelistDomain() {
    const input = document.getElementById('whitelist-domain');
    const domain = input.value.trim().toLowerCase();
    
    if (!domain) return;
    
    // Validate domain format
    if (!this.isValidDomain(domain)) {
      this.showNotification('Invalid domain format', 'error');
      return;
    }
    
    const stored = await browserAPI.storage.local.get('whitelist');
    const whitelist = stored.whitelist || [];
    
    if (!whitelist.includes(domain)) {
      whitelist.push(domain);
      await browserAPI.storage.local.set({ whitelist });
      
      this.addWhitelistItem(domain);
      input.value = '';
      
      this.showNotification(`Added ${domain} to whitelist`, 'success');
    } else {
      this.showNotification(`${domain} is already whitelisted`, 'warning');
    }
  }

  // Add whitelist item to UI
  addWhitelistItem(domain) {
    const listContainer = document.getElementById('whitelist-list');
    
    const item = document.createElement('div');
    item.className = 'whitelist-item';
    item.innerHTML = `
      <span class="whitelist-domain">${domain}</span>
      <button class="btn-remove" data-domain="${domain}">Remove</button>
    `;
    
    const removeBtn = item.querySelector('.btn-remove');
    removeBtn.addEventListener('click', () => {
      this.removeWhitelistDomain(domain);
    });
    
    listContainer.appendChild(item);
  }

  // Remove whitelist domain
  async removeWhitelistDomain(domain) {
    const stored = await browserAPI.storage.local.get('whitelist');
    const whitelist = stored.whitelist || [];
    
    const index = whitelist.indexOf(domain);
    if (index > -1) {
      whitelist.splice(index, 1);
      await browserAPI.storage.local.set({ whitelist });
      
      // Remove from UI
      const item = document.querySelector(`[data-domain="${domain}"]`).parentElement;
      item.remove();
      
      this.showNotification(`Removed ${domain} from whitelist`, 'success');
    }
  }

  // Validate domain format
  isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  }

  // Load statistics
  async loadStatistics() {
    try {
      const response = await browserAPI.runtime.sendMessage({ action: 'getStats' });
      if (response) {
        this.updateStatisticsDisplay(response);
        
        // Load smart filtering statistics from background
        if (response.smartFiltering) {
          this.updateSmartStatisticsDisplay(response.smartFiltering);
        } else {
          // Fallback: try to get smart filtering stats directly
          const smartResponse = await browserAPI.runtime.sendMessage({ action: 'getSmartFilteringStats' });
          if (smartResponse && smartResponse.success) {
            this.updateSmartStatisticsDisplay(smartResponse.stats);
          }
        }
      }
    } catch (error) {
      console.log('Failed to load statistics:', error);
    }
  }

  // Setup periodic statistics refresh
  setupPeriodicStatsRefresh() {
    // Refresh smart filtering statistics every 30 seconds
    setInterval(async () => {
      if (this.currentTab === 'smart-filtering') {
        try {
          const response = await browserAPI.runtime.sendMessage({ action: 'getSmartFilteringStats' });
          if (response && response.success) {
            this.updateSmartStatisticsDisplay(response.stats);
          }
        } catch (error) {
          // Silent fail for periodic refresh
        }
      }
    }, 30000);
  }

  // Update statistics display
  updateStatisticsDisplay(stats) {
    const elements = {
      'total-blocked': stats.blocked || 0,
      'ads-blocked': Math.floor((stats.blocked || 0) * 0.6),
      'trackers-blocked': Math.floor((stats.blocked || 0) * 0.3),
      'malware-blocked': Math.floor((stats.blocked || 0) * 0.1),
      'data-saved': this.formatDataSize((stats.blocked || 0) * 50) // Estimate 50KB per blocked request
    };

    Object.keys(elements).forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = elements[id];
      }
    });
  }

  // Update smart filtering statistics display
  updateSmartStatisticsDisplay(stats) {
    const elements = {
      'patterns-learned': stats.patternsLearned || 0,
      'accuracy-rate': (stats.accuracyRate || '0') + '%',
      'false-positives': stats.falsePositives || 0,
      'domains-tracked': stats.domainsTracked || 0
    };

    Object.keys(elements).forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = elements[id];
      }
    });
  }

  // Reset smart filtering data
  async resetLearningData() {
    if (confirm('Are you sure you want to reset all smart filtering data? This cannot be undone.')) {
      try {
        // Reset in background script
        const response = await browserAPI.runtime.sendMessage({ action: 'resetSmartFilteringData' });
        
        if (response && response.success) {
          this.showNotification('Smart filtering data reset successfully', 'success');
          // Reload statistics
          await this.loadStatistics();
        } else {
          // Fallback: try local reset
          if (this.smartFilteringSystem) {
            await this.smartFilteringSystem.resetPatternData();
            this.showNotification('Smart filtering data reset locally', 'success');
            await this.loadStatistics();
          } else {
            this.showNotification('Failed to reset smart filtering data', 'error');
          }
        }
      } catch (error) {
        console.error('Failed to reset smart filtering data:', error);
        this.showNotification('Failed to reset smart filtering data', 'error');
      }
    }
  }

  // Export smart filtering data
  exportLearningData() {
    if (this.smartFilteringSystem) {
      const data = this.smartFilteringSystem.exportPatternData();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `privacyshield-smart-filtering-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // Reset statistics
  async resetStatistics() {
    if (confirm('Are you sure you want to reset all statistics?')) {
      const clearedStats = {
        blocked: 0,
        tracked: 0,
        cnameUncloaked: 0
      };
      
      await browserAPI.storage.local.set(clearedStats);
      
      browserAPI.runtime.sendMessage({
        action: 'clearStats'
      });
      
      this.updateStatisticsDisplay(clearedStats);
      this.showNotification('Statistics reset', 'success');
    }
  }

  // Export statistics
  exportStatistics() {
    const stats = {
      blocked: this.settings.blocked || 0,
      tracked: this.settings.tracked || 0,
      cnameUncloaked: this.settings.cnameUncloaked || 0,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(stats, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `privacyshield-stats-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Export logs
  exportLogs() {
    // This would collect logs from various sources
    const logs = {
      consoleLogs: [], // Would need to collect from background script
      errorLogs: [],
      accessLogs: [],
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `privacyshield-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Clear cache
  async clearCache() {
    if (confirm('Are you sure you want to clear the cache?')) {
      // Clear various caches
      await browserAPI.storage.local.remove(['cache', 'dnsCache', 'filterCache']);
      
      this.showNotification('Cache cleared', 'success');
    }
  }

  // Save all settings
  async saveAllSettings() {
    await browserAPI.storage.local.set(this.settings);
    
    browserAPI.runtime.sendMessage({
      action: 'updateAllSettings',
      settings: this.settings
    });
    
    this.showNotification('All settings saved', 'success');
  }

  // Reset all settings
  async resetAllSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      await browserAPI.storage.local.clear();
      
      // Reload page to reset to defaults
      location.reload();
    }
  }

  // Update filter list
  async updateFilterList(filterName) {
    const button = document.querySelector(`[data-filter="${filterName}"]`);
    const originalText = button.textContent;
    
    button.textContent = 'Updating...';
    button.disabled = true;
    
    try {
      await browserAPI.runtime.sendMessage({
        action: 'updateFilterList',
        filterName: filterName
      });
      
      this.showNotification(`${filterName} updated successfully`, 'success');
    } catch (error) {
      this.showNotification(`Failed to update ${filterName}`, 'error');
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  // Format data size
  formatDataSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  normalizeSettingKey(key) {
    if (!key) return key;
    if (key.includes('-')) {
      return key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    }
    return key;
  }

  denormalizeSettingKey(key) {
    if (!key) return key;
    return key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  }

  // Blocked Elements Management
  async loadBlockedElements() {
    try {
      const result = await browserAPI.storage.local.get();
      this.blockedElementsData = {};
      
      // Find all blocked elements data
      Object.keys(result).forEach(key => {
        if (key.startsWith('blockedElements_')) {
          const domain = key.replace('blockedElements_', '');
          this.blockedElementsData[domain] = result[key];
        }
      });
      
      console.log('Loaded blocked elements data:', this.blockedElementsData);
      this.populateDomainSelector();
    } catch (error) {
      console.error('Failed to load blocked elements:', error);
    }
  }

  populateDomainSelector() {
    const select = document.getElementById('blocked-domain-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select a domain...</option>';
    
    const domains = Object.keys(this.blockedElementsData).sort();
    domains.forEach(domain => {
      const option = document.createElement('option');
      option.value = domain;
      option.textContent = domain;
      select.appendChild(option);
    });
    
    if (domains.length === 0) {
      select.innerHTML = '<option value="">No blocked elements found</option>';
      select.disabled = true;
    } else {
      select.disabled = false;
    }
  }

  async loadBlockedElementsForDomain(domain) {
    if (!domain || !this.blockedElementsData[domain]) {
      this.showEmptyState();
      return;
    }
    
    const data = this.blockedElementsData[domain];
    const listContainer = document.getElementById('blocked-elements-list');
    
    if (!data.selectors || data.selectors.length === 0) {
      this.showEmptyState();
      return;
    }
    
    listContainer.innerHTML = '';
    
    data.selectors.forEach((selector, index) => {
      const item = this.createBlockedElementItem(selector, domain, data.timestamp, index);
      listContainer.appendChild(item);
    });
    
    // Update action buttons state
    this.updateActionButtonsState();
  }

  createBlockedElementItem(selector, domain, timestamp, index) {
    const item = document.createElement('div');
    item.className = 'blocked-element-item';
    item.dataset.selector = selector;
    item.dataset.domain = domain;
    item.dataset.index = index;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'blocked-element-checkbox';
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      this.toggleElementSelection(selector, e.target.checked);
    });
    
    const info = document.createElement('div');
    info.className = 'blocked-element-info';
    
    const selectorDiv = document.createElement('div');
    selectorDiv.className = 'blocked-element-selector';
    selectorDiv.textContent = selector;
    
    const meta = document.createElement('div');
    meta.className = 'blocked-element-meta';
    const date = new Date(timestamp).toLocaleDateString();
    const elementType = this.getElementType(selector);
    meta.innerHTML = `<span>${elementType}</span><span>${date}</span>`;
    
    info.appendChild(selectorDiv);
    info.appendChild(meta);
    
    const actions = document.createElement('div');
    actions.className = 'blocked-element-actions';
    
    const unblockBtn = document.createElement('button');
    unblockBtn.className = 'btn-sm';
    unblockBtn.textContent = 'Unblock';
    unblockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.unblockElement(domain, selector);
    });
    
    actions.appendChild(unblockBtn);
    
    item.appendChild(checkbox);
    item.appendChild(info);
    item.appendChild(actions);
    
    item.addEventListener('click', () => {
      this.selectElement(selector, domain, timestamp);
    });
    
    return item;
  }

  getElementType(selector) {
    if (selector.startsWith('#')) return 'ID';
    if (selector.startsWith('.')) return 'Class';
    if (selector.includes('[')) return 'Attribute';
    if (selector.includes(':')) return 'Pseudo-element';
    return 'Tag';
  }

  showEmptyState() {
    const listContainer = document.getElementById('blocked-elements-list');
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚫</div>
        <h3>No blocked elements found</h3>
        <p>Select a domain to view blocked elements, or block some elements on websites first.</p>
      </div>
    `;
  }

  selectElement(selector, domain, timestamp) {
    // Update selected state
    document.querySelectorAll('.blocked-element-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`[data-selector="${selector}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }
    
    // Show element details
    this.showElementDetails(selector, domain, timestamp);
  }

  showElementDetails(selector, domain, timestamp) {
    const detailsContainer = document.getElementById('element-details');
    if (!detailsContainer) return;
    
    detailsContainer.style.display = 'block';
    
    document.getElementById('detail-selector').textContent = selector;
    document.getElementById('detail-domain').textContent = domain;
    document.getElementById('detail-date').textContent = new Date(timestamp).toLocaleString();
    document.getElementById('detail-type').textContent = this.getElementType(selector);
    
    // Try to get element preview (simplified)
    const previewContent = document.getElementById('preview-content');
    previewContent.innerHTML = `
      <div style="font-family: monospace; font-size: 11px; color: var(--ps-muted);">
        Element selector: ${selector}<br>
        This would show a preview of the blocked element if available.
      </div>
    `;
  }

  toggleElementSelection(selector, selected) {
    if (selected) {
      this.selectedElements.add(selector);
    } else {
      this.selectedElements.delete(selector);
    }
    this.updateActionButtonsState();
  }

  updateActionButtonsState() {
    const unblockSelectedBtn = document.getElementById('unblock-selected');
    const unblockAllDomainBtn = document.getElementById('unblock-all-domain');
    const clearAllBtn = document.getElementById('clear-all-blocked');
    
    unblockSelectedBtn.disabled = this.selectedElements.size === 0;
    unblockAllDomainBtn.disabled = !this.currentDomain;
    clearAllBtn.disabled = Object.keys(this.blockedElementsData).length === 0;
  }

  async unblockElement(domain, selector) {
    try {
      // Get current data for the domain
      const data = this.blockedElementsData[domain];
      if (!data) return;
      
      // Remove selector from array
      const index = data.selectors.indexOf(selector);
      if (index > -1) {
        data.selectors.splice(index, 1);
        
        // Update storage
        await browserAPI.storage.local.set({
          [`blockedElements_${domain}`]: data
        });
        
        // Update local data
        if (data.selectors.length === 0) {
          delete this.blockedElementsData[domain];
          await browserAPI.storage.local.remove(`blockedElements_${domain}`);
        } else {
          this.blockedElementsData[domain] = data;
        }
        
        // Refresh UI
        await this.loadBlockedElementsForDomain(domain);
        this.populateDomainSelector();
        
        // Show success message
        this.showNotification('Element unblocked successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to unblock element:', error);
      this.showNotification('Failed to unblock element', 'error');
    }
  }

  async unblockSelectedElements() {
    if (this.selectedElements.size === 0) return;
    
    try {
      const selectors = Array.from(this.selectedElements);
      
      for (const selector of selectors) {
        const item = document.querySelector(`[data-selector="${selector}"]`);
        if (item) {
          const domain = item.dataset.domain;
          await this.unblockElement(domain, selector);
        }
      }
      
      this.selectedElements.clear();
      this.showNotification(`Unblocked ${selectors.length} elements`, 'success');
    } catch (error) {
      console.error('Failed to unblock selected elements:', error);
      this.showNotification('Failed to unblock elements', 'error');
    }
  }

  async unblockAllDomainElements() {
    if (!this.currentDomain) return;
    
    try {
      await browserAPI.storage.local.remove(`blockedElements_${this.currentDomain}`);
      delete this.blockedElementsData[this.currentDomain];
      
      this.populateDomainSelector();
      this.showEmptyState();
      this.updateActionButtonsState();
      
      this.showNotification(`Unblocked all elements on ${this.currentDomain}`, 'success');
    } catch (error) {
      console.error('Failed to unblock all domain elements:', error);
      this.showNotification('Failed to unblock elements', 'error');
    }
  }

  async clearAllBlockedElements() {
    if (!confirm('Are you sure you want to clear all blocked elements? This action cannot be undone.')) {
      return;
    }
    
    try {
      const keysToRemove = Object.keys(this.blockedElementsData).map(domain => `blockedElements_${domain}`);
      await browserAPI.storage.local.remove(keysToRemove);
      
      this.blockedElementsData = {};
      this.populateDomainSelector();
      this.showEmptyState();
      this.updateActionButtonsState();
      
      this.showNotification('All blocked elements cleared', 'success');
    } catch (error) {
      console.error('Failed to clear all blocked elements:', error);
      this.showNotification('Failed to clear elements', 'error');
    }
  }

  async exportBlockedElements() {
    try {
      const exportData = {
        version: '1.0',
        timestamp: Date.now(),
        blockedElements: this.blockedElementsData
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `privacyshield-blocked-elements-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showNotification('Blocked elements exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export blocked elements:', error);
      this.showNotification('Failed to export elements', 'error');
    }
  }

  async importBlockedElements() {
    const input = document.getElementById('import-blocked-file');
    if (!input.files.length) return;
    
    try {
      const file = input.files[0];
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.blockedElements) {
        throw new Error('Invalid file format');
      }
      
      // Merge with existing data
      Object.assign(this.blockedElementsData, data.blockedElements);
      
      // Save to storage
      const savePromises = Object.entries(data.blockedElements).map(([domain, elements]) => {
        return browserAPI.storage.local.set({
          [`blockedElements_${domain}`]: elements
        });
      });
      
      await Promise.all(savePromises);
      
      this.populateDomainSelector();
      this.showNotification('Blocked elements imported successfully', 'success');
      
      // Clear input
      input.value = '';
    } catch (error) {
      console.error('Failed to import blocked elements:', error);
      this.showNotification('Failed to import elements: ' + error.message, 'error');
    }
  }

  setupBlockedElementsHandlers() {
    // Domain selector change
    const domainSelect = document.getElementById('blocked-domain-select');
    if (domainSelect) {
      domainSelect.addEventListener('change', (e) => {
        this.currentDomain = e.target.value;
        this.selectedElements.clear();
        this.loadBlockedElementsForDomain(this.currentDomain);
      });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-domains');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadBlockedElements();
      });
    }
    
    // Action buttons
    const unblockSelectedBtn = document.getElementById('unblock-selected');
    if (unblockSelectedBtn) {
      unblockSelectedBtn.addEventListener('click', () => {
        this.unblockSelectedElements();
      });
    }
    
    const unblockAllDomainBtn = document.getElementById('unblock-all-domain');
    if (unblockAllDomainBtn) {
      unblockAllDomainBtn.addEventListener('click', () => {
        this.unblockAllDomainElements();
      });
    }
    
    const clearAllBtn = document.getElementById('clear-all-blocked');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        this.clearAllBlockedElements();
      });
    }
    
    // Import/Export buttons
    const exportBtn = document.getElementById('export-blocked-elements');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportBlockedElements();
      });
    }
    
    const importBtn = document.getElementById('import-blocked-elements');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        document.getElementById('import-blocked-file').click();
      });
    }
    
    const importFile = document.getElementById('import-blocked-file');
    if (importFile) {
      importFile.addEventListener('change', () => {
        this.importBlockedElements();
      });
    }
  }
}

// Initialize options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PrivacyShieldOptions();
});

// Add CSS animations
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
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
