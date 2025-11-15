# Blog CMS Verification Checklist

## Overview

This document provides comprehensive test plans to verify the Blog CMS deployment. Use these checklists after deployment to ensure all features are working correctly.

**Estimated Testing Time:** 30-45 minutes for full verification

---

## Pre-Verification Setup

### 1. Test Users

Create test users with different roles:

```sql
-- Create or update test users with different blog roles
-- Admin user
UPDATE public.user_profiles
SET blog_role = 'admin'
WHERE user_id = 'ADMIN_USER_ID';

-- Author user
UPDATE public.user_profiles
SET blog_role = 'author'
WHERE user_id = 'AUTHOR_USER_ID';

-- Viewer user (default)
UPDATE public.user_profiles
SET blog_role = 'viewer'
WHERE user_id = 'VIEWER_USER_ID';
```

### 2. Test Environment

Ensure you have:
- [ ] Admin access to the application
- [ ] Multiple browser sessions or incognito windows (for role testing)
- [ ] Sample images for media upload testing (PNG, JPG, WebP)
- [ ] Database access for verification queries

---

## Test Plan 1: Database Schema Verification

### Tables Created

```sql
-- Verify all tables exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name LIKE 'blog_%'
ORDER BY table_name;
```

**Expected Tables:**
- [ ] `blog_authors` (11 columns)
- [ ] `blog_categories` (8 columns)
- [ ] `blog_post_categories` (3 columns)
- [ ] `blog_post_tags` (3 columns)
- [ ] `blog_posts` (16 columns)
- [ ] `blog_tags` (6 columns)

### Indexes Created

```sql
-- Verify indexes exist
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename LIKE 'blog_%'
ORDER BY tablename, indexname;
```

**Expected Indexes:**
- [ ] `idx_blog_authors_user_id`
- [ ] `idx_blog_posts_author_id`
- [ ] `idx_blog_posts_status`
- [ ] `idx_blog_posts_published_at`
- [ ] `idx_blog_post_categories_post_id`
- [ ] `idx_blog_post_categories_category_id`
- [ ] `idx_blog_post_tags_post_id`
- [ ] `idx_blog_post_tags_tag_id`

### Functions Created

```sql
-- List all blog-related functions
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE 'blog_%' OR routine_name LIKE '%blog%')
ORDER BY routine_name;
```

**Expected Functions:**
- [ ] `set_updated_at()` (trigger)
- [ ] `set_blog_post_published_at()` (trigger)
- [ ] `is_blog_admin(uuid)` (boolean)
- [ ] `is_blog_author(uuid)` (boolean)
- [ ] `blog_role_for_user(uuid)` (text)
- [ ] `can_manage_blog_author(uuid, uuid)` (boolean)
- [ ] `can_manage_blog_post(uuid, uuid)` (boolean)

### RLS Policies Created

```sql
-- Verify RLS is enabled and policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename LIKE 'blog_%'
ORDER BY tablename, policyname;
```

**Expected Count:**
- [ ] 19 total policies across 6 tables
- [ ] All tables have RLS enabled

### Triggers Created

```sql
-- Verify triggers exist
SELECT
  event_object_table,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table LIKE 'blog_%'
ORDER BY event_object_table, trigger_name;
```

**Expected Triggers:**
- [ ] `trg_blog_authors_updated_at` (BEFORE UPDATE)
- [ ] `trg_blog_categories_updated_at` (BEFORE UPDATE)
- [ ] `trg_blog_tags_updated_at` (BEFORE UPDATE)
- [ ] `trg_blog_posts_updated_at` (BEFORE UPDATE)
- [ ] `trg_blog_posts_published_at` (BEFORE INSERT/UPDATE)

---

## Test Plan 2: Admin CRUD Operations

### Test 2.1: Blog Authors

#### Create Author

- [ ] Navigate to `/admin/blog/authors`
- [ ] Click "Create Author"
- [ ] Fill in required fields:
  - Display Name: "Test Author"
  - Slug: "test-author"
  - Short Bio: "A test author bio"
- [ ] Fill in optional fields:
  - Bio: "Extended bio with more details"
  - Avatar URL: "https://via.placeholder.com/150"
  - Website: "https://example.com"
  - Twitter: "@testauthor"
  - LinkedIn: "https://linkedin.com/in/testauthor"
