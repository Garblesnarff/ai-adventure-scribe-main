# Blog Media Storage Setup

The blog CMS stores featured images, inline media, and author avatars in a dedicated Supabase Storage bucket. This guide documents the required configuration so blog posts can serve media publicly while restricting uploads to approved authors and admins.

## Bucket Requirements

- **Bucket name:** `blog-media`
- **Access model:**
  - Public reads for published content assets
  - Authenticated writes limited to blog authors and admins
- **Default object owner:** inherits the authenticated Supabase user (`auth.uid()`)
- **Flywheel support:** The storage RLS policies reuse the SQL helper functions created by the blog CMS migration to enforce author/admin permissions.

## Quick Setup (recommended)

1. Open the Supabase SQL editor for your project.
2. Copy the contents of [`supabase/storage/setup-blog-media.sql`](../supabase/storage/setup-blog-media.sql).
3. Execute the script.
4. Verify the bucket exists under **Storage → Buckets** named `blog-media` and marked **Public**.

The script performs the following:

- Creates (or reconfigures) the `blog-media` bucket with public access.
- Drops any existing storage policies with conflicting names to avoid duplicates.
- Grants anonymous read access to any object inside the bucket.
- Allows authenticated users who satisfy `public.is_blog_author()` to upload.
- Restricts updates/deletes to the object owner or blog admins.

## Manual Configuration (if scripting is unavailable)

1. **Create the bucket**
   - Navigate to **Storage → Buckets** and click **Create bucket**.
   - Set the bucket name to `blog-media` and enable **Public bucket**.

2. **Add RLS policies** under **Policies** for the bucket:
   - *Public read:* `bucket_id = 'blog-media'`
   - *Author uploads:* `bucket_id = 'blog-media' AND public.is_blog_author()`
   - *Author updates/deletes:* `bucket_id = 'blog-media' AND (owner = auth.uid() OR public.is_blog_admin())`

3. **Save each policy** and confirm they are active.

4. **Test the policies** by uploading a file with a blog author account and confirming the resulting public URL loads without authentication.

## Integration Notes

- The Supabase TypeScript definitions expose the storage policies through `public.is_blog_author`/`public.is_blog_admin`, which can be invoked from backend services to gate file uploads.
- Ensure your frontend upload client uses the authenticated Supabase session so the `owner` column is populated and update/delete checks succeed.
- Media URLs follow the pattern `https://<project-ref>.supabase.co/storage/v1/object/public/blog-media/<path>`.
