// PrivacyShield - AI Behavioral Analysis Engine
// Smart learning with automatic breakage detection and recovery

class BehavioralAnalyzer {
  constructor() {
    this.features = new Map(); // domain -> feature data
    this.decisionTree = new SimpleDecisionTree();
    this.breakageDetector = new BreakageDetector();
    this.learningEnabled = true;
    this.confidenceThreshold = 0.7;
    
    // Performance tracking
    this.analysisCount = 0;
    this.blockedCount = 0;
    this.breakageCount = 0;
  }

  /**
   * Analyze script behavior (DISABLED - too aggressive)
   * @param {string} domain - Domain being analyzed
   * @param {Object} scriptData - Script execution data
   * @returns {Object} - Analysis result with confidence
   */
  analyzeScript(domain, scriptData) {
    // AI analysis disabled - always return safe defaults
    return { 
      isTracker: false, 
      confidence: 0, 
      riskScore: 0, 
      recommendation: 'allow' 
    };
  }

  /**
   * Extract behavioral features from script execution
   * @param {Object} scriptData - Script execution data
   * @returns {Object} - Feature vector
   */
  extractFeatures(scriptData) {
    const features = {
      // API usage patterns
      apiCallFrequency: this.calculateAPIFrequency(scriptData.apiCalls),
      suspiciousAPIs: this.countSuspiciousAPIs(scriptData.apiCalls),
      
      // Data access patterns
      localStorageAccess: scriptData.localStorageAccess || 0,
      sessionStorageAccess: scriptData.sessionStorageAccess || 0,
      cookieAccess: scriptData.cookieAccess || 0,
      
      // Network behavior
      requestCount: scriptData.requests?.length || 0,
      thirdPartyRequests: this.countThirdPartyRequests(scriptData.requests),
      trackingParams: this.countTrackingParams(scriptData.requests),
      
      // Timing patterns
      executionTime: scriptData.executionTime || 0,
      periodicCalls: this.countPeriodicCalls(scriptData.apiCalls),
      
      // Canvas/fingerprinting attempts
      canvasCalls: this.countCanvasCalls(scriptData.apiCalls),
      webglCalls: this.countWebGLCalls(scriptData.apiCalls),
      audioCalls: this.countAudioCalls(scriptData.apiCalls),
      
      // Script characteristics
      scriptSize: scriptData.scriptSize || 0,
      obfuscated: this.detectObfuscation(scriptData.scriptContent),
      dynamicCode: this.countDynamicCode(scriptData.apiCalls)
    };

    return features;
  }

  /**
   * Calculate API call frequency (calls per second)
   */
  calculateAPIFrequency(apiCalls) {
    if (!apiCalls || apiCalls.length === 0) return 0;
    const timeSpan = 1000; // 1 second window
    return apiCalls.length / timeSpan * 1000;
  }

  /**
   * Count suspicious API calls
   */
  countSuspiciousAPIs(apiCalls) {
    const suspiciousAPIs = [
      'canvas.toDataURL', 'canvas.getImageData', 'webgl.getParameter',
      'audioContext.createOscillator', 'navigator.hardwareConcurrency',
      'navigator.deviceMemory', 'screen.width', 'screen.height'
    ];
    
    if (!apiCalls) return 0;
    return apiCalls.filter(call => 
      suspiciousAPIs.some(api => call.name.includes(api))
    ).length;
  }

  /**
   * Count third-party requests
   */
  countThirdPartyRequests(requests) {
    if (!requests) return 0;
    return requests.filter(req => req.isThirdParty).length;
  }

  /**
   * Count tracking parameters in requests
   */
  countTrackingParams(requests) {
    if (!requests) return 0;
    const trackingParams = ['utm_', 'fbclid', 'gclid', 'msclkid'];
    let count = 0;
    
    requests.forEach(req => {
      trackingParams.forEach(param => {
        if (req.url && req.url.includes(param)) count++;
      });
    });
    
    return count;
  }

  /**
   * Count periodic API calls (setInterval, setTimeout loops)
   */
  countPeriodicCalls(apiCalls) {
    if (!apiCalls) return 0;
    return apiCalls.filter(call => 
      call.name.includes('setInterval') || call.name.includes('setTimeout')
    ).length;
  }

