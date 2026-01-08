// PrivacyShield - Content Script - Optimized for Production

// Error handling utilities - simplified
const ContentErrorHandler = {
  log: (context, error, fallback = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] PrivacyShield Content Error [${context}]:`, error);
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

// Fingerprinting protection - minimal approach
let fingerprintProtection = true;
let canvasProtection = false;
let webglProtection = false;

// Initialize content script
function initializeContentScript() {
  ContentErrorHandler.safeExecute('initializeContentScript', async () => {
    // Get settings from background
    const response = await sendMessage({ type: MESSAGE_TYPES.GET_SETTINGS });
    if (response.success && response.data) {
      fingerprintProtection = response.data.fingerprintProtection !== false;
      canvasProtection = response.data.canvasProtection === true;
      webglProtection = response.data.webglProtection === true;
    }
    
    // Apply fingerprinting protection if enabled
    if (fingerprintProtection) {
      setupFingerprintingProtection();
    }
    
    // Notify background that content script is ready
    await sendMessage({ type: MESSAGE_TYPES.CONTENT_SCRIPT_READY });
    
    console.log('PrivacyShield: Content script initialized');
  });
}

// Setup fingerprinting protection
function setupFingerprintingProtection() {
  ContentErrorHandler.safeExecute('setupFingerprintingProtection', () => {
    // Canvas fingerprinting protection
    if (canvasProtection) {
      protectCanvas();
    }
    
    // WebGL fingerprinting protection
    if (webglProtection) {
      protectWebGL();
    }
    
    // Screen size protection
    protectScreenSize();
    
    // Timezone protection
    protectTimezone();
    
    // User agent protection (limited)
    protectUserAgent();
  });
}

// Canvas protection
function protectCanvas() {
  try {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    
    // Add noise to canvas data
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        // Add minimal noise to break fingerprinting
        for (let i = 0; i < imageData.data.length; i += 4) {
          if (Math.random() < 0.01) { // 1% noise
            imageData.data[i] += Math.floor(Math.random() * 3) - 1;
            imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1;
            imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, args);
    };
    
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      const imageData = originalGetImageData.apply(this, args);
      // Add minimal noise
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (Math.random() < 0.01) {
          imageData.data[i] += Math.floor(Math.random() * 3) - 1;
          imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1;
          imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1;
        }
      }
      return imageData;
    };
  } catch (error) {
    ContentErrorHandler.log('protectCanvas', error);
  }
}

// WebGL protection
function protectWebGL() {
  try {
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // Add noise to identifying parameters
      if (parameter === 37445 || parameter === 37446) { // UNMASKED_VENDOR_WEBGL, UNMASKED_RENDERER_WEBGL
        const result = originalGetParameter.call(this, parameter);
        if (typeof result === 'string' && Math.random() < 0.1) { // 10% chance to modify
          return result + ' (PrivacyShield)';
        }
      }
      return originalGetParameter.call(this, parameter);
    };
  } catch (error) {
    ContentErrorHandler.log('protectWebGL', error);
  }
}

// Screen size protection
function protectScreenSize() {
  try {
    Object.defineProperty(screen, 'width', {
      get: function() {
        return Math.floor(screen.width * (0.98 + Math.random() * 0.04));
      }
    });
    
    Object.defineProperty(screen, 'height', {
      get: function() {
        return Math.floor(screen.height * (0.98 + Math.random() * 0.04));
      }
    });
  } catch (error) {
    ContentErrorHandler.log('protectScreenSize', error);
  }
}

// Timezone protection
function protectTimezone() {
  try {
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() {
      const offset = originalGetTimezoneOffset.call(this);
      return offset + (Math.random() < 0.5 ? -1 : 1);
    };
  } catch (error) {
    ContentErrorHandler.log('protectTimezone', error);
  }
}

// User agent protection (limited)
function protectUserAgent() {
  try {
    // Only modify navigator.userAgent if it's safe to do so
    if (navigator.userAgent && !navigator.userAgent.includes('PrivacyShield')) {
      Object.defineProperty(navigator, 'userAgent', {
        get: function() {
          return navigator.userAgent + ' PrivacyShield/3.0';
        }
      });
    }
  } catch (error) {
    ContentErrorHandler.log('protectUserAgent', error);
  }
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
    
    // Send performance stats to background
    sendMessage({
      type: 'performanceStats',
      data: performanceStats
    });
  });
});

console.log('PrivacyShield: Content script loaded - Production Optimized');
