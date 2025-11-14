/**
 * Supabase Storage Client
 *
 * Provides low-level access to Supabase Storage operations including
 * file upload, download, listing, and deletion.
 */

import type {
  StorageUploadOptions,
  StorageListOptions,
  StorageFileMetadata,
  StoragePublicUrl,
  StorageUploadResult,
} from './types';

import { supabase } from '@/integrations/supabase/client';

/**
 * Get the Supabase storage client
 */
export const storageClient = supabase.storage;

/**
 * Upload a file to Supabase Storage
 *
 * @param bucket - Bucket name
 * @param path - File path within the bucket
 * @param file - File or Blob to upload
 * @param options - Upload options
 * @returns Upload result with path
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: Partial<StorageUploadOptions>,
): Promise<StorageUploadResult> {
  const { data, error } = await storageClient.from(bucket).upload(path, file, {
    cacheControl: options?.cacheControl || '3600',
    upsert: options?.upsert ?? false,
    contentType: options?.contentType,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Download a file from Supabase Storage
 *
 * @param bucket - Bucket name
 * @param path - File path within the bucket
 * @returns File blob
 */
export async function downloadFile(bucket: string, path: string): Promise<Blob> {
  const { data, error } = await storageClient.from(bucket).download(path);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * List files in a bucket at a given path
 *
 * @param bucket - Bucket name
 * @param path - Path within the bucket
 * @param options - List options
 * @returns Array of file metadata
 */
export async function listFiles(
  bucket: string,
  path: string,
  options?: StorageListOptions,
): Promise<StorageFileMetadata[]> {
  const { data, error } = await storageClient.from(bucket).list(path, {
    limit: options?.limit || 100,
    offset: options?.offset || 0,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as StorageFileMetadata[];
}

/**
 * Delete files from Supabase Storage
 *
 * @param bucket - Bucket name
 * @param paths - Array of file paths to delete
 */
export async function deleteFiles(bucket: string, paths: string[]): Promise<void> {
  const { error } = await storageClient.from(bucket).remove(paths);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Get public URL for a file
 *
 * @param bucket - Bucket name
 * @param path - File path within the bucket
 * @returns Public URL data
 */
export function getPublicUrl(bucket: string, path: string): StoragePublicUrl {
  const { data } = storageClient.from(bucket).getPublicUrl(path);

  return data;
}

/**
 * Build a scoped storage path for an entity
 *
 * @param entityType - Type of entity (campaign or character)
 * @param entityId - Entity ID
 * @param filename - Filename
 * @returns Full storage path
 */
export function buildEntityPath(
  entityType: 'campaign' | 'character',
  entityId: string,
  filename: string,
): string {
  const prefix = entityType === 'campaign' ? 'campaigns' : 'characters';
  return `${prefix}/${entityId}/${filename}`;
}

/**
 * Build a timestamped filename
 *
 * @param label - Label for the file
 * @param extension - File extension (default: 'png')
 * @returns Timestamped filename
 */
export function buildTimestampedFilename(
  label: string = 'generated',
  extension: string = 'png',
): string {
  const sanitizedLabel = label.replace(/[^a-z0-9-]/gi, '-');
  const timestamp = Date.now();
  return `${timestamp}-${sanitizedLabel}.${extension}`;
}
