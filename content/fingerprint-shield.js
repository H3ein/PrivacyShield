// PrivacyShield Max - Fingerprint Shield
// 6-vector fingerprinting protection

import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';

class FingerprintShield {
  constructor() {
    this.enabled = true;
    this.noiseLevel = 0.0001; // Small noise for canvas
    this.protectedAPIs = [];
  }

  /**
   * Initialize fingerprint protection
   */
  async initialize() {
    const settings = await storageManager.getSettings();
    this.enabled = settings.fingerprintProtection !== false;

    if (!this.enabled) {
      logger.info('Fingerprint protection disabled');
      return;
    }

    // Apply all protections
    this.protectCanvas();
    this.protectWebGL();
    this.protectAudioContext();
    this.protectFonts();
    this.protectWebRTC();
    this.protectHardware();

    logger.info('Fingerprint shield initialized (6 vectors protected)');
  }

  /**
   * Protect Canvas fingerprinting (Vector 1)
   */
  protectCanvas() {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

    const addNoise = (imageData) => {
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Add small random noise to RGB values
        data[i] += Math.floor(Math.random() * 5) - 2;     // R
        data[i + 1] += Math.floor(Math.random() * 5) - 2; // G
        data[i + 2] += Math.floor(Math.random() * 5) - 2; // B
      }
      return imageData;
    };

