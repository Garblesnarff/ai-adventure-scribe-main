# Post-merge TODO: Apply Supabase Blog CMS Migration

- Task: Apply the blog CMS migration after merging the 4 blog PRs into `main`.
- Migration file: `supabase/migrations/20251017_create_blog_cms.sql`
- Owner: AI agent with database tools (run in the target environment).

Command (run in the environment with database access):

```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20251017_create_blog_cms.sql
```

Notes:
- Ensure `DATABASE_URL` is set; do not paste secrets into the repo.
- Ensure storage bucket exists: `BLOG_MEDIA_BUCKET=blog-media`.
- Temporarily use `SITE_URL=http://localhost:4000` for local; update to real domain when ready.
- After apply, smoke-test: Admin CRUD, media upload, schedule/publish; verify `/blog`, `/sitemap.xml`, `/rss.xml`.

Rollback:
- No explicit down migration provided; restore from backup if needed.
