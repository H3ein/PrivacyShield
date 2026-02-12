# PrivacyShield

> Brutalist minimal privacy protection browser extension for Chrome.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-3.1.0-blue.svg)](https://github.com/H3ein/PrivacyShield)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://github.com/H3ein/PrivacyShield)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

## Why PrivacyShield?

PrivacyShield embraces **brutalist minimalism** - no-nonsense privacy protection without decorative elements. Just powerful, fast, and reliable privacy tools that work.

### Key Features

#### Core Privacy Protection
- **Ad Blocking** - Multi-layer approach with 83 static DeclarativeNetRequest rules + dynamic rules + CSS selectors to block and hide ads from major networks including Google Ads, Facebook, Twitter, Amazon, and programmatic platforms
- **Tracker Blocking** - Prevent 250+ analytics and tracking domains from loading (Google Analytics, Facebook Pixel, Mixpanel, Hotjar, etc.)
- **Malware Protection** - Block access to 100+ known malicious domains via static rules
- **Fingerprint Protection** - Six-vector protection system:
  - Canvas fingerprinting (deterministic noise injection)
  - WebGL fingerprinting (GPU characteristic spoofing)
  - Audio context fingerprinting
  - Font enumeration protection
  - WebRTC leak prevention
  - Hardware concurrency masking
- **URL Cleaning** - Strip tracking parameters (UTM, fbclid, gclid, etc.) from URLs
- **Iframe Ad Blocking** - Content script runs in all frames, catching ads embedded in iframes

#### Performance & Design
- **Brutalist UI** - Stark, minimal, functional interface
- **Chrome MV3** - Modern Manifest V3 architecture
- **Lightweight** - Small footprint, fast initialization
- **Privacy First** - Zero telemetry, all data stored locally

## Quick Start

### Installation
1. **Manual Install**:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the project folder

### First Use
1. Click the PrivacyShield icon in your toolbar
2. Verify protection is active
3. Visit any website to see real-time blocking stats
4. Check the badge counter for blocked threats per tab

## How It Works

### Three-Layer Blocking

1. **Static DeclarativeNetRequest Rules** - 83 ad blocking rules + 150+ tracker rules + 100+ malware rules in JSON files (`rules/ads.json`, `rules/trackers.json`, `rules/malware.json`) block threats at the network level before requests are sent
2. **Dynamic DeclarativeNetRequest Rules** - Generated at runtime from domain pattern lists in `src/core/constants.js`, covering 200+ additional ad/tracker domains
3. **Content Script DOM Hiding** - CSS selectors + MutationObserver hide ad elements dynamically inserted into pages. The content script also implements fingerprint protection by intercepting canvas, WebGL, audio, and other APIs

### What Gets Blocked
- Google Ads (DoubleClick, AdSense, AdServices)
- Major ad exchanges (PubMatic, Rubicon, OpenX, AppNexus, Criteo, Index Exchange)
- Native ad platforms (Taboola, Outbrain, RevContent, MGID)
- Social media ad platforms (Facebook, Twitter, LinkedIn, Pinterest, Snapchat, Reddit)
- Programmatic/DSP networks (The Trade Desk, MediaMath, Simpli.fi)
- Pop-under networks (PropellerAds, PopAds, PopCash, AdCash, Adsterra)
- Header bidding (Prebid, Amazon Ad System)
- Video ad platforms (Teads, Innovid, SpotX)
- Ad verification (DoubleVerify, MOAT, IAS)

### Privacy Score System
Your privacy score (0-100) is calculated based on threats detected:
- **90-100**: Excellent privacy (few/no threats)
- **70-89**: Good privacy (some trackers)
- **50-69**: Moderate privacy (many trackers)
- **0-49**: Poor privacy (heavy tracking)

## Architecture

```
privacyshield/
├── manifest.json         # Extension manifest (MV3)
├── background.js         # Service worker - network blocking & stats
├── content.js            # Content script - DOM ad hiding & fingerprint protection
├── src/
│   ├── core/             # Constants, storage, utils
│   ├── privacy/          # Fingerprint protection, tracker-blocker, stats
│   ├── ui/               # Popup and settings logic
│   └── ai/               # AI learning monitor
├── ui/
│   ├── popup.html        # Popup interface
│   ├── popup.css         # Popup styles
│   ├── settings-new.html # Settings page
│   └── settings.css      # Settings styles
├── rules/
│   ├── ads.json          # 83 static ad blocking rules
│   ├── trackers.json     # 150+ tracker blocking rules
│   └── malware.json      # 100+ malware domain rules
└── icons/                # Extension icons
```

## Technical Details

- **Manifest Version**: 3
- **Browser Support**: Chrome 88+, Edge 88+, Brave (Chromium-based)
- **Permissions**: Minimal essential permissions only
  - `storage` - Settings and statistics
  - `declarativeNetRequest` - Network blocking
  - `webRequest` - Request monitoring
  - `tabs` - Badge updates
  - `webNavigation` - Navigation tracking
- **Design**: Brutalist minimal (black/white/monospace)
- **Privacy**: No external requests, local storage only

## Development

### Setup
```bash
git clone https://github.com/H3ein/PrivacyShield.git
cd PrivacyShield
npm install
npm test              # Run Jest test suite
npm run lint          # ESLint checks
npm run build         # Build production package
```

### Project Structure
```
privacyshield/
├── manifest.json              # Chrome extension manifest (MV3)
├── background.js              # Service worker (request monitoring, stats, badge)
├── content.js                 # Content script (DOM hiding, fingerprint protection)
├── src/
│   ├── core/
│   │   ├── constants.js       # Domain lists, settings, message types
│   │   ├── storage.js         # Chrome storage wrapper
│   │   └── utils.js           # Utility functions
│   ├── privacy/
│   │   ├── fingerprint.js     # 6-vector fingerprint protection
│   │   ├── stats.js           # Privacy score & counters
│   │   └── tracker-blocker.js # Dynamic rule generation
│   ├── ui/
│   │   ├── popup.js           # Popup controller
│   │   └── settings.js        # Settings page controller
│   └── ai/
│       └── ai-learning-monitor.js  # Logging (monitoring only)
├── ui/
│   ├── popup.html             # Popup interface
│   ├── popup.css              # Popup styles (brutalist)
│   ├── settings-new.html      # Settings page
│   └── settings.css           # Settings styles
├── rules/
│   ├── ads.json               # 83 static ad blocking rules
│   ├── trackers.json          # 150+ tracker blocking rules
│   └── malware.json           # 100+ malware domain rules
└── tests/                     # Jest test suite
```

### Testing
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run lint            # ESLint
npm run lint:fix        # Auto-fix issues
```

## Security & Privacy

### Security Measures
- Input validation and sanitization
- No eval() or dynamic code execution
- Restrictive Content Security Policy
- Local-only storage

### Privacy Commitment
- Zero telemetry - no data collection
- All data stays on your device
- Open source - full transparency
- Minimal permissions
- No external requests - works completely offline

## Contributing

Contributions welcome. Fork the repository, create a feature branch, test your changes, and submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **uBlock Origin** - Inspiration for rule patterns
- **Privacy Badger** - Fingerprinting protection techniques
- **Chrome Extensions Team** - MV3 documentation and tools
