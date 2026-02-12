// PrivacyShield - Content Script - Production

// Error handling utilities
const ContentErrorHandler = {
  log: (context, error, fallback = null) => {
    return fallback;
  },

  safeExecute: async (context, fn, fallback = null) => {
    try {
      return await fn();
    } catch (error) {
      return ContentErrorHandler.log(context, error, fallback);
    }
  }
};

// Message types for communication (inline to avoid module import issues)
const MESSAGE_TYPES = {
  GET_STATS: 'getStats',
  UPDATE_SETTINGS: 'updateSettings',
  GET_SETTINGS: 'getSettings',
  ADD_TO_WHITELIST: 'addToWhitelist',
  REMOVE_FROM_WHITELIST: 'removeFromWhitelist',
  GET_TAB_STATS: 'getTabStats',
  CONTENT_SCRIPT_READY: 'contentScriptReady'
};

// Fingerprinting protection flags
let fingerprintProtection = true;
let canvasProtection = false;
let webglProtection = false;

// --- Session seed and per-load consistent values ---
// Generate a session seed once at script load time. This seed drives all
// deterministic noise so that fingerprint values are consistent within a
// page load but differ across sessions.
const sessionSeed = (function generateSeed() {
  let s = Date.now() ^ (Math.random() * 0xffffffff >>> 0);
  // Mix bits a few rounds
  s = ((s >>> 16) ^ s) * 0x45d9f3b;
  s = ((s >>> 16) ^ s) * 0x45d9f3b;
  s = (s >>> 16) ^ s;
  return s >>> 0;
})();

// Simple seeded PRNG (mulberry32) — deterministic given the same seed.
// Returns a function that produces successive pseudo-random numbers in [0,1).
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pre-compute consistent per-load noise values
const screenRng = mulberry32(sessionSeed ^ 0xa3c59e17);
const screenWidthNoise = Math.floor(screenRng() * 5) - 2;   // -2..+2
const screenHeightNoise = Math.floor(screenRng() * 5) - 2;  // -2..+2

const timezoneRng = mulberry32(sessionSeed ^ 0x7f2c4b91);
const timezoneOffsetNoise = timezoneRng() < 0.5 ? -1 : 1;   // consistent +/- 1

// Canvas PRNG — a fresh sequence per page load but deterministic within it.
const canvasRng = mulberry32(sessionSeed ^ 0x1e5f3d08);

// WebGL: pick a common GPU string from a small pool, consistent per session.
const COMMON_GPU_RENDERERS = [
  'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.5)',
  'ANGLE (Intel, Intel(R) UHD Graphics 620, OpenGL 4.5)',
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060, OpenGL 4.5)',
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650, OpenGL 4.5)',
  'ANGLE (AMD, AMD Radeon RX 580, OpenGL 4.5)',
  'ANGLE (Intel, Intel(R) Iris Plus Graphics, OpenGL 4.1)'
];
const COMMON_GPU_VENDORS = [
  'Google Inc. (Intel)',
  'Google Inc. (NVIDIA)',
  'Google Inc. (AMD)',
  'Google Inc. (Intel)'
];
const webglRng = mulberry32(sessionSeed ^ 0x4d8e2a76);
const webglRendererIndex = Math.floor(webglRng() * COMMON_GPU_RENDERERS.length);
const webglVendorIndex = Math.floor(webglRng() * COMMON_GPU_VENDORS.length);

// --- Protection implementations ---

// Canvas protection — seeded deterministic noise, consistent per session
function protectCanvas() {
  try {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

    function addDeterministicNoise(imageData) {
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (canvasRng() < 0.01) { // 1% of pixels
          const delta = Math.floor(canvasRng() * 3) - 1; // -1, 0, or 1
          imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + delta));
          imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + delta));
          imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + delta));
        }
      }
      return imageData;
    }

    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
        addDeterministicNoise(imageData);
        ctx.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, args);
    };

    CanvasRenderingContext2D.prototype.getImageData = function (...args) {
      const imageData = originalGetImageData.apply(this, args);
      addDeterministicNoise(imageData);
      return imageData;
    };
  } catch (error) {
    ContentErrorHandler.log('protectCanvas', error);
  }
}