- [ ] Click "Save"
- [ ] **Verify:** Author appears in author list
- [ ] **Verify:** Author slug is URL-friendly

#### Read Author

- [ ] Click on the created author
- [ ] **Verify:** All fields display correctly
- [ ] **Verify:** Timestamps show (created_at, updated_at)

#### Update Author

- [ ] Click "Edit" on the author
- [ ] Change display name to "Updated Test Author"
- [ ] Add metadata: `{"social": {"github": "testauthor"}}`
- [ ] Click "Save"
- [ ] **Verify:** Changes are saved
- [ ] **Verify:** `updated_at` timestamp changed
- [ ] **Verify:** `created_at` timestamp unchanged

#### Delete Author

- [ ] Create a new test author (not linked to any posts)
- [ ] Click "Delete" on the new author
- [ ] Confirm deletion
- [ ] **Verify:** Author removed from list
- [ ] **Verify:** Database query confirms deletion:

```sql
SELECT COUNT(*) FROM public.blog_authors WHERE slug = 'new-test-author';
-- Should return 0
```

### Test 2.2: Blog Categories

#### Create Category

- [ ] Navigate to `/admin/blog/categories`
- [ ] Click "Create Category"
- [ ] Fill in fields:
  - Name: "Technology"
  - Slug: "technology"
  - Description: "Posts about technology and innovation"
  - SEO Title: "Technology Articles | AI Adventure Scribe"
  - SEO Description: "Explore technology insights and innovations"
- [ ] Click "Save"
- [ ] **Verify:** Category appears in list

#### Create Multiple Categories

- [ ] Create categories: "AI & ML", "Game Design", "Product Updates", "Tutorials"
- [ ] **Verify:** All categories have unique slugs
- [ ] **Verify:** Categories can be assigned to posts

#### Update Category

- [ ] Edit "Technology" category
- [ ] Change name to "Tech & Innovation"
- [ ] Update SEO metadata
- [ ] Click "Save"
- [ ] **Verify:** Changes saved
- [ ] **Verify:** Slug remains unchanged (or updates correctly if slug is auto-generated from name)

#### Delete Category

- [ ] Create a test category "Temporary"
- [ ] Delete the category
- [ ] **Verify:** Category removed
- [ ] **Verify:** No orphaned post-category relationships remain:

```sql
SELECT COUNT(*) FROM public.blog_post_categories
WHERE category_id NOT IN (SELECT id FROM public.blog_categories);
-- Should return 0
```

### Test 2.3: Blog Tags

#### Create Tags

- [ ] Navigate to `/admin/blog/tags`
- [ ] Create tags:
  - "machine-learning"
  - "chatgpt"
  - "game-mechanics"
  - "typescript"
  - "react"
- [ ] **Verify:** All tags created successfully
- [ ] **Verify:** Tags have unique slugs

#### Bulk Tag Creation

- [ ] Test creating multiple tags at once (if supported by UI)
- [ ] **Verify:** All tags saved correctly

#### Update Tag

- [ ] Edit "machine-learning" tag
- [ ] Add description: "Posts about ML algorithms and applications"
- [ ] Click "Save"
- [ ] **Verify:** Changes saved

#### Delete Tag

- [ ] Create a test tag "temp-tag"
- [ ] Delete the tag
- [ ] **Verify:** Tag removed
- [ ] **Verify:** No orphaned post-tag relationships

### Test 2.4: Blog Posts

#### Create Draft Post

- [ ] Navigate to `/admin/blog/posts`
- [ ] Click "Create Post"
- [ ] Fill in fields:
  - Title: "Test Blog Post - Draft"
  - Slug: "test-blog-post-draft"
  - Summary: "A test post to verify the CMS"
  - Content: "This is the full content of the test post with **markdown** support."
  - Author: Select the test author created earlier
  - Status: "draft"
- [ ] **Do not set** `published_at`
- [ ] Click "Save"
- [ ] **Verify:** Post created with status "draft"
- [ ] **Verify:** Post does NOT appear on public `/blog` page

#### Add SEO Metadata