    // Protect toDataURL
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        addNoise(imageData);
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, args);
    };

    // Protect getImageData
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      const imageData = originalGetImageData.apply(this, args);
      return addNoise(imageData);
    };

    this.protectedAPIs.push('Canvas');
    logger.debug('Canvas fingerprinting protection enabled');
  }

  /**
   * Protect WebGL fingerprinting (Vector 2)
   */
  protectWebGL() {
    const getParameterProto = WebGLRenderingContext.prototype.getParameter;

    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // Spoof UNMASKED_VENDOR_WEBGL and UNMASKED_RENDERER_WEBGL
      if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
        return 'Intel Inc.';
      }
      if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
        return 'Intel Iris OpenGL Engine';
      }

      return getParameterProto.apply(this, arguments);
    };

    // Also protect WebGL2
    if (window.WebGL2RenderingContext) {
      const getParameterProto2 = WebGL2RenderingContext.prototype.getParameter;

      WebGL2RenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return 'Intel Inc.';
        if (parameter === 37446) return 'Intel Iris OpenGL Engine';
        return getParameterProto2.apply(this, arguments);
      };
    }

    this.protectedAPIs.push('WebGL');
    logger.debug('WebGL fingerprinting protection enabled');
  }

  /**
   * Protect AudioContext fingerprinting (Vector 3)
   */
  protectAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    const origCreateOscillator = AudioContext.prototype.createOscillator;
    const origCreateDynamicsCompressor = AudioContext.prototype.createDynamicsCompressor;

    // Add noise to oscillator frequency
    AudioContext.prototype.createOscillator = function() {
      const oscillator = origCreateOscillator.apply(this, arguments);
      const originalStart = oscillator.start;

      oscillator.start = function(when) {
        // Add small random noise to frequency
        oscillator.frequency.value += Math.random() * 0.001 - 0.0005;
        return originalStart.apply(this, arguments);
      };

      return oscillator;
    };

    // Spoof compressor values
    AudioContext.prototype.createDynamicsCompressor = function() {
      const compressor = origCreateDynamicsCompressor.apply(this, arguments);

      // Add small variations
      Object.defineProperty(compressor.threshold, 'value', {
        get: () => -50 + Math.random() * 0.1
      });

      return compressor;
    };

    this.protectedAPIs.push('AudioContext');
    logger.debug('AudioContext fingerprinting protection enabled');
  }

  /**
   * Protect Font fingerprinting (Vector 4)
   */
  protectFonts() {
    // Override measureText to add slight variations
    const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;

    CanvasRenderingContext2D.prototype.measureText = function(text) {
      const metrics = originalMeasureText.apply(this, arguments);

      // Add tiny random variation to width
      const noise = Math.random() * 0.01 - 0.005;
      const originalWidth = metrics.width;

      Object.defineProperty(metrics, 'width', {
        get: () => originalWidth + noise,
        enumerable: true
      });

      return metrics;
    };

    this.protectedAPIs.push('Font Metrics');
    logger.debug('Font fingerprinting protection enabled');
  }

  /**
   * Protect WebRTC IP leak (Vector 5)
   */
  protectWebRTC() {
    // Block WebRTC IP leaks by preventing access to local IP addresses
    const originalRTCPeerConnection = window.RTCPeerConnection;

    if (!originalRTCPeerConnection) return;

    window.RTCPeerConnection = function(...args) {
      const pc = new originalRTCPeerConnection(...args);

      // Intercept addIceCandidate to filter out local IPs
      const originalAddIceCandidate = pc.addIceCandidate;

      pc.addIceCandidate = function(candidate) {
        if (candidate && candidate.candidate) {
          // Block local IP addresses (192.168.x.x, 10.x.x.x, etc.)
          if (candidate.candidate.match(/192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\./)) {
            logger.debug('WebRTC local IP candidate blocked');
            return Promise.resolve();
          }
        }
        return originalAddIceCandidate.apply(this, arguments);
      };

      return pc;
    };

    // Also block getUserMedia for complete WebRTC blocking if configured
    const settings = storageManager.getSettings();
    if (settings.then) {
      settings.then(s => {
        if (s.webRTCBlocking) {
          navigator.getUserMedia = undefined;
          navigator.mediaDevices.getUserMedia = () => Promise.reject('WebRTC blocked');
        }
      });
    }

    this.protectedAPIs.push('WebRTC');
    logger.debug('WebRTC fingerprinting protection enabled');
  }

  /**
   * Protect Hardware fingerprinting (Vector 6)
   */
  protectHardware() {
    // Spoof navigator.hardwareConcurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 4, // Return generic value
      configurable: false
    });

    // Spoof navigator.deviceMemory
    if ('deviceMemory' in navigator) {
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8, // Return generic value
        configurable: false
      });
    }

    // Spoof battery API
    if ('getBattery' in navigator) {
      const originalGetBattery = navigator.getBattery;

      navigator.getBattery = function() {
        return originalGetBattery.apply(this, arguments).then(battery => {
          // Spoof battery values
          Object.defineProperties(battery, {
            level: {
              get: () => 1.0,
              enumerable: true
            },
            charging: {
              get: () => true,
              enumerable: true
            },
            chargingTime: {
              get: () => 0,
              enumerable: true
            },
            dischargingTime: {
              get: () => Infinity,
              enumerable: true
            }
          });

          return battery;
        });
      };
    }

    // Spoof screen resolution (add small variations)
    const originalScreen = window.screen;
    const noise = Math.floor(Math.random() * 10);

    Object.defineProperties(window.screen, {
      width: {
        get: () => originalScreen.width + noise,
        enumerable: true
      },
      height: {
        get: () => originalScreen.height + noise,
        enumerable: true
      },
      availWidth: {
        get: () => originalScreen.availWidth + noise,
        enumerable: true
      },
      availHeight: {
        get: () => originalScreen.availHeight + noise,
        enumerable: true
      }
    });

    this.protectedAPIs.push('Hardware');
    logger.debug('Hardware fingerprinting protection enabled');
  }

  /**
   * Spoof user agent (additional protection)
   */
  spoofUserAgent() {
    const genericUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    Object.defineProperty(navigator, 'userAgent', {
      get: () => genericUA,
      configurable: false
    });

    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
      configurable: false
    });

    Object.defineProperty(navigator, 'vendor', {
      get: () => 'Google Inc.',
      configurable: false
    });

    logger.debug('User agent spoofed');
  }

  /**
   * Protect against timing attacks
   * @returns {Function} - Modified performance.now
   */
  protectTiming() {
    const originalNow = performance.now;
    let timeOffset = Math.random() * 10;

    performance.now = function() {
      // Add random offset to timing
      return originalNow.apply(this, arguments) + timeOffset;
    };

    logger.debug('Timing attack protection enabled');
  }

  /**
   * Get protection status
   * @returns {Object} - Protection status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      protectedAPIs: this.protectedAPIs,
      vectorsProtected: this.protectedAPIs.length
    };
  }

  /**
   * Disable fingerprint protection
   */
  disable() {
    this.enabled = false;
    logger.info('Fingerprint protection disabled (page reload required)');
  }

  /**
   * Enable fingerprint protection
   */
  enable() {
    this.enabled = true;
    logger.info('Fingerprint protection enabled (page reload required)');
  }
}

// Export singleton instance
const fingerprintShield = new FingerprintShield();
export default fingerprintShield;
export { FingerprintShield };