// WebGL protection — return a common GPU string from a fixed pool
function protectWebGL() {
  try {
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;

    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
        return COMMON_GPU_RENDERERS[webglRendererIndex];
      }
      if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
        return COMMON_GPU_VENDORS[webglVendorIndex];
      }
      return originalGetParameter.call(this, parameter);
    };

    // Also handle WebGL2 if available
    if (typeof WebGL2RenderingContext !== 'undefined') {
      const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;

      WebGL2RenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37446) {
          return COMMON_GPU_RENDERERS[webglRendererIndex];
        }
        if (parameter === 37445) {
          return COMMON_GPU_VENDORS[webglVendorIndex];
        }
        return originalGetParameter2.call(this, parameter);
      };
    }
  } catch (error) {
    ContentErrorHandler.log('protectWebGL', error);
  }
}

// Screen size protection — consistent noise computed once at load time
function protectScreenSize() {
  try {
    const realWidth = screen.width;
    const realHeight = screen.height;

    Object.defineProperty(screen, 'width', {
      get: function () {
        return realWidth + screenWidthNoise;
      },
      configurable: true
    });

    Object.defineProperty(screen, 'height', {
      get: function () {
        return realHeight + screenHeightNoise;
      },
      configurable: true
    });
  } catch (error) {
    ContentErrorHandler.log('protectScreenSize', error);
  }
}

// Timezone protection — consistent offset computed once at load time
function protectTimezone() {
  try {
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function () {
      const offset = originalGetTimezoneOffset.call(this);
      return offset + timezoneOffsetNoise;
    };
  } catch (error) {
    ContentErrorHandler.log('protectTimezone', error);
  }
}

// --- Advanced API Blocking ---

// Block Notification API abuse
function blockNotificationAPI() {
  try {
    if (typeof Notification !== 'undefined') {
      const originalRequestPermission = Notification.requestPermission;
      Notification.requestPermission = function() {
        sendMessage({ type: 'pushNotificationBlocked', data: { url: window.location.href } });
        return Promise.resolve('denied');
      };

      // Also block older callback-based API
      Object.defineProperty(Notification, 'permission', {
        get: () => 'denied',
        configurable: false
      });
    }
  } catch (error) {
    ContentErrorHandler.log('blockNotificationAPI', error);
  }
}

// Block ServiceWorker push subscriptions
function blockPushSubscriptions() {
  try {
    if ('serviceWorker' in navigator) {
      const originalRegister = navigator.serviceWorker.register;
      navigator.serviceWorker.register = async function(scriptURL, options) {
        const registration = await originalRegister.call(this, scriptURL, options);

        // Block push manager subscription attempts
        if (registration.pushManager) {
          const originalSubscribe = registration.pushManager.subscribe;
          registration.pushManager.subscribe = function() {
            sendMessage({ type: 'pushNotificationBlocked', data: { url: window.location.href } });
            return Promise.reject(new DOMException('Push notifications blocked', 'NotAllowedError'));
          };
        }

        return registration;
      };
    }
  } catch (error) {
    ContentErrorHandler.log('blockPushSubscriptions', error);
  }
}

// Block MRAID API for expandable ads
function blockMRAID() {
  try {
    Object.defineProperty(window, 'mraid', {
      get: () => {
        return {
          addEventListener: () => {},
          removeEventListener: () => {},
          getState: () => 'hidden',
          expand: () => {},
          close: () => {},
          isViewable: () => false,
          getExpandProperties: () => null,
          setExpandProperties: () => {}
        };
      },
      configurable: false
    });
  } catch (error) {
    ContentErrorHandler.log('blockMRAID', error);
  }
}

// Enhanced popup blocking
function enhancePopupBlocking() {
  try {
    const originalOpen = window.open;
    let lastUserInteraction = 0;

    // Track genuine user interactions
    ['click', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        lastUserInteraction = Date.now();
      }, true);
    });

    window.open = function(url, target, features) {
      const timeSinceInteraction = Date.now() - lastUserInteraction;

      // Block if no recent user interaction (within 1 second)
      if (timeSinceInteraction > 1000) {
        sendMessage({ type: 'popupBlocked', data: { url: url || 'about:blank' } });
        return null;
      }

      // Allow if user-initiated
      return originalOpen.apply(this, arguments);
    };
  } catch (error) {
    ContentErrorHandler.log('enhancePopupBlocking', error);
  }
}

// --- Ad element hiding ---

