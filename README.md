# PrivacyShield

> Brutalist minimal privacy protection browser extension for Chrome.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-3.1.0-blue.svg)](https://github.com/H3ein/PrivacyShield)

## Why PrivacyShield?

PrivacyShield embraces **brutalist minimalism** - no-nonsense privacy protection without decorative elements. Just powerful, fast, and reliable privacy tools that work.

### Key Features

#### Core Privacy Protection
- **Ad Blocking** - Block 75+ ad network domains via DeclarativeNetRequest static rules, 140+ via dynamic rules, and 100+ CSS selectors to hide banner ads, leaderboards, sidebar ads, native ads, and sponsored content
- **Tracker Blocking** - Prevent 250+ analytics and tracking scripts from loading
- **Fingerprint Protection** - Protect against multiple fingerprinting vectors:
  - Canvas fingerprinting (deterministic noise)
  - WebGL fingerprinting (common GPU spoofing)
  - Screen size fuzzing
  - Timezone offset noise
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

1. **DeclarativeNetRequest (Static Rules)** - 75 static rules in `rules/ads.json` block major ad network domains at the network level before requests are sent
2. **DeclarativeNetRequest (Dynamic Rules)** - 140+ dynamic rules generated from `CONSERVATIVE_AD_PATTERNS` covering ad exchanges, SSPs, DSPs, native ad platforms, and pop-under networks
3. **Content Script (DOM Hiding)** - 100+ CSS selectors hide ad containers, banners, leaderboards, sidebar ads, sponsored content, and native ad widgets. A MutationObserver catches dynamically inserted ads

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
│   ├── ads.json          # 75 static ad blocking rules
│   ├── trackers.json     # Tracker blocking rules
│   └── malware.json      # Malware domain rules
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
npm test
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
