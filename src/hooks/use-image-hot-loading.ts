import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

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
 * Subscribes to Supabase realtime changes and automatically updates when images are generated
 */
export const useImageHotLoading = ({
  tableName,
  recordId,
  imageField = 'background_image',
  fallbackImage = '/card-placeholder.svg'
}: UseImageHotLoadingOptions): ImageHotLoadingState => {
  const [state, setState] = useState<ImageHotLoadingState>({
    imageUrl: fallbackImage,
    isLoading: false,
    hasImage: false,
    error: null
  });

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Fetch initial image state
    const fetchInitialImage = async () => {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select(imageField)
          .eq('id', recordId)
          .single();

        if (error) {
          console.error(`Error fetching initial ${imageField}:`, error);
          if (isMounted) {
            setState(prev => ({
              ...prev,
              error: error.message,
              isLoading: false
            }));
          }
          return;
        }

        const imageUrl = data?.[imageField];
        if (isMounted) {
          setState(prev => ({
            ...prev,
            imageUrl: imageUrl || fallbackImage,
            hasImage: !!imageUrl,
            isLoading: false,
            error: null
          }));
        }
      } catch (err) {
        console.error('Failed to fetch initial image:', err);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            error: 'Failed to load image',
            isLoading: false
          }));
        }
      }
    };

    // Set up realtime subscription
    const setupRealtimeSubscription = () => {
      try {
        const channel = supabase
          .channel(`${tableName}_${recordId}_image_updates`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: tableName,
              filter: `id=eq.${recordId}`
            },
            (payload) => {
              console.log(`Received ${tableName} update:`, payload);

              const newImageUrl = payload.new?.[imageField];
              const oldImageUrl = payload.old?.[imageField];

              // Only update if the image field actually changed
              if (newImageUrl !== oldImageUrl) {
                if (isMounted) {
                  setState(prev => ({
                    ...prev,
                    imageUrl: newImageUrl || fallbackImage,
                    hasImage: !!newImageUrl,
                    isLoading: false,
                    error: null
                  }));
                }
              }
            }
          )
          .subscribe((status) => {
            console.log(`Realtime subscription status for ${tableName}:`, status);
            if (status === 'SUBSCRIBED') {
              console.log(`Successfully subscribed to ${tableName} updates for record ${recordId}`);
            } else if (status === 'CHANNEL_ERROR') {
              console.error(`Failed to subscribe to ${tableName} updates`);
              if (isMounted) {
                setState(prev => ({
                  ...prev,
                  error: 'Realtime connection failed'
                }));
              }
            }
          });

        channelRef.current = channel;
      } catch (err) {
        console.error('Failed to set up realtime subscription:', err);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            error: 'Failed to set up realtime updates'
          }));
        }
      }
    };

    // Initialize
    setState(prev => ({ ...prev, isLoading: true }));
    fetchInitialImage();
    setupRealtimeSubscription();

    // Cleanup function
    return () => {
      isMounted = false;
      if (channelRef.current) {
        console.log(`Unsubscribing from ${tableName} updates`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
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
    fallbackImage: '/campaign-background-placeholder.png'
  });
};

export const useCharacterImageHotLoading = (characterId: string) => {
  return useImageHotLoading({
    tableName: 'characters',
    recordId: characterId,
    imageField: 'background_image',
    fallbackImage: '/character-background-placeholder.png'
  });
};