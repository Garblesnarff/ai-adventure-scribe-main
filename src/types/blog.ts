export type BlogRole = 'viewer' | 'author' | 'admin';

export type BlogPostStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived';

export interface BlogSeoMetadata {
  title?: string | null;
  description?: string | null;
  keywords?: string[] | null;
  canonicalUrl?: string | null;
}

export interface BlogAuthor {
  id: string;
  userId: string | null;
  displayName: string;
  slug: string;
  shortBio?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  websiteUrl?: string | null;
  twitterHandle?: string | null;
  linkedinUrl?: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  featuredImageUrl?: string | null;
  heroImageAlt?: string | null;
  status: BlogPostStatus;
  seo: BlogSeoMetadata;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  metadata: Record<string, unknown> | null;
  canonicalUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostCategoryLink {
  postId: string;
  categoryId: string;
  assignedAt: string;
}

export interface BlogPostTagLink {
  postId: string;
  tagId: string;
  assignedAt: string;
}

export interface BlogUserRole {
  userId: string;
  role: BlogRole;
}
