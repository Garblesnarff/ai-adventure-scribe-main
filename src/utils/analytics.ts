import { logger } from '@/lib/logger';

/**
 * Google Analytics Initialization
 *
 * Initializes GA4 tracking if a measurement ID is configured.
 * This should be called early in the application lifecycle (e.g., from main.tsx).
 *
 * Configuration:
 * - Set VITE_GA_MEASUREMENT_ID in your .env file
 * - If not configured, a warning will be logged but the app will continue to work
 *
 * @example
 * // In main.tsx
 * initializeAnalytics();
 */
export function initializeAnalytics(): void {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  // Warn if not configured, but don't throw - analytics is optional
  if (!measurementId) {
    logger.warn('Google Analytics not configured', {
      hint: 'Set VITE_GA_MEASUREMENT_ID in .env to enable analytics',
      impact: 'Analytics tracking is disabled',
    });
    return;
  }

  // Validate measurement ID format (should be G-XXXXXXXXXX)
  if (!measurementId.startsWith('G-') || measurementId.length < 10) {
    logger.warn('Invalid Google Analytics measurement ID format', {
      provided: measurementId,
      expected: 'G-XXXXXXXXXX format',
      impact: 'Analytics tracking may not work correctly',
    });
  }

  try {
    // Initialize dataLayer if it doesn't exist
    window.dataLayer = window.dataLayer || [];

    // Define gtag function
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }

    // Make gtag globally available
    (window as any).gtag = gtag;

    // Initialize with current timestamp
    gtag('js', new Date());

    // Configure GA4 with the measurement ID
    gtag('config', measurementId, {
      page_path: window.location.pathname,
      send_page_view: true,
    });

    // Load the GA4 script dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    logger.info('Google Analytics initialized', {
      measurementId,
      path: window.location.pathname,
    });
  } catch (error) {
    logger.error('Failed to initialize Google Analytics', {
      error,
      measurementId,
    });
  }
}

/**
 * Track a custom event in Google Analytics
 *
 * @param eventName - The name of the event to track
 * @param eventParams - Optional parameters for the event
 *
 * @example
 * trackEvent('button_click', { button_name: 'start_adventure' });
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>): void {
  if (typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', eventName, eventParams);
    logger.debug('Analytics event tracked', { eventName, eventParams });
  } else {
    logger.debug('Analytics not initialized, event not tracked', { eventName, eventParams });
  }
}

/**
 * Track a page view in Google Analytics
 *
 * @param pagePath - The path of the page to track
 * @param pageTitle - Optional title for the page
 *
 * @example
 * trackPageView('/adventure/123', 'Adventure: Dark Forest');
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle,
    });
    logger.debug('Page view tracked', { pagePath, pageTitle });
  } else {
    logger.debug('Analytics not initialized, page view not tracked', { pagePath, pageTitle });
  }
}

// Extend Window interface to include dataLayer
declare global {
  interface Window {
    dataLayer: any[];
  }
}
