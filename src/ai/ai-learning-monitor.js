// PrivacyShield - AI Learning Monitor & Transparency Dashboard
// Tracks and displays what the AI is learning in real-time

class AILearningMonitor {
  constructor() {
    this.learningLog = [];
    this.performanceMetrics = {
      totalAnalyses: 0,
      patternsLearned: 0,
      accuracyHistory: [],
      falsePositives: 0,
      userCorrections: 0
    };
    
    this.sessionStats = {
      startTime: Date.now(),
      pagesAnalyzed: 0,
      adsBlocked: 0,
      trackersBlocked: 0,
      newPatternsFound: 0
    };
    
    this.transparencyLevel = 'detailed'; // 'basic', 'detailed', 'full'
    this.maxLogEntries = 1000;
    
    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring system
   */
  initializeMonitoring() {
    // Load previous session data
    this.loadHistoricalData();
    
    // Setup real-time monitoring
    this.setupRealTimeTracking();
    
    // Start performance tracking
    this.startPerformanceTracking();
    
    console.log('AI Learning Monitor initialized');
  }

  /**
   * Log learning activity with full transparency
   */
  logLearningActivity(activity) {
    const logEntry = {
      timestamp: Date.now(),
      id: this.generateLogId(),
      type: activity.type, // 'pattern_found', 'rule_created', 'user_feedback', 'accuracy_update'
      domain: activity.domain,
      details: activity.details,
      confidence: activity.confidence || 0,
      impact: activity.impact || 'medium', // 'low', 'medium', 'high'
      userVisible: activity.userVisible !== false,
      category: activity.category || 'general'
    };

    this.learningLog.unshift(logEntry);
    
    // Keep log size manageable
    if (this.learningLog.length > this.maxLogEntries) {
      this.learningLog = this.learningLog.slice(0, this.maxLogEntries);
    }

    // Update metrics
    this.updateMetrics(logEntry);
    
    // Save for persistence
    this.saveLogEntry(logEntry);
    
    // Notify UI if user-visible
    if (logEntry.userVisible) {
      this.notifyUI(logEntry);
    }
    
    console.log(`AI Learning: ${logEntry.type} on ${logEntry.domain}`, logEntry.details);
  }

  /**
   * Track pattern discovery
   */
  trackPatternFound(domain, pattern, confidence) {
    this.logLearningActivity({
      type: 'pattern_found',
      domain: domain,
      details: {
        patternType: pattern.type,
        features: Object.keys(pattern.features || {}),
        indicators: pattern.indicators?.length || 0,
        signature: pattern.signature
      },
      confidence: confidence,
      impact: pattern.confidence > 0.8 ? 'high' : 'medium',
      category: pattern.type
    });
    
    this.sessionStats.newPatternsFound++;
  }

  /**
   * Track rule creation
   */
  trackRuleCreated(domain, rule, source) {
    this.logLearningActivity({
      type: 'rule_created',
      domain: domain,
      details: {
        ruleId: rule.id,
        ruleType: rule.metadata?.type || 'unknown',
        source: source, // 'adaptive', 'community', 'user'
        priority: rule.priority,
        conditions: Object.keys(rule.condition || {})
      },
      confidence: rule.metadata?.confidence || 0.5,
      impact: rule.priority >= 3 ? 'high' : 'medium',
      category: 'rule_management'
    });
  }

  /**
   * Track user feedback
   */
  trackUserFeedback(domain, feedback, ruleId) {
    this.logLearningActivity({
      type: 'user_feedback',
      domain: domain,
      details: {
        feedback: feedback, // 'correct', 'incorrect', 'false_positive'
        ruleId: ruleId,
        action: feedback === 'incorrect' ? 'rule_adjusted' : 'rule_confirmed'
      },
      confidence: 1.0, // User feedback is 100% confident
      impact: 'high',
      category: 'user_interaction'
    });
    
    this.sessionStats.userCorrections++;
  }

  /**
   * Track blocking action
   */
  trackBlockingAction(domain, url, ruleId, reason) {
    this.logLearningActivity({
      type: 'content_blocked',
      domain: domain,
      details: {
        blockedUrl: this.sanitizeUrl(url),
        ruleId: ruleId,
        reason: reason,
        ruleType: this.getRuleType(ruleId)
      },
      confidence: 0.8,
      impact: 'medium',
      category: 'blocking'
    });
    
    if (reason.includes('ad')) {
      this.sessionStats.adsBlocked++;
    } else if (reason.includes('tracker')) {
      this.sessionStats.trackersBlocked++;
    }
  }

  /**
   * Track accuracy changes
   */
  trackAccuracyUpdate(oldAccuracy, newAccuracy, reason) {
    this.logLearningActivity({
      type: 'accuracy_update',
      domain: 'global',
      details: {
        oldAccuracy: Math.round(oldAccuracy * 100),
        newAccuracy: Math.round(newAccuracy * 100),
        change: Math.round((newAccuracy - oldAccuracy) * 100),
        reason: reason // 'user_feedback', 'pattern_validation', 'rule_optimization'
      },
      confidence: newAccuracy,
      impact: Math.abs(newAccuracy - oldAccuracy) > 0.1 ? 'high' : 'medium',
      category: 'performance'
    });
    
    this.performanceMetrics.accuracyHistory.push({
      timestamp: Date.now(),
      accuracy: newAccuracy
    });
  }

  /**
   * Get current accuracy trend
   */
  getAccuracyTrend() {
    const history = this.performanceMetrics.accuracyHistory.slice(-10); // Last 10 updates
    
    if (history.length < 2) return 'insufficient_data';
    
    const recent = history.slice(-5);
    const older = history.slice(0, Math.min(5, history.length - 5));
    
    const recentAvg = recent.reduce((sum, h) => sum + h.accuracy, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.accuracy, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.05) return 'improving';
    if (recentAvg < olderAvg - 0.05) return 'declining';
    return 'stable';
  }

  /**
   * Get learning progress for UI
   */
  getLearningProgress() {
    const sessionDuration = Date.now() - this.sessionStats.startTime;
    const hoursActive = sessionDuration / (1000 * 60 * 60);
    
    return {
      sessionDuration: Math.round(sessionDuration / 1000 / 60), // minutes
      pagesAnalyzed: this.sessionStats.pagesAnalyzed,
      patternsFound: this.sessionStats.newPatternsFound,
      accuracyTrend: this.getAccuracyTrend(),
      currentAccuracy: this.getCurrentAccuracy(),
      learningRate: this.calculateLearningRate(hoursActive),
      userEngagement: this.calculateUserEngagement()
    };
  }

  /**
   * Get detailed transparency report
   */
  getTransparencyReport() {
    const recentActivity = this.learningLog.slice(0, 50);
    
    return {
      summary: {
        totalActivities: this.learningLog.length,
        sessionStats: this.sessionStats,
        performanceMetrics: this.performanceMetrics,
        learningProgress: this.getLearningProgress()
      },
      recentActivity: this.filterByTransparencyLevel(recentActivity),
      patternBreakdown: this.getPatternBreakdown(),
      accuracyAnalysis: this.getAccuracyAnalysis(),
      privacyImpact: this.getPrivacyImpact()
    };
  }

  /**
   * Get pattern type breakdown
   */
  getPatternBreakdown() {
    const breakdown = {};
    
    this.learningLog.forEach(entry => {
      if (entry.type === 'pattern_found') {
        const patternType = entry.details.patternType || 'unknown';
        breakdown[patternType] = (breakdown[patternType] || 0) + 1;
      }
    });
    
    return breakdown;
  }

  /**
   * Get accuracy analysis
   */
  getAccuracyAnalysis() {
    const history = this.performanceMetrics.accuracyHistory;
    
    if (history.length === 0) {
      return { current: 0, trend: 'no_data', improvement: 0 };
    }
    
    const current = history[history.length - 1].accuracy;
    const initial = history[0].accuracy;
    const improvement = current - initial;
    
    return {
      current: Math.round(current * 100),
      trend: this.getAccuracyTrend(),
      improvement: Math.round(improvement * 100),
      dataPoints: history.length
    };
  }

  /**
   * Get privacy impact assessment
   */
  getPrivacyImpact() {
    const privacyLogs = this.learningLog.filter(entry => 
      entry.category === 'privacy' || entry.details.privacyImpact
    );
    
    return {
      privacyPatternsFound: privacyLogs.length,
      fingerprintingBlocked: privacyLogs.filter(l => 
        l.details.patternType === 'fingerprinting'
      ).length,
      dataCollectionPrevented: privacyLogs.filter(l => 
        l.details.patternType === 'data_collection'
      ).length,
      userPrivacyScore: this.calculatePrivacyScore()
    };
  }

  /**
   * Calculate current accuracy
   */
  getCurrentAccuracy() {
    if (this.performanceMetrics.accuracyHistory.length === 0) return 0.5;
    
    const recent = this.performanceMetrics.accuracyHistory.slice(-5);
    return recent.reduce((sum, h) => sum + h.accuracy, 0) / recent.length;
  }

  /**
   * Calculate learning rate
   */
  calculateLearningRate(hoursActive) {
    if (hoursActive === 0) return 0;
    
    return Math.round((this.sessionStats.newPatternsFound / hoursActive) * 10) / 10;
  }

  /**
   * Calculate user engagement
   */
  calculateUserEngagement() {
    const totalBlocks = this.sessionStats.adsBlocked + this.sessionStats.trackersBlocked;
    
    if (totalBlocks === 0) return 0;
    
    return Math.round((this.sessionStats.userCorrections / totalBlocks) * 100);
  }

  /**
   * Calculate privacy score
   */
  calculatePrivacyScore() {
    const privacyLogs = this.learningLog.filter(entry => 
      entry.category === 'privacy' && entry.type === 'content_blocked'
    );
    
    const baseScore = 50;
    const privacyBonus = Math.min(30, privacyLogs.length);
    const accuracyBonus = this.getCurrentAccuracy() * 20;
    
    return Math.round(baseScore + privacyBonus + accuracyBonus);
  }

  /**
   * Filter activities by transparency level
   */
  filterByTransparencyLevel(activities) {
    switch (this.transparencyLevel) {
      case 'basic':
        return activities.filter(a => 
          a.userVisible && a.impact === 'high'
        );
      case 'detailed':
        return activities.filter(a => a.userVisible);
      case 'full':
        return activities;
      default:
        return activities.filter(a => a.userVisible && a.impact !== 'low');
    }
  }

  /**
   * Get rule type from ID
   */
  getRuleType(ruleId) {
    if (ruleId.includes('adaptive_')) return 'adaptive';
    if (ruleId.includes('community_')) return 'community';
    if (ruleId.includes('static_')) return 'static';
    return 'unknown';
  }

  /**
   * Sanitize URL for privacy
   */
  sanitizeUrl(url) {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return 'invalid_url';
    }
  }

