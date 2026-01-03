// PrivacyShield Max - Learning Engine
// Machine learning feedback loop and confidence adjustment

import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';

class LearningEngine {
  constructor() {
    this.feedbackData = [];
    this.domainConfidence = new Map();
    this.patternWeights = new Map();
    this.feedbackCount = 0;
    this.retrainThreshold = 50; // Retrain after 50 feedbacks
  }

  /**
   * Initialize learning engine
   */
  async initialize() {
    // Load saved feedback data
    const stored = await storageManager.get('learningData');

    if (stored) {
      this.feedbackData = stored.feedbackData || [];
      this.domainConfidence = new Map(stored.domainConfidence || []);
      this.patternWeights = new Map(stored.patternWeights || []);
      this.feedbackCount = stored.feedbackCount || 0;
    }

    logger.info('Learning engine initialized', {
      feedbackCount: this.feedbackCount,
      domains: this.domainConfidence.size
    });
  }

  /**
   * Record user feedback
   * @param {string} domain - Domain
   * @param {string} action - User action (approve_block, false_positive, report_miss)
   * @param {Object} aiDecision - AI's original decision
   */
  async recordFeedback(domain, action, aiDecision) {
    const feedback = {
      domain,
      action,
      aiDecision,
      timestamp: Date.now()
    };

    this.feedbackData.push(feedback);
    this.feedbackCount++;

    // Update confidence based on feedback
    this.updateConfidence(domain, action, aiDecision);

    // Update pattern weights
    if (aiDecision.reasons) {
      this.updatePatternWeights(aiDecision.reasons, action);
    }

    // Save to storage
    await this.save();

    logger.info('Feedback recorded:', { domain, action });

    // Retrain if threshold reached
    if (this.feedbackCount % this.retrainThreshold === 0) {
      await this.retrain();
    }
  }

  /**
   * Update confidence score for domain
   * @param {string} domain - Domain
   * @param {string} action - User action
   * @param {Object} aiDecision - AI decision
   */
  updateConfidence(domain, action, aiDecision) {
    let currentConfidence = this.domainConfidence.get(domain) ||
      aiDecision.confidence ||
      0.5;

    // Adjust confidence based on feedback
    switch (action) {
      case 'approve_block':
        // AI was correct - increase confidence
        currentConfidence = Math.min(currentConfidence + 0.05, 1.0);
        break;

      case 'false_positive':
        // AI was wrong - decrease confidence significantly
        currentConfidence = Math.max(currentConfidence - 0.15, 0.0);
        break;

      case 'report_miss':
        // AI missed a threat - adjust based on whether it should have caught it
        currentConfidence = Math.max(currentConfidence - 0.10, 0.0);
        break;

      case 'whitelist':
        // User permanently whitelisted - set confidence to 0
        currentConfidence = 0.0;
        break;
    }

    this.domainConfidence.set(domain, currentConfidence);

    logger.debug('Confidence updated for', domain, ':', currentConfidence);
  }

  /**
   * Update pattern weights based on feedback
   * @param {Array} reasons - Detection reasons (patterns)
   * @param {string} action - User action
   */
  updatePatternWeights(reasons, action) {
    for (const reason of reasons) {
      let weight = this.patternWeights.get(reason) || 1.0;

      if (action === 'approve_block') {
        // Pattern was correct - increase weight
        weight = Math.min(weight + 0.02, 2.0);
      } else if (action === 'false_positive') {
        // Pattern led to false positive - decrease weight
        weight = Math.max(weight - 0.05, 0.1);
      }

      this.patternWeights.set(reason, weight);
    }
  }

  /**
   * Get confidence score for domain
   * @param {string} domain - Domain
   * @returns {number} - Confidence score (0-1)
   */
  getConfidence(domain) {
    return this.domainConfidence.get(domain) || 0.5;
  }

  /**
   * Get pattern weight
   * @param {string} pattern - Pattern name
   * @returns {number} - Weight (0.1-2.0)
   */
  getPatternWeight(pattern) {
    return this.patternWeights.get(pattern) || 1.0;
  }

  /**
   * Retrain model based on accumulated feedback
   */
  async retrain() {
    logger.info('Retraining model with', this.feedbackCount, 'feedback samples');

    // Analyze feedback patterns
    const stats = this.analyzeFeedback();

    // Adjust thresholds based on false positive rate
    if (stats.falsePositiveRate > 0.3) {
      // Too many false positives - increase blocking threshold
      logger.warn('High false positive rate detected, adjusting thresholds');

      // Signal to other modules to increase sensitivity
      await storageManager.set({
        'ai_threshold_adjustment': 0.1 // Increase threshold by 0.1
      });
    } else if (stats.falsePositiveRate < 0.05 && stats.missRate > 0.2) {
      // Very few false positives but missing threats - decrease threshold
      logger.info('Low false positive rate, increasing sensitivity');

      await storageManager.set({
        'ai_threshold_adjustment': -0.05 // Decrease threshold by 0.05
      });
    }

    logger.info('Retraining complete:', stats);
  }

