-- Blog media bucket configuration
-- Run this script once on the Supabase project to provision the blog CMS bucket

insert into storage.buckets (id, name, public)
values ('blog-media', 'blog-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read blog media" on storage.objects;
drop policy if exists "Blog authors upload media" on storage.objects;
drop policy if exists "Blog authors update media" on storage.objects;
drop policy if exists "Blog authors delete media" on storage.objects;

create policy "Public read blog media" on storage.objects
  for select using (bucket_id = 'blog-media');

create policy "Blog authors upload media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'blog-media'
    and public.is_blog_author()
  );

create policy "Blog authors update media" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'blog-media'
    and (owner = auth.uid() or public.is_blog_admin())
  )
  with check (
    bucket_id = 'blog-media'
    and (owner = auth.uid() or public.is_blog_admin())
  );

create policy "Blog authors delete media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'blog-media'
    and (owner = auth.uid() or public.is_blog_admin())
  );
