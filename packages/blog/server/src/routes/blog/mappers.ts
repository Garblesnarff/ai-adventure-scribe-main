import { createExcerpt, renderMarkdown } from '../../../utils/markdown.js';

import type {
  BlogCategory,
  BlogCategoryRow,
  BlogPost,
  BlogPostRow,
  BlogTag,
  BlogTagRow,
} from './types.js';

const WORDS_PER_MINUTE = 200;
const DEFAULT_EXCERPT_LENGTH = 160;

function getSiteUrl() {
  const raw = process.env.SITE_URL;
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

function calculateReadingTime(text: string | null | undefined): number | null {
  if (!text) return null;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words === 0) return null;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function mapBlogCategory(row: BlogCategoryRow | null | undefined): BlogCategory | null {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
  };
}

export function mapBlogTag(row: BlogTagRow | null | undefined): BlogTag | null {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
  };
}

export function mapBlogPost(row: BlogPostRow, options?: { includeHtml?: boolean; includeContent?: boolean }): BlogPost {
  const categories = (row.categories ?? [])
    .map((relation) => mapBlogCategory(relation?.category ?? null))
    .filter((value): value is BlogCategory => Boolean(value));

  const tags = (row.tags ?? [])
    .map((relation) => mapBlogTag(relation?.tag ?? null))
    .filter((value): value is BlogTag => Boolean(value));

  const siteUrl = getSiteUrl();

  const content = row.content ?? null;
  const shouldIncludeHtml = options?.includeHtml ?? false;
  const includeContent = options?.includeContent ?? true;

  let html: string | null = null;
  let derivedExcerpt: string | null = row.summary ?? null;
  let derivedText: string | null = null;

  if (content) {
    const rendered = renderMarkdown(content);
    if (shouldIncludeHtml) {
      html = rendered.html;
    }
    derivedText = rendered.text;
  }

  if (!derivedExcerpt) {
    derivedExcerpt = derivedText ? createExcerpt(derivedText, DEFAULT_EXCERPT_LENGTH) : null;
  }

  const readingTimeMinutes = calculateReadingTime(derivedText);

  const post: BlogPost = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? null,
    content: includeContent ? content : null,
    html: shouldIncludeHtml ? html : undefined,
    excerpt: derivedExcerpt ?? undefined,
    featuredImageUrl: row.featured_image_url ?? null,
    heroImageAlt: row.hero_image_alt ?? null,
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    seoKeywords: row.seo_keywords ?? null,
    canonicalUrl: row.canonical_url ?? null,
    status: row.status,
    scheduledFor: row.scheduled_for ?? null,
    publishedAt: row.published_at ?? null,
    metadata: row.metadata ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorId: row.author_id,
    readingTimeMinutes,
    categories,
    tags,
    url: siteUrl ? `${siteUrl}/blog/${row.slug}` : null,
  };

  return post;
}
