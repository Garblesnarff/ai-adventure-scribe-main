import { useState, useEffect, useRef } from 'react';

import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { subscriptionManager } from '@/services/supabase-subscription-manager';

interface UseImageHotLoadingOptions {
  tableName: 'campaigns' | 'characters';
  recordId: string;
  imageField?: string;
  fallbackImage?: string;
}

interface ImageHotLoadingState {
  imageUrl: string;
  isLoading: boolean;
  hasImage: boolean;
  error: string | null;
}

/**
 * Custom hook for hot loading background images with realtime updates
 * Uses centralized subscription manager to prevent over-subscription
 */
export const useImageHotLoading = ({
  tableName,
  recordId,
  imageField = 'background_image',
  fallbackImage = '/card-placeholder.svg',
}: UseImageHotLoadingOptions): ImageHotLoadingState => {
  const [state, setState] = useState<ImageHotLoadingState>({
    imageUrl: fallbackImage,
    isLoading: true,
    hasImage: false,
    error: null,
  });

  const subscriptionIdRef = useRef<string | null>(null);

  // Callback for realtime updates
  const handleImageUpdate = (newImageUrl: string | null) => {
    setState((prev) => ({
      ...prev,
      imageUrl: newImageUrl || fallbackImage,
      hasImage: !!newImageUrl,
      isLoading: false,
      error: null,
    }));
  };

  useEffect(() => {
    let isMounted = true;

    // Fetch initial image state
    const fetchInitialImage = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const { data, error } = await supabase
          .from(tableName)
          .select(imageField)
          .eq('id', recordId)
          .single();

        if (error) {
          logger.error(`Error fetching initial ${imageField}:`, error);
          if (isMounted) {
            setState((prev) => ({
              ...prev,
              error: error.message,
              isLoading: false,
            }));
          }
          return;
        }

        const imageUrl = data?.[imageField];
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            imageUrl: imageUrl || fallbackImage,
            hasImage: !!imageUrl,
            isLoading: false,
            error: null,
          }));
        }
      } catch (err) {
        logger.error('Failed to fetch initial image:', err);
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            error: 'Failed to load image',
            isLoading: false,
          }));
        }
      }
    };

    // Subscribe to realtime updates via centralized manager
    const subscriptionId = subscriptionManager.subscribe(
      tableName,
      recordId,
      imageField,
      handleImageUpdate,
    );
    subscriptionIdRef.current = subscriptionId;

    // Initialize
    fetchInitialImage();

    // Cleanup function
    return () => {
      isMounted = false;
      if (subscriptionIdRef.current) {
        subscriptionManager.unsubscribe(tableName, subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [tableName, recordId, imageField, fallbackImage]);

  return state;
};

/**
 * Convenience hooks for specific use cases
 */
export const useCampaignImageHotLoading = (campaignId: string) => {
  return useImageHotLoading({
    tableName: 'campaigns',
    recordId: campaignId,
    imageField: 'background_image',
    fallbackImage: '/campaign-background-placeholder.png',
  });
};

export const useCharacterImageHotLoading = (characterId: string) => {
  return useImageHotLoading({
    tableName: 'characters',
    recordId: characterId,
    imageField: 'background_image',
    fallbackImage: '/character-background-placeholder.png',
  });
};
