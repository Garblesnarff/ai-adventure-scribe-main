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
  // Fields consumed by SSR views and SEO helpers
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  authorName?: string | null;
  tags: string[];
  categories: string[];
  readingTimeMinutes: number;
  estimatedWordCount?: number;
  // Additional structured metadata (not directly used by SSR views)
  metadata: Record<string, unknown>;
  author: BlogPostAuthor | null;
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
  // extended optional fields (from SSR PR)
  publish_date?: string | null;
  updated_at?: string | null;
  modified_at?: string | null;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  hero_image_url?: string | null;
  social_image_url?: string | null;
  image_alt?: string | null;
  author_name?: string | null;
  byline?: string | null;
  tags?: string[] | string | BlogTagRelationRow[] | null;
  categories?: string[] | string | BlogCategoryRelationRow[] | null;
  category?: string | null;
  reading_time_minutes?: number | null;
  status?: string | null;
  published_at?: string | null;
  metadata?: Record<string, unknown> | null;
  author?: BlogAuthorRow | null;
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

  const rows = (data ?? []) as unknown as SupabaseBlogRow[];
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

  const post = mapRowToBlogPost(data as unknown as SupabaseBlogRow);
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
  const publishedAt = normalizeDate(row.published_at || row.publish_date);
  if (!publishedAt) {
    return null;
  }

  const updatedAt = normalizeDate(row.updated_at || row.modified_at) ?? undefined;

  // derive flat tags/categories for SSR views
  const tags: string[] = Array.isArray(row.tags)
    ? (row.tags as any[]).map((t) => typeof t === 'string' ? t.trim() : (t?.tag?.name ?? '')).filter(Boolean)
    : typeof row.tags === 'string'
      ? row.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

  const categories: string[] = Array.isArray(row.categories)
    ? (row.categories as any[]).map((c) => typeof c === 'string' ? c.trim() : (c?.category?.name ?? '')).filter(Boolean)
    : typeof row.categories === 'string'
      ? row.categories.split(',').map((c) => c.trim()).filter(Boolean)
      : (row.category && row.category.trim()) ? [row.category.trim()] : [];

  const author = mapAuthor((row.author as BlogAuthorRow | null | undefined) ?? null);

  const metadata = normalizeMetadata(row.metadata);
  const seoKeywords = Array.isArray(row.seo_keywords)
    ? row.seo_keywords.map((keyword) => keyword.trim()).filter(Boolean)
    : [];

  const coverImageUrl = row.cover_image_url || row.hero_image_url || row.social_image_url || row.featured_image_url || null;
  const coverImageAlt = row.cover_image_alt || row.image_alt || null;
  const authorName = row.author_name || ((row.author as any)?.display_name ?? null) || row.byline || null;
  const readingTimeMinutes = typeof row.reading_time_minutes === 'number' && row.reading_time_minutes > 0
    ? Math.round(row.reading_time_minutes)
    : computeReadingTime(rendered.text);
  const estimatedWordCount = Math.max(1, Math.round(readingTimeMinutes * 200));

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
    coverImageUrl,
    coverImageAlt,
    authorName,
    tags,
    categories,
    readingTimeMinutes,
    estimatedWordCount,
    metadata,
    author,
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

// Note: category/tag relation mappers removed; SSR views use flattened string arrays above.

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
