// PrivacyShield - Script Behavior Monitoring System
// Monitors script execution patterns for behavioral analysis

class ScriptMonitor {
  constructor(behavioralAnalyzer) {
    this.analyzer = behavioralAnalyzer;
    this.scriptData = new Map(); // scriptId -> execution data
    this.apiCalls = new Map(); // scriptId -> API call list
    this.startTime = new Map(); // scriptId -> start time
    this.isMonitoring = false;
    
    // API monitoring
    this.setupAPIInterception();
  }

  /**
   * Start monitoring scripts on the page
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    
    console.log('Script monitoring started');
    this.interceptScriptExecution();
    this.monitorNetworkRequests();
    this.setupErrorHandling();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Script monitoring stopped');
  }

  /**
   * Intercept script execution to track behavior
   */
  interceptScriptExecution() {
    // Override createElement to track script creation
    const originalCreateElement = document.createElement;
    const self = this;
    
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(this, tagName);
      
      if (tagName.toLowerCase() === 'script' && self.isMonitoring) {
        self.trackScriptElement(element);
      }
      
      return element;
    };
  }

  /**
   * Track individual script element
   */
  trackScriptElement(scriptElement) {
    const scriptId = this.generateScriptId();
    const startTime = performance.now();
    
    this.startTime.set(scriptId, startTime);
    this.scriptData.set(scriptId, {
      scriptId,
      src: scriptElement.src,
      content: '',
      requests: [],
      apiCalls: [],
      startTime,
      executionTime: 0
    });
    
    // Monitor script loading
    if (scriptElement.src) {
      this.trackExternalScript(scriptId, scriptElement.src);
    } else {
      // Track inline scripts
      this.trackInlineScript(scriptId, scriptElement);
    }
    
    // Monitor script execution
    scriptElement.addEventListener('load', () => {
      this.onScriptLoaded(scriptId);
    });
    
    scriptElement.addEventListener('error', (error) => {
      this.onScriptError(scriptId, error);
    });
  }

  /**
   * Track external script loading
   */
  trackExternalScript(scriptId, src) {
    const data = this.scriptData.get(scriptId);
    if (!data) return;
    
    data.src = src;
    data.isThirdParty = this.isThirdParty(src);
    
    // Fetch script content for analysis (if possible)
    try {
      fetch(src, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            data.scriptSize = parseInt(response.headers.get('content-length') || '0');
          }
        })
        .catch(() => {
          // Cross-origin request blocked, that's ok
        });
    } catch (error) {
      // Ignore fetch errors
    }
  }

  /**
   * Track inline script
   */
  trackInlineScript(scriptId, scriptElement) {
    const data = this.scriptData.get(scriptId);
    if (!data) return;
    
    data.content = scriptElement.textContent || '';
    data.scriptSize = data.content.length;
    data.isInline = true;
  }

  /**
   * Setup API interception for monitoring
   */
  setupAPIInterception() {
    // Monitor storage API usage
    this.interceptStorageAPI('localStorage');
    this.interceptStorageAPI('sessionStorage');
    
    // Monitor canvas API
    this.interceptCanvasAPI();
    
    // Monitor WebGL API
    this.interceptWebGLAPI();
    
    // Monitor Audio API
    this.interceptAudioAPI();
    
    // Monitor navigator properties
    this.interceptNavigatorAPI();
    
    // Monitor dynamic code execution
    this.interceptDynamicCode();
  }

  /**
   * Intercept storage API calls
   */
  interceptStorageAPI(storageType) {
    const original = window[storageType];
    const self = this;
    
    if (!original) return;
    
    const originalGetItem = original.getItem;
    const originalSetItem = original.setItem;
    const originalRemoveItem = original.removeItem;
    
    original.getItem = function(key) {
      self.recordAPICall('storage.getItem', [key]);
      return originalGetItem.apply(this, arguments);
    };
    
    original.setItem = function(key, value) {
      self.recordAPICall('storage.setItem', [key, value]);
      return originalSetItem.apply(this, arguments);
    };
    
    original.removeItem = function(key) {
      self.recordAPICall('storage.removeItem', [key]);
      return originalRemoveItem.apply(this, arguments);
    };
  }

  /**
   * Intercept Canvas API calls
   */
  interceptCanvasAPI() {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    const self = this;
    
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      self.recordAPICall('canvas.toDataURL', args);
      return originalToDataURL.apply(this, args);
    };
    
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      self.recordAPICall('canvas.getImageData', args);
      return originalGetImageData.apply(this, args);
    };
  }

  /**
   * Intercept WebGL API calls
   */
  interceptWebGLAPI() {
    const contexts = ['webgl', 'webgl2'];
    const self = this;
    
    contexts.forEach(contextType => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(contextId, ...args) {
        const context = getContext.apply(this, [contextId, ...args]);
        
        if (context && (contextId === contextType || contextId === 'experimental-' + contextType)) {
          const originalGetParameter = context.getParameter;
          context.getParameter = function(parameter) {
            self.recordAPICall('webgl.getParameter', [parameter]);
            return originalGetParameter.call(this, parameter);
          };
        }
        
        return context;
      };
    });
  }

  /**
   * Intercept Audio API calls
   */
  interceptAudioAPI() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const originalCreateOscillator = AudioContext.prototype.createOscillator;
    const originalCreateDynamicsCompressor = AudioContext.prototype.createDynamicsCompressor;
    const self = this;
    
    AudioContext.prototype.createOscillator = function(...args) {
      self.recordAPICall('audio.createOscillator', args);
      return originalCreateOscillator.apply(this, args);
    };
    
    AudioContext.prototype.createDynamicsCompressor = function(...args) {
      self.recordAPICall('audio.createDynamicsCompressor', args);
      return originalCreateDynamicsCompressor.apply(this, args);
    };
  }

  /**
   * Intercept navigator API calls
   */
  interceptNavigatorAPI() {
    const self = this;
    const sensitiveProperties = [
      'hardwareConcurrency', 'deviceMemory', 'platform', 'userAgent'
    ];
    
    sensitiveProperties.forEach(prop => {
      if (navigator[prop] !== undefined) {
        let accessCount = 0;
        Object.defineProperty(navigator, prop, {
          get: function() {
            accessCount++;
            self.recordAPICall(`navigator.${prop}`, []);
            return navigator['__' + prop] || navigator[prop];
          },
          configurable: true
        });
        
        // Store original value
        navigator['__' + prop] = navigator[prop];
      }
    });
  }

  /**
   * Intercept dynamic code execution
   * Note: DISABLED for production security - eval monitoring removed
   */
  interceptDynamicCode() {
    // Dynamic code monitoring disabled for production security
    // Only monitor setTimeout/setInterval for string callbacks
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    const self = this;
    
    window.setTimeout = function(callback, delay, ...args) {
      if (typeof callback === 'string') {
        self.recordAPICall('setTimeout.string', [callback.substring(0, 50)]);
      }
      return originalSetTimeout.apply(this, arguments);
    };
    
    window.setInterval = function(callback, delay, ...args) {
      if (typeof callback === 'string') {
        self.recordAPICall('setInterval.string', [callback.substring(0, 50)]);
      }
      return originalSetInterval.apply(this, arguments);
    };
  }

  /**
   * Monitor network requests
   */
  monitorNetworkRequests() {
    const self = this;
    
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      self.recordNetworkRequest(url, options.method || 'GET', 'fetch');
      return originalFetch.apply(this, arguments);
    };
    
    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._url = url;
      this._method = method;
      return originalXHROpen.apply(this, [method, url, ...args]);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      if (this._url) {
        self.recordNetworkRequest(this._url, this._method || 'GET', 'xhr');
      }
      return originalXHRSend.apply(this, arguments);
    };
  }

  /**
   * Record API call for current script
   */
  recordAPICall(apiName, args) {
    if (!this.isMonitoring) return;
    
    const scriptId = this.getCurrentScriptId();
    if (!scriptId) return;
    
    const data = this.scriptData.get(scriptId);
    if (!data) return;
    
    data.apiCalls.push({
      name: apiName,
      args: this.sanitizeArgs(args),
      timestamp: performance.now(),
      stackTrace: this.getStackTrace()
    });
  }

  /**
   * Record network request
   */
  recordNetworkRequest(url, method, type) {
    if (!this.isMonitoring) return;
    
    const scriptId = this.getCurrentScriptId();
    if (!scriptId) return;
    
    const data = this.scriptData.get(scriptId);
    if (!data) return;
    
    data.requests.push({
      url,
      method,
      type,
      isThirdParty: this.isThirdParty(url),
      timestamp: performance.now()
    });
  }

  /**
   * Get current script ID from call stack
   */
  getCurrentScriptId() {
    // This is a simplified approach - in reality we'd need more sophisticated tracking
    const stack = this.getStackTrace();
    
    // Try to find script ID from stack trace
    for (const frame of stack) {
      if (frame.scriptId) {
        return frame.scriptId;
      }
    }
    
    // Fallback to most recent script
    if (this.scriptData.size > 0) {
      const scripts = Array.from(this.scriptData.keys());
      return scripts[scripts.length - 1];
    }
    
    return null;
  }

  /**
   * Get sanitized stack trace
   */
  getStackTrace() {
    try {
      throw new Error();
    } catch (error) {
      return error.stack || '';
    }
  }

  /**
   * Sanitize arguments for storage
   */
  sanitizeArgs(args) {
    return args.map(arg => {
      if (typeof arg === 'string' && arg.length > 100) {
        return arg.substring(0, 100) + '...';
      }
      if (typeof arg === 'object') {
        return '[Object]';
      }
      return arg;
    });
  }

  /**
   * Check if URL is third-party
   */
  isThirdParty(url) {
    try {
      const scriptDomain = new URL(url).hostname;
      const currentDomain = window.location.hostname;
      return scriptDomain !== currentDomain && !scriptDomain.endsWith('.' + currentDomain);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate unique script ID
   */
  generateScriptId() {
    return 'script_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Handle script loaded event
   */
  onScriptLoaded(scriptId) {
    const data = this.scriptData.get(scriptId);
    if (!data) return;
    
    const startTime = this.startTime.get(scriptId) || 0;
    data.executionTime = performance.now() - startTime;
    
    // Analyze script behavior
    this.analyzeScript(scriptId, data);
  }

  /**
   * Handle script error event
   */
  onScriptError(scriptId, error) {
    console.warn(`Script error for ${scriptId}:`, error);
    const data = this.scriptData.get(scriptId);
    if (data) {
      data.hasError = true;
      data.error = error;
    }
  }

  /**
   * Analyze script using behavioral analyzer
   */
  analyzeScript(scriptId, data) {
    try {
      const domain = this.extractDomain(data.src || window.location.href);
      const analysis = this.analyzer.analyzeScript(domain, data);
      
      // Store analysis results
      data.analysis = analysis;
      
      // Send analysis to background script
      this.sendAnalysisToBackground(scriptId, domain, analysis);
      
      // Apply blocking if recommended
      if (analysis.recommendation === 'block') {
        this.applyBlocking(scriptId, analysis);
      }
      
    } catch (error) {
      console.error('Script analysis failed:', error);
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (error) {
      return window.location.hostname;
    }
  }

  /**
   * Send analysis to background script
   */
  sendAnalysisToBackground(scriptId, domain, analysis) {
    chrome.runtime.sendMessage({
      type: 'SCRIPT_ANALYSIS',
      data: {
        scriptId,
        domain,
        analysis,
        timestamp: Date.now()
      }
    }).catch(() => {
      // Background script may not be available
    });
  }

  /**
   * Apply blocking measures
   */
  applyBlocking(scriptId, analysis) {
    // This is a simplified blocking mechanism
    // In reality, we'd need more sophisticated blocking
    console.log(`Blocking script ${scriptId} due to:`, analysis.recommendation);
    
    // Remove script if possible
    const scriptElement = document.querySelector(`[data-script-id="${scriptId}"]`);
    if (scriptElement) {
      scriptElement.remove();
    }
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      if (event.filename && this.isMonitoring) {
        this.recordScriptError(event.filename, event.error);
      }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isMonitoring) {
        this.recordScriptError('unhandled', event.reason);
      }
    });
  }

  /**
   * Record script error
   */
  recordScriptError(filename, error) {
    // Find associated script data
    for (const [scriptId, data] of this.scriptData) {
      if (data.src && data.src.includes(filename) || data.isInline) {
        data.hasError = true;
        data.error = error;
        break;
      }
    }
  }

  /**
   * Get monitoring statistics
   */
  getStats() {
    const stats = {
      scriptsMonitored: this.scriptData.size,
      totalAPICalls: 0,
      totalRequests: 0,
      scriptsWithErrors: 0
    };
    
    for (const data of this.scriptData.values()) {
      stats.totalAPICalls += data.apiCalls.length;
      stats.totalRequests += data.requests.length;
      if (data.hasError) stats.scriptsWithErrors++;
    }
    
    return stats;
  }

  /**
   * Clean up old script data
   */
  cleanup() {
    const cutoff = Date.now() - (5 * 60 * 1000); // 5 minutes ago
    
    for (const [scriptId, data] of this.scriptData) {
      if (data.startTime < cutoff) {
        this.scriptData.delete(scriptId);
        this.startTime.delete(scriptId);
      }
    }
  }
}

export { ScriptMonitor };
