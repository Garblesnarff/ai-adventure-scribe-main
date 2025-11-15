# UI Redesign Debugging Guide

**Version:** 1.0.0
**Last Updated:** November 2025
**Related:** DESIGN_SYSTEM.md

This guide covers common issues you might encounter after the comprehensive UI redesign and how to resolve them.

---

## Table of Contents

1. [Animations Not Appearing](#animations-not-appearing)
2. [Component Variants Not Working](#component-variants-not-working)
3. [Build Errors](#build-errors)
4. [Performance Issues](#performance-issues)
5. [Accessibility Issues](#accessibility-issues)
6. [Styling Issues](#styling-issues)
7. [Image/Asset Loading Issues](#imageasset-loading-issues)

---

## Animations Not Appearing

### Problem: Components appear instantly without fade-in/slide-up effects

**Possible Causes:**

1. **Framer Motion not imported**
   ```typescript
   // ❌ Missing import
   <motion.div variants={fadeInUp}>

   // ✅ Correct
   import { motion } from 'framer-motion';
   import { fadeInUp } from '@/utils/animations';
   ```

2. **Animation variants not applied correctly**
   ```typescript
   // ❌ Missing initial/animate props
   <motion.div variants={fadeInUp}>

   // ✅ Correct
   <motion.div variants={fadeInUp} initial="hidden" animate="visible">
   ```

3. **User has reduced motion enabled**
   - Check browser settings: `prefers-reduced-motion: reduce`
   - All animations respect this setting and will be simplified
   - This is intentional for accessibility

**Quick Fix:**
```bash
# Check if framer-motion is installed
npm list framer-motion

# Reinstall if missing
npm install framer-motion
```

---

## Component Variants Not Working

### Problem: Card/Button/Badge variants showing default style

**Possible Causes:**

1. **Variant prop not passed correctly**
   ```typescript
   // ❌ Wrong variant name
   <Card variant="purple">

   // ✅ Correct (check DESIGN_SYSTEM.md for valid variants)
   <Card variant="parchment">
   ```

2. **CVA (class-variance-authority) import missing**
   ```typescript
   // Component should have:
   import { cva, type VariantProps } from 'class-variance-authority';
   ```

3. **Tailwind config not updated**
   - Ensure `tailwind.config.ts` has custom animations
   - Run: `npm run build` to regenerate Tailwind CSS

**Quick Fix:**
```bash
# Verify CVA is installed
npm list class-variance-authority

# Rebuild Tailwind
npm run build
```

**Valid Variants Reference:**

- **Card:** `default`, `parchment`, `glass`, `cosmic`
- **Button:** `default`, `fantasy`, `cosmic`, `parchment`, `ghost`, `destructive`, `outline`, `secondary`, `link`
- **Badge:** `default`, `success`, `warning`, `danger`, `info`, `purple`, `gold`, `teal`, `stat`, `secondary`, `outline`, `destructive`
- **Tabs:** `default`, `fantasy`, `cosmic`

---

## Build Errors

### Problem: TypeScript compilation errors

**Common Errors:**

1. **Cannot find module '@/utils/animations'**
   ```bash
   # Verify file exists
   ls -la src/utils/animations.ts

   # Check tsconfig.json paths
   cat tsconfig.json | grep "@/"
   ```

2. **Cannot find module '@/components/ui/empty-state'**
   ```bash
   # Verify all new components exist
   ls -la src/components/ui/empty-state.tsx
   ls -la src/components/ui/fantasy-loader.tsx
   ls -la src/components/ui/stat-display.tsx
   ls -la src/components/ui/progress-bar.tsx
   ls -la src/components/ui/selectable-card.tsx
   ls -la src/components/ui/character-portrait.tsx
   ```

3. **Module not found: Error: Can't resolve 'lucide-react'**
   ```bash
   npm install lucide-react
   ```

4. **CSS import errors**
   ```bash
   # Verify CSS file exists and is imported
   ls -la src/styles/infinite-realms-components.css
   grep "infinite-realms-components.css" src/index.css
   ```

**Quick Fix:**
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache and rebuild
rm -rf dist .vite
npm run build
```

---

## Performance Issues

### Problem: Animations are janky or causing lag

**Possible Causes:**

1. **Too many simultaneous animations**
   - Staggered animations (cardContainer/cardItem) animate many children
   - Reduce `staggerChildren` delay or limit items per page

2. **Non-GPU-accelerated properties**
   - Animations use `transform`, `opacity`, `scale` (GPU-accelerated ✅)
   - Avoid animating `height`, `width`, `margin` (CPU-bound ❌)

3. **Large bundle size**
   - Build warning shows vendor chunk is 1,186 kB (353 kB gzipped)
   - Consider code-splitting for routes

**Quick Fix:**

```typescript
// Disable animations for large lists (100+ items)
const shouldAnimate = items.length < 100;

<motion.div
  variants={shouldAnimate ? cardContainer : undefined}
  initial={shouldAnimate ? "hidden" : undefined}
  animate={shouldAnimate ? "visible" : undefined}
>
```

**Performance Monitoring:**
```typescript
// Add to component to debug render performance
useEffect(() => {
  console.time('Component Mount');
  return () => console.timeEnd('Component Mount');
}, []);
```

---

## Accessibility Issues

### Problem: Keyboard navigation not working

**Possible Causes:**

1. **Interactive elements missing tabIndex**
   ```typescript
   // ❌ SelectableCard not keyboard accessible
   <div onClick={handleClick}>

   // ✅ Add keyboard support
   <div
     onClick={handleClick}
     onKeyDown={(e) => e.key === 'Enter' && handleClick()}
     tabIndex={0}
     role="button"
   >
   ```

2. **ARIA labels missing on icon-only buttons**
   ```typescript
   // ❌ Screen reader can't describe button
   <Button><Sword /></Button>

   // ✅ Add aria-label
   <Button aria-label="Select Fighter class">
     <Sword />
   </Button>
   ```

3. **Focus indicators not visible**
   - Check if custom CSS overrides `:focus-visible`
   - All interactive elements should show 2px outline

**Quick Fix:**
```css
/* Add to component if focus ring missing */
.custom-element:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

### Problem: Screen reader announces incorrect information

**Check:**
- Semantic HTML tags (`<nav>`, `<main>`, `<article>`) used correctly
- `role` attributes only when necessary
- `aria-live` regions for dynamic content (like dice rolls)

---

## Styling Issues

### Problem: Colors look wrong or missing

**Possible Causes:**

1. **CSS custom properties not defined**
   ```bash
   # Check if infinite-realms-components.css is imported
   grep "infinite-realms-components.css" src/index.css
   ```

2. **Tailwind not generating custom colors**
   ```bash
   # Rebuild Tailwind to include new utilities
   npm run build
   ```

3. **Dark mode not working (if implemented)**
   - HSL color system should work in both modes
   - Check `tailwind.config.ts` for `darkMode` setting

**Quick Fix:**
```typescript
// Test if CSS variables are available
console.log(getComputedStyle(document.documentElement).getPropertyValue('--infinite-purple'));
// Should output: "270 80% 50%"
```

### Problem: Gradients not rendering

**Check:**
```css
/* Ensure gradient classes exist in infinite-realms-components.css */
.fantasy-card
.cosmic-panel
.glass-panel
```

**Browser Compatibility:**
- Gradients work in Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Check `caniuse.com` for CSS backdrop-filter (used in glass variant)

---

## Image/Asset Loading Issues

### Problem: Build warnings about unresolved images

**Build Output:**
```
/branding/parchment-texture.png didn't resolve at build time
/fantasy-bg.jpg didn't resolve at build time
```

**This is Normal** - these images are referenced in CSS and will resolve at runtime.

**If images aren't loading in production:**

1. **Verify public directory structure**
   ```bash
   ls -la public/branding/
   ls -la public/assets/
   ```

2. **Check image paths in CSS**
   ```css
   /* Should use relative paths from public/ */
   background-image: url('/branding/parchment-texture.png');
   ```

3. **Ensure images are in public/ not src/**
   - Vite serves `public/` as-is
   - Files in `src/assets/` are bundled

**Quick Fix:**
```bash
# Move images to public directory if needed
mkdir -p public/branding
mv src/assets/parchment-texture.png public/branding/
```

---

## Emergency Rollback

### If everything breaks and you need to revert:

```bash
# View recent commits
git log --oneline -5

# Revert to commit before UI redesign
git revert <commit-hash>

# Or reset (USE WITH CAUTION - loses changes)
git reset --hard <commit-hash>
```

---

## Common Component Issues

### EmptyState component not showing icons

**Check icon prop values:**
- Valid: `no-campaigns`, `no-characters`, `no-sessions`, `no-content`, `error`
- Invalid prop will show default question mark icon

### FantasyLoader infinite spinning

**Check type prop:**
- Valid: `parchment`, `spell`, `dice`, `cosmic`, `shimmer`, `spinner`
- Animation respects `prefers-reduced-motion`

### CharacterPortrait missing avatar

**Check character object:**
```typescript
// Component expects:
character.avatarUrl || character.imageUrl || character.avatar
character.name
character.class?.name
character.race?.name
character.level
```

---

## Getting Help

### Debug Checklist

- [ ] Run `npm run build` successfully
- [ ] Check browser console for errors (F12)
- [ ] Verify all imports resolve correctly
- [ ] Check component props match DESIGN_SYSTEM.md
- [ ] Test in Chrome DevTools with Network throttling
- [ ] Test with "Reduce motion" enabled in OS settings
- [ ] Verify responsive design at sm (640px), md (768px), lg (1024px)

### Performance Testing

```bash
# Analyze bundle size
npm run build -- --mode production

# Run Lighthouse audit
npx lighthouse http://localhost:5173 --view

# Check for unused CSS
npx purgecss --css dist/assets/*.css --content dist/**/*.html dist/**/*.js
```

### Browser DevTools Tips

1. **React DevTools** - Inspect component props and state
2. **Performance Tab** - Record and analyze animation performance
3. **Network Tab** - Check CSS/JS loading times
4. **Accessibility Tree** - Verify ARIA labels and roles
5. **Coverage Tab** - Find unused CSS/JS

---

## Contact & Support

If you encounter issues not covered here:

1. **Check DESIGN_SYSTEM.md** for component usage examples
2. **Check component source files** in `src/components/ui/` for implementation details
3. **Review animations.ts** for available animation variants
4. **Inspect infinite-realms-components.css** for available utility classes

---

## Known Issues

### Issue 1: Large vendor bundle (1,186 kB)

**Status:** Known, performance acceptable with gzipping (353 kB)
**Workaround:** Consider lazy loading for routes:
```typescript
const GameSession = lazy(() => import('./pages/GameSession'));
```

### Issue 2: Framer Motion bundle size

**Status:** Accepted trade-off for smooth animations
**Size:** ~48 KB gzipped
**Mitigation:** Animations respect reduced motion preference

### Issue 3: Three.js bundle (800 kB)

**Status:** Required for 3D features
**Already Optimized:** Code-split and lazy-loaded
**Future:** Consider lighter 3D library

---

## Version History

**v1.0.0** (November 2025)
- Initial debugging guide for comprehensive UI redesign
- Covers 60+ enhanced components
- Documents animation system, component variants, accessibility features
