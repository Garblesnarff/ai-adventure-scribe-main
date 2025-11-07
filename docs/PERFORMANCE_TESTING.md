# Performance Testing Guide

This guide covers how to run performance tests, analyze results, and optimize the AI Adventure Scribe application.

## Quick Start

### Run Full Performance Analysis

```bash
# Desktop performance audit
npm run perf:analyze

# Mobile performance audit
npm run perf:analyze:mobile

# View formatted report
npm run perf:report
```

### View Web Vitals in Development

Web Vitals are automatically tracked in development. Metrics are logged to the console and stored in `sessionStorage`.

To view the in-app performance monitor:

1. Open the application in development mode: `npm run dev`
2. The Performance Monitor appears in the bottom-right corner
3. Click "Show Performance" to see live metrics
4. Interact with the app to generate metrics

Alternatively, open your browser console and run:

```javascript
// Get all recorded metrics
JSON.parse(sessionStorage.getItem('web-vitals'))

// Clear metrics
sessionStorage.removeItem('web-vitals')
```

## Lighthouse CI

### Configuration Files

- **`lighthouserc.json`**: Desktop performance configuration
- **`.lighthouserc-mobile.json`**: Mobile performance configuration

### Running Lighthouse

```bash
# Desktop audit (3 runs, averaged)
npm run lighthouse:desktop

# Mobile audit (simulated mobile device)
npm run lighthouse:mobile

# Quick audit (uses default config)
npm run lighthouse
```

### Understanding Results

Lighthouse results are stored in `.lighthouseci/` directory. Each run creates a JSON report containing:

- **Performance Score**: Overall performance rating (0-100)
- **Core Web Vitals**: FCP, LCP, CLS, TBT metrics
- **Opportunities**: Specific optimization suggestions with potential savings
- **Diagnostics**: Detailed information about resource loading, JavaScript execution, etc.

### Performance Budgets

The following budgets are enforced in CI:

| Metric | Desktop Target | Mobile Target |
|--------|---------------|---------------|
| Performance Score | ≥ 85 | ≥ 75 |
| Accessibility Score | ≥ 90 | ≥ 90 |
| Best Practices Score | ≥ 85 | ≥ 85 |
| FCP | < 2.0s | < 3.0s |
| LCP | < 2.5s | < 4.0s |
| CLS | < 0.1 | < 0.1 |
| TBT | < 300ms | < 600ms |

## Web Vitals Tracking

### What Are Core Web Vitals?

Core Web Vitals are a set of metrics that measure real-world user experience:

1. **LCP (Largest Contentful Paint)**: Loading performance
   - Measures when the main content is visible
   - Target: < 2.5s (good), < 4.0s (needs improvement)

2. **FID (First Input Delay)**: Interactivity
   - Measures responsiveness to first user interaction
   - Target: < 100ms (good), < 300ms (needs improvement)

3. **CLS (Cumulative Layout Shift)**: Visual stability
   - Measures unexpected layout shifts
   - Target: < 0.1 (good), < 0.25 (needs improvement)

### Additional Metrics

- **FCP (First Contentful Paint)**: Time to first content
- **TTFB (Time to First Byte)**: Server response time
- **TBT (Total Blocking Time)**: Main thread blocking time
- **TTI (Time to Interactive)**: Time to full interactivity

### Implementing Web Vitals

The `src/utils/performance/web-vitals.ts` module automatically tracks all Core Web Vitals:

```typescript
import { reportWebVitals } from './utils/performance/web-vitals';

// In your app entry point (main.tsx)
reportWebVitals();

// With custom callback for analytics
reportWebVitals((metric) => {
  // Send to analytics service
  console.log(metric.name, metric.value);
});
```

## Performance Optimization Strategies

### 1. JavaScript Bundle Optimization

**Problem**: Large JavaScript bundles slow down initial load.

**Solutions**:

```bash
# Analyze bundle size
npm run build
npx vite-bundle-visualizer

# Check for duplicate dependencies
npm run check-deps
```

**Best Practices**:
- Code-split routes using React lazy loading
- Remove unused dependencies
- Use tree-shaking to eliminate dead code
- Minimize third-party scripts

### 2. Image Optimization

**Problem**: Large images increase LCP and bandwidth usage.

**Solutions**:
- Convert images to WebP format
- Implement responsive images with `srcset`
- Use lazy loading for offscreen images
- Compress images (aim for < 100KB for hero images)

**Example**:

```tsx
<img
  src="/images/hero.webp"
  srcSet="/images/hero-small.webp 480w, /images/hero-large.webp 1200w"
  sizes="(max-width: 768px) 100vw, 1200px"
  loading="lazy"
  alt="Hero image"
/>
```

### 3. CSS Optimization

**Problem**: Large CSS files and unused styles.

**Solutions**:
- Use Tailwind's purge feature (enabled by default)
- Inline critical CSS for above-the-fold content
- Defer non-critical CSS

**Example**:

```html
<!-- Critical CSS inline -->
<style>
  /* Above-the-fold styles */
</style>

<!-- Defer non-critical CSS -->
<link rel="preload" href="/styles/non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

### 4. Reducing Layout Shift (CLS)

**Problem**: Content jumping as resources load.

**Solutions**:
- Reserve space for images and ads
- Use CSS aspect-ratio
- Avoid inserting content above existing content

**Example**:

```css
/* Reserve space for 16:9 image */
.image-container {
  aspect-ratio: 16 / 9;
}
```

### 5. Optimizing Third-Party Scripts

**Problem**: Blocking scripts slow down interactivity.

**Solutions**:
- Use `async` or `defer` attributes
- Lazy-load analytics and non-critical scripts
- Minimize number of third-party scripts

**Example**:

```html
<!-- Good: Deferred script -->
<script src="/analytics.js" defer></script>

