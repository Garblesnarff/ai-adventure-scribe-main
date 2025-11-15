# Infinite Realms Design System

**Version:** 1.0.0
**Last Updated:** November 2025
**Aesthetic:** Fantasy-Tech Fusion

---

## Overview

The Infinite Realms design system provides a cohesive, polished UI that combines modern web design with D&D fantasy elements. This system was built to avoid generic AI-generated aesthetics and create a distinctive brand identity.

---

## Core Principles

1. **Fantasy-Tech Fusion**: Modern, clean interfaces (like Linear/Notion) with subtle D&D personality
2. **No Medieval Website Feel**: Avoid heavy textures, gothic fonts, or clunky medieval designs
3. **Smooth Animations**: Professional entrance animations and micro-interactions
4. **Accessibility First**: WCAG AA compliant with reduced motion support
5. **Mobile Responsive**: Designed for all screen sizes

---

## Color Palette

### Primary Colors
```css
--infinite-purple: 270 80% 50%        /* Primary brand color */
--infinite-gold: 45 100% 51%          /* Accent/highlight color */
--infinite-teal: 180 70% 50%          /* Secondary accent */
```

### Semantic Colors
```css
--card: Background for cards and panels
--muted: Muted backgrounds
--border: Border color
--foreground: Primary text color
```

---

## Typography

### Font Families
- **Primary**: System font stack for optimal performance
- **Headings**: Font weight 600-700
- **Body**: Font weight 400-500

### Text Styles
```tsx
// Narrative text (DM messages, descriptions)
<div className="narrative-text">Story content here</div>

// Fantasy heading (large titles)
<h1 className="fantasy-heading">Epic Title</h1>

// Label text (form labels, card titles)
<label className="label-text">Field Label</label>
```

---

## Components

### Cards

**Variants:**
- `default` - Standard card with subtle shadow
- `parchment` - Warm, fantasy-themed card (cream gradient)
- `glass` - Translucent glassmorphism effect
- `cosmic` - Dark purple gradient (DM/magical theme)

**Usage:**
```tsx
import { Card } from '@/components/ui/card';

<Card variant="parchment">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content here
  </CardContent>
</Card>
```

### Buttons

**Variants:**
- `default` - Standard button
- `fantasy` - Purple gradient with glow
- `cosmic` - Dark purple (DM theme)
- `parchment` - Warm fantasy theme
- `ghost` - Transparent background

**Usage:**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="fantasy">
  Start Adventure
</Button>
```

### Badges

**Variants:**
- Status: `success`, `warning`, `danger`, `info`
- Fantasy: `purple`, `gold`, `teal`
- Special: `stat` (larger, for stats display)

**Usage:**
```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="gold">Level 5</Badge>
<Badge variant="success">Online</Badge>
```

### Tabs

**Variants:**
- `default` - Standard tabs
- `fantasy` - Parchment-themed tabs
- `cosmic` - Purple gradient tabs

**Usage:**
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs variant="fantasy">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="stats">Stats</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Content</TabsContent>
</Tabs>
```

---

## Composite Components

### StatDisplay
Circular stat badges for D&D ability scores, HP, AC.

```tsx
import { StatDisplay } from '@/components/ui/stat-display';

<StatDisplay
  label="STR"
  value={16}
  modifier="+3"
  variant="purple"
  size="lg"
/>
```

### ProgressBar
Themed progress bars for HP, XP, spell slots.

```tsx
import { ProgressBar } from '@/components/ui/progress-bar';

<ProgressBar
  current={45}
  max={60}
  variant="health"
  label="Hit Points"
  showNumbers
/>
```

### SelectableCard
Interactive cards for race/class/genre selection.

```tsx
import { SelectableCard } from '@/components/ui/selectable-card';

<SelectableCard
  title="Human"
  description="Versatile and ambitious"
  selected={selected === 'human'}
  onClick={() => setSelected('human')}
  variant="fantasy"
  size="lg"
  icon={<User />}
/>
```

### EmptyState
Illustrated empty states with actions.

```tsx
import { EmptyState } from '@/components/ui/empty-state';

<EmptyState
  icon="no-campaigns"
  title="No campaigns yet"
  description="Create your first epic saga to begin your adventure."
  action={{
    label: "Create Campaign",
    onClick: () => navigate('/campaigns/create')
  }}
/>
```

### FantasyLoader
Themed loading indicators.

```tsx
import { FantasyLoader } from '@/components/ui/fantasy-loader';

<FantasyLoader
  type="parchment"  // or: spell, dice, cosmic, shimmer, spinner
  size="lg"
  label="Loading campaigns..."
  tip="Your epic adventures await!"
/>
```

### CharacterPortrait
Unified character avatar with stats overlay.

```tsx
import { CharacterPortrait } from '@/components/ui/character-portrait';

<CharacterPortrait
  character={character}
  size="lg"
  showStats
  showLevel
/>
```

---

## Animations

### Importing Animations
```tsx
import { motion } from 'framer-motion';
import { fadeInUp, cardContainer, cardItem } from '@/utils/animations';
```

### Common Patterns

**Page Entrance:**
```tsx
<motion.div
  variants={fadeInUp}
  initial="hidden"
  animate="visible"
>
  Page content
</motion.div>
```

**Staggered Card Grid:**
```tsx
<motion.div
  className="grid grid-cols-3 gap-4"
  variants={cardContainer}
  initial="hidden"
  animate="visible"
>
  {items.map(item => (
    <motion.div key={item.id} variants={cardItem}>
      <Card>{item.name}</Card>
    </motion.div>
  ))}
</motion.div>
```

**Hover Effects:**
```tsx
<motion.button
  whileHover={{ scale: 1.02, y: -2 }}
  whileTap={{ scale: 0.98 }}
>
  Click Me
</motion.button>
```

