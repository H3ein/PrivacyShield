// PrivacyShield Max - Core Constants
// Shared configuration, default settings, mode definitions

export const VERSION = '2.0.0';

// Privacy Modes
export const PRIVACY_MODES = {
  STEALTH: {
    id: 'stealth',
    name: 'Stealth Mode',
    description: 'Maximum privacy and blocking',
    blockingLevel: 'maximum',
    fingerprintProtection: true,
    cnameUncloaking: true,
    webRTCBlocking: true,
    socialWidgets: 'remove',
    ampRedirect: true,
    cookiePolicy: 'delete_immediately',
    trackingParamStripping: true
  },

  BANKING: {
    id: 'banking',
    name: 'Banking Mode',
    description: 'Reduced blocking for financial sites',
    blockingLevel: 'reduced',
    fingerprintProtection: false, // Allow fraud detection
    cnameUncloaking: false,
    webRTCBlocking: false,
    socialWidgets: 'allow',
    ampRedirect: false,
    cookiePolicy: 'allow_session',
    trackingParamStripping: false
  },

  SOCIAL_MEDIA: {
    id: 'social',
    name: 'Social Media Mode',
    description: 'Block external trackers, allow platform features',
    blockingLevel: 'medium',
    fingerprintProtection: true,
    cnameUncloaking: true,
    webRTCBlocking: false, // Allow video calls
    socialWidgets: 'block_third_party',
    ampRedirect: true,
    cookiePolicy: 'delete_third_party',
    trackingParamStripping: true
  }
};

// Privacy Profiles
export const PRIVACY_PROFILES = {
  PARANOID: {
    id: 'paranoid',
    name: 'Paranoid (Maximum Privacy)',
    description: 'Block everything possible',
    filterLists: ['all'],
    smartFiltering: {
      enabled: true,
      sensitivity: 10,
      autoBlock: true
    },
    blockingLevel: 'maximum',
    breakageTolerance: 'none',
    defaultMode: 'STEALTH',
    whitelistTop100: false
  },

  BALANCED: {
    id: 'balanced',
    name: 'Balanced (Recommended)',
    description: 'Strong protection with compatibility',
    filterLists: ['easylist', 'easyprivacy', 'malware', 'nocoin'],
    smartFiltering: {
      enabled: true,
      sensitivity: 5,
      autoBlock: false // Require user confirmation
    },
    blockingLevel: 'high',
    breakageTolerance: 'auto-fix',
    defaultMode: 'STEALTH',
    whitelistTop100: true
  },

  MINIMAL: {
    id: 'minimal',
    name: 'Minimal (Basic Protection)',
    description: 'Only block obvious threats',
    filterLists: ['malware', 'nocoin'],
    smartFiltering: {
      enabled: true,
      sensitivity: 2,
      autoBlock: false
    },
    blockingLevel: 'low',
    breakageTolerance: 'permissive',
    defaultMode: 'BANKING',
    whitelistTop100: true
  }
};

// Default Settings (Privacy-First, Conservative Start)
export const DEFAULT_SETTINGS = {
  version: VERSION,
  profile: 'balanced',
  mode: 'stealth',

  // Core features
  enabled: true,
  autoUpdateFilters: true,
  updateFrequency: 'daily', // daily, weekly, manual

  // PRIVACY FIRST (all on by default)
  fingerprintingProtection: true,
  trackingProtection: true,
  cnameUncloaking: true,
  trackingParamStripping: true,
  webRTCBlocking: true,
  cookieAutoDelete: true,
  cookieProtection: true,

  // Security features
  malwareBlocking: true,
  phishingDetection: true,
  httpsEnforcement: true,
  downloadScanning: true,

  // LEARNING (all enabled by default)
  learning: {
    enabled: true,
    trustedSites: true,              // Auto-whitelist frequent sites
    newTechniques: true,              // Detect new tracking techniques
    falsePositiveReduction: true,     // Auto-fix broken sites
    threatPatterns: true,             // Learn malware/phishing patterns
    autoProgression: true             // Conservative → Moderate → Aggressive
  },

  // PROTECTION LEVEL (starts conservative)
  protectionLevel: 'conservative',  // Start gentle
  autoBlockThreshold: 0.85,         // Auto-block at 85%+ confidence

  // SECONDARY FEATURES (still on, but not prominent in UI)
  blockAds: true,                   // Privacy protection also blocks ads
  blockCookieBanners: true,         // UX improvement
  blockSocialWidgets: false,        // Optional

  // Smart filtering
  smartFiltering: {
    enabled: true,
    sensitivity: 5,
    confidenceThreshold: 40,        // Start at 40% (conservative)
    autoBlock: false,               // No auto-block in conservative mode
    dataRetention: 30               // days
  },

  // UI preferences
  showPrivacyScore: true,
  showBadgeCounter: true,
  showNotifications: true,          // Show learning notifications
  silentMode: false,                // Show learning events

  // Advanced
  debugMode: false,
  performanceMode: false,
  antiDetection: true               // Runs automatically
};

