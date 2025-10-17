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
  cover_image?: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  author_id: string;
  reading_time_minutes?: number | null;
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
  coverImage?: string | null;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  readingTimeMinutes?: number | null;
  categories: BlogCategory[];
  tags: BlogTag[];
  url?: string | null;
}
