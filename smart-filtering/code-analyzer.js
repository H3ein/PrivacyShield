// PrivacyShield Max - Code Analyzer
// Detect code obfuscation, crypto mining, and malicious scripts

import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';

class CodeAnalyzer {
  constructor() {
    this.enabled = true;
    this.sensitivity = 5;
    this.detectedScripts = new Map();
  }

  /**
   * Initialize code analyzer
   */
  async initialize() {
    const settings = await storageManager.getSettings();
    this.enabled = settings.smartFiltering?.enabled !== false;
    this.sensitivity = settings.smartFiltering?.sensitivity || 5;

    logger.info('Code analyzer initialized');
  }

  /**
   * Analyze script content
   * @param {string} scriptContent - JavaScript code to analyze
   * @param {string} url - Script URL
   * @returns {Object} - Analysis result
   */
  analyzeScript(scriptContent, url = '') {
    if (!this.enabled || !scriptContent) {
      return { isMalicious: false };
    }

    const analysis = {
      obfuscation: this.detectObfuscation(scriptContent),
      cryptoMiner: this.detectCryptoMiner(scriptContent, url),
      maliciousPatterns: this.detectMaliciousPatterns(scriptContent),
      fingerprinting: this.detectFingerprinting(scriptContent)
    };

    // Calculate overall threat score
    let score = 0;
    const reasons = [];

    if (analysis.obfuscation.isObfuscated) {
      score += analysis.obfuscation.confidence * 40;
      reasons.push(`Obfuscated code (${Math.round(analysis.obfuscation.confidence * 100)}%)`);
    }

    if (analysis.cryptoMiner.isMiner) {
      score += analysis.cryptoMiner.confidence * 100; // Zero tolerance
      reasons.push('Crypto mining detected');
    }

    if (analysis.maliciousPatterns.detected) {
      score += analysis.maliciousPatterns.confidence * 60;
      reasons.push('Malicious patterns: ' + analysis.maliciousPatterns.patterns.join(', '));
    }

    if (analysis.fingerprinting.isFingerprinting) {
      score += analysis.fingerprinting.confidence * 30;
      reasons.push('Fingerprinting detected');
    }

    const confidence = Math.min(score / 100, 1.0);
    const isMalicious = confidence >= 0.5;

    if (isMalicious) {
      this.detectedScripts.set(url, {
        confidence,
        reasons,
        analysis,
        timestamp: Date.now()
      });

      logger.warn('Malicious script detected:', { url, confidence, reasons });
    }

    return {
      isMalicious,
      confidence,
      reasons,
      shouldBlock: isMalicious && confidence >= 0.7,
      analysis
    };
  }

