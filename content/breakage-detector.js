// PrivacyShield Max - Breakage Detector
// Detect broken websites and auto-fix with user notification

import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';

class BreakageDetector {
  constructor() {
    this.domain = window.location.hostname;
    this.errors = [];
    this.warnings = [];
    this.checks = {
      jsErrors: 0,
      networkErrors: 0,
      missingContent: false,
      brokenLayout: false,
      unboundEvents: 0
    };
    this.enabled = true;
  }

  /**
   * Initialize breakage detector
   */
  async initialize() {
    const settings = await storageManager.getSettings();
    this.enabled = settings.breakageTolerance !== 'none';

    if (!this.enabled) {
      logger.info('Breakage detection disabled');
      return;
    }

    // Start monitoring
    this.monitorJSErrors();
    this.monitorNetworkErrors();
    this.checkPageLoad();

    logger.info('Breakage detector initialized');
  }

  /**
   * Monitor JavaScript errors
   */
  monitorJSErrors() {
    window.addEventListener('error', (event) => {
      this.checks.jsErrors++;

      this.errors.push({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        timestamp: Date.now()
      });

      logger.debug('JS error detected:', event.message);

      // Check if error threshold exceeded
      if (this.checks.jsErrors >= 5) {
        this.handleBreakage('Multiple JavaScript errors detected');
      }
    }, true);

    // Also monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.checks.jsErrors++;

      this.errors.push({
        type: 'promise_rejection',
        message: event.reason,
        timestamp: Date.now()
      });

      logger.debug('Unhandled promise rejection:', event.reason);
    });
  }

  /**
   * Monitor network errors
   */
  monitorNetworkErrors() {
    // Override fetch to detect failed requests
    const originalFetch = window.fetch;

    window.fetch = function(...args) {
      return originalFetch.apply(this, args)
        .catch(error => {
          this.checks.networkErrors++;

          this.errors.push({
            type: 'network',
            url: args[0],
            error: error.message,
            timestamp: Date.now()
          });

          logger.debug('Network error:', args[0]);

          // Propagate error
          throw error;
        });
    }.bind(this);

    // Monitor resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window && event.target.tagName) {
        this.checks.networkErrors++;

        this.errors.push({
          type: 'resource',
          tag: event.target.tagName,
          src: event.target.src || event.target.href,
          timestamp: Date.now()
        });

        logger.debug('Resource loading error:', event.target.src);
      }
    }, true);
  }

  /**
   * Check page load status
   */
  checkPageLoad() {
    // Wait for page load
    if (document.readyState === 'complete') {
      this.performChecks();
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.performChecks();
        }, 2000); // Wait 2 seconds after load
      });
    }
  }

  /**
   * Perform comprehensive breakage checks
   */
  performChecks() {
    this.checkMissingContent();
    this.checkBrokenLayout();
    this.checkUnboundEvents();

    // Evaluate overall breakage
    const breakageLevel = this.evaluateBreakage();

    if (breakageLevel === 'severe') {
      this.handleBreakage('Severe site breakage detected');
    } else if (breakageLevel === 'moderate') {
      this.warnings.push('Moderate site issues detected');
      logger.warn('Moderate breakage detected on', this.domain);
    }
  }

  /**
   * Check for missing content
   */
  checkMissingContent() {
    const body = document.body;

    if (!body) {
      this.checks.missingContent = true;
      return;
    }

    // Check if body is mostly empty
    const textContent = body.innerText || '';
    const trimmedContent = textContent.trim();

    if (trimmedContent.length < 50) {
      this.checks.missingContent = true;
      logger.warn('Page has very little content');
    }

    // Check for common content elements
    const hasContent =
      document.querySelector('main, article, .content, #content, .main') ||
      document.querySelectorAll('p').length > 3;

    if (!hasContent) {
      this.checks.missingContent = true;
      logger.warn('Page missing main content elements');
    }
  }

  /**
   * Check for broken layout
   */
  checkBrokenLayout() {
    // Check for elements with zero dimensions (collapsed layout)
    const mainContainers = document.querySelectorAll(
      'main, article, .container, .content, #content'
    );

    let collapsedCount = 0;

    mainContainers.forEach(container => {
      const rect = container.getBoundingClientRect();
      if (rect.height === 0 || rect.width === 0) {
        collapsedCount++;
      }
    });

    if (collapsedCount > 0) {
      this.checks.brokenLayout = true;
      logger.warn(`${collapsedCount} collapsed layout containers detected`);
    }

    // Check for overlapping elements (sign of broken layout)
    const elementsAboveFold = Array.from(document.querySelectorAll('div, section'))
      .filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.top >= 0 && rect.top < window.innerHeight;
      });

    // Simple overlap check (not comprehensive)
    if (elementsAboveFold.length > 50) {
      this.checks.brokenLayout = true;
      logger.warn('Excessive element density detected');
    }
  }

  /**
   * Check for unbound click events (sign of broken interactivity)
   */
  checkUnboundEvents() {
    // Check for buttons and links without event listeners
    const interactiveElements = document.querySelectorAll(
      'button, a[href="#"], a[href^="javascript:"]'
    );

    interactiveElements.forEach(element => {
      // Check if element has onclick or event listeners
      if (!element.onclick && !element.hasAttribute('data-event-bound')) {
        this.checks.unboundEvents++;
      }
    });

    if (this.checks.unboundEvents > 10) {
      logger.warn(`${this.checks.unboundEvents} potentially unbound interactive elements`);
    }
  }

  /**
   * Evaluate overall breakage level
   * @returns {string} - Breakage level: 'none', 'moderate', 'severe'
   */
  evaluateBreakage() {
    let score = 0;

    // JavaScript errors
    if (this.checks.jsErrors >= 10) score += 3;
    else if (this.checks.jsErrors >= 5) score += 2;
    else if (this.checks.jsErrors >= 2) score += 1;

    // Network errors
    if (this.checks.networkErrors >= 5) score += 2;
    else if (this.checks.networkErrors >= 2) score += 1;

    // Missing content
    if (this.checks.missingContent) score += 3;

    // Broken layout
    if (this.checks.brokenLayout) score += 2;

    // Unbound events
    if (this.checks.unboundEvents >= 20) score += 2;
    else if (this.checks.unboundEvents >= 10) score += 1;

    // Evaluate score
    if (score >= 5) return 'severe';
    if (score >= 3) return 'moderate';
    return 'none';
  }

  /**
   * Handle detected breakage
   * @param {string} reason - Breakage reason
   */
  async handleBreakage(reason) {
    logger.warn('Site breakage detected:', reason);

    const settings = await storageManager.getSettings();

    // Check if already whitelisted
    if (await storageManager.isWhitelisted(this.domain)) {
      logger.info('Site already whitelisted, skipping auto-fix');
      return;
    }

    // Auto-fix: temporarily disable blocking
    if (settings.breakageTolerance === 'auto-fix') {
      await this.autoFix();
    }

    // Notify user
    this.notifyUser(reason);
  }

  /**
   * Auto-fix: temporarily whitelist domain
   */
  async autoFix() {
    // Add to temporary whitelist (1 hour)
    await storageManager.addToTemporaryWhitelist(this.domain, 3600000);

    logger.info(`Auto-fix: ${this.domain} temporarily whitelisted for 1 hour`);

    // Reload page to apply whitelist
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  /**
   * Notify user about breakage
   * @param {string} reason - Breakage reason
   */
  notifyUser(reason) {
    // Send message to background script to show notification
    chrome.runtime.sendMessage({
      type: 'SHOW_BREAKAGE_NOTIFICATION',
      data: {
        domain: this.domain,
        reason: reason,
        errors: this.errors.length,
        jsErrors: this.checks.jsErrors,
        networkErrors: this.checks.networkErrors
      }
    });
  }

  /**
   * Get breakage report
   * @returns {Object} - Detailed breakage report
   */
  getReport() {
    return {
      domain: this.domain,
      breakageLevel: this.evaluateBreakage(),
      checks: this.checks,
      errors: this.errors,
      warnings: this.warnings,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export breakage report for debugging
   * @returns {string} - JSON report
   */
  exportReport() {
    const report = this.getReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Reset breakage detection
   */
  reset() {
    this.errors = [];
    this.warnings = [];
    this.checks = {
      jsErrors: 0,
      networkErrors: 0,
      missingContent: false,
      brokenLayout: false,
      unboundEvents: 0
    };

    logger.debug('Breakage detector reset');
  }

  /**
   * Disable breakage detection
   */
  disable() {
    this.enabled = false;
    logger.info('Breakage detection disabled');
  }

  /**
   * Enable breakage detection
   */
  enable() {
    this.enabled = true;
    this.reset();
    logger.info('Breakage detection enabled');
  }
}

// Export singleton instance
const breakageDetector = new BreakageDetector();
export default breakageDetector;
export { BreakageDetector };