  /**
   * Generate unique log ID
   */
  generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update performance metrics
   */
  updateMetrics(logEntry) {
    this.performanceMetrics.totalAnalyses++;
    
    switch (logEntry.type) {
      case 'pattern_found':
        this.performanceMetrics.patternsLearned++;
        break;
      case 'user_feedback':
        if (logEntry.details.feedback === 'incorrect') {
          this.performanceMetrics.falsePositives++;
        }
        break;
    }
  }

  /**
   * Notify UI of new activity
   */
  notifyUI(logEntry) {
    // Send message to popup and content scripts
    chrome.runtime.sendMessage({
      type: 'AI_LEARNING_ACTIVITY',
      data: logEntry
    }).catch(() => {
      // Popup might not be open
    });
  }

  /**
   * Setup real-time tracking
   */
  setupRealTimeTracking() {
    // Track page navigation
    chrome.webNavigation.onCompleted.addListener((details) => {
      if (details.frameId === 0) {
        this.sessionStats.pagesAnalyzed++;
        
        this.logLearningActivity({
          type: 'page_analyzed',
          domain: new URL(details.url).hostname,
          details: {
            url: this.sanitizeUrl(details.url),
            loadTime: details.timeStamp || 0
          },
          userVisible: false,
          category: 'navigation'
        });
      }
    });
  }