const AD_SELECTORS = [
  // --- Google Ads ---
  '.adsbygoogle',
  'ins.adsbygoogle',
  '[id*="google_ads"]',
  'div[data-ad-slot]',
  'div[data-ad-client]',
  'div[data-ad-format]',
  'div[data-ad-layout]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication"]',
  'iframe[src*="googleadservices"]',
  'iframe[id*="google_ads"]',

  // --- Generic ad containers (by id/class patterns) ---
  '[id*="ad-slot"]',
  '[id*="ad_slot"]',
  '[id*="ad-banner"]',
  '[id*="ad_banner"]',
  '[id*="ad-leaderboard"]',
  '[id*="ad-sidebar"]',
  '[id*="ad-footer"]',
  '[id*="ad-header"]',
  '[id*="ad-wrapper"]',
  '[id*="ad-container"]',
  '[id*="ad-block"]',
  '[id*="ad-unit"]',
  '[id*="adUnit"]',
  '[id*="ad_unit"]',
  '[class*="ad-banner"]',
  '[class*="ad_banner"]',
  '[class*="ad-leaderboard"]',
  '[class*="ad-sidebar"]',
  '[class*="ad-footer"]',
  '[class*="ad-header"]',
  '[class*="ad-wrapper"]',
  '[class*="ad-container"]',
  '[class*="ad-block"]',
  '[class*="ad-unit"]',
  '[class*="adUnit"]',
  '[class*="ad_unit"]',
  '[class*="ad-placement"]',
  '[class*="ad-slot"]',
  '[class*="ad_slot"]',
  '[class*="sponsored-banner"]',
  '[class*="sponsoredBanner"]',
  'div.ad-container',
  'div.ad-wrapper',
  'div.advertisement',
  'div.ad-box',
  'div.ad-space',
  'div.ad-zone',
  'div.ad-area',
  'div.ad-region',
  'div.ad-frame',
  'div.ad-panel',
  'section.ad-section',

  // --- Data attribute ad markers ---
  '[data-ad]',
  '[data-ad-type]',
  '[data-adunit]',
  '[data-ad-unit]',
  '[data-ad-name]',
  '[data-adzone]',
  '[data-ad-zone]',
  '[data-advertisement]',
  '[data-ad-manager]',
  '[data-google-query-id]',
  '[data-dfp]',

  // --- ARIA/role-based ad markers ---
  '[aria-label="advertisement"]',
  '[aria-label="Advertisement"]',
  '[aria-label="Ads"]',
  '[role="banner"][aria-label*="ad" i]',

  // --- Content recommendation / native ads ---
  '[id*="taboola"]',
  '[class*="taboola"]',
  '[id*="outbrain"]',
  '[class*="outbrain"]',
  '[id*="revcontent"]',
  '[class*="revcontent"]',
  '[id*="mgid"]',
  '[class*="mgid"]',
  '[id*="content-ad"]',
  '[class*="content-ad"]',
  'div.OUTBRAIN',
  '.trc_related_container',
  '.trc_rbox',
  '.ob-widget',
  '.ob-smartfeed-wrapper',

  // --- Ad iframes (generic) ---
  'iframe[src*="ads"]',
  'iframe[src*="ad."]',
  'iframe[src*="adserver"]',
  'iframe[src*="adservice"]',
  'iframe[src*="banner"]',
  'iframe[id*="ad_"]',
  'iframe[id*="ad-"]',
  'iframe[name*="google_ads"]',

  // --- Common ad wrapper elements ---
  '.ad-placeholder',
  '.ad-label',
  '.advert',
  '.advert-banner',
  '.advertise',
  '.advertising',
  '.advertisement',
  '.banner-ad',
  '.banner_ad',
  '.bannerAd',
  '.leaderboard-ad',
  '.sidebar-ad',
  '.sticky-ad',
  '.top-ad',
  '.bottom-ad',
  '.sponsored',
  '.sponsor-banner',
  '.promoted-content',

  // --- Script tag ad/tracking selectors ---
  'script[src*="/pagead/"]',
  'script[src*="pagead2"]',
  'script[src*="googleads"]',
  'script[src*="/ads/"]',
  'script[src*="/ad.js"]',
  'script[src*="/ads.js"]',
  'script[src*="adsbygoogle"]',
  'script[src*="adservice"]',
  'script[src*="doubleclick"]',
  'script[data-ad-client]',

  // --- Interstitial & Modal Overlay Ads ---
  '[class*="interstitial"]',
  '[id*="interstitial"]',
  '[class*="modal-ad"]',
  '[id*="modal-ad"]',
  '[class*="full-page-ad"]',
  '[class*="fullpage-ad"]',
  '[class*="overlay-ad"]',
  '[data-ad-type="interstitial"]',
  '.ad-overlay',
  '.ad-modal',
  '.fullscreen-ad',
  '.page-takeover',
  '.site-takeover',

  // --- Video Ad Containers ---
  '[class*="video-ad"]',
  '[id*="video-ad"]',
  '[class*="preroll"]',
  '[class*="midroll"]',
  '[id*="preroll"]',
  '[id*="midroll"]',
  '.video-advertisement',
  '.vast-container',
  '.vmap-container',
  'div[data-ad-type="video"]',
  '[aria-label*="video ad" i]',
  '[class*="ad-video-player"]',
  '.jwplayer-ad',
  '.video-js .vjs-ad',
  '[class*="video_ad"]',
  '[id*="video_ad"]',

  // --- Push/Notification Ad Elements ---
  '[class*="push-notification"]',
  '[id*="push-notification"]',
  '[class*="notification-ad"]',
  '[class*="toast-ad"]',
  '.push-ad-container',
  '.notification-banner',
  '[data-notification-type="ad"]',
  '.web-push-ad',
  '[class*="browser-notification"]',

  // --- Sticky & Fixed Position Ads ---
  '[class*="sticky-ad"]',
  '[id*="sticky-ad"]',
  '[class*="fixed-ad"]',
  '[class*="floating-ad"]',
  '.sticky-banner-ad',
  '.floating-banner',
  '.adhesion-ad',
  '[class*="anchor-ad"]',
  '[class*="docked-ad"]',

  // --- Expandable & Rich Media Ads ---
  '[class*="expandable-ad"]',
  '[id*="expandable"]',
  '[data-mraid]',
  '[class*="expanding-banner"]',
  '.mraid-container',
  '[data-ad-type="expandable"]',
  '[class*="rich-media-ad"]',
  '.expand-ad'
];

