// PrivacyShield Max - Professional DOM Blocker
// Enterprise-grade element blocking with advanced UI/UX patterns
// Built with performance, reliability, and user experience in mind

(function(globalThis) {
  'use strict';

  /**
   * Professional DOM Blocker with Advanced Features
   * - Intelligent element detection
   * - Performance optimized
   * - Visual feedback system
   * - Undo/restore capabilities
   * - Professional animation transitions
   */
  class DOMBlocker {
    constructor() {
      // Core state
      this.blockedElements = new Map(); // Element -> metadata
      this.customBlockedElements = [];
      this.hiddenCount = 0;
      this.blockingHistory = [];
      this.maxHistorySize = 100;

      // Performance optimization
      this.blockingQueue = new Set();
      this.processingQueue = false;
      this.batchSize = 50;

      // Visual feedback
      this.showVisualFeedback = true;
      this.animationDuration = 300;

      // Statistics
      this.stats = {
        totalBlocked: 0,
        adsBlocked: 0,
        trackersBlocked: 0,
        bannersBlocked: 0,
        sessionsBlocked: 0,
        performanceMs: 0
      };

      // Smart caching
      this.selectorCache = new Map();
      this.lastCacheClean = Date.now();

      // Configuration
      this.config = {
        aggressiveMode: false,
        preserveLayout: true,
        enableAnimations: true,
        enablePlaceholders: true,
        enableStats: true
      };

      // Logger reference (will be set externally)
      this.logger = console;

      console.log('[DOMBlocker] Professional DOM Blocker initialized');
    }

    /**
     * Initialize DOM blocker with settings
     * @param {Object} options - Configuration options
     */
    async initialize(options = {}) {
      try {
        // Merge configuration
        Object.assign(this.config, options);

        // Load custom blocked elements from storage
        await this.loadCustomBlocks();

        // Inject CSS for professional transitions
        this.injectBlockingStyles();

        // Start immediate blocking
        this.blockElements();

        // Set up performance monitoring
        this.setupPerformanceMonitoring();

        this.logger.info?.('[DOMBlocker] Initialized successfully', {
          customElements: this.customBlockedElements.length,
          config: this.config
        });

        return true;
      } catch (error) {
        this.logger.error?.('[DOMBlocker] Initialization failed:', error);
        return false;
      }
    }

    /**
     * Inject professional CSS styles for blocking animations
     */
    injectBlockingStyles() {
      if (document.getElementById('privacyshield-blocker-styles')) return;

      const style = document.createElement('style');
      style.id = 'privacyshield-blocker-styles';
      style.textContent = `
        /* Professional blocking transitions */
        .privacyshield-blocked {
          opacity: 0 !important;
          pointer-events: none !important;
          transition: opacity ${this.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .privacyshield-blocked-fade-out {
          animation: privacyshield-fade-out ${this.animationDuration}ms ease-out forwards !important;
        }

        @keyframes privacyshield-fade-out {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.95);
          }
        }

        .privacyshield-blocked-collapse {
          max-height: 0 !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          transition: max-height ${this.animationDuration}ms ease-out,
                      margin ${this.animationDuration}ms ease-out,
                      padding ${this.animationDuration}ms ease-out !important;
        }

        /* Placeholder for blocked content */
        .privacyshield-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8edf2 100%);
          border: 1px solid #dce3e9;
          border-radius: 8px;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #64748b;
          font-size: 13px;
          min-height: 60px;
          opacity: 0;
          animation: privacyshield-placeholder-fade-in ${this.animationDuration}ms ease-out forwards;
        }

        @keyframes privacyshield-placeholder-fade-in {
          to { opacity: 1; }
        }

        .privacyshield-placeholder-icon {
          width: 20px;
          height: 20px;
          margin-right: 8px;
          opacity: 0.6;
        }

        /* Visual indicator (badge) */
        .privacyshield-blocked-badge {
          position: fixed;
          top: 16px;
          right: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          z-index: 999999;
          pointer-events: none;
          opacity: 0;
          transform: translateY(-20px);
          animation: privacyshield-badge-appear 300ms ease-out forwards,
                     privacyshield-badge-disappear 300ms ease-in 2.5s forwards;
        }

        @keyframes privacyshield-badge-appear {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes privacyshield-badge-disappear {
          to {
            opacity: 0;
            transform: translateY(-20px);
          }
        }
      `;

      (document.head || document.documentElement).appendChild(style);
    }

    /**
     * Professional element blocking with comprehensive selectors
     */
    blockElements() {
      const startTime = performance.now();

      const selectors = this.getComprehensiveSelectors();

      // Add custom domain-specific blocks
      const currentDomain = window.location.hostname;
      const domainCustom = this.customBlockedElements
        .filter(item => item.domain === currentDomain)
        .map(item => item.selector);

      selectors.push(...domainCustom);

      // Process blocking in batches for performance
      this.queueBatchBlocking(selectors);

      const duration = performance.now() - startTime;
      this.stats.performanceMs += duration;

      this.logger.debug?.(`[DOMBlocker] Blocking cycle completed in ${duration.toFixed(2)}ms`);
    }

    /**
     * Incremental blocking - lightweight version for periodic checks
     * Only checks viewport elements to minimize performance impact
     */
    blockElementsIncremental() {
      const startTime = performance.now();

      try {
        // Quick selectors for common ads (not comprehensive)
        const quickSelectors = [
          '[class*="ad-"]:not([data-privacyshield-blocked])',
          '[id*="ad-"]:not([data-privacyshield-blocked])',
          '[class*="advertisement"]:not([data-privacyshield-blocked])',
          'iframe[src*="doubleclick"]:not([data-privacyshield-blocked])',
          'iframe[src*="googlesyndication"]:not([data-privacyshield-blocked])'
        ];

        const selector = quickSelectors.join(', ');
        const elements = document.querySelectorAll(selector);

        // Check if element is in viewport
        const isInViewport = (el) => {
          try {
            const rect = el.getBoundingClientRect();
            return (
              rect.top < window.innerHeight &&
              rect.bottom > 0 &&
              rect.left < window.innerWidth &&
              rect.right > 0
            );
          } catch (error) {
            return false;
          }
        };

        // Limit to first 50 viewport elements for performance
        let blocked = 0;
        for (const element of elements) {
          if (blocked >= 50) break; // Max 50 elements per incremental scan

          if (isInViewport(element) && this.shouldBlockElement(element)) {
            const matchingSelector = this.getMatchingSelector(element);
            this.blockElement(element, matchingSelector);
            blocked++;
          }
        }

        const duration = performance.now() - startTime;
        this.logger.debug?.(`[DOMBlocker] Incremental blocking completed in ${duration.toFixed(2)}ms (${blocked} elements)`);
      } catch (error) {
        this.logger.error?.('[DOMBlocker] Incremental blocking error:', error);
      }
    }

    /**
     * Get comprehensive blocking selectors
     * Organized by category for better maintainability
     */
    getComprehensiveSelectors() {
      return [
        ...this.getAdvertisementSelectors(),
        ...this.getTrackingSelectors(),
        ...this.getPopupSelectors(),
        ...this.getCookieBannerSelectors(),
        ...this.getSocialWidgetSelectors(),
        ...this.getVideoAdSelectors(),
        ...this.getAntiAdblockSelectors()
      ];
    }

    /**
     * Advertisement selectors (comprehensive)
     */
    getAdvertisementSelectors() {
      return [
        // Generic patterns
        '[class*="advertisement" i]', '[id*="advertisement" i]',
        '[class*="ad-box" i]', '[id*="ad-box" i]',
        '[class*="ad-banner" i]', '[id*="ad-banner" i]',
        '[class*="ad_banner" i]', '[id*="ad_banner" i]',
        '[class*="adbanner" i]', '[id*="adbanner" i]',
        '[class*="adsbygoogle" i]',
        '.ad-container', '.ad-wrapper', '.ad-slot', '.ads-wrapper',
        '.banner-ad', '.sponsored-content', '.sponsored-post',
        '[data-ad-slot]', '[data-ad-unit]', '[data-ad-name]',
        '[class*="ad-space" i]', '[id*="ad-space" i]',
        '[class*="advert" i]', '[id*="advert" i]',
        '[class*="ads-" i]', '[id*="ads-" i]',
        '.ad', '#ad', '.ads', '#ads',
        '[class*="sponsored" i]', '[id*="sponsored" i]',
        '[class*="promo-box" i]', '[id*="promo-box" i]',

        // Ad networks (iframes & divs)
        'iframe[src*="doubleclick.net"]',
        'iframe[src*="googlesyndication.com"]',
        'iframe[src*="googleadservices.com"]',
        'iframe[src*="advertising.com"]',
        'iframe[src*="ad.doubleclick.net"]',
        'iframe[src*="adservice"]',
        'iframe[src*="adsystem"]',
        'iframe[src*="adtech"]',
        'iframe[src*="adnxs.com"]',
        'div[id*="google_ads"]',
        'div[class*="google-ad"]',

        // Content recommendation networks
        '[class*="taboola" i]', '[id*="taboola" i]',
        '[class*="outbrain" i]', '[id*="outbrain" i]',
        '[class*="revcontent" i]', '[id*="revcontent" i]',
        '[class*="mgid" i]', '[id*="mgid" i]',
        '[class*="contentad" i]', '[id*="contentad" i]',

        // Native ads
        '[class*="native-ad" i]', '[id*="native-ad" i]',
        '[data-native-ad]',

        // Sticky/Fixed ads
        '[class*="sticky-ad" i]', '[id*="sticky-ad" i]',
        '[class*="fixed-ad" i]', '[id*="fixed-ad" i]'
      ];
    }

    /**
     * Tracking selectors
     */
    getTrackingSelectors() {
      return [
        'iframe[src*="facebook.com/plugins"]',
        'iframe[src*="platform.twitter.com"]',
        'iframe[src*="linkedin.com/track"]',
        'script[src*="google-analytics.com"]',
        'script[src*="googletagmanager.com"]',
        'script[src*="hotjar.com"]',
        'script[src*="mouseflow.com"]',
        'img[src*="tracking"]',
        'img[width="1"][height="1"]', // Tracking pixels
        'img[style*="display:none"]'
      ];
    }

    /**
     * Popup and modal selectors
     */
    getPopupSelectors() {
      return [
        '[class*="popup-overlay" i]',
        '[class*="modal-backdrop" i]',
        '[id*="popup-overlay" i]',
        '.newsletter-popup', '.newsletter-modal',
        '.subscribe-popup', '.subscribe-modal',
        '.exit-intent-popup', '.exit-intent-modal',
        '[class*="overlay-popup" i]'
      ];
    }

    /**
     * Cookie banner selectors
     */
    getCookieBannerSelectors() {
      return [
        '[class*="cookie-banner" i]', '[id*="cookie-banner" i]',
        '[class*="cookie-notice" i]', '[id*="cookie-notice" i]',
        '[class*="cookie-consent" i]', '[id*="cookie-consent" i]',
        '[class*="gdpr-banner" i]', '[id*="gdpr-banner" i]',
        '[class*="privacy-banner" i]',
        '[aria-label*="cookie" i]',
        '[aria-label*="consent" i]',
        '#onetrust-banner-sdk',
        '#CybotCookiebotDialog',
        '.cc-window',
        '.cky-consent-container',
        '#cookiescript_injected',
        '.qc-cmp2-container',
        '#truste-consent-track',
        '.pmConsentWall'
      ];
    }

    /**
     * Social widget selectors
     */
    getSocialWidgetSelectors() {
      return [
        // Facebook
        '.fb-like', '.fb-share-button', '.fb-follow', '.fb-page', '.fb-comments',
        'iframe[src*="facebook.com/plugins"]',
        '[class*="facebook-widget" i]',

        // Twitter
        '.twitter-share-button', '.twitter-follow-button', '.twitter-timeline',
        'iframe[src*="platform.twitter.com"]',
        '[class*="twitter-widget" i]',

        // LinkedIn
        '.linkedin-share-button',
        'iframe[src*="linkedin.com/embed"]',

        // Pinterest
        '.pinterest-share-button', '[data-pin-do]',

        // Instagram
        'iframe[src*="instagram.com/embed"]',

        // Generic
        '[class*="social-share" i]',
        '[class*="share-buttons" i]'
      ];
    }

    /**
     * Video ad selectors
     */
    getVideoAdSelectors() {
      return [
        '[class*="video-ad" i]', '[id*="video-ad" i]',
        '[class*="preroll" i]', '[id*="preroll" i]',
        '.ima-ad-container', '#ima-ad-container',
        '[class*="video-ads" i]'
      ];
    }

    /**
     * Anti-adblock selectors
     */
    getAntiAdblockSelectors() {
      return [
        'script[src*="pagefair.com"]',
        'script[src*="blockadblock.com"]',
        'script[src*="fuckadblock"]',
        '[id*="adblock-notify" i]',
        '[class*="adblock-notify" i]',
        '[class*="adblock-warning" i]'
      ];
    }

    /**
     * Queue elements for batch processing
     */
    queueBatchBlocking(selectors) {
      selectors.forEach(selector => this.blockingQueue.add(selector));

      if (!this.processingQueue) {
        this.processBatchQueue();
      }
    }

    /**
     * Process blocking queue in batches for optimal performance
     */
    async processBatchQueue() {
      if (this.blockingQueue.size === 0) {
        this.processingQueue = false;
        return;
      }

      this.processingQueue = true;
      const batch = Array.from(this.blockingQueue).slice(0, this.batchSize);

      batch.forEach(selector => {
        this.hideElements(selector);
        this.blockingQueue.delete(selector);
      });

      // Schedule next batch
      if (this.blockingQueue.size > 0) {
        requestAnimationFrame(() => this.processBatchQueue());
      } else {
        this.processingQueue = false;
      }
    }

    /**
     * Professional element hiding with animations and placeholders
     */
    hideElements(selector) {
      try {
        // Use cached results if available
        const cacheKey = selector;
        let elements;

        if (this.selectorCache.has(cacheKey)) {
          const cached = this.selectorCache.get(cacheKey);
          if (Date.now() - cached.timestamp < 5000) {
            elements = cached.elements;
          } else {
            this.selectorCache.delete(cacheKey);
          }
        }

        if (!elements) {
          elements = document.querySelectorAll(selector);
          this.selectorCache.set(cacheKey, {
            elements,
            timestamp: Date.now()
          });
        }

        elements.forEach(element => {
          if (this.shouldBlockElement(element)) {
            this.blockElement(element, selector);
          }
        });

      } catch (error) {
        this.logger.warn?.('[DOMBlocker] Invalid selector:', selector, error.message);
      }
    }

    /**
     * Intelligent element validation before blocking
     */
    shouldBlockElement(element) {
      // Already blocked
      if (element.hasAttribute('data-privacyshield-blocked')) {
        return false;
      }

      // Skip critical structural elements
      const criticalTags = ['HTML', 'HEAD', 'BODY', 'MAIN', 'HEADER', 'FOOTER', 'NAV', 'ARTICLE', 'SECTION', 'ASIDE', 'FORM', 'TABLE', 'UL', 'OL', 'DL'];
      if (criticalTags.includes(element.tagName)) {
        // Silently skip
        return false;
      }

      // Skip STYLE and SCRIPT tags (managed by other systems)
      if (element.tagName === 'STYLE' || element.tagName === 'SCRIPT') {
        // Silently skip
        return false;
      }

      // Smart detection
      return this.isLikelyAd(element);
    }

    /**
     * Advanced AI-like ad detection
     */
    isLikelyAd(element) {
      const className = (element.className || '').toString().toLowerCase();
      const id = (element.id || '').toLowerCase();
      const tagName = element.tagName.toLowerCase();
      const textContent = (element.textContent || '').trim();

      // Check for substantial text content - likely legitimate
      if (textContent.length > 200) {
        // Silently skip - no need to log
        return false;
      }

      // Whitelist critical elements by class/id patterns
      const legitimatePatterns = [
        'content', 'article', 'post', 'comment', 'nav', 'menu',
        'header', 'footer', 'sidebar', 'widget', 'main', 'thread',
        'container', 'wrapper', 'section', 'body', 'page',
        'cbd', 'lbd', 'tbd', 'rbd', 'mbd', 'fbd', // Common legitimate prefixes
        'abdd', 'tbdl', 'cbdd', 'obdl', 'sbdl', // Site-specific patterns
        'navbar', 'topbar', 'search', 'logo', 'tabs', 'list',
        'w3-', 'post-', 'img-', 'index'
      ];

      if (legitimatePatterns.some(pattern => className.includes(pattern) || id.includes(pattern))) {
        // Silently skip - no need to log
        return false;
      }

      // Ad pattern keywords (weighted) - STRICT matching with word boundaries
      const adKeywords = [
        { keyword: '\\bad-', weight: 0.8, regex: true },
        { keyword: '\\bads\\b', weight: 0.8, regex: true },
        { keyword: '\\badvertisement\\b', weight: 0.95, regex: true },
        { keyword: '\\badvert\\b', weight: 0.85, regex: true },
        { keyword: '-ad\\b', weight: 0.8, regex: true },
        { keyword: 'sponsored', weight: 0.7 },
        { keyword: 'adsbygoogle', weight: 0.95 },
        { keyword: 'doubleclick', weight: 0.95 },
        { keyword: 'adsense', weight: 0.95 },
        { keyword: 'taboola', weight: 0.9 },
        { keyword: 'outbrain', weight: 0.9 },
        { keyword: 'mgid', weight: 0.9 },
        { keyword: 'revcontent', weight: 0.85 },
        { keyword: 'ad-banner', weight: 0.9 },
        { keyword: 'ad-container', weight: 0.9 },
        { keyword: 'ad-wrapper', weight: 0.9 }
      ];

      // Calculate score
      let score = 0;

      adKeywords.forEach(({ keyword, weight, regex }) => {
        const combined = className + ' ' + id;
        const matches = regex
          ? new RegExp(keyword, 'i').test(combined)
          : combined.includes(keyword);

        if (matches) {
          score += weight;
        }
      });

      // Check data attributes
      const dataAttrs = Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => attr.name.toLowerCase());

      if (dataAttrs.some(attr =>
        attr.includes('ad-') || attr.includes('-ad') ||
        attr === 'ad' || attr === 'ads'
      )) {
        score += 0.5;
      }

      // Special case: iframes with ad sources
      if (tagName === 'iframe') {
        const src = (element.src || '').toLowerCase();
        const adDomains = [
          'doubleclick', 'googlesyndication', 'googleadservices',
          'advertising.com', 'adservice', 'adsystem', 'adtech',
          'taboola', 'outbrain', 'mgid'
        ];

        if (adDomains.some(domain => src.includes(domain))) {
          return true;
        }
      }

      // Higher threshold to reduce false positives
      return score >= 0.9;
    }

    /**
     * Block element with professional animations and feedback
     */
    blockElement(element, selector) {
      try {
        // Mark as blocked
        element.setAttribute('data-privacyshield-blocked', 'true');
        element.setAttribute('data-privacyshield-selector', selector);

        // Store reference
        this.blockedElements.set(element, {
          selector,
          timestamp: Date.now(),
          originalDisplay: element.style.display,
          originalVisibility: element.style.visibility
        });

        // Apply blocking strategy based on config
        if (this.config.enableAnimations) {
          this.applyAnimatedBlock(element);
        } else {
          this.applyInstantBlock(element);
        }

        // Create placeholder if enabled
        if (this.config.enablePlaceholders && this.shouldShowPlaceholder(element)) {
          this.createPlaceholder(element);
        }

        // Update statistics
        this.updateStatistics(element, selector);

        // Add to history
        this.addToHistory(element, selector);

        this.hiddenCount++;

      } catch (error) {
        this.logger.error?.('[DOMBlocker] Error blocking element:', error);
      }
    }

    /**
     * Apply animated blocking with smooth transitions
     */
    applyAnimatedBlock(element) {
      element.classList.add('privacyshield-blocked-fade-out');

      setTimeout(() => {
        if (this.config.preserveLayout) {
          element.classList.add('privacyshield-blocked-collapse');
        } else {
          element.style.display = 'none';
        }
        element.classList.add('privacyshield-blocked');
      }, this.animationDuration);
    }

    /**
     * Apply instant blocking without animation
     */
    applyInstantBlock(element) {
      element.style.setProperty('display', 'none', 'important');
      element.style.setProperty('visibility', 'hidden', 'important');
      element.style.setProperty('opacity', '0', 'important');
      element.style.setProperty('position', 'absolute', 'important');
      element.style.setProperty('left', '-9999px', 'important');
      element.style.setProperty('pointer-events', 'none', 'important');
      element.classList.add('privacyshield-blocked');
    }

    /**
     * Determine if placeholder should be shown (optimized - no forced reflow)
     */
    shouldShowPlaceholder(element) {
      // Use computed style instead of getBoundingClientRect() to avoid forced reflow
      try {
        const style = window.getComputedStyle(element);
        const width = parseInt(style.width) || 0;
        const height = parseInt(style.height) || 0;
        return width > 200 && height > 100; // Only for substantial ads
      } catch (error) {
        // Fallback to false if style unavailable
        return false;
      }
    }

    /**
     * Create professional placeholder for blocked content
     */
    createPlaceholder(element) {
      const placeholder = document.createElement('div');
      placeholder.className = 'privacyshield-placeholder';
      placeholder.innerHTML = `
        <svg class="privacyshield-placeholder-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>Content blocked by PrivacyShield</span>
      `;

      try {
        element.parentNode.insertBefore(placeholder, element);
      } catch (e) {
        // Silently fail if parent doesn't exist
      }
    }

    /**
     * Update blocking statistics
     */
    updateStatistics(element, selector) {
      this.stats.totalBlocked++;

      const selectorLower = selector.toLowerCase();
      if (selectorLower.includes('ad')) this.stats.adsBlocked++;
      if (selectorLower.includes('track') || selectorLower.includes('analytics')) this.stats.trackersBlocked++;
      if (selectorLower.includes('banner') || selectorLower.includes('cookie')) this.stats.bannersBlocked++;
    }

    /**
     * Add to blocking history
     */
    addToHistory(element, selector) {
      this.blockingHistory.unshift({
        element,
        selector,
        timestamp: Date.now(),
        url: window.location.href
      });

      // Limit history size
      if (this.blockingHistory.length > this.maxHistorySize) {
        this.blockingHistory = this.blockingHistory.slice(0, this.maxHistorySize);
      }
    }

    /**
     * Show visual feedback badge
     */
    showBlockingBadge(count) {
      if (!this.showVisualFeedback) return;

      const badge = document.createElement('div');
      badge.className = 'privacyshield-blocked-badge';
      badge.textContent = `🛡️ Blocked ${count} element${count !== 1 ? 's' : ''}`;

      document.body.appendChild(badge);

      setTimeout(() => {
        badge.remove();
      }, 3000);
    }

    /**
     * Load custom blocked elements from storage
     */
    async loadCustomBlocks() {
      try {
        if (typeof browser !== 'undefined' && browser.storage) {
          const result = await browser.storage.local.get('blockedElements');
          this.customBlockedElements = result.blockedElements || [];
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get('blockedElements', (result) => {
            this.customBlockedElements = result.blockedElements || [];
          });
        }
      } catch (error) {
        this.logger.warn?.('[DOMBlocker] Failed to load custom blocks:', error);
      }
    }

    /**
     * Add custom element to block list
     */
    async addCustomBlock(selector, domain = null) {
      domain = domain || window.location.hostname;

      const item = { selector, domain, addedAt: Date.now() };
      this.customBlockedElements.push(item);

      // Save to storage
      try {
        if (typeof browser !== 'undefined' && browser.storage) {
          await browser.storage.local.set({ blockedElements: this.customBlockedElements });
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ blockedElements: this.customBlockedElements });
        }
      } catch (error) {
        this.logger.error?.('[DOMBlocker] Failed to save custom block:', error);
      }

      // Block immediately
      this.hideElements(selector);

      this.logger.info?.('[DOMBlocker] Custom element blocked:', { selector, domain });

      return true;
    }

    /**
     * Remove custom blocked element
     */
    async removeCustomBlock(selector, domain) {
      this.customBlockedElements = this.customBlockedElements.filter(
        item => !(item.selector === selector && item.domain === domain)
      );

      // Save to storage
      try {
        if (typeof browser !== 'undefined' && browser.storage) {
          await browser.storage.local.set({ blockedElements: this.customBlockedElements });
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ blockedElements: this.customBlockedElements });
        }
      } catch (error) {
        this.logger.error?.('[DOMBlocker] Failed to remove custom block:', error);
      }

      this.logger.info?.('[DOMBlocker] Custom block removed:', { selector, domain });

      return true;
    }

    /**
     * Restore all blocked elements
     */
    restoreElements() {
      this.blockedElements.forEach((metadata, element) => {
        try {
          element.classList.remove('privacyshield-blocked', 'privacyshield-blocked-fade-out', 'privacyshield-blocked-collapse');
          element.style.display = metadata.originalDisplay || '';
          element.style.visibility = metadata.originalVisibility || '';
          element.style.opacity = '';
          element.style.position = '';
          element.style.left = '';
          element.style.pointerEvents = '';
          element.removeAttribute('data-privacyshield-blocked');
          element.removeAttribute('data-privacyshield-selector');
        } catch (error) {
          // Element may no longer exist
        }
      });

      this.blockedElements.clear();
      this.hiddenCount = 0;

      // Remove placeholders
      document.querySelectorAll('.privacyshield-placeholder').forEach(p => p.remove());

      this.logger.info?.('[DOMBlocker] All blocked elements restored');
    }

    /**
     * Get comprehensive statistics
     */
    getStats() {
      return {
        hiddenCount: this.hiddenCount,
        customBlocks: this.customBlockedElements.length,
        ...this.stats,
        cacheSize: this.selectorCache.size,
        historySize: this.blockingHistory.length
      };
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
      // Clean cache periodically
      setInterval(() => {
        this.cleanCache();
      }, 30000); // Every 30 seconds
    }

    /**
     * Clean expired cache entries
     */
    cleanCache() {
      const now = Date.now();
      this.selectorCache.forEach((value, key) => {
        if (now - value.timestamp > 10000) { // 10 seconds
          this.selectorCache.delete(key);
        }
      });

      this.lastCacheClean = now;
    }

    /**
     * Export statistics and configuration
     */
    exportData() {
      return {
        stats: this.getStats(),
        config: this.config,
        customBlocks: this.customBlockedElements,
        historyCount: this.blockingHistory.length
      };
    }

    /**
     * Cleanup and destroy
     */
    cleanup() {
      this.restoreElements();
      this.selectorCache.clear();
      this.blockingQueue.clear();
      this.blockingHistory = [];
      this.logger.info?.('[DOMBlocker] Cleanup completed');
    }
  }

  // Export to global scope
  globalThis.DOMBlocker = DOMBlocker;

  // Also export as module if supported
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DOMBlocker };
  }

})(typeof window !== 'undefined' ? window : globalThis);
