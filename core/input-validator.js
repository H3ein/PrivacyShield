// PrivacyShield Max - Input Validator
// Security: Validate and sanitize all user inputs

/**
 * Validate domain format
 * @param {string} domain - Domain to validate
 * @throws {Error} - If domain is invalid
 * @returns {boolean} - True if valid
 */
export function validateDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Domain must be a non-empty string');
  }

  // Trim whitespace
  domain = domain.trim();

  if (domain.length === 0) {
    throw new Error('Domain cannot be empty');
  }

  if (domain.length > 253) {
    throw new Error('Domain exceeds maximum length (253 characters)');
  }

  // Basic domain regex (allows subdomains, hyphens, numbers)
  const domainPattern = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;

  if (!domainPattern.test(domain)) {
    throw new Error('Invalid domain format');
  }

  // Check for suspicious patterns
  if (domain.includes('..')) {
    throw new Error('Domain contains consecutive dots');
  }

  if (domain.includes('//')) {
    throw new Error('Domain contains consecutive slashes');
  }

  if (domain.startsWith('.') || domain.endsWith('.')) {
    throw new Error('Domain cannot start or end with a dot');
  }

  if (domain.startsWith('-') || domain.endsWith('-')) {
    throw new Error('Domain cannot start or end with a hyphen');
  }

  return true;
}

/**
 * Validate filter rule (Adblock Plus syntax)
 * @param {string} rule - Filter rule to validate
 * @throws {Error} - If rule is invalid or contains XSS
 * @returns {boolean} - True if valid
 */
export function validateFilterRule(rule) {
  if (!rule || typeof rule !== 'string') {
    throw new Error('Filter rule must be a non-empty string');
  }

  // Trim whitespace
  rule = rule.trim();

  if (rule.length === 0) {
    throw new Error('Filter rule cannot be empty');
  }

  if (rule.length > 1000) {
    throw new Error('Filter rule exceeds maximum length (1000 characters)');
  }

  // Check for XSS attempts
  const xssPatterns = [
    /<script/i,
    /<\/script>/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /onclick\s*=/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /data:text\/html/i,
    /vbscript:/i
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(rule)) {
      throw new Error('Filter rule contains potentially malicious content (XSS detected)');
    }
  }

  // Check for valid Adblock Plus prefixes
  const validPrefixes = ['||', '@@', '!', '#', '/'];
  const startsValid = validPrefixes.some(prefix => rule.startsWith(prefix)) ||
                     /^[a-z0-9*]/i.test(rule);

  if (!startsValid) {
    throw new Error('Filter rule has invalid format');
  }

  // Validate domain-based rules
  if (rule.startsWith('||') && rule.includes('^')) {
    const domain = rule.slice(2, rule.indexOf('^'));
    try {
      validateDomain(domain);
    } catch (error) {
      throw new Error(`Invalid domain in filter rule: ${error.message}`);
    }
  }

  return true;
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @throws {Error} - If URL is invalid
 * @returns {boolean} - True if valid
 */
export function validateURL(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  url = url.trim();

  if (url.length === 0) {
    throw new Error('URL cannot be empty');
  }

  if (url.length > 2048) {
    throw new Error('URL exceeds maximum length (2048 characters)');
  }

  try {
    const urlObj = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('URL must use http or https protocol');
    }

    return true;

  } catch (error) {
    throw new Error(`Invalid URL format: ${error.message}`);
  }
}

/**
 * Validate import data structure
 * @param {Object} data - Import data to validate
 * @throws {Error} - If data is invalid
 * @returns {boolean} - True if valid
 */
