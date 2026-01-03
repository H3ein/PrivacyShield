// PrivacyShield Max - Protection Level Manager
// Manages conservative → moderate → aggressive protection progression

import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';

class ProtectionLevelManager {
  constructor() {
    this.currentLevel = 'conservative';  // Start conservative
    this.confidenceThreshold = 0.40;     // Current threshold for blocking
    this.autoBlockThreshold = 0.85;      // Threshold for auto-blocking

    // Protection level definitions
    this.levels = {
      conservative: {
        id: 'conservative',
        name: 'Conservative',
        confidenceThreshold: 0.40,
        autoBlock: false,              // No auto-block in conservative mode
        requireConfirmation: true,
        description: 'Block obvious threats only',
        icon: '🛡️'
      },
      moderate: {
        id: 'moderate',
        name: 'Moderate',
        confidenceThreshold: 0.60,
        autoBlock: true,               // Auto-block at 85%+ confidence
        requireConfirmation: false,
        description: 'Balanced protection',
        icon: '🔰'
      },
      aggressive: {
        id: 'aggressive',
        name: 'Aggressive',
        confidenceThreshold: 0.75,
        autoBlock: true,
        requireConfirmation: false,
        description: 'Maximum protection',
        icon: '⚔️'
      }
    };

    // Progression tracking
    this.progression = {
      installDate: null,             // When extension was installed
      timeUsed: 0,                   // Total time in milliseconds
      threatsBlocked: 0,             // Total threats blocked
      falsePositives: 0,             // False positives encountered
      userFeedback: 0,               // User feedback events
      lastLevelChange: null,         // When level last changed
      manualOverride: false          // User manually set level
    };

    // Auto-progression enabled by default
    this.autoProgression = true;
  }

  /**
   * Initialize protection level manager
   */
  async initialize() {
    const stored = await storageManager.get('protectionLevel');

    if (stored) {
      this.currentLevel = stored.currentLevel || 'conservative';
      this.confidenceThreshold = stored.confidenceThreshold || 0.40;
      this.progression = stored.progression || this.progression;
      this.autoProgression = stored.autoProgression !== false;
    } else {
      // First install - set install date
      this.progression.installDate = Date.now();
    }

    // Update confidence threshold based on current level
    const levelConfig = this.levels[this.currentLevel];
    if (levelConfig) {
      this.confidenceThreshold = levelConfig.confidenceThreshold;
    }

    logger.info('Protection Level Manager initialized', {
      currentLevel: this.currentLevel,
      confidenceThreshold: this.confidenceThreshold,
      autoProgression: this.autoProgression
    });

    await this.save();
  }

  /**
   * Update progression metrics
   * @param {string} event - Event type (threat_blocked, false_positive, user_feedback)
   * @param {Object} data - Event data
   */
  async updateProgression(event, data = {}) {
    switch (event) {
      case 'threat_blocked':
        this.progression.threatsBlocked++;
        break;

      case 'false_positive':
        this.progression.falsePositives++;
        break;

      case 'user_feedback':
        this.progression.userFeedback++;
        break;

      case 'time_used':
        this.progression.timeUsed += (data.duration || 0);
        break;
    }

    // Check if should progress to next level
    if (this.autoProgression && !this.progression.manualOverride) {
      const shouldProgress = this.shouldProgressToNextLevel();
      if (shouldProgress) {
        await this.progressToNextLevel();
      }
    }

    await this.save();
  }

  /**
   * Check if should progress to next level
   * @returns {boolean} - True if should progress
   */
  shouldProgressToNextLevel() {
    const daysSinceInstall = this.getDaysSinceInstall();
    const falsePositiveRate = this.getFalsePositiveRate();

    // Conservative → Moderate: After 7 days OR 100+ threats blocked
    if (this.currentLevel === 'conservative') {
      const sevenDaysPassed = daysSinceInstall >= 7;
      const enoughThreats = this.progression.threatsBlocked >= 100;

      return sevenDaysPassed || enoughThreats;
    }

    // Moderate → Aggressive: After 30 days AND low false positive rate (<5%)
    if (this.currentLevel === 'moderate') {
      const thirtyDaysPassed = daysSinceInstall >= 30;
      const lowFalsePositives = falsePositiveRate < 0.05;

      return thirtyDaysPassed && lowFalsePositives;
    }

    // Already at max level
    return false;
  }

  /**
   * Progress to next protection level
   */
  async progressToNextLevel() {
    const nextLevel = this.getNextLevel();
    if (!nextLevel) {
      logger.debug('Already at maximum protection level');
      return;
    }

    const previousLevel = this.currentLevel;
    await this.setLevel(nextLevel, false); // false = not manual override

    // Show notification to user
    await this.notifyUser(
      'Protection Upgraded',
      this.getProgressionMessage(previousLevel, nextLevel)
    );

    logger.info(`Protection level progressed: ${previousLevel} → ${nextLevel}`);
  }

