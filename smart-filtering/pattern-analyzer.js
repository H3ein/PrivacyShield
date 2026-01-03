// PrivacyShield Max - Pattern Analyzer
// Analyze URL and domain patterns for tracking and malicious behavior

import logger from '../core/logger.js';
import learningEngine from './learning-engine.js';

class PatternAnalyzer {
  constructor() {
    this.patterns = {
      tracking: [],
      malware: [],
      phishing: [],
      ads: []
    };

    this.initializePatterns();
  }

  /**
   * Initialize pattern definitions
   */
  initializePatterns() {
    // Tracking parameter patterns
    this.patterns.tracking = [
      { name: 'Facebook tracking', pattern: /fbclid=|fb_action_ids=|fb_action_types=/i, weight: 1.0 },
      { name: 'Google tracking', pattern: /gclid=|utm_source=|utm_medium=|utm_campaign=/i, weight: 1.0 },
      { name: 'Microsoft tracking', pattern: /msclkid=/i, weight: 1.0 },
      { name: 'Twitter tracking', pattern: /twclid=/i, weight: 1.0 },
      { name: 'Pinterest tracking', pattern: /epik=/i, weight: 1.0 },
      { name: 'Generic tracking', pattern: /[?&](ref|source|campaign|affiliate)=/i, weight: 0.7 },
      { name: 'Session tracking', pattern: /[?&](sid|session|sess|token)=/i, weight: 0.5 }
    ];

    // Malware URL patterns
    this.patterns.malware = [
      { name: 'Executable download', pattern: /\.(exe|scr|bat|cmd|vbs|ps1|msi|dll)$/i, weight: 1.5 },
      { name: 'Suspicious extension', pattern: /\.(zip|rar|7z|gz|tar)\.(exe|js|vbs)$/i, weight: 1.8 },
      { name: 'Double extension', pattern: /\.[a-z]{3,4}\.[a-z]{3,4}$/i, weight: 0.8 },
      { name: 'Encoded URL', pattern: /%2[0-9a-f]%2[0-9a-f]/i, weight: 0.6 },
      { name: 'IP address URL', pattern: /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i, weight: 0.9 },
      { name: 'Non-standard port', pattern: /:\d{2,5}\//, weight: 0.5 }
    ];

    // Phishing patterns
    this.patterns.phishing = [
      { name: 'Login in URL', pattern: /login|signin|account|verify|secure|update/i, weight: 0.7 },
      { name: 'Urgent action', pattern: /urgent|suspended|limited|verify|confirm|secure/i, weight: 0.8 },
      { name: 'Suspicious domain', pattern: /-pay|-secure|-verify|-account|-login/i, weight: 0.9 },
      { name: 'URL shortener', pattern: /bit\.ly|tinyurl|goo\.gl|ow\.ly|t\.co/i, weight: 0.4 }
    ];

    // Ad patterns
    this.patterns.ads = [
      { name: 'Ad server', pattern: /ad[sx]?\.|\bad[sx]?\b|ads\d+\.|adserver|adservice/i, weight: 1.0 },
      { name: 'Banner', pattern: /banner|popup|popunder/i, weight: 0.8 },
      { name: 'Sponsored', pattern: /sponsor|affiliate|partner/i, weight: 0.7 },
      { name: 'Ad network', pattern: /doubleclick|adsystem|advertising|googlesyndication|googleadservices/i, weight: 1.0 },
      { name: 'Analytics tracker', pattern: /google-analytics|googletagmanager|analytics\.google/i, weight: 1.0 },
      { name: 'Social tracker', pattern: /facebook\.com\/tr|connect\.facebook|pixel\.facebook/i, weight: 1.0 },
      { name: 'Third-party tracker', pattern: /tracking\.|tracker\.|telemetry\.|beacon\./i, weight: 0.9 }
    ];
  }

  /**
   * Analyze URL for patterns
   * @param {string} url - URL to analyze
   * @returns {Object} - Analysis result
   */
  analyzeURL(url) {
    const results = {
      tracking: this.matchPatterns(url, 'tracking'),
      malware: this.matchPatterns(url, 'malware'),
      phishing: this.matchPatterns(url, 'phishing'),
      ads: this.matchPatterns(url, 'ads')
    };

    // Calculate overall scores
    const scores = {
      tracking: this.calculateScore(results.tracking),
      malware: this.calculateScore(results.malware),
      phishing: this.calculateScore(results.phishing),
      ads: this.calculateScore(results.ads)
    };

    // Determine primary category
    const maxScore = Math.max(...Object.values(scores));
    const primaryCategory = Object.entries(scores).find(
      ([_, score]) => score === maxScore
    )?.[0];

    // Get all matched patterns
    const allMatches = [
      ...results.tracking,
      ...results.malware,
      ...results.phishing,
      ...results.ads
    ];

    // Record new techniques when suspicious patterns are detected
    // This helps build the "New Techniques Detected" counter
    if (maxScore >= 0.5 && allMatches.length > 0) {
      this.recordNewTechniques(allMatches, maxScore);
    }

    return {
      url,
      scores,
      primaryCategory,
      maxScore,
      matches: allMatches,
      isSuspicious: maxScore >= 0.5,
      shouldBlock: maxScore >= 0.7
    };
  }

  /**
   * Record newly discovered techniques to learning engine
   * @param {Array} matches - Matched patterns
   * @param {number} confidence - Detection confidence
   */
  recordNewTechniques(matches, confidence) {
    for (const match of matches) {
      const patternName = `technique:${match.category}:${match.name}`;

      // Only record if this is a newly discovered technique
      // (checking if weight is still default 1.0)
      const currentWeight = learningEngine.getPatternWeight(patternName);

      // If weight is default (1.0), this is a new detection
      if (currentWeight === 1.0) {
        try {
          learningEngine.recordNewTechnique(patternName, confidence);
        } catch (error) {
          // Silently fail - don't break URL analysis
        }
      }
    }
  }

  /**
   * Match URL against pattern category
   * @param {string} url - URL to match
   * @param {string} category - Pattern category
   * @returns {Array} - Matched patterns
   */
  matchPatterns(url, category) {
    const patterns = this.patterns[category] || [];
    const matches = [];

    for (const { name, pattern, weight } of patterns) {
      if (pattern.test(url)) {
        // Get pattern weight from learning engine
        const learnedWeight = learningEngine.getPatternWeight(name);
        const adjustedWeight = weight * learnedWeight;

        matches.push({
          name,
          category,
          weight: adjustedWeight,
          originalWeight: weight
        });
      }
    }

    return matches;
  }

  /**
   * Calculate score from matched patterns
   * @param {Array} matches - Matched patterns
   * @returns {number} - Score (0-1)
   */
  calculateScore(matches) {
    if (matches.length === 0) return 0;

    // Sum weighted scores
    let totalWeight = 0;
    for (const match of matches) {
      totalWeight += match.weight;
    }

    // Normalize to 0-1 range
    return Math.min(totalWeight / 2, 1.0);
  }

  /**
   * Analyze domain reputation
   * @param {string} domain - Domain to analyze
   * @returns {Object} - Reputation analysis
   */
  analyzeDomainReputation(domain) {
    const confidence = learningEngine.getConfidence(domain);

    // Check domain age patterns (newly registered domains are suspicious)
    const hasNumbers = /\d{3,}/.test(domain);
    const hasHyphens = (domain.match(/-/g) || []).length >= 2;
    const isShort = domain.length < 5;
    const isLong = domain.length > 30;

    let reputationScore = confidence;

    if (hasNumbers) reputationScore -= 0.1;
    if (hasHyphens) reputationScore -= 0.15;
    if (isShort) reputationScore -= 0.1;
    if (isLong) reputationScore -= 0.05;

    reputationScore = Math.max(0, Math.min(1, reputationScore));

    return {
      domain,
      confidence,
      reputationScore,
      flags: {
        hasNumbers,
        hasHyphens,
        isShort,
        isLong
      },
      trustLevel: this.getTransferLevel(reputationScore)
    };
  }

  /**
   * Get trust level from reputation score
   * @param {number} score - Reputation score
   * @returns {string} - Trust level
   */
  getTrustLevel(score) {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    if (score >= 0.4) return 'low';
    return 'untrusted';
  }

  /**
   * Add custom pattern
   * @param {string} category - Pattern category
   * @param {string} name - Pattern name
   * @param {RegExp} pattern - Pattern regex
   * @param {number} weight - Pattern weight
   */
  addCustomPattern(category, name, pattern, weight = 1.0) {
    if (!this.patterns[category]) {
      this.patterns[category] = [];
    }

    this.patterns[category].push({
      name,
      pattern: new RegExp(pattern),
      weight,
      custom: true
    });

    logger.info('Custom pattern added:', { category, name });
  }

  /**
   * Remove custom pattern
   * @param {string} category - Pattern category
   * @param {string} name - Pattern name
   */
  removeCustomPattern(category, name) {
    if (!this.patterns[category]) return;

    this.patterns[category] = this.patterns[category].filter(
      p => !(p.custom && p.name === name)
    );

    logger.info('Custom pattern removed:', { category, name });
  }

  /**
   * Analyze request chain (redirect tracking)
   * @param {Array} urls - Array of URLs in redirect chain
   * @returns {Object} - Chain analysis
   */
  analyzeRequestChain(urls) {
    if (!urls || urls.length < 2) {
      return { isTracking: false };
    }

    let trackingScore = 0;
    const trackers = [];

    for (let i = 0; i < urls.length; i++) {
      const analysis = this.analyzeURL(urls[i]);

      if (analysis.scores.tracking > 0.5) {
        trackingScore += analysis.scores.tracking;
        trackers.push({
          url: urls[i],
          position: i,
          score: analysis.scores.tracking
        });
      }
    }

    // Multiple redirects through trackers = tracking chain
    const isTracking = trackers.length >= 2;
    const avgScore = trackingScore / urls.length;

    return {
      isTracking,
      chainLength: urls.length,
      trackerCount: trackers.length,
      avgScore,
      trackers,
      shouldBlock: isTracking && avgScore > 0.6
    };
  }

  /**
   * Batch analyze multiple URLs
   * @param {Array} urls - Array of URLs
   * @returns {Array} - Analysis results
   */
  batchAnalyze(urls) {
    return urls.map(url => this.analyzeURL(url));
  }

  /**
   * Get pattern statistics
   * @returns {Object} - Pattern stats
   */
  getStats() {
    const stats = {};

    for (const [category, patterns] of Object.entries(this.patterns)) {
      stats[category] = {
        total: patterns.length,
        custom: patterns.filter(p => p.custom).length,
        patterns: patterns.map(p => ({
          name: p.name,
          weight: p.weight,
          learnedWeight: learningEngine.getPatternWeight(p.name)
        }))
      };
    }

    return stats;
  }

  /**
   * Export patterns
   * @returns {Object} - Pattern data
   */
  exportPatterns() {
    return {
      patterns: this.patterns,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import patterns
   * @param {Object} data - Pattern data
   */
  importPatterns(data) {
    if (data.patterns) {
      // Merge with existing patterns
      for (const [category, patterns] of Object.entries(data.patterns)) {
        if (!this.patterns[category]) {
          this.patterns[category] = [];
        }

        for (const pattern of patterns) {
          // Only import custom patterns
          if (pattern.custom) {
            this.patterns[category].push({
              ...pattern,
              pattern: new RegExp(pattern.pattern)
            });
          }
        }
      }

      logger.info('Patterns imported');
    }
  }
}

// Export singleton instance
const patternAnalyzer = new PatternAnalyzer();
export default patternAnalyzer;
export { PatternAnalyzer };
