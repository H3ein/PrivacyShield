// PrivacyShield Max - AMP Redirector
// Bypass Google AMP, Facebook Instant Articles, and other privacy-invasive wrappers

import logger from '../core/logger.js';
import storageManager from '../core/storage-manager.js';

class AMPRedirector {
  constructor() {
    this.enabled = true;
    this.redirected = false;
  }

  /**
   * Initialize AMP redirector
   */
  async initialize() {
    const settings = await storageManager.getSettings();
    this.enabled = settings.ampRedirect !== false;

    if (!this.enabled) {
      logger.info('AMP redirection disabled');
      return;
    }

    // Check if current page needs redirection
    this.checkAndRedirect();

    logger.info('AMP redirector initialized');
  }

  /**
   * Check current page and redirect if necessary
   */
  checkAndRedirect() {
    const url = window.location.href;
    const hostname = window.location.hostname;

    // Google AMP
    if (this.isGoogleAMP(url, hostname)) {
      this.redirectFromGoogleAMP();
    }

    // Facebook Instant Articles
    else if (this.isFacebookInstant(url, hostname)) {
      this.redirectFromFacebookInstant();
    }

    // Yandex Turbo Pages
    else if (this.isYandexTurbo(url, hostname)) {
      this.redirectFromYandexTurbo();
    }

    // Apple News
    else if (this.isAppleNews(url, hostname)) {
      this.redirectFromAppleNews();
    }

    // Bing AMP
    else if (this.isBingAMP(url, hostname)) {
      this.redirectFromBingAMP();
    }

    // Generic AMP detection (amp=1, ?amp, /amp/)
    else if (this.isGenericAMP(url)) {
      this.redirectFromGenericAMP();
    }
  }

  /**
   * Check if page is Google AMP
   * @param {string} url - Current URL
   * @param {string} hostname - Current hostname
   * @returns {boolean} - True if Google AMP
   */
  isGoogleAMP(url, hostname) {
    return (
      hostname === 'www.google.com' &&
      (url.includes('/amp/') || url.includes('amp_js_v='))
    ) || (
      hostname.includes('cdn.ampproject.org') ||
      hostname.includes('ampproject.net')
    );
  }

  /**
   * Redirect from Google AMP to original article
   */
  redirectFromGoogleAMP() {
    const url = new URL(window.location.href);

    // Method 1: Extract from URL parameter
    let originalUrl = url.searchParams.get('url');

    // Method 2: Extract from pathname
    if (!originalUrl && url.pathname.includes('/amp/')) {
      const pathParts = url.pathname.split('/amp/');
      if (pathParts[1]) {
        try {
          originalUrl = decodeURIComponent(pathParts[1]);

          // Add protocol if missing
          if (!originalUrl.startsWith('http')) {
            originalUrl = 'https://' + originalUrl;
          }
        } catch (e) {
          logger.error('Failed to decode AMP URL:', e);
        }
      }
    }

    // Method 3: Check for canonical link
    if (!originalUrl) {
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical && canonical.href) {
        originalUrl = canonical.href;
      }
    }

    // Method 4: Check for amphtml link (reverse lookup)
    if (!originalUrl) {
      const amphtml = document.querySelector('link[rel="amphtml"]');
      if (amphtml && amphtml.href) {
        // If we're on AMP and there's an amphtml link, it's pointing to non-AMP
        originalUrl = window.location.href.replace(/\/amp\/.*/, '');
      }
    }

