// Test script to manually trigger learning stats
// Run this in the browser console to test if stats are working

console.log('Testing learning stats...');

// Test 1: Check if modules are initialized
chrome.runtime.sendMessage({ type: 'GET_LEARNING_STATS' }, (response) => {
  console.log('GET_LEARNING_STATS response:', response);
});

// Test 2: Manually trigger pattern analysis on a known tracker URL
const testUrls = [
  'https://doubleclick.net/ads/tracking?id=123',
  'https://google-analytics.com/collect?v=1',
  'https://facebook.com/tr?id=456',
  'https://adservice.google.com/adsid/integrator.js',
  'https://googletagmanager.com/gtm.js?id=GTM-ABC'
];

console.log('Simulating blocked requests for:', testUrls);

// Simulate blocked requests
testUrls.forEach(url => {
  if (globalThis.privacyShieldIntegration && globalThis.privacyShieldIntegration.trackBlockedRequest) {
    globalThis.privacyShieldIntegration.trackBlockedRequest({
      url: url,
      type: 'script',
      initiator: 'https://example.com',
      size: null
    });
    console.log('Tracked:', url);
  }
});

// Test 3: Check stats again after 1 second
setTimeout(() => {
  chrome.runtime.sendMessage({ type: 'GET_LEARNING_STATS' }, (response) => {
    console.log('After tracking - GET_LEARNING_STATS response:', response);

    if (response) {
      console.log('Trusted Sites:', response.trustedSitesCount);
      console.log('New Techniques:', response.newTechniquesDetected);
      console.log('Auto-Fixed:', response.autoFixedSites);
      console.log('Threats Learned:', response.threatPatternsLearned);
    }
  });
}, 1000);

console.log('Test complete. Check results above.');
