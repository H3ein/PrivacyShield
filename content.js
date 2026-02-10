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
  '.promoted-content'
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

    // Hide ad elements via CSS + MutationObserver
    if (response.success && response.data && response.data.blockAds !== false) {
      hideAdElements();
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