const AD_SELECTOR_STRING = AD_SELECTORS.join(', ');

function hideAdElements() {
  // Inject a style tag to hide known ad containers via CSS
  const style = document.createElement('style');
  style.textContent = AD_SELECTOR_STRING + ' { display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; }';
  (document.head || document.documentElement).appendChild(style);

  // Hide any ad elements already in the DOM
  document.querySelectorAll(AD_SELECTOR_STRING).forEach(el => {
    el.style.setProperty('display', 'none', 'important');
  });

  // Watch for dynamically inserted ad elements
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        // Check the node itself
        if (node.matches && node.matches(AD_SELECTOR_STRING)) {
          node.style.setProperty('display', 'none', 'important');
        }
        // Check descendants
        if (node.querySelectorAll) {
          node.querySelectorAll(AD_SELECTOR_STRING).forEach(el => {
            el.style.setProperty('display', 'none', 'important');
          });
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// Video ad detection and blocking
function detectAndBlockVideoAds() {
  const videos = document.querySelectorAll('video');

  videos.forEach(video => {
    // Check for ad indicators in parent containers
    const container = video.closest('[class*="ad"]') ||
                     video.closest('[id*="ad"]') ||
                     video.closest('[data-ad]');

    if (container) {
      container.style.setProperty('display', 'none', 'important');
      sendMessage({ type: 'videoAdBlocked', data: { url: window.location.href } });
      return;
    }

    // Check video src for ad patterns
    const src = video.src || video.currentSrc || '';
    const adPatterns = [
      'doubleclick.net',
      'googlesyndication',
      'imasdk.googleapis.com',
      '/ad/', '/ads/',
      'ad-tag', 'vast', 'vmap',
      'fwmrm.net',
      '2mdn.net',
      'videoplaza.tv'
    ];

    if (adPatterns.some(pattern => src.includes(pattern))) {
      video.style.setProperty('display', 'none', 'important');
      sendMessage({ type: 'videoAdBlocked', data: { url: src } });
    }
  });
}

// Setup video ad observer
function setupVideoAdBlocking() {
  // Run initial detection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectAndBlockVideoAds);
  } else {
    detectAndBlockVideoAds();
  }

  // Watch for dynamically added videos
  const videoObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'VIDEO' || node.querySelector('video')) {
            detectAndBlockVideoAds();
          }
        }
      });
    });
  });

  videoObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