- [ ] Edit the draft post
- [ ] Add SEO fields:
  - SEO Title: "Test Blog Post | AI Adventure Scribe"
  - SEO Description: "A comprehensive test of the blog CMS"
  - SEO Keywords: ["testing", "cms", "blog"]
  - Canonical URL: "https://infinite-realms.ai/blog/test-blog-post-draft"
- [ ] Click "Save"
- [ ] **Verify:** SEO metadata saved

#### Assign Categories and Tags

- [ ] Edit the draft post
- [ ] Assign category: "Technology"
- [ ] Assign tags: "machine-learning", "typescript", "react"
- [ ] Click "Save"
- [ ] **Verify:** Categories and tags linked correctly:

```sql
SELECT
  bp.title,
  array_agg(DISTINCT bc.name) as categories,
  array_agg(DISTINCT bt.name) as tags
FROM public.blog_posts bp
LEFT JOIN public.blog_post_categories bpc ON bpc.post_id = bp.id
LEFT JOIN public.blog_categories bc ON bc.id = bpc.category_id
LEFT JOIN public.blog_post_tags bpt ON bpt.post_id = bp.id
LEFT JOIN public.blog_tags bt ON bt.id = bpt.tag_id
WHERE bp.slug = 'test-blog-post-draft'
GROUP BY bp.id, bp.title;
```

#### Publish Post (Immediate)

- [ ] Edit the draft post
- [ ] Change status to "published"
- [ ] Leave `published_at` empty (should auto-set to NOW())
- [ ] Click "Save"
- [ ] **Verify:** Post status is "published"
- [ ] **Verify:** `published_at` is automatically set to current timestamp
- [ ] **Verify:** Post appears on public `/blog` page
- [ ] **Verify:** Post shows correct author, categories, and tags

#### Schedule Post

- [ ] Create a new post: "Scheduled Post"
- [ ] Set status to "scheduled"
- [ ] Set `scheduled_for` to a future date/time (e.g., tomorrow)
- [ ] Click "Save"
- [ ] **Verify:** Post status is "scheduled"
- [ ] **Verify:** Post does NOT appear on public `/blog` page yet
- [ ] **Verify:** Database shows correct `scheduled_for`:

```sql
SELECT title, status, scheduled_for, published_at
FROM public.blog_posts
WHERE slug = 'scheduled-post';
```

**Note:** Auto-publishing scheduled posts requires a cron job or background worker (not part of the migration).

#### Archive Post

- [ ] Edit a published post
- [ ] Change status to "archived"
- [ ] Click "Save"
- [ ] **Verify:** Post status is "archived"
- [ ] **Verify:** Post does NOT appear on public `/blog` page
- [ ] **Verify:** Post still accessible in admin panel

#### Update Post Content

- [ ] Edit a published post
- [ ] Change title to "Updated Test Post Title"
- [ ] Modify content
- [ ] Click "Save"
- [ ] **Verify:** Changes saved
- [ ] **Verify:** `updated_at` timestamp changed
- [ ] **Verify:** `published_at` timestamp unchanged
- [ ] **Verify:** Updated content appears on public `/blog` page

#### Delete Post

- [ ] Create a test post "Post to Delete"
- [ ] Delete the post
- [ ] **Verify:** Post removed from list
- [ ] **Verify:** Associated categories and tags also removed:

```sql
SELECT COUNT(*) FROM public.blog_post_categories WHERE post_id = 'DELETED_POST_ID';
SELECT COUNT(*) FROM public.blog_post_tags WHERE post_id = 'DELETED_POST_ID';
-- Both should return 0
```

---

## Test Plan 3: Media Upload

### Test 3.1: Featured Image Upload

- [ ] Create or edit a post
- [ ] Click "Upload Featured Image"
- [ ] Select an image file (PNG, JPG, or WebP)
- [ ] **Verify:** Image uploads successfully
- [ ] **Verify:** `featured_image_url` is set
- [ ] **Verify:** Image appears in post preview
- [ ] **Verify:** Image displays on public blog page

### Test 3.2: Content Images

- [ ] Edit post content
- [ ] Use image upload in rich text editor (if available)
- [ ] Insert image into content
- [ ] Click "Save"
- [ ] **Verify:** Image appears in post content
- [ ] **Verify:** Image has correct alt text
- [ ] **Verify:** Image loads on public page

