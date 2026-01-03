// PrivacyShield Max - Social Widget Blocker
// Remove social media tracking widgets

import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';

class SocialWidgetBlocker {
  constructor() {
    this.blockedCount = 0;
    this.enabled = true;
  }

  /**
   * Initialize social widget blocker
   */
  async initialize() {
    const settings = await storageManager.getSettings();
    this.enabled = settings.socialWidgets !== 'allow';

    if (!this.enabled) {
      logger.info('Social widget blocking disabled');
      return;
    }

    // Block widgets
    this.blockAllWidgets();

    logger.info('Social widget blocker initialized');
  }

  /**
   * Block all social media widgets
   */
  blockAllWidgets() {
    this.blockFacebookWidgets();
    this.blockTwitterWidgets();
    this.blockLinkedInWidgets();
    this.blockPinterestWidgets();
    this.blockInstagramWidgets();
    this.blockYouTubeWidgets();
    this.blockRedditWidgets();
    this.blockGenericWidgets();

    if (this.blockedCount > 0) {
      logger.info(`Blocked ${this.blockedCount} social widgets`);
    }
  }

  /**
   * Block Facebook widgets and tracking
   */
  blockFacebookWidgets() {
    const facebookSelectors = [
      // Facebook Like button
      '.fb-like',
      '.fb-like-box',
      '.fb_iframe_widget',

      // Facebook Share button
      '.fb-share-button',

      // Facebook Page plugin
      '.fb-page',

      // Facebook Comments
      '.fb-comments',

      // Facebook Embedded posts
      '.fb-post',

      // Facebook iframes
      'iframe[src*="facebook.com/plugins"]',
      'iframe[src*="facebook.com/v2"]',
      'iframe[src*="facebook.com/widgets"]',
      'iframe[src*="www.facebook.com/tr"]',

      // Generic Facebook widgets
      '[class*="fb-"]',
      '[id*="fb-"]',
      '[data-href*="facebook.com"]'
    ];

    this.removeElements(facebookSelectors);

    // Block Facebook SDK initialization
    window.fbAsyncInit = function() {};
    delete window.FB;

    // Block Facebook pixel
    if (window._fbq) {
      window._fbq = function() {};
      window.fbq = function() {};
    }
  }

  /**
   * Block Twitter widgets
   */
  blockTwitterWidgets() {
    const twitterSelectors = [
      // Twitter share button
      '.twitter-share-button',
      'a.twitter-share-button',

      // Twitter follow button
      '.twitter-follow-button',

      // Twitter timeline
      '.twitter-timeline',

      // Twitter iframes
      'iframe[src*="platform.twitter.com"]',
      'iframe[src*="twitter.com/widgets"]',

      // Generic Twitter widgets
      '[class*="twitter-"]',
      '[data-twitter-extracted-i1576699221]'
    ];

    this.removeElements(twitterSelectors);

    // Block Twitter SDK
    if (window.twttr) {
      delete window.twttr;
    }
  }

  /**
   * Block LinkedIn widgets
   */
  blockLinkedInWidgets() {
    const linkedInSelectors = [
      // LinkedIn share button
      '.linkedin-share-button',
      '.IN-widget',

      // LinkedIn iframes
      'iframe[src*="linkedin.com/embed"]',
      'iframe[src*="platform.linkedin.com"]',

      // LinkedIn badges
      '.LI-profile-badge',
      '.LI-view-profile'
    ];

    this.removeElements(linkedInSelectors);
  }

  /**
   * Block Pinterest widgets
   */
  blockPinterestWidgets() {
    const pinterestSelectors = [
      // Pinterest Pin It button
      '[data-pin-do]',
      '.pinterest-share-button',

      // Pinterest iframes
      'iframe[src*="pinterest.com"]',
      'iframe[src*="assets.pinterest.com"]',

      // Pinterest embedded pins
      '[data-pin-id]',
      'span[data-pin-href]'
    ];

    this.removeElements(pinterestSelectors);

    // Block Pinterest SDK
    if (window.PinUtils) {
      delete window.PinUtils;
    }
  }

  /**
   * Block Instagram widgets
   */
  blockInstagramWidgets() {
    const instagramSelectors = [
      // Instagram embedded posts
      'blockquote.instagram-media',
      'iframe[src*="instagram.com/embed"]',
      'iframe[src*="instagram.com/p/"]',

      // Instagram widgets
      '[class*="instagram-"]',
      '[data-instgrm-permalink]'
    ];

    this.removeElements(instagramSelectors);

    // Block Instagram SDK
    if (window.instgrm) {
      delete window.instgrm;
    }
  }

