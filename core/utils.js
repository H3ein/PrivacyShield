// PrivacyShield Max - Core Utilities
// Shared utility functions for URL parsing, domain extraction, etc.

/**
 * Extract hostname from URL string
 * @param {string} url - URL to parse
 * @returns {string|null} - Hostname or null if invalid
 */
export function extractHostname(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

/**
 * Extract domain (without subdomain) from hostname
 * @param {string} hostname - Hostname to parse
 * @returns {string} - Domain
 */
export function extractDomain(hostname) {
  if (!hostname) return '';

  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;

  // Handle special TLDs like .co.uk, .com.au
  const specialTLDs = ['co.uk', 'com.au', 'co.jp', 'co.in'];
  const lastTwo = parts.slice(-2).join('.');

  if (specialTLDs.includes(lastTwo)) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

/**
 * Check if two URLs are first-party (same domain)
 * @param {string} url1 - First URL
 * @param {string} url2 - Second URL
 * @returns {boolean} - True if same domain
 */
export function isFirstParty(url1, url2) {
  if (!url1 || !url2) return false;

  const domain1 = extractDomain(extractHostname(url1));
  const domain2 = extractDomain(extractHostname(url2));

  return domain1 === domain2;
}

/**
 * Check if domain matches pattern
 * @param {string} domain - Domain to check
 * @param {string|RegExp} pattern - Pattern to match
 * @returns {boolean} - True if matches
 */
export function matchesDomainPattern(domain, pattern) {
  if (!domain) return false;

  if (pattern instanceof RegExp) {
    return pattern.test(domain);
  }

  // Handle Adblock Plus syntax
  if (typeof pattern === 'string') {
    // ||example.com^ exact domain
    if (pattern.startsWith('||') && pattern.endsWith('^')) {
      const cleanDomain = pattern.slice(2, -1);
      return domain === cleanDomain || domain.endsWith('.' + cleanDomain);
    }

    // *.example.com wildcard subdomain
    if (pattern.startsWith('*.')) {
      return domain.endsWith(pattern.slice(1));
    }

    // Simple substring match
    return domain.includes(pattern);
  }

  return false;
}

/**
 * Validate domain format
 * @param {string} domain - Domain to validate
 * @returns {boolean} - True if valid
 */
export function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;

  // Basic domain regex
  const domainPattern = /^([a-z0-9-]+\.)*[a-z0-9-]+$/i;

  if (!domainPattern.test(domain)) return false;

  // Check for suspicious patterns
  if (domain.includes('..') || domain.includes('//')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;

  return true;
}

/**
 * Parse Adblock Plus filter syntax
 * @param {string} filter - Filter string
 * @returns {Object} - Parsed filter object
 */
export function parseAdblockFilter(filter) {
  if (!filter || typeof filter !== 'string') return null;

  filter = filter.trim();

  // Skip comments and empty lines
  if (!filter || filter.startsWith('!') || filter.startsWith('#')) {
    return null;
  }

  const parsed = {
    original: filter,
    type: 'block',
    domain: null,
    pattern: null,
    isException: false,
    isElementHiding: false,
    options: {}
  };

  // Exception rule: @@
  if (filter.startsWith('@@')) {
    parsed.isException = true;
    filter = filter.slice(2);
  }

  // Element hiding rule: ##
  if (filter.includes('##') || filter.includes('#@#')) {
    parsed.isElementHiding = true;
    return parsed;
  }

  // Extract options: $option1,option2
  if (filter.includes('$')) {
    const parts = filter.split('$');
    filter = parts[0];

    const options = parts[1].split(',');
    options.forEach(opt => {
      const [key, value] = opt.split('=');
      parsed.options[key.trim()] = value ? value.trim() : true;
    });
  }

  // Domain-based filter: ||example.com^
  if (filter.startsWith('||') && filter.endsWith('^')) {
    parsed.domain = filter.slice(2, -1);
    parsed.type = 'domain';
  } else {
    parsed.pattern = filter;
    parsed.type = 'pattern';
  }

  return parsed;
}

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} - Random string
 */
export function randomString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Calculate SHA-256 hash
 * @param {string} content - Content to hash
 * @returns {Promise<string>} - Hex hash
 */
export async function calculateSHA256(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit time in ms
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} - Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);
  if (obj instanceof Map) return new Map(Array.from(obj, ([k, v]) => [k, deepClone(v)]));
  if (obj instanceof Set) return new Set(Array.from(obj, v => deepClone(v)));

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }

  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Format bytes to human readable
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted string
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get browser API (chrome or browser)
 * @returns {Object} - Browser API object
 */
export function getBrowserAPI() {
  if (typeof browser !== 'undefined') {
    return browser;
  } else if (typeof chrome !== 'undefined') {
    return chrome;
  }
  return null;
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Resolves after delay
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise} - Result of function
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
}

/**
 * Check if URL is suspicious (potential phishing/malware)
 * @param {string} url - URL to check
 * @returns {Object} - {isSuspicious: boolean, reasons: string[]}
 */
export function isSuspiciousURL(url) {
  const reasons = [];

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Check for IP address
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      reasons.push('IP address instead of domain');
    }

    // Check for suspicious TLDs
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq'];
    if (suspiciousTLDs.some(tld => hostname.endsWith(tld))) {
      reasons.push('Suspicious TLD');
    }

    // Check for excessive hyphens
    if ((hostname.match(/-/g) || []).length > 3) {
      reasons.push('Excessive hyphens in domain');
    }

    // Check for punycode/IDN homograph attack
    if (hostname.startsWith('xn--')) {
      reasons.push('Punycode domain (potential homograph attack)');
    }

    // Check for data URI
    if (url.startsWith('data:')) {
      reasons.push('Data URI');
    }

    // Check for long subdomain
    const parts = hostname.split('.');
    if (parts.some(part => part.length > 30)) {
      reasons.push('Unusually long subdomain');
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons
    };

  } catch (e) {
    return {
      isSuspicious: true,
      reasons: ['Invalid URL']
    };
  }
}

// Export all utilities
export default {
  extractHostname,
  extractDomain,
  isFirstParty,
  matchesDomainPattern,
  isValidDomain,
  parseAdblockFilter,
  randomString,
  calculateSHA256,
  debounce,
  throttle,
  deepClone,
  formatBytes,
  formatNumber,
  getBrowserAPI,
  sleep,
  retryWithBackoff,
  isSuspiciousURL
};
