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
  name?: string;
  title?: string;
  slug: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy?: string | null;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy?: string | null;
}

export interface BlogPost {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  summary?: string | null;
  excerpt?: string | null;
  content?: string | null;
  coverImageUrl?: string | null;
  featuredImageUrl?: string | null;
  heroImageAlt?: string | null;
  status: BlogPostStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  canonicalUrl?: string | null;
  allowComments?: boolean;
  createdAt: string;
  updatedAt: string;
  authorRole?: string | null;
  categoryIds?: string[];
  tagIds?: string[];
  categories?: BlogCategory[];
  tags?: BlogTag[];
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

export interface BlogPostListFilters {
  status?: BlogPostStatus | 'all';
  search?: string;
  scheduledOnly?: boolean;
  categoryId?: string;
  tagId?: string;
  sortBy?: 'updatedAt' | 'createdAt' | 'title' | 'status' | 'publishedAt';
  sortDirection?: 'asc' | 'desc';
}

export interface BlogMediaAsset {
  id: string;
  path: string;
  bucket: string;
  publicUrl: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string | null;
}

export interface SignedUploadRequest {
  filename: string;
  contentType: string;
  bucket?: string;
}

export interface SignedUploadResponse {
  signedUrl: string;
  path: string;
  token?: string;
  bucket?: string;
  publicUrl?: string;
}
