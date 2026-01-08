# PrivacyShield Extension Setup Guide

## Quick Start

### 1. Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `addons` folder containing PrivacyShield
5. Extension should appear in your toolbar

### 2. Verify Installation
- Click the PrivacyShield icon in your toolbar
- You should see the brutalist popup interface
- Check that it shows "PRIVACYSHIELD [ON]"

### 3. Test Functionality
Run the browser test:
1. Open any website
2. Press `F12` to open DevTools
3. Go to **Console** tab
4. Copy-paste the contents of `test.js` and press Enter
5. Look for "✅ Chrome extension API available" message

## Testing Commands

### Browser Console Test
```javascript
// Paste this in DevTools console after loading extension
console.log('🛡️ PrivacyShield Extension Test');
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('✅ Chrome extension API available');
  chrome.runtime.getSelf().then(self => {
    console.log(`📦 Extension: ${self.name} v${self.version}`);
  });
} else {
  console.log('❌ Chrome extension API not available');
}
```

### Node.js Validation
```bash
# Run from the addons directory
node validate-fixes.js
```

## Features to Test

1. **Popup Interface**
   - Click extension icon
   - Verify brutalist design (black/white/monospace)
   - Check stats display

2. **Settings Page**
   - Right-click extension → Options
   - Or click [SETTINGS] in popup
   - Test toggles for ads/trackers/fingerprinting

3. **Blocking Rules**
   - Visit a site with known trackers
   - Check popup for increased counts
   - Verify whitelist functionality

## Troubleshooting

### Extension Won't Load
- Ensure Developer mode is enabled
- Check that `manifest.json` is valid
- Look for errors in `chrome://extensions`

### Popup Not Working
- Check DevTools console for errors
- Verify `ui/popup.html` and `ui/popup.js` exist
- Ensure manifest points to correct popup path

### Blocking Not Working
- Check that rules files exist in `rules/` directory
- Verify permissions in `manifest.json`
- Check background service worker status

## Development Notes

- **No build process required** - pure extension
- **AI features disabled** by design (see FIXES_SUMMARY.md)
- **Brutalist UI** - minimal black/white design
- **Manifest V3** - modern Chrome extension standard