export function validateImportData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Import data must be an object');
  }

  // Validate whitelist if present
  if (data.whitelist !== undefined) {
    if (!Array.isArray(data.whitelist)) {
      throw new Error('Whitelist must be an array');
    }

    data.whitelist.forEach((domain, index) => {
      try {
        validateDomain(domain);
      } catch (error) {
        throw new Error(`Invalid domain at whitelist[${index}]: ${error.message}`);
      }
    });
  }

  // Validate custom filters if present
  if (data.customFilters !== undefined) {
    if (!Array.isArray(data.customFilters)) {
      throw new Error('Custom filters must be an array');
    }

    if (data.customFilters.length > 10000) {
      throw new Error('Too many custom filters (maximum 10,000)');
    }

    data.customFilters.forEach((rule, index) => {
      try {
        validateFilterRule(rule);
      } catch (error) {
        throw new Error(`Invalid filter at customFilters[${index}]: ${error.message}`);
      }
    });
  }

  // Validate blocked elements if present
  if (data.blockedElements !== undefined) {
    if (!Array.isArray(data.blockedElements)) {
      throw new Error('Blocked elements must be an array');
    }

    data.blockedElements.forEach((element, index) => {
      if (!element.selector || typeof element.selector !== 'string') {
        throw new Error(`Invalid selector at blockedElements[${index}]`);
      }

      if (!element.domain || typeof element.domain !== 'string') {
        throw new Error(`Invalid domain at blockedElements[${index}]`);
      }
    });
  }

  // Validate settings if present
  if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
    throw new Error('Setting "enabled" must be a boolean');
  }

  if (data.smartFiltering !== undefined && typeof data.smartFiltering !== 'object') {
    throw new Error('Setting "smartFiltering" must be an object');
  }

  return true;
}

/**
 * Sanitize string (remove potential XSS)
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeString(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize CSS selector
 * @param {string} selector - CSS selector to sanitize
 * @returns {string} - Sanitized selector
 */
export function sanitizeSelector(selector) {
  if (!selector || typeof selector !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters
  return selector.replace(/[<>'"]/g, '');
}

/**
 * Validate confidence score
 * @param {number} confidence - Confidence score (0-1)
 * @throws {Error} - If invalid
 * @returns {boolean} - True if valid
 */
export function validateConfidence(confidence) {
  if (typeof confidence !== 'number') {
    throw new Error('Confidence must be a number');
  }

  if (isNaN(confidence)) {
    throw new Error('Confidence cannot be NaN');
  }

  if (confidence < 0 || confidence > 1) {
    throw new Error('Confidence must be between 0 and 1');
  }

  return true;
}

/**
 * Validate sensitivity level
 * @param {number} sensitivity - Sensitivity level (0-10)
 * @throws {Error} - If invalid
 * @returns {boolean} - True if valid
 */
export function validateSensitivity(sensitivity) {
  if (typeof sensitivity !== 'number') {
    throw new Error('Sensitivity must be a number');
  }

  if (isNaN(sensitivity)) {
    throw new Error('Sensitivity cannot be NaN');
  }

  if (!Number.isInteger(sensitivity)) {
    throw new Error('Sensitivity must be an integer');
  }

  if (sensitivity < 0 || sensitivity > 10) {
    throw new Error('Sensitivity must be between 0 and 10');
  }

  return true;
}

/**
 * Validate privacy mode
 * @param {string} mode - Privacy mode
 * @throws {Error} - If invalid
 * @returns {boolean} - True if valid
 */
export function validatePrivacyMode(mode) {
  const validModes = ['stealth', 'banking', 'social'];

  if (!validModes.includes(mode)) {
    throw new Error(`Invalid privacy mode. Must be one of: ${validModes.join(', ')}`);
  }

  return true;
}

/**
 * Validate privacy profile
 * @param {string} profile - Privacy profile
 * @throws {Error} - If invalid
 * @returns {boolean} - True if valid
 */
export function validatePrivacyProfile(profile) {
  const validProfiles = ['paranoid', 'balanced', 'minimal'];

  if (!validProfiles.includes(profile)) {
    throw new Error(`Invalid privacy profile. Must be one of: ${validProfiles.join(', ')}`);
  }

  return true;
}

// Export all validators
export default {
  validateDomain,
  validateFilterRule,
  validateURL,
  validateImportData,
  sanitizeString,
  sanitizeSelector,
  validateConfidence,
  validateSensitivity,
  validatePrivacyMode,
  validatePrivacyProfile
};
