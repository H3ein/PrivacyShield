// PrivacyShield Max - Messaging Hub
// Inter-script communication and message routing

import { MESSAGE_TYPES } from './constants.js';
import { getBrowserAPI } from './utils.js';

class MessagingHub {
  constructor() {
    this.browserAPI = getBrowserAPI();
    this.handlers = new Map();
    this.pendingRequests = new Map();
    this.requestId = 0;
  }

  /**
   * Initialize messaging hub
   */
  initialize() {
    if (!this.browserAPI || !this.browserAPI.runtime) {
      console.warn('Runtime API not available');
      return;
    }

    // Listen for messages
    this.browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async response
    });

    console.log('PrivacyShield Max - Messaging hub initialized');
  }

  /**
   * Register message handler
   * @param {string} type - Message type
   * @param {Function} handler - Handler function
   */
  on(type, handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type).push(handler);
  }

  /**
   * Unregister message handler
   * @param {string} type - Message type
   * @param {Function} handler - Handler function
   */
  off(type, handler) {
    if (this.handlers.has(type)) {
      const handlers = this.handlers.get(type);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle incoming message
   * @param {Object} message - Message object
   * @param {Object} sender - Sender info
   * @param {Function} sendResponse - Response callback
   */
  async handleMessage(message, sender, sendResponse) {
    if (!message || !message.type) {
      console.warn('Invalid message received:', message);
      return;
    }

    // Handle response to pending request
    if (message._responseToRequest) {
      this.handleResponse(message);
      return;
    }

    const handlers = this.handlers.get(message.type);

    if (!handlers || handlers.length === 0) {
      console.warn('No handler for message type:', message.type);
      sendResponse({ error: 'No handler for message type' });
      return;
    }

    try {
      // Execute all handlers
      const results = await Promise.all(
        handlers.map(handler => handler(message.data, sender))
      );

      // Send first non-undefined result
      const result = results.find(r => r !== undefined);
      sendResponse({ success: true, data: result });

    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Handle response to request
   * @param {Object} message - Response message
   */
  handleResponse(message) {
    const requestId = message._responseToRequest;
    const pending = this.pendingRequests.get(requestId);

    if (pending) {
      this.pendingRequests.delete(requestId);

      if (message.success) {
        pending.resolve(message.data);
      } else {
        pending.reject(new Error(message.error || 'Request failed'));
      }
    }
  }

  /**
   * Send message
   * @param {string} type - Message type
   * @param {any} data - Message data
   * @param {Object} options - Options (tabId, frameId, etc.)
   * @returns {Promise<any>} - Response data
   */
  async send(type, data = null, options = {}) {
    if (!this.browserAPI || !this.browserAPI.runtime) {
      throw new Error('Runtime API not available');
    }

    const message = {
      type,
      data,
      _requestId: ++this.requestId,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      // Store pending request
      this.pendingRequests.set(message._requestId, { resolve, reject });

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message._requestId);
        reject(new Error('Message timeout'));
      }, options.timeout || 5000);

      // Send message
      const sendPromise = options.tabId
        ? this.browserAPI.tabs.sendMessage(options.tabId, message, options)
        : this.browserAPI.runtime.sendMessage(message, options);

      sendPromise
        .then(response => {
          clearTimeout(timeout);
          this.pendingRequests.delete(message._requestId);

          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Request failed'));
          }
        })
        .catch(error => {
          clearTimeout(timeout);
          this.pendingRequests.delete(message._requestId);
          reject(error);
        });
    });
  }

  /**
   * Send message to specific tab
   * @param {number} tabId - Tab ID
   * @param {string} type - Message type
   * @param {any} data - Message data
   * @returns {Promise<any>} - Response data
   */
  async sendToTab(tabId, type, data = null) {
    return this.send(type, data, { tabId });
  }

  /**
   * Send message to all tabs
   * @param {string} type - Message type
   * @param {any} data - Message data
   * @returns {Promise<any[]>} - Array of responses
   */
  async sendToAllTabs(type, data = null) {
    if (!this.browserAPI || !this.browserAPI.tabs) {
      throw new Error('Tabs API not available');
    }

    const tabs = await this.browserAPI.tabs.query({});
    const promises = tabs.map(tab =>
      this.sendToTab(tab.id, type, data).catch(error => {
        console.warn(`Failed to send to tab ${tab.id}:`, error);
        return null;
      })
    );

    return Promise.all(promises);
  }

  /**
   * Broadcast message (fire and forget)
   * @param {string} type - Message type
   * @param {any} data - Message data
   */
  broadcast(type, data = null) {
    const message = { type, data, timestamp: Date.now() };

    if (!this.browserAPI || !this.browserAPI.runtime) {
      console.warn('Runtime API not available');
      return;
    }

    this.browserAPI.runtime.sendMessage(message).catch(error => {
      // Ignore errors for broadcast
      console.debug('Broadcast error:', error);
    });
  }

  /**
   * Convenience methods for common message types
   */

  async getSettings() {
    return this.send(MESSAGE_TYPES.GET_SETTINGS);
  }

  async updateSettings(settings) {
    return this.send(MESSAGE_TYPES.UPDATE_SETTINGS, settings);
  }

  async getStats() {
    return this.send(MESSAGE_TYPES.GET_STATS);
  }

  async getPrivacyScore(domain) {
    return this.send(MESSAGE_TYPES.GET_PRIVACY_SCORE, { domain });
  }

  async toggleEnabled() {
    return this.send(MESSAGE_TYPES.TOGGLE_ENABLED);
  }

  async changeMode(mode) {
    return this.send(MESSAGE_TYPES.CHANGE_MODE, { mode });
  }

  async whitelistDomain(domain) {
    return this.send(MESSAGE_TYPES.WHITELIST_DOMAIN, { domain });
  }

  async temporaryWhitelist(domain, duration) {
    return this.send(MESSAGE_TYPES.TEMPORARY_WHITELIST, { domain, duration });
  }

  async blockElement(selector, domain) {
    return this.send(MESSAGE_TYPES.BLOCK_ELEMENT, { selector, domain });
  }

  async updateFilters() {
    return this.send(MESSAGE_TYPES.UPDATE_FILTERS);
  }

  async showNotification(title, message, options = {}) {
    return this.send(MESSAGE_TYPES.SHOW_NOTIFICATION, { title, message, options });
  }
}

// Export singleton instance
const messagingHub = new MessagingHub();
export default messagingHub;
export { MessagingHub, MESSAGE_TYPES };