  /**
   * Start performance tracking
   */
  startPerformanceTracking() {
    // Track accuracy every 5 minutes
    setInterval(() => {
      const currentAccuracy = this.getCurrentAccuracy();
      this.trackAccuracyUpdate(
        this.performanceMetrics.accuracyHistory[this.performanceMetrics.accuracyHistory.length - 2]?.accuracy || 0.5,
        currentAccuracy,
        'periodic_check'
      );
    }, 5 * 60 * 1000);
  }

  /**
   * Save log entry to storage
   */
  async saveLogEntry(logEntry) {
    try {
      const result = await chrome.storage.local.get(['aiLearningLog']);
      const log = result.aiLearningLog || [];
      
      log.unshift(logEntry);
      
      // Keep only recent entries
      if (log.length > 500) {
        log.splice(500);
      }
      
      await chrome.storage.local.set({ aiLearningLog: log });
    } catch (error) {
      console.error('Failed to save log entry:', error);
    }
  }

  /**
   * Load historical data
   */
  async loadHistoricalData() {
    try {
      const result = await chrome.storage.local.get(['aiLearningLog', 'aiPerformanceMetrics']);
      
      if (result.aiLearningLog) {
        this.learningLog = result.aiLearningLog.slice(0, 100); // Load recent entries
      }
      
      if (result.aiPerformanceMetrics) {
        this.performanceMetrics = { ...this.performanceMetrics, ...result.aiPerformanceMetrics };
      }
    } catch (error) {
      console.error('Failed to load historical data:', error);
    }
  }

  /**
   * Export learning data for analysis
   */
  exportLearningData() {
    return {
      learningLog: this.learningLog,
      performanceMetrics: this.performanceMetrics,
      sessionStats: this.sessionStats,
      transparencyReport: this.getTransparencyReport(),
      exportedAt: Date.now()
    };
  }

  /**
   * Clear learning data (privacy)
   */
  async clearLearningData() {
    this.learningLog = [];
    this.performanceMetrics = {
      totalAnalyses: 0,
      patternsLearned: 0,
      accuracyHistory: [],
      falsePositives: 0,
      userCorrections: 0
    };
    
    await chrome.storage.local.remove(['aiLearningLog', 'aiPerformanceMetrics']);
    
    console.log('AI Learning data cleared');
  }

  /**
   * Set transparency level
   */
  setTransparencyLevel(level) {
    this.transparencyLevel = level;
    chrome.storage.local.set({ transparencyLevel: level });
  }
}

export { AILearningMonitor };