  /**
   * Analyze feedback data for statistics
   * @returns {Object} - Feedback statistics
   */
  analyzeFeedback() {
    let approved = 0;
    let falsePositives = 0;
    let misses = 0;
    let whitelisted = 0;

    for (const feedback of this.feedbackData) {
      switch (feedback.action) {
        case 'approve_block':
          approved++;
          break;
        case 'false_positive':
          falsePositives++;
          break;
        case 'report_miss':
          misses++;
          break;
        case 'whitelist':
          whitelisted++;
          break;
      }
    }

    const total = this.feedbackData.length || 1;

    return {
      total,
      approved,
      falsePositives,
      misses,
      whitelisted,
      approvalRate: approved / total,
      falsePositiveRate: falsePositives / total,
      missRate: misses / total,
      accuracy: approved / (approved + falsePositives || 1)
    };
  }

  /**
   * Get learning statistics
   * @returns {Object} - Learning stats
   */
  getStats() {
    const feedback = this.analyzeFeedback();

    return {
      feedbackCount: this.feedbackCount,
      domainsLearned: this.domainConfidence.size,
      patternsLearned: this.patternWeights.size,
      ...feedback,
      topPatterns: this.getTopPatterns(10),
      topDomains: this.getTopDomains(10)
    };
  }

  /**
   * Get top weighted patterns
   * @param {number} limit - Number of patterns to return
   * @returns {Array} - Top patterns
   */
  getTopPatterns(limit = 10) {
    return Array.from(this.patternWeights.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([pattern, weight]) => ({ pattern, weight }));
  }

  /**
   * Get top confidence domains
   * @param {number} limit - Number of domains to return
   * @returns {Array} - Top domains
   */
  getTopDomains(limit = 10) {
    return Array.from(this.domainConfidence.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([domain, confidence]) => ({ domain, confidence }));
  }

