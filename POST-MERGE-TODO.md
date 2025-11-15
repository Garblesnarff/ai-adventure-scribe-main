# Post-merge TODO: Apply Supabase Blog CMS Migration

## STATUS: ✅ READY FOR DEPLOYMENT

- **Task:** Apply the blog CMS migration when database access is available on Hetzner VPS
- **Migration file:** `supabase/migrations/20251017_create_blog_cms.sql`
- **Owner:** DevOps/Admin with database access
- **Deployment Guide:** [docs/deployment/BLOG_CMS_DEPLOYMENT.md](docs/deployment/BLOG_CMS_DEPLOYMENT.md)
- **Verification Guide:** [docs/deployment/BLOG_CMS_VERIFICATION.md](docs/deployment/BLOG_CMS_VERIFICATION.md)

---

## Quick Start (Automated Deployment)

Run the deployment script for guided, automated deployment:

```bash
# Ensure DATABASE_URL is set
export DATABASE_URL='postgresql://user:pass@localhost:5432/dbname'

# Optional: Set environment variables
export SITE_URL='https://infinite-realms.ai'
export BLOG_MEDIA_BUCKET='blog-media'

# Run deployment script
./scripts/deploy-blog-cms.sh
```

The script will:
1. ✓ Check prerequisites (DATABASE_URL, psql, migration file)
2. ✓ Create timestamped backup
3. ✓ Apply migration
4. ✓ Verify tables, indexes, functions, policies, triggers
5. ✓ Run smoke tests
6. ✓ Report success or provide rollback instructions

---

## Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# 1. Create backup
pg_dump "$DATABASE_URL" > "backup_blog_cms_$(date +%Y%m%d_%H%M%S).sql"

# 2. Apply migration
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20251017_create_blog_cms.sql

# 3. Verify installation
psql "$DATABASE_URL" -c "\dt public.blog_*"
```

See [BLOG_CMS_DEPLOYMENT.md](docs/deployment/BLOG_CMS_DEPLOYMENT.md) for detailed manual instructions.

---

## Prerequisites

Before deployment, ensure:

- [ ] `DATABASE_URL` environment variable is set and accessible
- [ ] PostgreSQL database is running and accessible
- [ ] `user_profiles` table exists (for blog role extension)
- [ ] Storage bucket configured: `BLOG_MEDIA_BUCKET=blog-media`
- [ ] Site URL configured: `SITE_URL=https://yourdomain.com`
- [ ] Database backup created (automated by script, or manual)

---

## What Gets Created

The migration creates:

- **6 Tables:** `blog_authors`, `blog_categories`, `blog_tags`, `blog_posts`, `blog_post_categories`, `blog_post_tags`
- **8+ Indexes:** For performance optimization
- **7 Functions:** Role and permission helpers
- **19 RLS Policies:** Role-based access control
- **5 Triggers:** Automatic timestamp updates
- **1 View:** `blog_user_roles` for effective user roles
- **1 Column Extension:** `user_profiles.blog_role` (viewer/author/admin)

---

## Post-Deployment Verification

After deployment, verify the installation:

```bash
# Quick smoke test
psql "$DATABASE_URL" -c "
  SELECT
    'blog_authors' as table_name, COUNT(*) FROM public.blog_authors
  UNION ALL
  SELECT 'blog_categories', COUNT(*) FROM public.blog_categories
  UNION ALL
  SELECT 'blog_tags', COUNT(*) FROM public.blog_tags
  UNION ALL
  SELECT 'blog_posts', COUNT(*) FROM public.blog_posts;
"
```

**Manual Testing:**
1. Access admin panel at `/admin/blog`
2. Create a blog author
3. Create categories and tags
4. Create and publish a test post
5. Verify `/blog` shows the published post
6. Verify `/sitemap.xml` is valid XML
7. Verify `/rss.xml` is valid RSS

**Comprehensive Testing:**
See [BLOG_CMS_VERIFICATION.md](docs/deployment/BLOG_CMS_VERIFICATION.md) for full test plans covering:
- Admin CRUD operations
- Media upload functionality
- Role-based access control
- Performance benchmarks
- SEO validation

---

## Rollback Procedure

If issues occur, rollback using the backup:

```bash
# Restore from backup (created by deployment script)
psql "$DATABASE_URL" < backups/backup_blog_cms_YYYYMMDD_HHMMSS.sql
```

Or manually drop all blog objects:

See [BLOG_CMS_DEPLOYMENT.md#rollback-procedure](docs/deployment/BLOG_CMS_DEPLOYMENT.md#rollback-procedure) for detailed rollback instructions.

---

## Estimated Deployment Time

- **Automated script:** 5-10 minutes (including verification)
- **Manual deployment:** 10-15 minutes
- **Full verification testing:** 30-45 minutes (optional, recommended)

---

## Support Resources

- **Deployment Guide:** [docs/deployment/BLOG_CMS_DEPLOYMENT.md](docs/deployment/BLOG_CMS_DEPLOYMENT.md)
- **Verification Guide:** [docs/deployment/BLOG_CMS_VERIFICATION.md](docs/deployment/BLOG_CMS_VERIFICATION.md)
- **Deployment Script:** [scripts/deploy-blog-cms.sh](scripts/deploy-blog-cms.sh)
- **Migration File:** [supabase/migrations/20251017_create_blog_cms.sql](supabase/migrations/20251017_create_blog_cms.sql)

---

## Notes

- Migration is **idempotent** (safe to run multiple times due to `IF NOT EXISTS` clauses)
- Storage bucket setup required for media uploads
- RLS policies enforce role-based access (viewer/author/admin)
- All blog tables have Row-Level Security enabled
- Scheduled post publishing requires separate cron job (not included in migration)
- Environment variables can be set in `.env.local` (see `.env.example`)

---

Last updated: 2025-11-14
