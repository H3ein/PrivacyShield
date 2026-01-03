// PrivacyShield Max - Integration Loader
// Professional integration layer for DOM Blocker and Smart Filtering System

(function() {
  'use strict';

  console.log('[Integration] PrivacyShield Max Professional Edition loading...');

  /**
   * Integration Manager
   * Coordinates DOMBlocker and SmartFilteringSystem
   */
  class PrivacyShieldIntegration {
    constructor() {
      this.domBlocker = null;
      this.smartFilter = null;
      this.initialized = false;
      this.stats = {
        elementsBlocked: 0,
        threatsBlocked: 0,
        startTime: Date.now()
      };
    }

    /**
     * Initialize both systems
     */
    async initialize() {
      try {
        console.log('[Integration] Initializing PrivacyShield systems...');

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
          await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve, { once: true });
          });
        }

        // Initialize Smart Filtering System
        if (typeof SmartFilteringSystem !== 'undefined') {
          this.smartFilter = new SmartFilteringSystem();
          await this.smartFilter.initialize();
          console.log('[Integration] Smart Filtering System initialized');
        } else {
          console.warn('[Integration] SmartFilteringSystem not available');
        }

        // Initialize DOM Blocker
        if (typeof DOMBlocker !== 'undefined') {
          this.domBlocker = new DOMBlocker();
          await this.domBlocker.initialize({
            aggressiveMode: false,
            preserveLayout: true,
            enableAnimations: true,
            enablePlaceholders: true,
            enableStats: true
          });
          console.log('[Integration] DOM Blocker initialized');
        } else {
          console.warn('[Integration] DOMBlocker not available');
        }

        // Note: MutationObserver is handled by content.js to avoid duplication
        // Setup periodic re-blocking (reduced frequency)
        this.setupPeriodicBlocking();

        // Setup message listener
        this.setupMessageListener();

        this.initialized = true;

        console.log('[Integration] PrivacyShield Max fully initialized and operational');

        // Show init badge
        this.showInitializationBadge();

        return true;
      } catch (error) {
        console.error('[Integration] Initialization failed:', error);
        return false;
      }
    }

    // Note: setupMutationObserver removed - handled by content.js to avoid duplicate observers

    /**
     * Setup periodic blocking for stubborn ads (optimized)
     */
    setupPeriodicBlocking() {
      // Use incremental blocking every 30 seconds (reduced from 2s full scan)
      // Only checks viewport elements when page is visible
      setInterval(() => {
        if (this.domBlocker && document.visibilityState === 'visible') {
          // Use incremental method instead of full blockElements() for better performance
          if (typeof this.domBlocker.blockElementsIncremental === 'function') {
            this.domBlocker.blockElementsIncremental();
          } else {
            this.domBlocker.blockElements(); // Fallback
          }
        }
      }, 30000); // Changed from 2000ms to 30000ms to reduce CPU usage

      console.log('[Integration] Periodic blocking scheduled (30s interval, incremental mode)');
    }

    /**
     * Setup message listener for communication with background/popup
     */
    setupMessageListener() {
      const browserAPI = (typeof browser !== 'undefined') ? browser : (typeof chrome !== 'undefined' ? chrome : null);

      if (browserAPI && browserAPI.runtime) {
        browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
          this.handleMessage(message, sender, sendResponse);
          return true; // Keep channel open for async response
        });

        console.log('[Integration] Message listener active');
      }
    }

    /**
     * Handle messages from background/popup
     */
    async handleMessage(message, sender, sendResponse) {
      try {
        switch (message.action) {
          case 'getStats':
            sendResponse({
              success: true,
              stats: this.getStats()
            });
            break;

          case 'toggleBlocking':
            if (this.domBlocker) {
              if (message.enabled) {
                await this.domBlocker.initialize();
              } else {
                this.domBlocker.restoreElements();
              }
            }
            sendResponse({ success: true });
            break;

          case 'analyzeUrl':
            if (this.smartFilter) {
              const result = await this.smartFilter.shouldBlock(message.url, message.context || {});
              sendResponse({ success: true, result });
            } else {
              sendResponse({ success: false, error: 'SmartFilter not available' });
            }
            break;

          case 'recordFeedback':
            if (this.smartFilter) {
              await this.smartFilter.recordFeedback(message.url, message.feedback);
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false });
            }
            break;

          case 'addCustomBlock':
            if (this.domBlocker) {
              await this.domBlocker.addCustomBlock(message.selector, message.domain);
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false });
            }
            break;

          case 'restoreElements':
            if (this.domBlocker) {
              this.domBlocker.restoreElements();
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false });
            }
            break;

          default:
            sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        console.error('[Integration] Message handling error:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    /**
     * Get comprehensive statistics from both systems
     */
    getStats() {
      const stats = {
        runtime: Date.now() - this.stats.startTime,
        domBlocker: this.domBlocker ? this.domBlocker.getStats() : null,
        smartFilter: this.smartFilter ? this.smartFilter.getStatistics() : null,
        url: window.location.href,
        domain: window.location.hostname
      };

      return stats;
    }

    /**
     * Show initialization badge
     */
    showInitializationBadge() {
      if (!this.domBlocker) return;

      const stats = this.domBlocker.getStats();
      if (stats.totalBlocked > 0) {
        setTimeout(() => {
          this.domBlocker.showBlockingBadge(stats.totalBlocked);
        }, 500);
      }
    }

    /**
     * Analyze URL with smart filter before blocking
     */
    async analyzeBeforeBlock(url) {
      if (!this.smartFilter) return { shouldBlock: false };

      const result = await this.smartFilter.shouldBlock(url, {
        type: 'unknown',
        referrer: document.referrer
      });

      return result;
    }
  }

  // Create global integration instance
  const privacyShield = new PrivacyShieldIntegration();

  // Initialize when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      privacyShield.initialize();
    });
  } else {
    privacyShield.initialize();
  }

  // Export to global scope
  window.PrivacyShieldIntegration = privacyShield;

  console.log('[Integration] Integration loader ready');

})();
