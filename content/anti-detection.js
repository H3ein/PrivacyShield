// PrivacyShield Max - Anti-Detection
// Prevent detection of ad blocking and privacy extensions

import logger from '../core/logger.js';

class AntiDetection {
  constructor() {
    this.baits = [];
    this.detectionAttempts = 0;
  }

  /**
   * Initialize anti-detection mechanisms
   */
  initialize() {
    this.setupBaitProtection();
    this.hideExtensionPresence();
    this.preventTimingDetection();
    this.preventDOMDetection();
    this.preventComputedStyleDetection();
    this.preventOffsetDetection();
    this.preventResourceTimingDetection();
    this.preventFetchDetection();
    this.preventXHRDetection();
    this.setupScriptInjectionSpoofing();
    this.preventMutationObserverDetection();
    this.hideAntiAdblockMessages();

    logger.info('Anti-detection initialized with full stealth mode');
  }

  /**
   * Setup ad bait protection
   * Websites often use hidden "bait" elements to detect ad blockers
   */
  setupBaitProtection() {
    // Common bait class names
    const baitClassNames = [
      'ad',
      'ads',
      'advertisement',
      'advert',
      'adsbox',
      'ad-banner',
      'ad_banner',
      'adbanner',
      'sponsor',
      'sponsored'
    ];

    // Store reference to this
    const self = this;

    // Override querySelector to intercept bait checks
    const originalQuerySelector = document.querySelector;
    const originalQuerySelectorAll = document.querySelectorAll;

    document.querySelector = function(selector) {
      // If selector matches common bait patterns, create fake element
      if (self.isBaitSelector(selector)) {
        self.detectionAttempts++;
        logger.debug('Bait detection attempt blocked:', selector);

        // Return fake element that appears visible
        const fakeElement = document.createElement('div');
        fakeElement.style.display = 'block';
        fakeElement.style.visibility = 'visible';
        fakeElement.style.width = '1px';
        fakeElement.style.height = '1px';
        // Make it appear to have dimensions
        Object.defineProperty(fakeElement, 'offsetHeight', { get: () => 1 });
        Object.defineProperty(fakeElement, 'offsetWidth', { get: () => 1 });
        return fakeElement;
      }

      return originalQuerySelector.call(this, selector);
    };

    document.querySelectorAll = function(selector) {
      if (self.isBaitSelector(selector)) {
        self.detectionAttempts++;
        logger.debug('Bait detection attempt blocked:', selector);

        // Return NodeList with fake element
        const fakeElement = document.createElement('div');
        fakeElement.style.display = 'block';
        fakeElement.style.visibility = 'visible';
        Object.defineProperty(fakeElement, 'offsetHeight', { get: () => 1 });
        Object.defineProperty(fakeElement, 'offsetWidth', { get: () => 1 });
        return [fakeElement];
      }

      return originalQuerySelectorAll.call(this, selector);
    };

    logger.debug('Bait protection enabled');
  }

