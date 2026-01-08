// PrivacyShield - Community Learning Network
// Crowd-sourced intelligence for adaptive privacy protection

class CommunityLearningNetwork {
  constructor() {
    this.communityEndpoint = 'https://api.privacyshield.community/v1';
    this.localCache = new Map(); // pattern_hash -> pattern_data
    this.contributionScore = 0;
    this.syncInterval = 60 * 60 * 1000; // 1 hour
    this.lastSync = 0;
    
    // Privacy and quality controls
    this.minContributionQuality = 0.8;
    this.maxContributionsPerDay = 50;
    this.anonymizationLevel = 'high'; // 'low', 'medium', 'high'
    
    // Learning categories
    this.categories = {
      AD_DETECTION: 'ad_detection',
      TRACKER_IDENTIFICATION: 'tracker_identification', 
      FINGERPRINTING_PATTERNS: 'fingerprinting_patterns',
      MALICIOUS_SCRIPTS: 'malicious_scripts',
      PRIVACY_VIOLATIONS: 'privacy_violations'
    };
    
    this.initializeCommunityLearning();
  }

  /**
   * Initialize community learning system
   */
  async initializeCommunityLearning() {
    await this.loadLocalCache();
    await this.loadContributionStats();
    
    // Start periodic sync
    this.startPeriodicSync();
    
    // Setup contribution tracking
    this.trackContributions();
    
    console.log('Community Learning Network initialized');
  }

  /**
   * Contribute learned patterns to community
   */
  async contributePatterns(patterns, metadata = {}) {
    if (!this.canContribute()) {
      console.warn('Contribution limits reached or quality too low');
      return false;
    }

    try {
      // Validate and prepare patterns
      const validatedPatterns = this.validatePatterns(patterns);
      if (validatedPatterns.length === 0) {
        return false;
      }

      // Anonymize patterns for privacy
      const anonymizedPatterns = this.anonymizePatterns(validatedPatterns);
      
      // Prepare contribution payload
      const contribution = {
        patterns: anonymizedPatterns,
        metadata: {
          version: '1.0',
          timestamp: Date.now(),
          contributorId: this.generateContributorId(),
          userAgent: navigator.userAgent.substring(0, 50), // Limited for privacy
          ...metadata
        },
        quality: this.calculateContributionQuality(validatedPatterns)
      };

      // Submit to community
      const response = await this.submitContribution(contribution);
      
      if (response.success) {
        this.updateContributionStats(response.newScore);
        console.log(`Successfully contributed ${validatedPatterns.length} patterns`);
        return true;
      } else {
        console.warn('Contribution rejected:', response.reason);
        return false;
      }

    } catch (error) {
      console.error('Failed to contribute patterns:', error);
      return false;
    }
  }

  /**
   * Check if user can contribute
   */
  canContribute() {
    const today = new Date().toDateString();
    const contributionsToday = this.getTodayContributions();
    
    return contributionsToday < this.maxContributionsPerDay && 
           this.contributionScore >= 10; // Minimum score to contribute
  }

  /**
   * Get today's contribution count
   */
  getTodayContributions() {
    const today = new Date().toDateString();
    const stats = this.getContributionStats();
    return stats.dailyContributions[today] || 0;
  }

