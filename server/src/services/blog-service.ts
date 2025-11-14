import { supabase } from '../../../src/infrastructure/database/index.js';
import { createExcerpt, renderMarkdown } from '../utils/markdown.js';


/**
 * Blog Service
 *
 * Manages blog post retrieval from Supabase, including content rendering,
 * taxonomy management, and SEO metadata.
 *
 * @example
 * ```typescript
 * // Check if blog is configured
 * if (BlogService.isSupabaseConfigured()) {
 *   // Fetch all published posts
 *   const posts = await BlogService.fetchPublishedBlogPosts();
 *
 *   // Fetch specific post by slug
 *   const post = await BlogService.fetchBlogPostBySlug('my-post-slug');
 * }
 * ```
 */
export class BlogService {
  private static readonly BLOG_TABLE = process.env.SUPABASE_BLOG_TABLE || 'blog_posts';
  private static readonly BLOG_POST_SELECT = `
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

  private static readonly WORDS_PER_MINUTE = 200;

  /**
   * Check if Supabase is properly configured
   * @returns True if Supabase environment variables are set
   */
  static isSupabaseConfigured(): boolean {
    return Boolean(
      process.env.SUPABASE_URL &&
      (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
    );
  }

  /**
   * Fetch all published blog posts
   * @returns Array of published blog posts sorted by date
   */
  static async fetchPublishedBlogPosts(): Promise<BlogPost[]> {
    if (!BlogService.isSupabaseConfigured()) {
      return [];
    }

    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from(BlogService.BLOG_TABLE)
      .select(BlogService.BLOG_POST_SELECT)
      .eq('status', 'published')
      .lte('published_at', nowIso)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch blog posts', error);
      return [];
    }

    const rows = (data ?? []) as unknown as SupabaseBlogRow[];
    return rows
      .map(BlogService.mapRowToBlogPost)
      .filter((post): post is BlogPost => Boolean(post));
  }

  /**
   * Fetch a single blog post by slug
   * @param slug - URL-friendly slug of the blog post
   * @returns Blog post if found, null otherwise
   */
  static async fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    if (!BlogService.isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from(BlogService.BLOG_TABLE)
      .select(BlogService.BLOG_POST_SELECT)
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

    const post = BlogService.mapRowToBlogPost(data as unknown as SupabaseBlogRow);
    if (!post) {
      return null;
    }

    return post;
  }

  /**
   * Map Supabase row to BlogPost interface
   * @param row - Raw Supabase row data
   * @returns Mapped BlogPost or null if invalid
   */
  private static mapRowToBlogPost(row: SupabaseBlogRow): BlogPost | null {
    if (!BlogService.isPublishedRow(row)) {
      return null;
    }

    const slug = (row.slug ?? '').trim();
    const title = (row.title ?? '').trim();
    if (!slug || !title) {
      return null;
    }

    const markdown = row.content ?? '';
    const rendered = renderMarkdown(markdown);
    const summary = BlogService.deriveSummary(row.summary, rendered.text);
    const excerpt = summary ?? createExcerpt(rendered.text);
    const publishedAt = BlogService.normalizeDate(row.published_at || row.publish_date);
    if (!publishedAt) {
      return null;
    }

    const updatedAt = BlogService.normalizeDate(row.updated_at || row.modified_at) ?? undefined;

    // derive flat tags/categories for SSR views
    const tags: string[] = Array.isArray(row.tags)
      ? (row.tags as (string | BlogTagRelationRow)[]).map((t) => typeof t === 'string' ? t.trim() : (t?.tag?.name ?? '')).filter(Boolean)
      : typeof row.tags === 'string'
        ? row.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

    const categories: string[] = Array.isArray(row.categories)
      ? (row.categories as (string | BlogCategoryRelationRow)[]).map((c) => typeof c === 'string' ? c.trim() : (c?.category?.name ?? '')).filter(Boolean)
      : typeof row.categories === 'string'
        ? row.categories.split(',').map((c) => c.trim()).filter(Boolean)
        : (row.category && row.category.trim()) ? [row.category.trim()] : [];

    const author = BlogService.mapAuthor((row.author as BlogAuthorRow | null | undefined) ?? null);

    const metadata = BlogService.normalizeMetadata(row.metadata);
    const seoKeywords = Array.isArray(row.seo_keywords)
      ? row.seo_keywords.map((keyword) => keyword.trim()).filter(Boolean)
      : [];

    const coverImageUrl = row.cover_image_url || row.hero_image_url || row.social_image_url || row.featured_image_url || null;
    const coverImageAlt = row.cover_image_alt || row.image_alt || null;
    const authorName = row.author_name || ((row.author as BlogAuthorRow | null | undefined)?.display_name ?? null) || row.byline || null;
    const readingTimeMinutes = typeof row.reading_time_minutes === 'number' && row.reading_time_minutes > 0
      ? Math.round(row.reading_time_minutes)
      : BlogService.computeReadingTime(rendered.text);
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

  /**
   * Check if a row represents a published post
   * @param row - Supabase row to check
   * @returns True if row is published and should be visible
   */
  private static isPublishedRow(row: SupabaseBlogRow): boolean {
    if (!row.status || row.status.toLowerCase() !== 'published') {
      return false;
    }

    const publishedAt = BlogService.normalizeDate(row.published_at);
    if (!publishedAt) {
      return false;
    }

    return new Date(publishedAt).getTime() <= Date.now();
  }

  /**
   * Normalize date string to ISO format
   * @param value - Date string to normalize
   * @returns ISO date string or null if invalid
   */
  private static normalizeDate(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }

  /**
   * Derive summary from explicit summary or fallback text
   * @param summary - Explicit summary text
   * @param fallback - Fallback text to generate excerpt from
   * @returns Summary text or null
   */
  private static deriveSummary(summary: string | null | undefined, fallback: string): string | null {
    if (typeof summary === 'string' && summary.trim().length > 0) {
      return summary.trim();
    }
    if (fallback.length === 0) {
      return null;
    }
    return createExcerpt(fallback);
  }

  /**
   * Map author data from Supabase
   * @param author - Raw author data
   * @returns BlogPostAuthor or null if invalid
   */
  private static mapAuthor(author: BlogAuthorRow | null | undefined): BlogPostAuthor | null {
    if (!author?.id || !author.display_name) {
      return null;
    }
    return {
      id: author.id,
      slug: author.slug ?? null,
      displayName: author.display_name,
    } satisfies BlogPostAuthor;
  }

  /**
   * Normalize metadata object
   * @param metadata - Raw metadata
   * @returns Normalized metadata object
   */
  private static normalizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> {
    if (metadata && typeof metadata === 'object') {
      return metadata;
    }
    return {};
  }

  /**
   * Compute reading time from text
   * @param text - Text to analyze
   * @returns Reading time in minutes
   */
  private static computeReadingTime(text: string): number {
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words === 0) {
      return 1;
    }
    return Math.max(1, Math.round(words / BlogService.WORDS_PER_MINUTE));
  }
}

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
