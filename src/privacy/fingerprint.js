// PrivacyShield - Fingerprint Protection (6 Vectors)

let protectedAPIs = [];

/**
 * Initialize all fingerprint protections
 */
export function initialize() {
  protectCanvas();
  protectWebGL();
  protectAudioContext();
  protectFonts();
  protectWebRTC();
  protectHardware();

  console.log('PrivacyShield: Fingerprint protection initialized (6 vectors)');
}

/**
 * Protect Canvas fingerprinting (Vector 1)
 */
function protectCanvas() {
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  const addNoise = (imageData) => {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] += Math.floor(Math.random() * 5) - 2;     // R
      data[i + 1] += Math.floor(Math.random() * 5) - 2; // G
      data[i + 2] += Math.floor(Math.random() * 5) - 2; // B
    }
    return imageData;
  };

  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    const context = this.getContext('2d');
    if (context) {
      const imageData = context.getImageData(0, 0, this.width, this.height);
      addNoise(imageData);
      context.putImageData(imageData, 0, 0);
    }
    return originalToDataURL.apply(this, args);
  };

  CanvasRenderingContext2D.prototype.getImageData = function(...args) {
    const imageData = originalGetImageData.apply(this, args);
    return addNoise(imageData);
  };

  protectedAPIs.push('Canvas');
}

/**
 * Protect WebGL fingerprinting (Vector 2)
 */
function protectWebGL() {
  const getParameterProto = WebGLRenderingContext.prototype.getParameter;

  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
    if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
    return getParameterProto.apply(this, arguments);
  };

  if (window.WebGL2RenderingContext) {
    const getParameterProto2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return 'Intel Inc.';
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return getParameterProto2.apply(this, arguments);
    };
  }

  protectedAPIs.push('WebGL');
}

/**
 * Protect AudioContext fingerprinting (Vector 3)
 */
function protectAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const origCreateOscillator = AudioContext.prototype.createOscillator;
  const origCreateDynamicsCompressor = AudioContext.prototype.createDynamicsCompressor;

  AudioContext.prototype.createOscillator = function() {
    const oscillator = origCreateOscillator.apply(this, arguments);
    const originalStart = oscillator.start;

    oscillator.start = function(when) {
      oscillator.frequency.value += Math.random() * 0.001 - 0.0005;
      return originalStart.apply(this, arguments);
    };

    return oscillator;
  };

  AudioContext.prototype.createDynamicsCompressor = function() {
    const compressor = origCreateDynamicsCompressor.apply(this, arguments);
    Object.defineProperty(compressor.threshold, 'value', {
      get: () => -50 + Math.random() * 0.1
    });
    return compressor;
  };

  protectedAPIs.push('AudioContext');
}

/**
 * Protect Font fingerprinting (Vector 4)
 */
function protectFonts() {
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;

  CanvasRenderingContext2D.prototype.measureText = function(text) {
    const metrics = originalMeasureText.apply(this, arguments);
    const noise = Math.random() * 0.01 - 0.005;
    const originalWidth = metrics.width;

    Object.defineProperty(metrics, 'width', {
      get: () => originalWidth + noise,
      enumerable: true
    });

    return metrics;
  };

  protectedAPIs.push('Font');
}

/**
 * Protect WebRTC IP leak (Vector 5)
 */
function protectWebRTC() {
  const originalRTCPeerConnection = window.RTCPeerConnection;
  if (!originalRTCPeerConnection) return;

  window.RTCPeerConnection = function(...args) {
    const pc = new originalRTCPeerConnection(...args);
    const originalAddIceCandidate = pc.addIceCandidate;

    pc.addIceCandidate = function(candidate) {
      if (candidate && candidate.candidate) {
        // Block local IP addresses
        if (candidate.candidate.match(/192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\./)) {
          return Promise.resolve();
        }
      }
      return originalAddIceCandidate.apply(this, arguments);
    };

    return pc;
  };

  protectedAPIs.push('WebRTC');
}

/**
 * Protect Hardware fingerprinting (Vector 6)
 */
function protectHardware() {
  // Spoof CPU cores
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 4,
    configurable: false
  });

  // Spoof device memory
  if ('deviceMemory' in navigator) {
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
      configurable: false
    });
  }

  // Spoof battery API
  if ('getBattery' in navigator) {
    const originalGetBattery = navigator.getBattery;
    navigator.getBattery = function() {
      return originalGetBattery.apply(this, arguments).then(battery => {
        Object.defineProperties(battery, {
          level: { get: () => 1.0, enumerable: true },
          charging: { get: () => true, enumerable: true },
          chargingTime: { get: () => 0, enumerable: true },
          dischargingTime: { get: () => Infinity, enumerable: true }
        });
        return battery;
      });
    };
  }

  // Spoof screen resolution (add noise)
  const originalScreen = window.screen;
  const noise = Math.floor(Math.random() * 10);

  Object.defineProperties(window.screen, {
    width: { get: () => originalScreen.width + noise, enumerable: true },
    height: { get: () => originalScreen.height + noise, enumerable: true },
    availWidth: { get: () => originalScreen.availWidth + noise, enumerable: true },
    availHeight: { get: () => originalScreen.availHeight + noise, enumerable: true }
  });

  protectedAPIs.push('Hardware');
}

export default { initialize };
