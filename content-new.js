// PrivacyShield Max - Content Script (Refactored)
// Modular architecture with ES6 imports

console.log('PrivacyShield Max - Content script starting (Modular)...');

// Import core modules
import { MESSAGE_TYPES } from './core/constants.js';
import { getBrowserAPI } from './core/utils.js';
import storageManager from './core/storage-manager.js';
import messagingHub from './core/messaging-hub.js';
import logger from './core/logger.js';

// Import content modules
import domBlocker from './content/dom-blocker.js';
import fingerprintShield from './content/fingerprint-shield.js';
import antiDetection from './content/anti-detection.js';
import { createBlockingObserver } from './content/mutation-observer.js';
import socialWidgetBlocker from './content/social-widget-blocker.js';
import ampRedirector from './content/amp-redirector.js';
import breakageDetector from './content/breakage-detector.js';

// Import smart filtering modules
import threatDetector from './smart-filtering/threat-detector.js';
import codeAnalyzer from './smart-filtering/code-analyzer.js';
import fingerprintDetector from './smart-filtering/fingerprint-detector.js';
import learningEngine from './smart-filtering/learning-engine.js';
import patternAnalyzer from './smart-filtering/pattern-analyzer.js';

// Global state
const browserAPI = getBrowserAPI();
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
      logger.warn('Content script already initialized');
      return;
    }

    try {
      logger.info('Initializing PrivacyShield content script');

      // Load settings
      settings = await storageManager.getSettings();

      if (!settings.enabled) {
        logger.info('Extension disabled, skipping initialization');
        return;
      }

      // Initialize core modules
      await logger.initialize();

      // Initialize content modules
      await this.initializeModules();

      // Setup listeners
      this.setupListeners();

      // Setup cleanup
      this.setupCleanup();

      isInitialized = true;
      logger.info('Content script initialized successfully');

    } catch (error) {
      logger.error('Content script initialization failed:', error);
    }
  }

  /**
   * Initialize all content modules
   */
  async initializeModules() {
    // AMP redirector (run first, before anything else)
    await ampRedirector.initialize();

    // Fingerprint protection (must run early, before page scripts)
    await fingerprintShield.initialize();

    // Anti-detection (must run early)
    antiDetection.initialize();

    // DOM blocker
    await domBlocker.initialize();

    // Social widget blocker
    await socialWidgetBlocker.initialize();

    // Breakage detector
    await breakageDetector.initialize();

    // Smart filtering modules
    await threatDetector.initialize();
    await codeAnalyzer.initialize();
    await fingerprintDetector.initialize();
    await learningEngine.initialize();

    // Start DOM observation
    this.startDOMObserver();

    // Apply initial blocking
    this.applyInitialBlocking();

    // Analyze current page scripts
    this.analyzePageScripts();
  }

  /**
   * Setup listeners
   */
  setupListeners() {
    // Message listener
    messagingHub.on(MESSAGE_TYPES.GET_SETTINGS, async () => {
      return settings;
    });

    messagingHub.on(MESSAGE_TYPES.UPDATE_SETTINGS, async (data) => {
      settings = { ...settings, ...data };
      await this.reloadModules();
      return { success: true };
    });

    messagingHub.on(MESSAGE_TYPES.BLOCK_ELEMENT, async (data) => {
      await domBlocker.addCustomBlock(data.selector, data.domain);
      return { success: true };
    });

    messagingHub.on('TOGGLE_ELEMENT_PICKER', async () => {
      this.toggleElementPicker();
      return { success: true };
    });

    // Listen for setting changes
    if (browserAPI && browserAPI.storage) {
      browserAPI.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.settings) {
          settings = changes.settings.newValue;
          this.reloadModules();
        }
      });
    }
  }

  /**
   * Start DOM mutation observer
   */
  startDOMObserver() {
    mutationObserver = createBlockingObserver((addedNodes) => {
      this.handleNewNodes(addedNodes);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    logger.debug('DOM observer started');
  }

  /**
   * Handle newly added DOM nodes
   * @param {Array} nodes - Array of added nodes
   */
  handleNewNodes(nodes) {
    for (const node of nodes) {
      // Block ads in new nodes
      this.blockInNode(node);

      // Analyze scripts
      if (node.tagName === 'SCRIPT') {
        this.analyzeScript(node);
      }

      // Check for social widgets
      if (settings.socialWidgets !== 'allow') {
        socialWidgetBlocker.blockAllWidgets();
      }
    }
  }

  /**
   * Apply initial blocking to existing page
   */
  applyInitialBlocking() {
    // Block existing elements
    domBlocker.blockElements();

    // Block cookie banners
    if (settings.blockCookieBanners) {
      domBlocker.blockCookieBanners();
    }

    // Block social widgets
    if (settings.socialWidgets !== 'allow') {
      socialWidgetBlocker.blockAllWidgets();
    }

    // Block notification requests
    domBlocker.blockNotificationRequests();

    // Block anti-adblock
    domBlocker.blockAntiAdblock();
  }

  /**
   * Block elements in a specific node
   * @param {Node} node - DOM node to scan
   */
  blockInNode(node) {
    if (!node.querySelectorAll) return;

    // Check for ad elements
    const adSelectors = [
      '[class*="ad"]',
      '[id*="ad"]',
      'iframe[src*="doubleclick"]',
      'iframe[src*="googlesyndication"]'
    ];

    for (const selector of adSelectors) {
      const elements = node.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.setProperty('display', 'none', 'important');
        el.setAttribute('data-privacy-blocked', 'true');
      });
    }
  }

  /**
   * Analyze page scripts
   */
  analyzePageScripts() {
    const scripts = document.querySelectorAll('script');

    scripts.forEach(script => {
      this.analyzeScript(script);
    });
  }

  /**
   * Analyze individual script
   * @param {HTMLScriptElement} scriptElement - Script element
   */
  async analyzeScript(scriptElement) {
    const analysis = codeAnalyzer.analyzeScriptElement(scriptElement);

    if (analysis.isMalicious) {
      logger.warn('Malicious script detected:', {
        src: scriptElement.src,
        confidence: analysis.confidence
      });

      if (analysis.shouldBlock) {
        // Remove script
        scriptElement.remove();
        logger.info('Malicious script removed');

        // Notify user if high confidence
        if (analysis.confidence >= 0.8) {
          this.notifyThreatDetected('script', analysis);
        }
      }
    }

    // Check for crypto mining
    if (analysis.analysis?.cryptoMiner?.isMiner) {
      scriptElement.remove();
      logger.warn('Crypto miner script removed');

      // Always notify for crypto miners (zero tolerance)
      this.notifyThreatDetected('crypto-miner', analysis);
    }
  }

  /**
   * Notify user of detected threat
   * @param {string} type - Threat type
   * @param {Object} analysis - Analysis result
   */
  async notifyThreatDetected(type, analysis) {
    // Send message to background script
    try {
      await browserAPI.runtime.sendMessage({
        type: 'THREAT_DETECTED',
        data: {
          type,
          domain: window.location.hostname,
          analysis,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      logger.error('Failed to send threat notification:', error);
    }
  }

  /**
   * Reload modules with new settings
   */
  async reloadModules() {
    logger.info('Reloading modules with new settings');

    // Reinitialize modules that depend on settings
    if (settings.fingerprintProtection) {
      fingerprintShield.enable();
    } else {
      fingerprintShield.disable();
    }

    if (settings.cnameUncloaking) {
      // CNAME is handled in background, but we can log it
      logger.info('CNAME uncloaking enabled');
    }

    // Reapply blocking
    this.applyInitialBlocking();
  }

  /**
   * Toggle element picker mode
   */
  toggleElementPicker() {
    if (this.elementPicker) {
      this.disableElementPicker();
    } else {
      this.enableElementPicker();
    }
  }

  /**
   * Enable element picker mode
   */
  enableElementPicker() {
    logger.info('Element picker enabled');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'privacy-shield-picker-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999999;
      cursor: crosshair;
    `;

    let highlightedElement = null;
    let highlightBox = null;

    const createHighlightBox = () => {
      highlightBox = document.createElement('div');
      highlightBox.style.cssText = `
        position: absolute;
        border: 2px solid #ff0000;
        background: rgba(255, 0, 0, 0.1);
        pointer-events: none;
        z-index: 1000000;
      `;
      document.body.appendChild(highlightBox);
    };

    createHighlightBox();

    // Mouse move handler
    const onMouseMove = (e) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);

      if (target && target !== overlay && target !== highlightBox) {
        highlightedElement = target;

        const rect = target.getBoundingClientRect();
        highlightBox.style.top = rect.top + window.scrollY + 'px';
        highlightBox.style.left = rect.left + window.scrollX + 'px';
        highlightBox.style.width = rect.width + 'px';
        highlightBox.style.height = rect.height + 'px';
      }
    };

    // Click handler
    const onClick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (highlightedElement) {
        // Generate selector for element
        const selector = this.generateSelector(highlightedElement);

        // Block element
        await domBlocker.addCustomBlock(selector);

        logger.info('Element blocked via picker:', selector);
      }

      this.disableElementPicker();
    };

    // Escape key handler
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.disableElementPicker();
      }
    };

    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);

    document.body.appendChild(overlay);

    this.elementPicker = {
      overlay,
      highlightBox,
      onMouseMove,
      onClick,
      onKeyDown
    };
  }

  /**
   * Disable element picker mode
   */
  disableElementPicker() {
    if (!this.elementPicker) return;

    const { overlay, highlightBox, onMouseMove, onClick, onKeyDown } = this.elementPicker;

    overlay.removeEventListener('mousemove', onMouseMove);
    overlay.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKeyDown);

    overlay.remove();
    highlightBox.remove();

    this.elementPicker = null;

    logger.info('Element picker disabled');
  }

  /**
   * Generate CSS selector for element
   * @param {Element} element - DOM element
   * @returns {string} - CSS selector
   */
  generateSelector(element) {
    // Try ID first
    if (element.id) {
      return '#' + element.id;
    }

    // Try class
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/);
      if (classes.length > 0 && classes[0]) {
        return '.' + classes[0];
      }
    }

    // Fallback to tag name with nth-child
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element) + 1;
      return `${element.tagName.toLowerCase()}:nth-child(${index})`;
    }

    return element.tagName.toLowerCase();
  }

  /**
   * Setup cleanup handlers
   */
  setupCleanup() {
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.performLightCleanup();
      }
    });

    // Before unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Extension disconnect
    if (browserAPI && browserAPI.runtime) {
      const port = browserAPI.runtime.connect({ name: 'content-script' });
      port.onDisconnect.addListener(() => {
        this.cleanup();
      });
    }
  }

  /**
   * Perform light cleanup
   */
  performLightCleanup() {
    // Clear caches but keep observers running
    logger.debug('Performing light cleanup');
  }

  /**
   * Full cleanup
   */
  cleanup() {
    logger.info('Performing full cleanup');

    // Disconnect mutation observer
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }

    // Disable element picker
    if (this.elementPicker) {
      this.disableElementPicker();
    }

    // Cleanup modules
    domBlocker.cleanup();

    isInitialized = false;
  }
}

// Initialize content script
const contentScript = new PrivacyShieldContent();

// Run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    contentScript.initialize();
  });
} else {
  contentScript.initialize();
}

// Export for debugging
if (typeof window !== 'undefined') {
  window.PrivacyShieldContent = {
    contentScript,
    domBlocker,
    fingerprintShield,
    antiDetection,
    socialWidgetBlocker,
    ampRedirector,
    breakageDetector,
    codeAnalyzer,
    fingerprintDetector,
    settings: () => settings
  };
}
