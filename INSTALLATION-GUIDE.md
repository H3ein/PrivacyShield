# PrivacyShield Max - Installation Guide

## 🚀 Quick Installation

### Step 1: Install the Extension
1. Open Firefox
2. Go to `about:debugging` (type in address bar)
3. Click "This Firefox" on the left
4. Click "Load Temporary Add-on"
5. Navigate to your addon folder and select `manifest.json`
6. The extension should now appear in your toolbar

### Step 2: Verify Installation

#### Method 1: Extension Icon Test
- ✅ **Icon appears** in Firefox toolbar (blue shield with lock)
- ✅ **Popup opens** when clicking the icon
- ✅ **Badge shows** blocked request count

#### Method 2: Internal Test Page
1. Open a new tab and go to: `moz-extension://[EXTENSION-ID]/test.html`
   (Find the extension ID in `about:debugging` page)
2. This will open the internal test page with full extension API access

#### Method 3: Browser Console Test
```javascript
// Open browser console (F12) and run:
console.log('Testing addon...');
browser.runtime.getManifest().then(m => console.log('Manifest:', m));
browser.runtime.sendMessage({action: 'ping'}).then(r => console.log('Background:', r));
```

## ✅ Expected Results

### If Working Correctly:
- **Icon appears** in Firefox toolbar
- **Popup opens** when clicking icon
- **Console shows**: "Extension communication working"
- **Badge shows** blocked request count
- **No errors** in browser console
- **Ads blocked** on websites (console shows "Resource is blocked")

## 🔧 Troubleshooting

### Common Issues & Solutions:

#### **Issue 1: No Icon in Toolbar**
**Symptoms**: No shield icon visible
**Solutions**:
1. Restart Firefox completely
2. Check `about:addons` for errors
3. Customize toolbar: Right-click toolbar → Customize → Find "PrivacyShield Max"
4. Try `about:debugging` → Remove → Re-install

#### **Issue 2: Popup Doesn't Open**
**Symptoms**: Clicking icon does nothing
**Solutions**:
1. Check browser console for errors (Ctrl+Shift+J)
2. Verify `popup.html` and `popup.js` exist
3. Check `manifest.json` action configuration
4. Re-install addon

#### **Issue 3: Console Errors**
**Common Errors**:
- `Unable to load script: moz-extension://...` - **NORMAL** (means addon is blocking scripts)
- `Permission denied` - Check permissions in manifest
- `File not found` - Missing files

**Solutions**:
1. Check all required files exist:
   ```bash
   ls -la /home/nilunk/Desktop/addons/
   # Should see: manifest.json, background.js, content.js, popup.html, etc.
   ```
2. Verify file permissions
3. Check Firefox version (must be 68.0+)

## 📱 File Verification Checklist

### Required Files:
- [ ] `manifest.json` - Addon configuration
- [ ] `background.js` - Background script
- [ ] `content.js` - Content script
- [ ] `popup.html` - Popup interface
- [ ] `popup.css` - Popup styles
- [ ] `popup.js` - Popup functionality
- [ ] `styles.css` - Content styles
- [ ] `icons/icon16.png` - 16x16 icon
- [ ] `icons/icon32.png` - 32x32 icon
- [ ] `icons/icon48.png` - 48x48 icon
- [ ] `icons/icon128.png` - 128x128 icon

### Optional Files:
- [ ] `options.html` - Settings page
- [ ] `options.css` - Settings styles
- [ ] `options.js` - Settings functionality
- [ ] `smart-filtering.js` - Smart filtering system
- [ ] `README.md` - Documentation

## 🚀 Production Deployment

### When Ready for Store Submission:
1. **Test thoroughly** on multiple websites
2. **Create screenshots** of addon in action
3. **Package for submission**:
   ```bash
   zip -r privacyshield-max.zip . -x "*.git*" -x "test-*" -x "INSTALLATION-TEST.md"
   ```
4. **Submit to**: https://addons.mozilla.org/developers
5. **Wait for review** (3-10 days)

## 📞 Support

### What to Include in Bug Report:
- Firefox version
- Operating system
- Exact error messages
- Steps to reproduce
- Console output

---

**PrivacyShield Max** - Maximum protection for maximum privacy. 🛡️✨
