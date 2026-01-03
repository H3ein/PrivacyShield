// PrivacyShield Max - Throttled Mutation Observer
// Efficient DOM monitoring with throttling

import logger from '../core/logger.js';

class ThrottledMutationObserver {
  constructor(callback, options = {}) {
    this.callback = callback;
    this.options = {
      throttle: options.throttle || 200, // Default 200ms throttle
      debounce: options.debounce || false,
      maxBatchSize: options.maxBatchSize || 100
    };

    this.mutations = [];
    this.scheduled = false;
    this.observer = null;
    this.lastExecution = 0;
  }

  /**
   * Start observing
   * @param {Node} target - Target node
   * @param {Object} config - MutationObserver config
   */
  observe(target, config) {
    if (this.observer) {
      this.disconnect();
    }

    this.observer = new MutationObserver((mutationsList) => {
      this.handleMutations(mutationsList);
    });

    this.observer.observe(target, config);
    logger.debug('Mutation observer started');
  }

  /**
   * Handle incoming mutations
   * @param {Array} mutationsList - Array of MutationRecord
   */
  handleMutations(mutationsList) {
    // Add mutations to buffer
    this.mutations.push(...mutationsList);

    // Limit buffer size
    if (this.mutations.length > this.options.maxBatchSize) {
      this.mutations = this.mutations.slice(-this.options.maxBatchSize);
    }

    // Schedule execution
    this.schedule();
  }

  /**
   * Schedule callback execution
   */
  schedule() {
    if (this.scheduled) return;

    this.scheduled = true;

    if (this.options.debounce) {
      // Debounce mode: delay execution until mutations stop
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.execute();
      }, this.options.throttle);

    } else {
      // Throttle mode: execute at most once per throttle interval
      const timeSinceLastExecution = Date.now() - this.lastExecution;

      if (timeSinceLastExecution >= this.options.throttle) {
        // Execute immediately
        this.execute();
      } else {
        // Schedule for later
        const delay = this.options.throttle - timeSinceLastExecution;
        setTimeout(() => {
          this.execute();
        }, delay);
      }
    }
  }

  /**
   * Execute callback with buffered mutations
   */
  execute() {
    if (this.mutations.length === 0) {
      this.scheduled = false;
      return;
    }

    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.executeCallback();
      }, { timeout: 200 });
    } else {
      // Fallback to requestAnimationFrame
      requestAnimationFrame(() => {
        this.executeCallback();
      });
    }
  }

  /**
   * Execute the actual callback
   */
  executeCallback() {
    const mutationsToProcess = [...this.mutations];
    this.mutations = [];
    this.scheduled = false;
    this.lastExecution = Date.now();

    try {
      this.callback(mutationsToProcess);
    } catch (error) {
      logger.error('Mutation callback error:', error);
    }
  }

  /**
   * Disconnect observer
   */
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.mutations = [];
    this.scheduled = false;

    logger.debug('Mutation observer stopped');
  }

  /**
   * Get statistics
   * @returns {Object} - Observer stats
   */
  getStats() {
    return {
      bufferedMutations: this.mutations.length,
      scheduled: this.scheduled,
      lastExecution: this.lastExecution
    };
  }
}

/**
 * Create a smart mutation observer for blocking new elements
 * @param {Function} blockCallback - Function to call when new elements detected
 * @returns {ThrottledMutationObserver} - Observer instance
 */
export function createBlockingObserver(blockCallback) {
  return new ThrottledMutationObserver((mutations) => {
    const addedNodes = [];

    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            addedNodes.push(node);
          }
        });
      }
    });

    if (addedNodes.length > 0) {
      blockCallback(addedNodes);
    }

  }, {
    throttle: 200,
    maxBatchSize: 100
  });
}

/**
 * Create a debounced mutation observer
 * @param {Function} callback - Callback function
 * @param {number} delay - Debounce delay in ms
 * @returns {ThrottledMutationObserver} - Observer instance
 */
export function createDebouncedObserver(callback, delay = 300) {
  return new ThrottledMutationObserver(callback, {
    throttle: delay,
    debounce: true
  });
}

export default ThrottledMutationObserver;
export { ThrottledMutationObserver };
