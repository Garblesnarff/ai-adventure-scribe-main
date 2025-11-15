import * as React from 'react';

import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

type EntityType = 'campaign' | 'character' | 'session';

const cache = new Map<string, string>();

/**
 * Resolves a human-readable label for an entity id with simple in-memory caching.
 */
export function useEntityLabel(type: EntityType, id: string | null) {
  const [label, setLabel] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(Boolean(id));

  React.useEffect(() => {
    let cancelled = false;
    const key = id ? `${type}:${id}` : '';
    if (!id) {
      setLabel(null);
      setLoading(false);
      return;
    }

    const inCache = cache.get(key);
    if (inCache) {
      setLabel(inCache);
      setLoading(false);
      return;
    }

    async function fetchLabel() {
      try {
        setLoading(true);
        if (type === 'campaign') {
          const { data, error } = await supabase
            .from('campaigns')
            .select('name')
            .eq('id', id)
            .limit(1);
          if (cancelled) return;
          if (error) {
            logger.warn('[useEntityLabel] Failed to load campaign label', { id, error });
          } else {
            const value = data?.[0]?.name ?? null;
            if (value) cache.set(key, value);
            setLabel(value);
          }
        } else if (type === 'character') {
          const { data, error } = await supabase
            .from('characters')
            .select('name')
            .eq('id', id)
            .limit(1);
          if (cancelled) return;
          if (error) {
            logger.warn('[useEntityLabel] Failed to load character label', { id, error });
          } else {
            const value = data?.[0]?.name ?? null;
            if (value) cache.set(key, value);
            setLabel(value);
          }
        } else if (type === 'session') {
          const { data, error } = await supabase
            .from('game_sessions')
            .select('session_number')
            .eq('id', id)
            .limit(1);
          if (cancelled) return;
          if (error) {
            logger.warn('[useEntityLabel] Failed to load session label', { id, error });
          } else {
            const n = data?.[0]?.session_number as number | null | undefined;
            const value = n ? `Session ${n}` : 'Game';
            cache.set(key, value);
            setLabel(value);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLabel();
    return () => {
      cancelled = true;
    };
  }, [type, id]);

  return { label, loading } as const;
}
