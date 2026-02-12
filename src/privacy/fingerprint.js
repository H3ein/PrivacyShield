// PrivacyShield - Fingerprint Protection (6 Vectors)
// All noise is generated ONCE per session for consistency

const protectedAPIs = [];

// Session seed - generated once, used for all deterministic noise
const SESSION_SEED = Date.now() ^ (Math.random() * 0xFFFFFFFF >>> 0);

/**
 * Simple seeded PRNG (mulberry32) for consistent per-session noise
 */
function seededRandom(seed) {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Generate a deterministic noise value from seed + index
 */
function noise(index, range = 5) {
  const val = seededRandom(SESSION_SEED + index);
  return Math.floor(val * range) - Math.floor(range / 2);
}

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
}

/**
 * Protect Canvas fingerprinting (Vector 1)
 * Uses session-deterministic noise so each read returns the same modified data
 */
function protectCanvas() {
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  const addNoise = (imageData) => {
    const data = imageData.data;
    // Apply noise to ~5% of pixels using seeded random for consistency
    for (let i = 0; i < data.length; i += 4) {
      const pixelSeed = SESSION_SEED + (i >>> 2);
      if (seededRandom(pixelSeed) < 0.05) {
        data[i] += noise(pixelSeed, 5);       // R
        data[i + 1] += noise(pixelSeed + 1, 5); // G
        data[i + 2] += noise(pixelSeed + 2, 5); // B
      }
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
 * Returns common GPU strings from a pool (not hardcoded to one value)
 */
function protectWebGL() {
  const gpuPool = [
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.5)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060, OpenGL 4.5)' },
    { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 580, OpenGL 4.5)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 640, OpenGL 4.1)' },
  ];

  // Pick one GPU per session (deterministic from seed)
  const gpuIndex = Math.abs(SESSION_SEED) % gpuPool.length;
  const spoofedGPU = gpuPool[gpuIndex];

  const patchContext = (proto) => {
    const original = proto.getParameter;
    proto.getParameter = function(parameter) {
      if (parameter === 37445) {return spoofedGPU.vendor;}  // UNMASKED_VENDOR_WEBGL
      if (parameter === 37446) {return spoofedGPU.renderer;} // UNMASKED_RENDERER_WEBGL
      return original.apply(this, arguments);
    };
  };

  patchContext(WebGLRenderingContext.prototype);
  if (window.WebGL2RenderingContext) {
    patchContext(WebGL2RenderingContext.prototype);
  }

  protectedAPIs.push('WebGL');
}

/**
 * Protect AudioContext fingerprinting (Vector 3)
 * Adds consistent per-session noise to audio processing
 */
function protectAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {return;}

  const freqNoise = seededRandom(SESSION_SEED + 100) * 0.001 - 0.0005;
  const thresholdNoise = seededRandom(SESSION_SEED + 101) * 0.1;

  const origCreateOscillator = AudioCtx.prototype.createOscillator;
  const origCreateCompressor = AudioCtx.prototype.createDynamicsCompressor;

  AudioCtx.prototype.createOscillator = function() {
    const osc = origCreateOscillator.apply(this, arguments);
    const origStart = osc.start;
    osc.start = function() {
      osc.frequency.value += freqNoise;
      return origStart.apply(this, arguments);
    };
    return osc;
  };

  AudioCtx.prototype.createDynamicsCompressor = function() {
    const comp = origCreateCompressor.apply(this, arguments);
    const origThreshold = Object.getOwnPropertyDescriptor(
      comp.threshold.__proto__, 'value'
    );
    if (origThreshold) {
      Object.defineProperty(comp.threshold, 'value', {
        get: () => -50 + thresholdNoise
      });
    }
    return comp;
  };

  protectedAPIs.push('AudioContext');
}

/**
 * Protect Font fingerprinting (Vector 4)
 * Consistent noise per session for text metrics
 */
function protectFonts() {
  const fontNoise = seededRandom(SESSION_SEED + 200) * 0.01 - 0.005;
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;

  CanvasRenderingContext2D.prototype.measureText = function(text) {
    const metrics = originalMeasureText.apply(this, arguments);
    const originalWidth = metrics.width;

    Object.defineProperty(metrics, 'width', {
      get: () => originalWidth + fontNoise,
      enumerable: true
    });

    return metrics;
  };

  protectedAPIs.push('Font');
}

/**
 * Protect WebRTC IP leak (Vector 5)
 * Blocks both IPv4 and IPv6 private/local addresses
 */
function protectWebRTC() {
  const OrigRTC = window.RTCPeerConnection;
  if (!OrigRTC) {return;}

  // Patterns for private/local IPs (IPv4 and IPv6)
  const privateIPv4 = /192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./;
  const privateIPv6 = /fe80:|fc00:|fd00:|::1[\s/]|ff0[0-9a-f]:/i;

  window.RTCPeerConnection = function(...args) {
    const pc = new OrigRTC(...args);
    const origAddIceCandidate = pc.addIceCandidate;

    pc.addIceCandidate = function(candidate) {
      if (candidate && candidate.candidate) {
        if (privateIPv4.test(candidate.candidate) || privateIPv6.test(candidate.candidate)) {
          return Promise.resolve();
        }
      }
      return origAddIceCandidate.apply(this, arguments);
    };

    return pc;
  };

  // Copy static properties
  window.RTCPeerConnection.prototype = OrigRTC.prototype;
  window.RTCPeerConnection.generateCertificate = OrigRTC.generateCertificate;

  protectedAPIs.push('WebRTC');
}

/**
 * Protect Hardware fingerprinting (Vector 6)
 * Consistent spoofed values per session
 */
function protectHardware() {
  // Spoof CPU cores to a common value
  const cores = [2, 4, 8][Math.abs(SESSION_SEED) % 3];
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => cores,
    configurable: false
  });

  // Spoof device memory to a common value
  if ('deviceMemory' in navigator) {
    const mem = [4, 8][Math.abs(SESSION_SEED + 1) % 2];
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => mem,
      configurable: false
    });
  }

  // Spoof battery API
  if ('getBattery' in navigator) {
    const origGetBattery = navigator.getBattery;
    navigator.getBattery = function() {
      return origGetBattery.apply(this, arguments).then(battery => {
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

  // Spoof screen resolution with CONSISTENT noise (generated once)
  const screenNoise = noise(SESSION_SEED + 300, 10);
  const origWidth = screen.width;
  const origHeight = screen.height;
  const origAvailW = screen.availWidth;
  const origAvailH = screen.availHeight;

  Object.defineProperties(screen, {
    width: { get: () => origWidth + screenNoise, enumerable: true },
    height: { get: () => origHeight + screenNoise, enumerable: true },
    availWidth: { get: () => origAvailW + screenNoise, enumerable: true },
    availHeight: { get: () => origAvailH + screenNoise, enumerable: true }
  });

  protectedAPIs.push('Hardware');
}

export function getProtectedAPIs() {
  return [...protectedAPIs];
}

export default { initialize, getProtectedAPIs };
