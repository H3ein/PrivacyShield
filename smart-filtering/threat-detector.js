// PrivacyShield Max - Threat Detector
// Heuristic threat detection using behavioral analysis

import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';
import learningEngine from './learning-engine.js';

class ThreatDetector {
  constructor() {
    this.detectedThreats = new Map();
    this.confidence = {};
    this.enabled = true;
    this.sensitivity = 5; // 0-10 scale
  }

  /**
   * Initialize threat detector
   */
  async initialize() {
    const settings = await storageManager.getSettings();
    this.enabled = settings.smartFiltering?.enabled !== false;
    this.sensitivity = settings.smartFiltering?.sensitivity || 5;

    logger.info('Threat detector initialized', {
      enabled: this.enabled,
      sensitivity: this.sensitivity
    });
  }

  /**
   * Analyze domain for threats
   * @param {string} domain - Domain to analyze
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Threat analysis result
   */
  async analyzeDomain(domain, context = {}) {
    if (!this.enabled) {
      return { isThreat: false };
    }

    const checks = {
      suspiciousTLD: this.checkSuspiciousTLD(domain),
      homoglyph: this.checkHomoglyphAttack(domain),
      excessiveSubdomains: this.checkExcessiveSubdomains(domain),
      randomPattern: this.checkRandomPattern(domain),
      knownMalware: await this.checkKnownMalware(domain),
      typosquatting: this.checkTyposquatting(domain)
    };

    // Calculate confidence score
    let score = 0;
    let reasons = [];

    if (checks.suspiciousTLD.suspicious) {
      score += 20;
      reasons.push('Suspicious TLD: ' + checks.suspiciousTLD.tld);
    }

    if (checks.homoglyph.detected) {
      score += 40;
      reasons.push('Homoglyph attack detected');
    }

    if (checks.excessiveSubdomains) {
      score += 15;
      reasons.push('Excessive subdomains');
    }

    if (checks.randomPattern) {
      score += 25;
      reasons.push('Random domain pattern');
    }

    if (checks.knownMalware) {
      score += 80;
      reasons.push('Known malware domain');
    }

    if (checks.typosquatting.detected) {
      score += 35;
      reasons.push('Typosquatting: ' + checks.typosquatting.target);
    }

    const confidence = Math.min(score / 100, 1.0);
    const threshold = 0.5 - (this.sensitivity * 0.05); // Sensitivity affects threshold

    const isThreat = confidence >= threshold;

    if (isThreat) {
      this.detectedThreats.set(domain, {
        confidence,
        reasons,
        timestamp: Date.now()
      });

      logger.warn('Threat detected:', {
        domain,
        confidence,
        reasons
      });

      // Record threat pattern to learning engine for stats
      // Determine primary threat type from reasons
      let threatType = 'unknown';
      if (checks.knownMalware) {
        threatType = 'malware';
      } else if (checks.typosquatting.detected) {
        threatType = 'phishing';
      } else if (checks.homoglyph.detected) {
        threatType = 'phishing';
      } else if (checks.suspiciousTLD.suspicious) {
        threatType = 'suspicious_tld';
      } else if (checks.randomPattern) {
        threatType = 'dga'; // Domain Generation Algorithm
      }

      // Record to learning engine
      try {
        learningEngine.recordThreatPattern(domain, threatType, confidence);
      } catch (error) {
        logger.debug('Could not record threat pattern:', error.message);
      }
    }

    return {
      isThreat,
      confidence,
      reasons,
      shouldBlock: isThreat && confidence >= 0.7
    };
  }

  /**
   * Check for suspicious TLDs
   * @param {string} domain - Domain to check
   * @returns {Object} - { suspicious, tld }
   */
  checkSuspiciousTLD(domain) {
    const suspiciousTLDs = [
      '.tk', '.ml', '.ga', '.cf', '.gq',      // Free domains often used for phishing
      '.pw', '.cc', '.ws', '.to', '.nu',      // Suspicious TLDs
      '.xyz', '.top', '.work', '.click',      // Often used for spam
      '.date', '.download', '.stream', '.win', // Malware-associated
      '.men', '.loan', '.review', '.trade'    // Scam-associated
    ];

    for (const tld of suspiciousTLDs) {
      if (domain.endsWith(tld)) {
        return { suspicious: true, tld };
      }
    }

    return { suspicious: false };
  }

  /**
   * Check for homoglyph attacks (lookalike characters)
   * @param {string} domain - Domain to check
   * @returns {Object} - { detected, details }
   */
  checkHomoglyphAttack(domain) {
    // Common homoglyph substitutions
    const homoglyphs = [
      { normal: 'a', lookalike: ['а', 'ạ', 'ą'] },     // Cyrillic a
      { normal: 'e', lookalike: ['е', 'ė', 'ę'] },     // Cyrillic e
      { normal: 'o', lookalike: ['о', 'ο', 'ọ'] },     // Cyrillic o
      { normal: 'i', lookalike: ['і', 'ı', 'ị'] },     // Cyrillic i
      { normal: 'c', lookalike: ['с', 'ċ'] },          // Cyrillic c
      { normal: 'p', lookalike: ['р'] },               // Cyrillic p
      { normal: 'x', lookalike: ['х'] },               // Cyrillic x
      { normal: 'y', lookalike: ['у', 'ү'] },          // Cyrillic y
      { normal: '0', lookalike: ['о', 'ο'] },          // Zero vs letter O
      { normal: '1', lookalike: ['l', 'і'] }           // One vs letter l
    ];

    for (const { normal, lookalike } of homoglyphs) {
      for (const char of lookalike) {
        if (domain.includes(char)) {
          return {
            detected: true,
            character: char,
            normalCharacter: normal
          };
        }
      }
    }

    return { detected: false };
  }