### Available Animation Variants

**Page Transitions:**
- `fadeInUp` - Fade in and slide up (0→1 opacity, 20px up)
- `fadeInDown` - Fade in and slide down
- `slideInLeft` - Slide in from left
- `slideInRight` - Slide in from right

**Card Animations:**
- `cardContainer` - Parent container with staggered children (0.1s stagger)
- `cardItem` - Individual card entrance (opacity + y + scale)

**Interactive:**
- `hoverScale` - Scale on hover
- `hoverLift` - Lift up with shadow
- `hoverGlow` - Add glow effect

**Special:**
- `diceRoll` - Animated dice rolling
- `pulseSuccess` - Pulse animation for success states
- `celebrate` - Celebration animation with confetti effect

**Loading:**
- `pulse` - Gentle pulsing
- `shimmer` - Shimmer loading effect
- `rotate` - Continuous rotation

### Accessibility
All animations respect `prefers-reduced-motion`:
```tsx
import { respectReducedMotion } from '@/utils/animations';

const safeAnimation = respectReducedMotion(complexAnimation);
```

---

## CSS Utility Classes

### Card Styles
```css
.fantasy-card      /* Warm parchment-style card */
.cosmic-panel      /* Dark purple gradient panel */
.glass-panel       /* Translucent glassmorphism */
```

### Interaction Effects
```css
.hover-glow-purple /* Purple glow on hover */
.hover-glow-gold   /* Gold glow on hover */
.hover-lift        /* Lift up on hover */
```

### Stat Displays
```css
.stat-display       /* Circular stat badge */
.stat-display-large /* Large version */
.stat-display-small /* Compact version */
```

### Typography
```css
.narrative-text    /* DM narrative styling */
.fantasy-heading   /* Large fantasy-themed headings */
.label-text        /* Form label text */
```

### Progress
```css
.fantasy-progress  /* Themed progress bar */
```

---

## Responsive Design

### Breakpoints
```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Mobile-First Approach
Always design for mobile first, then enhance for larger screens:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 col mobile, 2 col tablet, 3 col desktop */}
</div>
```

---

## Accessibility Guidelines

### Color Contrast
- **Text**: Minimum 4.5:1 contrast ratio (WCAG AA)
- **Interactive Elements**: Minimum 3:1 contrast ratio
- **Focus Indicators**: Always visible with 2px outline

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Maintain logical tab order
- Provide skip links for main content

### Screen Readers
- Use semantic HTML (`<nav>`, `<main>`, `<article>`)
- Provide `aria-label` for icon-only buttons
- Use `role` attributes when necessary

### Motion
- Respect `prefers-reduced-motion`
- Provide static alternatives for animations
- Keep animations under 0.5s for micro-interactions

---

## Component Enhancement Checklist

When creating or updating a component:

- [ ] Uses design system colors/variants
- [ ] Has entrance animation (fadeInUp or appropriate variant)
- [ ] Supports keyboard navigation
- [ ] Has proper ARIA labels
- [ ] Respects reduced motion preference
- [ ] Responsive on mobile/tablet/desktop
- [ ] Meets WCAG AA contrast requirements
- [ ] Has loading and error states
- [ ] Uses FantasyLoader for loading
- [ ] Uses EmptyState for empty data

---

## File Structure

```
src/
├── components/ui/          # Base UI components
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── tabs.tsx
│   ├── stat-display.tsx
│   ├── progress-bar.tsx
│   ├── selectable-card.tsx
│   ├── empty-state.tsx
│   ├── fantasy-loader.tsx
│   └── character-portrait.tsx
├── styles/
│   └── infinite-realms-components.css  # Core visual language
├── utils/
│   └── animations.ts        # Animation variants
└── features/
    ├── character/
    ├── campaign/
    └── game-session/
```

---

## Migration Guide

### From Generic Components to Design System

**Before:**
```tsx
<div className="border rounded p-4">
  <h3>Title</h3>
  <p>Content</p>
</div>
```

**After:**
```tsx
<Card variant="parchment">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
</Card>
```

### Adding Animations

**Before:**
```tsx
<div className="grid grid-cols-3 gap-4">
  {items.map(item => <ItemCard key={item.id} {...item} />)}
</div>
```

**After:**
```tsx
<motion.div
  className="grid grid-cols-3 gap-4"
  variants={cardContainer}
  initial="hidden"
  animate="visible"
>
  {items.map(item => (
    <motion.div key={item.id} variants={cardItem}>
      <ItemCard {...item} />
    </motion.div>
  ))}
</motion.div>
```

---

## Performance Considerations

1. **Animation Performance**: Use GPU-accelerated properties (transform, opacity)
2. **Bundle Size**: FantasyLoader variants are code-split
3. **Image Optimization**: Use next-gen formats (WebP, AVIF)
4. **Code Splitting**: Lazy load heavy components
5. **Reduced Motion**: Simpler animations for better performance

---

## Browser Support

- **Chrome**: 90+ (full support)
- **Firefox**: 88+ (full support)
- **Safari**: 14+ (full support)
- **Edge**: 90+ (full support)

---

## Future Enhancements

- [ ] Dark mode variants
- [ ] Additional FantasyLoader types (dragon, treasure)
- [ ] Sound effects for interactions
- [ ] Advanced particle effects
- [ ] Theme customization API

---

## Resources

- **Figma**: [Design System Components]
- **Storybook**: Coming soon
- **Animation Library**: `/src/utils/animations.ts`
- **CSS Variables**: `/src/styles/infinite-realms-components.css`

---

## Support

For questions or contributions:
- GitHub Issues: [Link to repo]
- Documentation: This file
- Code Examples: See component files in `/src/components/ui/`
