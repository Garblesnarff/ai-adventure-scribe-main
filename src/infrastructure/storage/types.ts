/**
 * Storage types for Supabase Storage operations
 */

export interface StorageUploadOptions {
  /**
   * Bucket name (default: 'campaign-images')
   */
  bucket?: string;

  /**
   * Entity type for scoped storage paths
   */
  entityType?: 'campaign' | 'character';

  /**
   * Entity ID for scoped storage paths
   */
  entityId?: string;

  /**
   * Label for the file (default: 'generated')
   */
  label?: string;

  /**
   * Cache control header value (default: '3600')
   */
  cacheControl?: string;

  /**
   * Content type of the file
   */
  contentType?: string;

  /**
   * Whether to upsert (overwrite) existing files
   */
  upsert?: boolean;
}

export interface StorageListOptions {
  /**
   * Maximum number of files to list
   */
  limit?: number;

  /**
   * Offset for pagination
   */
  offset?: number;
}

export interface StorageFileMetadata {
  /**
   * File name
   */
  name: string;

  /**
   * Full path in storage
   */
  path?: string;

  /**
   * File size in bytes
   */
  size?: number;

  /**
   * MIME type
   */
  mimeType?: string;

  /**
   * Created timestamp
   */
  created_at?: string;

  /**
   * Updated timestamp
   */
  updated_at?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

export interface StoragePublicUrl {
  publicUrl: string;
}

export interface StorageUploadResult {
  path: string;
  id?: string;
  fullPath?: string;
}

export interface StorageError {
  message: string;
  statusCode?: string;
  error?: string;
}
