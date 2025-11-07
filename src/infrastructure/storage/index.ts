/**
 * Infrastructure Storage Layer
 *
 * Public API for Supabase Storage operations.
 *
 * This layer provides low-level storage primitives for file operations.
 * Higher-level services (like gallery-service or blog-service) should
 * build on these primitives.
 *
 * @example
 * ```typescript
 * import { storageClient, uploadFile, getPublicUrl } from '@/infrastructure/storage';
 *
 * // Upload a file
 * const result = await uploadFile('campaign-images', 'path/to/file.png', blob);
 *
 * // Get public URL
 * const { publicUrl } = getPublicUrl('campaign-images', result.path);
 * ```
 */

export {
  storageClient,
  uploadFile,
  downloadFile,
  listFiles,
  deleteFiles,
  getPublicUrl,
  buildEntityPath,
  buildTimestampedFilename,
} from './supabase-storage';

export type {
  StorageUploadOptions,
  StorageListOptions,
  StorageFileMetadata,
  StoragePublicUrl,
  StorageUploadResult,
  StorageError,
} from './types';
