# Infrastructure Storage Layer

This layer provides low-level primitives for Supabase Storage operations.

## Purpose

- Centralize Supabase Storage client access
- Provide typed interfaces for storage operations
- Offer utility functions for common storage patterns
- Enable consistent error handling across storage operations

## Structure

```
src/infrastructure/storage/
├── supabase-storage.ts  # Storage client and operations
├── types.ts             # Storage type definitions
├── index.ts             # Public API
└── README.md            # This file
```

## Exports

### Storage Client

- `storageClient` - Direct access to Supabase storage client

### File Operations

- `uploadFile()` - Upload files to storage
- `downloadFile()` - Download files from storage
- `listFiles()` - List files in a bucket path
- `deleteFiles()` - Delete files from storage
- `getPublicUrl()` - Get public URL for a file

### Utilities

- `buildEntityPath()` - Build scoped storage paths for entities
- `buildTimestampedFilename()` - Generate timestamped filenames

### Types

- `StorageUploadOptions` - Options for file uploads
- `StorageListOptions` - Options for listing files
- `StorageFileMetadata` - File metadata structure
- `StoragePublicUrl` - Public URL response
- `StorageUploadResult` - Upload operation result
- `StorageError` - Storage error structure

## Usage Examples

### Upload an Image

```typescript
import { uploadFile, getPublicUrl, buildEntityPath, buildTimestampedFilename } from '@/infrastructure/storage';

// Build path and filename
const filename = buildTimestampedFilename('portrait', 'png');
const path = buildEntityPath('character', characterId, filename);

// Upload file
const result = await uploadFile('campaign-images', path, blob, {
  contentType: 'image/png',
  cacheControl: '3600',
  upsert: false,
});

// Get public URL
const { publicUrl } = getPublicUrl('campaign-images', result.path);
```

### List Entity Images

```typescript
import { listFiles, getPublicUrl } from '@/infrastructure/storage';

const prefix = `campaigns/${campaignId}`;
const files = await listFiles('campaign-images', prefix, {
  limit: 100,
  offset: 0,
});

const images = files
  .filter(f => !f.name.endsWith('/'))
  .map(f => {
    const path = `${prefix}/${f.name}`;
    const { publicUrl } = getPublicUrl('campaign-images', path);
    return { ...f, publicUrl };
  });
```

### Delete Files

```typescript
import { deleteFiles } from '@/infrastructure/storage';

await deleteFiles('campaign-images', [
  'campaigns/123/image1.png',
  'campaigns/123/image2.png',
]);
```

### Direct Storage Client Access

```typescript
import { storageClient } from '@/infrastructure/storage';

// For advanced operations not covered by utilities
const { data, error } = await storageClient
  .from('my-bucket')
  .createSignedUrl('path/to/file.png', 3600);
```

## Design Principles

1. **Low-Level Primitives**: This layer provides basic storage operations without business logic
2. **Type Safety**: All operations use TypeScript types for safety
3. **Error Propagation**: Errors are thrown with descriptive messages
4. **Utility Functions**: Common patterns (entity paths, timestamps) are abstracted
5. **Direct Access**: `storageClient` is exported for advanced use cases

## Higher-Level Services

This layer should be used by higher-level services that add business logic:

- `gallery-service.ts` - Entity-scoped image galleries
- `blog-service.ts` - Blog media management
- `openrouter-service.ts` - AI-generated image uploads

## Integration Points

- `@/integrations/supabase/client` - Supabase client instance
- `@/utils/image-compression` - Image processing (separate concern)
- `@/hooks/blog/useBlogMedia` - React hooks for storage (separate concern)

## Migration Notes

When migrating code to use this layer:

1. Replace direct `supabase.storage` calls with infrastructure layer functions
2. Use typed interfaces from `types.ts`
3. Leverage utility functions for common patterns
4. Keep business logic in service layers above this infrastructure

## Future Enhancements

- Signed URL generation utilities
- Batch upload operations
- Progress tracking for large uploads
- Storage quota management
- Image transformation helpers
- Automatic retry logic
