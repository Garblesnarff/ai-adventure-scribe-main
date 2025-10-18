export interface BlogCategoryRow {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogTagRow {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostCategoryRelation {
  category?: BlogCategoryRow | null;
}

export interface BlogPostTagRelation {
  tag?: BlogTagRow | null;
}

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  featured_image_url?: string | null;
  hero_image_alt?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  canonical_url?: string | null;
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
  scheduled_for?: string | null;
  published_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  author_id: string;
  categories?: BlogPostCategoryRelation[] | null;
  tags?: BlogPostTagRelation[] | null;
}

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
}

export interface BlogTag {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  html?: string | null;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  heroImageAlt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
  canonicalUrl?: string | null;
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
  scheduledFor?: string | null;
  publishedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  readingTimeMinutes?: number | null;
  categories: BlogCategory[];
  tags: BlogTag[];
  url?: string | null;
}
