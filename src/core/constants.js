// PrivacyShield - Core Constants
// All tracker/ad lists use full domain strings for matching.
// Do NOT add bare substrings like 'pixel', 'tracking', 'analytics'.

export const VERSION = '3.1.0';

// Essential domains that must never be blocked (domain-only, no paths)
export const ESSENTIAL_DOMAINS = [
  'youtube.com',
  'googlevideo.com',
  'ytimg.com'
];

// ---------------------------------------------------------------------------
// Tracker domains - real analytics, fingerprinting, and tracking services.
// Each entry is a full domain (or subdomain). Matching should be done via
// hostname comparison, NOT url.includes().
// ---------------------------------------------------------------------------
export const CONSERVATIVE_TRACKER_PATTERNS = [
  // --- Google tracking ---
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',
  'googleadservices.com',
  'googlesyndication.com',
  'googleads.g.doubleclick.net',
  'doubleclick.net',
  'googletraveladservices.com',
  'pagead2.googlesyndication.com',
  'imasdk.googleapis.com',
  'dai.google.com',

  // --- Facebook / Meta ---
  'pixel.facebook.com',
  'connect.facebook.net',
  'atdmt.com',
  'analytics.facebook.com',

  // --- Twitter / X ---
  'analytics.twitter.com',
  'ads-api.twitter.com',
  'static.ads-twitter.com',
  't.co',

  // --- Microsoft ---
  'clarity.ms',
  'bat.bing.com',
  'c.bing.com',

  // --- Analytics platforms ---
  'mixpanel.com',
  'cdn.mxpnl.com',
  'api.mixpanel.com',
  'hotjar.com',
  'static.hotjar.com',
  'script.hotjar.com',
  'fullstory.com',
  'rs.fullstory.com',
  'mouseflow.com',
  'inspectlet.com',
  'clicktale.net',
  'chartbeat.com',
  'static.chartbeat.com',
  'quantcast.com',
  'pixel.quantserve.com',
  'scorecardresearch.com',
  'sb.scorecardresearch.com',
  'comscore.com',
  'nr-data.net',
  'bam.nr-data.net',
  'js-agent.newrelic.com',
  'amplitude.com',
  'api.amplitude.com',
  'cdn.amplitude.com',
  'heapanalytics.com',
  'cdn.heapanalytics.com',
  'segment.io',
  'cdn.segment.io',
  'api.segment.io',
  'segment.com',
  'keen.io',
  'api.keen.io',
  'customer.io',
  'track.customer.io',
  'logrocket.com',
  'r.lr-ingest.io',
  'plausible.io',
  'matomo.org',

  // --- Fingerprinting ---
  'fingerprintjs.com',
  'fpjs.io',
  'api.fpjs.io',

  // --- Marketing automation ---
  'pardot.com',
  'pi.pardot.com',
  'marketo.com',
  'munchkin.marketo.net',
  'eloqua.com',
  'tracking.eloqua.com',
  'bronto.com',
  'convertkit.com',
  'activecampaign.com',

  // --- Data management / brokers ---
  'liveramp.com',
  'adsymptotic.com',
  'liveintent.com',
  'neustar.biz',
  'acxiom.com',
  'bluekai.com',
  'addrl.com',
  'bkrtx.com',
  'lotame.com',
  'krux.net',
  'krxd.net',
  'mparticle.com',
  'tealium.com',
  'tags.tiqcdn.com',
  'collect.tealiumiq.com',

  // --- Tag management / CDP ---
  'qubit.com',
  'ensighten.com',
  'tiqcdn.com',

  // --- Session replay ---
  'smartlook.com',
  'rec.smartlook.com',
  'luckyorange.com',
  'decibelinsight.net',
  'crazyegg.com',
  'script.crazyegg.com',

  // --- Push notification tracking ---
  'onesignal.com',
  'cdn.onesignal.com',
  'pushengage.com',
  'pushwoosh.com',

  // --- Social sharing widgets ---
  'addthis.com',
  's7.addthis.com',
  'sharethis.com',
  'w.sharethis.com',
  'addtoany.com',
  'shareaholic.com',
  'po.st',
  'sumome.com',

  // --- Mobile attribution ---
  'appsflyer.com',
  'app.appsflyer.com',
  'branch.io',
  'api.branch.io',
  'adjust.com',
  'app.adjust.com',
  'kochava.com',

  // --- Retargeting ---
  'adroll.com',
  'd.adroll.com',
  'criteo.com',
  'dis.criteo.com',
  'static.criteo.net',

  // --- Email tracking ---
  'mandrillapp.com',
  'sendgrid.net',
  'open.sendgrid.net',
  'mailchimp.com',
  'list-manage.com',
  'campaignmonitor.com',
  'getresponse.com',
  'constantcontact.com',
  'postmarkapp.com',
  'mailgun.com',

  // --- Consent / cookie tracking (ironically track users) ---
  'cookiebot.com',
  'consentcdn.cookiebot.com',
  'quantcast.mgr.consensu.org',
  'consentmanager.net',
  'didomi.io',
  'trustarc.com',
  'evidon.com',

  // --- Affiliate tracking ---
  'commission-junction.com',
  'emjcd.com',
  'jdoqocy.com',
  'dpbolvw.net',
  'kqzyfj.com',
  'anrdoezrs.net',
  'tkqlhce.com',
  'awin1.com',
  'shareasale.com',
  'rakutenmarketing.com',
  'impact.com',
  'goto.target.com',
  'partnerize.com',
  'tapfiliate.com',
  'refersion.com',
  'postaffiliatepro.com',

  // --- Video ad tracking ---
  'g.jwpsrv.com',
  'ssl.p.jwpcdn.com',
  'mssl.fwmrm.net',
  'cd.connatix.com',
  'capi.connatix.com',
  'vid.connatix.com',
  'metrics.brightcove.com',
  's.innovid.com',
  'tremorhub.com',
  'ads.tremorhub.com',

  // --- TikTok / Snapchat / LinkedIn / Pinterest tracking ---
  'analytics.tiktok.com',
  'ads.tiktok.com',
  'tr.snapchat.com',
  'snap.licdn.com',
  'px.ads.linkedin.com',
  'ct.pinterest.com',

  // --- Other known trackers ---
  'omtrdc.net',
  'demdex.net',
  'everesttech.net',
  'owneriq.net',
  'rlcdn.com',
  'agkn.com',
  'adsrvr.org',
  'ipredictive.com',
  'eyeota.net',
  'exelator.com',
  'turn.com',
  'bidswitch.net',
  'mathtag.com',
  'simpli.fi',
  'adentifi.com',
  'contextweb.com',
  'yieldmo.com',
  'spotxchange.com',
  'spotx.tv'
];

