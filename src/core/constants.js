// PrivacyShield - Core Constants (Brutalist Minimal)

export const VERSION = '3.0.0';

// Simplified Settings (Core Privacy Features Only)
export const DEFAULT_SETTINGS = {
  version: VERSION,
  enabled: true,
  blockAds: true,
  blockTrackers: true,
  fingerprintProtection: true,
  blockThirdPartyCookies: true,
  stripTrackingParams: true,
  blockSocialWidgets: false,  // Optional, can break embedded content
  whitelistedDomains: []
};

// Tracking parameters to strip from URLs
export const TRACKING_PARAMS = [
  // Google
  'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',

  // Facebook
  'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',

  // Microsoft
  'msclkid', 'ms_clkid',

  // Other platforms
  'mc_eid', 'mc_cid',  // MailChimp
  '_hsenc', '_hsmi',   // HubSpot
  'mkt_tok',           // Marketo
  'yclid',             // Yandex
  'twclid',            // Twitter
  'li_fat_id',         // LinkedIn
  'igshid'             // Instagram
];

// Social media widget domains
export const SOCIAL_WIDGET_DOMAINS = [
  'facebook.com/plugins',
  'connect.facebook.net',
  'platform.twitter.com',
  'platform.linkedin.com',
  'instagram.com/embed',
  'pinterest.com/js',
  'reddit.com/static/button'
];

// DNR rule ID ranges (simplified - 3 rule sets only)
export const RULE_ID_RANGES = {
  ADS: { start: 1, end: 30000 },
  TRACKERS: { start: 30001, end: 60000 },
  MALWARE: { start: 60001, end: 90000 }
};

// Message types for communication
export const MESSAGE_TYPES = {
  // Settings
  GET_SETTINGS: 'get_settings',
  UPDATE_SETTINGS: 'update_settings',

  // Stats
  GET_STATS: 'get_stats',
  RESET_STATS: 'reset_stats',
  UPDATE_STATS: 'update_stats',

  // Controls
  TOGGLE_ENABLED: 'toggle_enabled',
  WHITELIST_DOMAIN: 'whitelist_domain',
  REMOVE_WHITELIST: 'remove_whitelist'
};

export default {
  VERSION,
  DEFAULT_SETTINGS,
  TRACKING_PARAMS,
  SOCIAL_WIDGET_DOMAINS,
  RULE_ID_RANGES,
  MESSAGE_TYPES
};
