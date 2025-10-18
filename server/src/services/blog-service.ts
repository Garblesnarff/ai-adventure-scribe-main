import { supabase } from '../lib/supabase.js';
import { createExcerpt, renderMarkdown } from '../utils/markdown.js';

const BLOG_TABLE = process.env.SUPABASE_BLOG_TABLE || 'blog_posts';
const BLOG_POST_SELECT = `
  id,
  slug,
  title,
  summary,
  content,
  featured_image_url,
  hero_image_alt,
  seo_title,
  seo_description,
  seo_keywords,
  canonical_url,
  status,
  published_at,
  updated_at,
  metadata,
  author:blog_authors (
    id,
    slug,
    display_name
  ),
  categories:blog_post_categories (
    category:blog_categories (
      id,
      slug,
      name
    )
  ),
  tags:blog_post_tags (
    tag:blog_tags (
      id,
      slug,
      name
    )
  )
`;

const WORDS_PER_MINUTE = 200;

export interface BlogPostAuthor {
  id: string;
  slug: string | null;
  displayName: string;
}

export interface BlogPostCategory {
  id: string;
  slug: string;
  name: string;
}

export interface BlogPostTag {
  id: string;
  slug: string;
  name: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  markdown: string;
  html: string;
  excerpt: string;
  summary: string | null;
  featuredImageUrl: string | null;
  heroImageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  canonicalUrl: string | null;
  publishedAt: string;
  updatedAt?: string;
  readingTimeMinutes: number;
  metadata: Record<string, unknown>;
  author: BlogPostAuthor | null;
  categories: BlogPostCategory[];
  tags: BlogPostTag[];
}

interface BlogCategoryRelationRow {
  category?: {
    id?: string;
    slug?: string;
    name?: string;
  } | null;
}

interface BlogTagRelationRow {
  tag?: {
    id?: string;
    slug?: string;
    name?: string;
  } | null;
}

interface BlogAuthorRow {
  id?: string;
  slug?: string | null;
  display_name?: string | null;
}

interface SupabaseBlogRow {
  id?: string;
  slug?: string;
  title?: string;
  summary?: string | null;
  content?: string | null;
  featured_image_url?: string | null;
  hero_image_alt?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  canonical_url?: string | null;
  status?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
  author?: BlogAuthorRow | null;
  categories?: BlogCategoryRelationRow[] | null;
  tags?: BlogTagRelationRow[] | null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export async function fetchPublishedBlogPosts(): Promise<BlogPost[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from(BLOG_TABLE)
    .select(BLOG_POST_SELECT)
    .eq('status', 'published')
    .lte('published_at', nowIso)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch blog posts', error);
    return [];
  }

  const rows = (data ?? []) as SupabaseBlogRow[];
  return rows
    .map(mapRowToBlogPost)
    .filter((post): post is BlogPost => Boolean(post));
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from(BLOG_TABLE)
    .select(BLOG_POST_SELECT)
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Failed to fetch blog post with slug ${slug}`, error);
    return null;
  }

  if (!data) {
    return null;
  }

  const post = mapRowToBlogPost(data as SupabaseBlogRow);
  if (!post) {
    return null;
  }

  return post;
}

function mapRowToBlogPost(row: SupabaseBlogRow): BlogPost | null {
  if (!isPublishedRow(row)) {
    return null;
  }

  const slug = (row.slug ?? '').trim();
  const title = (row.title ?? '').trim();
  if (!slug || !title) {
    return null;
  }

  const markdown = row.content ?? '';
  const rendered = renderMarkdown(markdown);
  const summary = deriveSummary(row.summary, rendered.text);
  const excerpt = summary ?? createExcerpt(rendered.text);
  const publishedAt = normalizeDate(row.published_at);
  if (!publishedAt) {
    return null;
  }

  const updatedAt = normalizeDate(row.updated_at) ?? undefined;

  const categories = mapCategories(row.categories);
  const tags = mapTags(row.tags);
  const author = mapAuthor(row.author);

  const metadata = normalizeMetadata(row.metadata);
  const seoKeywords = Array.isArray(row.seo_keywords)
    ? row.seo_keywords.map((keyword) => keyword.trim()).filter(Boolean)
    : [];

  const readingTimeMinutes = computeReadingTime(rendered.text);

  return {
    id: row.id ?? slug,
    slug,
    title,
    markdown,
    html: rendered.html,
    excerpt,
    summary,
    featuredImageUrl: row.featured_image_url ?? null,
    heroImageAlt: row.hero_image_alt ?? null,
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    seoKeywords,
    canonicalUrl: row.canonical_url ?? null,
    publishedAt,
    updatedAt,
    readingTimeMinutes,
    metadata,
    author,
    categories,
    tags,
  };
}

function isPublishedRow(row: SupabaseBlogRow): boolean {
  if (!row.status || row.status.toLowerCase() !== 'published') {
    return false;
  }

  const publishedAt = normalizeDate(row.published_at);
  if (!publishedAt) {
    return false;
  }

  return new Date(publishedAt).getTime() <= Date.now();
}

function normalizeDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function deriveSummary(summary: string | null | undefined, fallback: string): string | null {
  if (typeof summary === 'string' && summary.trim().length > 0) {
    return summary.trim();
  }
  if (fallback.length === 0) {
    return null;
  }
  return createExcerpt(fallback);
}

function mapCategories(relations: BlogCategoryRelationRow[] | null | undefined): BlogPostCategory[] {
  if (!Array.isArray(relations)) {
    return [];
  }
  return relations
    .map((relation) => {
      const category = relation?.category;
      if (!category?.id || !category.slug || !category.name) {
        return null;
      }
      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
      } satisfies BlogPostCategory;
    })
    .filter((value): value is BlogPostCategory => Boolean(value));
}

function mapTags(relations: BlogTagRelationRow[] | null | undefined): BlogPostTag[] {
  if (!Array.isArray(relations)) {
    return [];
  }
  return relations
    .map((relation) => {
      const tag = relation?.tag;
      if (!tag?.id || !tag.slug || !tag.name) {
        return null;
      }
      return {
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
      } satisfies BlogPostTag;
    })
    .filter((value): value is BlogPostTag => Boolean(value));
}

function mapAuthor(author: BlogAuthorRow | null | undefined): BlogPostAuthor | null {
  if (!author?.id || !author.display_name) {
    return null;
  }
  return {
    id: author.id,
    slug: author.slug ?? null,
    displayName: author.display_name,
  } satisfies BlogPostAuthor;
}

function normalizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (metadata && typeof metadata === 'object') {
    return metadata;
  }
  return {};
}

function computeReadingTime(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words === 0) {
    return 1;
  }
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
