# Infinite Realms Blog System

This directory contains the server-side rendered (SSR) blog system for Infinite Realms, featuring immersive D&D theming, advanced SEO, and progressive enhancement.

## Architecture

### SSR Pages

- **index.tsx**: Blog index with hero header, search/filter UI, responsive grid, and infinite scroll support
- **post.tsx**: Individual blog post with enhanced article layout, related posts, and rich metadata
- **document.tsx**: Shared HTML document wrapper with SEO tags, structured data, and preload hints

### Utilities

- **seo.ts**: JSON-LD structured data generators for `Article`, `BlogPosting`, `Blog`, and `SoftwareApplication` schemas

### Features

1. **D&D Immersive Theme**
   - Fantasy hero headers with gradient overlays
   - Amber/gold accent colors matching the D&D aesthetic
   - Cinzel font for headings, Inter for body text
   - Parchment texture overlays and atmospheric gradients

2. **SEO & Metadata**
   - Open Graph and Twitter Card support
   - JSON-LD structured data for articles and blog listings
   - Categories and tags embedded in all metadata
   - Automatic sitemap.xml and RSS feed generation
   - Proper heading hierarchy and ARIA landmarks

3. **Progressive Enhancement**
   - Client-side search and filtering (`src/blog-client.ts`)
   - Infinite scroll and "load more" pagination
   - Fast initial SSR render, hydrates to interactive UI
   - Works without JavaScript for accessibility

4. **Code Syntax Highlighting**
   - `highlight.js` integration with dark theme
   - Support for JavaScript, TypeScript, Python, Bash, JSON, YAML, SQL, CSS
   - Custom `.ir-code-block` styling with language labels
   - Keyboard-accessible code blocks

5. **Performance**
   - CDN cache headers with stale-while-revalidate
   - Lazy-loaded images with `loading="lazy"` and `decoding="async"`
   - Optimized srcset and responsive images
   - Inline critical CSS for code highlighting
   - Separate blog-client bundle to minimize payload

## Data Model

### BlogPost Interface

```typescript
interface BlogPost {
  id: string;
  slug: string;
  title: string;
  markdown: string;
  html: string;
  excerpt: string;
  summary: string;
  publishedAt: string;
  updatedAt?: string;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  authorName?: string | null;
  tags: string[];
  categories: string[];
  readingTimeMinutes: number;
  estimatedWordCount: number;
}
```

### Supabase Schema

The blog service (`server/src/services/blog-service.ts`) fetches from the `blog_posts` table with flexible field mapping:

- **Content**: `markdown`, `content`, or `body`
- **Summary**: `excerpt`, `summary`, or `seo_description`
- **Cover Image**: `cover_image_url`, `hero_image_url`, or `social_image_url`
- **Image Alt**: `cover_image_alt` or `image_alt`
- **Author**: `author_name`, `author`, or `byline`
- **Categories**: `categories` (array or comma-separated) or `category` (single value)
- **Tags**: `tags` (array or comma-separated)
- **Dates**: `published_at` or `publish_date`, `updated_at` or `modified_at`
- **Status**: `status`, `is_published`, or `published` fields determine visibility

Posts with `unpublished_at` in the past are excluded. Posts must have `published_at <= now()` to appear.

## Routes

- `GET /blog` → Blog index with search, filters, pagination
- `GET /blog/:slug` → Individual blog post with related posts
- `GET /sitemap.xml` → Sitemap including blog posts
- `GET /rss.xml` → RSS feed with full content
- `GET /robots.txt` → Robots file with sitemap reference

All routes registered in `server/src/app.ts` via `blogRouter()` and `seoRouter()`.

## Client-Side Interactivity

The `src/blog-client.ts` bundle provides:

- **Search**: Filter posts by title, excerpt, categories, and tags
- **Category Filter**: Dropdown to filter by category
- **Clear Filters**: Reset all filters and search
- **Load More**: Button-based pagination
- **Infinite Scroll**: Automatically loads more posts when scrolling near the bottom
- **Keyboard Accessibility**: Focus management and Escape key to exit code blocks

Uses `window.__BLOG_DATA__` for initial state. No external dependencies (vanilla JS).

## Styling

### Tailwind Classes

All styles use Tailwind CSS with custom D&D theme colors:
- `slate-950`: Dark background
- `amber-50`, `amber-200`, `amber-400`: Gold accents for headings and highlights
- `indigo-950`: Purple tints for depth
- `font-heading`: Cinzel font for titles

### Code Blocks

Custom `.ir-code-block` with:
- Dark background gradient
- Language label in `.ir-code-label`
- Syntax highlighting via `.hljs` classes
- Focus outline for accessibility
- Responsive on mobile

### Prose Styles

The `.ir-prose` class extends `@tailwindcss/typography` with:
- Larger base font (1.125rem)
- Custom blockquote styling with amber border
- Table styles with hover effects
- Image margins and rounded corners

## Structured Data

### Article Schema

```json
{
  "@context": "https://schema.org",
  "@type": ["Article", "BlogPosting"],
  "headline": "...",
  "description": "...",
  "url": "...",
  "datePublished": "...",
  "dateModified": "...",
  "wordCount": 1000,
  "timeRequired": "PT5M",
  "articleSection": "Updates",
  "author": { "@type": "Person", "name": "..." },
  "publisher": { "@type": "Organization", ... },
  "keywords": "tag1, tag2, category1",
  "about": [{ "@type": "Thing", "name": "category1" }]
}
```

### Blog Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "Infinite Realms Blog",
  "headline": "...",
  "description": "...",
  "genre": ["Updates", "Guides"],
  "inLanguage": "en-US",
  "blogPost": [...]
}
```

## Performance Optimizations

1. **SSR Cache Headers**: 5-10 minute cache, 15-60 minute stale-while-revalidate
2. **CDN Integration**: Vercel, Cloudflare, and generic CDN headers
3. **Asset Preloading**: Module preloads for critical scripts
4. **Font Optimization**: Google Fonts with preconnect
5. **Lazy Images**: All cover images use `loading="lazy"`
6. **Code Splitting**: Separate blog-client bundle (~5KB gzipped)
7. **Vite Manifest**: Resolves assets via `resolveAssetsForEntries()`

## Accessibility

- Semantic HTML5 (`<main>`, `<article>`, `<aside>`, `<header>`, `<footer>`)
- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for interactive elements
- Focus states for all interactive components
- Screen reader text for icons and decorative elements
- `aria-live` regions for dynamic content updates
- Keyboard navigation for code blocks

## Testing

See `server/tests/blog-seo.test.ts` for:
- Blog index rendering
- Individual post rendering with metadata
- 404 handling for missing posts
- Sitemap.xml generation
- RSS feed generation
- robots.txt generation

Run tests with:
```bash
npm run server:test
```

## Future Enhancements

- [ ] Full-text search with Supabase FTS
- [ ] Category and tag archive pages
- [ ] Author profile pages
- [ ] Table of contents for long posts
- [ ] Estimated reading progress bar
- [ ] Social sharing buttons
- [ ] Comment system integration
- [ ] Related posts via semantic similarity
- [ ] WebP/AVIF image variants
- [ ] Dark/light mode toggle (currently dark-only)
