# 🛡️ PrivacyShield

> Brutalist minimal privacy protection browser extension for Chrome.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-green.svg)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/H3ein/PrivacyShield)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/H3ein/PrivacyShield)

## 🎯 Why PrivacyShield?

PrivacyShield embraces **brutalist minimalism** - no-nonsense privacy protection without decorative elements. Just powerful, fast, and reliable privacy tools that work.

### ✨ Key Features

#### 🔒 Core Privacy Protection
- **🚫 Ad Blocking** - Block 400+ ad network patterns using DeclarativeNetRequest
- **👁️ Tracker Blocking** - Prevent 500+ analytics and tracking scripts
- **🖼️ Fingerprint Protection** - Protect against 6 fingerprinting vectors:
  - Canvas fingerprinting
  - WebGL fingerprinting  
  - AudioContext fingerprinting
  - Font fingerprinting
  - WebRTC IP leak protection
  - Hardware fingerprinting

#### ⚡ Performance & Design
- **🎨 Brutalist UI** - Stark, minimal, functional interface
- **🚀 Chrome MV3** - Modern Manifest V3 architecture
- **📦 Lightweight** - Only 77KB total size
- **🔐 Privacy First** - Zero telemetry, all data stored locally
- **⚡ Fast** - <100ms initialization, <1% CPU impact

## 🚀 Quick Start

### Installation
1. **Chrome Web Store** (Recommended): [Install from Chrome Web Store](https://chrome.google.com/webstore)
2. **Manual Install**:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the `privacyshield` folder

### First Use
1. Click the PrivacyShield icon in your toolbar
2. Verify "PRIVACYSHIELD [ON]" status
3. Visit any website to see real-time protection
4. Check your privacy score and blocking stats

## 📊 How It Works

### Privacy Score System
Your privacy score (0-100) is calculated based on threats detected:
- **🟢 90-100**: Excellent privacy (few/no threats)
- **🟡 70-89**: Good privacy (some trackers)  
- **🟠 50-69**: Moderate privacy (many trackers)
- **🔴 0-49**: Poor privacy (heavy tracking)

### Real-time Protection
- **📈 Live Stats**: Track blocked trackers, ads, and fingerprints
- **🎯 Site Whitelist**: Temporarily disable protection for trusted sites
- **⚙️ Granular Control**: Enable/disable specific protection types
- **📊 Historical Data**: View all-time statistics and trends

## 🏗️ Architecture

```
privacyshield/
├── 📄 manifest.json         # Extension manifest (MV3)
├── 🔄 background.js         # Service worker
├── 🌐 content.js            # Content script
├── 📁 src/                  # Source modules
│   ├── 🔧 core/             # Constants, storage, utils
│   ├── 🛡️ privacy/          # Fingerprint, tracker-blocker, stats
│   ├── 🎨 ui/               # Popup and settings logic
│   └── 🤖 ai/               # AI learning (disabled for security)
├── 🎨 ui/                   # User interface
│   ├── popup.html           # Brutalist popup
│   ├── popup.css            # Minimal styling
│   ├── settings.html        # Settings page
│   └── settings.css         # Brutalist design
├── 📋 rules/                # Blocking rules
│   ├── ads.json             # Ad blocking patterns
│   ├── trackers.json        # Tracker patterns
│   └── malware.json         # Malware protection
└── 🖼️ icons/               # Extension icons
    ├── icon16.png           # 16x16
    ├── icon32.png           # 32x32
    ├── icon48.png           # 48x48
    └── icon128.png          # 128x128
```

## 🔧 Technical Details

- **📦 Manifest Version**: 3 (Chrome Web Store ready)
- **🌐 Browser Support**: Chrome 88+, Edge 88+, Brave (Chromium-based)
- **🔑 Permissions**: Minimal essential permissions only
  - `storage` - Settings and statistics
  - `declarativeNetRequest` - Network blocking
  - `webRequest` - Request monitoring
  - `tabs` - Badge updates
- **⚡ Performance**: <10MB memory, <1% CPU usage
- **🎨 Design**: Brutalist minimal (black/white/monospace)
- **🔒 Privacy**: No external requests, local storage only

## 🛠️ Development

### Setup
```bash
# Clone the repository
git clone https://github.com/H3ein/PrivacyShield.git
cd PrivacyShield

# Install dependencies
npm install

# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build
```

### Testing
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

### Building
```bash
# Create production package
npm run build

# This creates:
# - privacyshield-v3.0.0-production.zip
# - Ready for Chrome Web Store submission
```

## 🎨 Brutalist Design Philosophy

PrivacyShield follows **brutalist minimalism** principles:

- **🎯 Function over form** - No decorative elements
- **⚫ High contrast** - Black/white for maximum readability
- **🔤 Monospace typography** - Technical, precise feel
- **📐 Sharp edges** - No rounded corners or organic shapes
- **⚡ Binary states** - Clear on/off, visible/hidden

### Design System
- **Colors**: Pure black (#000000), pure white (#ffffff)
- **Typography**: Monospace fonts only
- **Layout**: 8px grid system, rigid alignment
- **Animations**: Minimal, instant transitions

## 🔒 Security & Privacy

### Security Measures
- **🛡️ Input Validation**: Comprehensive sanitization
- **🚫 No eval()**: Dynamic code execution disabled
- **🔒 CSP**: Restrictive Content Security Policy
- **🔐 Safe Storage**: Local-only, encrypted
- **📊 Error Logging**: Comprehensive monitoring

### Privacy Commitment
- **🚫 Zero Telemetry**: No data collection
- **💾 Local Storage**: All data stays on your device
- **🔍 Open Source**: Full transparency
- **📋 Minimal Permissions**: Only essential permissions
- **🌐 No External Requests**: Works completely offline

## 📈 Performance Metrics

- **📦 Size**: 77KB (compressed)
- **⚡ Load Time**: <100ms initialization
- **💾 Memory**: 5-10MB typical usage
- **🔄 CPU**: <1% average impact
- **🛡️ Protection**: 900+ blocking patterns

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### How to Contribute
1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch
3. **🧪 Test** your changes
4. **📝 Commit** with clear messages
5. **📤 Submit** a pull request

### Areas for Contribution
- **🐛 Bug fixes** and improvements
- **📋 New blocking patterns**
- **🎨 UI/UX enhancements**
- **📚 Documentation**
- **🧪 Test coverage**

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **uBlock Origin** - Inspiration for rule patterns
- **Privacy Badger** - Fingerprinting protection techniques
- **Chrome Extensions Team** - MV3 documentation and tools

## 📞 Support & Contact

- **🐛 Issues**: [GitHub Issues](https://github.com/H3ein/PrivacyShield/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/H3ein/PrivacyShield/discussions)

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=H3ein/PrivacyShield&type=Date)](https://star-history.com/#H3ein/PrivacyShield&Date)

---

**🛡️ PrivacyShield - Brutalist Privacy Protection**

*Protect your privacy, brutally simple.*
=======
# PrivacyShield
>>>>>>> a57d99dc59482777823c485e82ded0796c3a5321
