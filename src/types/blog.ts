import type { BlogRole } from '@/contexts/AuthContext';

export type BlogPostStatus = 'draft' | 'scheduled' | 'published';

export interface BlogCategory {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy?: string | null;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy?: string | null;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  status: BlogPostStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorRole?: BlogRole | null;
  categoryIds: string[];
  tagIds: string[];
  categories?: BlogCategory[];
  tags?: BlogTag[];
}

export interface BlogPostFormValues {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  status: BlogPostStatus;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string | null;
  scheduledFor: string | null;
  categoryIds: string[];
  tagIds: string[];
  isDraft: boolean;
  allowComments: boolean;
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
  createdBy?: string | null;
}

export interface BlogPostListFilters {
  status?: BlogPostStatus | 'all';
  search?: string;
  scheduledOnly?: boolean;
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
  bucket: string;
  expiresAt: string | null;
}