  /**
   * Get next protection level
   * @returns {string|null} - Next level ID or null if at max
   */
  getNextLevel() {
    if (this.currentLevel === 'conservative') return 'moderate';
    if (this.currentLevel === 'moderate') return 'aggressive';
    return null; // Already at max
  }

  /**
   * Set protection level
   * @param {string} level - Level ID (conservative, moderate, aggressive)
   * @param {boolean} manualOverride - True if user manually set it
   */
  async setLevel(level, manualOverride = true) {
    if (!this.levels[level]) {
      logger.error('Invalid protection level:', level);
      return;
    }

    const previousLevel = this.currentLevel;
    this.currentLevel = level;
    this.confidenceThreshold = this.levels[level].confidenceThreshold;

    // Track if this was a manual override
    if (manualOverride) {
      this.progression.manualOverride = true;
      logger.info('User manually set protection level to', level);
    }

    this.progression.lastLevelChange = Date.now();

    await this.save();

    // Notify other components about level change
    try {
      await browser.runtime.sendMessage({
        type: 'PROTECTION_LEVEL_CHANGED',
        level: level,
        previousLevel: previousLevel,
        manual: manualOverride
      });
    } catch (error) {
      logger.debug('Could not send level change message:', error.message);
    }
  }

  /**
   * Enable or disable auto-progression
   * @param {boolean} enabled - True to enable auto-progression
   */
  async setAutoProgression(enabled) {
    this.autoProgression = enabled;

    if (enabled) {
      // Re-enable auto progression and clear manual override
      this.progression.manualOverride = false;
      logger.info('Auto-progression enabled');
    } else {
      logger.info('Auto-progression disabled');
    }

    await this.save();
  }

  /**
   * Check if request should be auto-blocked
   * @param {number} confidence - Confidence score (0-1)
   * @returns {boolean} - True if should auto-block
   */
  shouldAutoBlock(confidence) {
    const level = this.levels[this.currentLevel];

    // Auto-block only if:
    // 1. Current level allows auto-blocking
    // 2. Confidence meets the auto-block threshold (85%)
    return level.autoBlock && confidence >= this.autoBlockThreshold;
  }

  /**
   * Check if request should be blocked based on current threshold
   * @param {number} confidence - Confidence score (0-1)
   * @returns {boolean} - True if should block
   */
  shouldBlock(confidence) {
    return confidence >= this.confidenceThreshold;
  }

  /**
   * Get current protection level configuration
   * @returns {Object} - Level configuration
   */
  getCurrentLevel() {
    return {
      ...this.levels[this.currentLevel],
      isMaxLevel: this.currentLevel === 'aggressive',
      nextLevel: this.getNextLevel(),
      daysUntilNext: this.getDaysUntilNextLevel()
    };
  }

  /**
   * Get all protection levels
   * @returns {Object} - All levels
   */
  getAllLevels() {
    return this.levels;
  }

  /**
   * Get current confidence threshold
   * @returns {number} - Confidence threshold (0-1)
   */
  getCurrentThreshold() {
    return this.confidenceThreshold;
  }

  /**
   * Get days since installation
   * @returns {number} - Days since install
   */
  getDaysSinceInstall() {
    if (!this.progression.installDate) {
      return 0;
    }
    const milliseconds = Date.now() - this.progression.installDate;
    return milliseconds / (1000 * 60 * 60 * 24);
  }

  /**
   * Get false positive rate
   * @returns {number} - False positive rate (0-1)
   */
  getFalsePositiveRate() {
    const total = this.progression.threatsBlocked + this.progression.falsePositives;
    if (total === 0) return 0;
    return this.progression.falsePositives / total;
  }

  /**
   * Get days until next level (estimated)
   * @returns {number|null} - Days until next level or null if at max
   */
  getDaysUntilNextLevel() {
    const daysSinceInstall = this.getDaysSinceInstall();

    if (this.currentLevel === 'conservative') {
      // Need 7 days total
      const daysNeeded = 7 - daysSinceInstall;

      // Or 100 threats - estimate days based on current rate
      if (this.progression.threatsBlocked > 0) {
        const threatsPerDay = this.progression.threatsBlocked / daysSinceInstall;
        const threatsNeeded = 100 - this.progression.threatsBlocked;
        const daysViaThreats = threatsNeeded / threatsPerDay;

        return Math.max(0, Math.min(daysNeeded, daysViaThreats));
      }

      return Math.max(0, daysNeeded);
    }

    if (this.currentLevel === 'moderate') {
      // Need 30 days total AND low FP rate
      const daysNeeded = 30 - daysSinceInstall;
      const fpRate = this.getFalsePositiveRate();

      if (fpRate >= 0.05) {
        return null; // Can't progress until FP rate improves
      }

      return Math.max(0, daysNeeded);
    }

    return null; // Already at max
  }

