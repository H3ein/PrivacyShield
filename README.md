# PrivacyShield

Brutalist minimal privacy protection browser extension for Chrome.

## Features

### Core Privacy Protection
- **Ad Blocking** - Block advertisements using DeclarativeNetRequest rules
- **Tracker Blocking** - Prevent analytics and tracking scripts
- **Fingerprint Protection** - Protect against 6 fingerprinting vectors:
  - Canvas fingerprinting
  - WebGL fingerprinting
  - AudioContext fingerprinting
  - Font fingerprinting
  - WebRTC IP leak protection
  - Hardware fingerprinting

### Simple & Fast
- **Brutalist UI** - Stark, minimal, functional interface
- **Chrome MV3** - Modern Manifest V3 architecture
- **Lightweight** - ~100KB total size
- **No Tracking** - All data stored locally

## Installation

### Chrome / Edge / Brave
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `addons` folder

## Usage

### Popup
- View real-time blocking stats (trackers, ads, fingerprints)
- See privacy score (0-100)
- Toggle protection on/off
- Whitelist current site
- Access settings

### Settings
- Enable/disable ad blocking, tracker blocking, fingerprint protection
- Manage whitelisted sites
- View all-time statistics
- Reset stats

## Architecture

```
/home/nilunk/Desktop/addons/
├── background.js         # Service worker (MV3)
├── content.js            # Content script
├── manifest.json         # Extension manifest
├── src/
│   ├── core/            # Constants, storage, utils
│   ├── privacy/         # Fingerprint, tracker-blocker, stats
│   └── ui/              # Popup and settings logic
├── ui/
│   ├── popup.html       # Brutalist popup interface
│   ├── popup.css
│   ├── settings.html    # Brutalist settings page
│   └── settings.css
├── rules/
│   ├── ads.json         # Ad blocking rules
│   ├── trackers.json    # Tracker blocking rules
│   └── malware.json     # Malware protection rules
└── icons/               # Extension icons
```

## Technical Details

- **Manifest Version**: 3
- **Browser**: Chrome/Edge (Chromium-based)
- **Permissions**: storage, declarativeNetRequest, webRequest
- **Architecture**: ES6 modules, pure functions
- **UI**: Brutalist minimal design (black/white/gray, monospace, no decoration)
- **Privacy**: No telemetry, all data local

## Settings

Default configuration:
```javascript
{
  enabled: true,
  blockAds: true,
  blockTrackers: true,
  fingerprintProtection: true,
  whitelistedDomains: []
}
```

## Privacy Score

Privacy score (0-100) is calculated based on threats detected:
- **90-100**: Excellent privacy (few/no threats)
- **70-89**: Good privacy (some trackers)
- **50-69**: Moderate privacy (many trackers)
- **0-49**: Poor privacy (heavy tracking)

Lower scores indicate more aggressive tracking on the current site.

## License

MIT

## Version

3.0.0 - Brutalist Minimal Release
