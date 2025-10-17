import { supabase } from '../lib/supabase.js';
import { createExcerpt, renderMarkdown } from '../utils/markdown.js';

const BLOG_TABLE = process.env.SUPABASE_BLOG_TABLE || 'blog_posts';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  markdown: string;
  html: string;
  excerpt: string;
  summary: string;
  publishedAt: string;
  updatedAt?: string;
  coverImageUrl?: string | null;
  authorName?: string | null;
  tags: string[];
  readingTimeMinutes: number;
}

interface SupabaseBlogRow {
  id?: string | number;
  slug?: string;
  title?: string;
  content?: string;
  body?: string;
  markdown?: string;
  excerpt?: string | null;
  summary?: string | null;
  seo_description?: string | null;
  published_at?: string | null;
  publish_date?: string | null;
  updated_at?: string | null;
  modified_at?: string | null;
  cover_image_url?: string | null;
  hero_image_url?: string | null;
  social_image_url?: string | null;
  author_name?: string | null;
  author?: string | null;
  byline?: string | null;
  tags?: string[] | string | null;
  reading_time_minutes?: number | null;
  status?: string | null;
  is_published?: boolean | null;
  published?: boolean | null;
  unpublished_at?: string | null;
  [key: string]: unknown;
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

  const { data, error } = await supabase
    .from(BLOG_TABLE)
    .select('*')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch blog posts', error);
    return [];
  }

  const rows = (data ?? []) as SupabaseBlogRow[];

  return transformRows(rows).filter((post): post is BlogPost => Boolean(post));
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from(BLOG_TABLE)
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Failed to fetch blog post with slug ${slug}`, error);
    return null;
  }

  if (!data) return null;

  const row = data as SupabaseBlogRow;
  const post = transformRow(row);
  return post ?? null;
}

function transformRows(rows: SupabaseBlogRow[]): Array<BlogPost | null> {
  return rows.map(transformRow);
}

function transformRow(row: SupabaseBlogRow): BlogPost | null {
  if (!isRowPublished(row)) {
    return null;
  }

  const slug = row.slug?.trim();
  const title = row.title?.trim();
  const markdown = pickMarkdown(row);
  const publishedAt = pickPublishedAt(row);

  if (!slug || !title || !markdown || !publishedAt) {
    return null;
  }

  const rendered = renderMarkdown(markdown);
  const summary = pickSummary(row, rendered.text);
  const authorName = row.author_name || row.author || row.byline || null;
  const coverImageUrl = row.cover_image_url || row.hero_image_url || row.social_image_url || null;
  const tags = normalizeTags(row.tags);
  const updatedAt = pickUpdatedAt(row);
  const readingTimeMinutes = pickReadingTime(row, rendered.text);

  return {
    id: typeof row.id === 'number' ? String(row.id) : row.id || slug,
    slug,
    title,
    markdown,
    html: rendered.html,
    excerpt: summary,
    summary,
    publishedAt,
    updatedAt,
    coverImageUrl,
    authorName,
    tags,
    readingTimeMinutes,
  };
}

function pickMarkdown(row: SupabaseBlogRow): string | null {
  return row.markdown || row.content || row.body || null;
}

function pickSummary(row: SupabaseBlogRow, fallbackText: string): string {
  const raw = row.excerpt || row.summary || row.seo_description;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return createExcerpt(fallbackText);
}

function pickPublishedAt(row: SupabaseBlogRow): string | null {
  const value = row.published_at || row.publish_date;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function pickUpdatedAt(row: SupabaseBlogRow): string | undefined {
  const value = row.updated_at || row.modified_at;
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}

function pickReadingTime(row: SupabaseBlogRow, text: string): number {
  if (typeof row.reading_time_minutes === 'number' && row.reading_time_minutes > 0) {
    return Math.round(row.reading_time_minutes);
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function normalizeTags(tags: SupabaseBlogRow['tags']): string[] {
  if (Array.isArray(tags)) {
    return tags.map((tag) => (typeof tag === 'string' ? tag.trim() : '')).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

function isRowPublished(row: SupabaseBlogRow): boolean {
  if (row.unpublished_at) {
    const unpublished = new Date(row.unpublished_at);
    if (!Number.isNaN(unpublished.getTime()) && unpublished.getTime() <= Date.now()) {
      return false;
    }
  }

  if (typeof row.is_published === 'boolean' && !row.is_published) {
    return false;
  }

  if (typeof row.published === 'boolean' && !row.published) {
    return false;
  }

  if (typeof row.status === 'string') {
    const status = row.status.toLowerCase();
    if (status !== 'published' && status !== 'public') {
      return false;
    }
  }

  const publishedAt = pickPublishedAt(row);
  if (!publishedAt) return false;
  const published = new Date(publishedAt);
  return published.getTime() <= Date.now();
}
