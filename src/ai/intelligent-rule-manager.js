// PrivacyShield - Intelligent Rule Manager
// Integrates adaptive learning with static rules for smart blocking

class IntelligentRuleManager {
  constructor() {
    this.adaptiveEngine = new AdaptiveLearningEngine();
    this.staticRules = new Map(); // ruleId -> rule
    this.adaptiveRules = new Map(); // ruleId -> rule
    this.rulePerformance = new Map(); // ruleId -> performance data
    this.userPreferences = new Map(); // user -> preferences
    
    // Rule categories
    this.categories = {
      STATIC: 'static',
      ADAPTIVE: 'adaptive', 
      COMMUNITY: 'community',
      USER_GENERATED: 'user_generated'
    };
    
    // Performance thresholds
    this.thresholds = {
      minAccuracy: 0.8,
      maxFalsePositives: 0.05,
      minUsageCount: 10
    };
    
    this.initializeRuleManager();
  }

  /**
   * Initialize rule manager
   */
  async initializeRuleManager() {
    await this.loadStaticRules();
    await this.loadAdaptiveRules();
    await this.loadUserPreferences();
    
    // Start continuous learning
    this.startContinuousLearning();
    
    console.log('Intelligent Rule Manager initialized');
  }

  /**
   * Load static rules from JSON files
   */
  async loadStaticRules() {
    try {
      const [adsRules, trackerRules, malwareRules] = await Promise.all([
        fetch(chrome.runtime.getURL('rules/ads.json')).then(r => r.json()),
        fetch(chrome.runtime.getURL('rules/trackers.json')).then(r => r.json()),
        fetch(chrome.runtime.getURL('rules/malware.json')).then(r => r.json())
      ]);
      
      this.storeRules(adsRules, this.categories.STATIC);
      this.storeRules(trackerRules, this.categories.STATIC);
      this.storeRules(malwareRules, this.categories.STATIC);
      
      console.log(`Loaded ${this.staticRules.size} static rules`);
    } catch (error) {
      console.error('Failed to load static rules:', error);
    }
  }

  /**
   * Store rules in appropriate map
   */
  storeRules(rules, category) {
    rules.forEach(rule => {
      rule.category = category;
      rule.addedAt = Date.now();
      rule.performance = {
        matches: 0,
        blocks: 0,
        falsePositives: 0,
        accuracy: 1.0
      };
      
      if (category === this.categories.STATIC) {
        this.staticRules.set(rule.id, rule);
      } else if (category === this.categories.ADAPTIVE) {
        this.adaptiveRules.set(rule.id, rule);
      }
      
      this.rulePerformance.set(rule.id, rule.performance);
    });
  }

