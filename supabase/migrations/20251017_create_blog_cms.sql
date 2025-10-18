-- Blog CMS schema extension
-- Creates blog authors, posts, categories, tags, supporting helpers, and policies

-- Ensure updated_at helper exists
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Extend user_profiles with blog role flag
do $$
begin
  if to_regclass('public.user_profiles') is null then
    return;
  end if;

  alter table public.user_profiles
    add column if not exists blog_role text;

  update public.user_profiles
  set blog_role = coalesce(blog_role, 'viewer');

  alter table public.user_profiles
    alter column blog_role set default 'viewer';

  alter table public.user_profiles
    alter column blog_role set not null;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_blog_role_check'
      and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_blog_role_check
      check (blog_role in ('viewer', 'author', 'admin'));
  end if;
end
$$;

comment on column public.user_profiles.blog_role is 'Role assigned for blog CMS operations.';

-- Blog authors table
create table if not exists public.blog_authors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  slug text not null unique,
  short_bio text,
  bio text,
  avatar_url text,
  website_url text,
  twitter_handle text,
  linkedin_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_blog_authors_user_id
  on public.blog_authors(user_id);

comment on table public.blog_authors is 'Blog authors with metadata and linked auth user when available.';

-- Blog categories table
create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  seo_title text,
  seo_description text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.blog_categories is 'Hierarchical grouping for blog posts with SEO metadata.';

-- Blog tags table
create table if not exists public.blog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.blog_tags is 'Flexible tagging for blog posts.';

-- Blog posts table
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.blog_authors(id) on delete cascade,
  title text not null,
  slug text not null unique,
  summary text,
  content text,
  featured_image_url text,
  hero_image_alt text,
  seo_title text,
  seo_description text,
  seo_keywords text[] default array[]::text[],
  canonical_url text,
  status text not null default 'draft' check (status in ('draft', 'review', 'scheduled', 'published', 'archived')),
  scheduled_for timestamptz,
  published_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_blog_posts_author_id
  on public.blog_posts(author_id);

create index if not exists idx_blog_posts_status
  on public.blog_posts(status);

create index if not exists idx_blog_posts_published_at
  on public.blog_posts(published_at desc);

comment on table public.blog_posts is 'CMS blog posts with workflow status, SEO fields, and publish metadata.';

-- Blog post category mapping
create table if not exists public.blog_post_categories (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  category_id uuid not null references public.blog_categories(id) on delete cascade,
  assigned_at timestamptz default now(),
  primary key (post_id, category_id)
);

create index if not exists idx_blog_post_categories_post_id
  on public.blog_post_categories(post_id);

create index if not exists idx_blog_post_categories_category_id
  on public.blog_post_categories(category_id);

comment on table public.blog_post_categories is 'Join table linking posts to categories.';

-- Blog post tag mapping
create table if not exists public.blog_post_tags (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  tag_id uuid not null references public.blog_tags(id) on delete cascade,
  assigned_at timestamptz default now(),
  primary key (post_id, tag_id)
);

create index if not exists idx_blog_post_tags_post_id
  on public.blog_post_tags(post_id);

create index if not exists idx_blog_post_tags_tag_id
  on public.blog_post_tags(tag_id);

comment on table public.blog_post_tags is 'Join table linking posts to tags.';

-- Trigger helpers
create or replace function public.set_blog_post_published_at()
returns trigger as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_blog_authors_updated_at on public.blog_authors;
create trigger trg_blog_authors_updated_at
before update on public.blog_authors
for each row execute function public.set_updated_at();

drop trigger if exists trg_blog_categories_updated_at on public.blog_categories;
create trigger trg_blog_categories_updated_at
before update on public.blog_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_blog_tags_updated_at on public.blog_tags;
create trigger trg_blog_tags_updated_at
before update on public.blog_tags
for each row execute function public.set_updated_at();

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at
before update on public.blog_posts
for each row execute function public.set_updated_at();

drop trigger if exists trg_blog_posts_published_at on public.blog_posts;
create trigger trg_blog_posts_published_at
before insert or update on public.blog_posts
for each row execute function public.set_blog_post_published_at();

-- Role helper functions
create or replace function public.is_blog_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.user_profiles up
    where up.user_id = coalesce(p_user_id, auth.uid())
      and up.blog_role = 'admin'
  );
$$;