### Test 3.3: Media Storage

- [ ] Upload several images
- [ ] **Verify:** Images stored in correct bucket/directory:

```bash
# For Supabase Storage
# Check via Supabase Dashboard: Storage > blog-media

# For local VPS storage
ls -lh /var/www/blog-media/
```

- [ ] **Verify:** Image URLs are publicly accessible
- [ ] **Verify:** Images have reasonable file sizes (optimized)

### Test 3.4: Media Deletion

- [ ] Remove featured image from a post
- [ ] Click "Save"
- [ ] **Verify:** `featured_image_url` is null
- [ ] **Verify:** Image no longer appears on post

**Note:** Orphaned media cleanup may require a separate script.

---

## Test Plan 4: Blog Public Pages

### Test 4.1: Blog Index (`/blog`)

- [ ] Navigate to `/blog` (logged out)
- [ ] **Verify:** Only published posts appear
- [ ] **Verify:** Posts sorted by `published_at` (newest first)
- [ ] **Verify:** Each post shows:
  - Title
  - Summary
  - Featured image (if set)
  - Author name
  - Published date
  - Categories and tags
- [ ] **Verify:** Pagination works (if implemented)
- [ ] **Verify:** "Read More" links work

### Test 4.2: Single Post Page (`/blog/:slug`)

- [ ] Click on a post from the blog index
- [ ] **Verify:** Post loads at `/blog/test-blog-post-draft`
- [ ] **Verify:** Page shows:
  - Full title
  - Author info (name, avatar, bio)
  - Published date
  - Featured image
  - Full content (with markdown/rich text rendered)
  - Categories and tags
- [ ] **Verify:** SEO metadata in HTML:

```bash
# Check page source
curl -s https://yourdomain.com/blog/test-blog-post-draft | grep -E '(og:title|og:description|twitter:card)'
```

- [ ] **Verify:** Canonical URL is set
- [ ] **Verify:** Related posts appear (if implemented)

### Test 4.3: Category Pages (`/blog/category/:slug`)

- [ ] Navigate to `/blog/category/technology`
- [ ] **Verify:** Only posts in "Technology" category appear
- [ ] **Verify:** Category name and description displayed
- [ ] **Verify:** SEO metadata correct

### Test 4.4: Tag Pages (`/blog/tag/:slug`)

- [ ] Navigate to `/blog/tag/machine-learning`
- [ ] **Verify:** Only posts tagged "machine-learning" appear
- [ ] **Verify:** Tag name displayed
- [ ] **Verify:** Posts sorted by date

### Test 4.5: Author Pages (`/blog/author/:slug`)

- [ ] Navigate to `/blog/author/test-author`
- [ ] **Verify:** Author profile displayed (name, bio, avatar, social links)
- [ ] **Verify:** Only posts by this author appear
- [ ] **Verify:** Post count is correct

### Test 4.6: Sitemap (`/sitemap.xml`)

- [ ] Navigate to `/sitemap.xml`
- [ ] **Verify:** XML is valid
- [ ] **Verify:** All published posts included
- [ ] **Verify:** URLs are absolute (include `SITE_URL`)
- [ ] **Verify:** `lastmod` dates are correct
- [ ] **Verify:** Priority and changefreq are set appropriately

```xml
<!-- Expected format -->
<url>
  <loc>https://infinite-realms.ai/blog/test-blog-post-draft</loc>
  <lastmod>2025-11-14</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

### Test 4.7: RSS Feed (`/rss.xml`)

- [ ] Navigate to `/rss.xml`
- [ ] **Verify:** XML is valid RSS 2.0
- [ ] **Verify:** All published posts included
- [ ] **Verify:** Post content included (or summary)
- [ ] **Verify:** Dates are in RFC-822 format
- [ ] **Verify:** Feed validates: https://validator.w3.org/feed/

```xml
<!-- Expected format -->
<item>
  <title>Test Blog Post - Draft</title>
  <link>https://infinite-realms.ai/blog/test-blog-post-draft</link>
  <description>A test post to verify the CMS</description>
  <pubDate>Thu, 14 Nov 2025 12:00:00 GMT</pubDate>
  <guid>https://infinite-realms.ai/blog/test-blog-post-draft</guid>