  /**
   * Check for excessive subdomains
   * @param {string} domain - Domain to check
   * @returns {boolean} - True if excessive subdomains
   */
  checkExcessiveSubdomains(domain) {
    const parts = domain.split('.');

    // More than 4 parts is suspicious (e.g., a.b.c.d.example.com)
    return parts.length > 4;
  }

  /**
   * Check for random domain pattern
   * @param {string} domain - Domain to check
   * @returns {boolean} - True if random pattern detected
   */
  checkRandomPattern(domain) {
    // Extract domain name without TLD
    const domainParts = domain.split('.');
    const domainName = domainParts[domainParts.length - 2] || domain;

    // Check for long random strings
    if (domainName.length > 15) {
      // Calculate entropy (randomness)
      const entropy = this.calculateEntropy(domainName);

      // High entropy indicates random characters
      if (entropy > 3.5) {
        return true;
      }
    }

    // Check for patterns like: ads123456789.com
    if (/\d{6,}/.test(domainName)) {
      return true;
    }

    // Check for vowel/consonant ratio (real words have certain ratios)
    const vowels = domainName.match(/[aeiou]/gi) || [];
    const consonants = domainName.match(/[bcdfghjklmnpqrstvwxyz]/gi) || [];

    if (consonants.length > 0) {
      const ratio = vowels.length / consonants.length;

      // Suspicious if very low vowel ratio
      if (ratio < 0.2 && domainName.length > 8) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate Shannon entropy
   * @param {string} str - String to analyze
   * @returns {number} - Entropy value
   */
  calculateEntropy(str) {
    const freq = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;

    for (const char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Check against known malware domains
   * @param {string} domain - Domain to check
   * @returns {Promise<boolean>} - True if known malware
   */
  async checkKnownMalware(domain) {
    // Load malware domain list from storage
    const malwareList = await storageManager.get('malwareDomains') || [];

    // Check exact match
    if (malwareList.includes(domain)) {
      return true;
    }

    // Check substring match for base domain
    const baseDomain = this.extractBaseDomain(domain);
    return malwareList.some(malware => baseDomain.includes(malware));
  }

  /**
   * Check for typosquatting (common domain misspellings)
   * @param {string} domain - Domain to check
   * @returns {Object} - { detected, target }
   */
  checkTyposquatting(domain) {
    // Popular domains to check against
    const popularDomains = [
      'google.com', 'facebook.com', 'amazon.com', 'paypal.com',
      'apple.com', 'microsoft.com', 'netflix.com', 'twitter.com',
      'instagram.com', 'linkedin.com', 'ebay.com', 'walmart.com',
      'bankofamerica.com', 'chase.com', 'wellsfargo.com'
    ];

    const baseDomain = this.extractBaseDomain(domain);

    for (const popular of popularDomains) {
      const distance = this.levenshteinDistance(baseDomain, popular);

      // If distance is 1-2, likely typosquatting
      if (distance > 0 && distance <= 2) {
        return {
          detected: true,
          target: popular,
          distance
        };
      }
    }

    return { detected: false };
  }

  /**
   * Calculate Levenshtein distance (edit distance)
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} - Edit distance
   */
  levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Extract base domain from full domain
   * @param {string} domain - Full domain
   * @returns {string} - Base domain
   */
  extractBaseDomain(domain) {
    const parts = domain.split('.');

    // Handle special TLDs like .co.uk
    if (parts.length >= 3 && parts[parts.length - 2].length <= 3) {
      return parts.slice(-3).join('.');
    }

    return parts.slice(-2).join('.');
  }

  /**
   * Get all detected threats
   * @returns {Array} - Array of threats
   */
  getDetectedThreats() {
    return Array.from(this.detectedThreats.entries()).map(([domain, data]) => ({
      domain,
      ...data
    }));
  }

  /**
   * Clear threat history
   */
  clearThreats() {
    this.detectedThreats.clear();
    logger.debug('Threat history cleared');
  }

  /**
   * Set sensitivity level
   * @param {number} sensitivity - Sensitivity (0-10)
   */
  setSensitivity(sensitivity) {
    if (sensitivity < 0 || sensitivity > 10) {
      throw new Error('Sensitivity must be between 0 and 10');
    }

    this.sensitivity = sensitivity;
    logger.info('Threat sensitivity set to:', sensitivity);
  }
}

// Export singleton instance
const threatDetector = new ThreatDetector();
export default threatDetector;
export { ThreatDetector };
