# Plan to Safely Merge 4 Blog PRs

## Branching and Order
- Create a temporary branch: blog-integration from main; no pushes to main until approved.
- Merge order (bottom-up dependencies):
  1) #9 Upgrade Blog API: CRUD/metadata/scheduling
  2) #10 Admin: tabs, post mgmt, taxonomy CRUD
  3) #11 Editor: markdown + media + scheduling + SEO
  4) #12 SSR public blog: SEO, sitemap, RSS, hydration

## Expected Conflicts + Resolutions
- src/types/blog.ts: unify category name/title; keep both summary and excerpt; support featuredImageUrl and coverImageUrl; add canonicalUrl, allowComments, metadata; SignedUploadResponse to accept server token/publicUrl/bucket (non-breaking, optional fields).
- server/src/services/blog-service.ts + server views: SSR adds coverImageUrl/authorName/flat tags-categories; keep SSR views using flat string arrays; API mappers keep structured types; adapt markdown renderer to current marked signature; ensure ESM import paths to utils/markdown are correct.
- server/routes/v1/blog.ts: /media/sign-upload returns signedUrl/path/token; client computes publicUrl from Supabase; tolerate token field.
- Supabase: apply 20251017_create_blog_cms.sql; ensure blog-media bucket exists; verify RLS/policies.

## Validation Steps
- Install deps; run lint + typecheck; server build (tsc) + client build (vite).
- Run server tests (npm run server:test); run client blog tests if present.
- Local smoke test: Admin CRUD (authors, posts, taxonomy), media upload, schedule/publish; SSR pages /blog and /blog/:slug; SEO: sitemap.xml, rss.xml.
- Security: ensure no secrets leaked; signed upload auth; CORS/admin guards.

## Commands (assumed npm)
- npm ci
- npm run lint
- npm run server:build
- npm run build
- npm run server:test

## Inputs Needed
- Confirm default branch and merge method (merge/squash/rebase).
- Env: SITE_URL, BLOG_MEDIA_BUCKET, Supabase URL/keys for local test; admin test account.
- Any feature flag for blog to gate rollout.

## Rollback
- Revert integration merges or drop blog-integration; if merged, revert PR commits; run down migrations; disable blog via feature flag if present.

On approval, I’ll proceed with the integration branch, resolve conflicts as above, validate via the steps, and report results before merging to main.