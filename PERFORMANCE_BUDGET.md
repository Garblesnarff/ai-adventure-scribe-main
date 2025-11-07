# Performance Budget

This document defines performance targets and budgets for the AI Adventure Scribe application.

## Core Web Vitals Targets

Based on Google's recommended thresholds for excellent user experience:

### Painting & Loading Metrics

| Metric | Target (Good) | Acceptable | Poor | Description |
|--------|---------------|------------|------|-------------|
| **FCP** (First Contentful Paint) | < 1.8s | < 3.0s | > 3.0s | Time until first content appears |
| **LCP** (Largest Contentful Paint) | < 2.5s | < 4.0s | > 4.0s | Time until main content is visible |
| **TTFB** (Time to First Byte) | < 800ms | < 1.8s | > 1.8s | Server response time |
| **Speed Index** | < 3.4s | < 5.8s | > 5.8s | How quickly content is visually displayed |
| **TTI** (Time to Interactive) | < 3.8s | < 7.3s | > 7.3s | Time until page is fully interactive |

### Interactivity Metrics

| Metric | Target (Good) | Acceptable | Poor | Description |
|--------|---------------|------------|------|-------------|
| **FID** (First Input Delay) | < 100ms | < 300ms | > 300ms | Input responsiveness |
| **TBT** (Total Blocking Time) | < 200ms | < 600ms | > 600ms | Total time page is blocked |
| **INP** (Interaction to Next Paint) | < 200ms | < 500ms | > 500ms | Response to user interactions |

### Visual Stability

| Metric | Target (Good) | Acceptable | Poor | Description |
|--------|---------------|------------|------|-------------|
| **CLS** (Cumulative Layout Shift) | < 0.1 | < 0.25 | > 0.25 | Visual stability (no unexpected shifts) |

## Bundle Size Budget

Target bundle sizes to ensure fast loading:

| Asset Type | Budget (Gzipped) | Current | Status |
|------------|------------------|---------|--------|
| **Total Bundle** | < 500 KB | TBD | ⏳ Pending |
| **Main Chunk** | < 200 KB | TBD | ⏳ Pending |
| **Vendor Chunk** | < 250 KB | TBD | ⏳ Pending |
| **CSS** | < 50 KB | TBD | ⏳ Pending |
| **Images (per page)** | < 200 KB | TBD | ⏳ Pending |
| **Fonts** | < 100 KB | TBD | ⏳ Pending |

## Lighthouse Score Targets

Minimum scores for production deployment:

| Category | Target | Minimum Acceptable |
|----------|--------|-------------------|
| **Performance** | 90+ | 85+ |
| **Accessibility** | 95+ | 90+ |
| **Best Practices** | 90+ | 85+ |
| **SEO** | 90+ | 80+ |
| **PWA** | N/A | N/A |

## Network Performance Targets

### API Response Times

| Endpoint Category | Target | Acceptable | Poor |
|------------------|--------|------------|------|
| **Character Creation** | < 500ms | < 1000ms | > 1000ms |
| **Campaign Loading** | < 300ms | < 800ms | > 800ms |
| **AI Response (DM)** | < 2000ms | < 4000ms | > 4000ms |
| **Image Generation** | < 5000ms | < 10000ms | > 10000ms |
| **Session Queries** | < 200ms | < 500ms | > 500ms |

### Database Query Performance

| Query Type | Target | Acceptable | Poor |
|-----------|--------|------------|------|
| **Character Lookup** | < 50ms | < 100ms | > 100ms |
| **Campaign Queries** | < 100ms | < 300ms | > 300ms |
| **Memory Retrieval** | < 100ms | < 200ms | > 200ms |
| **Session Logs** | < 150ms | < 400ms | > 400ms |

## Resource Loading Budget

### JavaScript

- **Total JS (Uncompressed)**: < 1.5 MB
- **Total JS (Gzipped)**: < 500 KB
- **Initial JS Load**: < 200 KB gzipped
- **Third-party Scripts**: < 100 KB gzipped

### CSS

- **Total CSS (Uncompressed)**: < 150 KB
- **Total CSS (Gzipped)**: < 50 KB
- **Critical CSS**: < 14 KB (inline)

### Images