  /**
   * Detect code obfuscation
   * @param {string} code - JavaScript code
   * @returns {Object} - { isObfuscated, confidence, indicators }
   */
  detectObfuscation(code) {
    const indicators = {
      hexStrings: (code.match(/\\x[0-9a-fA-F]{2}/g) || []).length,
      unicodeEscapes: (code.match(/\\u[0-9a-fA-F]{4}/g) || []).length,
      evalUsage: (code.match(/eval\s*\(/g) || []).length,
      functionConstructor: (code.match(/Function\s*\(/g) || []).length,
      base64: (code.match(/[A-Za-z0-9+/]{40,}={0,2}/g) || []).length,
      packedCode: /eval\(function\(p,a,c,k,e,d\)/.test(code),
      charCodeUsage: (code.match(/fromCharCode|charCodeAt/g) || []).length,
      arrayObfuscation: /\[\s*\w+\s*\]\s*\(\s*\w+\s*\)/.test(code),
      stringConcatenation: (code.match(/["']\s*\+\s*["']/g) || []).length > 10,
      unusualSyntax: /[a-zA-Z_$][a-zA-Z0-9_$]*\[["'][a-zA-Z0-9_$]+["']\]/.test(code)
    };

    // Calculate obfuscation score
    let score = 0;

    if (indicators.packedCode) score += 40;
    if (indicators.evalUsage > 0) score += 25;
    if (indicators.functionConstructor > 0) score += 20;
    if (indicators.hexStrings > 5) score += 15;
    if (indicators.unicodeEscapes > 5) score += 15;
    if (indicators.base64 > 2) score += 10;
    if (indicators.charCodeUsage > 3) score += 10;
    if (indicators.arrayObfuscation) score += 10;
    if (indicators.stringConcatenation) score += 5;
    if (indicators.unusualSyntax) score += 5;

    // Check code density (obfuscated code is often very dense)
    const linesOfCode = code.split('\n').length;
    const codeLength = code.length;
    const avgLineLength = codeLength / linesOfCode;

    if (avgLineLength > 200) {
      score += 10;
      indicators.densecode = true;
    }

    const confidence = Math.min(score / 100, 1.0);
    const isObfuscated = confidence > 0.5;

    return {
      isObfuscated,
      confidence,
      indicators
    };
  }

  /**
   * Detect crypto mining code
   * @param {string} code - JavaScript code
   * @param {string} url - Script URL
   * @returns {Object} - { isMiner, confidence, miner }
   */
  detectCryptoMiner(code, url) {
    // Known mining library patterns
    const minerPatterns = [
      { pattern: /coinhive/i, miner: 'Coinhive' },
      { pattern: /cryptonight/i, miner: 'CryptoNight' },
      { pattern: /webminerpool/i, miner: 'WebMinerPool' },
      { pattern: /crypto-loot/i, miner: 'CryptoLoot' },
      { pattern: /jsecoin/i, miner: 'JSECoin' },
      { pattern: /minerva/i, miner: 'Minerva' },
      { pattern: /minero\.cc/i, miner: 'Minero' },
      { pattern: /kisshentai/i, miner: 'KissHentai Miner' },
      { pattern: /ppoi\.org/i, miner: 'PPoi' },
      { pattern: /monerominer/i, miner: 'MoneroMiner' }
    ];

    // Check URL first
    for (const { pattern, miner } of minerPatterns) {
      if (pattern.test(url)) {
        return {
          isMiner: true,
          confidence: 1.0,
          miner,
          method: 'url'
        };
      }
    }

    // Check code patterns
    let matches = 0;
    let detectedMiner = null;

    for (const { pattern, miner } of minerPatterns) {
      if (pattern.test(code)) {
        matches++;
        detectedMiner = miner;
      }
    }

    // Mining-related function patterns
    const miningFunctions = [
      /startMining/i,
      /setNumThreads/i,
      /getHashesPerSecond/i,
      /getTotalHashes/i,
      /acceptedHashes/i,
      /\.start\s*\(\s*\{?\s*threads/i
    ];

    for (const pattern of miningFunctions) {
      if (pattern.test(code)) {
        matches++;
      }
    }

    // WebAssembly + WebSocket (common for miners)
    const hasWasm = /WebAssembly|\.wasm/i.test(code);
    const hasWebSocket = /WebSocket|ws:\/\//i.test(code);

    if (hasWasm && hasWebSocket) {
      matches += 2;
    }

    // Mining pool connections
    if (/ws:\/\/.*:(8892|8080|3333|14444)/i.test(code)) {
      matches += 2; // Common mining ports
    }

    const confidence = Math.min(matches * 0.25, 1.0);
    const isMiner = confidence >= 0.5 || matches >= 2;

    return {
      isMiner,
      confidence,
      miner: detectedMiner || 'Unknown',
      matches
    };
  }

  /**
   * Detect malicious patterns
   * @param {string} code - JavaScript code
   * @returns {Object} - { detected, confidence, patterns }
   */
  detectMaliciousPatterns(code) {
    const maliciousPatterns = [
      { name: 'XSS', pattern: /document\.write|\.innerHTML\s*=|\.outerHTML\s*=/ },
      { name: 'Cookie theft', pattern: /document\.cookie|localStorage\.getItem/ },
      { name: 'Code injection', pattern: /setTimeout\s*\(\s*["'].*eval|setInterval\s*\(.*eval/ },
      { name: 'Remote script loading', pattern: /createElement\s*\(\s*["']script["']\)|\.src\s*=\s*["']http/ },
      { name: 'Form hijacking', pattern: /addEventListener\s*\(\s*["']submit["']/ },
      { name: 'Clipboard access', pattern: /navigator\.clipboard|document\.execCommand\s*\(\s*["']copy["']/ },
      { name: 'Keylogger', pattern: /addEventListener\s*\(\s*["']keydown["']|addEventListener\s*\(\s*["']keypress["']/ },
      { name: 'Redirect hijacking', pattern: /location\.href\s*=|location\.replace|window\.open/ },
      { name: 'iframe injection', pattern: /createElement\s*\(\s*["']iframe["']\)/ },
      { name: 'Data exfiltration', pattern: /fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/ }
    ];

    const detectedPatterns = [];
    let score = 0;

    for (const { name, pattern } of maliciousPatterns) {
      if (pattern.test(code)) {
        detectedPatterns.push(name);
        score += 10;
      }
    }

    // Multiple suspicious patterns = higher confidence
    if (detectedPatterns.length >= 3) {
      score += 20;
    }

    const confidence = Math.min(score / 100, 1.0);

    return {
      detected: detectedPatterns.length > 0,
      confidence,
      patterns: detectedPatterns
    };
  }

  /**
   * Detect fingerprinting code
   * @param {string} code - JavaScript code
   * @returns {Object} - { isFingerprinting, confidence, vectors }
   */
  detectFingerprinting(code) {
    const fingerprintingAPIs = {
      canvas: ['getContext("2d")', 'toDataURL', 'getImageData'],
      webgl: ['getContext("webgl")', 'getSupportedExtensions', 'getParameter'],
      audio: ['AudioContext', 'createOscillator', 'createAnalyser'],
      webrtc: ['RTCPeerConnection', 'createDataChannel'],
      fonts: ['measureText', 'offsetWidth', 'offsetHeight'],
      hardware: ['hardwareConcurrency', 'deviceMemory', 'getBattery']
    };

    const detectedVectors = {};
    let totalMatches = 0;

    for (const [vector, apis] of Object.entries(fingerprintingAPIs)) {
      let matches = 0;

      for (const api of apis) {
        if (code.includes(api)) {
          matches++;
        }
      }

      if (matches > 0) {
        detectedVectors[vector] = matches;
        totalMatches += matches;
      }
    }

    // Multiple API categories = fingerprinting
    const vectorCount = Object.keys(detectedVectors).length;
    const confidence = Math.min((vectorCount * 0.25) + (totalMatches * 0.05), 1.0);
    const isFingerprinting = vectorCount >= 2;

    return {
      isFingerprinting,
      confidence,
      vectors: detectedVectors,
      vectorCount
    };
  }

  /**
   * Get detected malicious scripts
   * @returns {Array} - Array of detected scripts
   */
  getDetectedScripts() {
    return Array.from(this.detectedScripts.entries()).map(([url, data]) => ({
      url,
      ...data
    }));
  }

  /**
   * Clear detection history
   */
  clearHistory() {
    this.detectedScripts.clear();
    logger.debug('Code analysis history cleared');
  }

  /**
   * Analyze inline script element
   * @param {HTMLScriptElement} scriptElement - Script element
   * @returns {Object} - Analysis result
   */
  analyzeScriptElement(scriptElement) {
    const src = scriptElement.src;
    const content = scriptElement.textContent || scriptElement.innerHTML;

    if (src) {
      // External script - analyze URL
      return this.analyzeScript('', src);
    } else if (content) {
      // Inline script - analyze content
      return this.analyzeScript(content, window.location.href);
    }

    return { isMalicious: false };
  }
}

// Export singleton instance
const codeAnalyzer = new CodeAnalyzer();
export default codeAnalyzer;
export { CodeAnalyzer };