  /**
   * Count canvas-related API calls
   */
  countCanvasCalls(apiCalls) {
    if (!apiCalls) return 0;
    return apiCalls.filter(call => 
      call.name.includes('canvas') || call.name.includes('toDataURL') || 
      call.name.includes('getImageData')
    ).length;
  }

  /**
   * Count WebGL-related API calls
   */
  countWebGLCalls(apiCalls) {
    if (!apiCalls) return 0;
    return apiCalls.filter(call => 
      call.name.includes('webgl') || call.name.includes('getParameter')
    ).length;
  }

  /**
   * Count audio-related API calls
   */
  countAudioCalls(apiCalls) {
    if (!apiCalls) return 0;
    return apiCalls.filter(call => 
      call.name.includes('audio') || call.name.includes('oscillator')
    ).length;
  }

  /**
   * Detect code obfuscation
   */
  detectObfuscation(content) {
    if (!content) return false;
    const indicators = [
      /\b[a-zA-Z]\d+[a-zA-Z]\d+/g, // Alphanumeric patterns
      /\\x[0-9a-fA-F]{2}/g, // Hex encoding
      /\['[^']+'\]/g, // Bracket notation
      /\\u[0-9a-fA-F]{4}/g // Unicode encoding
    ];
    
    let obfuscationScore = 0;
    indicators.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) obfuscationScore += matches.length;
    });
    
    return obfuscationScore > 5; // Threshold for obfuscation
  }

  /**
   * Count dynamic code execution attempts
   */
  countDynamicCode(apiCalls) {
    if (!apiCalls) return 0;
    return apiCalls.filter(call => 
      call.name.includes('eval') || call.name.includes('Function') ||
      call.name.includes('setTimeout') && call.args?.[0]?.includes('string')
    ).length;
  }

  /**
   * Calculate confidence in prediction
   */
  calculateConfidence(features, prediction) {
    // Higher confidence for clear patterns
    let confidence = prediction.confidence || 0.5;
    
    // Boost confidence for multiple indicators
    const indicatorCount = [
      features.suspiciousAPIs > 0,
      features.thirdPartyRequests > 2,
      features.trackingParams > 0,
      features.canvasCalls > 0,
      features.obfuscated
    ].filter(Boolean).length;
    
    confidence = Math.min(0.95, confidence + (indicatorCount * 0.1));
    return confidence;
  }

  /**
   * Get blocking recommendation based on prediction and confidence
   */
  getRecommendation(prediction, confidence) {
    if (!prediction.isTracker) return 'allow';
    if (confidence < this.confidenceThreshold) return 'monitor';
    if (prediction.riskScore > 0.8) return 'block';
    return 'restrict';
  }

  /**
   * Store features for learning
   */
  storeFeatures(domain, features, prediction) {
    if (!this.features.has(domain)) {
      this.features.set(domain, []);
    }
    
    this.features.get(domain).push({
      features,
      prediction,
      timestamp: Date.now()
    });
    
    // Keep only recent data (last 100 entries per domain)
    const domainFeatures = this.features.get(domain);
    if (domainFeatures.length > 100) {
      this.features.set(domain, domainFeatures.slice(-100));
    }
  }

  /**
   * Learn from site breakage
   * @param {string} domain - Domain that caused breakage
   * @param {string} blockedResource - Resource that was blocked
   */
  learnFromBreakage(domain, blockedResource) {
    console.log(`Learning from breakage: ${domain} - ${blockedResource}`);
    this.breakageCount++;
    
    // Mark domain as safe to prevent future breakage
    this.breakageDetector.markSafeDomain(domain, blockedResource);
    
    // Update decision tree to avoid similar mistakes
    const domainFeatures = this.features.get(domain);
    if (domainFeatures) {
      this.decisionTree.learnFromFalsePositive(domainFeatures, blockedResource);
    }
  }

  /**
   * Check if domain should be allowed based on breakage history
   */
  shouldAllowDomain(domain, resource) {
    return this.breakageDetector.isSafeDomain(domain, resource);
  }

  /**
   * Get learning statistics
   */
  getStats() {
    return {
      analysisCount: this.analysisCount,
      blockedCount: this.blockedCount,
      breakageCount: this.breakageCount,
      accuracy: this.calculateAccuracy(),
      safeDomains: this.breakageDetector.getSafeDomainsCount()
    };
  }

  /**
   * Calculate current accuracy estimate
   */
  calculateAccuracy() {
    if (this.analysisCount === 0) return 0;
    const errorRate = this.breakageCount / this.analysisCount;
    return Math.max(0, 1 - errorRate);
  }
}