<!-- Bad: Blocking script -->
<script src="/analytics.js"></script>
```

### 6. Server Response Time (TTFB)

**Problem**: Slow server responses delay everything.

**Solutions**:
- Use CDN for static assets
- Implement server-side caching
- Optimize database queries
- Use HTTP/2 or HTTP/3

### 7. Font Loading Optimization

**Problem**: Font loading blocks rendering or causes FOUT (Flash of Unstyled Text).

**Solutions**:

```css
/* Use font-display to control loading behavior */
@font-face {
  font-family: 'MedievalSharp';
  src: url('/fonts/medievalsharp.woff2') format('woff2');
  font-display: swap; /* Show fallback immediately */
}
```

**Best Practices**:
- Use `font-display: swap` for better perceived performance
- Preload critical fonts
- Subset fonts to reduce file size
- Use variable fonts when possible

## Performance Testing Workflow

### Development Phase

1. **Enable Performance Monitor**:
   - Development builds automatically track Web Vitals
   - Check console for real-time metrics
   - Use Performance Monitor component for visual feedback

2. **Profile Components**:
   ```tsx
   import { Profiler } from 'react';

   <Profiler id="MyComponent" onRender={onRenderCallback}>
     <MyComponent />
   </Profiler>
   ```

3. **Monitor Network Tab**:
   - Check for large resources (> 100KB)
   - Look for duplicate requests
   - Identify slow API calls

### Pre-Commit Phase

1. **Run Lighthouse**:
   ```bash
   npm run lighthouse
   ```

2. **Check Bundle Size**:
   ```bash
   npm run build
   # Check output for warnings about large chunks
   ```

3. **Review Performance Report**:
   ```bash
   npm run perf:report
   ```

### CI/CD Phase

Lighthouse CI runs automatically on pull requests and enforces performance budgets:

- Performance score must be ≥ 85 (desktop) or ≥ 75 (mobile)
- Core Web Vitals must meet targets
- Bundle size must be within budget

### Production Monitoring

1. **Real User Monitoring (RUM)**:
   - Web Vitals are tracked via `reportWebVitals()`
   - Integrate with analytics service (Google Analytics, PostHog, etc.)

2. **Synthetic Monitoring**:
   - Schedule regular Lighthouse audits
   - Monitor trends over time
   - Alert on regressions

## Debugging Performance Issues

### Slow Initial Load

**Symptoms**: High FCP, LCP times

**Debug Steps**:

1. Run Lighthouse and check "Opportunities" section
2. Analyze bundle size with Vite Bundle Visualizer
3. Check Network tab for large resources
4. Look for render-blocking resources

**Common Fixes**:
- Code-split large components
- Lazy-load routes
- Optimize images
- Defer non-critical scripts

### Poor Interactivity

**Symptoms**: High TBT, FID times

**Debug Steps**:

1. Use Chrome DevTools Performance profiler
2. Look for long tasks (> 50ms)
3. Check for expensive component renders

**Common Fixes**:
- Use React.memo for expensive components
- Debounce user input handlers
- Use web workers for heavy computation
- Implement virtualization for long lists

### Layout Shifts

**Symptoms**: High CLS score

**Debug Steps**:

1. Enable "Layout Shift Regions" in Chrome DevTools
2. Identify elements that cause shifts
3. Check for missing dimensions on images/iframes

**Common Fixes**:
- Reserve space with aspect-ratio or explicit dimensions
- Avoid inserting content above existing content
- Use transform/opacity for animations (not width/height)

## Performance Checklist

### Pre-Launch

- [ ] Lighthouse Performance Score ≥ 85 (desktop)
- [ ] Lighthouse Performance Score ≥ 75 (mobile)
- [ ] LCP < 2.5s (desktop), < 4.0s (mobile)
- [ ] CLS < 0.1
- [ ] Total bundle size < 500KB gzipped
- [ ] Images optimized (WebP format, compressed)
- [ ] Fonts optimized (WOFF2, subsetting, font-display)
- [ ] Critical CSS inlined
- [ ] Non-critical resources deferred
- [ ] Service Worker implemented (optional)

### Post-Launch

- [ ] Real User Monitoring (RUM) enabled
- [ ] Performance dashboard set up
- [ ] Alerting configured for regressions
- [ ] Regular performance audits scheduled
- [ ] Performance budgets documented and enforced

## Tools and Resources

### Built-in Tools

- `npm run lighthouse` - Lighthouse CI audit
- `npm run perf:analyze` - Full performance analysis
- `npm run perf:report` - Formatted performance report
- Web Vitals tracking (automatic in dev/prod)

### External Tools

- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [PageSpeed Insights](https://pagespeed.web.dev/)

### Learning Resources

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)
- [Chrome User Experience Report](https://developers.google.com/web/tools/chrome-user-experience-report)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

## Support

For performance-related issues or questions:

1. Check this guide first
2. Review `PERFORMANCE_BUDGET.md` for targets
3. Run `npm run perf:report` for diagnostics
4. Consult the [Web Vitals documentation](https://web.dev/vitals/)

---

**Last Updated**: 2025-11-06
**Maintained By**: Development Team
