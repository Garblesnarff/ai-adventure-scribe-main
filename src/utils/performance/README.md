# Performance Monitoring Utilities

This directory contains utilities for monitoring and reporting application performance metrics.

## Web Vitals Tracking

The `web-vitals.ts` module provides automated tracking of Core Web Vitals:

- **FCP (First Contentful Paint)**: Time until first content is painted
- **LCP (Largest Contentful Paint)**: Time until largest content element is painted
- **FID (First Input Delay)**: Time from first user interaction to browser response
- **CLS (Cumulative Layout Shift)**: Visual stability metric
- **TTFB (Time to First Byte)**: Time until first byte is received from server

### Usage

Import and call `reportWebVitals()` in your app's entry point:

```typescript
import { reportWebVitals } from './utils/performance/web-vitals';

// Basic usage - logs to console and sessionStorage
reportWebVitals();

// With custom callback
reportWebVitals((metric) => {
  // Send to your analytics service
  console.log(metric);
});
```

### Performance Thresholds

Metrics are rated as "good", "needs-improvement", or "poor" based on Google's recommended thresholds:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| FCP | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| LCP | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| FID | ≤ 100ms | ≤ 300ms | > 300ms |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| TTFB | ≤ 800ms | ≤ 1.8s | > 1.8s |

### Viewing Metrics

Metrics are automatically stored in `sessionStorage` and can be retrieved:

```typescript
import { getRecordedMetrics, clearRecordedMetrics } from './utils/performance/web-vitals';

// Get all metrics
const metrics = getRecordedMetrics();
console.table(metrics);

// Clear metrics
clearRecordedMetrics();
```

### Integration with Analytics

To send metrics to an analytics service, modify the `sendToAnalytics()` function in `web-vitals.ts`:

```typescript
function sendToAnalytics(metric: Metric): void {
  // Example: Google Analytics
  gtag('event', metric.name, {
    value: Math.round(metric.value),
    metric_id: metric.id,
  });

  // Example: Custom API
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify(metric),
  });
}
```

## Performance Budget

See `PERFORMANCE_BUDGET.md` in the project root for target metrics and monitoring guidelines.

## Lighthouse CI

Performance audits are automated via Lighthouse CI. See `lighthouserc.json` for configuration.

Run audits with:
```bash
npm run lighthouse        # Desktop audit
npm run lighthouse:mobile # Mobile audit
npm run perf:analyze      # Full analysis with build
```