</item>
```

---

## Test Plan 5: Role-Based Access Control

### Test 5.1: Admin Role

**As Admin User:**

- [ ] Can view all posts (draft, published, archived)
- [ ] Can create new authors, categories, tags, posts
- [ ] Can edit any post (even from other authors)
- [ ] Can delete any post
- [ ] Can change post status to published/archived
- [ ] Can assign any author to a post

### Test 5.2: Author Role

**As Author User:**

Create an author profile for this user first:

```sql
INSERT INTO public.blog_authors (user_id, display_name, slug, short_bio)
VALUES ('AUTHOR_USER_ID', 'Author User', 'author-user', 'Test author bio')
ON CONFLICT (user_id) DO NOTHING;
```

**Then test:**

- [ ] Can view own posts (all statuses)
- [ ] Can create new posts (author must be self)
- [ ] Can edit own posts
- [ ] Can delete own posts
- [ ] **Cannot** edit other authors' posts
- [ ] **Cannot** delete other authors' posts
- [ ] **Cannot** create/edit/delete categories (admin only)
- [ ] **Cannot** create/edit/delete tags (admin only)
- [ ] Can edit own author profile
- [ ] **Cannot** edit other author profiles

### Test 5.3: Viewer Role (Public)

**As Viewer/Anonymous User:**

- [ ] Can view `/blog` index
- [ ] Can view published posts only
- [ ] **Cannot** access `/admin/blog`
- [ ] **Cannot** view draft posts
- [ ] **Cannot** view scheduled posts
- [ ] **Cannot** view archived posts

**Verify via API:**

```sql
-- Set session as public user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "public-user-id", "role": "authenticated"}';

-- Try to access draft posts (should return 0 rows)
SELECT COUNT(*) FROM public.blog_posts WHERE status = 'draft';

-- Reset
RESET ROLE;
```

### Test 5.4: Policy Enforcement

Test RLS policies are enforcing correctly:

```sql
-- As public user, try to insert a post (should fail)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "public-user-id", "role": "authenticated"}';

INSERT INTO public.blog_posts (author_id, title, slug, status)
VALUES ('some-author-id', 'Hacked Post', 'hacked', 'published');
-- Should fail with permission denied

RESET ROLE;
```

```sql
-- As author, try to edit another author's post (should fail)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "author-user-id", "role": "authenticated"}';

UPDATE public.blog_posts
SET title = 'Hacked Title'
WHERE author_id != (
  SELECT id FROM public.blog_authors WHERE user_id = 'author-user-id'
);
-- Should update 0 rows due to RLS

RESET ROLE;
```

---

## Test Plan 6: Performance

### Test 6.1: Query Performance

Test key queries are fast (<100ms):

```sql
-- Blog index page query
EXPLAIN ANALYZE
SELECT
  bp.id, bp.title, bp.slug, bp.summary, bp.featured_image_url, bp.published_at,
  ba.display_name as author_name, ba.slug as author_slug, ba.avatar_url as author_avatar
FROM public.blog_posts bp
JOIN public.blog_authors ba ON ba.id = bp.author_id
WHERE bp.status = 'published'
  AND bp.published_at IS NOT NULL
  AND bp.published_at <= NOW()
ORDER BY bp.published_at DESC
LIMIT 20;
```

**Expected:** Execution time < 50ms

```sql
-- Single post query with categories and tags
EXPLAIN ANALYZE
SELECT
  bp.*,
  ba.display_name as author_name,
  ba.slug as author_slug,
  ba.avatar_url as author_avatar,
  ba.short_bio as author_bio,
  array_agg(DISTINCT bc.name) as categories,
  array_agg(DISTINCT bt.name) as tags
FROM public.blog_posts bp
JOIN public.blog_authors ba ON ba.id = bp.author_id
LEFT JOIN public.blog_post_categories bpc ON bpc.post_id = bp.id
LEFT JOIN public.blog_categories bc ON bc.id = bpc.category_id
LEFT JOIN public.blog_post_tags bpt ON bpt.post_id = bp.id
LEFT JOIN public.blog_tags bt ON bt.id = bpt.tag_id
WHERE bp.slug = 'test-blog-post-draft'
  AND bp.status = 'published'
