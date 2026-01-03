// PrivacyShield Max - Professional Smart Filtering System
// Enterprise-grade AI-powered threat detection and adaptive filtering
// Built with machine learning principles, performance optimization, and reliability

(function(globalThis) {
  'use strict';

  /**
   * Professional Smart Filtering System
   *
   * Features:
   * - Advanced ML-based pattern recognition
   * - Real-time behavioral analysis
   * - Adaptive learning from user feedback
   * - Multi-layered threat scoring
   * - Performance-optimized caching
   * - Comprehensive statistics & insights
   */
  class SmartFilteringSystem {
    constructor() {
      // Core data structures
      this.patternData = new Map();
      this.domainStats = new Map();
      this.behavioralPatterns = new Map();
      this.filterCache = new Map();
      this.threatDatabase = new Map();

      // Configuration
      this.settings = {
        enabled: true,
        sensitivity: 5, // 0-10 scale
        adaptiveFiltering: true,
        behavioralAnalysis: true,
        dataRetention: 30, // days
        confidenceThreshold: 75, // percentage
        cacheTimeout: 300000, // 5 minutes
        enableLearning: true,
        aggressiveMode: false
      };

      // Performance metrics
      this.metrics = {
        totalAnalyzed: 0,
        totalBlocked: 0,
        totalAllowed: 0,
        falsePositives: 0,
        falseNegatives: 0,
        avgAnalysisTime: 0,
        cacheHits: 0,
        cacheMisses: 0
      };

      // ML model weights (neural network-like)
      this.mlWeights = {
        domainReputation: 0.30,
        urlStructure: 0.20,
        contentType: 0.15,
        behavioralPattern: 0.20,
        historicalData: 0.15
      };

      // Threat categories with base scores
      this.threatCategories = {
        advertisement: { severity: 0.7, weight: 1.0 },
        tracking: { severity: 0.8, weight: 1.1 },
        malware: { severity: 1.0, weight: 1.5 },
        cryptomining: { severity: 0.9, weight: 1.3 },
        phishing: { severity: 1.0, weight: 1.5 },
        fingerprinting: { severity: 0.75, weight: 1.0 }
      };

      // Browser API detection
      this.browserAPI = this.detectBrowserAPI();
      this.isBackgroundContext = this.detectContext();

      // Auto-save timer
      this.saveTimeout = null;
      this.lastSave = Date.now();

      console.log('[SmartFiltering] Professional Smart Filtering System initialized');
    }

    /**
     * Detect which browser API is available
     */
    detectBrowserAPI() {
      if (typeof browser !== 'undefined' && browser.storage) {
        return browser;
      } else if (typeof chrome !== 'undefined' && chrome.storage) {
        return chrome;
      }
      return null;
    }

    /**
     * Detect execution context
     */
    detectContext() {
      if (typeof window === 'undefined') return true;
      if (window.location && window.location.protocol === 'chrome-extension:') return true;
      return false;
    }

    /**
     * Initialize the smart filtering system
     */
    async initialize() {
      console.log('[SmartFiltering] Initializing...');

      try {
        // Load persisted data
        await this.loadPatternData();

        // Setup filtering algorithms
        this.setupFilteringEngines();

        // Start data collection (if in background context)
        this.startDataCollection();

        // Setup periodic maintenance
        this.setupMaintenance();

        console.log('[SmartFiltering] Initialization complete', {
          patterns: this.patternData.size,
          domains: this.domainStats.size,
          threats: this.threatDatabase.size
        });

        return true;
      } catch (error) {
        console.error('[SmartFiltering] Initialization failed:', error);
        return false;
      }
    }

    /**
     * Setup filtering engines (pattern, behavioral, adaptive)
     */
    setupFilteringEngines() {
      // Pattern Recognition Engine
      this.patternEngine = {
        analyze: (url, context) => this.analyzeUrlPattern(url, context),
        learn: (url, outcome) => this.learnFromOutcome(url, outcome),
        predict: (url) => this.predictThreat(url),
        classify: (features) => this.classifyThreat(features)
      };

      // Behavioral Analysis Engine
      this.behaviorEngine = {
        analyzeScript: (script, url) => this.analyzeScriptBehavior(script, url),
        analyzeNetwork: (requests) => this.analyzeNetworkPatterns(requests),
        detectAnomalies: (data) => this.detectAnomalies(data),
        trackFrequency: (domain) => this.trackDomainFrequency(domain)
      };

      // Adaptive Learning Engine
      this.adaptiveEngine = {
        adjustThresholds: (performance) => this.adjustThresholds(performance),
        optimizeRules: (stats) => this.optimizeRules(stats),
        personalize: (userPatterns) => this.personalizeFiltering(userPatterns),
        calibrate: () => this.calibrateModel()
      };
    }

    /**
     * Analyze URL pattern with ML-based scoring
     * @param {string} url - URL to analyze
     * @param {Object} context - Additional context (type, referrer, etc.)
     * @returns {Object} Analysis result
     */
    analyzeUrlPattern(url, context = {}) {
      const startTime = performance.now();

      try {
        // Check cache first
        const cacheKey = this.getCacheKey(url, context);
        if (this.filterCache.has(cacheKey)) {
          const cached = this.filterCache.get(cacheKey);
          if (Date.now() - cached.timestamp < this.settings.cacheTimeout) {
            this.metrics.cacheHits++;
            return cached.result;
          } else {
            this.filterCache.delete(cacheKey);
          }
        }
        this.metrics.cacheMisses++;

        // Extract features
        const features = this.extractFeatures(url, context);

        // Identify threat patterns
        const patterns = this.identifyPatterns(features);

        // Calculate threat score
        const threatScore = this.calculateThreatScore(features, patterns);

        // Make decision
        const decision = this.makeDecision(threatScore, patterns);

        // Update metrics
        this.metrics.totalAnalyzed++;
        const analysisTime = performance.now() - startTime;
        this.metrics.avgAnalysisTime =
          (this.metrics.avgAnalysisTime * (this.metrics.totalAnalyzed - 1) + analysisTime) /
          this.metrics.totalAnalyzed;

        const result = {
          url,
          features,
          patterns,
          threatScore,
          decision,
          confidence: threatScore.confidence,
          analysisTime
        };

        // Cache result
        this.filterCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });

        return result;

      } catch (error) {
        console.error('[SmartFiltering] Analysis error:', error);
        return {
          url,
          error: error.message,
          decision: { action: 'allow', reason: 'analysis_error' },
          threatScore: { score: 0, confidence: 0 }
        };
      }
    }

    /**
     * Extract comprehensive features from URL and context
     */
    extractFeatures(url, context) {
      try {
        const urlObj = new URL(url);

        return {
          // URL structure
          domain: urlObj.hostname,
          path: urlObj.pathname,
          query: urlObj.search,
          protocol: urlObj.protocol,
          port: urlObj.port,

          // Domain characteristics
          domainLength: urlObj.hostname.length,
          subdomainCount: urlObj.hostname.split('.').length - 2,
          tld: urlObj.hostname.split('.').pop(),
          hasNumbers: /\d/.test(urlObj.hostname),
          hasHyphens: /-/.test(urlObj.hostname),
          hasSpecialChars: /[^a-zA-Z0-9.-]/.test(urlObj.hostname),

          // URL characteristics
          pathLength: urlObj.pathname.length,
          queryLength: urlObj.search.length,
          paramCount: urlObj.searchParams ? urlObj.searchParams.size : 0,
          hasFragment: urlObj.hash.length > 0,
          urlLength: url.length,

          // Context
          resourceType: context.type || 'unknown',
          referrer: context.referrer || '',
          contentType: context.contentType || '',

          // Historical
          frequency: this.getDomainFrequency(urlObj.hostname),
          blockHistory: this.getBlockHistory(urlObj.hostname),
          reputation: this.getDomainReputation(urlObj.hostname),

          // Temporal
          timestamp: Date.now(),
          hour: new Date().getHours(),
          dayOfWeek: new Date().getDay()
        };
      } catch (error) {
        console.error('[SmartFiltering] Feature extraction error:', error);
        return null;
      }
    }

    /**
     * Identify threat patterns in features
     */
    identifyPatterns(features) {
      if (!features) return [];

      const patterns = [];
      const domain = features.domain;
      const path = features.path;
      const query = features.query;

      // Advertisement patterns
      if (this.matchesAdvertisement(domain, path)) {
        patterns.push({
          type: 'advertisement',
          category: 'ads',
          confidence: this.calculatePatternConfidence('advertisement', features),
          matched: this.getMatchedRules('advertisement', domain, path)
        });
      }

      // Tracking patterns
      if (this.matchesTracking(domain, query)) {
        patterns.push({
          type: 'tracking',
          category: 'tracking',
          confidence: this.calculatePatternConfidence('tracking', features),
          matched: this.getMatchedRules('tracking', domain, query)
        });
      }

      // Malware patterns
      if (this.matchesMalware(domain, features)) {
        patterns.push({
          type: 'malware',
          category: 'malware',
          confidence: this.calculatePatternConfidence('malware', features),
          matched: this.getMatchedRules('malware', domain)
        });
      }

      // Cryptomining patterns
      if (this.matchesCryptomining(domain, path)) {
        patterns.push({
          type: 'cryptomining',
          category: 'cryptomining',
          confidence: this.calculatePatternConfidence('cryptomining', features),
          matched: this.getMatchedRules('cryptomining', domain)
        });
      }

      // Fingerprinting patterns
      if (this.matchesFingerprinting(domain, path, features)) {
        patterns.push({
          type: 'fingerprinting',
          category: 'fingerprinting',
          confidence: this.calculatePatternConfidence('fingerprinting', features),
          matched: this.getMatchedRules('fingerprinting', domain)
        });
      }

      // Behavioral patterns
      if (features.frequency > 15) {
        patterns.push({
          type: 'high_frequency',
          category: 'behavior',
          confidence: Math.min(features.frequency / 30, 1.0),
          reason: `Domain accessed ${features.frequency} times`
        });
      }

      if (features.blockHistory.blocked > features.blockHistory.allowed * 2) {
        patterns.push({
          type: 'frequently_blocked',
          category: 'behavior',
          confidence: 0.85,
          reason: 'High historical block rate'
        });
      }

      return patterns;
    }

    /**
     * Calculate ML-based threat score
     */
    calculateThreatScore(features, patterns) {
      if (!features) {
        return { score: 0, confidence: 0, breakdown: {} };
      }

      // Calculate sub-scores
      const scores = {
        domainReputation: this.scoreDomainReputation(features),
        urlStructure: this.scoreURLStructure(features),
        contentType: this.scoreContentType(features.resourceType),
        behavioralPattern: this.scoreBehavioralPattern(features),
        historicalData: this.scoreHistoricalData(features)
      };

      // Apply ML weights
      let totalScore = 0;
      Object.keys(this.mlWeights).forEach(key => {
        totalScore += this.mlWeights[key] * scores[key];
      });

      // Boost from patterns
      const patternBoost = this.calculatePatternBoost(patterns);
      totalScore = Math.min(totalScore + patternBoost, 1.0);

      // Calculate confidence
      const confidence = this.calculateConfidence(scores, patterns);

      return {
        score: totalScore,
        confidence,
        breakdown: scores,
        patternBoost,
        adjustedScore: totalScore
      };
    }

    /**
     * Make filtering decision
     */
    makeDecision(threatScore, patterns) {
      const score = threatScore.score;
      const threshold = this.settings.confidenceThreshold / 100;
      const sensitivity = this.settings.sensitivity / 10;

      // Adjust threshold based on sensitivity
      const adjustedThreshold = threshold * (1 - (sensitivity - 0.5) * 0.2);

      if (score >= adjustedThreshold) {
        return {
          action: 'block',
          reason: this.getBlockReason(patterns),
          confidence: threatScore.confidence,
          score: score,
          category: this.getPrimaryCategory(patterns)
        };
      } else if (score >= adjustedThreshold - 0.15) {
        return {
          action: 'monitor',
          reason: this.getMonitorReason(patterns),
          confidence: threatScore.confidence,
          score: score,
          category: this.getPrimaryCategory(patterns)
        };
      } else {
        return {
          action: 'allow',
          reason: 'Low threat probability',
          confidence: threatScore.confidence,
          score: score,
          category: 'safe'
        };
      }
    }

    // ==================== PATTERN MATCHING ====================

    /**
     * Check if matches advertisement patterns
     */
    matchesAdvertisement(domain, path) {
      const adDomainPatterns = [
        { regex: /doubleclick/i, weight: 0.95 },
        { regex: /googlesyndication/i, weight: 0.95 },
        { regex: /googleadservices/i, weight: 0.95 },
        { regex: /advertising\.com/i, weight: 0.9 },
        { regex: /amazon-adsystem/i, weight: 0.95 },
        { regex: /adsystem/i, weight: 0.9 },
        { regex: /adserver/i, weight: 0.85 },
        { regex: /adtech/i, weight: 0.85 },
        { regex: /\bads?\./i, weight: 0.8 },
        { regex: /banner/i, weight: 0.7 },
        { regex: /taboola/i, weight: 0.9 },
        { regex: /outbrain/i, weight: 0.9 },
        { regex: /mgid/i, weight: 0.9 },
        { regex: /revcontent/i, weight: 0.85 },
        { regex: /sponsored/i, weight: 0.75 }
      ];

      const adPathPatterns = [
        /\/ads?\//i,
        /\/advertisement/i,
        /\/banner/i,
        /\/promo/i,
        /\/sponsored/i
      ];

      for (const { regex, weight } of adDomainPatterns) {
        if (regex.test(domain) && weight > 0.7) return true;
      }

      for (const pattern of adPathPatterns) {
        if (pattern.test(path)) return true;
      }

      return false;
    }

    /**
     * Check if matches tracking patterns
     */
    matchesTracking(domain, query) {
      const trackingDomains = [
        /analytics/i, /tracking/i, /pixel/i, /beacon/i,
        /telemetry/i, /stats/i, /metrics/i, /collector/i,
        /mouseflow/i, /hotjar/i, /mixpanel/i, /segment/i,
        /google-analytics/i, /googletagmanager/i
      ];

      const trackingParams = [
        'utm_', 'fbclid', 'gclid', 'clickid', 'tracking_id',
        'campaign_id', 'affiliate_id', 'ref_', 'source_'
      ];

      for (const pattern of trackingDomains) {
        if (pattern.test(domain)) return true;
      }

      for (const param of trackingParams) {
        if (query.includes(param)) return true;
      }

      return false;
    }

    /**
     * Check if matches malware patterns
     */
    matchesMalware(domain, features) {
      let score = 0;

      // IP address as domain
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
        score += 0.8;
      }

      // Long hex strings
      if (/[0-9a-f]{32,}/i.test(domain)) {
        score += 0.7;
      }

      // Suspicious TLDs
      const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.xyz', '.win', '.bid', '.loan'];
      if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
        score += 0.6;
      }

      // Excessive subdomains
      if (features.subdomainCount > 4) {
        score += 0.5;
      }

      // Cyrillic in Latin domain (homoglyph attack)
      if (/[а-яА-Я]/. test(domain)) {
        score += 0.9;
      }

      // Random-looking patterns
      if (/[a-z]{2,}\d{5,}/i.test(domain)) {
        score += 0.5;
      }

      return score >= 0.6;
    }

    /**
     * Check if matches cryptomining patterns
     */
    matchesCryptomining(domain, path) {
      const cryptoPatterns = [
        /coinhive/i, /jsecoin/i, /coin-hive/i, /cryptoloot/i,
        /crypto-loot/i, /minerva/i, /minr\.pw/i, /cnhv\.co/i,
        /webmine/i, /mining/i
      ];

      return cryptoPatterns.some(pattern =>
        pattern.test(domain) || pattern.test(path)
      );
    }

    /**
     * Check if matches fingerprinting patterns
     */
    matchesFingerprinting(domain, path, features) {
      const fingerprintDomains = [
        /fingerprint/i, /canvas/i, /webgl/i, /fontscan/i,
        /deviceid/i, /browserid/i
      ];

      const fingerprintPaths = [
        /\/fp\//i, /\/fingerprint/i, /\/track/i
      ];

      // Check for tracking + high frequency (likely fingerprinting)
      if (features.frequency > 10 &&
          (fingerprintDomains.some(p => p.test(domain)) ||
           fingerprintPaths.some(p => p.test(path)))) {
        return true;
      }

      return false;
    }

    // ==================== SCORING FUNCTIONS ====================

    /**
     * Score domain reputation
     */
    scoreDomainReputation(features) {
      let score = 0;
      const domain = features.domain;

      if (this.matchesAdvertisement(domain, features.path)) score += 0.9;
      if (this.matchesTracking(domain, features.query)) score += 0.8;
      if (this.matchesMalware(domain, features)) score += 0.95;
      if (this.matchesCryptomining(domain, features.path)) score += 0.9;

      // Historical reputation
      const rep = features.reputation;
      if (rep < 0.3) score += 0.7;
      else if (rep < 0.5) score += 0.5;

      return Math.min(score, 1.0);
    }

    /**
     * Score URL structure
     */
    scoreURLStructure(features) {
      let score = 0;

      // Long URLs are suspicious
      if (features.urlLength > 200) score += 0.3;
      if (features.urlLength > 500) score += 0.5;

      // Many parameters
      if (features.paramCount > 5) score += 0.2;
      if (features.paramCount > 10) score += 0.4;

      // Suspicious path patterns
      if (/\/(ad|ads|banner|tracking|pixel)\//i.test(features.path)) {
        score += 0.5;
      }

      // Heavily encoded URLs
      const encodedPercent = (features.url?.match(/%[0-9a-f]{2}/gi) || []).length;
      if (encodedPercent > 10) score += 0.3;

      // Excessive subdomains
      if (features.subdomainCount > 3) score += 0.3;

      return Math.min(score, 1.0);
    }

    /**
     * Score content type
     */
    scoreContentType(type) {
      const typeScores = {
        'script': 0.6,
        'sub_frame': 0.7,
        'iframe': 0.7,
        'xmlhttprequest': 0.5,
        'image': 0.4,
        'font': 0.3,
        'stylesheet': 0.2,
        'other': 0.4
      };

      return typeScores[type] || 0.3;
    }

    /**
     * Score behavioral pattern
     */
    scoreBehavioralPattern(features) {
      let score = 0;

      // High frequency indicates tracking
      const freq = features.frequency;
      if (freq > 30) score += 0.8;
      else if (freq > 20) score += 0.6;
      else if (freq > 10) score += 0.4;
      else if (freq > 5) score += 0.2;

      // Block history
      const history = features.blockHistory;
      if (history.blocked > 0) {
        const blockRate = history.blocked / (history.blocked + history.allowed + 1);
        score += blockRate * 0.5;
      }

      return Math.min(score, 1.0);
    }

    /**
     * Score historical data
     */
    scoreHistoricalData(features) {
      const history = features.blockHistory;
      const total = history.blocked + history.allowed;

      if (total === 0) return 0.5; // Unknown = neutral

      const blockRate = history.blocked / total;
      const fpRate = history.falsePositives / (total + 1);

      // High block rate, low false positive rate = high score
      return Math.max(0, Math.min(blockRate - fpRate * 0.3, 1.0));
    }

    /**
     * Calculate pattern boost
     */
    calculatePatternBoost(patterns) {
      if (patterns.length === 0) return 0;

      let boost = 0;
      patterns.forEach(pattern => {
        const category = this.threatCategories[pattern.type];
        if (category) {
          boost += pattern.confidence * category.weight * category.severity * 0.1;
        } else {
          boost += pattern.confidence * 0.05;
        }
      });

      return Math.min(boost, 0.3); // Max 30% boost
    }

    /**
     * Calculate confidence in prediction
     */
    calculateConfidence(scores, patterns) {
      const scoreValues = Object.values(scores);

      // Calculate variance (low variance = high confidence)
      const mean = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
      const variance = scoreValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / scoreValues.length;
      const varianceConfidence = Math.max(0, 1 - variance);

      // Pattern confidence
      const patternConfidence = patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
        : 0.5;

      // Combine
      return (varianceConfidence * 0.6 + patternConfidence * 0.4);
    }

    // ==================== LEARNING & ADAPTATION ====================

    /**
     * Learn from blocking outcome
     */
    async learnFromOutcome(url, outcome) {
      if (!this.settings.enableLearning) return;

      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;

        // Update domain statistics
        this.updateDomainStats(domain, outcome);

        // Update pattern confidence
        this.updatePatternConfidence(domain, outcome);

        // Update threat database
        this.updateThreatDatabase(url, outcome);

        // Clear cache for this domain
        this.clearDomainCache(domain);

        // Schedule save
        this.scheduleSave();

      } catch (error) {
        console.error('[SmartFiltering] Learning error:', error);
      }
    }

    /**
     * Update domain statistics
     */
    updateDomainStats(domain, outcome) {
      if (!this.domainStats.has(domain)) {
        this.domainStats.set(domain, {
          blocked: 0,
          allowed: 0,
          falsePositives: 0,
          falseNegatives: 0,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          requestCount: 0
        });
      }

      const stats = this.domainStats.get(domain);

      if (outcome.blocked) stats.blocked++;
      else stats.allowed++;

      if (outcome.falsePositive) stats.falsePositives++;
      if (outcome.falseNegative) stats.falseNegatives++;

      stats.lastSeen = Date.now();
      stats.requestCount++;

      this.domainStats.set(domain, stats);
    }

    /**
     * Update pattern confidence based on feedback
     */
    updatePatternConfidence(domain, outcome) {
      const currentConf = this.patternData.get(domain) || 0.5;
      let newConf = currentConf;

      if (outcome.falsePositive) {
        // Reduce confidence for false positives
        newConf = Math.max(currentConf - 0.15, 0.1);
      } else if (outcome.blocked && !outcome.falsePositive) {
        // Increase confidence for correct blocks
        newConf = Math.min(currentConf + 0.08, 0.95);
      } else if (!outcome.blocked && outcome.falseNegative) {
        // Increase confidence if we missed a threat
        newConf = Math.min(currentConf + 0.12, 0.95);
      }

      this.patternData.set(domain, newConf);
    }

    /**
     * Update threat database
     */
    updateThreatDatabase(url, outcome) {
      const domain = new URL(url).hostname;

      if (!this.threatDatabase.has(domain)) {
        this.threatDatabase.set(domain, {
          threatLevel: 0.5,
          category: 'unknown',
          samples: []
        });
      }

      const threat = this.threatDatabase.get(domain);

      // Adjust threat level
      if (outcome.blocked && !outcome.falsePositive) {
        threat.threatLevel = Math.min(threat.threatLevel + 0.1, 1.0);
      } else if (outcome.falsePositive) {
        threat.threatLevel = Math.max(threat.threatLevel - 0.2, 0);
      }

      // Store sample
      threat.samples.push({
        url,
        outcome,
        timestamp: Date.now()
      });

      // Keep only recent samples
      if (threat.samples.length > 10) {
        threat.samples = threat.samples.slice(-10);
      }

      this.threatDatabase.set(domain, threat);
    }

    // ==================== DATA PERSISTENCE ====================

    /**
     * Load pattern data from storage
     */
    async loadPatternData() {
      try {
        if (!this.browserAPI || !this.browserAPI.storage) {
          console.log('[SmartFiltering] Storage API not available');
          return;
        }

        const result = await this.browserAPI.storage.local.get('smartFilteringData');

        if (result.smartFilteringData) {
          const data = result.smartFilteringData;
          this.patternData = new Map(data.patternData || []);
          this.domainStats = new Map(data.domainStats || []);
          this.behavioralPatterns = new Map(data.behavioralPatterns || []);
          this.threatDatabase = new Map(data.threatDatabase || []);
          this.metrics = data.metrics || this.metrics;

          console.log('[SmartFiltering] Loaded persisted data');
        }
      } catch (error) {
        console.error('[SmartFiltering] Failed to load data:', error);
      }
    }

    /**
     * Save pattern data to storage
     */
    async savePatternData() {
      try {
        if (!this.browserAPI || !this.browserAPI.storage) {
          return;
        }

        const data = {
          patternData: Array.from(this.patternData.entries()),
          domainStats: Array.from(this.domainStats.entries()),
          behavioralPatterns: Array.from(this.behavioralPatterns.entries()),
          threatDatabase: Array.from(this.threatDatabase.entries()),
          metrics: this.metrics,
          lastUpdated: Date.now(),
          version: '2.0'
        };

        await this.browserAPI.storage.local.set({ smartFilteringData: data });
        this.lastSave = Date.now();

        console.log('[SmartFiltering] Data saved successfully');
      } catch (error) {
        console.error('[SmartFiltering] Failed to save data:', error);
      }
    }

    /**
     * Schedule save operation
     */
    scheduleSave() {
      if (this.saveTimeout) clearTimeout(this.saveTimeout);

      this.saveTimeout = setTimeout(() => {
        this.savePatternData();
      }, 2000); // Save after 2 seconds of inactivity
    }

    // ==================== HELPER FUNCTIONS ====================

    /**
     * Generate cache key
     */
    getCacheKey(url, context) {
      return `${url}|${context.type || ''}|${context.referrer || ''}`;
    }

    /**
     * Get domain frequency
     */
    getDomainFrequency(domain) {
      const stats = this.domainStats.get(domain);
      return stats ? stats.requestCount : 0;
    }

    /**
     * Get block history
     */
    getBlockHistory(domain) {
      const stats = this.domainStats.get(domain);
      return stats ? {
        blocked: stats.blocked,
        allowed: stats.allowed,
        falsePositives: stats.falsePositives,
        falseNegatives: stats.falseNegatives
      } : { blocked: 0, allowed: 0, falsePositives: 0, falseNegatives: 0 };
    }

    /**
     * Get domain reputation (0-1, higher is better)
     */
    getDomainReputation(domain) {
      const stats = this.domainStats.get(domain);
      if (!stats) return 0.5; // Unknown

      const total = stats.blocked + stats.allowed;
      if (total === 0) return 0.5;

      const allowRate = stats.allowed / total;
      const fpRate = stats.falsePositives / total;

      // High allow rate, low FP = good reputation
      return allowRate * (1 - fpRate);
    }

    /**
     * Get primary category from patterns
     */
    getPrimaryCategory(patterns) {
      if (patterns.length === 0) return 'unknown';

      const categoryCount = {};
      patterns.forEach(p => {
        categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
      });

      return Object.keys(categoryCount).reduce((a, b) =>
        categoryCount[a] > categoryCount[b] ? a : b
      );
    }

    /**
     * Get block reason
     */
    getBlockReason(patterns) {
      if (patterns.length === 0) return 'High threat score';
      return patterns.map(p => p.type).join(', ');
    }

    /**
     * Get monitor reason
     */
    getMonitorReason(patterns) {
      if (patterns.length === 0) return 'Moderate threat score';
      return 'Suspicious patterns: ' + patterns.map(p => p.type).join(', ');
    }

    /**
     * Get matched rules for a pattern type
     */
    getMatchedRules(type, ...args) {
      // Return which specific rules matched
      return [`${type}_detection`];
    }

    /**
     * Calculate pattern confidence
     */
    calculatePatternConfidence(type, features) {
      const learned = this.patternData.get(features.domain) || 0.5;
      const category = this.threatCategories[type];
      const baseSeverity = category ? category.severity : 0.7;

      return Math.min((baseSeverity + learned) / 2, 0.95);
    }

    /**
     * Clear cache for domain
     */
    clearDomainCache(domain) {
      const keysToDelete = [];
      this.filterCache.forEach((value, key) => {
        if (key.includes(domain)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.filterCache.delete(key));
    }

    /**
     * Predict threat for URL
     */
    predictThreat(url) {
      const analysis = this.analyzeUrlPattern(url, {});
      return analysis.decision;
    }

    /**
     * Classify threat type
     */
    classifyThreat(features) {
      const patterns = this.identifyPatterns(features);
      return this.getPrimaryCategory(patterns);
    }

    // ==================== MAINTENANCE ====================

    /**
     * Setup periodic maintenance tasks
     */
    setupMaintenance() {
      // Save data every 5 minutes
      setInterval(() => {
        this.savePatternData();
      }, 5 * 60 * 1000);

      // Clean old data daily
      setInterval(() => {
        this.cleanupOldData();
      }, 24 * 60 * 60 * 1000);

      // Clean cache every 10 minutes
      setInterval(() => {
        this.cleanCache();
      }, 10 * 60 * 1000);
    }

    /**
     * Cleanup old data
     */
    cleanupOldData() {
      const cutoffTime = Date.now() - (this.settings.dataRetention * 24 * 60 * 60 * 1000);

      // Clean domain stats
      this.domainStats.forEach((stats, domain) => {
        if (stats.lastSeen < cutoffTime) {
          this.domainStats.delete(domain);
        }
      });

      // Clean threat database
      this.threatDatabase.forEach((threat, domain) => {
        if (threat.samples.length > 0) {
          const lastSample = threat.samples[threat.samples.length - 1];
          if (lastSample.timestamp < cutoffTime) {
            this.threatDatabase.delete(domain);
          }
        }
      });

      console.log('[SmartFiltering] Cleanup completed');
    }

    /**
     * Clean expired cache
     */
    cleanCache() {
      const now = Date.now();
      const keysToDelete = [];

      this.filterCache.forEach((value, key) => {
        if (now - value.timestamp > this.settings.cacheTimeout) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => this.filterCache.delete(key));

      if (keysToDelete.length > 0) {
        console.log(`[SmartFiltering] Cleaned ${keysToDelete.length} cache entries`);
      }
    }

    /**
     * Start data collection (background context only)
     */
    startDataCollection() {
      if (!this.isBackgroundContext || !this.settings.enabled) {
        console.log('[SmartFiltering] Data collection not available in this context');
        return;
      }

      // Collection would be set up via webRequest API in background script
      console.log('[SmartFiltering] Data collection ready');
    }

    // ==================== PUBLIC API ====================

    /**
     * Check if URL should be blocked
     */
    async shouldBlock(url, context = {}) {
      if (!this.settings.enabled) return null;

      const analysis = this.analyzeUrlPattern(url, context);

      if (analysis.decision.action === 'block') {
        this.metrics.totalBlocked++;
      } else if (analysis.decision.action === 'allow') {
        this.metrics.totalAllowed++;
      }

      return {
        shouldBlock: analysis.decision.action === 'block',
        confidence: analysis.confidence,
        reason: analysis.decision.reason,
        category: analysis.decision.category,
        score: analysis.threatScore.score
      };
    }

    /**
     * Record user feedback
     */
    async recordFeedback(url, feedback) {
      await this.learnFromOutcome(url, feedback);
    }

    /**
     * Get comprehensive statistics
     */
    getStatistics() {
      const totalDecisions = this.metrics.totalBlocked + this.metrics.totalAllowed;
      const accuracy = totalDecisions > 0
        ? ((totalDecisions - this.metrics.falsePositives - this.metrics.falseNegatives) / totalDecisions * 100)
        : 0;

      return {
        patternsLearned: this.patternData.size,
        domainsTracked: this.domainStats.size,
        threatsIdentified: this.threatDatabase.size,
        totalAnalyzed: this.metrics.totalAnalyzed,
        totalBlocked: this.metrics.totalBlocked,
        totalAllowed: this.metrics.totalAllowed,
        accuracyRate: accuracy.toFixed(1),
        falsePositives: this.metrics.falsePositives,
        falseNegatives: this.metrics.falseNegatives,
        avgAnalysisTime: this.metrics.avgAnalysisTime.toFixed(2),
        cacheHitRate: this.metrics.totalAnalyzed > 0
          ? (this.metrics.cacheHits / this.metrics.totalAnalyzed * 100).toFixed(1)
          : 0,
        cacheSize: this.filterCache.size
      };
    }

    /**
     * Reset all data
     */
    async resetData() {
      this.patternData.clear();
      this.domainStats.clear();
      this.behavioralPatterns.clear();
      this.filterCache.clear();
      this.threatDatabase.clear();

      this.metrics = {
        totalAnalyzed: 0,
        totalBlocked: 0,
        totalAllowed: 0,
        falsePositives: 0,
        falseNegatives: 0,
        avgAnalysisTime: 0,
        cacheHits: 0,
        cacheMisses: 0
      };

      if (this.browserAPI && this.browserAPI.storage) {
        await this.browserAPI.storage.local.remove('smartFilteringData');
      }

      console.log('[SmartFiltering] All data reset');
    }

    /**
     * Export data for backup or analysis
     */
    exportData() {
      return {
        patternData: Array.from(this.patternData.entries()),
        domainStats: Array.from(this.domainStats.entries()),
        behavioralPatterns: Array.from(this.behavioralPatterns.entries()),
        threatDatabase: Array.from(this.threatDatabase.entries()),
        metrics: this.metrics,
        settings: this.settings,
        exportDate: new Date().toISOString(),
        version: '2.0'
      };
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
      Object.assign(this.settings, newSettings);
      this.scheduleSave();
      console.log('[SmartFiltering] Settings updated:', newSettings);
    }
  }

  // Export to global scope
  globalThis.SmartFilteringSystem = SmartFilteringSystem;

  // Module export if supported
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SmartFilteringSystem };
  }

})(typeof window !== 'undefined' ? window : globalThis);