// Dynamic interstitial detection
function detectInterstitialAds() {
  const fixedElements = document.querySelectorAll('[style*="position: fixed"], [style*="position: absolute"]');

  fixedElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const position = style.position;
    const zIndex = parseInt(style.zIndex) || 0;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Heuristic: fixed/absolute position + high z-index + near viewport size
    const isHighZIndex = zIndex > 999;
    const coversViewport = (width / viewportWidth > 0.8) && (height / viewportHeight > 0.8);
    const isFixedOrAbsolute = position === 'fixed' || position === 'absolute';

    if (isFixedOrAbsolute && isHighZIndex && coversViewport) {
      // Additional check: does it contain ad-related classes/IDs?
      const html = el.innerHTML.toLowerCase();
      const adIndicators = ['advertisement', 'sponsored', 'ad-content', 'doubleclick', 'ad-banner'];
      const hasAdIndicator = adIndicators.some(indicator =>
        el.className.toLowerCase().includes(indicator) ||
        el.id.toLowerCase().includes(indicator) ||
        html.includes(indicator)
      );

      if (hasAdIndicator) {
        el.style.setProperty('display', 'none', 'important');
        sendMessage({ type: 'interstitialBlocked', data: { element: el.tagName } });
      }
    }
  });
}

// Setup interstitial detection
function setupInterstitialDetection() {
  // Run periodically (every 500ms for first 5 seconds after load)
  let detectionRuns = 0;
  const detectionInterval = setInterval(() => {
    detectInterstitialAds();
    detectionRuns++;
    if (detectionRuns > 10) {
      clearInterval(detectionInterval);
    }
  }, 500);
}

// --- Setup ---

function setupFingerprintingProtection() {
  ContentErrorHandler.safeExecute('setupFingerprintingProtection', () => {
    if (canvasProtection) {
      protectCanvas();
    }
    if (webglProtection) {
      protectWebGL();
    }
    protectScreenSize();
    protectTimezone();
  });
}

// Initialize content script
function initializeContentScript() {
  ContentErrorHandler.safeExecute('initializeContentScript', async () => {
    const response = await sendMessage({ type: MESSAGE_TYPES.GET_SETTINGS });
    if (response.success && response.data) {
      fingerprintProtection = response.data.fingerprintProtection !== false;
      canvasProtection = response.data.canvasProtection === true;
      webglProtection = response.data.webglProtection === true;
    }

    if (fingerprintProtection) {
      setupFingerprintingProtection();
    }

    // Enhanced ad blocking APIs
    if (response.success && response.data) {
      if (response.data.blockPushNotifications !== false) {
        blockNotificationAPI();
        blockPushSubscriptions();
      }
      if (response.data.blockAds !== false) {
        blockMRAID();
      }
      if (response.data.blockPopups !== false) {
        enhancePopupBlocking();
      }
    }

    // Hide ad elements via CSS + MutationObserver
    if (response.success && response.data && response.data.blockAds !== false) {
      hideAdElements();
    }

    // Video ad blocking
    if (response.success && response.data && response.data.blockVideoAds !== false) {
      setupVideoAdBlocking();
    }

    // Interstitial ad detection
    if (response.success && response.data && response.data.blockInterstitialAds !== false) {
      setupInterstitialDetection();
    }

    await sendMessage({ type: MESSAGE_TYPES.CONTENT_SCRIPT_READY });
  });
}

// Send message to background script
function sendMessage(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  ContentErrorHandler.safeExecute('onMessage', () => {
    const { type, data } = message;

    switch (type) {
      case 'updateProtection':
        fingerprintProtection = data.fingerprintProtection !== false;
        canvasProtection = data.canvasProtection === true;
        webglProtection = data.webglProtection === true;

        if (fingerprintProtection) {
          setupFingerprintingProtection();
        }

        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  });

  return true;
});

// Performance monitoring
let performanceStats = {
  startTime: Date.now(),
  protectionsApplied: 0,
  errors: 0
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  ContentErrorHandler.safeExecute('cleanup', () => {
    performanceStats.endTime = Date.now();
    performanceStats.duration = performanceStats.endTime - performanceStats.startTime;

    sendMessage({
      type: 'performanceStats',
      data: performanceStats
    });
  });
});
