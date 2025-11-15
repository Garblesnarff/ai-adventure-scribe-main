# Blog CMS Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Blog CMS feature to your Hetzner VPS with a local PostgreSQL database. The Blog CMS adds a full-featured content management system with:

- Blog authors with profiles and social links
- Blog posts with SEO metadata, workflow states, and scheduling
- Categories and tags for content organization
- Row-level security policies for role-based access control
- Automatic sitemap and RSS feed generation

**Estimated Deployment Time:** 15-20 minutes

---

## Prerequisites

### 1. Database Access

Ensure you have access to the PostgreSQL database on your Hetzner VPS:

```bash
# Test database connection
psql "$DATABASE_URL" -c "SELECT version();"
```

**Required:** The `DATABASE_URL` environment variable must be set and accessible.

**Format:** `postgresql://username:password@host:port/database`

### 2. Existing Tables

The migration extends the `user_profiles` table with a `blog_role` column. Verify this table exists:

```bash
psql "$DATABASE_URL" -c "\dt public.user_profiles"
```

If the table doesn't exist, the migration will safely skip this step (the Blog CMS will still function, but role-based access will need to be managed differently).

### 3. Storage Bucket

Create the blog media storage bucket in Supabase (if using Supabase Storage) or ensure your VPS has a designated directory for blog media:

**Supabase Storage:**
```bash
# Via Supabase Dashboard: Storage > Create Bucket
# Bucket name: blog-media
# Public bucket: Yes (for public blog images)
```

**Local VPS Storage:**
```bash
# Create media directory
mkdir -p /var/www/blog-media
chmod 755 /var/www/blog-media
```

### 4. Environment Variables

Ensure the following environment variables are set:

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Required for sitemap/RSS generation
SITE_URL=https://yourdomain.com

# Required for media uploads
BLOG_MEDIA_BUCKET=blog-media

# Optional: Service role key (if using Supabase)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Add these to your `.env.local` file or export them in your shell environment.

---

## Deployment Steps

### Step 1: Backup Database

**CRITICAL:** Always backup before applying migrations.

```bash
# Create backup with timestamp
pg_dump "$DATABASE_URL" > "backup_blog_cms_$(date +%Y%m%d_%H%M%S).sql"

# Verify backup was created
ls -lh backup_blog_cms_*.sql
```

### Step 2: Review Migration

Review the migration file to understand what will be created:

```bash
cat supabase/migrations/20251017_create_blog_cms.sql
```

**What the migration creates:**
- 1 helper function: `set_updated_at()`
- 1 column extension: `user_profiles.blog_role`
- 4 main tables: `blog_authors`, `blog_categories`, `blog_tags`, `blog_posts`
- 2 join tables: `blog_post_categories`, `blog_post_tags`
- 7 helper functions for role/permission checks
- 1 view: `blog_user_roles`
- 19 RLS policies for access control
- 5 triggers for automatic timestamp updates

### Step 3: Apply Migration (Automated)

Use the provided deployment script for a guided, automated deployment:

```bash
# Make script executable
chmod +x scripts/deploy-blog-cms.sh

# Run deployment script
./scripts/deploy-blog-cms.sh
```

The script will:
1. Check prerequisites (DATABASE_URL, etc.)
2. Create a timestamped backup
3. Apply the migration
4. Verify tables were created
5. Run smoke tests
6. Report success or failure

### Step 3: Apply Migration (Manual)

Alternatively, apply the migration manually using `psql`:

```bash
# Apply migration with error handling
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20251017_create_blog_cms.sql
```

**Expected Output:**
```
CREATE FUNCTION
DO
CREATE TABLE
CREATE INDEX
...
CREATE POLICY
```

If you see any errors, **STOP** and review the error message before proceeding.

### Step 4: Verify Installation

Run verification queries to ensure tables were created:

```bash
# List all blog tables
psql "$DATABASE_URL" -c "\dt public.blog_*"

# Verify table counts
psql "$DATABASE_URL" -c "
SELECT
  'blog_authors' as table_name, COUNT(*) as count FROM public.blog_authors
UNION ALL
SELECT 'blog_categories', COUNT(*) FROM public.blog_categories
UNION ALL
SELECT 'blog_tags', COUNT(*) FROM public.blog_tags
UNION ALL
SELECT 'blog_posts', COUNT(*) FROM public.blog_posts;
"
```

**Expected Output:**
```
           List of relations
 Schema |         Name          | Type  |  Owner
--------+-----------------------+-------+---------
 public | blog_authors          | table | ...
 public | blog_categories       | table | ...
 public | blog_post_categories  | table | ...
 public | blog_post_tags        | table | ...
 public | blog_posts            | table | ...
 public | blog_tags             | table | ...
```