  /**
   * Validate patterns for quality
   */
  validatePatterns(patterns) {
    return patterns.filter(pattern => {
      // Must have minimum confidence
      if (pattern.confidence < this.minContributionQuality) {
        return false;
      }
      
      // Must have proper structure
      if (!pattern.type || !pattern.features) {
        return false;
      }
      
      // Must have sufficient data
      if (!pattern.signature || pattern.signature.length < 8) {
        return false;
      }
      
      // Check for malicious patterns (protect community)
      if (this.containsMaliciousContent(pattern)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Check for malicious content in patterns
   */
  containsMaliciousContent(pattern) {
    const suspiciousKeywords = [
      'eval', 'document.write', 'innerHTML', 'outerHTML',
      'Function(', 'setTimeout(string)', 'setInterval(string)'
    ];
    
    const patternString = JSON.stringify(pattern).toLowerCase();
    return suspiciousKeywords.some(keyword => patternString.includes(keyword));
  }

  /**
   * Anonymize patterns for privacy protection
   */
  anonymizePatterns(patterns) {
    return patterns.map(pattern => {
      const anonymized = { ...pattern };
      
      // Remove or hash sensitive data
      if (anonymized.domain) {
        anonymized.domain = this.hashDomain(anonymized.domain);
      }
      
      // Remove specific URLs
      if (anonymized.url) {
        delete anonymized.url;
      }
      
      // Limit detailed features
      if (anonymized.features) {
        anonymized.features = this.sanitizeFeatures(anonymized.features);
      }
      
      // Add anonymization metadata
      anonymized.anonymized = true;
      anonymized.anonymizationLevel = this.anonymizationLevel;
      
      return anonymized;
    });
  }

  /**
   * Sanitize feature data for privacy
   */
  sanitizeFeatures(features) {
    const sanitized = { ...features };
    
    // Round numerical values to prevent fingerprinting
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'number') {
        sanitized[key] = Math.round(sanitized[key] * 10) / 10;
      }
    });
    
    // Remove potentially identifying features
    delete sanitized.exactElementCount;
    delete sanitized.specificClassNames;
    
    return sanitized;
  }

  /**
   * Generate contributor ID (pseudonymous)
   */
  generateContributorId() {
    // Create persistent but anonymous ID
    let contributorId = localStorage.getItem('privacyshield_contributor_id');
    
    if (!contributorId) {
      contributorId = 'contributor_' + Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
      localStorage.setItem('privacyshield_contributor_id', contributorId);
    }
    
    return contributorId;
  }

  /**
   * Calculate contribution quality score
   */
  calculateContributionQuality(patterns) {
    if (patterns.length === 0) return 0;
    
    let totalQuality = 0;
    
    patterns.forEach(pattern => {
      let quality = 0;
      
      // Confidence contributes to quality
      quality += pattern.confidence * 0.4;
      
      // Feature completeness
      if (pattern.features && Object.keys(pattern.features).length > 3) {
        quality += 0.2;
      }
      
      // Pattern uniqueness (avoid duplicates)
      if (this.isUniquePattern(pattern)) {
        quality += 0.2;
      }
      
      // Category importance
      if (this.isHighValueCategory(pattern.type)) {
        quality += 0.2;
      }
      
      totalQuality += quality;
    });
    
    return totalQuality / patterns.length;
  }

  /**
   * Check if pattern is unique
   */
  isUniquePattern(pattern) {
    const signature = pattern.signature;
    return !this.localCache.has(signature);
  }

  /**
   * Check if category is high value
   */
  isHighValueCategory(category) {
    const highValueCategories = [
      this.categories.MALICIOUS_SCRIPTS,
      this.categories.FINGERPRINTING_PATTERNS,
      this.categories.PRIVACY_VIOLATIONS
    ];
    
    return highValueCategories.includes(category);
  }

  /**
   * Submit contribution to community
   */
  async submitContribution(contribution) {
    try {
      const response = await fetch(`${this.communityEndpoint}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PrivacyShield-Version': '1.0'
        },
        body: JSON.stringify(contribution)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Failed to submit contribution:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Fetch community patterns
   */
  async fetchCommunityPatterns(category = null, limit = 100) {
    try {
      const url = new URL(`${this.communityEndpoint}/patterns`);
      if (category) url.searchParams.append('category', category);
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('minQuality', this.minContributionQuality.toString());
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch patterns: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache patterns locally
      data.patterns.forEach(pattern => {
        this.localCache.set(pattern.signature, pattern);
      });
      
      // Save cache
      this.saveLocalCache();
      
      return data.patterns;
      
    } catch (error) {
      console.error('Failed to fetch community patterns:', error);
      return [];
    }
  }

  /**
   * Get community intelligence for domain
   */
  async getCommunityIntelligence(domain) {
    const hashedDomain = this.hashDomain(domain);
    
    try {
      const response = await fetch(`${this.communityEndpoint}/intelligence/${hashedDomain}`);
      if (!response.ok) {
        return null;
      }
      
      const intelligence = await response.json();
      
      // Validate and score intelligence
      if (this.validateIntelligence(intelligence)) {
        return intelligence;
      }
      
      return null;
      
    } catch (error) {
      console.error('Failed to get community intelligence:', error);
      return null;
    }
  }

  /**
   * Validate community intelligence
   */
  validateIntelligence(intelligence) {
    // Must have minimum community support
    if (intelligence.communitySupport < 5) {
      return false;
    }
    
    // Must have high confidence
    if (intelligence.confidence < 0.8) {
      return false;
    }
    
    // Must be recent (within last 30 days)
    const age = Date.now() - intelligence.lastUpdated;
    if (age > 30 * 24 * 60 * 60 * 1000) {
      return false;
    }
    
    return true;
  }

  /**
   * Report false positive/negative
   */
  async reportFeedback(patternId, feedbackType, details = {}) {
    try {
      const feedback = {
        patternId,
        feedbackType, // 'false_positive' or 'false_negative'
        timestamp: Date.now(),
        contributorId: this.generateContributorId(),
        details: this.sanitizeFeedbackDetails(details)
      };
      
      const response = await fetch(`${this.communityEndpoint}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback)
      });
      
      if (response.ok) {
        console.log(`Feedback submitted for ${patternId}: ${feedbackType}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return false;
    }
  }

  /**
   * Sanitize feedback details for privacy
   */
  sanitizeFeedbackDetails(details) {
    const sanitized = { ...details };
    
    // Remove URLs and domains
    delete sanitized.url;
    delete sanitized.fullDomain;
    
    // Limit text length
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 200) {
        sanitized[key] = sanitized[key].substring(0, 200) + '...';
      }
    });
    
    return sanitized;
  }

  /**
   * Start periodic synchronization
   */
  startPeriodicSync() {
    setInterval(async () => {
      await this.syncWithCommunity();
    }, this.syncInterval);
  }

  /**
   * Synchronize with community
   */
  async syncWithCommunity() {
    if (Date.now() - this.lastSync < this.syncInterval) {
      return;
    }
    
    try {
      console.log('Syncing with community...');
      
      // Fetch latest patterns
      const patterns = await this.fetchCommunityPatterns();
      
      // Update local cache
      this.updateLocalCache(patterns);
      
      // Update sync timestamp
      this.lastSync = Date.now();
      
      console.log(`Synced ${patterns.length} community patterns`);
      
    } catch (error) {
      console.error('Community sync failed:', error);
    }
  }

  /**
   * Update local cache with new patterns
   */
  updateLocalCache(patterns) {
    patterns.forEach(pattern => {
      // Only update if newer or higher quality
      const existing = this.localCache.get(pattern.signature);
      if (!existing || pattern.quality > existing.quality || 
          pattern.timestamp > existing.timestamp) {
        this.localCache.set(pattern.signature, pattern);
      }
    });
    
    // Save updated cache
    this.saveLocalCache();
  }

  /**
   * Track contributions for statistics
   */
  trackContributions() {
    // Initialize daily tracking
    const today = new Date().toDateString();
    const stats = this.getContributionStats();
    
    if (!stats.dailyContributions[today]) {
      stats.dailyContributions[today] = 0;
    }
    
    this.saveContributionStats();
  }

  /**
   * Hash domain for privacy
   */
  hashDomain(domain) {
    // Use consistent hashing for domain privacy
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      const char = domain.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'domain_' + Math.abs(hash).toString(36);
  }

  /**
   * Load local cache from storage
   */
  async loadLocalCache() {
    try {
      const result = await chrome.storage.local.get(['communityPatternsCache']);
      if (result.communityPatternsCache) {
        this.localCache = new Map(Object.entries(result.communityPatternsCache));
        console.log(`Loaded ${this.localCache.size} cached patterns`);
      }
    } catch (error) {
      console.warn('Failed to load local cache:', error);
    }
  }

  /**
   * Save local cache to storage
   */
  async saveLocalCache() {
    try {
      const cacheObject = Object.fromEntries(this.localCache);
      await chrome.storage.local.set({ communityPatternsCache: cacheObject });
    } catch (error) {
      console.error('Failed to save local cache:', error);
    }
  }

  /**
   * Load contribution statistics
   */
  async loadContributionStats() {
    try {
      const result = await chrome.storage.local.get(['contributionStats']);
      if (result.contributionStats) {
        this.contributionScore = result.contributionStats.score || 0;
      }
    } catch (error) {
      console.warn('Failed to load contribution stats:', error);
    }
  }

  /**
   * Save contribution statistics
   */
  async saveContributionStats() {
    try {
      await chrome.storage.local.set({
        contributionStats: {
          score: this.contributionScore,
          dailyContributions: this.getContributionStats().dailyContributions
        }
      });
    } catch (error) {
      console.error('Failed to save contribution stats:', error);
    }
  }

  /**
   * Get contribution statistics
   */
  getContributionStats() {
    // This would be expanded with more detailed tracking
    return {
      score: this.contributionScore,
      dailyContributions: {},
      totalContributions: 0,
      averageQuality: 0
    };
  }

  /**
   * Update contribution score
   */
  updateContributionStats(newScore) {
    this.contributionScore = newScore;
    this.saveContributionStats();
  }

  /**
   * Get community learning statistics
   */
  getCommunityStats() {
    return {
      cachedPatterns: this.localCache.size,
      contributionScore: this.contributionScore,
      lastSync: new Date(this.lastSync).toISOString(),
      canContribute: this.canContribute(),
      anonymizationLevel: this.anonymizationLevel
    };
  }
}

export { CommunityLearningNetwork };