- **Total Images per Route**: < 500 KB
- **Hero/Featured Images**: < 100 KB each
- **Thumbnails**: < 20 KB each
- **Icons**: Use SVG or icon fonts

### Fonts

- **Total Font Files**: < 100 KB
- **WOFF2 Format Required**: Yes
- **Font Display**: swap or optional
- **Variable Fonts Preferred**: Yes

## Performance Monitoring

### Continuous Monitoring

- **Lighthouse CI**: Run on every PR
- **Web Vitals**: Track in production via analytics
- **Bundle Analysis**: Review on every build
- **Performance Regression**: Alert on 10%+ degradation

### Testing Conditions

#### Desktop
- **Network**: Fast 3G or better
- **CPU**: 4x slowdown (simulated mid-tier device)
- **Screen**: 1350x940

#### Mobile
- **Network**: 4G
- **CPU**: 4x slowdown
- **Screen**: 375x667 (iPhone SE)

## Cost Budget (AI Services)

| Service | Budget per Session | Monthly Target |
|---------|-------------------|----------------|
| **Google Gemini (DM)** | < $0.03 | < $100 |
| **OpenAI Embeddings** | < $0.005 | < $20 |
| **ElevenLabs TTS** | < $0.02 | < $50 |
| **Image Generation** | < $0.10 | < $200 |
| **Total per Session** | < $0.05 | < $300 |

## Optimization Priorities

### High Priority (Must Fix)

1. **LCP > 2.5s**: Optimize hero images, reduce render-blocking resources
2. **TBT > 300ms**: Code-split large components, defer non-critical JS
3. **CLS > 0.1**: Reserve space for dynamic content, use CSS aspect ratios
4. **Bundle > 500 KB**: Analyze and remove unused dependencies

### Medium Priority (Should Fix)

1. **FCP > 1.8s**: Inline critical CSS, preload key resources
2. **TTI > 3.8s**: Reduce JavaScript execution time
3. **TTFB > 800ms**: Optimize server response, use CDN
4. **Images unoptimized**: Convert to WebP, implement lazy loading

### Low Priority (Nice to Have)

1. **Font loading optimization**: Use font-display: swap
2. **Preconnect to third-party origins**: Add resource hints
3. **Service Worker**: Implement for offline support
4. **HTTP/2 Server Push**: For critical assets

## Monitoring and Reporting

### Automated Checks

- **Pre-commit**: Lighthouse CI on staged changes
- **PR Checks**: Full Lighthouse audit with budget enforcement
- **Production**: Real User Monitoring (RUM) via Web Vitals API

### Weekly Review

- Review Lighthouse CI trends
- Analyze Web Vitals percentiles (p75, p95)
- Check bundle size trends
- Monitor AI cost per session

### Monthly Review

- Comprehensive performance audit
- User experience metrics analysis
- Cost optimization review
- Performance roadmap updates

## Exceptions and Edge Cases

### AI-Generated Content

- **DM Responses**: May exceed 2s target during complex generation
- **Image Generation**: 5-10s is acceptable for quality results
- **Voice Synthesis**: 1-3s acceptable for natural speech

### Large Data Sets

- **Campaign History**: Implement pagination (50 items per page)
- **Character Sheets**: Lazy-load sections
- **Memory System**: Virtual scrolling for large lists

### Multiplayer Sessions

- **Real-time Updates**: < 100ms latency target
- **Concurrent Users**: Support up to 6 players per session
- **WebSocket Messages**: < 50ms processing time

## Action Items

- [ ] Establish baseline metrics (run initial Lighthouse audit)
- [ ] Integrate Web Vitals tracking in production
- [ ] Set up bundle size monitoring in CI
- [ ] Configure performance budgets in Lighthouse CI
- [ ] Create performance dashboard
- [ ] Implement automated alerting for regressions
- [ ] Document optimization strategies for common issues

## References

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)
- [Chrome User Experience Report](https://developers.google.com/web/tools/chrome-user-experience-report)
- [Bundle Size Optimization Guide](https://web.dev/reduce-javascript-payloads-with-code-splitting/)

---

**Last Updated**: 2025-11-06
**Next Review**: Weekly (every Monday)
**Owner**: Development Team
