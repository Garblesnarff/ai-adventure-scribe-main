# Performance Monitoring - Next Steps

## Current Status

✅ **Performance monitoring infrastructure is fully implemented and ready to use.**

⚠️ **Initial performance audit is blocked by a pre-existing build error** (unrelated to performance implementation).

## Immediate Action Required

### 1. Fix Build Error

**Error Location**: `src/features/character/components/creation/index.ts`

**Issue**:
```
"BasicInfo" is not exported by "src/features/character/components/creation/steps/BasicInfo.tsx"
```

**Impact**: Cannot run production build or Lighthouse audits until resolved.

**To Fix**:
```bash
# Check the export in BasicInfo.tsx
# Ensure it matches the import in index.ts
```

### 2. Run Initial Performance Audit

Once build is fixed, run:

```bash
# Build the application
npm run build

# Run desktop performance audit
npm run lighthouse:desktop

# Run mobile performance audit
npm run lighthouse:mobile

# View formatted report
npm run perf:report
```

### 3. Document Baseline Metrics

After running audits, document:
- Current Lighthouse scores (Performance, Accessibility, Best Practices)
- Core Web Vitals metrics (FCP, LCP, CLS, TBT)
- Total bundle size (gzipped)
- Top 5 optimization opportunities

Update `PERFORMANCE_BUDGET.md` with actual metrics in the "Current" column.

## Available Commands

### Development

```bash
# Start dev server with Web Vitals tracking
npm run dev

# Web Vitals are automatically logged to console
# View Performance Monitor in bottom-right corner
# Or enable manually:
localStorage.setItem('showPerformanceMonitor', 'true');
```

### Production Audits

```bash
# Desktop audit (Fast 3G, 1350x940)
npm run lighthouse:desktop

# Mobile audit (4G, iPhone SE)
npm run lighthouse:mobile

# Quick audit (default config)
npm run lighthouse

# Full analysis (build + audit)
npm run perf:analyze

# View formatted report
npm run perf:report
```

### Bundle Analysis

```bash
# Build and analyze bundle
npm run build
npx vite-bundle-visualizer
```

## Quick Wins (After Audit)

### 1. Image Optimization
- Convert images to WebP format
- Add lazy loading for offscreen images
- Compress hero images to < 100 KB

### 2. Font Loading
```css
@font-face {
  font-family: 'MedievalSharp';
  font-display: swap; /* Show fallback immediately */
}
```

### 3. Code Splitting
```typescript
// Lazy load heavy components
const CharacterWizard = lazy(() => import('./features/character/components/creation/character-wizard'));
const CampaignWizard = lazy(() => import('./features/campaign/components/creation/campaign-wizard'));
```

### 4. Third-Party Scripts
```html
<!-- Defer non-critical scripts -->
<script src="/analytics.js" defer></script>
```

## Performance Budget Targets

| Metric | Desktop | Mobile |
|--------|---------|--------|
| Performance Score | ≥ 85 | ≥ 75 |
| Accessibility | ≥ 90 | ≥ 90 |
| FCP | < 2.0s | < 3.0s |
| LCP | < 2.5s | < 4.0s |
| CLS | < 0.1 | < 0.1 |
| TBT | < 300ms | < 600ms |
| Bundle Size | < 500 KB gzipped | < 500 KB gzipped |

## Documentation

- **Comprehensive Guide**: `docs/PERFORMANCE_TESTING.md`
- **Performance Budget**: `PERFORMANCE_BUDGET.md`
- **Web Vitals README**: `src/utils/performance/README.md`
- **Implementation Report**: `PHASE_D4_PERFORMANCE_VALIDATION_REPORT.md`

## Support

### Viewing Web Vitals in Development

```javascript
// In browser console
JSON.parse(sessionStorage.getItem('web-vitals'))

// Clear metrics
sessionStorage.removeItem('web-vitals')
```

### Troubleshooting Build Issues

```bash
# Check TypeScript errors
npx tsc --noEmit

# Check for missing dependencies
npm run check-deps

# Verify all imports
npm run lint
```

## Timeline

### Week 1 (Current)
- [ ] Fix build error
- [ ] Run initial audit
- [ ] Document baseline metrics
- [ ] Identify top 5 optimization opportunities

### Week 2
- [ ] Implement quick wins (images, fonts, lazy loading)
- [ ] Run bundle analysis
- [ ] Begin code splitting implementation

### Week 3-4
- [ ] Complete major optimizations
- [ ] Integrate Lighthouse CI into PR pipeline
- [ ] Set up performance regression alerts
- [ ] Connect Web Vitals to analytics

## Questions?

Refer to:
1. `docs/PERFORMANCE_TESTING.md` - Comprehensive testing guide
2. `PERFORMANCE_BUDGET.md` - Target metrics and budgets
3. `PHASE_D4_PERFORMANCE_VALIDATION_REPORT.md` - Full implementation details

---

**Last Updated**: 2025-11-06
**Status**: Ready to use (pending build fix)