  /**
   * Check if selector is a bait selector
   * @param {string} selector - CSS selector
   * @returns {boolean} - True if bait selector
   */
  isBaitSelector(selector) {
    const baitPatterns = [
      /\.ad[^a-z]/i,
      /\.ads[^a-z]/i,
      /\.advertisement/i,
      /\.advert[^a-z]/i,
      /#ad[^a-z]/i,
      /#ads[^a-z]/i,
      /\[class\*=["']ad["']\]/i,
      /\[id\*=["']ad["']\]/i
    ];

    return baitPatterns.some(pattern => pattern.test(selector));
  }

  /**
   * Hide extension presence
   */
  hideExtensionPresence() {
    // Remove extension-specific properties
    delete window.chrome;

    // Spoof extension detection properties
    Object.defineProperty(window, 'chrome', {
      get: () => undefined,
      set: () => {},
      configurable: false
    });

    // Hide extension runtime
    if (window.browser) {
      delete window.browser;
    }

    // Spoof common detection methods
    window.canRunAds = true;
    window.isAdBlockActive = false;

    logger.debug('Extension presence hidden');
  }

  /**
   * Prevent timing-based detection
   * Ad blockers can be detected by measuring element rendering time
   */
  preventTimingDetection() {
    // Add random delays to timing functions
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalSetTimeout = window.setTimeout;

    window.requestAnimationFrame = function(callback) {
      // Add tiny random delay (0-2ms)
      const delay = Math.random() * 2;

      return originalSetTimeout(() => {
        return originalRequestAnimationFrame(callback);
      }, delay);
    };

    // Don't override setTimeout directly as it breaks legitimate code
    // Instead, add noise to performance.now() (already done in fingerprint-shield)

    logger.debug('Timing detection prevention enabled');
  }

  /**
   * Prevent DOM mutation detection
   */
  preventDOMDetection() {
    // Some sites detect ad blocking by watching for removed elements
    const self = this;
    const originalRemoveChild = Element.prototype.removeChild;
    const originalRemove = Element.prototype.remove;

    Element.prototype.removeChild = function(child) {
      // Check if element being removed is an ad-related element
      if (self.isAdElement(child)) {
        // Instead of removing, hide it
        child.style.setProperty('display', 'none', 'important');
        child.style.setProperty('visibility', 'hidden', 'important');
        child.style.setProperty('opacity', '0', 'important');
        child.style.setProperty('position', 'absolute', 'important');
        child.style.setProperty('left', '-9999px', 'important');
        child.style.setProperty('pointer-events', 'none', 'important');

        logger.debug('Ad element hidden instead of removed');
        return child;
      }

      return originalRemoveChild.call(this, child);
    };

    Element.prototype.remove = function() {
      if (self.isAdElement(this)) {
        // Hide instead of remove
        this.style.setProperty('display', 'none', 'important');
        this.style.setProperty('visibility', 'hidden', 'important');
        this.style.setProperty('opacity', '0', 'important');
        this.style.setProperty('pointer-events', 'none', 'important');
        return;
      }

      return originalRemove.call(this);
    };

    logger.debug('DOM detection prevention enabled');
  }

  /**
   * Check if element is ad-related
   * @param {Element} element - DOM element
   * @returns {boolean} - True if ad element
   */
  isAdElement(element) {
    if (!element || !element.className) return false;

    const adPatterns = [
      /ad[^a-z]/i,
      /ads[^a-z]/i,
      /advertisement/i,
      /google.*ad/i,
      /doubleclick/i
    ];

    const className = element.className.toString();
    const id = element.id || '';

    return adPatterns.some(pattern =>
      pattern.test(className) || pattern.test(id)
    );
  }

  /**
   * Prevent getComputedStyle detection
   * Sites check if ad elements have display:none
   */
  preventComputedStyleDetection() {
    const self = this;
    const originalGetComputedStyle = window.getComputedStyle;

    window.getComputedStyle = function(element, pseudoElt) {
      const styles = originalGetComputedStyle(element, pseudoElt);

      // If element is ad-related and hidden, fake visible styles
      if (self.isAdElement(element)) {
        const actualDisplay = styles.display;
        const actualVisibility = styles.visibility;

        if (actualDisplay === 'none' || actualVisibility === 'hidden') {
          self.detectionAttempts++;
          logger.debug('getComputedStyle detection blocked');

          // Return proxy with fake visible values
          return new Proxy(styles, {
            get: (target, prop) => {
              if (prop === 'display') return 'block';
              if (prop === 'visibility') return 'visible';
              if (prop === 'opacity') return '1';
              return target[prop];
            }
          });
        }
      }

      return styles;
    };

    logger.debug('getComputedStyle detection prevention enabled');
  }

  /**
   * Prevent offsetHeight/offsetWidth detection
   */
  preventOffsetDetection() {
    const self = this;

    // Override offsetHeight and offsetWidth for ad elements
    const defineOffsetProperty = (proto, prop) => {
      const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
      if (!descriptor) return;

      const originalGetter = descriptor.get;

      Object.defineProperty(proto, prop, {
        get: function() {
          const value = originalGetter.call(this);

          // If ad element and hidden (0 size), fake non-zero value
          if (value === 0 && self.isAdElement(this)) {
            self.detectionAttempts++;
            logger.debug(`${prop} detection blocked`);
            return 1; // Return non-zero value
          }

          return value;
        },
        configurable: true,
        enumerable: true
      });
    };

    defineOffsetProperty(Element.prototype, 'offsetHeight');
    defineOffsetProperty(Element.prototype, 'offsetWidth');
    defineOffsetProperty(Element.prototype, 'clientHeight');
    defineOffsetProperty(Element.prototype, 'clientWidth');

    logger.debug('Offset detection prevention enabled');
  }

  /**
   * Prevent Resource Timing API detection
   * Sites can detect blocked resources via performance.getEntries()
   */
  preventResourceTimingDetection() {
    const originalGetEntries = performance.getEntries;
    const originalGetEntriesByType = performance.getEntriesByType;
    const originalGetEntriesByName = performance.getEntriesByName;

    // Add fake entries for blocked ad resources
    const createFakeEntry = (url) => ({
      name: url,
      entryType: 'resource',
      startTime: performance.now() - Math.random() * 1000,
      duration: Math.random() * 100 + 50,
      initiatorType: 'script',
      transferSize: Math.floor(Math.random() * 50000) + 10000,
      encodedBodySize: Math.floor(Math.random() * 50000) + 10000,
      decodedBodySize: Math.floor(Math.random() * 50000) + 10000
    });

    performance.getEntries = function() {
      const entries = originalGetEntries.apply(this, arguments);

      // Add fake entries for known ad domains if they're missing
      const adDomains = [
        'doubleclick.net',
        'googlesyndication.com',
        'googleadservices.com'
      ];

      adDomains.forEach(domain => {
        const hasEntry = entries.some(e => e.name && e.name.includes(domain));
        if (!hasEntry) {
          entries.push(createFakeEntry(`https://${domain}/ad.js`));
        }
      });

      return entries;
    };

    logger.debug('Resource timing detection prevention enabled');
  }

  /**
   * Defeat fetch/XHR monitoring
   * Sites monitor for failed requests to detect blocking
   */
  preventFetchDetection() {
    const self = this;
    const originalFetch = window.fetch;

    window.fetch = function(url, ...args) {
      return originalFetch(url, ...args).catch(error => {
        // If ad-related URL failed, fake successful response
        if (typeof url === 'string' && self.isAdURL(url)) {
          self.detectionAttempts++;
          logger.debug('Fetch detection blocked for:', url);

          return new Response('', {
            status: 200,
            statusText: 'OK',
            headers: new Headers({
              'Content-Type': 'application/javascript'
            })
          });
        }

        // Otherwise, propagate error
        throw error;
      });
    };

    logger.debug('Fetch detection prevention enabled');
  }

  /**
   * Check if URL is ad-related
   * @param {string} url - URL to check
   * @returns {boolean} - True if ad URL
   */
  isAdURL(url) {
    const adDomains = [
      'doubleclick.net',
      'googlesyndication.com',
      'googleadservices.com',
      'advertising.com',
      'adsystem.com'
    ];

    return adDomains.some(domain => url.includes(domain));
  }

  /**
   * Prevent XHR detection (similar to fetch)
   */
  preventXHRDetection() {
    const self = this;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._url = url;
      return originalOpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      const xhr = this;

      // If ad-related URL, fake success
      if (self.isAdURL(xhr._url)) {
        const originalOnError = xhr.onerror;
        const originalOnAbort = xhr.onabort;

        xhr.onerror = function() {
          self.detectionAttempts++;
          logger.debug('XHR detection blocked for:', xhr._url);

          // Fake successful response
          Object.defineProperty(xhr, 'status', { get: () => 200 });
          Object.defineProperty(xhr, 'statusText', { get: () => 'OK' });
          Object.defineProperty(xhr, 'response', { get: () => '' });
          Object.defineProperty(xhr, 'responseText', { get: () => '' });

          if (xhr.onload) xhr.onload();
        };

        xhr.onabort = xhr.onerror;
      }

      return originalSend.call(this, ...args);
    };

    logger.debug('XHR detection prevention enabled');
  }

  /**
   * Setup script injection spoofing
   * Make ad scripts appear to load successfully
   */
  setupScriptInjectionSpoofing() {
    const self = this;

    // Spoof common ad script global variables
    const adGlobals = {
      'google_ad_client': 'ca-pub-0000000000000000',
      'googletag': {
        cmd: [],
        defineSlot: () => ({ addService: () => {}, setTargeting: () => {} }),
        pubads: () => ({
          enableSingleRequest: () => {},
          collapseEmptyDivs: () => {},
          refresh: () => {},
          setTargeting: () => {},
          addEventListener: () => {}
        }),
        enableServices: () => {},
        display: () => {}
      },
      'adsbygoogle': [],
      '__gads': Date.now(),
      '__gpi': 'GA1.1.00000000.0000000000',
      'adsLoaded': true,
      'canRunAds': true,
      'isAdBlockActive': false,
      'adBlockDetected': false
    };

    Object.keys(adGlobals).forEach(key => {
      try {
        if (!window[key]) {
          Object.defineProperty(window, key, {
            get: () => adGlobals[key],
            set: () => {},
            configurable: false
          });
        }
      } catch (e) {
        // Ignore errors
      }
    });

    logger.debug('Script injection spoofing enabled');
  }

  /**
   * Prevent MutationObserver-based detection
   * Some sites use MutationObserver to watch for ad removal
   */
  preventMutationObserverDetection() {
    const self = this;
    const OriginalMutationObserver = window.MutationObserver;

    window.MutationObserver = function(callback) {
      const wrappedCallback = function(mutations, observer) {
        // Filter out mutations related to ad elements
        const filteredMutations = mutations.filter(mutation => {
          // Check if mutation involves ad elements
          if (mutation.type === 'childList') {
            const removedAds = Array.from(mutation.removedNodes).some(node =>
              node.nodeType === 1 && self.isAdElement(node)
            );
            const addedToAd = mutation.target && self.isAdElement(mutation.target);

            if (removedAds || addedToAd) {
              self.detectionAttempts++;
              logger.debug('MutationObserver detection attempt blocked');
              return false;
            }
          }

          if (mutation.type === 'attributes' && self.isAdElement(mutation.target)) {
            return false;
          }

          return true;
        });

        if (filteredMutations.length > 0) {
          callback.call(this, filteredMutations, observer);
        }
      };

      return new OriginalMutationObserver(wrappedCallback);
    };

    // Copy static properties
    window.MutationObserver.prototype = OriginalMutationObserver.prototype;

    logger.debug('MutationObserver detection prevention enabled');
  }

  /**
   * Hide anti-adblock messages and overlays
   * Aggressively removes anti-adblock warnings including international ones
   */
  hideAntiAdblockMessages() {
    const self = this;

    // Common anti-adblock message selectors (expanded for international sites)
    const antiAdblockSelectors = [
      // English
      '[class*="adblock"]',
      '[id*="adblock"]',
      '[class*="ad-block"]',
      '[id*="ad-block"]',
      '[class*="adblocker"]',
      '[id*="adblocker"]',

      // Generic overlay/modal patterns
      '[class*="overlay"][style*="fixed"]',
      '[class*="modal"][style*="fixed"]',
      'div[style*="position: fixed"][style*="z-index"]',

      // Specific anti-adblock services
      '.adblock-notice',
      '#adblock-notice',
      '.ab-message',
      '#ab-message',
      '.anti-adblock',
      '#anti-adblock',

      // Persian/Arabic sites
      '[class*="تبلیغ"]',
      '[id*="تبلیغ"]',
      'div[style*="position"][style*="9999"]',

      // Common frameworks
      '#BlockMessage',
      '.BlockMessage',
      '#adBlockMessage',
      '.adblock-notification'
    ];

    const hideAntiAdblock = () => {
      antiAdblockSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            // Check if element contains anti-adblock keywords
            const text = el.textContent || '';
            const antiAdblockKeywords = [
              'adblock', 'ad block', 'adblocker', 'ad blocker',
              'disable', 'turn off', 'whitelist',
              'تبلیغات', 'افزونه', 'غیرفعال', // Persian
              'إعلان', 'حاجب', // Arabic
              'F5', 'refresh', 'reload'
            ];

            const isAntiAdblock = antiAdblockKeywords.some(keyword =>
              text.toLowerCase().includes(keyword.toLowerCase())
            );

            if (isAntiAdblock) {
              el.style.setProperty('display', 'none', 'important');
              el.style.setProperty('visibility', 'hidden', 'important');
              el.style.setProperty('opacity', '0', 'important');
              el.remove();
              self.detectionAttempts++;
              logger.debug('Anti-adblock message removed:', selector);
            }
          });
        } catch (e) {
          // Invalid selector, ignore
        }
      });

