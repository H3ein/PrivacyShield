# PrivacyShield Max

The ultimate Firefox addon for maximum privacy protection with advanced ad blocking, tracking protection, and CNAME uncloaking.

## Features

### 🔒 Maximum Privacy Protection
- **Advanced Ad Blocking**: Blocks all types of advertisements including video ads, popups, and sponsored content
- **Tracking Protection**: Prevents analytics scripts, tracking pixels, and data collection
- **CNAME Uncloaking**: Detects and blocks disguised trackers (Firefox exclusive)
- **Fingerprinting Protection**: Prevents browser fingerprinting techniques
- **Cookie Banner Blocking**: Automatically hides cookie consent notices

### 🛡️ Security Features
- **Malware Protection**: Blocks known malicious domains
- **Cryptocurrency Miner Blocking**: Prevents unauthorized mining
- **WebRTC Protection**: Blocks IP leaks through WebRTC
- **Geolocation Protection**: Prevents location tracking

### ⚡ Performance Optimization
- **Lightweight Design**: Minimal impact on browser performance
- **Efficient Filtering**: Optimized rule matching for faster page loads
- **Memory Management**: Smart caching and cleanup
- **CPU Optimization**: Background processing for intensive tasks

### 🧠 Smart Filtering System
- **Pattern Recognition**: Advanced algorithms to identify threats
- **Behavioral Analysis**: Analyze script behavior for malicious patterns
- **Adaptive Filtering**: Automatically adjusts based on browsing patterns
- **Confidence Scoring**: Probabilistic approach to reduce false positives

### 🎛️ Advanced Controls
- **Element Picker**: Click to block any element on a page
- **Custom Filters**: Add your own blocking rules
- **Site Whitelisting**: Allow trusted sites
- **Real-time Statistics**: Track blocked requests and threats
- **Dynamic Updates**: Automatic filter list updates

## Installation

### Development Install (Chrome / Edge / Brave)
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder (the one containing `manifest.json`)

### Development Install (Firefox)
Firefox temporary add-ons currently require a Firefox-compatible manifest.

1. In this folder, copy the Firefox manifest over the main manifest:
   - Copy `manifest.firefox.json` to `manifest.json` (overwrite)
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on"
4. Select the `manifest.json` file

To switch back to Chrome testing, restore the MV3 manifest (copy the original MV3 `manifest.json` back).

### Production Install
(Will be available on Firefox Add-ons Store after review)

## Configuration

### Basic Setup
1. Install the addon
2. Click the PrivacyShield Max icon in your toolbar
3. Enable desired protection features in the popup
4. Browse safely!

### Advanced Configuration
- **Custom Filters**: Add domain-specific blocking rules
- **Whitelist Management**: Allow specific sites
- **Filter Updates**: Manually update protection lists
- **Statistics**: Monitor blocking effectiveness

## Technical Details

### Core Technologies
- **Manifest V2**: Maximum compatibility with Firefox APIs
- **Web Request API**: Complete request interception
- **DNS API**: CNAME uncloaking capabilities
- **Content Scripts**: DOM manipulation and element blocking
- **Background Scripts**: Persistent protection logic

### Filter Lists
The addon includes comprehensive filter lists:
- EasyList (ad blocking)
- EasyPrivacy (tracking protection)
- Malware domains
- Coin miner domains
- Fingerprinting domains
- Custom user filters

### Performance Features
- **Lazy Loading**: Load features only when needed
- **Code Splitting**: Modular architecture
- **Efficient Caching**: Smart DNS and rule caching
- **Memory Optimization**: Automatic cleanup

## Permissions

The addon requires the following permissions for optimal functionality:

- **<all_urls>**: Access to all websites for protection
- **webRequest**: Intercept and block network requests
- **webRequestBlocking**: Modify or block requests
- **dns**: Resolve domain names for CNAME uncloaking
- **cookies**: Manage and block tracking cookies
- **storage**: Save settings and statistics
- **tabs**: Access current tab information
- **contextMenus**: Add right-click options

## Privacy Policy

PrivacyShield Max is designed with privacy as the top priority:

- **No Data Collection**: The addon does not collect or transmit any personal data
- **Local Storage**: All settings and statistics are stored locally
- **Open Source**: Full code transparency and auditability
- **No Telemetry**: No usage analytics or tracking
- **No Phone Home**: No external communications except filter list updates

## Development

### Building from Source
```bash
# Clone the repository
git clone https://github.com/your-repo/privacyshield-max.git
cd privacyshield-max

# The addon is ready to use
# Load manifest.json in Firefox for testing
```

### File Structure
```
privacyshield-max/
├── manifest.json          # Addon configuration
├── background.js          # Background script (core logic)
├── content.js            # Content script (DOM manipulation)
├── smart-filtering.js    # Smart filtering system (pattern recognition)
├── popup.html            # Popup interface
├── popup.css             # Popup styles
├── popup.js              # Popup functionality
├── options.html          # Settings page
├── options.css           # Settings styles
├── options.js            # Settings functionality
├── styles.css            # Content script styles
├── icons/                # Addon icons
├── README.md             # This file
└── LICENSE               # GPL v3 License
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Troubleshooting

### Common Issues

**Addon not working:**
- Ensure Firefox is up to date
- Check addon is enabled in `about:addons`
- Try disabling other ad blockers for testing

**Site not working properly:**
- Add site to whitelist
- Disable specific protection features
- Check for conflicting addons

**Performance issues:**
- Clear statistics and cache
- Disable unused features
- Check filter list size

### Debug Mode
Enable debug logging:
1. Open `about:config`
2. Set `extensions.privacyshield.debug` to `true`
3. Check browser console for logs

## Comparison with Other Addons

| Feature | PrivacyShield Max | uBlock Origin | Adblock Plus |
|---------|------------------|--------------|--------------|
| Ad Blocking | ✅ | ✅ | ✅ |
| Tracking Protection | ✅ | ✅ | ⚠️ |
| CNAME Uncloaking | ✅ | ✅ | ❌ |
| Fingerprinting Protection | ✅ | ⚠️ | ❌ |
| Cookie Banner Blocking | ✅ | ⚠️ | ❌ |
| Element Picker | ✅ | ✅ | ✅ |
| Custom Filters | ✅ | ✅ | ✅ |
| Performance Optimization | ✅ | ✅ | ⚠️ |
| Privacy Focus | ✅ | ✅ | ⚠️ |

## License

This project is licensed under the GPL v3 License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: Report bugs on GitHub Issues
- **Feature Requests**: Submit feature requests on GitHub
- **Community**: Join discussions on GitHub Discussions
- **Documentation**: Check the Wiki for detailed guides

## Changelog

### v1.0.0 (2025-01-01)
- Initial release
- Advanced ad blocking
- CNAME uncloaking
- Fingerprinting protection
- Cookie banner blocking
- Performance optimization
- Custom filter support
- Real-time statistics

## Credits

- **uBlock Origin**: Inspiration and filter list compatibility
- **Firefox Team**: Excellent extension APIs
- **Privacy Community**: Feedback and testing
- **Open Source Contributors**: Code and ideas

---

**PrivacyShield Max** - Maximum protection for maximum privacy. 🛡️
