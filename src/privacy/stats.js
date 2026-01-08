// PrivacyShield - Statistics (Simple Counters)

let stats = {
  trackersBlocked: 0,
  adsBlocked: 0,
  fingerprintsBlocked: 0
};

// Debounced save to reduce storage operations
let saveTimeout = null;
const SAVE_DELAY = 500; // Save at most twice per second for better reliability

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
 * @param {string} stat - Stat name ('trackersBlocked', 'adsBlocked', 'fingerprintsBlocked')
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
    fingerprintsBlocked: 0
  };
  await save();
  console.log('PrivacyShield: Stats reset');
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
 * Higher threats detected = lower score
 * @returns {number} - Privacy score
 */
function calculatePrivacyScore() {
  const { trackersBlocked, adsBlocked, fingerprintsBlocked } = stats;

  let score = 100;

  // Deduct for threats detected (presence = bad site)
  score -= Math.min(trackersBlocked * 2, 30);   // Max -30 for trackers
  score -= Math.min(adsBlocked * 1, 20);        // Max -20 for ads
  score -= Math.min(fingerprintsBlocked * 3, 50); // Max -50 for fingerprinting

  return Math.max(0, Math.min(100, Math.round(score)));
}

export default {
  initialize,
  getStats,
  incrementStat,
  resetStats
};
