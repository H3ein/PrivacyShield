// PrivacyShield - Content Script

import { MESSAGE_TYPES } from './src/core/constants.js';
import * as fingerprint from './src/privacy/fingerprint.js';

let settings = {};
let fingerprintAttempts = 0;

/**
 * Initialize content script
 */
async function initialize() {
  // Get settings
  const response = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.GET_SETTINGS
  });

  settings = response || {};

  // Apply fingerprint protection if enabled
  if (settings.fingerprintProtection) {
    applyFingerprintProtection();
  }

  console.log('PrivacyShield: Content script initialized');
}

/**
 * Apply fingerprint protection
 */
function applyFingerprintProtection() {
  try {
    fingerprint.initialize();

    // Track fingerprinting attempts (rough estimate)
    setTimeout(() => {
      fingerprintAttempts = estimateFingerprintAttempts();

      if (fingerprintAttempts > 0) {
        // Report to background
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.UPDATE_STATS,
          data: {
            stat: 'fingerprintsBlocked',
            amount: fingerprintAttempts
          }
        });
      }
    }, 2000);

  } catch (error) {
    console.error('Fingerprint protection failed:', error);
  }
}

/**
 * Estimate fingerprinting attempts (heuristic)
 * Checks if page uses common fingerprinting APIs
 */
function estimateFingerprintAttempts() {
  let attempts = 0;

  // Check for canvas fingerprinting
  const canvases = document.querySelectorAll('canvas');
  if (canvases.length > 0) {
    attempts++;
  }

  // Check for WebGL usage
  const webglCanvas = document.querySelector('canvas[webgl]');
  if (webglCanvas || document.querySelector('canvas[gl]')) {
    attempts++;
  }

  // Check for font detection scripts
  if (document.querySelector('script[src*="font"]') ||
      document.querySelector('script[src*="typekit"]')) {
    attempts++;
  }

  return attempts;
}

/**
 * Listen for messages from background
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_STATUS') {
    // Handle whitelist status
    const { isWhitelisted } = message.data;
    if (isWhitelisted) {
      console.log('PrivacyShield: Page is whitelisted');
    }
  }
  sendResponse({ success: true });
});

// Initialize
initialize();
