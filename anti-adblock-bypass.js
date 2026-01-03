// PrivacyShield Max - Anti-Adblock Bypass
// This script runs BEFORE page scripts to prevent adblock detection
// Runs at document_start for maximum effectiveness

(function() {
  'use strict';

  // Anti-Adblock Bypass Active - running silently

  // ==================================================================
  // 1. HIDE EXTENSION PRESENCE
  // ==================================================================

  // Remove chrome/browser objects that reveal extension
  try {
    // Try to delete if possible
    delete window.chrome;
  } catch (e) {
    // If can't delete, try to redefine
    try {
      Object.defineProperty(window, 'chrome', {
        get: () => undefined,
        set: () => {},
        configurable: true
      });
    } catch (e2) {
      // Already defined and not configurable, skip silently
    }
  }

  // ==================================================================
  // 2. SPOOF AD SCRIPT GLOBALS (Make sites think ads loaded)
  // ==================================================================

  const adGlobals = {
    'google_ad_client': 'ca-pub-0000000000000000',
    'googletag': {
      cmd: [],
      defineSlot: function() {
        return {
          addService: function() { return this; },
          setTargeting: function() { return this; },
          setCollapseEmptyDiv: function() { return this; }
        };
      },
      pubads: function() {
        return {
          enableSingleRequest: function() {},
          collapseEmptyDivs: function() {},
          refresh: function() {},
          setTargeting: function() {},
          addEventListener: function() {},
          clear: function() {},
          setRequestNonPersonalizedAds: function() {}
        };
      },
      enableServices: function() {},
      display: function() {},
      destroySlots: function() {}
    },
    'adsbygoogle': [],
    '__gads': Date.now(),
    '__gpi': 'GA1.1.00000000.0000000000',
    '__tcfapi': function() {},
    '_sp_': { config: {} },
    'adsLoaded': true,
    'canRunAds': true,
    'isAdBlockActive': false,
    'adBlockDetected': false,
    'adblockDetected': false,
    'adBlockEnabled': false,
    'adblock': false,
    'blockAdBlock': null,
    'canRunAds': true,
    'adBlockRunning': false,
    'FuckAdBlock': function() {},
    'fuckAdBlock': function() {},
    'sniffAdBlock': null,
    'AdBlock': false
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

  // ==================================================================
  // 3. REMOVE ANTI-ADBLOCK MESSAGES (International Support)
  // ==================================================================

  function removeAntiAdblockMessages() {
    // Persian keywords: تبلیغات (ads), افزونه (extension), غیرفعال (disable), فیلترشکن (adblocker)
    const keywords = [
      'adblock', 'ad block', 'adblocker', 'ad blocker',
      'تبلیغات', 'افزونه', 'غیرفعال', 'فیلترشکن',
      'إعلان', 'حاجب', // Arabic
      'disable', 'turn off', 'whitelist', 'F5', 'refresh'
    ];

    // Find all elements with high z-index (overlays)
    const allElements = document.querySelectorAll('*');

    allElements.forEach(el => {
      try {
        const styles = window.getComputedStyle(el);
        const zIndex = parseInt(styles.zIndex);
        const position = styles.position;
        const text = (el.textContent || '').toLowerCase();

        // Check for high z-index overlays with anti-adblock text
        if (
          zIndex > 999 &&
          (position === 'fixed' || position === 'absolute') &&
          text.length < 1000
        ) {
          const hasKeyword = keywords.some(keyword =>
            text.includes(keyword.toLowerCase())
          );

          if (hasKeyword) {
            el.remove();
            // Anti-adblock overlay removed silently
          }
        }

        // Check class/id for anti-adblock patterns
        const className = (el.className || '').toString().toLowerCase();
        const id = (el.id || '').toLowerCase();

        if (
          className.includes('adblock') ||
          className.includes('ad-block') ||
          id.includes('adblock') ||
          id.includes('ad-block')
        ) {
          const hasKeyword = keywords.some(keyword =>
            text.includes(keyword.toLowerCase())
          );

          if (hasKeyword) {
            el.remove();
            // Anti-adblock message removed silently
          }
        }
      } catch (e) {
        // Ignore errors
      }
    });

    // Remove body overflow restrictions and other blocking styles
    if (document.body) {
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('height');
      document.body.classList.remove('adblock-detected', 'ad-blocker-active', 'has-adblock');

      document.documentElement.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('position');
      document.documentElement.style.removeProperty('height');
      document.documentElement.classList.remove('adblock-detected', 'ad-blocker-active', 'has-adblock');
    }

    // Remove modal backdrops
    document.querySelectorAll('.modal-backdrop, .overlay, [class*="backdrop"]').forEach(el => {
      const text = (el.textContent || '').toLowerCase();
      keywords.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
          el.remove();
        }
      });
    });
  }

  // Run immediately
  removeAntiAdblockMessages();

  // Run after DOM loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeAntiAdblockMessages);
  } else {
    removeAntiAdblockMessages();
  }

  // Monitor for dynamically added messages
  const observer = new MutationObserver(() => {
    removeAntiAdblockMessages();
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ==================================================================
  // 4. BAIT ELEMENT PROTECTION
  // ==================================================================

  const originalQuerySelector = document.querySelector;
  const originalQuerySelectorAll = document.querySelectorAll;

  const baitPatterns = [
    /\.ad[^a-z]/i,
    /\.ads[^a-z]/i,
    /\.advertisement/i,
    /\.advert[^a-z]/i,
    /#ad[^a-z]/i,
    /#ads[^a-z]/i
  ];

  function isBaitSelector(selector) {
    return baitPatterns.some(pattern => pattern.test(selector));
  }

  document.querySelector = function(selector) {
    if (isBaitSelector(selector)) {
      // Bait selector intercepted silently

      // Return fake visible element
      const fakeElement = document.createElement('div');
      fakeElement.style.display = 'block';
      fakeElement.style.visibility = 'visible';
      fakeElement.style.width = '1px';
      fakeElement.style.height = '1px';
      Object.defineProperty(fakeElement, 'offsetHeight', { get: () => 1 });
      Object.defineProperty(fakeElement, 'offsetWidth', { get: () => 1 });
      return fakeElement;
    }

    return originalQuerySelector.call(this, selector);
  };

  document.querySelectorAll = function(selector) {
    if (isBaitSelector(selector)) {
      // Bait selector intercepted silently

      const fakeElement = document.createElement('div');
      fakeElement.style.display = 'block';
      fakeElement.style.visibility = 'visible';
      Object.defineProperty(fakeElement, 'offsetHeight', { get: () => 1 });
      Object.defineProperty(fakeElement, 'offsetWidth', { get: () => 1 });
      return [fakeElement];
    }

    return originalQuerySelectorAll.call(this, selector);
  };

  // ==================================================================
  // 5. PREVENT FETCH/XHR DETECTION
  // ==================================================================

  const adDomains = [
    'doubleclick.net',
    'googlesyndication.com',
    'googleadservices.com',
    'advertising.com',
    'adsystem.com',
    'adtech.de'
  ];

  function isAdURL(url) {
    return adDomains.some(domain => url.includes(domain));
  }

  // Fetch spoofing
  const originalFetch = window.fetch;
  window.fetch = function(url, ...args) {
    return originalFetch(url, ...args).catch(error => {
      if (typeof url === 'string' && isAdURL(url)) {
        // Faking successful response silently

        return new Response('', {
          status: 200,
          statusText: 'OK',
          headers: new Headers({
            'Content-Type': 'application/javascript'
          })
        });
      }

      throw error;
    });
  };

  // XHR spoofing
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._url = url;
    return originalOpen.call(this, method, url, ...args);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    const xhr = this;

    if (isAdURL(xhr._url)) {
      const originalOnError = xhr.onerror;

      xhr.onerror = function() {
        // Faking successful XHR silently

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

  // Anti-Adblock Bypass Initialized - running silently

})();
