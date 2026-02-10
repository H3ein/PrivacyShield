# PrivacyShield - Claude Code Project Guide

## Build / Test / Lint

```bash
npm test              # Run Jest test suite
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
npm run lint          # ESLint on src/ and tests/
npm run lint:fix      # Auto-fix lint issues
npm run build         # Production build via build.cjs
```

## Architecture

Chrome MV3 extension with three-layer blocking:

1. **Static DeclarativeNetRequest** (`rules/ads.json`, `rules/trackers.json`, `rules/malware.json`) - Chrome blocks requests before they're sent
2. **Dynamic DeclarativeNetRequest** - Generated at runtime from pattern lists in `src/core/constants.js`
3. **Content Script DOM hiding** (`content.js`) - CSS selectors + MutationObserver hide ad elements

### Key Files

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest, permissions, rule resources |
| `background.js` | Service worker: request monitoring, stats, badge, message hub |
| `content.js` | Content script: fingerprint protection, ad element hiding |
| `src/core/constants.js` | All domain lists (trackers, ads), settings defaults, message types |
| `src/core/storage.js` | Chrome storage wrapper with validation |
| `src/core/utils.js` | `extractHostname()`, `extractDomain()`, number formatting |
| `src/privacy/stats.js` | Simple counters (trackers/ads/fingerprints blocked), privacy score |
| `src/privacy/fingerprint.js` | 6-vector fingerprint protection (canvas, WebGL, audio, fonts, WebRTC, hardware) |
| `src/ui/popup.js` | Popup controller class, loads stats/settings, auto-refreshes |
| `src/ui/settings.js` | Settings page: toggles, whitelist, export/import, stats display |
| `src/ai/ai-learning-monitor.js` | Logging/monitoring of blocking actions (does not affect blocking decisions) |
| `ui/popup.html` | Popup markup |
| `ui/popup.css` | Popup styles (brutalist black/white/monospace) |
| `ui/settings-new.html` | Settings page markup |
| `ui/settings.css` | Settings page styles |

### Message Flow

```
popup.js / settings.js
    │ chrome.runtime.sendMessage()
    ▼
background.js (onMessage listener)
    │ reads/writes via storage.js, stats.js
    │ sendResponse() back to caller
    ▼
content.js ◄── settings pushed via chrome.tabs.sendMessage()
```

### Domain Matching

Blocking uses hostname comparison (`hostname === pattern || hostname.endsWith('.' + pattern)`), NOT substring matching. Domain lists are in `src/core/constants.js`:
- `CONSERVATIVE_TRACKER_PATTERNS` - analytics, fingerprinting, marketing trackers
- `CONSERVATIVE_AD_PATTERNS` - ad networks, exchanges, SSPs
- `ESSENTIAL_DOMAINS` - never-block list (YouTube, etc.)

### Style Guide

- Brutalist UI: black background, white borders, monospace font, green accents
- No decorative elements, no rounded corners
- All text uppercase with letter-spacing
