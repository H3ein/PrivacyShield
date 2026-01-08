// Chrome API mocks for testing
global.chrome = {
  runtime: {
    sendMessage: jest.fn().mockImplementation(() => Promise.resolve({})),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    openOptionsPage: jest.fn(),
    id: 'test-extension-id',
    getManifest: jest.fn(() => ({ version: '1.0.0' }))
  },
  storage: {
    local: {
      get: jest.fn().mockImplementation(() => Promise.resolve({})),
      set: jest.fn().mockImplementation(() => Promise.resolve()),
      remove: jest.fn().mockImplementation(() => Promise.resolve()),
      clear: jest.fn().mockImplementation(() => Promise.resolve())
    },
    sync: {
      get: jest.fn().mockImplementation(() => Promise.resolve({})),
      set: jest.fn().mockImplementation(() => Promise.resolve()),
      remove: jest.fn().mockImplementation(() => Promise.resolve()),
      clear: jest.fn().mockImplementation(() => Promise.resolve())
    }
  },
  tabs: {
    query: jest.fn().mockImplementation(() => Promise.resolve([{ 
      id: 1, 
      url: 'https://example.com',
      active: true,
      currentWindow: true
    }])),
    sendMessage: jest.fn().mockImplementation(() => Promise.resolve()),
    onUpdated: {
      addListener: jest.fn()
    },
    onRemoved: {
      addListener: jest.fn()
    },
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    getBadgeText: jest.fn(),
    getBadgeBackgroundColor: jest.fn(),
    setTitle: jest.fn(),
    getTitle: jest.fn(),
    setIcon: jest.fn(),
    getPopup: jest.fn(),
    setPopup: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn()
  },
  declarativeNetRequest: {
    getDynamicRules: jest.fn().mockImplementation(() => Promise.resolve([])),
    updateDynamicRules: jest.fn().mockImplementation(() => Promise.resolve()),
    onRuleMatchedDebug: {
      addListener: jest.fn()
    },
    getSessionRules: jest.fn(),
    setExtensionActionOptions: jest.fn()
  },
  cookies: {
    onChanged: {
      addListener: jest.fn()
    },
    remove: jest.fn().mockImplementation(() => Promise.resolve()),
    get: jest.fn().mockImplementation(() => Promise.resolve([])),
    getAll: jest.fn().mockImplementation(() => Promise.resolve([])),
    set: jest.fn().mockImplementation(() => Promise.resolve())
  },
  webRequest: {
    onBeforeRequest: {
      addListener: jest.fn()
    },
    onHeadersReceived: {
      addListener: jest.fn()
    },
    onCompleted: {
      addListener: jest.fn()
    },
    onErrorOccurred: {
      addListener: jest.fn()
    }
  },
  scripting: {
    executeScript: jest.fn(),
    insertCSS: jest.fn(),
    removeCSS: jest.fn()
  },
  windows: {
    getCurrent: jest.fn().mockImplementation(() => Promise.resolve({ id: 1 })),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  },
  permissions: {
    request: jest.fn().mockImplementation(() => Promise.resolve(true)),
    remove: jest.fn().mockImplementation(() => Promise.resolve(true)),
    contains: jest.fn().mockImplementation(() => Promise.resolve(true)),
    getAll: jest.fn().mockImplementation(() => Promise.resolve([]))
  },
  i18n: {
    getMessage: jest.fn((messageName, substitutions) => {
      return messageName + (substitutions ? ': ' + substitutions.join(', ') : '');
    }),
    getUILanguage: jest.fn(() => 'en'),
    detectLanguage: jest.fn(() => Promise.resolve({ language: 'en' }))
  }
};
