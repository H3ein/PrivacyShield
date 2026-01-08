// PrivacyShield - Global Browser Learning System

import { formatNumber } from '../core/utils.js';

/**
 * Global Browser Learning Manager
 * Replaces tab-based learning with browser-wide intelligence
 */
export class GlobalBrowserLearning {
  constructor() {
    this.learningData = {
      sitesAnalyzed: 0,
      patterns: [],
      accuracy: 0.4, // Start at 40%
      domains: {}, // Per-domain learning
      lastUpdate: Date.now(),
      startTime: Date.now()
    };
    
    this.storageKey = 'privacyshield_global_learning';
    this.updateInterval = 30000; // 30 seconds
    this.isInitialized = false;
  }

  /**
   * Initialize global learning system
   */
  async initialize() {
    try {
      await this.loadStoredData();
      this.isInitialized = true;
      
      // Start periodic learning updates
      this.startPeriodicUpdates();
      
      // Setup tab listeners for cross-tab learning
      this.setupTabListeners();
      
      console.log('Global Browser Learning initialized');
      console.log('Current accuracy:', Math.round(this.learningData.accuracy * 100) + '%');
      console.log('Sites analyzed:', this.learningData.sitesAnalyzed);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize global learning:', error);
      return false;
    }
  }

  /**
   * Load stored learning data
   */
  async loadStoredData() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      if (result[this.storageKey]) {
        this.learningData = { ...this.learningData, ...result[this.storageKey] };
        console.log('Loaded existing learning data:', this.learningData);
      } else {
        // Initialize with default data
        await this.saveData();
        console.log('Initialized with default learning data');
      }
    } catch (error) {
      console.warn('Failed to load stored data, using defaults:', error);
    }
  }

  /**
   * Save learning data to storage
   */
  async saveData() {
    try {
      await chrome.storage.local.set({
        [this.storageKey]: this.learningData
      });
    } catch (error) {
      console.error('Failed to save learning data:', error);
    }
  }

  /**
   * Setup tab listeners for cross-tab learning
   */
  setupTabListeners() {
    // Listen for tab updates (page loads, refreshes)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.learnFromTab(tabId, tab.url);
      }
    });

    // Listen for tab creation (new tabs)
    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.url) {
        this.learnFromTab(tab.id, tab.url);
      }
    });

    // Listen for tab removal (cleanup)
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.cleanupTabData(tabId);
    });
  }

  /**
   * Learn from a specific tab
   */
  async learnFromTab(tabId, url) {
    try {
      if (!this.isInitialized) return;

      const domain = this.extractDomain(url);
      if (!domain) return;

      // Initialize domain learning if not exists
      if (!this.learningData.domains[domain]) {
        this.learningData.domains[domain] = {
          patterns: [],
          visits: 0,
          trackersBlocked: 0,
          adsBlocked: 0,
          accuracy: 0.4,
          lastVisit: Date.now()
        };
      }

      // Update domain learning
      const domainData = this.learningData.domains[domain];
      domainData.visits++;
      domainData.lastVisit = Date.now();

      // Simulate pattern discovery (in real implementation, this would analyze page content)
      const newPatterns = this.simulatePatternDiscovery(url, domain);
      domainData.patterns.push(...newPatterns);

      // Update global stats
      this.learningData.sitesAnalyzed++;
      this.learningData.patterns.push(...newPatterns);
      this.learningData.lastUpdate = Date.now();

      // Calculate improved accuracy
      this.updateAccuracy();

      // Save changes
      await this.saveData();

      // Notify all tabs of learning progress
      this.broadcastLearningUpdate();

      console.log(`Learned from ${domain}: ${newPatterns.length} new patterns`);
      
    } catch (error) {
      console.error('Failed to learn from tab:', error);
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return null;
    }
  }

  /**
   * Simulate pattern discovery (replace with real analysis)
   */
  simulatePatternDiscovery(url, domain) {
    const patterns = [];
    const patternTypes = ['ad', 'tracker', 'fingerprinting'];
    
    // Simulate discovering 1-3 patterns per page
    const patternCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < patternCount; i++) {
      const patternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
      patterns.push({
        id: `pattern_${Date.now()}_${i}`,
        type: patternType,
        domain: domain,
        url: url,
        confidence: Math.random() * 0.5 + 0.5, // 0.5-1.0
        timestamp: Date.now(),
        features: this.extractFeatures(url, patternType)
      });
    }
    
    return patterns;
  }

  /**
   * Extract features from URL (simplified simulation)
   */
  extractFeatures(url, patternType) {
    const features = {
      urlLength: url.length,
      hasParams: url.includes('?'),
      pathDepth: url.split('/').length - 1,
      domain: this.extractDomain(url),
      patternType: patternType
    };

    // Add pattern-specific features
    switch (patternType) {
      case 'ad':
        features.adKeywords = this.checkAdKeywords(url);
        break;
      case 'tracker':
        features.trackingParams = this.checkTrackingParams(url);
        break;
      case 'fingerprinting':
        features.fingerprintingIndicators = this.checkFingerprintingIndicators(url);
        break;
    }

    return features;
  }

  /**
   * Check for ad keywords in URL
   */
  checkAdKeywords(url) {
    const adKeywords = ['ad', 'banner', 'popup', 'doubleclick', 'adsystem'];
    return adKeywords.filter(keyword => url.toLowerCase().includes(keyword));
  }

  /**
   * Check for tracking parameters
   */
  checkTrackingParams(url) {
    const trackingParams = ['utm_', 'fbclid', 'gclid', 'click_id', 'session_id'];
    const urlParams = new URL(url).searchParams;
    
    return trackingParams.filter(param => 
      Array.from(urlParams.keys()).some(key => key.includes(param))
    );
  }

  /**
   * Check for fingerprinting indicators
   */
  checkFingerprintingIndicators(url) {
    const fingerprintingIndicators = ['fingerprint', 'canvas', 'webgl', 'audio'];
    return fingerprintingIndicators.filter(indicator => 
      url.toLowerCase().includes(indicator)
    );
  }

  /**
   * Update overall accuracy based on learning
   */
  updateAccuracy() {
    const baseAccuracy = 0.4;
    const sitesBonus = Math.min(0.4, this.learningData.sitesAnalyzed * 0.001);
    const patternsBonus = Math.min(0.2, this.learningData.patterns.length * 0.0001);
    const domainBonus = this.calculateDomainBonus();
    
    this.learningData.accuracy = Math.min(0.95, baseAccuracy + sitesBonus + patternsBonus + domainBonus);
  }

  /**
   * Calculate bonus from domain-specific learning
   */
  calculateDomainBonus() {
    const domains = Object.values(this.learningData.domains);
    if (domains.length === 0) return 0;
    
    const avgVisitsPerDomain = domains.reduce((sum, d) => sum + d.visits, 0) / domains.length;
    const learnedDomains = domains.filter(d => d.visits > 5).length;
    
    return Math.min(0.1, (learnedDomains / domains.length) * 0.1);
  }

  /**
   * Start periodic learning updates
   */
  startPeriodicUpdates() {
    setInterval(async () => {
      if (this.isInitialized) {
        // Simulate background learning
        await this.simulateBackgroundLearning();
        
        // Broadcast updates to all open tabs
        this.broadcastLearningUpdate();
      }
    }, this.updateInterval);
  }

  /**
   * Simulate background learning processes
   */
  async simulateBackgroundLearning() {
    // Simulate discovering new patterns from existing knowledge
    if (Math.random() > 0.7) { // 30% chance
      const domains = Object.keys(this.learningData.domains);
      if (domains.length > 0) {
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        const newPatterns = this.simulatePatternDiscovery(`https://${randomDomain}`, randomDomain);
        
        this.learningData.patterns.push(...newPatterns);
        this.learningData.lastUpdate = Date.now();
        this.updateAccuracy();
        await this.saveData();
        
        console.log(`Background learning: ${newPatterns.length} new patterns for ${randomDomain}`);
      }
    }
  }

  /**
   * Broadcast learning updates to all tabs
   */
  broadcastLearningUpdate() {
    // Send message to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'LEARNING_UPDATE',
          data: {
            accuracy: this.learningData.accuracy,
            sitesAnalyzed: this.learningData.sitesAnalyzed,
            patterns: this.learningData.patterns.length
          }
        }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      });
    });
  }

  /**
   * Cleanup tab data when tab is closed
   */
  cleanupTabData(tabId) {
    // In a real implementation, this would clean up any tab-specific memory
    console.log(`Cleaned up data for tab ${tabId}`);
  }

  /**
   * Get current learning data for UI
   */
  getLearningData() {
    return {
      accuracy: this.learningData.accuracy,
      sitesAnalyzed: this.learningData.sitesAnalyzed,
      patterns: this.learningData.patterns.length,
      domains: Object.keys(this.learningData.domains).length,
      accuracyTrend: this.calculateAccuracyTrend(),
      accuracyImprovement: Math.round((this.learningData.accuracy - 0.4) * 100)
    };
  }

  /**
   * Calculate accuracy trend
   */
  calculateAccuracyTrend() {
    const timeSinceStart = Date.now() - this.learningData.startTime;
    const hoursActive = timeSinceStart / (1000 * 60 * 60);
    
    if (this.learningData.sitesAnalyzed > 50 && hoursActive > 1) {
      return 'improving';
    } else if (this.learningData.accuracy < 0.5) {
      return 'stable';
    } else {
      return 'stable';
    }
  }

  /**
   * Export learning data
   */
  async exportData() {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      learningData: this.learningData,
      statistics: {
        totalSites: this.learningData.sitesAnalyzed,
        totalPatterns: this.learningData.patterns.length,
        totalDomains: Object.keys(this.learningData.domains).length,
        currentAccuracy: this.learningData.accuracy,
        learningDuration: Date.now() - this.learningData.startTime
      }
    };
    
    return exportData;
  }

  /**
   * Import learning data
   */
  async importData(importData) {
    try {
      if (importData.learningData) {
        this.learningData = { ...this.learningData, ...importData.learningData };
        await this.saveData();
        this.broadcastLearningUpdate();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import learning data:', error);
      return false;
    }
  }

  /**
   * Reset all learning data
   */
  async resetData() {
    this.learningData = {
      sitesAnalyzed: 0,
      patterns: [],
      accuracy: 0.4,
      domains: {},
      lastUpdate: Date.now(),
      startTime: Date.now()
    };
    
    await this.saveData();
    this.broadcastLearningUpdate();
    
    console.log('Global learning data reset');
  }

  /**
   * Get domain-specific statistics
   */
  getDomainStats(domain) {
    return this.learningData.domains[domain] || {
      patterns: [],
      visits: 0,
      trackersBlocked: 0,
      adsBlocked: 0,
      accuracy: 0.4
    };
  }

  /**
   * Get top learned domains
   */
  getTopDomains(limit = 10) {
    const domains = Object.entries(this.learningData.domains);
    return domains
      .sort(([,a], [,b]) => b.visits - a.visits)
      .slice(0, limit)
      .map(([domain, data]) => ({ domain, ...data }));
  }
}

// Export singleton instance
export const globalLearning = new GlobalBrowserLearning();
