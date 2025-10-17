import {
  BlogCategory,
  BlogCategoryRow,
  BlogPost,
  BlogPostRow,
  BlogTag,
  BlogTagRow,
} from './types.js';

function getSiteUrl() {
  const raw = process.env.SITE_URL;
  if (!raw) return null;
  return raw.replace(/\/$/, '');
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

export function mapBlogPost(row: BlogPostRow): BlogPost {
  const categories = (row.categories ?? [])
    .map((relation) => mapBlogCategory(relation?.category ?? null))
    .filter((value): value is BlogCategory => Boolean(value));

  const tags = (row.tags ?? [])
    .map((relation) => mapBlogTag(relation?.tag ?? null))
    .filter((value): value is BlogTag => Boolean(value));

  const normalizedCover = row.cover_image ?? null;
  const siteUrl = getSiteUrl();

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? null,
    content: row.content ?? null,
    coverImage: normalizedCover,
    status: row.status,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorId: row.author_id,
    readingTimeMinutes: typeof row.reading_time_minutes === 'number' ? row.reading_time_minutes : null,
    categories,
    tags,
    url: siteUrl ? `${siteUrl}/blog/${row.slug}` : null,
  };
}
