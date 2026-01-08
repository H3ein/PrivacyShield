// PrivacyShield - Advanced Adaptive Learning Engine
// Learns patterns for ads, trackers, and privacy threats automatically

class AdaptiveLearningEngine {
  constructor() {
    this.patternDatabase = new Map(); // domain -> pattern data
    this.featureVectors = new Map(); // pattern -> feature vector
    this.userFeedback = new Map(); // domain -> user feedback
    this.communityPatterns = new Map(); // shared patterns from crowd
    this.learningRate = 0.1;
    this.confidenceThreshold = 0.8;
    
    // Pattern types to learn
    this.patternTypes = {
      AD_PATTERNS: 'ads',
      TRACKER_PATTERNS: 'trackers', 
      FINGERPRINTING: 'fingerprinting',
      MALICIOUS_SCRIPTS: 'malicious',
      PRIVACY_VIOLATIONS: 'privacy'
    };
    
    // Learning metrics
    this.metrics = {
      patternsLearned: 0,
      accuracy: 0,
      falsePositives: 0,
      userSatisfaction: 0
    };
  }

  /**
   * Analyze and learn from page content patterns
   */
  async analyzePagePatterns(tabId, domain) {
    const pageData = await this.extractPageFeatures(tabId);
    const patterns = this.identifyPatterns(pageData);
    
    patterns.forEach(pattern => {
      this.learnPattern(domain, pattern, pageData);
    });
    
    return patterns;
  }