GROUP BY bp.id, ba.id;
```

**Expected:** Execution time < 20ms

### Test 6.2: Index Usage

Verify indexes are being used:

```sql
-- Should use idx_blog_posts_published_at
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.blog_posts
WHERE status = 'published'
ORDER BY published_at DESC
LIMIT 10;
```

**Expected:** "Index Scan using idx_blog_posts_published_at"

### Test 6.3: Large Dataset Performance

If you have >1,000 posts, test pagination:

```sql
-- Offset pagination (page 10)
EXPLAIN ANALYZE
SELECT * FROM public.blog_posts
WHERE status = 'published'
ORDER BY published_at DESC
LIMIT 20 OFFSET 200;
```

**Expected:** Still uses index, time < 100ms

### Test 6.4: Concurrent Users

Simulate multiple users accessing the blog:

```bash
# Using Apache Bench (install: apt-get install apache2-utils)
ab -n 1000 -c 10 https://yourdomain.com/blog/

# Expected:
# - 95th percentile response time < 500ms
# - No errors
# - Requests per second > 50
```

---

## Test Plan 7: Data Integrity

### Test 7.1: Cascade Deletes

- [ ] Create a post with categories and tags
- [ ] Delete the post
- [ ] **Verify:** Post-category and post-tag relationships also deleted:

```sql
SELECT COUNT(*) FROM public.blog_post_categories WHERE post_id = 'DELETED_POST_ID';
SELECT COUNT(*) FROM public.blog_post_tags WHERE post_id = 'DELETED_POST_ID';
-- Both should return 0
```

### Test 7.2: Orphan Prevention

- [ ] Delete all posts by an author
- [ ] Try to delete the author
- [ ] **Verify:** Author can be deleted (no orphaned posts)

### Test 7.3: Timestamp Triggers

- [ ] Create a post
- [ ] Note `created_at` and `updated_at`
- [ ] Wait 5 seconds
- [ ] Update the post
- [ ] **Verify:** `updated_at` changed, `created_at` unchanged

```sql
SELECT
  title,
  created_at,
  updated_at,
  updated_at > created_at as timestamps_correct
FROM public.blog_posts
WHERE slug = 'test-blog-post-draft';
```

### Test 7.4: Published Date Auto-Set

- [ ] Create a draft post (leave `published_at` null)
- [ ] Change status to "published"
- [ ] Save
- [ ] **Verify:** `published_at` auto-set to current timestamp

```sql
SELECT
  title,
  status,
  published_at,
  published_at IS NOT NULL as has_published_date
