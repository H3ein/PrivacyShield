// PrivacyShield - Core Utilities (Simplified)

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
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default {
  extractHostname,
  extractDomain,
  formatNumber
};