/**
 * Simple Decision Tree for tracking detection
 */
class SimpleDecisionTree {
  constructor() {
    this.rules = this.initializeRules();
    this.learnedRules = new Map();
  }

  initializeRules() {
    return [
      // High confidence tracking indicators
      {
        condition: (features) => features.canvasCalls > 2 && features.suspiciousAPIs > 3,
        prediction: { isTracker: true, riskScore: 0.9, confidence: 0.8 },
        weight: 0.9
      },
      {
        condition: (features) => features.thirdPartyRequests > 5 && features.trackingParams > 2,
        prediction: { isTracker: true, riskScore: 0.8, confidence: 0.7 },
        weight: 0.8
      },
      {
        condition: (features) => features.obfuscated && features.dynamicCode > 2,
        prediction: { isTracker: true, riskScore: 0.7, confidence: 0.6 },
        weight: 0.7
      },
      // Legitimate patterns
      {
        condition: (features) => features.apiCallFrequency < 1 && features.suspiciousAPIs === 0,
        prediction: { isTracker: false, riskScore: 0.1, confidence: 0.8 },
        weight: 0.8
      }
    ];
  }

  predict(features) {
    let totalScore = 0;
    let totalWeight = 0;
    let bestMatch = null;

    // Check learned rules first
    for (const [key, rule] of this.learnedRules) {
      if (rule.condition(features)) {
        totalScore += rule.prediction.riskScore * rule.weight;
        totalWeight += rule.weight;
        if (!bestMatch || rule.weight > bestMatch.weight) {
          bestMatch = rule.prediction;
        }
      }
    }

    // Check default rules
    for (const rule of this.rules) {
      if (rule.condition(features)) {
        totalScore += rule.prediction.riskScore * rule.weight;
        totalWeight += rule.weight;
        if (!bestMatch || rule.weight > bestMatch.weight) {
          bestMatch = rule.prediction;
        }
      }
    }

    // Weighted average prediction
    const avgRiskScore = totalWeight > 0 ? totalScore / totalWeight : 0.1;
    
    return {
      isTracker: avgRiskScore > 0.5,
      riskScore: avgRiskScore,
      confidence: Math.min(0.9, totalWeight / 2) // Confidence based on rule support
    };
  }

  learnFromFalsePositive(featureHistory, blockedResource) {
    // Create rule to avoid similar false positives
    if (featureHistory.length > 0) {
      const lastFeatures = featureHistory[featureHistory.length - 1].features;
      const ruleKey = this.generateRuleKey(lastFeatures);
      
      // Add learned rule to allow similar patterns
      this.learnedRules.set(ruleKey, {
        condition: (features) => this.similarFeatures(features, lastFeatures),
        prediction: { isTracker: false, riskScore: 0.1, confidence: 0.9 },
        weight: 0.95 // High weight for learned rules
      });
      
      console.log(`Learned new rule: ${ruleKey}`);
    }
  }

  generateRuleKey(features) {
    // Create a simplified key for feature patterns
    return `${features.suspiciousAPIs}_${features.thirdPartyRequests}_${features.canvasCalls}`;
  }

  similarFeatures(features1, features2) {
    // Simple similarity check
    const threshold = 0.8;
    const similarity = this.calculateSimilarity(features1, features2);
    return similarity > threshold;
  }

  calculateSimilarity(f1, f2) {
    // Normalize and compare key features
    const keyFeatures = [
      'suspiciousAPIs', 'thirdPartyRequests', 'canvasCalls', 
      'trackingParams', 'obfuscated', 'dynamicCode'
    ];
    
    let similarity = 0;
    keyFeatures.forEach(feature => {
      const v1 = Math.min(f1[feature] || 0, 5) / 5; // Normalize to 0-1
      const v2 = Math.min(f2[feature] || 0, 5) / 5;
      similarity += 1 - Math.abs(v1 - v2);
    });
    
    return similarity / keyFeatures.length;
  }
}

/**
 * Breakage Detection and Auto-Recovery System
 */
class BreakageDetector {
  constructor() {
    this.safeDomains = new Map(); // domain -> Set of safe resources
    this.breakageHistory = new Map(); // domain -> breakage count
    this.lastBreakageCheck = new Map(); // domain -> last check timestamp
  }

