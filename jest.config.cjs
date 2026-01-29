// Jest configuration for PrivacyShield extension
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Coverage configuration - disabled for now
  collectCoverage: false,
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module transformation
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Module name mapping for Chrome APIs
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^.+.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Mock Chrome APIs
  setupFiles: ['<rootDir>/tests/mocks/chrome.js'],
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Error handling
  errorOnDeprecated: true
};
