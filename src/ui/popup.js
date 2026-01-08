// PrivacyShield - Simple Popup with Global AI Learning

import { MESSAGE_TYPES } from '../core/constants.js';
import { formatNumber, extractDomain, extractHostname } from '../core/utils.js';
import { globalLearning } from '../ai/global-browser-learning.js';

// Simple AI Learning Controller (now using global learning with clear UI)
class SimpleAILearning {
  constructor() {
    this.baseAccuracy = 0.4; // Start at 40%
    this.sitesAnalyzed = 0;
    this.startTime = Date.now();
  }

  /**
   * Initialize AI learning display
   */
  async initialize() {
    // Initialize global learning system
    await globalLearning.initialize();
    
    // Load initial display data
    await this.updateDisplay();
    
    // Start real-time updates
    this.startRealTimeUpdates();
  }

  /**
   * Update AI learning display with clear tab vs global info
   */
  async updateDisplay() {
    try {
      // Get data from global learning system
      const learningData = globalLearning.getLearningData();
      
      // Get current tab info
      const currentTabDomain = currentTab ? this.extractDomain(currentTab.url) : null;
      const tabLearningData = currentTabDomain ? globalLearning.getDomainStats(currentTabDomain) : null;
      
      // Update THIS TAB accuracy (domain-specific)
      const tabAccuracyElement = document.getElementById('tab-accuracy');
      const tabStatusElement = document.getElementById('tab-status');
      
      if (tabAccuracyElement) {
        if (tabLearningData) {
          // Show domain-specific accuracy
          const tabAccuracy = Math.round(tabLearningData.accuracy * 100);
          tabAccuracyElement.textContent = `${tabAccuracy}%`;
          
          // Set status based on accuracy
          if (tabStatusElement) {
            if (tabAccuracy >= 90) {
              tabStatusElement.textContent = 'Optimal';
              tabStatusElement.style.color = 'var(--green)';
            } else if (tabAccuracy >= 70) {
              tabStatusElement.textContent = 'Good';
              tabStatusElement.style.color = 'var(--yellow)';
            } else {
              tabStatusElement.textContent = 'Learning';
              tabStatusElement.style.color = 'var(--orange)';
            }
          }
        } else {
          // No data for this domain yet
          tabAccuracyElement.textContent = '40%';
          if (tabStatusElement) {
            tabStatusElement.textContent = 'New site';
            tabStatusElement.style.color = 'var(--gray)';
          }
        }
      }
      
      // Update GLOBAL accuracy (overall system)
      const globalAccuracyElement = document.getElementById('global-accuracy');
      const globalInfoElement = document.getElementById('global-info');
      
      if (globalAccuracyElement) {
        const globalAccuracy = Math.round(learningData.accuracy * 100);
        globalAccuracyElement.textContent = `${globalAccuracy}%`;
      }
      
      if (globalInfoElement) {
        const sitesText = learningData.sitesAnalyzed === 1 ? 'site' : 'sites';
        globalInfoElement.textContent = `From ${learningData.sitesAnalyzed.toLocaleString()} ${sitesText}`;
      }
      
      // Update learning status
      const statusIcon = document.getElementById('status-icon');
      const statusText = document.getElementById('status-text');
      const learningStatus = document.getElementById('learning-status');
      
      if (statusIcon && statusText && learningStatus) {
        if (learningData.accuracyTrend === 'improving') {
          statusIcon.textContent = '🧠';
          statusText.textContent = 'Learning active';
          learningStatus.classList.add('active');
        } else {
          statusIcon.textContent = '⚡';
          statusText.textContent = 'Protection active';
          learningStatus.classList.remove('active');
        }
      }
      
    } catch (error) {
      console.warn('Failed to update AI display:', error);
      this.setSafeValues();
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set safe fallback values
   */
  setSafeValues() {
    const elements = {
      'tab-accuracy': '40%',
      'tab-status': 'New site',
      'global-accuracy': '40%',
      'global-info': 'From 0 sites',
      'status-icon': '🤖',
      'status-text': 'Initializing'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
  }

  /**
   * Start real-time updates from global learning
   */
  startRealTimeUpdates() {
    // Listen for learning updates from global system
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'LEARNING_UPDATE') {
        this.updateDisplay();
      }
    });

    // Update display every 2 seconds
    setInterval(async () => {
      await this.updateDisplay();
    }, 2000);
  }

