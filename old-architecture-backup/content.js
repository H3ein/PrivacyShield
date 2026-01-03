// PrivacyShield Max - Content Script
// DOM manipulation, element blocking, and fingerprinting protection

// Error handling wrapper
try {
  const browserAPI = (typeof browser !== 'undefined')
    ? browser
    : (typeof chrome !== 'undefined' ? chrome : null);

  class PrivacyShieldContent {
    constructor() {
      this.blockedElements = new Set();
      this.blockedSelectors = []; // Store CSS selectors for persistence
      this.observers = [];
      this.originalGetContext = null;
      this.originalToDataURL = null;
      this.originalGetUserMedia = null;
      this.settings = {
        enabled: true,
        fingerprintingProtection: true,
        blockCookieBanners: true,
        stealthMode: true,
        antiDetection: true
      };
      
      // Performance tracking
      this.performanceStats = {
        mutationsProcessed: 0,
        elementsBlocked: 0,
        startTime: Date.now()
      };

      // Stats throttling (prevent message flooding)
      this.statsUpdateScheduled = false;
      this.lastStatsUpdate = 0;
      this.STATS_UPDATE_INTERVAL = 5000; // Send stats max once per 5 seconds
      this.pendingStatsUpdate = false;

      // Anti-detection systems
      this.baitElements = new Set();
      this.detectionAttempts = 0;
      this.lastDetectionCheck = Date.now();
      this.blockingDelay = Math.random() * 100 + 50; // Random delay 50-150ms
      
      // Advanced anti-detection systems
      this.mutationObserverBypass = new Map();
      this.scriptExecutionSimulator = new Map();
      this.preservedElements = new Map();
      this.networkSpoofing = new Map();
      this.timingProtection = {
        originalGetTime: Date.now,
        originalPerformanceNow: performance.now,
        timeOffsets: new Map()
      };
      
      this.initialize();
    }

    // Cleanup method to prevent memory leaks
    cleanup() {
      // Disconnect all observers
      this.observers.forEach(observer => {
        if (observer && observer.disconnect) {
          observer.disconnect();
        }
      });
      this.observers = [];
      
      // Clear blocked elements set
      this.blockedElements.clear();
      
      // Restore original functions if they were overridden
      if (this.originalGetContext && CanvasRenderingContext2D.prototype.getContext) {
        CanvasRenderingContext2D.prototype.getContext = this.originalGetContext;
      }
      if (this.originalToDataURL && HTMLCanvasElement.prototype.toDataURL) {
        HTMLCanvasElement.prototype.toDataURL = this.originalToDataURL;
      }
      if (this.originalGetUserMedia && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia = this.originalGetUserMedia;
      }
      
      console.log('PrivacyShield Max - Content script cleaned up');
    }

    initialize() {
      console.log('PrivacyShield Max - Content script initialized');

      this.loadSettings().then(() => {
        if (!this.settings.enabled) {
          return;
        }

        // Start DOM observation
        this.startDOMObserver();
        
        // Block ads immediately
        this.blockAdsImmediately();
        
        // Setup fingerprinting protection
        if (this.settings.fingerprintingProtection) {
          this.setupFingerprintingProtection();
        }
        
        // Block cookie banners
        if (this.settings.blockCookieBanners) {
          this.blockCookieBanners();
        }
        
        // Setup element picker
        this.setupElementPicker();

        // Start visit tracking for learning system
        this.startVisitTracking();

        // Load and apply saved blocked elements
        this.loadBlockedElements().then(hasSaved => {
          if (hasSaved) {
            // Wait for DOM to be ready before applying
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.applyBlockedElements(), 100);
              });
            } else {
              // DOM is already ready
              setTimeout(() => this.applyBlockedElements(), 100);
            }
          }
        });
        
        // Setup anti-detection measures
        if (this.settings.antiDetection) {
          this.setupAntiDetection();
          this.setupAdvancedAntiDetection();
        }
        
        // Listen for messages from background
        this.setupMessageListener();
        
        // Setup cleanup on page navigation changes to prevent memory leaks
        // Use Page Visibility API for better performance
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            // Page is hidden, do lightweight cleanup
            this.performLightCleanup();
          }
        });
        
        // Setup cleanup only on actual page unload, not service worker hibernation
        window.addEventListener('beforeunload', () => {
          console.log('PrivacyShield Max - Performing lightweight cleanup...');
          // Don't do full cleanup, service worker may just be hibernating
          this.observers.forEach(observer => {
            if (observer && observer.disconnect) observer.disconnect();
          });
          console.log('PrivacyShield Max - Lightweight cleanup completed');
        });
      });
    }

    async loadSettings() {
      try {
        if (!browserAPI || !browserAPI.storage || !browserAPI.storage.local) return;
        try {
          const stored = await browserAPI.storage.local.get({
            enabled: true,
            fingerprintingProtection: true,
            blockCookieBanners: true,
            stealthMode: true,
            antiDetection: true
          });
          this.settings = Object.assign({}, this.settings, stored || {});
        } catch (extensionError) {
          if (extensionError.message && extensionError.message.includes('Extension context invalidated')) {
            console.warn('⚠️ Extension context invalidated, using default settings');
            // Use default settings when extension context is invalid
          } else {
            throw extensionError;
          }
        }
      } catch (e) {
        // Only log if it's not a context invalidation error (already handled above)
        if (!e.message || !e.message.includes('Extension context invalidated')) {
          console.log('PrivacyShield Max - Content settings load failed:', e);
        }
      }
    }

    // Anti-detection setup
    setupAntiDetection() {
      console.log('PrivacyShield Max - Setting up anti-detection measures');
      
      // Override console.log to hide our traces
      this.hideConsoleTraces();
      
      // Detect and handle bait elements
      this.detectBaitElements();
      
      // Prevent detection scripts
      this.blockDetectionScripts();
      
      // Randomize blocking timing
      this.randomizeBlockingTiming();
      
      // Monitor for detection attempts
      this.monitorDetectionAttempts();
    }

    // Hide console traces from detection (but allow essential debugging)
    hideConsoleTraces() {
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      // Filter out only sensitive console messages, allow debugging
      console.log = function(...args) {
        try {
          // Convert args to string safely
          const message = args.map(arg => {
            if (typeof arg === 'string') return arg;
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            try {
              return String(arg);
            } catch (e) {
              return '[object]';
            }
          }).join(' ');

          // Allow element picker and essential debugging logs
          if (message.includes('PrivacyShield Max - Element picker') ||
              message.includes('PrivacyShield Max - Message received') ||
              message.includes('PrivacyShield Max - Starting element picker') ||
              message.includes('PrivacyShield Max - Element picked') ||
              message.includes('PrivacyShield Max - Element picker started') ||
              message.includes('PrivacyShield Max - Element picker setup') ||
              message.includes('PrivacyShield Max - Element picker cleanup')) {
            return originalLog.apply(console, args);
          }
          // Filter out sensitive traces that could reveal our presence
          if (message.includes('blocked') ||
              message.includes('ad blocker') ||
              message.includes('detection') ||
              message.includes('bait') ||
              message.includes('spoof') ||
              message.includes('simulated')) {
            return; // Don't log sensitive traces
          }
          return originalLog.apply(console, args);
        } catch (e) {
          // If error, just call original
          return originalLog.apply(console, args);
        }
      };
      
      console.error = function(...args) {
        try {
          const message = args.map(arg => String(arg)).join(' ');
          // Allow element picker errors for debugging
          if (message.includes('PrivacyShield Max - Element picker') ||
              message.includes('PrivacyShield Max - Failed to start element picker')) {
            return originalError.apply(console, args);
          }
          // Filter out sensitive error traces
          if (message.includes('PrivacyShield') &&
             (message.includes('blocked') || message.includes('detection'))) {
            return; // Don't log sensitive error traces
          }
          return originalError.apply(console, args);
        } catch (e) {
          return originalError.apply(console, args);
        }
      };

      console.warn = function(...args) {
        try {
          const message = args.map(arg => String(arg)).join(' ');
          // Allow element picker warnings for debugging
          if (message.includes('PrivacyShield Max - Element picker')) {
            return originalWarn.apply(console, args);
          }
          // Filter out sensitive warning traces
          if (message.includes('PrivacyShield') &&
             (message.includes('blocked') || message.includes('detection'))) {
            return; // Don't log sensitive warning traces
          }
          return originalWarn.apply(console, args);
        } catch (e) {
          return originalWarn.apply(console, args);
        }
      };
    }

    // Detect bait elements used for ad blocker detection
    detectBaitElements() {
      const baitSelectors = [
        '#ad', '#ads', '#advertisement', '#banner',
        '.ad', '.ads', '.advertisement', '.banner',
        '[id*="google_ads"]', '[id*="adsense"]',
        '.adsbox', '#ad-container', '#ad-div'
      ];
      
      baitSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            // Check if it's a bait element (small, hidden, or suspicious)
            if (this.isBaitElement(element)) {
              this.baitElements.add(element);
              // Bait element detected silently
            }
          });
        } catch (e) {
          // Ignore errors
        }
      });
    }

    // Check if element is a bait/honeypot
    isBaitElement(element) {
      const styles = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      // Bait elements are typically:
      // 1. Very small (1x1 pixel or less)
      // 2. Hidden off-screen
      // 3. Have no content
      // 4. Have suspicious positioning
      
      const isTiny = rect.width <= 5 && rect.height <= 5;
      const isOffScreen = rect.left < -100 || rect.top < -100;
      const isHidden = styles.display === 'none' || styles.visibility === 'hidden';
      const hasNoContent = !element.textContent.trim() && element.children.length === 0;
      const isSuspiciousPosition = styles.position === 'absolute' && 
                                 (parseInt(styles.left) < -50 || parseInt(styles.top) < -50);
      
      return (isTiny || isOffScreen || isHidden || hasNoContent || isSuspiciousPosition);
    }

    // Block detection scripts
    blockDetectionScripts() {
      // Override common detection methods
      const detectionMethods = [
        'canRunAds',
        'canRunGoogleAdsense',
        'checkAdsBlocked',
        'adblockDetected',
        'isAdBlockActive'
      ];
      
      detectionMethods.forEach(method => {
        if (window[method]) {
          window[method] = () => false; // Always return false (no ad blocker detected)
        }
      });
      
      // Override document.createElement to detect bait script creation
      const self = this;
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);

        if (tagName.toLowerCase() === 'script') {
          // Monitor script src for detection patterns
          const originalSetAttribute = element.setAttribute;
          element.setAttribute = function(name, value) {
            if (name === 'src' && self.isDetectionScript(value)) {
              // Block detection scripts
              throw new Error('Script blocked');
            }
            return originalSetAttribute.call(this, name, value);
          };
        }

        return element;
      };
    }

    // Check if script is for ad blocker detection
    isDetectionScript(src) {
      const detectionPatterns = [
        '/adblock', '/ad-block', '/adblocker',
        'fingerprintjs', 'fingerprint',
        'detectadblock', 'adblock-detected',
        'adsbygoogle', 'google_ads'
      ];
      
      return detectionPatterns.some(pattern => src.toLowerCase().includes(pattern));
    }

    // Randomize blocking timing to avoid patterns
    randomizeBlockingTiming() {
      // Add random delays to blocking operations
      const originalBlockElement = this.blockElement.bind(this);
      
      this.blockElement = function(element, save = true) {
        // Add random delay to make detection harder
        const delay = Math.random() * 200 + 50; // 50-250ms random delay
        
        setTimeout(() => {
          originalBlockElement(element, save);
        }, delay);
      };
    }

    // Monitor for detection attempts
    monitorDetectionAttempts() {
      // Monitor for common detection patterns
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check for detection elements
              if (node.id && node.id.includes('ad') && node.textContent.includes('disable')) {
                this.detectionAttempts++;
                // Detection attempt detected silently

                // Counter-measure: remove the detection element
                if (this.detectionAttempts > 2) {
                  node.remove();
                }
              }
            }
          });
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      this.observers.push(observer);
    }

    // Advanced anti-detection setup
    setupAdvancedAntiDetection() {
      console.log('PrivacyShield Max - Setting up advanced anti-detection measures');
      
      // Setup DOM mutation observer bypass
      this.setupMutationObserverBypass();
      
      // Setup script execution simulator
      this.setupScriptExecutionSimulator();
      
      // Setup element preservation
      this.setupElementPreservation();
      
      // Setup network request spoofing
      this.setupNetworkSpoofing();
      
      // Setup timing attack protection
      this.setupTimingAttackProtection();
    }

    // DOM Mutation Observer Bypass
    setupMutationObserverBypass() {
      // Override MutationObserver to prevent detection of our changes
      const originalMutationObserver = window.MutationObserver;
      const self = this;
      
      window.MutationObserver = function(callback) {
        const wrappedCallback = function(mutations, observer) {
          // Filter out mutations caused by our blocking
          const filteredMutations = mutations.filter(mutation => {
            // Skip mutations on blocked elements
            if (mutation.target && self.blockedElements.has(mutation.target)) {
              return false;
            }
            
            // Skip attribute changes we made
            if (mutation.type === 'attributes') {
              if (mutation.attributeName === 'style' && 
                  self.blockedElements.has(mutation.target)) {
                return false;
              }
            }
            
            // Skip removed nodes that we blocked
            if (mutation.type === 'childList') {
              const filteredRemovedNodes = Array.from(mutation.removedNodes).filter(node => {
                return !self.blockedElements.has(node);
              });
              
              const filteredAddedNodes = Array.from(mutation.addedNodes).filter(node => {
                return !self.blockedElements.has(node);
              });
              
              // Create new mutation record with filtered nodes
              if (filteredRemovedNodes.length === 0 && filteredAddedNodes.length === 0) {
                return false; // Skip this mutation entirely
              }
              
              // Update the mutation by creating a new object with filtered nodes
              Object.defineProperty(mutation, 'removedNodes', {
                value: filteredRemovedNodes,
                writable: false,
                configurable: true
              });
              
              Object.defineProperty(mutation, 'addedNodes', {
                value: filteredAddedNodes,
                writable: false,
                configurable: true
              });
            }
            
            return true;
          });
          
          // Only call original callback if we have mutations to report
          if (filteredMutations.length > 0) {
            callback(filteredMutations, observer);
          }
        };
        
        return new originalMutationObserver(wrappedCallback);
      };
      
      // Store original for cleanup
      this.mutationObserverBypass.set('original', originalMutationObserver);
    }

    // Script Execution Simulator
    setupScriptExecutionSimulator() {
      // Override createElement to simulate script execution
      const originalCreateElement = document.createElement;
      const self = this;

      document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);
        
        if (tagName.toLowerCase() === 'script') {
          // Monitor script creation
          const originalSetAttribute = element.setAttribute;
          element.setAttribute = function(name, value) {
            if (name === 'src') {
              // Check if this is a detection script
              if (self.isDetectionScript(value)) {
                // Simulate script execution instead of blocking
                self.simulateScriptExecution(value, element);
                return;
              }
              
              // Check if this is an ad script
              if (self.shouldBlockScript(value)) {
                // Simulate the script's effects without actually loading it
                self.simulateAdScriptEffects(value, element);
                return;
              }
            }
            return originalSetAttribute.call(this, name, value);
          };
          
          // Override appendChild for scripts
          const originalAppendChild = element.appendChild;
          element.appendChild = function(child) {
            // Prevent appending to blocked scripts
            if (self.blockedElements.has(this)) {
              return;
            }
            return originalAppendChild.call(this, child);
          };
        }
        
        return element;
      };
      
      this.scriptExecutionSimulator.set('originalCreateElement', originalCreateElement);
    }

    // Simulate script execution to prevent detection
    simulateScriptExecution(src, element) {
      // Simulating script execution silently

      // Set fake flags that detection scripts look for
      if (src.includes('ads.js') || src.includes('advertisement')) {
        window.adsLoaded = true;
        window.adBlockDetected = false;
        window.googleAdLoaded = true;
      }
      
      // Simulate common ad script variables
      if (src.includes('googleads') || src.includes('doubleclick')) {
        window.google_ad_slot = undefined;
        window.google_ad_client = undefined;
        window.google_ad_height = undefined;
        window.google_ad_width = undefined;
      }
      
      // Make the element appear to have loaded
      element.setAttribute('data-simulated', 'true');
      element.setAttribute('data-loaded', 'true');
    }

    // Simulate ad script effects
    simulateAdScriptEffects(src, element) {
      // Simulating ad script effects silently

      // Create fake ad containers that look real but are harmless
      setTimeout(() => {
        const fakeAd = document.createElement('div');
        fakeAd.style.cssText = `
          width: 300px;
          height: 250px;
          border: 1px solid #ccc;
          background: #f0f0f0;
          display: none;
          position: absolute;
          left: -9999px;
          top: -9999px;
        `;
        fakeAd.setAttribute('data-fake-ad', 'true');
        fakeAd.setAttribute('data-ad-src', src);
        document.body.appendChild(fakeAd);
        
        // Remove after a short time to prevent accumulation
        setTimeout(() => {
          if (fakeAd.parentNode) {
            fakeAd.parentNode.removeChild(fakeAd);
          }
        }, 5000);
      }, Math.random() * 1000 + 500);
    }

    // Element Preservation Techniques
    setupElementPreservation() {
      // Instead of removing elements, preserve them but make them harmless
      const self = this;
      
      // Override removeChild to preserve elements
      const originalRemoveChild = Node.prototype.removeChild;
      Node.prototype.removeChild = function(child) {
        // If we're trying to remove a blocked element, preserve it instead
        if (self.blockedElements.has(child)) {
          self.preserveElement(child);
          return child; // Return the element but don't actually remove it
        }
        return originalRemoveChild.call(this, child);
      };
      
      this.preservedElements.set('originalRemoveChild', originalRemoveChild);
    }

    // Preserve element but make it harmless
    preserveElement(element) {
      // Preserving element silently

      // Store original state
      const originalState = {
        parentNode: element.parentNode,
        nextSibling: element.nextSibling,
        style: {
          display: element.style.display,
          visibility: element.style.visibility,
          opacity: element.style.opacity,
          position: element.style.position,
          left: element.style.left,
          top: element.style.top,
          width: element.style.width,
          height: element.style.height,
          zIndex: element.style.zIndex
        }
      };
      
      this.preservedElements.set(element, originalState);
      
      // Make element invisible but keep it in DOM - DON'T clear content
      element.style.cssText = `
        position: absolute !important;
        left: -99999px !important;
        top: -99999px !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
        z-index: -9999 !important;
        overflow: hidden !important;
      `;
      
      // DON'T clear content - this breaks websites
      // Just hide the element without destroying its content
    }

    // Network Request Spoofing
    setupNetworkSpoofing() {
      // Override fetch to simulate network requests
      const originalFetch = window.fetch;
      const self = this;
      
      window.fetch = function(url, options) {
        const urlStr = typeof url === 'string' ? url : url.url;
        
        // Check if this is an ad-related request
        if (self.isAdRequest(urlStr)) {
          // Spoofing ad request silently

          // Return a fake successful response
          return Promise.resolve(new Response(JSON.stringify({
            status: 'success',
            ad_loaded: true,
            impression_id: Math.random().toString(36).substr(2, 9),
            creative_id: Math.random().toString(36).substr(2, 9)
          }), {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': 'application/json'
            }
          }));
        }
        
        return originalFetch.call(this, url, options);
      };
      
      // Override XMLHttpRequest for broader compatibility
      const originalXHR = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        const originalOpen = xhr.open;
        const originalSend = xhr.send;
        
        xhr.open = function(method, url, async, user, pass) {
          this._url = url;
          this._method = method;
          
          if (self.isAdRequest(url)) {
            // Intercepting XHR ad request silently
            this._isAdRequest = true;
          }
          
          return originalOpen.call(this, method, url, async, user, pass);
        };
        
        xhr.send = function(data) {
          if (this._isAdRequest) {
            // Simulate successful response
            setTimeout(() => {
              Object.defineProperty(xhr, 'readyState', { value: 4, writable: false });
              Object.defineProperty(xhr, 'status', { value: 200, writable: false });
              Object.defineProperty(xhr, 'responseText', { 
                value: JSON.stringify({
                  status: 'success',
                  ad_loaded: true,
                  impression_id: Math.random().toString(36).substr(2, 9)
                }), 
                writable: false 
              });
              
              if (xhr.onreadystatechange) {
                xhr.onreadystatechange.call(xhr);
              }
              if (xhr.onload) {
                xhr.onload.call(xhr);
              }
            }, Math.random() * 100 + 50);
            
            return;
          }
          
          return originalSend.call(this, data);
        };
        
        return xhr;
      };
      
      this.networkSpoofing.set('originalFetch', originalFetch);
      this.networkSpoofing.set('originalXHR', originalXHR);
    }

    // Check if request is ad-related
    isAdRequest(url) {
      const adPatterns = [
        '/ads/', '/advertisement', '/doubleclick',
        'googleads', 'googlesyndication', 'googleadservices',
        'amazon-adsystem', 'facebook.com/tr', 'analytics',
        'tracking', 'beacon', 'pixel'
      ];
      
      return adPatterns.some(pattern => url.toLowerCase().includes(pattern));
    }

    // Timing Attack Protection
    setupTimingAttackProtection() {
      // Override timing functions to prevent timing-based detection
      const self = this;
      
      // Add noise to Date.now()
      const originalDateNow = Date.now;
      Date.now = function() {
        const realTime = originalDateNow.call(this);
        const noise = Math.random() * 10 - 5; // ±5ms noise
        return realTime + noise;
      };
      
      // Add noise to performance.now()
      const originalPerformanceNow = performance.now;
      performance.now = function() {
        const realTime = originalPerformanceNow.call(this);
        const noise = Math.random() * 2 - 1; // ±1ms noise
        return realTime + noise;
      };
      
      // Store originals
      this.timingProtection.originalGetTime = originalDateNow;
      this.timingProtection.originalPerformanceNow = originalPerformanceNow;
    }

    // Check if script should be blocked
    shouldBlockScript(src) {
      const blockPatterns = [
        'ads.js', 'advertisement.js', 'banner.js',
        'doubleclick', 'googleads', 'googlesyndication',
        'amazon-adsystem', 'facebook.com/tr'
      ];
      
      return blockPatterns.some(pattern => src.toLowerCase().includes(pattern));
    }

  // Start observing DOM changes for dynamic content (OPTIMIZED)
  startDOMObserver() {
    // Enhanced throttling to prevent performance issues
    let throttleTimeout = null;
    let pendingMutations = [];
    const THROTTLE_DELAY = 250; // Increased from 100ms to 250ms
    const CHUNK_SIZE = 10; // Process 10 elements at a time

    const handleMutations = (mutations) => {
      // Collect mutations
      pendingMutations.push(...mutations);

      if (throttleTimeout) return; // Already scheduled

      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;

        // Process mutations in batches for better performance
        const elementsToCheck = [];

        pendingMutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              elementsToCheck.push(node);
            }
          });
        });

        // Clear processed mutations
        pendingMutations = [];

        // Process in chunks to prevent blocking main thread
        if (elementsToCheck.length > 0) {
          let processed = 0;

          const processChunk = () => {
            const chunk = elementsToCheck.slice(processed, processed + CHUNK_SIZE);

            chunk.forEach(element => {
              this.checkAndBlockElement(element);
            });

            processed += CHUNK_SIZE;

            if (processed < elementsToCheck.length) {
              // Use requestIdleCallback for non-urgent processing
              if ('requestIdleCallback' in window) {
                requestIdleCallback(processChunk, { timeout: 1000 });
              } else {
                // Fallback to setTimeout
                setTimeout(processChunk, 0);
              }
            }
          };

          // Start processing chunks
          if ('requestIdleCallback' in window) {
            requestIdleCallback(processChunk, { timeout: 1000 });
          } else {
            requestAnimationFrame(processChunk);
          }
        }
      }, THROTTLE_DELAY);
    };
    
    const observer = new MutationObserver(handleMutations);

    // Use more efficient observer options
    // Wait for body to be available before observing
    const startObserving = () => {
      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false, // Don't observe attribute changes for better performance
          characterData: false // Don't observe text changes
        });
        this.observers.push(observer);
      } else {
        // If body not ready, observe documentElement instead
        if (document.documentElement) {
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
          });
          this.observers.push(observer);
        } else {
          // Wait for DOM to be ready
          setTimeout(startObserving, 10);
        }
      }
    };

    startObserving();
  }

  // Block ads immediately on page load
  blockAdsImmediately() {
    // Use requestIdleCallback for better performance during page load
    const processBlocks = () => {
      const adSelectors = [
        // More specific ad containers (avoid broad matches that break sites)
        '[id*="advert"]', '[class*="advert"]',
        '[id*="advertisement"]', '[class*="advertisement"]',
        '[id*="sponsor"]', '[class*="sponsor"]',
        '[id*="promoted"]', '[class*="promoted"]',
        '[id*="banner-ad"]', '[class*="banner-ad"]',
        '[id^="ad-"]', '[class^="ad-"]',
        '[id$="-ad"]', '[class$="-ad"]',
        '[id^="ads-"]', '[class^="ads-"]',
        '[id$="-ads"]', '[class$="-ads"]',
        
        // Specific ad networks
        '[data-ad-client]', '[data-ad-slot]',
        'iframe[src*="doubleclick"]',
        'iframe[src*="googleads"]',
        'iframe[src*="amazon-adsystem"]',
        'iframe[src*="facebook.com/tr"]',
        
        // Sponsored content (more specific)
        '[data-sponsor]', '[data-promoted]',
        '.sponsored-content', '.promotion-banner',
        '.ad-container', '.ad-wrapper',
        '.google-ad', '.adsense',
        
        // Video ads
        '[id*="video-ad"]', '[class*="video-ad"]',
        '.preroll-ad', '.midroll-ad',
        
        // Social media widgets (only ad-related)
        '.twitter-widget', '.fb-widget-ad',
        '.instagram-ad', '.linkedin-ad',
        
        // Tracking pixels
        'img[src*="pixel"]', 'img[src*="beacon"]',
        'img[src*="tracking"]', 'img[src*="analytics"]',
        
        // REMOVED OVERLY BROAD OVERLAY SELECTORS - these break websites
        // Only block specific ad overlays, not all overlays
        '[id*="interstitial-ad"]', '[class*="interstitial-ad"]',
        '[id*="popup-ad"]', '[class*="popup-ad"]',
        '[id*="modal-ad"]', '[class*="modal-ad"]',
        '[id*="splash-ad"]', '[class*="splash-ad"]',
        '[id*="ad-lightbox"]', '[class*="ad-lightbox"]',
        '[id*="popup-ad-overlay"]', '[class*="popup-ad-overlay"]',
        
        // Common interstitial ad containers (more specific)
        '.interstitial-ad', '.overlay-ad', '.modal-ad',
        '.popup-overlay-ad', '.ad-overlay', '.splash-screen-ad',
        '.pre-roll-overlay', '.mid-roll-overlay',
        
        // Specific interstitial ad networks
        'iframe[src*="doubleclick"]',
        'iframe[src*="googleadservices"]',
        'iframe[src*="googlesyndication"]',
        'iframe[src*="adnxs"]',
        'iframe[src*="chitika"]',
        'iframe[src*="infolinks"]',
        'iframe[src*="propellerads"]',
        'iframe[src*="taboola"]',
        'iframe[src*="outbrain"]',
        
        // Script-based interstitials (more specific)
        'script[src*="interstitial-ad"]',
        'script[src*="popup-ad"]',
        'script[src*="overlay-ad"]',
        'script[src*="modal-ad"]',
        
        // Ad script filenames (more specific)
        'script[src*="ads.js"]',
        'script[src*="pagead.js"]',
        'script[src*="/ads/"]',
        'script[src*="/ad/"]',
        'script[src*="ad.js"]',
        'script[src*="advert"]',
        
        // Static ad containers (cosmetic)
        '.ad', '.ads', '.advertisement',
        '[id*="ad"]', '[class*="ad"]',
        '.google-ad', '.google-ads',
        '.adsbygoogle',
        '#ads', '#ad',
        
        // Dynamic ad placeholders
        '[data-ad]', '[data-ads]',
        '.ad-slot', '.ad-space',
        '.ad-placeholder', '.ad-container'
      ];

      // Process selectors in batches to prevent blocking UI
      const BATCH_SIZE = 5;
      let processed = 0;
      
      const processBatch = () => {
        const batch = adSelectors.slice(processed, processed + BATCH_SIZE);
        
        batch.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              this.blockElement(element);
              this.performanceStats.elementsBlocked++;
            });
          } catch (error) {
            console.log(`Selector failed: ${selector}`, error);
          }
        });
        
        processed += BATCH_SIZE;
        
        // Continue with next batch if there are more selectors
        if (processed < adSelectors.length) {
          if (window.requestIdleCallback) {
            requestIdleCallback(processBatch, { timeout: 100 });
          } else {
            setTimeout(processBatch, 0);
          }
        }
      };
      
      // Start processing
      processBatch();
    };
    
    // Use requestIdleCallback if available for better performance
    if (window.requestIdleCallback) {
      requestIdleCallback(processBlocks, { timeout: 1000 });
    } else {
      // Fallback for browsers that don't support it
      setTimeout(processBlocks, 100);
    }
    
    // Special handling for interstitial overlays
    this.blockInterstitialOverlays();
  }

  // Special handling for interstitial overlays
  blockInterstitialOverlays() {
    // Check for specific interstitial ad patterns only (avoid blocking legitimate overlays)
    const interstitialSelectors = [
      '.interstitial-ad',
      '.ad-overlay',
      '.popup-overlay-ad',
      '.modal-ad-overlay',
      '.splash-overlay-ad',
      '.lightbox-ad-overlay',
      '.pre-roll-overlay',
      '.mid-roll-overlay',
      
      // Only block overlays that are clearly ads
      '[id*="interstitial-ad"]',
      '[class*="interstitial-ad"]',
      '[id*="popup-ad"]',
      '[class*="popup-ad"]',
      '[id*="modal-ad"]',
      '[class*="modal-ad"]',
      
      // Ad-specific iframes
      'iframe[src*="interstitial"]',
      'iframe[src*="popup-ad"]',
      'iframe[src*="overlay-ad"]',
      'iframe[src*="modal-ad"]'
    ];

    interstitialSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          // Check if it looks like an interstitial ad
          if (this.isInterstitialAd(element)) {
            this.blockElement(element);
            // Blocked interstitial ad silently
          }
        });
      } catch (error) {
        // Silently skip failed selectors
      }
    });

    // Monitor for dynamically added interstitials
    this.observeInterstitials();
  }

  // Check if element is an interstitial ad
  isInterstitialAd(element) {
    // NEVER block our own extension UI elements
    const id = element.id || '';
    const className = (element.className || '').toString();
    if (id.startsWith('privacyshield-') || className.includes('privacyshield-')) {
      return false;
    }

    const styles = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    // Check for interstitial characteristics
    const isFullScreen = rect.width >= window.innerWidth * 0.8 &&
                        rect.height >= window.innerHeight * 0.8;
    const isFixed = styles.position === 'fixed' || styles.position === 'absolute';
    const hasHighZIndex = parseInt(styles.zIndex) > 1000;
    const hasBackground = styles.backgroundColor &&
                       styles.backgroundColor !== 'transparent' &&
                       styles.backgroundColor !== 'rgba(0, 0, 0, 0)';

    // Check for common interstitial content
    const text = element.textContent.toLowerCase();
    const hasAdContent = text.includes('advertisement') ||
                        text.includes('sponsored') ||
                        text.includes('skip ad') ||
                        text.includes('close ad') ||
                        text.includes('continue to') ||
                        text.includes('wait') && text.includes('seconds');

    // Check for common interstitial attributes (stricter matching)
    const idLower = id.toLowerCase();
    const classLower = className.toLowerCase();
    const hasAdAttributes = (idLower.includes('ad-') || idLower.includes('-ad') || idLower === 'ad') ||
                          (classLower.includes('ad-') || classLower.includes('-ad')) ||
                          element.hasAttribute('data-ad') ||
                          element.hasAttribute('data-sponsor');

    // If it has multiple interstitial characteristics, block it
    const interstitialScore = [
      isFullScreen, isFixed, hasHighZIndex, hasBackground,
      hasAdContent, hasAdAttributes
    ].filter(Boolean).length;

    return interstitialScore >= 3; // Require at least 3 characteristics
  }

  // Monitor for dynamically added interstitials
  observeInterstitials() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if it's an interstitial ad
            if (this.isInterstitialAd(node)) {
              this.blockElement(node);
              // Blocked dynamic interstitial ad silently
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.push(observer);
  }

  // Check and block individual elements
  checkAndBlockElement(element) {
    const tagName = element.tagName.toLowerCase();
    const id = element.id || '';
    const className = element.className || '';
    const src = element.src || '';
    const href = element.href || '';

    // Cosmetic filter: ad script filenames (ads.js, pagead.js, etc.)
    if (tagName === 'script' && (
        src.includes('ads.js') || src.includes('pagead.js') ||
        src.includes('/ads/') || src.includes('/ad/') ||
        src.includes('ad.js') || src.includes('advert')
    )) {
      this.blockElement(element);
      return;
    }

    // Check against ad patterns
    const adPatterns = [
      /ad(s|vertisement)?/i,
      /banner/i,
      /popup/i,
      /modal/i,
      /sponsor/i,
      /promotion/i,
      /doubleclick/i,
      /googleads/i,
      /amazon-adsystem/i,
      /facebook\.com\/tr/i,
      // Cosmetic: ad script filenames
      /ads\.js/i,
      /pagead\.js/i,
      /\/ads\//i,
      /\/ad\//i,
      /ad\.js/i,
      /advert/i
    ];

    const isAd = adPatterns.some(pattern => 
      pattern.test(id) || 
      pattern.test(className) || 
      pattern.test(src) || 
      pattern.test(href)
    );

    if (isAd) {
      this.blockElement(element);
    }

    // Check for tracking elements
    if (this.isTrackingElement(element)) {
      this.blockElement(element);
    }
  }

    // Generate a unique CSS selector for an element
    generateSelector(element) {
      if (!element) return null;
      
      try {
        // Try ID first
        if (element.id) {
          return `#${element.id}`;
        }
        
        // Try unique class combination
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.trim().split(/\s+/).filter(cls => cls.length > 0);
          if (classes.length > 0) {
            const selector = '.' + classes.join('.');
            // Check if this selector is unique enough
            if (document.querySelectorAll(selector).length <= 2) {
              return selector;
            }
          }
        }
        
        // Build selector with tag and attributes
        let selector = element.tagName.toLowerCase();
        
        // Add useful attributes
        const usefulAttrs = ['data-testid', 'data-cy', 'role', 'aria-label', 'name', 'type'];
        for (const attr of usefulAttrs) {
          if (element.hasAttribute(attr)) {
            selector += `[${attr}="${element.getAttribute(attr)}"]`;
            // Check if this makes it unique
            if (document.querySelectorAll(selector).length === 1) {
              return selector;
            }
          }
        }
        
        // Add nth-child as last resort
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children);
          const index = siblings.indexOf(element) + 1;
          selector += `:nth-child(${index})`;
          
          // Add parent context for better uniqueness
          const parentSelector = this.generateSelector(parent);
          if (parentSelector) {
            return `${parentSelector} > ${selector}`;
          }
        }
        
        return selector;
      } catch (error) {
        console.error('❌ Error generating selector:', error);
        return null;
      }
    }
    
    // Save blocked elements to storage
    async saveBlockedElements() {
      try {
        const data = {
          selectors: this.blockedSelectors,
          url: window.location.href,
          domain: window.location.hostname,
          timestamp: Date.now()
        };
        
        // Use browser storage if available, otherwise localStorage
        if (browserAPI && browserAPI.storage && browserAPI.storage.local) {
          try {
            await browserAPI.storage.local.set({ 
              [`blockedElements_${window.location.hostname}`]: data 
            });
          } catch (extensionError) {
            if (extensionError.message && extensionError.message.includes('Extension context invalidated')) {
              console.warn('⚠️ Extension context invalidated, falling back to localStorage');
              // Fallback to localStorage when extension context is invalid
              localStorage.setItem(
                `privacyshield_blocked_${window.location.hostname}`,
                JSON.stringify(data)
              );
            } else {
              throw extensionError;
            }
          }
        } else {
          // Fallback to localStorage
          localStorage.setItem(
            `privacyshield_blocked_${window.location.hostname}`,
            JSON.stringify(data)
          );
        }

        // Blocked elements saved silently
      } catch (error) {
        // Only log if it's not a context invalidation error (already handled above)
        if (!error.message || !error.message.includes('Extension context invalidated')) {
          console.error('❌ Failed to save blocked elements:', error);
        }
      }
    }

    // Update stats in background (THROTTLED to prevent message flooding)
    updateStats() {
      // Mark that stats have changed
      this.pendingStatsUpdate = true;

      // Skip if update already scheduled
      if (this.statsUpdateScheduled) return;

      const now = Date.now();
      const timeSinceLastUpdate = now - this.lastStatsUpdate;

      if (timeSinceLastUpdate >= this.STATS_UPDATE_INTERVAL) {
        // Send immediately if interval passed
        this.sendStatsUpdate();
      } else {
        // Schedule for later
        this.statsUpdateScheduled = true;
        const delay = this.STATS_UPDATE_INTERVAL - timeSinceLastUpdate;

        setTimeout(() => {
          this.sendStatsUpdate();
        }, delay);
      }
    }

    // Actually send stats update (called max once per 5 seconds)
    sendStatsUpdate() {
      if (!this.pendingStatsUpdate) return;

      try {
        // Count different types of blocked elements
        const stats = {
          trackersBlocked: 0,
          cookiesBlocked: 0,
          fingerprintsBlocked: 0,
          totalBlocked: this.blockedElements.size
        };

        // Analyze blocked elements to categorize them
        this.blockedElements.forEach(element => {
          const className = (element.className || '').toString().toLowerCase();
          const id = (element.id || '').toLowerCase();
          const combined = className + ' ' + id;

          if (combined.includes('track') || combined.includes('analytics') ||
              combined.includes('pixel') || combined.includes('beacon')) {
            stats.trackersBlocked++;
          }
          if (combined.includes('cookie') || combined.includes('gdpr') ||
              combined.includes('consent')) {
            stats.cookiesBlocked++;
          }
          if (combined.includes('fingerprint') || combined.includes('canvas')) {
            stats.fingerprintsBlocked++;
          }
        });

        // Send stats to background (ONLY ONCE per 5 seconds)
        if (browserAPI && browserAPI.runtime) {
          browserAPI.runtime.sendMessage({
            type: 'UPDATE_PAGE_STATS',
            url: window.location.href,
            stats: stats
          }).catch(() => {
            // Silently fail if background is not available
          });
        }

        this.lastStatsUpdate = Date.now();
        this.pendingStatsUpdate = false;
        this.statsUpdateScheduled = false;
      } catch (error) {
        // Silently fail
        this.statsUpdateScheduled = false;
      }
    }

    // Load blocked elements from storage
    async loadBlockedElements() {
      try {
        let data = null;
        
        // Try browser storage first
        if (browserAPI && browserAPI.storage && browserAPI.storage.local) {
          try {
            const result = await browserAPI.storage.local.get(
              `blockedElements_${window.location.hostname}`
            );
            data = result[`blockedElements_${window.location.hostname}`];
          } catch (extensionError) {
            if (extensionError.message && extensionError.message.includes('Extension context invalidated')) {
              console.warn('⚠️ Extension context invalidated, using localStorage only');
              // Fall through to localStorage when extension context is invalid
            } else {
              throw extensionError;
            }
          }
        }
        
        // Fallback to localStorage
        if (!data) {
          const stored = localStorage.getItem(
            `privacyshield_blocked_${window.location.hostname}`
          );
          if (stored) {
            data = JSON.parse(stored);
          }
        }
        
        if (data && data.selectors && Array.isArray(data.selectors)) {
          this.blockedSelectors = data.selectors;
          // Loaded blocked selectors silently
          return true;
        }

        // No saved blocked elements found - silently skip
        return false;
      } catch (error) {
        // Only log if it's not a context invalidation error (already handled above)
        if (!error.message || !error.message.includes('Extension context invalidated')) {
          console.error('❌ Failed to load blocked elements:', error);
        }
        return false;
      }
    }
    
    // Apply saved blocked elements
    applyBlockedElements() {
      // Applying saved blocked elements silently
      let appliedCount = 0;
      
      this.blockedSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            this.blockElement(element, false); // Don't save again
            appliedCount++;
          });
        } catch (error) {
          console.error('❌ Error applying selector:', selector, error);
        }
      });

      // Applied blocked elements silently (count: ${appliedCount})
    }

    // Block element and hide it
    blockElement(element, save = true) {
      // Removed debug logging to reduce console spam

      if (!element) {
        console.error('❌ No element provided to blockElement');
        return;
      }

      if (this.blockedElements.has(element)) {
        // Already blocked, skip silently
        return;
      }

      // Skip bait elements in stealth mode
      if (this.settings.stealthMode && this.baitElements.has(element)) {
        // Silently skip bait elements
        return;
      }

      try {
        // Silently attempt to block element
        
        // AVOID BLOCKING CRITICAL WEBSITE ELEMENTS
        const tagName = (element.tagName || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const className = (typeof element.className === 'string' ? element.className : '').toLowerCase();
        const textContent = (element.textContent || '').toLowerCase();
        
        // Never block these critical elements
        const criticalElements = [
          'html', 'body', 'head', 'title',
          'main', 'article', 'section', 'nav', 'header', 'footer',
          'form', 'input', 'button', 'select', 'textarea',
          'script', 'style', 'link', 'meta'
        ];
        
        if (criticalElements.includes(tagName)) {
          // Silently skip critical elements
          return;
        }
        
        // WHITELIST: Skip elements with legitimate content patterns
        const legitimatePatterns = [
          // Persian content patterns
          'در صورت تمایل', 'رایگان', 'محتوای سایت', 'تبلیغات', 'غیرفعال کنید',
          'محتوا', 'سایت', 'استفاده', 'صفحه', 'مقاله', 'خبر',

          // General content patterns
          'content', 'main', 'article', 'post', 'story', 'news',
          'text', 'body', 'page', 'site', 'website', 'portal',
          'player', 'video', 'audio', 'media', 'search', 'menu',
          'nav', 'header', 'footer', 'sidebar', 'widget',

          // Common container patterns
          'container', 'wrapper', 'layout', 'section', 'row', 'col',
          'panel', 'card', 'box', 'block', 'item', 'element',

          // Common legitimate prefixes/suffixes (avoid false positives)
          'cbd', 'lbd', 'tbd', 'rbd', 'mbd', 'fbd',  // Common naming patterns
          'abdd', 'tbdl', 'cbdd', 'obdl', 'sbdl',     // Site-specific patterns
          'navbar', 'topbar', 'toolbar', 'sidebar',
          'tabs', 'tab', 'btn', 'button', 'link',
          'w3-', 'index', 'post-', 'img-', 'title', 'image'
        ];
        
        const isLegitimate = legitimatePatterns.some(pattern => 
          id.includes(pattern) || 
          className.includes(pattern) ||
          textContent.includes(pattern)
        );
        
        if (isLegitimate) {
          // Silently skip legitimate content
          return;
        }

        // Skip if element contains substantial text content (likely main content)
        const textLength = element.textContent.trim().length;
        if (textLength > 200) { // More than 200 characters
          // Silently skip - likely main content
          return;
        }

        // Skip size check - removed getBoundingClientRect() to eliminate forced reflow
        // Use cheaper heuristics instead

        // Skip if element has many child elements (likely container)
        if (element.children && element.children.length > 10) {
          // Silently skip - likely container
          return;
        }

        // Avoid blocking critical app shells on complex sites
        if (location && location.hostname && location.hostname.includes('youtube.com')) {
          if (
            id === 'content' ||
            id === 'page-manager' ||
            id === 'player' ||
            id === 'movie_player' ||
            tagName === 'ytd-app' ||
            tagName === 'ytd-page-manager' ||
            className.includes('html5-video-player')
          ) {
            // Silently skip critical YouTube elements
            return;
          }
        }

        // Store original styles BEFORE changing them - get computed styles for better restoration
        const computedStyle = window.getComputedStyle(element);
        const originalStyles = {
          display: element.style.display || computedStyle.display,
          visibility: element.style.visibility || computedStyle.visibility,
          opacity: element.style.opacity || computedStyle.opacity,
          height: element.style.height || computedStyle.height,
          width: element.style.width || computedStyle.width,
          overflow: element.style.overflow || computedStyle.overflow
        };

        // Styles stored silently

        // ADVANCED ANTI-DETECTION: Use element preservation instead of removal
        if (this.settings.antiDetection) {
          this.preserveElement(element);
        } else if (this.settings.stealthMode) {
          // STEALTH MODE: Use more subtle hiding techniques
          this.hideElementStealth(element, originalStyles);
        } else {
          // Normal blocking with !important to override any existing styles
          element.style.setProperty('display', 'none', 'important');
          element.style.setProperty('visibility', 'hidden', 'important');
          element.style.setProperty('opacity', '0', 'important');
          element.style.setProperty('height', '0', 'important');
          element.style.setProperty('width', '0', 'important');
          element.style.setProperty('overflow', 'hidden', 'important');
        }

        // Removed forced reflow (element.offsetHeight) - styles apply asynchronously

        this.blockedElements.add(element);

        // Generate and save selector if this is a new block
        if (save) {
          const selector = this.generateSelector(element);
          if (selector && !this.blockedSelectors.includes(selector)) {
            this.blockedSelectors.push(selector);
            // Selector saved silently

            // Save to storage asynchronously
            this.saveBlockedElements();
          }
        }

        // Update stats in background
        this.updateStats();

        // Element blocked silently
      } catch (error) {
        console.error('❌ Error blocking element:', error);
      }
    }

    // Stealth element hiding to avoid detection
    hideElementStealth(element, originalStyles) {
      // Method 1: Make element invisible but keep it in DOM
      const stealthMethods = [
        // Method A: Zero size but keep layout
        () => {
          element.style.setProperty('width', '0px', 'important');
          element.style.setProperty('height', '0px', 'important');
          element.style.setProperty('overflow', 'hidden', 'important');
          element.style.setProperty('position', 'absolute', 'important');
          element.style.setProperty('left', '-9999px', 'important');
          element.style.setProperty('top', '-9999px', 'important');
        },
        
        // Method B: Transparent but keep layout
        () => {
          element.style.setProperty('opacity', '0', 'important');
          element.style.setProperty('pointer-events', 'none', 'important');
          element.style.setProperty('user-select', 'none', 'important');
        },
        
        // Method C: Hide with clip path
        () => {
          element.style.setProperty('clip-path', 'inset(0 0 0 100%)', 'important');
          element.style.setProperty('clip', 'rect(0, 0, 0, 0)', 'important');
        },
        
        // Method D: Move off-screen with transform
        () => {
          element.style.setProperty('transform', 'translateX(-10000px)', 'important');
          element.style.setProperty('position', 'absolute', 'important');
        }
      ];
      
      // Choose a random stealth method
      const randomMethod = stealthMethods[Math.floor(Math.random() * stealthMethods.length)];
      randomMethod();
      
      // Add some randomization to timing
      const delay = Math.random() * 100 + 50;
      setTimeout(() => {
        // Apply additional subtle hiding after delay
        element.style.setProperty('visibility', 'collapse', 'important');
      }, delay);
    }

  // Unblock element and restore original styles
  unblockElement(element, originalStyles) {
    if (!element) {
      console.error('❌ No element provided to unblockElement');
      return;
    }

    try {
      // Unblocking element silently

      // Remove all blocking styles first
      element.style.removeProperty('display');
      element.style.removeProperty('visibility');
      element.style.removeProperty('opacity');
      element.style.removeProperty('height');
      element.style.removeProperty('width');
      element.style.removeProperty('overflow');
      
      // Restore original styles if provided
      if (originalStyles) {
        if (originalStyles.display && originalStyles.display !== '') {
          element.style.setProperty('display', originalStyles.display, 'important');
        }
        if (originalStyles.visibility && originalStyles.visibility !== '') {
          element.style.setProperty('visibility', originalStyles.visibility, 'important');
        }
        if (originalStyles.opacity && originalStyles.opacity !== '') {
          element.style.setProperty('opacity', originalStyles.opacity, 'important');
        }
        if (originalStyles.height && originalStyles.height !== '') {
          element.style.setProperty('height', originalStyles.height, 'important');
        }
        if (originalStyles.width && originalStyles.width !== '') {
          element.style.setProperty('width', originalStyles.width, 'important');
        }
        if (originalStyles.overflow && originalStyles.overflow !== '') {
          element.style.setProperty('overflow', originalStyles.overflow, 'important');
        }
      }
      
      // Remove from blocked elements set
      this.blockedElements.delete(element);
      
      // Generate selector and remove from blocked selectors list
      const selector = this.generateSelector(element);
      if (selector) {
        this.removeBlockedElement(selector);
      }
      
      // Force a reflow to ensure styles are applied
      element.offsetHeight;

      // Element unblocked successfully - silently

    } catch (error) {
      console.error('❌ Failed to unblock element:', error);
    }
  }

  // Show undo notification for blocked element
  showUndoNotification(element, originalStyles) {
    // CRITICAL: Disable element picker to prevent conflicts
    const wasPickerActive = this.elementPickerState && this.elementPickerState.isPicking;
    if (wasPickerActive && this.elementPickerCleanup) {
      // Temporarily disabling element picker for undo notification
      this.elementPickerState.isPicking = false;
      document.body.style.cursor = 'default';
      document.removeEventListener('click', this.elementPickerHandler, true);
    }

    // Use stored original styles if available, otherwise use provided ones
    const stylesToRestore = element._privacyShieldOriginalStyles || originalStyles;

    // Showing undo notification silently
    
    const notification = document.createElement('div');
    notification.id = 'privacyshield-undo-notification';
    notification.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95)) !important;
      color: white !important;
      padding: 16px 20px !important;
      border-radius: 12px !important;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      z-index: 2147483646 !important;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1) !important;
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      animation: privacyshield-slideInRight 0.3s ease-out !important;
      max-width: 350px !important;
      backdrop-filter: blur(10px) !important;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
        <div style="width: 20px; height: 20px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">✓</div>
        <span style="font-weight: 500;">Element blocked</span>
      </div>
      <button id="privacyshield-undo" style="
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.15s ease;
      ">Undo</button>
    `;
    
    // Add slide-in animation if not already present
    if (!document.getElementById('privacyshield-notification-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'privacyshield-notification-styles';
      styleSheet.textContent = `
        @keyframes privacyshield-slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes privacyshield-slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        #privacyshield-undo-notification:hover #privacyshield-undo {
          background: rgba(255,255,255,0.3) !important;
          transform: translateY(-1px);
        }
        
        #privacyshield-undo-notification:active #privacyshield-undo {
          transform: translateY(0);
        }
      `;
      document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(notification);
    
    const undoBtn = notification.querySelector('#privacyshield-undo');
    let timeoutId;
    
    const removeNotification = () => {
      if (document.body.contains(notification)) {
        notification.style.animation = 'privacyshield-slideOutRight 0.3s ease-in';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
      clearTimeout(timeoutId);
      
      // Restore element picker state if it was active
      if (wasPickerActive && this.elementPickerCleanup) {
        console.log('🔧 Restoring element picker state after undo notification');
        this.elementPickerState.isPicking = true;
        document.body.style.cursor = 'crosshair';
        document.addEventListener('click', this.elementPickerHandler, true);
      }
    };
    
    undoBtn.addEventListener('click', (e) => {
      console.log('🔄 Undo button clicked!');
      console.log('🎯 Element to unblock:', element);
      console.log('📝 Original styles to restore:', stylesToRestore);
      
      // Prevent event propagation to avoid triggering element picker
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      try {
        // Unblock the element with original styles
        this.unblockElement(element, stylesToRestore);
        
        // Clean up stored styles
        if (element._privacyShieldOriginalStyles) {
          delete element._privacyShieldOriginalStyles;
        }
        
        // Verify the element is visible again
        setTimeout(() => {
          const computedStyle = window.getComputedStyle(element);
          console.log('🔍 Element visibility after undo:', {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity
          });
          
          if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {
            console.log('✅ Element successfully restored!');
          } else {
            console.log('⚠️ Element may still be hidden');
          }
        }, 100);
        
      } catch (error) {
        console.error('❌ Failed to undo block:', error);
      }
      
      removeNotification();
    }, true); // Use capture phase to ensure it runs before other click handlers
    
    // Auto-remove after 15 seconds (increased from 8 for better UX)
    timeoutId = setTimeout(removeNotification, 15000);
    
    // Pause auto-remove on hover
    notification.addEventListener('mouseenter', () => {
      clearTimeout(timeoutId);
    });
    
    notification.addEventListener('mouseleave', () => {
      timeoutId = setTimeout(removeNotification, 15000);
    });
  }

  // Check if element is tracking-related
  isTrackingElement(element) {
    const trackingKeywords = [
      'analytics', 'tracking', 'pixel', 'beacon', 'telemetry',
      'facebook', 'google', 'doubleclick', 'hotjar', 'mixpanel',
      'segment', 'fullstory', 'clarity', 'mouseflow', 'crazyegg'
    ];

    const elementText = (element.src || element.href || element.innerHTML || '').toLowerCase();
    
    return trackingKeywords.some(keyword => elementText.includes(keyword));
  }

  // Setup fingerprinting protection
  setupFingerprintingProtection() {
    // Protect Canvas API
    this.protectCanvas();
    
    // Protect WebRTC
    this.protectWebRTC();
    
    // Protect Screen API
    this.protectScreen();
    
    // Protect Audio Context
    this.protectAudioContext();
    
    // Protect Battery API
    this.protectBattery();
    
    // Protect Geolocation
    this.protectGeolocation();
  }

  // Canvas fingerprinting protection
  protectCanvas() {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      // Add noise to canvas data
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;
        
        // Add subtle noise
        for (let i = 0; i < data.length; i += 4) {
          data[i] += Math.random() * 2 - 1;     // Red
          data[i + 1] += Math.random() * 2 - 1; // Green
          data[i + 2] += Math.random() * 2 - 1; // Blue
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
      
      return originalToDataURL.apply(this, args);
    };

    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      const imageData = originalGetImageData.apply(this, args);
      
      // Add noise to image data
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] += Math.random() * 2 - 1;
        data[i + 1] += Math.random() * 2 - 1;
        data[i + 2] += Math.random() * 2 - 1;
      }
      
      return imageData;
    };
  }

  // WebRTC protection
  protectWebRTC() {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    
    navigator.mediaDevices.getUserMedia = function(constraints) {
      // Block WebRTC unless explicitly allowed
      return Promise.reject(new Error('WebRTC access blocked by PrivacyShield'));
    };

    // Override RTCPeerConnection
    if (window.RTCPeerConnection) {
      window.RTCPeerConnection = function(...args) {
        throw new Error('WebRTC blocked by PrivacyShield');
      };
    }
  }

  // Screen API protection
  protectScreen() {
    try {
      Object.defineProperty(screen, 'width', {
        get: () => 1920,
        configurable: true
      });
    } catch (e) {
      // Property already defined, skip
    }
    
    try {
      Object.defineProperty(screen, 'height', {
        get: () => 1080,
        configurable: true
      });
    } catch (e) {
      // Property already defined, skip
    }
    
    try {
      Object.defineProperty(screen, 'colorDepth', {
        get: () => 24,
        configurable: true
      });
    } catch (e) {
      // Property already defined, skip
    }
    
    try {
      Object.defineProperty(screen, 'pixelDepth', {
        get: () => 24,
        configurable: true
      });
    } catch (e) {
      // Property already defined, skip
    }
  }

  // Audio Context protection
  protectAudioContext() {
    if (window.AudioContext) {
      const originalCreateOscillator = AudioContext.prototype.createOscillator;
      
      AudioContext.prototype.createOscillator = function(...args) {
        const oscillator = originalCreateOscillator.apply(this, args);
        
        // Add noise to audio fingerprinting
        const originalStart = oscillator.start;
        oscillator.start = function(...args) {
          // Add subtle frequency variation
          oscillator.frequency.value += Math.random() * 0.1 - 0.05;
          return originalStart.apply(this, args);
        };
        
        return oscillator;
      };
    }
  }

  // Battery API protection
  protectBattery() {
    if (navigator.getBattery) {
      navigator.getBattery = function() {
        return Promise.reject(new Error('Battery API blocked by PrivacyShield'));
      };
    }
  }

  // Geolocation protection
  protectGeolocation() {
    const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
    
    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      // Return fake location or block
      if (error) {
        error(new Error('Geolocation blocked by PrivacyShield'));
      }
    };
  }

  // Block cookie banners and popups
  blockCookieBanners() {
    const cookieBannerSelectors = [
      '[id*="cookie"]', '[class*="cookie"]',
      '[id*="consent"]', '[class*="consent"]',
      '[id*="gdpr"]', '[class*="gdpr"]',
      '[id*="privacy"]', '[class*="privacy"]',
      '.cookie-banner', '.consent-banner',
      '.privacy-notice', '.gdpr-notice',
      '.cookie-consent', '.privacy-policy',
      '.cc-banner', '.cc-window',
      '.qc-cmp2-container', '.ot-sdk-container'
    ];

    let bannersCheckedOnce = false;

    const checkAndRemoveBanners = () => {
      // Early exit if banners already removed (performance optimization)
      if (bannersCheckedOnce && !document.querySelector('[class*="cookie"], [id*="cookie"]')) {
        return; // Skip expensive selector queries
      }

      cookieBannerSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            // Check if it's actually a cookie banner
            const text = element.textContent.toLowerCase();
            if (text.includes('cookie') || text.includes('consent') ||
                text.includes('privacy') || text.includes('gdpr')) {
              this.blockElement(element);
            }
          });
        } catch (error) {
          console.log(`Cookie banner selector failed: ${selector}`, error);
        }
      });

      bannersCheckedOnce = true;
    };

    // Check immediately
    checkAndRemoveBanners();

    // Check periodically for dynamic banners (optimized: 5s instead of 2s)
    setInterval(checkAndRemoveBanners, 5000);

    // Also check on visibility change (better than polling)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkAndRemoveBanners();
      }
    });
  }

  // Setup element picker for user interaction
  setupElementPicker() {
    console.log('PrivacyShield Max - Setting up element picker...');
    
    let isPicking = false;
    let lastBlockedElement = null;
    let originalStyles = null;
    
    const cleanup = () => {
      console.log('PrivacyShield Max - Element picker cleanup - isPicking was:', isPicking);
      isPicking = false;
      document.body.style.cursor = 'default';
      
      // Remove visual indicator
      const indicator = document.getElementById('privacyshield-picker-indicator');
      if (indicator) {
        console.log('PrivacyShield Max - Removing picker indicator');
        indicator.remove();
      }
      
      // Always try to remove all event listeners to prevent duplicates
      try {
        if (this.elementPickerHandler) {
          document.removeEventListener('click', this.elementPickerHandler, true);
          console.log('PrivacyShield Max - Removed click handler');
        }
        if (this.elementPickerCancelHandler) {
          document.removeEventListener('contextmenu', this.elementPickerCancelHandler, true);
          console.log('PrivacyShield Max - Removed contextmenu handler');
        }
        if (this.elementPickerEscapeHandler) {
          document.removeEventListener('keydown', this.elementPickerEscapeHandler, true);
          console.log('PrivacyShield Max - Removed keydown handler');
        }
      } catch (error) {
        console.error('PrivacyShield Max - Error removing event listeners:', error);
      }
      
      console.log('PrivacyShield Max - Element picker cleanup completed');
    };
    
    // Add visual indicator for picker mode
    const showPickerIndicator = () => {
      console.log('PrivacyShield Max - Showing picker indicator');
      
      // Remove existing indicator
      const existing = document.getElementById('privacyshield-picker-indicator');
      if (existing) {
        existing.remove();
      }
      
      const indicator = document.createElement('div');
      indicator.id = 'privacyshield-picker-indicator';
      indicator.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        background: linear-gradient(135deg, #ff4444, #cc0000) !important;
        color: white !important;
        padding: 12px 20px !important;
        border-radius: 8px !important;
        font-family: system-ui, -apple-system, sans-serif !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        z-index: 2147483646 !important;
        box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3) !important;
        pointer-events: none !important;
        animation: privacyshield-picker-pulse 2s infinite !important;
      `;
      indicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%; animation: privacyshield-picker-blink 1s infinite;"></div>
          <span>Click element to block • ESC to cancel • Right-click to cancel</span>
        </div>
      `;
      
      // Add animation styles
      if (!document.getElementById('privacyshield-picker-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'privacyshield-picker-styles';
        styleSheet.textContent = `
          @keyframes privacyshield-picker-pulse {
            0%, 100% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.05); opacity: 1; }
          }
          @keyframes privacyshield-picker-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `;
        document.head.appendChild(styleSheet);
      }
      
      document.body.appendChild(indicator);
      console.log('PrivacyShield Max - Picker indicator added to DOM');
    };
    
    const showConfirmationDialog = (element) => {
      console.log('PrivacyShield Max - Showing confirmation dialog for:', element);
      
      // CRITICAL: Temporarily disable element picker to prevent event conflicts
      const wasPicking = isPicking;
      isPicking = false;
      
      // Remove any existing dialogs first
      const existingOverlay = document.getElementById('privacyshield-confirm-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
      
      // Create overlay with highest z-index and proper isolation
      const overlay = document.createElement('div');
      overlay.id = 'privacyshield-confirm-overlay';
      overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.6) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        direction: ltr !important;
        pointer-events: auto !important;
        isolation: isolate !important;
      `;
      
      // Create dialog with proper event isolation
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white !important;
        border-radius: 12px !important;
        padding: 24px !important;
        max-width: 360px !important;
        width: 90% !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
        direction: ltr !important;
        text-align: left !important;
        font-family: system-ui, -apple-system, sans-serif !important;
        pointer-events: auto !important;
        isolation: isolate !important;
        position: relative !important;
      `;
      
      dialog.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 32px; margin-bottom: 12px;">🚫</div>
          <h3 style="margin: 0; font-size: 18px; color: #333; font-weight: 600;">Block Element?</h3>
        </div>
        
        <div style="text-align: center; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.4;">This will hide the selected element from the page.</p>
        </div>
        
        <div style="display: flex; gap: 12px;">
          <button type="button" id="privacyshield-cancel" style="flex: 1; padding: 12px; border: 1px solid #ddd; background: #f5f5f5; color: #333; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; pointer-events: auto; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">Cancel</button>
          <button type="button" id="privacyshield-block" style="flex: 1; padding: 12px; border: none; background: #ff4444; color: white; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; pointer-events: auto; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; transition: all 0.2s ease;">Block</button>
        </div>
      `;
      
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      
      // Store reference to this instance for event handlers
      const self = this;
      
      // Get buttons with error checking
      const cancelBtn = dialog.querySelector('#privacyshield-cancel');
      const blockBtn = dialog.querySelector('#privacyshield-block');
      
      if (!cancelBtn || !blockBtn) {
        console.error('❌ Failed to find dialog buttons:', { cancelBtn, blockBtn });
        overlay.remove();
        isPicking = wasPicking;
        return;
      }
      
      console.log('✅ Dialog created successfully, buttons found:', { cancelBtn, blockBtn });
      
      // Close function with proper cleanup
      const closeDialog = () => {
        console.log('🚪 closeDialog called');
        try {
          // Clear auto-close timeout
          if (overlay._autoCloseTimeout) {
            clearTimeout(overlay._autoCloseTimeout);
          }
          
          // Remove event listeners first
          document.removeEventListener('keydown', handleEscape);
          
          // Remove overlay from DOM
          if (document.body.contains(overlay)) {
            console.log('🗑️ Removing overlay from DOM');
            document.body.removeChild(overlay);
            console.log('✅ Overlay removed successfully');
          } else {
            console.log('⚠️ Overlay not found in DOM');
          }
          
          // Restore element picker state
          isPicking = wasPicking;
          
          console.log('✅ Dialog closed and cleanup completed');
        } catch (error) {
          console.error('❌ Error closing dialog:', error);
          isPicking = wasPicking;
        }
      };
      
      // Handle overlay click (outside dialog) - use capture phase
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          console.log('Overlay clicked, closing dialog');
          closeDialog();
        }
      }, true);
      
      // Cancel button handler - use capture phase to ensure it runs first
      cancelBtn.addEventListener('click', function(e) {
        console.log('✅ Cancel button clicked');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        closeDialog();
      }, true);
      
      // Block button handler - use capture phase to ensure it runs first
      blockBtn.addEventListener('click', function(e) {
        console.log('🔴 Block button clicked!');
        console.log('🎯 Target element:', element);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Store original styles before blocking
        const originalStyles = {
          display: element.style.display || '',
          visibility: element.style.visibility || '',
          opacity: element.style.opacity || '',
          height: element.style.height || '',
          width: element.style.width || '',
          overflow: element.style.overflow || ''
        };
        
        console.log('📝 Stored original styles:', originalStyles);
        
        // Block the element using the correct context
        try {
          console.log('🔒 Calling blockElement...');
          self.blockElement(element);
          lastBlockedElement = element;
          console.log('✅ Element blocked successfully!');
          
          // Verify the element is actually blocked
          setTimeout(() => {
            if (element.style.display === 'none') {
              console.log('✅ Element is now HIDDEN (display: none)');
            } else {
              console.log('❌ Element is NOT hidden, display is:', element.style.display);
              console.log('❌ Element visibility:', element.style.visibility);
            }
          }, 100);
          
        } catch (error) {
          console.error('❌ Failed to block element:', error);
        }
        
        // Close dialog immediately
        console.log('🚪 Closing dialog...');
        closeDialog();
        
        // Show undo notification after a short delay
        setTimeout(() => {
          try {
            console.log('📢 Showing undo notification...');
            self.showUndoNotification(element, originalStyles);
            console.log('✅ Undo notification shown successfully');
          } catch (error) {
            console.error('❌ Failed to show undo notification:', error);
          }
        }, 200);
      }, true);
      
      // Escape key handler
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          console.log('Escape key pressed, closing dialog');
          closeDialog();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      // Focus block button for better UX
      setTimeout(() => {
        try {
          blockBtn.focus();
          console.log('✅ Block button focused');
        } catch (error) {
          console.log('⚠️ Could not focus block button:', error);
        }
      }, 100);
      
      // Auto-close after 10 seconds to prevent stuck dialogs
      const autoCloseTimeout = setTimeout(() => {
        if (document.body.contains(overlay)) {
          console.log('⏰ Auto-closing dialog after timeout');
          closeDialog();
        }
      }, 10000);
      
      // Store timeout reference for cleanup
      overlay._autoCloseTimeout = autoCloseTimeout;
    };
    
    const handleElementPick = (event) => {
      console.log('PrivacyShield Max - Element picked:', event.target, 'isPicking:', isPicking);
      if (!isPicking) {
        console.log('PrivacyShield Max - Not picking, ignoring click');
        return;
      }
      
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      const element = event.target;
      console.log('PrivacyShield Max - Showing confirmation dialog for element:', element);
      
      // Additional debugging
      console.log('PrivacyShield Max - Element details:', {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        textContent: element.textContent?.substring(0, 50) + '...'
      });
      
      showConfirmationDialog(element);
    };
    
    // Cancel handlers
    const handleElementPickerCancel = (event) => {
      // Check if dialog is open
      const dialogOpen = document.getElementById('privacyshield-confirm-overlay');

      if (!isPicking && !dialogOpen) {
        console.log('PrivacyShield Max - Right-click cancel handler: not picking and no dialog, ignoring');
        return;
      }

      console.log('PrivacyShield Max - Element picker cancelled via right-click');
      event.preventDefault();
      event.stopPropagation();

      // If dialog is open, close it
      if (dialogOpen) {
        dialogOpen.remove();
        isPicking = true; // Restore picking state
      }

      cleanup();
    };

    const handleEscapeKey = (event) => {
      // Check if dialog is open
      const dialogOpen = document.getElementById('privacyshield-confirm-overlay');

      if (!isPicking && !dialogOpen) {
        console.log('PrivacyShield Max - ESC handler: not picking and no dialog, ignoring');
        return;
      }

      if (event.key === 'Escape') {
        console.log('PrivacyShield Max - Element picker cancelled via ESC key');
        event.preventDefault();
        event.stopPropagation();

        // If dialog is open, close it
        if (dialogOpen) {
          dialogOpen.remove();
          isPicking = true; // Restore picking state
        }

        cleanup();
      }
    };

    // Store handlers and state as instance properties
    this.elementPickerHandler = handleElementPick;
    this.elementPickerCancelHandler = handleElementPickerCancel;
    this.elementPickerEscapeHandler = handleEscapeKey;
    this.elementPickerCleanup = cleanup;
    this.elementPickerState = { get isPicking() { return isPicking; }, set isPicking(val) { isPicking = val; } };
    this.showConfirmationDialog = showConfirmationDialog;
    this.showPickerIndicator = showPickerIndicator;
    
    console.log('PrivacyShield Max - Element picker setup complete');
    
    // Add test function for debugging (accessible from console)
    window.testPrivacyShieldPicker = () => {
      console.log('PrivacyShield Max - Testing element picker...');
      console.log('PrivacyShield Max - Current state:', {
        isPicking: this.elementPickerState?.isPicking,
        cursor: document.body.style.cursor,
        handlers: {
          click: !!this.elementPickerHandler,
          contextmenu: !!this.elementPickerCancelHandler,
          keydown: !!this.elementPickerEscapeHandler
        },
        cleanup: !!this.elementPickerCleanup,
        indicator: !!document.getElementById('privacyshield-picker-indicator')
      });
      
      // Test cursor change
      console.log('PrivacyShield Max - Testing cursor change...');
      const originalCursor = document.body.style.cursor;
      document.body.style.cursor = 'crosshair';
      setTimeout(() => {
        console.log('PrivacyShield Max - Cursor was:', document.body.style.cursor);
        document.body.style.cursor = originalCursor;
      }, 1000);
    };
  }

    // Clear all blocked elements from storage
    async clearBlockedElements() {
      try {
        this.blockedSelectors = [];
        
        // Clear from browser storage
        if (browserAPI && browserAPI.storage && browserAPI.storage.local) {
          try {
            await browserAPI.storage.local.remove(
              `blockedElements_${window.location.hostname}`
            );
          } catch (extensionError) {
            if (extensionError.message && extensionError.message.includes('Extension context invalidated')) {
              console.warn('⚠️ Extension context invalidated, clearing localStorage only');
              // Fall through to localStorage when extension context is invalid
            } else {
              throw extensionError;
            }
          }
        }
        
        // Clear from localStorage
        localStorage.removeItem(
          `privacyshield_blocked_${window.location.hostname}`
        );
        
        console.log('✅ Cleared all blocked elements from storage');
      } catch (error) {
        // Only log if it's not a context invalidation error (already handled above)
        if (!error.message || !error.message.includes('Extension context invalidated')) {
          console.error('❌ Failed to clear blocked elements:', error);
        }
      }
    }
    
    // Remove a specific blocked element from storage
    async removeBlockedElement(selector) {
      try {
        const index = this.blockedSelectors.indexOf(selector);
        if (index > -1) {
          this.blockedSelectors.splice(index, 1);
          await this.saveBlockedElements();
          console.log('✅ Removed blocked element from storage:', selector);
        }
      } catch (error) {
        console.error('❌ Failed to remove blocked element:', error);
      }
    }

    // Setup message listener
  setupMessageListener() {
    console.log('PrivacyShield Max - Setting up message listener...');
    if (!browserAPI || !browserAPI.runtime || !browserAPI.runtime.onMessage) return;

    browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('PrivacyShield Max - Message received:', request.action);
      switch (request.action) {
        case 'startElementPicker':
          console.log('PrivacyShield Max - Starting element picker...');
          
          // First, cleanup any existing picker state
          if (this.elementPickerCleanup) {
            this.elementPickerCleanup();
          }
          
          // Start element picker mode
          if (this.elementPickerHandler && this.elementPickerCleanup && this.elementPickerState) {
            console.log('PrivacyShield Max - All required handlers found, starting picker...');
            this.elementPickerState.isPicking = true;
            document.body.style.cursor = 'crosshair';
            
            // Add fresh event listeners with error checking
            try {
              document.addEventListener('click', this.elementPickerHandler, true);
              console.log('PrivacyShield Max - Click handler added');
            } catch (error) {
              console.error('PrivacyShield Max - Failed to add click handler:', error);
            }
            
            try {
              document.addEventListener('contextmenu', this.elementPickerCancelHandler, true);
              console.log('PrivacyShield Max - Contextmenu handler added');
            } catch (error) {
              console.error('PrivacyShield Max - Failed to add contextmenu handler:', error);
            }
            
            try {
              document.addEventListener('keydown', this.elementPickerEscapeHandler, true);
              console.log('PrivacyShield Max - Keydown handler added');
            } catch (error) {
              console.error('PrivacyShield Max - Failed to add keydown handler:', error);
            }
            
            // Show visual indicator
            if (this.showPickerIndicator) {
              this.showPickerIndicator();
            }
            
            console.log('PrivacyShield Max - Element picker started successfully');
            console.log('PrivacyShield Max - Picker state:', {
              isPicking: this.elementPickerState.isPicking,
              cursor: document.body.style.cursor,
              handlers: {
                click: !!this.elementPickerHandler,
                contextmenu: !!this.elementPickerCancelHandler,
                keydown: !!this.elementPickerEscapeHandler
              }
            });
            sendResponse({ success: true });
          } else {
            console.error('PrivacyShield Max - Element picker not properly initialized');
            console.error('PrivacyShield Max - Missing components:', {
              handler: !!this.elementPickerHandler,
              cleanup: !!this.elementPickerCleanup,
              state: !!this.elementPickerState
            });
            sendResponse({ success: false, error: 'Element picker not initialized' });
          }
          break;
          
        case 'stopElementPicker':
          // Stop element picker mode
          if (this.elementPickerCleanup) {
            this.elementPickerCleanup();
            sendResponse({ success: true });
          }
          break;
          
        case 'blockElement':
          const element = document.elementFromPoint(request.x, request.y);
          if (element) {
            this.blockElement(element);
            sendResponse({ success: true });
          }
          break;
          
        case 'getBlockedCount':
          sendResponse({ count: this.blockedElements.size });
          break;
          
        case 'removeAllBanners':
          this.blockCookieBanners();
          sendResponse({ success: true });
          break;
          
        case 'clearBlockedElements':
          this.clearBlockedElements().then(() => {
            sendResponse({ success: true });
          });
          break;
          
        case 'getBlockedSelectors':
          sendResponse({ selectors: this.blockedSelectors });
          break;
      }
    });
  }

  // Clean up on page unload or navigation
  cleanup() {
    console.log('PrivacyShield Max - Performing full cleanup...');
    this.observers.forEach(observer => observer.disconnect());
    this.blockedElements.clear();
    this.blockedSelectors = [];
    this.baitElements.clear();
    this.preservedElements.clear();
    this.mutationObserverBypass.clear();
    this.scriptExecutionSimulator.clear();
    this.networkSpoofing.clear();
    
    // Cleanup element picker
    if (this.elementPickerCleanup) {
      this.elementPickerCleanup();
    }
    
    // Restore original browser APIs
    this.restoreOriginalAPIs();
    
    console.log('PrivacyShield Max - Full cleanup completed');
  }
  
  // Lightweight cleanup when page is hidden
  performLightCleanup() {
    console.log('PrivacyShield Max - Performing lightweight cleanup...');
    // Only clear non-essential data when page is hidden
    this.performanceStats = {
      mutationsProcessed: 0,
      elementsBlocked: 0,
      startTime: Date.now()
    };
    console.log('PrivacyShield Max - Lightweight cleanup completed');
  }
  
  // Restore original browser APIs
  restoreOriginalAPIs() {
    try {
      // Restore MutationObserver if we overrode it
      if (this.mutationObserverBypass.has('original')) {
        window.MutationObserver = this.mutationObserverBypass.get('original');
      }
      
      // Restore fetch if we overrode it
      if (this.networkSpoofing.has('originalFetch')) {
        window.fetch = this.networkSpoofing.get('originalFetch');
      }
      
      // Restore XMLHttpRequest if we overrode it
      if (this.networkSpoofing.has('originalXHR')) {
        window.XMLHttpRequest = this.networkSpoofing.get('originalXHR');
      }
      
      // Restore timing functions if we overrode them
      if (this.timingProtection.originalGetTime) {
        Date.now = this.timingProtection.originalGetTime;
      }
      
      if (this.timingProtection.originalPerformanceNow) {
        performance.now = this.timingProtection.originalPerformanceNow;
      }
      
      console.log('PrivacyShield Max - Original APIs restored');
    } catch (error) {
      console.error('PrivacyShield Max - Error restoring APIs:', error);
    }
  }

  // ============================================
  // Visit Tracking for Learning System
  // ============================================
  startVisitTracking() {
    let visitStartTime = Date.now();
    let lastReportTime = visitStartTime;
    const TRACKING_INTERVAL = 30000; // Report every 30 seconds

    // Add idle detection to skip tracking when user inactive
    let userIsActive = true;
    let idleTimeout;

    ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => {
        userIsActive = true;
        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
          userIsActive = false;
        }, 60000); // 1 minute idle threshold
      }, { passive: true });
    });

    // Track time spent on page
    const trackingInterval = setInterval(() => {
      // Skip if user is idle
      if (!userIsActive) return;

      const currentTime = Date.now();
      const timeSpent = currentTime - lastReportTime;

      try {
        const domain = window.location.hostname;
        if (domain && browserAPI && browserAPI.runtime) {
          browserAPI.runtime.sendMessage({
            type: 'TRACK_VISIT',
            domain: domain,
            timeSpent: timeSpent
          }).catch(err => {
            // Silently ignore if background script not ready
          });
        }

        lastReportTime = currentTime;
      } catch (error) {
        console.error('PrivacyShield Max - Visit tracking error:', error);
      }
    }, TRACKING_INTERVAL);

    // Clear interval on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(trackingInterval);

      // Send final visit time
      const finalTimeSpent = Date.now() - lastReportTime;
      if (finalTimeSpent > 1000) { // Only if > 1 second
        try {
          const domain = window.location.hostname;
          if (domain && browserAPI && browserAPI.runtime) {
            browserAPI.runtime.sendMessage({
              type: 'TRACK_VISIT',
              domain: domain,
              timeSpent: finalTimeSpent
            }).catch(() => {});
          }
        } catch (error) {
          // Ignore errors on unload
        }
      }
    });
  }

  // ============================================
  // Element Picker for Manual Blocking
  // ============================================
  startElementPicker() {
    let pickerOverlay = null;
    let highlightBox = null;
    let currentElement = null;

    // Create overlay
    pickerOverlay = document.createElement('div');
    pickerOverlay.id = 'privacyshield-picker-overlay';
    pickerOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 2147483646;
      cursor: crosshair;
      pointer-events: none;
    `;

    // Create highlight box
    highlightBox = document.createElement('div');
    highlightBox.id = 'privacyshield-picker-highlight';
    highlightBox.style.cssText = `
      position: absolute;
      border: 2px solid #10b981;
      background: rgba(16, 185, 129, 0.1);
      pointer-events: none;
      z-index: 2147483647;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
    `;

    // Create instruction tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'privacyshield-picker-tooltip';
    tooltip.textContent = 'Click element to block • ESC to cancel';
    tooltip.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: #f1f5f9;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      pointer-events: none;
    `;

    // Mouse move handler with RAF throttling to prevent forced reflows
    let rafId = null;
    const handleMouseMove = (e) => {
      // Skip if already scheduled
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element || element === pickerOverlay || element === highlightBox || element === tooltip) {
          rafId = null;
          return;
        }

        currentElement = element;
        const rect = element.getBoundingClientRect();

        highlightBox.style.top = rect.top + window.scrollY + 'px';
        highlightBox.style.left = rect.left + window.scrollX + 'px';
        highlightBox.style.width = rect.width + 'px';
        highlightBox.style.height = rect.height + 'px';

        rafId = null;
      });
    };

    // Click handler
    const self = this; // Capture 'this' context
    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (currentElement) {
        // Generate CSS selector for the element
        const selector = generateSelector(currentElement);

        // Hide the element
        currentElement.style.display = 'none';

        // Store selector for persistence if available
        if (self && self.blockedSelectors) {
          self.blockedSelectors.push(selector);
        }

        // Save to storage
        if (browserAPI && browserAPI.storage) {
          browserAPI.storage.local.get(['customBlockedSelectors'], (result) => {
            const selectors = result.customBlockedSelectors || [];
            selectors.push({
              selector: selector,
              domain: window.location.hostname,
              timestamp: Date.now()
            });
            browserAPI.storage.local.set({ customBlockedSelectors: selectors });
            console.log('PrivacyShield Max - Element blocked:', selector);
          });
        }
      }

      // Clean up picker
      cleanup();
    };

    // ESC key handler
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
      }
    };

    // Cleanup function
    const cleanup = () => {
      if (pickerOverlay && pickerOverlay.parentNode) {
        pickerOverlay.parentNode.removeChild(pickerOverlay);
      }
      if (highlightBox && highlightBox.parentNode) {
        highlightBox.parentNode.removeChild(highlightBox);
      }
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };

    // Generate CSS selector for element
    const generateSelector = (element) => {
      if (element.id) {
        return '#' + element.id;
      }

      let path = [];
      while (element && element.nodeType === Node.ELEMENT_NODE) {
        let selector = element.nodeName.toLowerCase();

        if (element.className && typeof element.className === 'string') {
          const classes = element.className.trim().split(/\s+/).filter(c => c && !c.startsWith('privacyshield'));
          if (classes.length > 0) {
            selector += '.' + classes.join('.');
          }
        }

        path.unshift(selector);
        element = element.parentElement;

        // Limit depth to 3 for specificity
        if (path.length >= 3) break;
      }

      return path.join(' > ');
    };

    // Attach event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);

    // Add overlay and tooltip to page
    document.body.appendChild(pickerOverlay);
    document.body.appendChild(highlightBox);
    document.body.appendChild(tooltip);
  }
}

// ============================================
// Message Listener for Background Commands
// ============================================
if (browserAPI && browserAPI.runtime) {
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_ELEMENT_PICKER') {
      if (window.privacyShield && typeof window.privacyShield.startElementPicker === 'function') {
        window.privacyShield.startElementPicker();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'PrivacyShield not initialized' });
      }
      return true;
    }
  });
}

// Initialize when DOM is ready (SINGLETON PATTERN)
let privacyShieldInstance = null;

function initializePrivacyShield() {
  // Prevent duplicate initialization
  if (privacyShieldInstance) {
    console.log('PrivacyShield Max - Already initialized, skipping duplicate');
    return;
  }

  privacyShieldInstance = new PrivacyShieldContent();
  window.privacyShield = privacyShieldInstance;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePrivacyShield, { once: true });
} else {
  initializePrivacyShield();
}

// Clean up on page unload or navigation
window.addEventListener('beforeunload', () => {
  if (window.privacyShield) {
    window.privacyShield.cleanup();
  }
});

} catch (error) {
  console.error('PrivacyShield Max - Content script error:', error);
}