// ---------------------------------------------------------------------------
// Ad-serving domains - real ad networks and exchanges.
// ---------------------------------------------------------------------------
export const CONSERVATIVE_AD_PATTERNS = [
  // --- Google ad network ---
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'googleads.g.doubleclick.net',
  'pagead2.googlesyndication.com',
  'tpc.googlesyndication.com',
  'imasdk.googleapis.com',

  // --- Major ad exchanges / SSPs ---
  'pubmatic.com',
  'ads.pubmatic.com',
  'rubiconproject.com',
  'fastlane.rubiconproject.com',
  'openx.net',
  'servedbyopenx.com',
  'adnxs.com',
  'ib.adnxs.com',
  'criteo.com',
  'bidder.criteo.com',
  'static.criteo.net',
  'advertising.com',
  'adform.net',
  'track.adform.net',
  'serving-sys.com',
  'bs.serving-sys.com',
  'indexww.com',
  'casalemedia.com',
  'bidswitch.net',
  'sharethrough.com',
  'sovrn.com',
  'lijit.com',
  'sonobi.com',
  'triplelift.com',
  '33across.com',
  'media.net',
  'contextweb.com',
  'yieldmo.com',
  'spotxchange.com',
  'spotx.tv',
  'smartadserver.com',
  'smaato.net',
  'rhythmone.com',
  'undertone.com',
  'gumgum.com',
  'kargo.com',
  'nativo.com',

  // --- Content recommendation / native ads ---
  'outbrain.com',
  'widgets.outbrain.com',
  'taboola.com',
  'cdn.taboola.com',
  'taboolasyndication.com',
  'revcontent.com',
  'mgid.com',
  'content.ad',
  'contentad.net',
  'adblade.com',

  // --- Ad verification / viewability ---
  'adsafeprotected.com',
  'static.adsafeprotected.com',
  'moatads.com',
  'z.moatads.com',
  'doubleverify.com',
  'cdn.doubleverify.com',

  // --- Mobile ad networks ---
  'admob.com',
  'inmobi.com',
  'unity3d.com',
  'unityads.unity3d.com',
  'applovin.com',
  'vungle.com',
  'ironsrc.com',
  'is.com',
  'chartboost.com',
  'adcolony.com',
  'tapjoy.com',
  'mopub.com',

  // --- Video ad platforms ---
  'ads.tremorhub.com',
  'vid.springserve.com',
  'ads.stickyadstv.com',
  'teads.tv',
  'innovid.com',
  's.innovid.com',

  // --- Social media ad platforms ---
  'an.facebook.com',
  'ads-api.twitter.com',
  'ads.linkedin.com',
  'ads.pinterest.com',
  'adsapi.snapchat.com',

  // --- Programmatic / DSPs ---
  'adsrvr.org',
  'thetradedesk.com',
  'mathtag.com',
  'mediamathplatform.com',
  'turn.com',
  'simpli.fi',
  'adtheorent.com',
  'zeta.com',

  // --- Header bidding ---
  'prebid.org',
  'amazon-adsystem.com',
  'c.amazon-adsystem.com',

  // --- Pop-under / aggressive ad networks ---
  'propellerads.com',
  'popcash.net',
  'popads.net',
  'hilltopads.net',
  'adcash.com',
  'adsterra.com',
  'exoclick.com',
  'trafficjunky.com',
  'juicyads.com',
  'clickadu.com',
  'evadav.com',

  // --- Miscellaneous ad domains ---
  'adroll.com',
  'd.adroll.com',
  'adzerk.net',
  'buysellads.com',
  'carbonads.com',
  'ethicalads.io',
  'adswizz.com',
  'admedia.com',
  'nativendo.com',
  'replacemedia.com',
  'nativly.com'
];