### Step 5: Verify RLS Policies

Ensure Row-Level Security policies were created:

```bash
psql "$DATABASE_URL" -c "
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'blog_%'
ORDER BY tablename, policyname;
"
```

You should see 19 policies across the 6 blog tables.

### Step 6: Seed Initial Data (Optional)

You can seed sample blog data for testing:

```bash
# Run the blog seeding script
node scripts/seed-blog-data.js
```

This will create:
- 2-3 sample authors
- 3-5 categories
- 10-15 tags
- 10-20 sample blog posts (mix of draft/published)

### Step 7: Restart Application

Restart your application to ensure it picks up the new database schema:

```bash
# For PM2
pm2 restart all

# For systemd
sudo systemctl restart your-app-service

# For Docker
docker-compose restart
```

### Step 8: Verify Application

Test the blog CMS in your application:

1. **Access Admin Panel:** Navigate to `/admin/blog`
2. **Create Test Author:** Add a new blog author
3. **Create Test Post:** Create a draft blog post
4. **Publish Post:** Change status to "published"
5. **View Blog:** Navigate to `/blog` and verify post appears

---

## Post-Deployment Verification

See [BLOG_CMS_VERIFICATION.md](./BLOG_CMS_VERIFICATION.md) for comprehensive test plans:

- [ ] Admin CRUD operations (create/read/update/delete)
- [ ] Media upload functionality
- [ ] Blog public pages (`/blog`, `/sitemap.xml`, `/rss.xml`)
- [ ] Role-based access control
- [ ] Scheduled post publishing
- [ ] Performance benchmarks

---

## Rollback Procedure

If you encounter issues and need to rollback:

### Option 1: Restore from Backup

```bash
# Stop your application first
pm2 stop all  # or your equivalent

# Restore from backup
psql "$DATABASE_URL" < backup_blog_cms_YYYYMMDD_HHMMSS.sql

# Restart application
pm2 restart all
```

### Option 2: Manual Rollback (Drop Tables)

**WARNING:** This will delete ALL blog data.

```bash
psql "$DATABASE_URL" << 'EOF'
-- Drop policies
DROP POLICY IF EXISTS "Public can read blog authors" ON public.blog_authors;
DROP POLICY IF EXISTS "Admins manage blog authors" ON public.blog_authors;
DROP POLICY IF EXISTS "Authors manage their own author profile" ON public.blog_authors;
DROP POLICY IF EXISTS "Authors create their own author profile" ON public.blog_authors;
DROP POLICY IF EXISTS "Public can read blog categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Admins manage blog categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Public can read blog tags" ON public.blog_tags;
DROP POLICY IF EXISTS "Admins manage blog tags" ON public.blog_tags;
DROP POLICY IF EXISTS "Public can read published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can read their blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins manage blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors create blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors update their blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors delete their blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Public can read published post categories" ON public.blog_post_categories;
DROP POLICY IF EXISTS "Admins manage post categories" ON public.blog_post_categories;
DROP POLICY IF EXISTS "Authors manage their post categories" ON public.blog_post_categories;
DROP POLICY IF EXISTS "Public can read published post tags" ON public.blog_post_tags;
DROP POLICY IF EXISTS "Admins manage post tags" ON public.blog_post_tags;
DROP POLICY IF EXISTS "Authors manage their post tags" ON public.blog_post_tags;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_blog_authors_updated_at ON public.blog_authors;
DROP TRIGGER IF EXISTS trg_blog_categories_updated_at ON public.blog_categories;
DROP TRIGGER IF EXISTS trg_blog_tags_updated_at ON public.blog_tags;
DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON public.blog_posts;
DROP TRIGGER IF EXISTS trg_blog_posts_published_at ON public.blog_posts;

-- Drop view
DROP VIEW IF EXISTS public.blog_user_roles;

-- Drop tables (cascade to drop foreign keys)
DROP TABLE IF EXISTS public.blog_post_tags CASCADE;
DROP TABLE IF EXISTS public.blog_post_categories CASCADE;
DROP TABLE IF EXISTS public.blog_posts CASCADE;
DROP TABLE IF EXISTS public.blog_tags CASCADE;
DROP TABLE IF EXISTS public.blog_categories CASCADE;
DROP TABLE IF EXISTS public.blog_authors CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.can_manage_blog_post(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_manage_blog_author(uuid, uuid);
DROP FUNCTION IF EXISTS public.blog_role_for_user(uuid);
DROP FUNCTION IF EXISTS public.is_blog_author(uuid);
DROP FUNCTION IF EXISTS public.is_blog_admin(uuid);
DROP FUNCTION IF EXISTS public.set_blog_post_published_at();
DROP FUNCTION IF EXISTS public.set_updated_at();

-- Remove blog_role column from user_profiles
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS blog_role;
EOF
```