      // Remove body overflow restrictions (often set by anti-adblock)
      if (document.body) {
        document.body.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overflow');
      }

      // Remove backdrop/overlay elements with high z-index
      const highZElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const zIndex = parseInt(window.getComputedStyle(el).zIndex);
        const position = window.getComputedStyle(el).position;
        return zIndex > 999 && (position === 'fixed' || position === 'absolute');
      });

      highZElements.forEach(el => {
        const text = el.textContent || '';
        if (text.length < 1000 && (
          text.toLowerCase().includes('adblock') ||
          text.includes('تبلیغ') ||
          text.includes('افزونه') ||
          text.includes('F5')
        )) {
          el.remove();
          logger.debug('Anti-adblock overlay removed');
        }
      });
    };

    // Run immediately
    hideAntiAdblock();

    // Run after DOM loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', hideAntiAdblock);
    }

    // Monitor for dynamically added anti-adblock messages
    const observer = new MutationObserver(() => {
      hideAntiAdblock();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    logger.debug('Anti-adblock message hiding enabled (international support)');
  }

  /**
   * Get detection statistics
   * @returns {Object} - Detection stats
   */
  getStats() {
    return {
      detectionAttempts: this.detectionAttempts,
      baitsDetected: this.baits.length
    };
  }

  /**
   * Reset detection counter
   */
  reset() {
    this.detectionAttempts = 0;
    this.baits = [];
    logger.debug('Anti-detection stats reset');
  }
}

// Export singleton instance
const antiDetection = new AntiDetection();
export default antiDetection;
export { AntiDetection };
