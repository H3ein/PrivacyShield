// PrivacyShield - Statistics (Simple Counters)

let stats = {
  trackersBlocked: 0,
  adsBlocked: 0,
  fingerprintsBlocked: 0,
  paramsStripped: 0,
  // Enhanced ad blocking stats
  videoAdsBlocked: 0,
  interstitialsBlocked: 0,
  popupsBlocked: 0,
  pushNotificationsBlocked: 0
};

// Debounced save to reduce storage operations
let saveTimeout = null;
const SAVE_DELAY = 500;

/**
 * Initialize stats from storage
 */
export async function initialize() {
  try {
    const stored = await chrome.storage.local.get(['stats']);
    if (stored.stats) {
      stats = { ...stats, ...stored.stats };
    }
    console.log('PrivacyShield: Stats initialized', stats);
  } catch (error) {
    console.error('Stats initialization failed:', error);
  }
}

/**
 * Get current stats
 * @returns {Object} - Current statistics
 */
export function getStats() {
  return {
    ...stats,
    privacyScore: calculatePrivacyScore()
  };
}

/**
 * Increment stat counter
 * @param {string} stat - Stat name
 * @param {number} amount - Amount to increment
 */
export function incrementStat(stat, amount = 1) {
  if (Object.prototype.hasOwnProperty.call(stats, stat)) {
    stats[stat] += amount;
    debouncedSave();
  }
}

/**
 * Reset all stats
 */
export async function resetStats() {
  stats = {
    trackersBlocked: 0,
    adsBlocked: 0,
    fingerprintsBlocked: 0,
    paramsStripped: 0,
    videoAdsBlocked: 0,
    interstitialsBlocked: 0,
    popupsBlocked: 0,
    pushNotificationsBlocked: 0
  };
  await save();
  console.log('PrivacyShield: Stats reset');
}

/**
 * Reset individual stat
 * @param {string} stat - Stat name to reset
 */
export async function resetStat(stat) {
  if (Object.prototype.hasOwnProperty.call(stats, stat)) {
    stats[stat] = 0;
    await save();
    console.log('PrivacyShield: Stat reset:', stat);
  }
}

/**
 * Debounced save to reduce storage operations
 */
function debouncedSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    save();
  }, SAVE_DELAY);
}

/**
 * Save stats to storage
 */
async function save() {
  try {
    await chrome.storage.local.set({ stats });
  } catch (error) {
    console.error('Stats save failed:', error);
  }
}

/**
 * Calculate privacy score (0-100)
 * Reflects how well protected you are, not how many threats exist.
 * +40 for enabled features, +35 for blocking activity, +25 for category breadth.
 */
function calculatePrivacyScore() {
  const { trackersBlocked, adsBlocked, fingerprintsBlocked, paramsStripped } = stats;
  const totalBlocked = trackersBlocked + adsBlocked + fingerprintsBlocked + paramsStripped;

  // Feature enablement score (0-40): assume features are enabled if we have this module loaded
  // The real check happens in popup.js with settings context
  const featureScore = 40;

  // Blocking activity score (0-35): log scale with diminishing returns
  let activityScore = 0;
  if (totalBlocked > 0) {
    activityScore = Math.min(35, Math.round(Math.log10(totalBlocked + 1) * 12));
  }

  // Category breadth score (0-25): bonus for blocking across multiple threat types
  let breadthScore = 0;
  const activeCategories = [
    trackersBlocked > 0,
    adsBlocked > 0,
    fingerprintsBlocked > 0,
    paramsStripped > 0
  ].filter(Boolean).length;
  breadthScore = Math.round((activeCategories / 4) * 25);

  return Math.max(0, Math.min(100, featureScore + activityScore + breadthScore));
}

/**
 * Calculate privacy score with settings context (used by popup.js)
 */
export function calculatePrivacyScoreWithSettings(statsData, settings) {
  const { trackersBlocked = 0, adsBlocked = 0, fingerprintsBlocked = 0, paramsStripped = 0 } = statsData;
  const totalBlocked = trackersBlocked + adsBlocked + fingerprintsBlocked + paramsStripped;

  // Feature enablement score (0-40)
  let featureScore = 0;
  const features = [
    settings.blockAds !== false,
    settings.blockTrackers !== false,
    settings.fingerprintProtection !== false,
    settings.stripTrackingParams !== false,
    settings.blockThirdPartyCookies !== false
  ];
  const enabledCount = features.filter(Boolean).length;
  featureScore = Math.round((enabledCount / features.length) * 40);

  // Blocking activity score (0-35)
  let activityScore = 0;
  if (totalBlocked > 0) {
    activityScore = Math.min(35, Math.round(Math.log10(totalBlocked + 1) * 12));
  }

  // Category breadth score (0-25)
  const activeCategories = [
    trackersBlocked > 0,
    adsBlocked > 0,
    fingerprintsBlocked > 0,
    paramsStripped > 0
  ].filter(Boolean).length;
  const breadthScore = Math.round((activeCategories / 4) * 25);

  return Math.max(0, Math.min(100, featureScore + activityScore + breadthScore));
}

export default {
  initialize,
  getStats,
  incrementStat,
  resetStats,
  resetStat,
  calculatePrivacyScoreWithSettings
};