  /**
   * Block YouTube widgets (tracking only, not embedded videos)
   */
  blockYouTubeWidgets() {
    // Replace YouTube iframes with privacy-enhanced version
    const youtubeIframes = document.querySelectorAll('iframe[src*="youtube.com/embed"]');

    youtubeIframes.forEach(iframe => {
      const src = iframe.src;

      // Replace with youtube-nocookie.com for privacy
      if (!src.includes('youtube-nocookie.com')) {
        iframe.src = src.replace('youtube.com', 'youtube-nocookie.com');
        this.blockedCount++;

        logger.debug('YouTube iframe converted to privacy mode');
      }
    });

    // Block YouTube tracking widgets
    const trackingSelectors = [
      '.youtube-subscribe-button',
      '[class*="yt-subscribe"]'
    ];

    this.removeElements(trackingSelectors);
  }

  /**
   * Block Reddit widgets
   */
  blockRedditWidgets() {
    const redditSelectors = [
      // Reddit embedded posts
      'iframe[src*="reddit.com/embed"]',
      'iframe[src*="redd.it/embed"]',

      // Reddit widgets
      '[data-embed-type="reddit"]'
    ];

    this.removeElements(redditSelectors);
  }

  /**
   * Block generic social widgets
   */
  blockGenericWidgets() {
    const genericSelectors = [
      // Generic share buttons
      '.social-share',
      '.share-buttons',
      '.social-buttons',
      '[class*="share-btn"]',
      '[class*="social-btn"]',

      // AddThis, ShareThis
      '.addthis_toolbox',
      '.addthis_sharing_toolbox',
      '.sharethis-inline-share-buttons',

      // Disqus comments
      '#disqus_thread',
      'iframe[src*="disqus.com"]',

      // Generic social media containers
      '[class*="social-media"]',
      '[class*="socialmedia"]',
      '[id*="social-media"]',
      '[id*="socialmedia"]'
    ];

    this.removeElements(genericSelectors);

    // Block common social SDKs
    this.blockSocialSDKs();
  }

  /**
   * Block social media SDKs
   */
  blockSocialSDKs() {
    // AddThis
    if (window.addthis) {
      delete window.addthis;
    }

    // ShareThis
    if (window.sharethis) {
      delete window.sharethis;
    }

    // Disqus
    if (window.DISQUS) {
      delete window.DISQUS;
      window.DISQUS_DISABLE_TRACKING = true;
    }

    logger.debug('Social SDKs blocked');
  }

  /**
   * Remove elements matching selectors
   * @param {Array} selectors - CSS selectors
   */
  removeElements(selectors) {
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);

        elements.forEach(element => {
          // Hide instead of remove to avoid breaking page layout
          element.style.setProperty('display', 'none', 'important');
          element.style.setProperty('visibility', 'hidden', 'important');
          element.setAttribute('data-privacy-social-blocked', 'true');

          this.blockedCount++;
        });

      } catch (error) {
        logger.warn('Invalid selector:', selector, error);
      }
    }
  }

  /**
   * Replace social widget with placeholder
   * @param {Element} element - Widget element
   * @param {string} platform - Social platform name
   */
  replaceSocialPlaceholder(element, platform) {
    const placeholder = document.createElement('div');
    placeholder.className = 'privacy-widget-placeholder';
    placeholder.innerHTML = `
      <div style="
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 20px;
        text-align: center;
        color: #666;
        font-family: sans-serif;
      ">
        <p><strong>${platform} widget blocked</strong></p>
        <p style="font-size: 12px;">This widget was blocked to protect your privacy.</p>
        <button onclick="this.parentElement.parentElement.remove();" style="
          background: #4CAF50;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        ">Remove</button>
      </div>
    `;

    element.parentNode.replaceChild(placeholder, element);
  }

  /**
   * Observe and block dynamically added widgets
   * @param {Function} observerCallback - Mutation observer callback
   */
  observeDynamic(observerCallback) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
          // Re-run blocking on new nodes
          this.blockAllWidgets();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    logger.debug('Dynamic social widget blocking enabled');
  }

  /**
   * Get blocking statistics
   * @returns {Object} - Blocking stats
   */
  getStats() {
    return {
      blockedCount: this.blockedCount,
      enabled: this.enabled
    };
  }

  /**
   * Disable social widget blocking
   */
  disable() {
    this.enabled = false;
    logger.info('Social widget blocking disabled');
  }

  /**
   * Enable social widget blocking
   */
  enable() {
    this.enabled = true;
    this.blockAllWidgets();
    logger.info('Social widget blocking enabled');
  }
}

// Export singleton instance
const socialWidgetBlocker = new SocialWidgetBlocker();
export default socialWidgetBlocker;
export { SocialWidgetBlocker };
