module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
    jest: true,
    node: true // For test files
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Error prevention
    'no-unused-vars': ['warn', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_' 
    }],
    'no-console': 'off', // Allow console for extension debugging
    
    // Code quality
    'prefer-const': 'warn',
    'no-var': 'warn',
    'eqeqeq': 'warn',
    'curly': 'warn',
    
    // Style (minimal for production)
    'indent': 'off',
    'quotes': 'off',
    'semi': 'off',
    'comma-dangle': 'off',
    
    // Best practices
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-void': 'warn'
  },
  globals: {
    'chrome': 'readonly',
    'browser': 'readonly',
    'global': 'writable' // For test environment
  }
};