  /**
   * Export learning data for backup
   * @returns {Object} - Learning data
   */
  exportData() {
    return {
      feedbackData: this.feedbackData,
      domainConfidence: Array.from(this.domainConfidence.entries()),
      patternWeights: Array.from(this.patternWeights.entries()),
      feedbackCount: this.feedbackCount,
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import learning data from backup
   * @param {Object} data - Learning data
   */
  async importData(data) {
    this.feedbackData = data.feedbackData || [];
    this.domainConfidence = new Map(data.domainConfidence || []);
    this.patternWeights = new Map(data.patternWeights || []);
    this.feedbackCount = data.feedbackCount || 0;

    await this.save();

    logger.info('Learning data imported:', {
      feedbackCount: this.feedbackCount
    });
  }

  /**
   * Save learning data to storage
   */
  async save() {
    await storageManager.set({
      learningData: {
        feedbackData: this.feedbackData,
        domainConfidence: Array.from(this.domainConfidence.entries()),
        patternWeights: Array.from(this.patternWeights.entries()),
        feedbackCount: this.feedbackCount
      }
    });
  }

  /**
   * Reset all learning data
   */
  async reset() {
    this.feedbackData = [];
    this.domainConfidence.clear();
    this.patternWeights.clear();
    this.feedbackCount = 0;

    await this.save();

    logger.info('Learning data reset');
  }

  /**
   * Cleanup old feedback data (keep last 1000)
   */
  async cleanup() {
    if (this.feedbackData.length > 1000) {
      // Keep only most recent 1000 feedbacks
      this.feedbackData = this.feedbackData.slice(-1000);
      await this.save();

      logger.info('Cleaned up old feedback data');
    }

    // Remove low-confidence domains (haven't been seen in 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    for (const [domain, confidence] of this.domainConfidence.entries()) {
      // Find last feedback for this domain
      const lastFeedback = this.feedbackData
        .reverse()
        .find(f => f.domain === domain);

      if (!lastFeedback || lastFeedback.timestamp < thirtyDaysAgo) {
        this.domainConfidence.delete(domain);
      }
    }

    await this.save();
  }

  /**
   * Record a trusted site (called by trusted-sites-manager)
   * @param {string} domain - Domain to mark as trusted
   */
  async recordTrustedSite(domain) {
    // Set confidence to 0.0 (trusted, no blocking)
    this.domainConfidence.set(domain, 0.0);

    logger.info('Trusted site recorded:', domain);

    await this.save();
  }

  /**
   * Record a new technique detected
   * @param {string} pattern - Pattern detected
   * @param {number} confidence - Confidence in pattern (0-1)
   */
  async recordNewTechnique(pattern, confidence) {
    // Initialize new pattern with conservative weight
    const initialWeight = 0.5;

    console.log('[LearningEngine] recordNewTechnique called:', { pattern, confidence, alreadyExists: this.patternWeights.has(pattern) });

    if (!this.patternWeights.has(pattern)) {
      this.patternWeights.set(pattern, initialWeight);

      logger.info('New technique learned:', {
        pattern,
        confidence,
        initialWeight
      });

      console.log('[LearningEngine] New technique added! Total patterns now:', this.patternWeights.size);

      await this.save();

      // Notify about new technique
      try {
        await browser.runtime.sendMessage({
          type: 'NEW_TECHNIQUE_LEARNED',
          pattern,
          confidence
        });
      } catch (error) {
        logger.debug('Could not send new technique notification');
      }
    }
  }

  /**
   * Record a breakage fix (called by false-positive-tracker)
   * @param {string} domain - Domain that was fixed
   * @param {string} pattern - Pattern that was adjusted
   */
  async recordBreakageFix(domain, pattern) {
    // Record as feedback
    await this.recordFeedback(domain, 'false_positive', {
      pattern,
      autoFixed: true
    });

    logger.info('Breakage fix recorded:', { domain, pattern });
  }

  /**
   * Record a threat pattern (called by threat-detector)
   * @param {string} domain - Domain with threat
   * @param {string} threatType - Type of threat (malware, phishing, etc.)
   * @param {number} confidence - Confidence in threat (0-1)
   */
  async recordThreatPattern(domain, threatType, confidence) {
    // Record as high-confidence block
    this.domainConfidence.set(domain, confidence);

    // Increase weight for threat-related patterns
    const threatPattern = `threat:${threatType}`;
    const currentWeight = this.patternWeights.get(threatPattern) || 1.0;
    this.patternWeights.set(threatPattern, Math.min(currentWeight + 0.1, 2.0));

    logger.info('Threat pattern learned:', {
      domain,
      threatType,
      confidence
    });

    await this.save();
  }

  /**
   * Update a specific pattern weight (called by false-positive-tracker)
   * @param {string} pattern - Pattern to update
   * @param {number} newWeight - New weight value
   */
  async updatePatternWeight(pattern, newWeight) {
    this.patternWeights.set(pattern, newWeight);

    logger.debug('Pattern weight updated:', {
      pattern,
      newWeight
    });

    await this.save();
  }

  /**
   * Get learning summary for UI display
   * Integrates stats from all learning modules
   * @returns {Promise<Object>} - Learning summary
   */
  async getLearningSummary() {
    // CRITICAL: Reload from storage first to ensure we have latest data
    // Service worker may have restarted, clearing in-memory Maps
    console.log('[LearningEngine] getLearningSummary - Reloading from storage first...');
    const stored = await storageManager.get('learningData');
    if (stored) {
      this.patternWeights = new Map(stored.patternWeights || []);
      this.domainConfidence = new Map(stored.domainConfidence || []);
      console.log('[LearningEngine] Reloaded from storage:', {
        patterns: this.patternWeights.size,
        domains: this.domainConfidence.size
      });
    }

    // Import modules dynamically to avoid circular dependencies
    let trustedSitesManager, falsePositiveTracker;

    try {
      trustedSitesManager = (await import('./trusted-sites-manager.js')).default;
      falsePositiveTracker = (await import('./false-positive-tracker.js')).default;
    } catch (error) {
      logger.debug('Could not import learning modules for summary');
      return {
        trustedSitesCount: 0,
        newTechniquesDetected: 0,
        autoFixedSites: 0,
        threatPatternsLearned: 0
      };
    }

    // Get stats from all modules
    const trustedStats = trustedSitesManager.getStats();
    const fpStats = falsePositiveTracker.getStats();

    // Count new techniques (patterns with weight < 0.7 are "new")
    const allPatterns = Array.from(this.patternWeights.entries());
    const newTechniques = allPatterns
      .filter(([_, weight]) => weight < 0.7)
      .length;

    // Count threat patterns
    const threatPatterns = allPatterns
      .filter(([pattern, _]) => pattern.startsWith('threat:'))
      .length;

    // Debug logging
    console.log('[LearningEngine] getLearningSummary DEBUG:', {
      totalPatterns: this.patternWeights.size,
      allPatterns: allPatterns.map(([p, w]) => `${p}=${w}`),
      newTechniques,
      threatPatterns,
      trustedSitesCount: trustedStats.totalTrustedSites,
      autoFixedSites: fpStats.autoFixedSites
    });

    return {
      trustedSitesCount: trustedStats.totalTrustedSites,
      newTechniquesDetected: newTechniques,
      autoFixedSites: fpStats.autoFixedSites,
      threatPatternsLearned: threatPatterns,
      totalPatternsLearned: this.patternWeights.size,
      totalDomainsLearned: this.domainConfidence.size,
      learningAccuracy: this.getStats().accuracy
    };
  }
}

// Export singleton instance
const learningEngine = new LearningEngine();
export default learningEngine;
export { LearningEngine };