create or replace function public.is_blog_author(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select
    public.is_blog_admin(p_user_id)
    or exists(
      select 1
      from public.user_profiles up
      where up.user_id = coalesce(p_user_id, auth.uid())
        and up.blog_role = 'author'
    )
    or exists(
      select 1
      from public.blog_authors ba
      where ba.user_id = coalesce(p_user_id, auth.uid())
    );
$$;

create or replace function public.blog_role_for_user(p_user_id uuid default auth.uid())
returns text
language sql
stable
as $$
  select case
    when public.is_blog_admin(p_user_id) then 'admin'
    when exists(
      select 1
      from public.user_profiles up
      where up.user_id = coalesce(p_user_id, auth.uid())
        and up.blog_role = 'author'
    )
    or exists(
      select 1
      from public.blog_authors ba
      where ba.user_id = coalesce(p_user_id, auth.uid())
    ) then 'author'
    else 'viewer'
  end;
$$;

create or replace function public.can_manage_blog_author(p_author_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select public.is_blog_admin(p_user_id)
    or exists(
      select 1
      from public.blog_authors ba
      where ba.id = p_author_id
        and ba.user_id = coalesce(p_user_id, auth.uid())
    );
$$;

create or replace function public.can_manage_blog_post(p_post_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select public.is_blog_admin(p_user_id)
    or exists(
      select 1
      from public.blog_posts bp
      join public.blog_authors ba on ba.id = bp.author_id
      where bp.id = p_post_id
        and ba.user_id = coalesce(p_user_id, auth.uid())
    );
$$;

-- Derived role view
create or replace view public.blog_user_roles as
select distinct
  coalesce(up.user_id, ba.user_id) as user_id,
  public.blog_role_for_user(coalesce(up.user_id, ba.user_id)) as role
from public.user_profiles up
full join public.blog_authors ba on ba.user_id = up.user_id
where coalesce(up.user_id, ba.user_id) is not null;

comment on view public.blog_user_roles is 'Effective blog role per Supabase user for API consumption.';

-- Enable RLS
alter table public.blog_authors enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_tags enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_post_categories enable row level security;
alter table public.blog_post_tags enable row level security;

-- Blog author policies
create policy "Public can read blog authors" on public.blog_authors
  for select using (true);

create policy "Admins manage blog authors" on public.blog_authors
  for all using (public.is_blog_admin())
  with check (public.is_blog_admin());

create policy "Authors manage their own author profile" on public.blog_authors
  for update using (public.can_manage_blog_author(id))
  with check (public.can_manage_blog_author(id));

create policy "Authors create their own author profile" on public.blog_authors
  for insert with check (
    public.is_blog_admin()
    or (auth.uid() is not null and blog_authors.user_id = auth.uid())
  );

-- Blog category policies
create policy "Public can read blog categories" on public.blog_categories
  for select using (true);

create policy "Admins manage blog categories" on public.blog_categories
  for all using (public.is_blog_admin())
  with check (public.is_blog_admin());

-- Blog tag policies
create policy "Public can read blog tags" on public.blog_tags
  for select using (true);

create policy "Admins manage blog tags" on public.blog_tags
  for all using (public.is_blog_admin())
  with check (public.is_blog_admin());

-- Blog post policies
create policy "Public can read published blog posts" on public.blog_posts
  for select using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

create policy "Authors can read their blog posts" on public.blog_posts
  for select using (public.can_manage_blog_post(id));

create policy "Admins manage blog posts" on public.blog_posts
  for all using (public.is_blog_admin())
  with check (public.is_blog_admin());

create policy "Authors create blog posts" on public.blog_posts
  for insert with check (public.can_manage_blog_author(author_id));

create policy "Authors update their blog posts" on public.blog_posts
  for update using (public.can_manage_blog_post(id))
  with check (public.can_manage_blog_post(id));

create policy "Authors delete their blog posts" on public.blog_posts
  for delete using (public.can_manage_blog_post(id));

-- Blog post category policies
create policy "Public can read published post categories" on public.blog_post_categories
  for select using (
    exists (
      select 1
      from public.blog_posts bp
      where bp.id = blog_post_categories.post_id
        and bp.status = 'published'
        and bp.published_at is not null
        and bp.published_at <= now()
    )
  );

create policy "Admins manage post categories" on public.blog_post_categories
  for all using (public.is_blog_admin())
  with check (public.is_blog_admin());

create policy "Authors manage their post categories" on public.blog_post_categories
  for all using (public.can_manage_blog_post(post_id))
  with check (public.can_manage_blog_post(post_id));

-- Blog post tag policies
create policy "Public can read published post tags" on public.blog_post_tags
  for select using (
    exists (
      select 1
      from public.blog_posts bp
      where bp.id = blog_post_tags.post_id
        and bp.status = 'published'
        and bp.published_at is not null
        and bp.published_at <= now()
    )
  );

create policy "Admins manage post tags" on public.blog_post_tags
  for all using (public.is_blog_admin())
  with check (public.is_blog_admin());

create policy "Authors manage their post tags" on public.blog_post_tags
  for all using (public.can_manage_blog_post(post_id))
  with check (public.can_manage_blog_post(post_id));