  /**
   * Simulate page refresh learning (now uses global system)
   */
  simulatePageRefresh() {
    // Global learning system handles page refreshes automatically
    // This method is kept for compatibility but delegates to global system
    console.log('Page refresh detected - global learning system handling');
  }
}

// Error handling utilities for popup
const PopupErrorHandler = {
  log: (context, error, fallback = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] PrivacyShield Popup Error [${context}]:`, error);
    if (fallback) {
      console.warn(`[${timestamp}] PrivacyShield Popup Fallback [${context}]:`, fallback);
    }
    return fallback;
  },
  
  safeExecute: async (context, fn, fallback = null) => {
    try {
      return await fn();
    } catch (error) {
      return PopupErrorHandler.log(context, error, fallback);
    }
  },
  
  validateInput: (context, input, validator, fallback = null) => {
    try {
      if (!validator(input)) {
        throw new Error(`Invalid input: ${JSON.stringify(input)}`);
      }
      return input;
    } catch (error) {
      return PopupErrorHandler.log(context, error, fallback);
    }
  },
  
  safeDOMOperation: (context, operation, fallback = null) => {
    try {
      if (document.readyState === 'loading') {
        // Document not ready, schedule for later
        setTimeout(() => {
          PopupErrorHandler.safeExecute(context, operation);
        }, 100);
        return fallback;
      }
      return operation();
    } catch (error) {
      return PopupErrorHandler.log(context, error, fallback);
    }
  },
  
  showUserError: (context, message, elementId = null) => {
    PopupErrorHandler.log(context, new Error(message));
    
    if (elementId) {
      const element = document.getElementById(elementId);
      if (element) {
        const originalText = element.textContent;
        const originalColor = element.style.color;
        
        element.textContent = `❌ ${message}`;
        element.style.color = '#ff4444';
        
        setTimeout(() => {
          element.textContent = originalText;
          element.style.color = originalColor;
        }, 3000);
      }
    }
  }
};

let currentTab = null;
let previousStats = { trackersBlocked: 0, adsBlocked: 0, fingerprintsBlocked: 0 };
let previousFormattedStats = { trackers: '0', ads: '0', fingerprints: '0' }; // Initialize with default values
let aiLearning = null;

/**
 * Initialize popup
 */
async function initialize() {
  return PopupErrorHandler.safeExecute('popup.initialize', async () => {
    await getCurrentTab();
    await loadSettings();
    await loadStats();
    
    // Initialize Simple AI Learning
    aiLearning = new SimpleAILearning();
    await aiLearning.initialize();
    
    // Detect page refreshes for learning
    detectPageRefresh();
    
    // Initialize toggle UI states
    updateToggleUI('enabled');
    
    // Set initial UI state based on extension enabled status
    const enabledCheckbox = document.getElementById('enabled');
    if (enabledCheckbox) {
      setUIState(enabledCheckbox.checked);
    }
    
    setupEventListeners();

    // Auto-refresh stats every 2 seconds
    setInterval(() => {
      PopupErrorHandler.safeExecute('refreshStats', async () => {
        await loadStats();
      });
    }, 2000);
    
    return true;
  }, false).then(success => {
    if (!success) {
      showErrorState();
    }
  });
}

/**
 * Detect page refreshes for learning
 */
function detectPageRefresh() {
  // Check if this is a page refresh
  const navigationEntries = performance.getEntriesByType('navigation');
  const isRefresh = navigationEntries.length > 0 && 
                   navigationEntries[0].type === 'reload';
  
  if (isRefresh && aiLearning) {
    aiLearning.simulatePageRefresh();
  }
  
  // Also detect tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tabId === currentTab?.id) {
      if (aiLearning) {
        aiLearning.simulatePageRefresh();
      }
    }
  });
}

/**
 * Get current tab
 */
async function getCurrentTab() {
  return PopupErrorHandler.safeExecute('getCurrentTab', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.warn('PrivacyShield: No active tab found');
      currentTab = { url: 'about:blank', id: -1 };
    } else {
      currentTab = tab;
    }
    return currentTab;
  }, { url: 'about:blank', id: -1 }).then(defaultTab => {
    currentTab = defaultTab;
  });
}

/**
 * Set UI state based on extension toggle
 */
function setUIState(enabled) {
  const opacity = enabled ? '1' : '0.3';
  const pointerEvents = enabled ? 'auto' : 'none';
  
  // Disable/enable all interactive elements except the main toggle
  const elementsToDisable = [
    // Stats display
    '.stats-grid',
    // AI learning section
    '.ai-learning',
    // Action buttons
    '.control-btn',
    // All stat cells
    '.stat-cell',
    // All inputs except main toggle
    'input:not(#enabled)'
  ];
  
  elementsToDisable.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      element.style.opacity = opacity;
      element.style.pointerEvents = pointerEvents;
    });
  });
  
  // Special handling for AI learning section
  const aiLearning = document.querySelector('.ai-learning');
  if (aiLearning) {
    aiLearning.style.opacity = opacity;
    aiLearning.style.filter = enabled ? 'none' : 'grayscale(100%)';
  }
  
  // Update status text
  const statusElements = document.querySelectorAll('.accuracy-status, .learning-info, .status-text');
  statusElements.forEach(element => {
    if (enabled) {
      // Restore original text
      element.dataset.originalText = element.dataset.originalText || element.textContent;
    } else {
      // Store original text and show disabled message
      element.dataset.originalText = element.dataset.originalText || element.textContent;
      if (element.classList.contains('status-text')) {
        element.textContent = 'Extension disabled';
      }
    }
  });
}

/**
 * Update toggle UI to match checkbox state
 */
function updateToggleUI(checkboxId) {
  const checkbox = document.getElementById(checkboxId);
  const toggleSwitch = checkbox?.nextElementSibling;
  
  if (checkbox && toggleSwitch && toggleSwitch.classList.contains('toggle-switch')) {
    if (checkbox.checked) {
      toggleSwitch.classList.add('active');
    } else {
      toggleSwitch.classList.remove('active');
    }
  }
}

/**
 * Load settings
 */
async function loadSettings() {
  return PopupErrorHandler.safeExecute('loadSettings', async () => {
    console.log('PrivacyShield: Loading settings...');
    
    try {
      const settings = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_SETTINGS
      });
      
      console.log('PrivacyShield: Settings received:', settings);
      
      // Update main toggle
      const enabledCheckbox = document.getElementById('enabled');

      if (settings && typeof settings.enabled === 'boolean' && enabledCheckbox) {
        enabledCheckbox.checked = settings.enabled;
        updateToggleUI('enabled');
        console.log('PrivacyShield: Extension toggle set to:', settings.enabled);
      } else {
        console.warn('PrivacyShield: Invalid settings or missing UI elements');
        console.warn('PrivacyShield: Settings:', settings);
        console.warn('PrivacyShield: Checkbox element:', enabledCheckbox);
        
        // Set safe defaults but don't override if checkbox already has a state
        if (enabledCheckbox && enabledCheckbox.checked === true) {
          // Keep current state, don't force to true
          console.log('PrivacyShield: Keeping current toggle state');
        } else if (enabledCheckbox) {
          enabledCheckbox.checked = true;
          updateToggleUI('enabled');
        }
      }
      
      return settings;
    } catch (error) {
      console.error('PrivacyShield: Error loading settings:', error);
      
      // Don't change the toggle state on error
      const enabledCheckbox = document.getElementById('enabled');
      if (enabledCheckbox) {
        console.log('PrivacyShield: Preserving current toggle state on error');
        updateToggleUI('enabled');
      }
      
      return null;
    }
  }, null).then(settings => {
    if (settings === null) {
      console.log('PrivacyShield: Settings load failed, preserving current state');
    }
  });
}

/**
 * Load statistics
 */
async function loadStats() {
  return PopupErrorHandler.safeExecute('loadStats', async () => {
    const stats = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_STATS
    });

    if (stats) {
      // Update stats with change detection
      const trackersElement = document.getElementById('trackers-blocked');
      const adsElement = document.getElementById('ads-blocked');
      const fingerprintsElement = document.getElementById('fingerprints-blocked');
      const scoreElement = document.getElementById('privacy-score');
      
      if (!trackersElement || !adsElement || !fingerprintsElement || !scoreElement) {
        console.warn('PrivacyShield: Missing stats UI elements');
        return false;
      }
      
      // Use current tab stats if available, otherwise global stats
      const currentTabStats = stats.currentTab || {};
      const newTrackers = currentTabStats.trackers !== undefined ? currentTabStats.trackers : (stats.trackersBlocked || 0);
      const newAds = currentTabStats.ads !== undefined ? currentTabStats.ads : (stats.adsBlocked || 0);
      const newFingerprints = currentTabStats.fingerprints !== undefined ? currentTabStats.fingerprints : (stats.fingerprintsBlocked || 0);
      
      console.log('PrivacyShield: Displaying stats - Trackers:', newTrackers, 'Ads:', newAds, 'Fingerprints:', newFingerprints);
      
      // Update values with proper formatting
      const formattedTrackers = formatNumber(newTrackers);
      const formattedAds = formatNumber(newAds);
      const formattedFingerprints = formatNumber(newFingerprints);
      
      // Only update AND animate if formatted value actually changed from last displayed value
      // This prevents animation when raw count changes but formatted display stays same (e.g., 3601→3602 both show "3.6K")
      if (formattedTrackers !== previousFormattedStats.trackers) {
        trackersElement.textContent = formattedTrackers;
        previousFormattedStats.trackers = formattedTrackers;
        
        // Only animate if the formatted value actually represents an increase
        if (newTrackers > previousStats.trackersBlocked) {
          trackersElement.style.color = '#00ff00';
          setTimeout(() => { trackersElement.style.color = ''; }, 300);
        }
      }
      
      if (formattedAds !== previousFormattedStats.ads) {
        adsElement.textContent = formattedAds;
        previousFormattedStats.ads = formattedAds;
        
        // Only animate if the formatted value actually represents an increase
        if (newAds > previousStats.adsBlocked) {
          adsElement.style.color = '#ffff00';
          setTimeout(() => { adsElement.style.color = ''; }, 300);
        }
      }
      
      // Update fingerprints blocked
      if (fingerprintsElement) {
        if (formattedFingerprints !== previousFormattedStats.fingerprints) {
          fingerprintsElement.textContent = formattedFingerprints;
          previousFormattedStats.fingerprints = formattedFingerprints;
          
          // Only animate if the formatted value actually represents an increase
          if (newFingerprints > previousStats.fingerprintsBlocked) {
            fingerprintsElement.style.color = '#ff00ff';
            setTimeout(() => { fingerprintsElement.style.color = ''; }, 300);
          }
        }
      }
      
      // Calculate privacy score based on actual blocking
      const totalBlocks = newTrackers + newAds + newFingerprints;
      const privacyScore = Math.max(0, Math.min(100, 100 - (totalBlocks * 0.1)));
      scoreElement.textContent = Math.round(privacyScore);
      
      // Store previous stats
      previousStats = { trackersBlocked: newTrackers, adsBlocked: newAds, fingerprintsBlocked: newFingerprints };
      return true;
    } else {
      console.warn('PrivacyShield: No stats data received');
      // Set zero values
      const trackersElement = document.getElementById('trackers-blocked');
      const adsElement = document.getElementById('ads-blocked');
      const fingerprintsElement = document.getElementById('fingerprints-blocked');
      const scoreElement = document.getElementById('privacy-score');
      
      if (trackersElement) trackersElement.textContent = '0';
      if (adsElement) adsElement.textContent = '0';
      if (fingerprintsElement) fingerprintsElement.textContent = '0';
      if (scoreElement) scoreElement.textContent = '100';
      
      return false;
    }
  }, false).then(success => {
    if (!success) {
      console.log('PrivacyShield: Stats load failed, preserving current state');
    }
  });
}

/**
 * Load learning state
 */
async function loadLearningState() {
  return PopupErrorHandler.safeExecute('loadLearningState', async () => {
    const learningState = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_LEARNING_STATE
    });

    if (learningState) {
      const safeDomainsCount = learningState.safeDomains.length || 0;
      const totalRequests = learningState.totalRequests || 0;
      
      // Calculate safe percentage
      const safePercentage = totalRequests > 0 ? Math.round((safeDomainsCount / Math.min(totalRequests, 100)) * 100) : 0;
      
      // Store previous count for change detection
      const previousSafeDomains = parseInt(document.getElementById('safe-domains').textContent) || 0;
      
      // Update learning stats with better formatting
      const safeDomainsElement = document.getElementById('safe-domains');
      safeDomainsElement.textContent = safeDomainsCount;
      document.getElementById('total-requests').textContent = formatNumber(totalRequests);
      
      // Add visual feedback for new safe domains
      if (safeDomainsCount > previousSafeDomains) {
        safeDomainsElement.style.color = '#ffff00';
        setTimeout(() => { safeDomainsElement.style.color = ''; }, 1000);
      }
      
      // Add percentage indicator if we have enough data
      if (totalRequests > 10) {
        safeDomainsElement.title = `${safePercentage}% of analyzed domains are safe`;
      }
      
      // Format total requests
      let formattedRequests = formatNumber(totalRequests);
      if (totalRequests >= 1000) {
        formattedRequests = (totalRequests / 1000).toFixed(1) + 'K';
      }
      
      document.getElementById('total-requests').textContent = formattedRequests;
      
      // Update learning status
      const statusElement = document.getElementById('learning-status');
      if (statusElement) {
        const lastUpdated = learningState.lastUpdated;
        if (lastUpdated) {
          const timeDiff = Date.now() - lastUpdated;
          const minutes = Math.floor(timeDiff / 60000);
          statusElement.textContent = learningState.learningEnabled ? 
            `Learning active (${minutes}m ago)` : 'Learning paused';
        } else {
          statusElement.textContent = learningState.learningEnabled ? 'Learning active' : 'Learning paused';
        }
      }
      
      // Update learning toggle (no text needed, just visual state)
      const learningToggle = document.getElementById('learning-enabled');
      if (learningToggle) {
        if (learningState && typeof learningState.learningEnabled === 'boolean') {
          learningToggle.checked = learningState.learningEnabled;
          updateToggleUI('learning-enabled');
          console.log('PrivacyShield: Learning toggle set to:', learningState.learningEnabled);
        } else {
          console.warn('PrivacyShield: Invalid learning state or missing UI element');
          console.warn('PrivacyShield: Learning state:', learningState);
          console.warn('PrivacyShield: Learning toggle element:', learningToggle);
          
          // Preserve current state, don't force to true
          if (learningToggle) {
            console.log('PrivacyShield: Keeping current learning toggle state');
            updateToggleUI('learning-enabled');
          }
        }
      }
      
      return true;
    }
    return false;
  }, false);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  return PopupErrorHandler.safeExecute('setupEventListeners', () => {
    // Extension toggle
    const enabledCheckbox = document.getElementById('enabled');
    
    if (enabledCheckbox) {
      enabledCheckbox.addEventListener('change', async (e) => {
        // Update UI immediately for better UX
        updateToggleUI('enabled');
        
        // Enable/disable all UI elements based on toggle state
        setUIState(e.target.checked);
        
        return PopupErrorHandler.safeExecute('toggleExtension', async () => {
          const newEnabled = e.target.checked;
          
          const response = await chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.TOGGLE_EXTENSION,
            data: { enabled: newEnabled }
          });
          
          if (!response || !response.success) {
            throw new Error('Toggle failed');
          }
          
          return true;
        }, false).then(success => {
          if (!success) {
            // Revert UI on error
            e.target.checked = !e.target.checked;
            updateToggleUI('enabled');
            setUIState(e.target.checked);
            PopupErrorHandler.showUserError('toggleExtension', 'Failed to toggle extension');
          }
        });
      });
      
      // Also add click handler to the toggle switch itself
      const toggleSwitch = enabledCheckbox.nextElementSibling;
      if (toggleSwitch && toggleSwitch.classList.contains('toggle-switch')) {
        toggleSwitch.addEventListener('click', (e) => {
          console.log('PrivacyShield: Main toggle switch clicked');
          e.preventDefault();
          e.stopPropagation();
          enabledCheckbox.checked = !enabledCheckbox.checked;
          enabledCheckbox.dispatchEvent(new Event('change'));
        });
      }
    }

    // Learning toggle
    const learningToggle = document.getElementById('learning-enabled');
    if (learningToggle) {
      learningToggle.addEventListener('change', async (e) => {
        // Update UI immediately for better UX
        updateToggleUI('learning-enabled');
        
        return PopupErrorHandler.safeExecute('toggleLearning', async () => {
          const response = await chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.TOGGLE_LEARNING
          });
          
          if (response && !response.learningEnabled) {
            e.target.checked = false;
            updateToggleUI('learning-enabled');
          }
          
          return true;
        }, false).then(success => {
          if (!success) {
            // Revert UI on error
            e.target.checked = !e.target.checked;
            updateToggleUI('learning-enabled');
            PopupErrorHandler.showUserError('toggleLearning', 'Failed to toggle learning');
          }
        });
      });
      
      // Also add click handler to the toggle switch itself
      const learningToggleSwitch = learningToggle.nextElementSibling;
      if (learningToggleSwitch && learningToggleSwitch.classList.contains('toggle-switch')) {
        learningToggleSwitch.addEventListener('click', (e) => {
          console.log('PrivacyShield: Learning toggle switch clicked');
          e.preventDefault();
          e.stopPropagation();
          learningToggle.checked = !learningToggle.checked;
          learningToggle.dispatchEvent(new Event('change'));
        });
        
        // Also add click handler to the container
        const learningToggleContainer = learningToggle.parentElement;
        if (learningToggleContainer) {
          learningToggleContainer.addEventListener('click', (e) => {
            console.log('PrivacyShield: Learning toggle container clicked');
            if (e.target === learningToggleContainer || e.target === learningToggleSwitch) {
              e.preventDefault();
              e.stopPropagation();
              learningToggle.checked = !learningToggle.checked;
              learningToggle.dispatchEvent(new Event('change'));
            }
          });
        }
      }
    }

    // Reset learning button
    const resetBtn = document.getElementById('reset-learning');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        return PopupErrorHandler.safeExecute('resetLearning', async () => {
          const confirmed = confirm('Reset all learning data? This will clear safe domains and request history.');
          if (!confirmed) return false;
          
          await chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.RESET_LEARNING_STATE
          });
          
          // Show confirmation
          const originalText = resetBtn.textContent;
          resetBtn.textContent = '✓ RESET';
          resetBtn.style.background = 'var(--green)';
          
          setTimeout(() => {
            resetBtn.textContent = originalText;
            resetBtn.style.background = '';
          }, 1500);
          
          return true;
        }, false).then(success => {
          if (!success) {
            PopupErrorHandler.showUserError('resetLearning', 'Failed to reset learning');
          }
        });
      });
    }

    // Whitelist button
    const whitelistBtn = document.getElementById('whitelist-btn');
    if (whitelistBtn) {
      whitelistBtn.addEventListener('click', async () => {
        return PopupErrorHandler.safeExecute('whitelistDomain', async () => {
          if (!currentTab || !currentTab.url) {
            throw new Error('No current tab for whitelist');
          }

          const hostname = extractHostname(currentTab.url);
          const domain = extractDomain(hostname);

          if (domain) {
            await chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.WHITELIST_DOMAIN,
              data: { domain }
            });

            // Show confirmation
            const btn = document.getElementById('whitelist-btn');
            if (btn) {
              const originalText = btn.textContent;
              btn.textContent = `✓ ${domain.toUpperCase()} TRUSTED`;
              btn.style.background = 'var(--green)';
              btn.style.color = 'var(--black)';
              
              // Close popup after a short delay
              setTimeout(() => {
                PopupErrorHandler.safeExecute('closePopup', () => window.close());
              }, 800);
            }
            
            return true;
          } else {
            throw new Error('No valid domain for whitelist');
          }
        }, false).then(success => {
          if (!success) {
            // Show error feedback
            const btn = document.getElementById('whitelist-btn');
            if (btn) {
              const originalText = btn.textContent;
              btn.textContent = '❌ FAILED';
              btn.style.background = 'var(--red)';
              btn.style.color = 'var(--white)';
              
              setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.style.color = '';
              }, 2000);
            }
          }
        });
      });
    }

    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        PopupErrorHandler.safeExecute('openSettings', () => {
          chrome.runtime.openOptionsPage();
        });
      });
    }
    
    return true;
  }, false);
}

/**
 * Show error state in popup
 */
function showErrorState() {
  return PopupErrorHandler.safeExecute('showErrorState', () => {
    const statsElements = ['trackers-blocked', 'ads-blocked', 'fingerprints-blocked', 'privacy-score'];
    statsElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = id === 'privacy-score' ? 'Error' : '—';
        element.style.color = 'var(--red)';
      }
    });
    
    const enabledCheckbox = document.getElementById('enabled');
    if (enabledCheckbox) {
      enabledCheckbox.disabled = true;
      enabledCheckbox.title = 'Extension error - check console';
    }
    
    return true;
  }, false);
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  PopupErrorHandler.safeExecute('popup.domReady', () => {
    initialize();
  }, false).then(success => {
    if (!success) {
      showErrorState();
    }
  });
});