// Top 100 domains whitelist (banking, government, essential services)
export const TOP_100_WHITELIST = [
  // US Banks
  'chase.com', 'bankofamerica.com', 'wellsfargo.com', 'citi.com',
  'capitalone.com', 'usbank.com', 'pnc.com', 'tdbank.com',

  // International Banks
  'hsbc.com', 'barclays.co.uk', 'santander.com', 'bnpparibas.com',

  // Payment processors
  'paypal.com', 'stripe.com', 'square.com', 'venmo.com',

  // Government
  'irs.gov', 'usa.gov', 'uscis.gov', 'ssa.gov', 'dmv.org',

  // Healthcare
  'medicare.gov', 'healthcare.gov', 'cdc.gov', 'nih.gov',

  // Education
  'edu', // All .edu domains
  'coursera.org', 'edx.org', 'khanacademy.org',

  // Essential services
  'usps.com', 'fedex.com', 'ups.com', 'dhl.com'
];

// Known banking domains for auto-mode detection
export const BANKING_DOMAINS = [
  'chase.com', 'bankofamerica.com', 'wellsfargo.com', 'citi.com',
  'capitalone.com', 'usbank.com', 'pnc.com', 'tdbank.com',
  'americanexpress.com', 'discover.com', 'ally.com', 'schwab.com',
  'fidelity.com', 'vanguard.com', 'etrade.com', 'robinhood.com',
  'paypal.com', 'venmo.com', 'cashapp.com', 'zelle.com'
];

// Known social media domains for auto-mode detection
export const SOCIAL_MEDIA_DOMAINS = [
  'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
  'tiktok.com', 'snapchat.com', 'reddit.com', 'pinterest.com',
  'youtube.com', 'twitch.tv', 'discord.com', 'telegram.org',
  'whatsapp.com', 'messenger.com'
];

// Tracking parameters to strip
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
  'wickedid',          // Wicked Reports
  'twclid',            // Twitter
  'li_fat_id',         // LinkedIn
  'igshid',            // Instagram

  // Generic tracking
  'tracking_id', 'track_id', 'ref', 'referrer', 'source',
  'campaign_id', 'campaign', 'ad_id', 'click_id'
];

// Known tracker CNAME patterns
export const TRACKER_CNAME_PATTERNS = [
  /2o7\.net$/,            // Adobe Analytics
  /omtrdc\.net$/,         // Adobe
  /demdex\.net$/,         // Adobe Audience Manager
  /adsrvr\.org$/,         // The Trade Desk
  /doubleclick\.net$/,    // Google
  /googleadservices\.com$/, // Google Ads
  /scorecardresearch\.com$/, // Comscore
  /krxd\.net$/,           // Salesforce DMP
  /rlcdn\.com$/,          // LiveRamp
  /turn\.com$/            // Amobee (Turn)
];

// Performance targets
export const PERFORMANCE_TARGETS = {
  pageLoadImpact: 100,      // ms
  memoryUsage: 150 * 1024 * 1024, // 150MB
  cpuUsage: 5,              // %
  ruleMatching: 1,          // ms
  filterUpdate: 30000,      // 30 seconds
  cnameResolution: 50       // ms with caching
};

// DNR rule ID ranges
export const RULE_ID_RANGES = {
  BASE_ADS: { start: 1, end: 10000 },
  PRIVACY: { start: 10001, end: 20000 },
  MALWARE: { start: 20001, end: 30000 },
  NOCOIN: { start: 30001, end: 40000 },
  COOKIE_BANNERS: { start: 40001, end: 50000 },
  TRACKING_PARAMS: { start: 50001, end: 50100 },
  HTTPS_UPGRADE: { start: 50101, end: 50200 },
  CUSTOM_DYNAMIC: { start: 60001, end: 90000 }
};