  /**
   * Mark domain/resource as safe to prevent breakage
   */
  markSafeDomain(domain, resource) {
    if (!this.safeDomains.has(domain)) {
      this.safeDomains.set(domain, new Set());
    }
    this.safeDomains.get(domain).add(resource);
    
    // Increment breakage count
    const count = this.breakageHistory.get(domain) || 0;
    this.breakageHistory.set(domain, count + 1);
    
    console.log(`Marked safe: ${domain}/${resource} (breakage #${count + 1})`);
  }

  /**
   * Check if domain/resource should be allowed
   */
  shouldAllowDomain(domain, resource) {
    return this.isSafeDomain(domain, resource);
  }

  /**
   * Check if domain/resource is safe (alias for shouldAllowDomain)
   */
  isSafeDomain(domain, resource) {
    const safeResources = this.safeDomains.get(domain);
    if (!safeResources) return false;
    
    // Check exact match
    if (safeResources.has(resource)) return true;
    
    // Check pattern matches
    for (const safeResource of safeResources) {
      if (this.resourceMatches(resource, safeResource)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if resource matches safe pattern
   */
  resourceMatches(resource, pattern) {
    // Simple pattern matching for similar resources
    if (resource.includes(pattern) || pattern.includes(resource)) return true;
    
    // Check for common patterns
    const resourceParts = resource.split('/');
    const patternParts = pattern.split('/');
    
    // Match if first 2 parts are the same (domain + main path)
    if (resourceParts.length >= 2 && patternParts.length >= 2) {
      return resourceParts[0] === patternParts[0] && resourceParts[1] === patternParts[1];
    }
    
    return false;
  }

  /**
   * Detect site breakage (DISABLED - too aggressive)
   * @param {number} tabId - Tab ID
   * @param {string} domain - Domain to check
   * @returns {boolean} - Whether breakage is detected
   */
  detectBreakage(tabId, domain) {
    // Breakage detection disabled - never detect breakage
    return false;
  }

  /**
   * Check for breakage indicators in the page (more strict)
   */
  async checkBreakageIndicators(tabId) {
    const indicators = [];
    
    try {
      // Inject script to check page health
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: this.checkPageHealth
      });
      
      if (results && results[0]) {
        const health = results[0].result;
        
        // Only consider serious breakage indicators
        if (health.errorCount > 20) indicators.push('high_error_count');
        if (health.brokenElements > 50) indicators.push('broken_elements');
        if (!health.hasContent && health.bodyTextLength < 50) indicators.push('no_content');
        if (health.hasErrorMessages && health.errorCount > 10) indicators.push('error_messages');
      }
    } catch (error) {
      // If we can't inject script, don't assume breakage
      console.log('Could not check page health, assuming no breakage');
    }
    
    return indicators;
  }

  /**
   * Check page health (executed in page context)
   */
  checkPageHealth() {
    const health = {
      errorCount: 0,
      brokenElements: 0,
      hasContent: false,
      hasErrorMessages: false,
      bodyTextLength: 0
    };
    
    // Count broken images
    const images = document.querySelectorAll('img');
    health.brokenElements = Array.from(images).filter(img => img.naturalWidth === 0).length;
    
    // Check if page has meaningful content
    health.bodyTextLength = document.body.innerText.length;
    health.hasContent = health.bodyTextLength > 200;
    
    // Check for obvious error messages
    const errorSelectors = [
      '[class*="error"]', '[id*="error"]', 
      '[class*="failed"]', '[id*="failed"]',
      '[class*="broken"]', '[id*="broken"]'
    ];
    
    const errorElements = errorSelectors.map(selector => 
      document.querySelectorAll(selector).length
    );
    health.errorCount = errorElements.reduce((sum, count) => sum + count, 0);
    health.hasErrorMessages = health.errorCount > 5;
    
    return health;
  }

  /**
   * Get safe domains count
   */
  getSafeDomainsCount() {
    return this.safeDomains.size;
  }

  /**
   * Get breakage statistics
   */
  getBreakageStats() {
    const stats = {};
    for (const [domain, count] of this.breakageHistory) {
      stats[domain] = count;
    }
    return stats;
  }
}

export { BehavioralAnalyzer, SimpleDecisionTree, BreakageDetector };
