// PrivacyShield Max - Content Script Loader
// Non-module version that uses globally loaded scripts

(function() {
  'use strict';

  console.log('PrivacyShield Max - Content script starting...');

  // Global state
  const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;
  let isInitialized = false;
  let mutationObserver = null;
  let settings = null;

  /**
   * Main content script class
   */
  class PrivacyShieldContent {
    constructor() {
      this.elementPicker = null;
      this.cleanupHandlers = [];
    }

    /**
     * Initialize content script
     */
    async initialize() {
      if (isInitialized) {
        console.warn('Content script already initialized');
        return;
      }

      try {
        console.log('Initializing PrivacyShield content script');

        // Wait for modules to be available
        await this.waitForModules();

        // Load settings
        if (typeof storageManager !== 'undefined') {
          settings = await storageManager.getSettings();
        } else {
          console.error('storageManager not available');
          return;
        }

        if (!settings.enabled) {
          console.log('Extension disabled, skipping initialization');
          return;
        }

        // Initialize content modules
        await this.initializeModules();

        // Setup listeners
        this.setupListeners();

        // Setup cleanup
        this.setupCleanup();

        isInitialized = true;
        console.log('Content script initialized successfully');

      } catch (error) {
        console.error('Content script initialization failed:', error);
      }
    }

    /**
     * Wait for all required modules to load
     */
    async waitForModules() {
      const requiredModules = [
        'storageManager',
        'domBlocker',
        'fingerprintShield',
        'antiDetection',
        'ampRedirector',
        'socialWidgetBlocker',
        'breakageDetector',
        'threatDetector',
        'learningEngine'
      ];

      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait

      while (attempts < maxAttempts) {
        const allLoaded = requiredModules.every(mod => typeof window[mod] !== 'undefined' || typeof globalThis[mod] !== 'undefined');

        if (allLoaded) {
          console.log('All modules loaded');
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      console.warn('Some modules may not be loaded');
    }

    /**
     * Initialize all content modules
     */
    async initializeModules() {
      try {
        // AMP redirector (run first, before anything else)
        if (typeof ampRedirector !== 'undefined') {
          await ampRedirector.initialize();
        }

        // Fingerprint protection (must run early, before page scripts)
        if (typeof fingerprintShield !== 'undefined') {
          await fingerprintShield.initialize();
        }

        // Anti-detection (must run early)
        if (typeof antiDetection !== 'undefined' && antiDetection.initialize) {
          antiDetection.initialize();
        }

        // DOM blocker
        if (typeof domBlocker !== 'undefined') {
          await domBlocker.initialize();
        }

        // Social widget blocker
        if (typeof socialWidgetBlocker !== 'undefined') {
          await socialWidgetBlocker.initialize();
        }

        // Breakage detector
        if (typeof breakageDetector !== 'undefined') {
          breakageDetector.initialize();
        }

        // Smart filtering modules
        if (typeof threatDetector !== 'undefined') {
          await threatDetector.initialize();
        }

        if (typeof learningEngine !== 'undefined') {
          await learningEngine.initialize();
        }

        // Setup mutation observer
        if (typeof createBlockingObserver === 'function') {
          mutationObserver = createBlockingObserver(domBlocker);
          mutationObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
          });
        }

        console.log('All content modules initialized');

      } catch (error) {
        console.error('Module initialization error:', error);
      }
    }

    /**
     * Setup message listeners
     */
    setupListeners() {
      browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
        return true; // Keep channel open for async response
      });
    }

    /**
     * Handle messages from background/popup
     */
    async handleMessage(message, sender, sendResponse) {
      try {
        switch (message.action) {
          case 'getStats':
            const stats = this.getStats();
            sendResponse({ success: true, stats });
            break;

          case 'toggleBlocking':
            if (typeof domBlocker !== 'undefined') {
              if (message.enabled) {
                await domBlocker.initialize();
              } else {
                domBlocker.cleanup();
              }
            }
            sendResponse({ success: true });
            break;

          case 'reloadSettings':
            settings = await storageManager.getSettings();
            sendResponse({ success: true });
            break;

          default:
            sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        console.error('Message handling error:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    /**
     * Get statistics
     */
    getStats() {
      const stats = {
        url: window.location.href,
        domain: window.location.hostname,
        domBlocker: typeof domBlocker !== 'undefined' && domBlocker.getStats ? domBlocker.getStats() : null,
        threatDetector: typeof threatDetector !== 'undefined' && threatDetector.getStats ? threatDetector.getStats() : null
      };
      return stats;
    }

    /**
     * Setup cleanup on page unload
     */
    setupCleanup() {
      window.addEventListener('beforeunload', () => {
        if (mutationObserver) {
          mutationObserver.disconnect();
        }
        this.cleanupHandlers.forEach(handler => handler());
      });
    }
  }

  // Create and initialize
  const privacyShield = new PrivacyShieldContent();

  // Start initialization after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      privacyShield.initialize();
    });
  } else {
    privacyShield.initialize();
  }

  // Export to global scope for debugging
  window.PrivacyShieldContent = privacyShield;

})();
