# Phase C5: Storage Layer Import Updates - Migration Checklist

## Files to Update

### 1. `/home/wonky/ai-adventure-scribe-main/src/services/gallery-service.ts`

**Current imports (Line 1):**
```typescript
import { supabase } from '@/integrations/supabase/client';
```

**New imports:**
```typescript
import { listFiles, getPublicUrl, StorageFileMetadata } from '@/infrastructure/storage';
```

**Changes needed:**

**Line 31-35:** Replace `.list()` call
```typescript
// OLD:
const { data, error } = await supabase.storage.from(bucket).list(prefix, {
  limit: 100,
  offset: 0
});

// NEW:
const data = await listFiles(bucket, prefix, {
  limit: 100,
  offset: 0,
});
```

**Line 43:** Replace `.getPublicUrl()` call
```typescript
// OLD:
const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

// NEW:
const { publicUrl } = getPublicUrl(bucket, path);
```

**Line 50:** Update URL access
```typescript
// OLD:
url: urlData.publicUrl,

// NEW:
url: publicUrl,
```

---

### 2. `/home/wonky/ai-adventure-scribe-main/src/services/blog/blog-service.ts`

**Current imports (Line 1-2):**
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
```

**New imports:**
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { listFiles, deleteFiles, getPublicUrl, StorageFileMetadata } from '@/infrastructure/storage';
```

**Changes needed:**

**Line 18:** Keep `supabaseClient` for database operations
```typescript
const supabaseClient = supabase as SupabaseClient<any, any, any>;
// This is for database operations, not storage
```

**Line 419-421:** Replace `.list()` call
```typescript
// OLD:
const { data, error } = await supabaseClient.storage
  .from(bucket)
  .list(prefix, { limit: 500, offset: 0 });

// NEW:
const data = await listFiles(bucket, prefix, {
  limit: 500,
  offset: 0,
});
```

**Line 424:** Remove error check (handled in function)
```typescript
// REMOVE:
if (error) {
  throw new Error(error.message);
}
```

**Line 435:** Replace `.getPublicUrl()` call
```typescript
// OLD:
const { data: urlData } = supabaseClient.storage.from(bucket).getPublicUrl(path);

// NEW:
const { publicUrl } = getPublicUrl(bucket, path);
```

**Line 440:** Update URL access
```typescript
// OLD:
publicUrl: urlData.publicUrl,

// NEW:
publicUrl: publicUrl,
```

**Line 481:** Replace `.remove()` call
```typescript
// OLD:
const { error } = await supabaseClient.storage.from(bucket).remove([path]);
if (error) {
  throw new Error(error.message);
}

// NEW:
await deleteFiles(bucket, [path]);
```

**Line 488:** Replace `.getPublicUrl()` call
```typescript
// OLD:
const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
return data.publicUrl;

// NEW:
const { publicUrl } = getPublicUrl(bucket, path);
return publicUrl;
```

---

### 3. `/home/wonky/ai-adventure-scribe-main/src/services/openrouter-service.ts`

**Current imports (Line 6):**
```typescript
import { supabase } from '@/integrations/supabase/client';
```

**New imports:**
```typescript
import { uploadFile, getPublicUrl } from '@/infrastructure/storage';
```

**Note:** Keep `supabase` import if used elsewhere for auth/database operations.

**Changes needed:**

**Line 125-132:** Replace `.upload()` and `.getPublicUrl()` calls
```typescript
// OLD:
const { data, error } = await supabase.storage
  .from(bucket)
  .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'image/png' });
if (error) {
  logger.error('Error uploading to Supabase storage:', error);
  return `data:image/png;base64,${cleanBase64}`;
}
const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
return publicUrlData.publicUrl;

// NEW:
try {
  const result = await uploadFile(bucket, path, blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'image/png',
  });
  const { publicUrl } = getPublicUrl(bucket, result.path);
  return publicUrl;
} catch (error) {
  logger.error('Error uploading to Supabase storage:', error);
  return `data:image/png;base64,${cleanBase64}`;
}
```

---

## Verification Steps

After making all changes:

### 1. TypeScript Compilation
```bash
npm run build
```

Should complete without errors.

### 2. Check Import Resolution
```bash
# Verify no broken imports
grep -r "from '@/infrastructure/storage'" src/services/
```

Should show:
- gallery-service.ts
- blog-service.ts
- openrouter-service.ts

### 3. Verify Dependent Files Still Work

**Check useBlogMedia.ts:**
```bash
grep "from '@/services/blog/blog-service'" src/hooks/blog/useBlogMedia.ts
```

Should still import successfully (no changes needed to this file).

### 4. Run Tests
```bash
npm test
```

All tests should pass.

### 5. Visual Verification

Start dev server and test:
- Gallery image loading
- Blog media upload
- AI-generated image storage

## Rollback Plan

If issues occur, revert by:

1. Remove new imports from infrastructure layer
2. Restore original `supabase.storage` calls
3. Git diff to see exact changes:
```bash
git diff src/services/gallery-service.ts
git diff src/services/blog/blog-service.ts
git diff src/services/openrouter-service.ts
```

## Expected Results

- ✅ All TypeScript compiles
- ✅ All tests pass
- ✅ Gallery images load correctly
- ✅ Blog media uploads work
- ✅ AI image generation stores correctly
- ✅ No runtime errors
- ✅ Same functionality, better architecture

## Success Criteria

1. Zero breaking changes to functionality
2. All storage operations use infrastructure layer
3. Type safety improved with typed interfaces
4. Error handling more consistent
5. Code is more maintainable and testable