  /**
   * Start continuous learning process
   */
  startContinuousLearning() {
    // Learn from page navigation
    chrome.webNavigation.onCompleted.addListener(async (details) => {
      if (details.frameId === 0) { // Main frame only
        await this.learnFromPage(details.tabId, details.url);
      }
    });
    
    // Learn from user feedback
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'USER_FEEDBACK') {
        this.processUserFeedback(message.data);
      }
    });
    
    // Periodic cleanup and optimization
    setInterval(() => {
      this.optimizeRules();
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  /**
   * Learn from page content and behavior
   */
  async learnFromPage(tabId, url) {
    try {
      const domain = new URL(url).hostname;
      
      // Analyze page patterns
      const patterns = await this.adaptiveEngine.analyzePagePatterns(tabId, domain);
      
      // Generate adaptive rules
      const adaptiveRules = this.adaptiveEngine.getAdaptiveRules(domain);
      
      // Add new adaptive rules
      adaptiveRules.forEach(rule => {
        if (!this.adaptiveRules.has(rule.id)) {
          this.adaptiveRules.set(rule.id, rule);
          this.rulePerformance.set(rule.id, rule.performance);
          
          console.log(`Generated adaptive rule: ${rule.id} for ${domain}`);
        }
      });
      
    } catch (error) {
      console.warn('Failed to learn from page:', error);
    }
  }

  /**
   * Process user feedback for rule improvement
   */
  processUserFeedback(feedback) {
    const { ruleId, action, isCorrect, domain } = feedback;
    
    // Update rule performance
    const performance = this.rulePerformance.get(ruleId);
    if (performance) {
      performance.matches++;
      
      if (action === 'block' && !isCorrect) {
        performance.falsePositives++;
      }
      
      // Calculate accuracy
      performance.accuracy = 1 - (performance.falsePositives / performance.matches);
      
      // Adjust rule confidence
      this.adjustRuleConfidence(ruleId, isCorrect);
    }
    
    // Learn from feedback
    this.adaptiveEngine.learnFromFeedback(domain, action, isCorrect ? 'correct' : 'incorrect');
  }

  /**
   * Adjust rule confidence based on feedback
   */
  adjustRuleConfidence(ruleId, isCorrect) {
    const rule = this.adaptiveRules.get(ruleId);
    if (!rule) return;
    
    const adjustment = isCorrect ? 0.1 : -0.2;
    rule.metadata.confidence = Math.max(0.1, Math.min(1.0, 
      (rule.metadata.confidence || 0.5) + adjustment));
  }

  /**
   * Get optimal rules for URL (intelligent rule selection)
   */
  getOptimalRules(url) {
    const domain = new URL(url).hostname;
    const allRules = [];
    
    // Get relevant static rules
    this.staticRules.forEach(rule => {
      if (this.ruleMatchesDomain(rule, domain)) {
        allRules.push({ ...rule, source: 'static' });
      }
    });
    
    // Get relevant adaptive rules
    this.adaptiveRules.forEach(rule => {
      if (this.ruleMatchesDomain(rule, domain)) {
        allRules.push({ ...rule, source: 'adaptive' });
      }
    });
    
    // Sort by intelligence score
    return this.rankRulesByIntelligence(allRules, domain);
  }

  /**
   * Check if rule matches domain
   */
  ruleMatchesDomain(rule, domain) {
    if (!rule.condition) return true;
    
    // Check domain condition
    if (rule.condition.domains) {
      return rule.condition.domains.includes(domain);
    }
    
    // Check URL filter
    if (rule.condition.urlFilter) {
      return this.urlMatchesFilter(url, rule.condition.urlFilter);
    }
    
    return true;
  }

  /**
   * Check if URL matches filter pattern
   */
  urlMatchesFilter(url, filter) {
    // Simple pattern matching - could be enhanced with proper adblock syntax
    if (filter.startsWith('||')) {
      const domain = filter.substring(2);
      return url.includes(domain);
    }
    
    return url.includes(filter);
  }

  /**
   * Rank rules by intelligence score
   */
  rankRulesByIntelligence(rules, domain) {
    return rules.sort((a, b) => {
      const scoreA = this.calculateIntelligenceScore(a, domain);
      const scoreB = this.calculateIntelligenceScore(b, domain);
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate intelligence score for rule
   */
  calculateIntelligenceScore(rule, domain) {
    let score = 0;
    
    // Base priority
    score += rule.priority || 1;
    
    // Performance bonus
    const performance = this.rulePerformance.get(rule.id);
    if (performance) {
      score += performance.accuracy * 2;
      score += Math.min(1, performance.matches / 100); // Usage bonus
    }
    
    // Source preference
    if (rule.source === 'adaptive') {
      score += 1.5; // Prefer learned rules
    } else if (rule.source === 'static') {
      score += 1.0; // Trusted static rules
    }
    
    // Confidence bonus for adaptive rules
    if (rule.metadata && rule.metadata.confidence) {
      score += rule.metadata.confidence * 2;
    }
    
    // Domain-specific learning bonus
    if (this.hasDomainLearning(domain, rule)) {
      score += 1.0;
    }
    
    return score;
  }

  /**
   * Check if we have domain-specific learning for rule
   */
  hasDomainLearning(domain, rule) {
    // Simplified check - in production would be more sophisticated
    return rule.source === 'adaptive' && 
           rule.metadata && 
           rule.metadata.domain === domain;
  }

  /**
   * Optimize rules based on performance
   */
  optimizeRules() {
    console.log('Optimizing rules...');
    
    // Remove poorly performing adaptive rules
    for (const [ruleId, performance] of this.rulePerformance) {
      if (performance.matches > this.thresholds.minUsageCount) {
        if (performance.accuracy < this.thresholds.minAccuracy ||
            performance.falsePositives / performance.matches > this.thresholds.maxFalsePositives) {
          
          // Remove adaptive rule if it performs poorly
          if (this.adaptiveRules.has(ruleId)) {
            this.adaptiveRules.delete(ruleId);
            console.log(`Removed underperforming rule: ${ruleId}`);
          }
        }
      }
    }
    
    // Promote high-performing adaptive rules
    this.promoteBestAdaptiveRules();
  }

  /**
   * Promote best adaptive rules to higher priority
   */
  promoteBestAdaptiveRules() {
    const bestRules = [];
    
    this.adaptiveRules.forEach(rule => {
      const performance = this.rulePerformance.get(rule.id);
      if (performance && 
          performance.matches > 50 && 
          performance.accuracy > 0.95) {
        bestRules.push(rule);
      }
    });
    
    // Increase priority for best rules
    bestRules.forEach(rule => {
      rule.priority = Math.max(1, (rule.priority || 1) + 1);
    });
    
    console.log(`Promoted ${bestRules.length} high-performing adaptive rules`);
  }

  /**
   * Clean up old data
   */
  cleanupOldData() {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    // Clean old adaptive rules
    for (const [ruleId, rule] of this.adaptiveRules) {
      if (rule.addedAt < cutoff) {
        const performance = this.rulePerformance.get(ruleId);
        
        // Keep if performing well, otherwise remove
        if (!performance || performance.accuracy < 0.8) {
          this.adaptiveRules.delete(ruleId);
          this.rulePerformance.delete(ruleId);
        }
      }
    }
    
    console.log('Completed rule cleanup');
  }

  /**
   * Export learned rules for sharing
   */
  exportLearnedRules() {
    const exportData = {
      adaptiveRules: [],
      communityPatterns: this.adaptiveEngine.exportPatterns(),
      statistics: this.getStatistics(),
      exportedAt: Date.now()
    };
    
    // Export high-performing adaptive rules
    this.adaptiveRules.forEach(rule => {
      const performance = this.rulePerformance.get(rule.id);
      if (performance && performance.accuracy > 0.9 && performance.matches > 20) {
        exportData.adaptiveRules.push({
          ...rule,
          performance: {
            accuracy: performance.accuracy,
            matches: performance.matches
          }
        });
      }
    });
    
    return exportData;
  }

  /**
   * Import community rules
   */
  async importCommunityRules(communityData) {
    if (communityData.adaptiveRules) {
      this.storeRules(communityData.adaptiveRules, this.categories.COMMUNITY);
    }
    
    if (communityData.communityPatterns) {
      this.adaptiveEngine.importCommunityPatterns(communityData.communityPatterns);
    }
    
    console.log(`Imported ${communityData.adaptiveRules?.length || 0} community rules`);
  }

  /**
   * Get comprehensive statistics
   */
  getStatistics() {
    const stats = {
      totalRules: this.staticRules.size + this.adaptiveRules.size,
      staticRules: this.staticRules.size,
      adaptiveRules: this.adaptiveRules.size,
      averageAccuracy: 0,
      totalMatches: 0,
      learningStats: this.adaptiveEngine.getStats()
    };
    
    // Calculate average accuracy
    let totalAccuracy = 0;
    let ruleCount = 0;
    
    this.rulePerformance.forEach(performance => {
      totalAccuracy += performance.accuracy;
      stats.totalMatches += performance.matches;
      ruleCount++;
    });
    
    stats.averageAccuracy = ruleCount > 0 ? totalAccuracy / ruleCount : 0;
    
    return stats;
  }

  /**
   * Load adaptive rules from storage
   */
  async loadAdaptiveRules() {
    try {
      const result = await chrome.storage.local.get(['adaptiveRules']);
      if (result.adaptiveRules) {
        this.storeRules(result.adaptiveRules, this.categories.ADAPTIVE);
        console.log(`Loaded ${result.adaptiveRules.length} adaptive rules from storage`);
      }
    } catch (error) {
      console.warn('Failed to load adaptive rules:', error);
    }
  }

  /**
   * Load user preferences
   */
  async loadUserPreferences() {
    try {
      const result = await chrome.storage.local.get(['userPreferences']);
      if (result.userPreferences) {
        this.userPreferences = new Map(Object.entries(result.userPreferences));
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  /**
   * Save adaptive rules to storage
   */
  async saveAdaptiveRules() {
    try {
      const rules = Array.from(this.adaptiveRules.values());
      await chrome.storage.local.set({ adaptiveRules: rules });
    } catch (error) {
      console.error('Failed to save adaptive rules:', error);
    }
  }

  /**
   * Get user-friendly rule summary
   */
  getRuleSummary() {
    return {
      intelligentBlocking: {
        enabled: true,
        adaptiveRulesCount: this.adaptiveRules.size,
        staticRulesCount: this.staticRules.size,
        averageAccuracy: this.getStatistics().averageAccuracy,
        lastOptimization: new Date().toISOString()
      },
      learningCapabilities: {
        patternRecognition: true,
        userFeedbackLearning: true,
        communityIntelligence: true,
        automaticRuleGeneration: true
      },
      performance: {
        totalMatches: this.getStatistics().totalMatches,
        accuracyRate: this.getStatistics().averageAccuracy,
        learningRate: this.adaptiveEngine.getStats().learningRate
      }
    };
  }
}

export { IntelligentRuleManager };
