# PrivacyShield Max - Testing Guide

## Quick Test Steps

### 1. Reload Extension
```
1. Open chrome://extensions
2. Find "PrivacyShield Max"
3. Click "Reload" button
4. Check for errors in service worker
```

### 2. Check Background Console
```
1. Click "service worker" link under extension
2. Look for these SUCCESS messages:
   ✅ "[Integration-BG] Starting integration layer initialization..."
   ✅ "[Integration-BG] Modules imported successfully"
   ✅ "PrivacyShield: Learning modules initialized successfully"
   ✅ "PrivacyShield Max - Background ready"

3. Should NOT see these ERROR messages:
   ❌ "import() is disallowed on ServiceWorkerGlobalScope"
   ❌ Any red error messages
```

### 3. Test on a Website
```
1. Visit any website (e.g., https://soft98.ir or your test site)
2. Open DevTools Console (F12)
3. Look for SUCCESS indicators:
   ✅ "[Integration] PrivacyShield Max fully initialized and operational"
   ✅ "✅ Blocked elements saved"
   ✅ Significantly LESS console spam than before

4. Should NOT see:
   ❌ "Extension disconnected, cleaning up..."
   ❌ "Blocked dynamic interstitial ad: privacyshield-picker..."
   ❌ Excessive "🚫 Skipping..." messages
```

### 4. Check Page Functionality
```
1. Website should display correctly
2. Menus, navigation should work
3. Main content visible
4. Only actual ads should be hidden
```

### 5. Test Element Picker
```
1. Click extension icon
2. Click "Block Element" button
3. Should see:
   ✅ Overlay appears
   ✅ Tooltip shows "Click element to block • ESC to cancel"
   ✅ Can hover over elements
   ✅ Can click to block
   ✅ ESC key cancels picker

4. Should NOT see:
   ❌ "Blocked dynamic interstitial ad" in console
   ❌ Picker UI disappearing
```

### 6. Check Popup Stats
```
1. Click extension icon
2. Popup should show:
   ✅ Protection level (Conservative/Moderate/Aggressive)
   ✅ Privacy score
   ✅ Trackers/Cookies/Fingerprints blocked
   ✅ Performance stats
```

## Expected Console Output (Healthy State)

### Background Service Worker
```
PrivacyShield Max - Background Script Starting...
[Integration-BG] Starting integration layer initialization...
[Integration-BG] Importing learning modules...
[Integration-BG] Modules imported successfully
PrivacyShield: Initializing learning modules...
PrivacyShield: Learning modules initialized successfully
PrivacyShield: Integration layer loaded
PrivacyShield Max - Background ready
```

### Content Script (Per Page)
```
[Integration] PrivacyShield Max Professional Edition loading...
[Integration] Integration loader ready
PrivacyShield Max - Content script initialized
[Integration] Initializing PrivacyShield systems...
[SmartFiltering] Professional Smart Filtering System initialized
[DOMBlocker] Professional DOM Blocker initialized
[Integration] PrivacyShield Max fully initialized and operational
```

## Common Issues & Solutions

### Issue: "import() is disallowed"
**Status:** Should be FIXED
**If still occurs:** Clear extension and reload

### Issue: "Extension disconnected"
**Status:** Should be FIXED
**If still occurs:** Check if you reverted the content.js changes

### Issue: Element picker not working
**Status:** Should be FIXED
**If still occurs:** Check console for "Blocked dynamic interstitial" messages

### Issue: Legitimate content blocked
**Status:** Should be FIXED
**What to check:**
- Are elements with classes like "cbd", "lbd", "tbd" being blocked?
- Check if whitelist patterns are loaded
- Look for "🚫 Skipping legitimate content element" messages

### Issue: Too many console messages
**Status:** Should be FIXED
**If still occurs:** We removed most debug logs, some info logs remain

## Performance Benchmarks

### Expected Metrics
- Extension load time: < 100ms
- Content script initialization: < 500ms
- Element blocking per page: < 1 second
- Memory usage: < 50MB

### How to Check
```javascript
// In background console:
chrome.storage.local.get(null, data => console.log(data));

// Expected to see:
// - protectionLevel: "conservative"
// - blocked: (number)
// - tracked: (number)
// - learningEnabled: true
```

## Browser Compatibility

### Tested On
- ✅ Chrome 120+ (Recommended)
- ✅ Edge 120+
- ⚠️ Firefox (Requires MV2 manifest)
- ⚠️ Brave (May need modifications)

## Debug Mode

### Enable Verbose Logging
To enable more detailed logging (for troubleshooting):

1. Open `content/dom-blocker.js`
2. Change line 58: `this.logger = console;` to include debug level
3. Reload extension

### Disable Learning Modules
If learning modules cause issues:

1. Open `chrome://extensions`
2. Click "Details" on PrivacyShield Max
3. Open "Inspect views: service worker"
4. Run: `chrome.storage.local.set({ learningEnabled: false })`

## Reporting Issues

### Information to Include
1. **Browser version:** chrome://version
2. **Extension version:** Check manifest.json
3. **Console output:** Copy from DevTools
4. **Steps to reproduce:** What you did
5. **Expected vs Actual:** What should happen vs what happened

### Where to Report
- GitHub Issues: (your repo URL)
- Telegram: @SMostafaMoosavi

---

**Last Updated:** 2026-01-02
**Extension Version:** 2.0.0