---

## Troubleshooting

### Error: "relation 'user_profiles' does not exist"

**Cause:** The `user_profiles` table hasn't been created yet.

**Solution:** The migration will safely skip extending `user_profiles`. Blog CMS will still work, but you'll need to manage roles differently. Create the `user_profiles` table first, then re-run the migration.

### Error: "permission denied for table blog_posts"

**Cause:** RLS policies are preventing access.

**Solution:** Ensure the user has the appropriate `blog_role` in `user_profiles`:

```sql
UPDATE public.user_profiles
SET blog_role = 'admin'
WHERE user_id = 'YOUR_USER_ID';
```

### Error: "duplicate key value violates unique constraint"

**Cause:** Migration is being re-run and tables already exist.

**Solution:** The migration uses `IF NOT EXISTS` clauses and should be idempotent. If you see this error, it means data already exists. Drop the tables (see Rollback) or use a fresh database.

### Blog posts not appearing on `/blog`

**Causes:**
1. Posts are still in `draft` status
2. Posts don't have `published_at` set
3. `published_at` is in the future

**Solution:**

```sql
-- Check post status
SELECT id, title, status, published_at
FROM public.blog_posts
ORDER BY created_at DESC;

-- Publish a post
UPDATE public.blog_posts
SET status = 'published', published_at = NOW()
WHERE id = 'POST_ID';
```

---

## Security Considerations

### Row-Level Security (RLS)

All blog tables have RLS enabled with the following access patterns:

- **Public users:** Can read published posts, authors, categories, tags
- **Authors:** Can create/edit their own posts and author profile
- **Admins:** Can manage all blog content

### Role Assignment

Assign blog roles carefully:

```sql
-- Make a user a blog admin
UPDATE public.user_profiles
SET blog_role = 'admin'
WHERE user_id = 'USER_ID';

-- Make a user a blog author
UPDATE public.user_profiles
SET blog_role = 'author'
WHERE user_id = 'USER_ID';
```

### API Access

Ensure your Supabase anon key has limited permissions. The service role key should only be used server-side for admin operations.

---

## Performance Considerations

The migration creates indexes on:

- `blog_authors.user_id`
- `blog_posts.author_id`
- `blog_posts.status`
- `blog_posts.published_at` (descending, for recent posts)
- `blog_post_categories.post_id` and `category_id`
- `blog_post_tags.post_id` and `tag_id`

For optimal performance with large datasets (>10,000 posts):

```sql
-- Add additional indexes if needed
CREATE INDEX CONCURRENTLY idx_blog_posts_published_status
ON public.blog_posts(published_at DESC)
WHERE status = 'published';

-- Analyze tables for query planner
ANALYZE public.blog_posts;
ANALYZE public.blog_authors;
```

---

## Monitoring

Monitor blog CMS health with these queries:

```sql
-- Count posts by status
SELECT status, COUNT(*)
FROM public.blog_posts
GROUP BY status
ORDER BY status;

-- Recent posts
SELECT title, status, published_at, created_at
FROM public.blog_posts
ORDER BY created_at DESC
LIMIT 10;

-- Authors with post counts
SELECT
  ba.display_name,
  COUNT(bp.id) as post_count
FROM public.blog_authors ba
LEFT JOIN public.blog_posts bp ON bp.author_id = ba.id
GROUP BY ba.id, ba.display_name
ORDER BY post_count DESC;
```

---

## Next Steps

After successful deployment:

1. **Create your first author profile** in the admin panel
2. **Set up blog categories** relevant to your content strategy
3. **Create initial blog posts** (start with 3-5 high-quality posts)
4. **Configure SEO metadata** for each post
5. **Test sitemap generation** at `/sitemap.xml`
6. **Test RSS feed** at `/rss.xml`
7. **Set up analytics** to track blog performance
8. **Schedule regular content** using the scheduling feature

---

## Support

For issues or questions:

- Review [BLOG_CMS_VERIFICATION.md](./BLOG_CMS_VERIFICATION.md) for common test scenarios
- Check application logs for detailed error messages
- Verify database connection and permissions
- Ensure all environment variables are set correctly

---

## Changelog

- **2025-11-14:** Initial deployment guide created