    if (originalUrl && originalUrl !== window.location.href) {
      this.performRedirect(originalUrl, 'Google AMP');
    } else {
      logger.warn('Could not extract original URL from Google AMP');
    }
  }

  /**
   * Check if page is Facebook Instant Article
   * @param {string} url - Current URL
   * @param {string} hostname - Current hostname
   * @returns {boolean} - True if Facebook Instant
   */
  isFacebookInstant(url, hostname) {
    return (
      hostname.includes('facebook.com') &&
      (url.includes('/instant_article/') || url.includes('?instant_article'))
    );
  }

  /**
   * Redirect from Facebook Instant Article
   */
  redirectFromFacebookInstant() {
    // Extract original URL from Facebook wrapper
    const url = new URL(window.location.href);
    let originalUrl = url.searchParams.get('url');

    // Check canonical link
    if (!originalUrl) {
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical && canonical.href && !canonical.href.includes('facebook.com')) {
        originalUrl = canonical.href;
      }
    }

    // Check for external link in meta
    if (!originalUrl) {
      const metaUrl = document.querySelector('meta[property="og:url"]');
      if (metaUrl && metaUrl.content && !metaUrl.content.includes('facebook.com')) {
        originalUrl = metaUrl.content;
      }
    }

    if (originalUrl && originalUrl !== window.location.href) {
      this.performRedirect(originalUrl, 'Facebook Instant Article');
    }
  }

  /**
   * Check if page is Yandex Turbo Page
   * @param {string} url - Current URL
   * @param {string} hostname - Current hostname
   * @returns {boolean} - True if Yandex Turbo
   */
  isYandexTurbo(url, hostname) {
    return hostname.includes('yandex.') && url.includes('/turbo');
  }

  /**
   * Redirect from Yandex Turbo Page
   */
  redirectFromYandexTurbo() {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href && !canonical.href.includes('yandex')) {
      this.performRedirect(canonical.href, 'Yandex Turbo Page');
    }
  }

  /**
   * Check if page is Apple News
   * @param {string} url - Current URL
   * @param {string} hostname - Current hostname
   * @returns {boolean} - True if Apple News
   */
  isAppleNews(url, hostname) {
    return hostname.includes('apple.news') || hostname.includes('apple.com/news');
  }

  /**
   * Redirect from Apple News
   */
  redirectFromAppleNews() {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href && !canonical.href.includes('apple')) {
      this.performRedirect(canonical.href, 'Apple News');
    }
  }

  /**
   * Check if page is Bing AMP
   * @param {string} url - Current URL
   * @param {string} hostname - Current hostname
   * @returns {boolean} - True if Bing AMP
   */
  isBingAMP(url, hostname) {
    return hostname.includes('bing.com') && url.includes('/amp/');
  }

  /**
   * Redirect from Bing AMP
   */
  redirectFromBingAMP() {
    const url = new URL(window.location.href);
    const originalUrl = url.searchParams.get('url');

    if (originalUrl) {
      this.performRedirect(originalUrl, 'Bing AMP');
    }
  }

  /**
   * Check if page has generic AMP indicators
   * @param {string} url - Current URL
   * @returns {boolean} - True if generic AMP
   */
  isGenericAMP(url) {
    return (
      url.includes('?amp') ||
      url.includes('&amp') ||
      url.includes('amp=1') ||
      url.includes('/amp/') ||
      url.endsWith('/amp')
    );
  }

  /**
   * Redirect from generic AMP page
   */
  redirectFromGenericAMP() {
    // Try canonical link first
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href) {
      const canonicalUrl = canonical.href;

      // Make sure canonical is not also AMP
      if (!canonicalUrl.includes('/amp') && !canonicalUrl.includes('amp=')) {
        this.performRedirect(canonicalUrl, 'Generic AMP');
        return;
      }
    }

    // Try removing AMP parameters from URL
    let cleanUrl = window.location.href;

    // Remove query parameters
    cleanUrl = cleanUrl.replace(/[?&]amp=1/g, '');
    cleanUrl = cleanUrl.replace(/[?&]amp/g, '');

    // Remove /amp/ from path
    cleanUrl = cleanUrl.replace(/\/amp\/?$/g, '');
    cleanUrl = cleanUrl.replace(/\/amp\//g, '/');

    // Clean up query string
    cleanUrl = cleanUrl.replace(/\?&/, '?');
    cleanUrl = cleanUrl.replace(/\?$/, '');

    if (cleanUrl !== window.location.href) {
      this.performRedirect(cleanUrl, 'Generic AMP');
    }
  }

  /**
   * Perform the redirect
   * @param {string} url - Target URL
   * @param {string} source - Source type (for logging)
   */
  performRedirect(url, source) {
    if (this.redirected) {
      // Prevent redirect loops
      logger.warn('Redirect loop detected, aborting');
      return;
    }

    try {
      // Validate URL
      const parsedUrl = new URL(url);

      // Don't redirect to same URL
      if (parsedUrl.href === window.location.href) {
        return;
      }

      this.redirected = true;

      logger.info(`Redirecting from ${source} to original URL:`, url);

      // Perform redirect
      window.location.replace(url);

    } catch (error) {
      logger.error('Invalid redirect URL:', error);
    }
  }

  /**
   * Remove AMP components from page (if redirect fails)
   */
  removeAMPComponents() {
    // Remove AMP scripts
    const ampScripts = document.querySelectorAll('script[src*="ampproject.org"]');
    ampScripts.forEach(script => script.remove());

    // Remove AMP custom elements
    const ampElements = document.querySelectorAll('[class*="amp-"]');
    ampElements.forEach(element => {
      // Try to replace with standard HTML
      if (element.tagName === 'AMP-IMG') {
        const img = document.createElement('img');
        img.src = element.getAttribute('src');
        img.alt = element.getAttribute('alt') || '';
        element.parentNode.replaceChild(img, element);
      }
    });

    // Remove AMP boilerplate styles
    const ampBoilerplate = document.querySelector('style[amp-boilerplate]');
    if (ampBoilerplate) {
      ampBoilerplate.remove();
    }

    logger.info('AMP components removed from page');
  }

  /**
   * Disable AMP redirection
   */
  disable() {
    this.enabled = false;
    logger.info('AMP redirection disabled');
  }

  /**
   * Enable AMP redirection
   */
  enable() {
    this.enabled = true;
    logger.info('AMP redirection enabled');
  }

  /**
   * Get redirection status
   * @returns {Object} - Status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      redirected: this.redirected
    };
  }
}

// Export singleton instance
const ampRedirector = new AMPRedirector();
export default ampRedirector;
export { AMPRedirector };