FROM public.blog_posts
WHERE slug = 'test-blog-post-draft';
```

---

## Test Plan 8: Edge Cases

### Test 8.1: Duplicate Slugs

- [ ] Try to create two posts with the same slug
- [ ] **Verify:** Database rejects with unique constraint error
- [ ] **Verify:** UI shows helpful error message

### Test 8.2: Missing Required Fields

- [ ] Try to create a post without a title
- [ ] **Verify:** Validation error
- [ ] Try to create a post without an author
- [ ] **Verify:** Validation error

### Test 8.3: Invalid Status Transition

- [ ] Try to set post status to invalid value (e.g., "testing")
- [ ] **Verify:** Check constraint prevents this:

```sql
INSERT INTO public.blog_posts (author_id, title, slug, status)
VALUES ('author-id', 'Test', 'test', 'invalid-status');
-- Should fail with: new row for relation "blog_posts" violates check constraint
```

### Test 8.4: Future Published Date

- [ ] Create a post with status "published"
- [ ] Set `published_at` to a future date
- [ ] **Verify:** Post does NOT appear on public blog (RLS policy checks `published_at <= NOW()`)

### Test 8.5: Null Author

- [ ] Try to create a post with null `author_id`
- [ ] **Verify:** Database rejects (NOT NULL constraint)

### Test 8.6: Author User Deletion

- [ ] Create an author linked to a Supabase auth user
- [ ] Delete the auth user
- [ ] **Verify:** Author's `user_id` is set to NULL (ON DELETE SET NULL)
- [ ] **Verify:** Author record still exists
- [ ] **Verify:** Posts by this author still exist

---

## Test Plan 9: SEO Validation

### Test 9.1: Meta Tags

- [ ] View page source of a blog post
- [ ] **Verify:** Meta tags present:
  - `<title>`
  - `<meta name="description">`
  - `<meta property="og:title">`
  - `<meta property="og:description">`
  - `<meta property="og:image">`
  - `<meta property="og:url">`
  - `<meta name="twitter:card">`
  - `<link rel="canonical">`

### Test 9.2: Structured Data

- [ ] Check for JSON-LD structured data
- [ ] **Verify:** BlogPosting schema present
- [ ] Validate with: https://search.google.com/test/rich-results

### Test 9.3: Sitemap Submission

- [ ] Submit sitemap to Google Search Console
- [ ] **Verify:** No errors
- [ ] **Verify:** All URLs indexed

---

## Test Plan 10: Accessibility

### Test 10.1: Keyboard Navigation

- [ ] Navigate blog pages using only keyboard (Tab, Enter, Arrow keys)
- [ ] **Verify:** All interactive elements accessible
- [ ] **Verify:** Focus indicators visible

### Test 10.2: Screen Reader

- [ ] Test with screen reader (NVDA, JAWS, or VoiceOver)
- [ ] **Verify:** Headings are semantic (`h1`, `h2`, etc.)
- [ ] **Verify:** Images have alt text
- [ ] **Verify:** Links have descriptive text

### Test 10.3: WCAG Compliance

- [ ] Run automated accessibility checker (axe DevTools)
- [ ] **Verify:** No critical issues
- [ ] **Target:** WCAG 2.1 AA compliance

---

## Smoke Test Quick Checklist

For rapid verification after deployment, run this abbreviated checklist (5-10 minutes):

1. **Database:**
   - [ ] 6 blog tables exist
   - [ ] 19 RLS policies exist
   - [ ] 5 triggers exist

2. **Admin Panel:**
   - [ ] Can create author
   - [ ] Can create category
   - [ ] Can create post
   - [ ] Can publish post

3. **Public Pages:**
   - [ ] `/blog` shows published posts
   - [ ] `/blog/:slug` loads post
   - [ ] `/sitemap.xml` is valid XML
   - [ ] `/rss.xml` is valid RSS

4. **Permissions:**
   - [ ] Admin can edit all posts
   - [ ] Author can only edit own posts
   - [ ] Public cannot access admin panel

5. **Performance:**
   - [ ] Blog index loads in <1 second
   - [ ] Single post loads in <500ms

---

## Regression Testing

After any schema changes or updates, re-run:

- [ ] Test Plan 1 (Database Schema)
- [ ] Test Plan 2.4 (Blog Posts CRUD)
- [ ] Test Plan 4 (Public Pages)
- [ ] Test Plan 5 (Role-Based Access)
- [ ] Smoke Test Quick Checklist

---

## Automated Testing

Consider automating these tests with:

- **E2E tests:** Playwright or Cypress for UI testing
- **API tests:** Jest or Vitest for database queries
- **Load tests:** k6 or Artillery for performance testing
- **Accessibility tests:** axe-core or pa11y

Example Playwright test:

```typescript
// tests/blog-cms.spec.ts
import { test, expect } from '@playwright/test';

test('blog index shows published posts', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.locator('h1')).toContainText('Blog');
  const posts = page.locator('article');
  await expect(posts).toHaveCountGreaterThan(0);
});

test('draft posts not visible to public', async ({ page }) => {
  await page.goto('/blog/draft-post-slug');
  await expect(page.locator('text=404')).toBeVisible();
});
```

---

## Sign-off Checklist

After completing all test plans:

- [ ] All database tables, indexes, functions, policies, and triggers verified
- [ ] Admin CRUD operations working for authors, categories, tags, and posts
- [ ] Media upload functioning correctly
- [ ] Public pages rendering correctly with proper SEO
- [ ] Role-based access control enforcing permissions
- [ ] Performance benchmarks met
- [ ] Data integrity maintained
- [ ] Edge cases handled gracefully
- [ ] SEO and accessibility standards met
- [ ] Smoke tests pass

**Signed off by:** ___________________

**Date:** ___________________

---

## Changelog

- **2025-11-14:** Initial verification checklist created
