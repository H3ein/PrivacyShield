// Jest test environment setup

// Global test utilities
global.testUtils = {
  // Mock Chrome APIs
  mockChromeAPIs: () => {
    global.chrome = {
      runtime: {
        sendMessage: jest.fn(),
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
        openOptionsPage: jest.fn()
      },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn(),
          clear: jest.fn()
        }
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn(),
        onUpdated: {
          addListener: jest.fn()
        },
        onRemoved: {
          addListener: jest.fn()
        }
      },
      action: {
        setBadgeText: jest.fn(),
        setBadgeBackgroundColor: jest.fn()
      },
      declarativeNetRequest: {
        getDynamicRules: jest.fn(),
        updateDynamicRules: jest.fn(),
        onRuleMatchedDebug: {
          addListener: jest.fn()
        }
      },
      cookies: {
        onChanged: {
          addListener: jest.fn()
        },
        remove: jest.fn()
      },
      webRequest: {
        onBeforeRequest: {
          addListener: jest.fn()
        }
      }
    };
  },

  // Reset all mocks
  resetMocks: () => {
    jest.clearAllMocks();
    global.testUtils.mockChromeAPIs();
  },

  // Create mock DOM elements
  createMockElement: (id, tagName = 'div') => {
    const element = document.createElement(tagName);
    element.id = id;
    document.body.appendChild(element);
    return element;
  },

  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Create mock response
  createMockResponse: (data = {}) => ({
    success: true,
    data,
    json: () => Promise.resolve(data)
  })
};

// Setup global mocks before each test
beforeEach(() => {
  global.testUtils.mockChromeAPIs();
});

// Cleanup after each test
afterEach(() => {
  global.testUtils.resetMocks();
  document.body.innerHTML = '';
});

// Console error suppression for expected errors
const originalError = console.error;
console.error = (...args) => {
  // Filter out expected errors during testing
  const suppressedErrors = [
    'PrivacyShield: Chrome storage API not available',
    'PrivacyShield: Failed to',
    'CanvasRenderingContext2D.prototype.measureText',
    'WebGLRenderingContext.prototype.getParameter'
  ];
  
  const message = args.join(' ');
  const shouldSuppress = suppressedErrors.some(error => message.includes(error));
  
  if (!shouldSuppress) {
    originalError.apply(console, args);
  }
};

// Restore console after tests
afterAll(() => {
  console.error = originalError;
});
