// PrivacyShield - Tracker Blocker (DNR Management)

/**
 * Initialize DNR rulesets
 */
export async function initialize() {
  try {
    const rulesets = await chrome.declarativeNetRequest.getEnabledRulesets();
    console.log('PrivacyShield: DNR initialized with', rulesets.length, 'rulesets');
  } catch (error) {
    console.error('DNR initialization failed:', error);
  }
}

/**
 * Enable ruleset
 * @param {string} rulesetId - Ruleset ID ('ads', 'trackers', or 'malware')
 */
export async function enableRuleset(rulesetId) {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: [rulesetId]
    });
    console.log('PrivacyShield: Ruleset enabled -', rulesetId);
  } catch (error) {
    console.error('Failed to enable ruleset:', error);
  }
}

/**
 * Disable ruleset
 * @param {string} rulesetId - Ruleset ID ('ads', 'trackers', or 'malware')
 */
export async function disableRuleset(rulesetId) {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: [rulesetId]
    });
    console.log('PrivacyShield: Ruleset disabled -', rulesetId);
  } catch (error) {
    console.error('Failed to disable ruleset:', error);
  }
}

/**
 * Get enabled rulesets
 * @returns {Promise<string[]>} - Array of enabled ruleset IDs
 */
export async function getEnabledRulesets() {
  try {
    return await chrome.declarativeNetRequest.getEnabledRulesets();
  } catch (error) {
    console.error('Failed to get enabled rulesets:', error);
    return [];
  }
}

export default {
  initialize,
  enableRuleset,
  disableRuleset,
  getEnabledRulesets
};