// Additional tracking patterns for extended blocking
export const ADDITIONAL_TRACKING_PATTERNS = [
  // Email open-tracking pixels
  'mandrillapp.com',
  'sendgrid.net',
  'open.sendgrid.net',
  'mailchimp.com',
  'list-manage.com',
  'campaignmonitor.com',
  'getresponse.com',

  // Social media tracking endpoints
  'pixel.facebook.com',
  'connect.facebook.net',
  'analytics.twitter.com',
  'analytics.tiktok.com',
  'tr.snapchat.com',
  'px.ads.linkedin.com',

  // Consent management tracking
  'quantcast.mgr.consensu.org',
  'consentmanager.net',
  'cookiebot.com',
  'consentcdn.cookiebot.com',
  'didomi.io',
  'trustarc.com',

  // Additional known trackers
  'onetrust.com',
  'cdn.cookielaw.org',
  'geolocation.onetrust.com'
];

// Default extension settings
export const DEFAULT_SETTINGS = {
  version: VERSION,
  enabled: true,
  blockAds: true,
  blockTrackers: true,
  fingerprintProtection: true,
  blockThirdPartyCookies: true,
  stripTrackingParams: true,
  stripReferrer: true,
  stripThirdPartyCookies: true,
  blockSocialWidgets: false,
  learningEnabled: true,
  learningThreshold: 3,
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

// DNR rule ID ranges
export const RULE_ID_RANGES = {
  ADS: { start: 1, end: 30000 },
  TRACKERS: { start: 30001, end: 60000 },
  MALWARE: { start: 60001, end: 90000 }
};

// Message types for communication
export const MESSAGE_TYPES = {
  // Settings
  GET_SETTINGS: 'getSettings',
  UPDATE_SETTINGS: 'updateSettings',
  TOGGLE_EXTENSION: 'toggleExtension',

  // Whitelist
  WHITELIST_DOMAIN: 'whitelistDomain',
  ADD_TO_WHITELIST: 'addToWhitelist',
  REMOVE_FROM_WHITELIST: 'removeFromWhitelist',

  // Stats
  GET_STATS: 'getStats',
  UPDATE_STATS: 'updateStats',
  RESET_STATS: 'resetStats',

  // Learning Algorithm
  GET_LEARNING_STATE: 'getLearningState',
  RESET_LEARNING_STATE: 'resetLearningState',
  TOGGLE_LEARNING: 'toggleLearning',
  GET_LEARNING_DATA: 'getLearningData',
  RESET_LEARNING: 'resetLearning',

  // Management
  RESET_ALL: 'resetAll',

  // Fingerprint protection
  FINGERPRINT_ATTEMPT: 'fingerprintAttempt'
};

export default {
  VERSION,
  DEFAULT_SETTINGS,
  TRACKING_PARAMS,
  SOCIAL_WIDGET_DOMAINS,
  RULE_ID_RANGES,
  MESSAGE_TYPES
};
