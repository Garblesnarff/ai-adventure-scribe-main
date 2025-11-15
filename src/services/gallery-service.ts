import { logger } from '../lib/logger';

import { supabase } from '@/integrations/supabase/client';

export type EntityType = 'campaign' | 'character';

export interface GalleryImage {
  url: string;
  name: string;
  createdAt?: string;
  label?: string;
}

const DEFAULT_BUCKET = 'campaign-images';

function buildPrefix(entityType: EntityType, entityId: string): string {
  const root = entityType === 'campaign' ? 'campaigns' : 'characters';
  return `${root}/${entityId}`; // no trailing slash needed
}

/**
 * List images stored for a given entity from Supabase Storage.
 * Falls back gracefully to empty list on errors.
 */
export async function listEntityImages(
  entityType: EntityType,
  entityId: string,
  bucket: string = DEFAULT_BUCKET,
): Promise<GalleryImage[]> {
  try {
    const prefix = buildPrefix(entityType, entityId);
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 100,
      offset: 0,
      // Note: sortBy is inconsistently supported; sorting handled client-side
    });

    if (error || !data) return [];

    const images = data
      .filter((f: any) => f && typeof f.name === 'string' && !f.name.endsWith('/'))
      .map((f: any) => {
        const path = `${prefix}/${f.name}`;
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        const createdAt: string | undefined = (f.created_at || f.updated_at) ?? undefined;
        // Attempt to derive label from the filename: <timestamp>-<label>.png
        const match = /^(\d+)-([^.]+)\./.exec(f.name);
        const label = match?.[2]?.replace(/-/g, ' ');
        return {
          url: urlData.publicUrl,
          name: f.name,
          createdAt,
          label,
        } as GalleryImage;
      });

    // Newest first
    images.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return images;
  } catch (e) {
    logger.error('[GalleryService] listEntityImages failed:', e);
    return [];
  }
}