  /**
   * Get progression message for level change
   * @param {string} from - Previous level
   * @param {string} to - New level
   * @returns {string} - Message
   */
  getProgressionMessage(from, to) {
    if (to === 'moderate') {
      return 'You\'re now at Moderate protection level. More threats will be blocked automatically.';
    }
    if (to === 'aggressive') {
      return 'Maximum protection reached! Aggressive protection is now active. You\'re getting the best privacy possible.';
    }
    return `Protection level updated to ${this.levels[to].name}`;
  }

  /**
   * Get statistics for UI
   * @returns {Object} - Stats
   */
  getStats() {
    return {
      currentLevel: this.currentLevel,
      levelName: this.levels[this.currentLevel].name,
      levelIcon: this.levels[this.currentLevel].icon,
      confidenceThreshold: this.confidenceThreshold,
      autoBlockEnabled: this.levels[this.currentLevel].autoBlock,
      daysSinceInstall: Math.floor(this.getDaysSinceInstall()),
      threatsBlocked: this.progression.threatsBlocked,
      falsePositiveRate: this.getFalsePositiveRate(),
      nextLevel: this.getNextLevel(),
      daysUntilNext: this.getDaysUntilNextLevel(),
      autoProgression: this.autoProgression,
      manualOverride: this.progression.manualOverride,
      progress: this.getProgressPercentage()
    };
  }

  /**
   * Get progress percentage to next level
   * @returns {number} - Progress percentage (0-100)
   */
  getProgressPercentage() {
    if (this.currentLevel === 'aggressive') {
      return 100; // At max
    }

    const daysSinceInstall = this.getDaysSinceInstall();

    if (this.currentLevel === 'conservative') {
      // Progress to moderate at 7 days OR 100 threats
      const timeProgress = (daysSinceInstall / 7) * 100;
      const threatProgress = (this.progression.threatsBlocked / 100) * 100;
      return Math.min(100, Math.max(timeProgress, threatProgress));
    }

    if (this.currentLevel === 'moderate') {
      // Progress to aggressive at 30 days AND <5% FP
      const timeProgress = (daysSinceInstall / 30) * 100;
      const fpRate = this.getFalsePositiveRate();

      // Penalty if FP rate is high
      if (fpRate >= 0.05) {
        return Math.min(75, timeProgress); // Cap at 75% if FP rate high
      }

      return Math.min(100, timeProgress);
    }

    return 0;
  }

  /**
   * Notify user about level change
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  async notifyUser(title, message) {
    try {
      await browser.runtime.sendMessage({
        type: 'PROTECTION_LEVEL_NOTIFICATION',
        title: title,
        message: message
      });
    } catch (error) {
      logger.debug('Could not send notification:', error.message);
    }
  }

  /**
   * Save to storage
   */
  async save() {
    await storageManager.set({
      protectionLevel: {
        currentLevel: this.currentLevel,
        confidenceThreshold: this.confidenceThreshold,
        progression: this.progression,
        autoProgression: this.autoProgression
      }
    });
  }

  /**
   * Reset to conservative level
   */
  async reset() {
    this.currentLevel = 'conservative';
    this.confidenceThreshold = 0.40;
    this.progression = {
      installDate: Date.now(),
      timeUsed: 0,
      threatsBlocked: 0,
      falsePositives: 0,
      userFeedback: 0,
      lastLevelChange: null,
      manualOverride: false
    };
    this.autoProgression = true;

    await this.save();

    logger.info('Protection level reset to conservative');
  }

  /**
   * Export data for backup
   * @returns {Object} - Export data
   */
  exportData() {
    return {
      currentLevel: this.currentLevel,
      confidenceThreshold: this.confidenceThreshold,
      progression: this.progression,
      autoProgression: this.autoProgression,
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import data from backup
   * @param {Object} data - Import data
   */
  async importData(data) {
    this.currentLevel = data.currentLevel || 'conservative';
    this.confidenceThreshold = data.confidenceThreshold || 0.40;
    this.progression = data.progression || this.progression;
    this.autoProgression = data.autoProgression !== false;

    await this.save();

    logger.info('Protection level data imported');
  }
}

// Export singleton instance
const protectionLevelManager = new ProtectionLevelManager();
export default protectionLevelManager;
export { ProtectionLevelManager };
