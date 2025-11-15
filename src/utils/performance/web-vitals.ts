/**
 * Web Vitals Performance Monitoring
 *
 * Tracks and reports Core Web Vitals metrics:
 * - CLS (Cumulative Layout Shift)
 * - INP (Interaction to Next Paint) - replaced FID in web-vitals v4+
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - TTFB (Time to First Byte)
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

import type { Metric } from 'web-vitals';

/**
 * Performance metric thresholds (in milliseconds or score)
 */
export const PERFORMANCE_THRESHOLDS = {
  FCP: {
    good: 1800,
    needsImprovement: 3000,
  },
  LCP: {
    good: 2500,
    needsImprovement: 4000,
  },
  INP: {
    good: 200,
    needsImprovement: 500,
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
  },
  TTFB: {
    good: 800,
    needsImprovement: 1800,
  },
} as const;

/**
 * Get rating for a metric based on thresholds
 */
function getRating(metric: Metric): 'good' | 'needs-improvement' | 'poor' {
  const name = metric.name as keyof typeof PERFORMANCE_THRESHOLDS;
  const thresholds = PERFORMANCE_THRESHOLDS[name];

  if (!thresholds) return 'good';

  if (metric.value <= thresholds.good) return 'good';
  if (metric.value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Format metric value for display
 */
function formatValue(metric: Metric): string {
  const value = metric.value;

  // CLS is unitless
  if (metric.name === 'CLS') {
    return value.toFixed(3);
  }

  // Time-based metrics in ms
  return `${Math.round(value)}ms`;
}

/**
 * Log metric to console with color coding
 */
function logMetric(metric: Metric): void {
  const rating = getRating(metric);
  const formattedValue = formatValue(metric);

  const colors = {
    good: '\x1b[32m', // Green
    'needs-improvement': '\x1b[33m', // Yellow
    poor: '\x1b[31m', // Red
  };

  const color = colors[rating];
  const reset = '\x1b[0m';

  console.log(
    `${color}[Performance] ${metric.name}: ${formattedValue} (${rating})${reset}`,
    metric,
  );
}

/**
 * Send metric to analytics service (placeholder)
 */
function sendToAnalytics(metric: Metric): void {
  // TODO: Integrate with analytics service (e.g., Google Analytics, PostHog)
  // Example:
  // gtag('event', metric.name, {
  //   value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
  //   metric_id: metric.id,
  //   metric_value: metric.value,
  //   metric_delta: metric.delta,
  // });

  // For now, just track in sessionStorage for debugging
  try {
    const metrics = JSON.parse(sessionStorage.getItem('web-vitals') || '[]');
    metrics.push({
      name: metric.name,
      value: metric.value,
      rating: getRating(metric),
      timestamp: Date.now(),
    });
    sessionStorage.setItem('web-vitals', JSON.stringify(metrics));
  } catch (error) {
    console.warn('Failed to store web vitals:', error);
  }
}

/**
 * Main function to report Web Vitals
 * Call this from your app's entry point
 */
export function reportWebVitals(onPerfEntry?: (metric: Metric) => void): void {
  const reportMetric = (metric: Metric) => {
    logMetric(metric);
    sendToAnalytics(metric);
    onPerfEntry?.(metric);
  };

  // Track all Core Web Vitals
  onCLS(reportMetric);
  onINP(reportMetric);
  onFCP(reportMetric);
  onLCP(reportMetric);
  onTTFB(reportMetric);
}

/**
 * Get all recorded metrics from sessionStorage
 */
export function getRecordedMetrics(): Array<{
  name: string;
  value: number;
  rating: string;
  timestamp: number;
}> {
  try {
    return JSON.parse(sessionStorage.getItem('web-vitals') || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear recorded metrics
 */
export function clearRecordedMetrics(): void {
  sessionStorage.removeItem('web-vitals');
}

/**
 * Export thresholds for use in tests or other utilities
 */
export { PERFORMANCE_THRESHOLDS as thresholds };