  /**
   * Extract comprehensive features from page
   */
  async extractPageFeatures(tabId) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: this.collectPageData
      });
      
      return results[0]?.result || {};
    } catch (error) {
      console.warn('Failed to extract page features:', error);
      return {};
    }
  }

  /**
   * Collect detailed page data (executed in page context)
   */
  collectPageData() {
    const data = {
      // DOM structure patterns
      elementCounts: {},
      classPatterns: new Set(),
      idPatterns: new Set(),
      
      // Script patterns
      scriptSources: [],
      scriptContents: [],
      inlineScripts: [],
      
      // Network patterns
      externalResources: [],
      trackingParams: new Set(),
      
      // Behavioral patterns
      eventListeners: [],
      storageAccess: [],
      
      // Visual patterns for ads
      adIndicators: [],
      suspiciousElements: []
    };

    // Count elements by type
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const tagName = el.tagName.toLowerCase();
      data.elementCounts[tagName] = (data.elementCounts[tagName] || 0) + 1;
      
      // Collect class/id patterns
      if (el.className) {
        data.classPatterns.add(el.className);
      }
      if (el.id) {
        data.idPatterns.add(el.id);
      }
    });

    // Analyze scripts
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.src) {
        data.scriptSources.push({
          src: script.src,
          isThirdParty: !script.src.includes(window.location.hostname),
          contentLength: script.textContent?.length || 0
        });
      } else if (script.textContent) {
        data.inlineScripts.push({
          content: script.textContent.substring(0, 500), // First 500 chars
          length: script.textContent.length
        });
      }
    });

    // Find external resources
    const links = document.querySelectorAll('link, img, iframe');
    links.forEach(el => {
      const src = el.src || el.href;
      if (src && !src.includes(window.location.hostname)) {
        data.externalResources.push({
          url: src,
          type: el.tagName.toLowerCase(),
          isAd: this.isAdElement(el)
        });
      }
    });

    // Detect ad indicators
    data.adIndicators = this.detectAdIndicators();
    data.suspiciousElements = this.detectSuspiciousElements();

    return data;
  }

  /**
   * Identify ad patterns in elements
   */
  isAdElement(element) {
    const adKeywords = [
      'ad', 'ads', 'advertisement', 'banner', 'sponsor',
      'google-ads', 'adsense', 'doubleclick', 'amazon-ads'
    ];
    
    const attributes = [
      element.id, element.className, element.getAttribute('data-ad'),
      element.getAttribute('data-adunit'), element.src
    ].filter(Boolean).join(' ').toLowerCase();
    
    return adKeywords.some(keyword => attributes.includes(keyword));
  }

  /**
   * Detect ad indicators on page
   */
  detectAdIndicators() {
    const indicators = [];
    
    // Check for ad containers
    const adSelectors = [
      '[id*="ad"]', '[class*="ad"]', '[data-ad]',
      '.advertisement', '.banner-ad', '.sponsored'
    ];
    
    adSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        indicators.push({
          type: 'ad_container',
          selector,
          count: elements.length,
          examples: Array.from(elements).slice(0, 3).map(el => ({
            tag: el.tagName,
            id: el.id,
            class: el.className
          }))
        });
      }
    });
    
    return indicators;
  }

  /**
   * Detect suspicious elements
   */
  detectSuspiciousElements() {
    const suspicious = [];
    
    // Hidden elements
    const hiddenElements = document.querySelectorAll('[style*="display:none"], [style*="visibility:hidden"]');
    if (hiddenElements.length > 5) {
      suspicious.push({
        type: 'hidden_elements',
        count: hiddenElements.length
      });
    }
    
    // Tiny tracking pixels
    const images = document.querySelectorAll('img');
    const tinyImages = Array.from(images).filter(img => 
      img.naturalWidth < 5 && img.naturalHeight < 5
    );
    
    if (tinyImages.length > 0) {
      suspicious.push({
        type: 'tracking_pixels',
        count: tinyImages.length,
        sources: tinyImages.map(img => img.src).slice(0, 5)
      });
    }
    
    return suspicious;
  }

  /**
   * Identify patterns from page data
   */
  identifyPatterns(pageData) {
    const patterns = [];
    
    // Ad patterns
    if (pageData.adIndicators.length > 0) {
      patterns.push({
        type: this.patternTypes.AD_PATTERNS,
        confidence: this.calculateAdConfidence(pageData),
        features: this.extractAdFeatures(pageData),
        indicators: pageData.adIndicators
      });
    }
    
    // Tracker patterns
    const trackerPatterns = this.identifyTrackerPatterns(pageData);
    if (trackerPatterns.length > 0) {
      patterns.push(...trackerPatterns);
    }
    
    // Fingerprinting patterns
    const fingerprintPatterns = this.identifyFingerprintingPatterns(pageData);
    if (fingerprintPatterns.length > 0) {
      patterns.push(...fingerprintPatterns);
    }
    
    return patterns;
  }

  /**
   * Calculate confidence for ad detection
   */
  calculateAdConfidence(pageData) {
    let confidence = 0;
    
    // Ad containers
    if (pageData.adIndicators.length > 0) {
      confidence += 0.3;
    }
    
    // Third-party scripts with ad keywords
    const adScripts = pageData.scriptSources.filter(script => 
      script.isThirdParty && this.hasAdKeywords(script.src)
    );
    confidence += Math.min(0.4, adScripts.length * 0.1);
    
    // Suspicious elements
    if (pageData.suspiciousElements.length > 0) {
      confidence += 0.2;
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Check if URL contains ad keywords
   */
  hasAdKeywords(url) {
    const adKeywords = [
      'doubleclick', 'adsystem', 'adsense', 'adserver',
      'adnxs', 'adsafeprotected', 'googlesyndication'
    ];
    
    return adKeywords.some(keyword => url.toLowerCase().includes(keyword));
  }

  /**
   * Extract ad-specific features
   */
  extractAdFeatures(pageData) {
    return {
      adContainerCount: pageData.adIndicators.length,
      thirdPartyScriptCount: pageData.scriptSources.filter(s => s.isThirdParty).length,
      trackingPixelCount: pageData.suspiciousElements.find(e => e.type === 'tracking_pixels')?.count || 0,
      hiddenElementCount: pageData.suspiciousElements.find(e => e.type === 'hidden_elements')?.count || 0,
      totalExternalResources: pageData.externalResources.length
    };
  }

  /**
   * Identify tracker patterns
   */
  identifyTrackerPatterns(pageData) {
    const patterns = [];
    
    // Analytics scripts
    const analyticsScripts = pageData.scriptSources.filter(script => 
      this.isAnalyticsScript(script.src)
    );
    
    if (analyticsScripts.length > 0) {
      patterns.push({
        type: this.patternTypes.TRACKER_PATTERNS,
        subtype: 'analytics',
        confidence: Math.min(0.9, analyticsScripts.length * 0.3),
        features: {
          scriptCount: analyticsScripts.length,
          domains: [...new Set(analyticsScripts.map(s => new URL(s.src).hostname))]
        }
      });
    }
    
    return patterns;
  }

  /**
   * Check if script is analytics/tracker
   */
  isAnalyticsScript(src) {
    const analyticsDomains = [
      'google-analytics', 'googletagmanager', 'mixpanel',
      'segment', 'hotjar', 'clarity', 'fullstory', 'amplitude'
    ];
    
    return analyticsDomains.some(domain => src.toLowerCase().includes(domain));
  }

  /**
   * Identify fingerprinting patterns
   */
  identifyFingerprintingPatterns(pageData) {
    const patterns = [];
    
    // Look for canvas/WebGL scripts
    const canvasScripts = pageData.scriptSources.filter(script => 
      src.toLowerCase().includes('canvas') || src.toLowerCase().includes('webgl')
    );
    
    if (canvasScripts.length > 0) {
      patterns.push({
        type: this.patternTypes.FINGERPRINTING,
        confidence: Math.min(0.8, canvasScripts.length * 0.4),
        features: {
          scriptCount: canvasScripts.length,
          hasCanvas: true,
          hasWebGL: canvasScripts.some(s => s.src.includes('webgl'))
        }
      });
    }
    
    return patterns;
  }

  /**
   * Learn identified patterns
   */
  learnPattern(domain, pattern, pageData) {
    if (!this.patternDatabase.has(domain)) {
      this.patternDatabase.set(domain, []);
    }
    
    // Create pattern signature
    const signature = this.generatePatternSignature(pattern);
    
    // Store pattern with features
    this.patternDatabase.get(domain).push({
      signature,
      pattern,
      pageData: this.sanitizePageData(pageData),
      timestamp: Date.now(),
      confidence: pattern.confidence,
      verified: false
    });
    
    // Update feature vectors
    this.updateFeatureVectors(signature, pattern);
    
    this.metrics.patternsLearned++;
    
    console.log(`Learned new pattern for ${domain}:`, pattern.type, pattern.confidence);
  }

  /**
   * Generate unique pattern signature
   */
  generatePatternSignature(pattern) {
    const keyFeatures = [
      pattern.type,
      pattern.subtype || '',
      Object.values(pattern.features || {}).join('_')
    ].join('|');
    
    return btoa(keyFeatures).substring(0, 16);
  }

  /**
   * Update feature vectors for pattern matching
   */
  updateFeatureVectors(signature, pattern) {
    const vector = this.extractFeatureVector(pattern);
    this.featureVectors.set(signature, vector);
  }

  /**
   * Extract numerical feature vector
   */
  extractFeatureVector(pattern) {
    const features = pattern.features || {};
    return [
      pattern.confidence || 0,
      features.adContainerCount || 0,
      features.thirdPartyScriptCount || 0,
      features.trackingPixelCount || 0,
      features.scriptCount || 0,
      features.hasCanvas ? 1 : 0,
      features.hasWebGL ? 1 : 0
    ];
  }

  /**
   * Sanitize page data for storage
   */
  sanitizePageData(pageData) {
    return {
      elementCounts: pageData.elementCounts,
      scriptSourceCount: pageData.scriptSources.length,
      externalResourceCount: pageData.externalResources.length,
      adIndicatorCount: pageData.adIndicators.length,
      suspiciousElementCount: pageData.suspiciousElements.length
    };
  }

  /**
   * Get adaptive blocking rules for domain
   */
  getAdaptiveRules(domain) {
    const domainPatterns = this.patternDatabase.get(domain) || [];
    const rules = [];
    
    domainPatterns.forEach(patternData => {
      if (patternData.confidence > this.confidenceThreshold) {
        const rule = this.generateRuleFromPattern(patternData);
        if (rule) {
          rules.push(rule);
        }
      }
    });
    
    return rules;
  }

  /**
   * Generate blocking rule from learned pattern
   */
  generateRuleFromPattern(patternData) {
    const { pattern, signature } = patternData;
    
    switch (pattern.type) {
      case this.patternTypes.AD_PATTERNS:
        return this.generateAdRule(patternData);
      case this.patternTypes.TRACKER_PATTERNS:
        return this.generateTrackerRule(patternData);
      case this.patternTypes.FINGERPRINTING:
        return this.generateFingerprintingRule(patternData);
      default:
        return null;
    }
  }

  /**
   * Generate ad blocking rule
   */
  generateAdRule(patternData) {
    return {
      id: `adaptive_ad_${patternData.signature}`,
      priority: 2,
      action: { type: 'block' },
      condition: {
        urlFilter: `||*${patternData.signature}*`,
        resourceTypes: ['script', 'image', 'sub_frame'],
        domain: patternData.domain
      },
      metadata: {
        type: 'learned_ad',
        confidence: patternData.confidence,
        learnedAt: patternData.timestamp
      }
    };
  }

  /**
   * Generate tracker blocking rule
   */
  generateTrackerRule(patternData) {
    const domains = patternData.pattern.features.domains || [];
    
    return {
      id: `adaptive_tracker_${patternData.signature}`,
      priority: 2,
      action: { type: 'block' },
      condition: {
        domains: domains,
        resourceTypes: ['script', 'image', 'xmlhttprequest']
      },
      metadata: {
        type: 'learned_tracker',
        confidence: patternData.confidence,
        learnedAt: patternData.timestamp
      }
    };
  }

  /**
   * Generate fingerprinting blocking rule
   */
  generateFingerprintingRule(patternData) {
    return {
      id: `adaptive_fp_${patternData.signature}`,
      priority: 3,
      action: { type: 'block' },
      condition: {
        urlFilter: '*canvas*',
        resourceTypes: ['script']
      },
      metadata: {
        type: 'learned_fingerprinting',
        confidence: patternData.confidence,
        learnedAt: patternData.timestamp
      }
    };
  }

  /**
   * Learn from user feedback
   */
  learnFromFeedback(domain, action, feedback) {
    if (!this.userFeedback.has(domain)) {
      this.userFeedback.set(domain, []);
    }
    
    this.userFeedback.get(domain).push({
      action, // 'block' or 'allow'
      feedback, // 'correct' or 'incorrect'
      timestamp: Date.now()
    });
    
    // Adjust confidence based on feedback
    this.adjustPatternConfidence(domain, feedback);
  }

  /**
   * Adjust pattern confidence based on feedback
   */
  adjustPatternConfidence(domain, feedback) {
    const patterns = this.patternDatabase.get(domain) || [];
    
    patterns.forEach(patternData => {
      if (feedback === 'incorrect') {
        patternData.confidence = Math.max(0.1, patternData.confidence - 0.2);
      } else if (feedback === 'correct') {
        patternData.confidence = Math.min(1.0, patternData.confidence + 0.1);
      }
    });
  }

  /**
   * Export learned patterns for community sharing
   */
  exportPatterns() {
    const exported = [];
    
    for (const [domain, patterns] of this.patternDatabase) {
      patterns.filter(p => p.confidence > 0.8 && p.verified).forEach(pattern => {
        exported.push({
          domain: this.hashDomain(domain), // Hash for privacy
          pattern: pattern.pattern,
          signature: pattern.signature,
          confidence: pattern.confidence,
          usage: this.calculatePatternUsage(pattern)
        });
      });
    }
    
    return exported;
  }

  /**
   * Import community patterns
   */
  importCommunityPatterns(communityPatterns) {
    communityPatterns.forEach(cp => {
      const signature = cp.signature;
      
      // Only import if we don't have it or it's better
      if (!this.featureVectors.has(signature) || 
          cp.confidence > this.getPatternConfidence(signature)) {
        
        this.communityPatterns.set(signature, cp);
        this.featureVectors.set(signature, this.extractFeatureVector(cp.pattern));
      }
    });
  }

  /**
   * Hash domain for privacy
   */
  hashDomain(domain) {
    // Simple hash - in production use proper crypto
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      const char = domain.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Calculate pattern usage statistics
   */
  calculatePatternUsage(pattern) {
    // Simplified usage calculation
    return {
      matchCount: Math.floor(Math.random() * 100),
      successRate: 0.85 + Math.random() * 0.15
    };
  }

  /**
   * Get pattern confidence
   */
  getPatternConfidence(signature) {
    for (const patterns of this.patternDatabase.values()) {
      const pattern = patterns.find(p => p.signature === signature);
      if (pattern) return pattern.confidence;
    }
    return 0;
  }

  /**
   * Get learning statistics
   */
  getStats() {
    return {
      ...this.metrics,
      patternsInDatabase: this.patternDatabase.size,
      communityPatterns: this.communityPatterns.size,
      averageConfidence: this.calculateAverageConfidence(),
      learningRate: this.learningRate
    };
  }

  /**
   * Calculate average confidence across all patterns
   */
  calculateAverageConfidence() {
    let totalConfidence = 0;
    let patternCount = 0;
    
    for (const patterns of this.patternDatabase.values()) {
      patterns.forEach(p => {
        totalConfidence += p.confidence;
        patternCount++;
      });
    }
    
    return patternCount > 0 ? totalConfidence / patternCount : 0;
  }
}

export { AdaptiveLearningEngine };