// Filter list sources
export const FILTER_SOURCES = {
  easylist: {
    id: 'easylist',
    name: 'EasyList',
    url: 'https://easylist.to/easylist/easylist.txt',
    checksum: 'https://easylist.to/easylist/easylist.txt.md5',
    priority: 1,
    category: 'ads',
    estimatedRules: 70000
  },

  easyprivacy: {
    id: 'easyprivacy',
    name: 'EasyPrivacy',
    url: 'https://easylist.to/easylist/easyprivacy.txt',
    checksum: 'https://easylist.to/easylist/easyprivacy.txt.md5',
    priority: 1,
    category: 'privacy',
    estimatedRules: 20000
  },

  'ublock-filters': {
    id: 'ublock-filters',
    name: 'uBlock Origin Filters',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
    priority: 2,
    category: 'ads',
    estimatedRules: 30000
  },

  'ublock-privacy': {
    id: 'ublock-privacy',
    name: 'uBlock Origin Privacy',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
    priority: 2,
    category: 'privacy',
    estimatedRules: 15000
  },

  'ublock-badware': {
    id: 'ublock-badware',
    name: 'uBlock Origin Badware',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt',
    priority: 1,
    category: 'malware',
    estimatedRules: 5000
  }
};

// Message types for inter-script communication
export const MESSAGE_TYPES = {
  // Background <-> Content
  GET_SETTINGS: 'get_settings',
  UPDATE_SETTINGS: 'update_settings',
  BLOCK_ELEMENT: 'block_element',
  WHITELIST_DOMAIN: 'whitelist_domain',
  TEMPORARY_WHITELIST: 'temporary_whitelist',
  TRACK_VISIT: 'track_visit',

  // Background <-> Popup
  GET_STATS: 'get_stats',
  GET_PRIVACY_SCORE: 'get_privacy_score',
  TOGGLE_ENABLED: 'toggle_enabled',
  CHANGE_MODE: 'change_mode',
  KILL_SWITCH: 'kill_switch',

  // Filter updates
  UPDATE_FILTERS: 'update_filters',
  FILTER_UPDATE_STATUS: 'filter_update_status',

  // Smart filtering
  AI_DETECTION: 'ai_detection',
  USER_FEEDBACK: 'user_feedback',

  // Learning notifications
  TRUSTED_SITE_ADDED: 'trusted_site_added',
  NEW_TECHNIQUE_LEARNED: 'new_technique_learned',
  AUTO_FIXED_BREAKAGE: 'auto_fixed_breakage',
  PROTECTION_LEVEL_CHANGED: 'protection_level_changed',
  PROTECTION_LEVEL_NOTIFICATION: 'protection_level_notification',

  // Notifications
  SHOW_NOTIFICATION: 'show_notification',
  BREAKAGE_DETECTED: 'breakage_detected'
};

// Learning thresholds for auto-whitelisting and progression
export const LEARNING_THRESHOLDS = {
  // Trusted site auto-whitelisting
  trustedSite: {
    minVisits: 10,              // Visit 10+ times
    minAvgTime: 30000,          // Spend 30+ seconds on average (ms)
    minTotalTime: 600000,       // Total 10+ minutes (ms)
    withinDays: 30              // Within 30 days
  },

  // New technique detection
  newTechnique: {
    suspicionThreshold: 0.6,    // 60% suspicion to investigate
    confirmationCount: 5        // Need 5+ occurrences to confirm
  },

  // Protection level progression
  protectionLevels: {
    conservative: {
      days: 0,                  // Start here immediately
      threshold: 0.40,          // 40% confidence threshold
      autoBlock: false
    },
    moderate: {
      days: 7,                  // Progress after 7 days
      threshold: 0.60,          // 60% confidence threshold
      autoBlock: true,          // Enable auto-block at 85%+
      threatsNeeded: 100        // OR after 100 threats blocked
    },
    aggressive: {
      days: 30,                 // Progress after 30 days
      threshold: 0.75,          // 75% confidence threshold
      autoBlock: true,
      maxFalsePositiveRate: 0.05 // AND false positive rate < 5%
    }
  },

  // False positive learning rate
  falsePositive: {
    learningRate: 0.05,         // 5% adjustment per correction
    temporaryWhitelistDuration: 3600000 // 1 hour in ms
  }
};

// Export for ES modules
export default {
  VERSION,
  PRIVACY_MODES,
  PRIVACY_PROFILES,
  DEFAULT_SETTINGS,
  TOP_100_WHITELIST,
  BANKING_DOMAINS,
  SOCIAL_MEDIA_DOMAINS,
  TRACKING_PARAMS,
  TRACKER_CNAME_PATTERNS,
  PERFORMANCE_TARGETS,
  RULE_ID_RANGES,
  FILTER_SOURCES,
  MESSAGE_TYPES,
  LEARNING_THRESHOLDS
};
